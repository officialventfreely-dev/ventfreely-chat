// File: app/api/daily/week/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";
import { ensureTrialAndCheckAccess } from "@/lib/access";

type Trend = "up" | "flat" | "down" | "na";
type SlotPart = "AM" | "PM";

const USER_TZ = "Europe/Tallinn";

type Row = {
  date: string; // YYYY-MM-DD (stored)
  emotion: string | null;
  energy: string | null;
  score?: number | null;
  created_at?: string | null; // timestamptz
  positive_text?: string | null;
};

type Slot = {
  id: string; // `${date}__${part}`
  date: string; // YYYY-MM-DD (Tallinn local)
  part: SlotPart;
  done: boolean;
  emotion: string | null;
  energy: string | null;
  positive_text?: string | null;
  created_at?: string | null;
};

type Day = {
  date: string;
  done: boolean;
  emotion: string | null;
  energy: string | null;
  positive_text?: string | null;
};

function safeLower(s: string | null | undefined) {
  return (s ?? "").trim().toLowerCase();
}

function avg(arr: number[]) {
  if (!arr.length) return null;
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
}

function computeTrendFromTwoWeeks(last7Scores: number[], prev7Scores: number[]): Trend {
  if (last7Scores.length < 3 || prev7Scores.length < 3) return "na";
  const a = avg(last7Scores);
  const b = avg(prev7Scores);
  if (a === null || b === null) return "na";

  const diff = a - b;
  if (diff > 0.15) return "up";
  if (diff < -0.15) return "down";
  return "flat";
}

function pickTopEmotion(rows: { emotion: string | null }[]) {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const e = (r.emotion ?? "").trim();
    if (!e) continue;
    counts[e] = (counts[e] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function buildInsights(params: { completedDays: number; topEmotion: string | null; trend: Trend; last7Rows: Row[] }): string[] {
  const { completedDays, topEmotion, trend, last7Rows } = params;
  const insights: string[] = [];

  if (completedDays === 0) {
    insights.push("There wasn’t much logged this week — and that’s okay. This space stays here for you.");
  } else if (completedDays <= 2) {
    insights.push("You checked in a couple of times this week — small moments still count.");
  } else if (completedDays <= 5) {
    insights.push("You came back to your space more than once this week. That kind of continuity matters.");
  } else {
    insights.push("You showed up for yourself most days this week — steady, quiet consistency.");
  }

  if (topEmotion) {
    insights.push(`The feeling that showed up most was “${topEmotion}.”`);
  } else if (completedDays > 0) {
    insights.push("A clear emotional theme didn’t stand out — this week looks mixed, not one-note.");
  }

  const energies = last7Rows.map((r) => (r.energy ?? "").trim()).filter(Boolean);
  const lowish = energies.filter((e) => ["low", "tired", "drained"].includes(safeLower(e))).length;
  const highish = energies.filter((e) => ["great", "good", "energized"].includes(safeLower(e))).length;

  if (energies.length >= 3) {
    if (lowish >= Math.max(2, Math.ceil(energies.length / 2))) {
      insights.push("Energy seems to have been on the lower side for much of the week.");
    } else if (highish >= Math.max(2, Math.ceil(energies.length / 2))) {
      insights.push("Energy leaned a bit brighter this week than it usually does.");
    } else {
      insights.push("Your energy looks varied — some lighter moments, some heavier ones.");
    }
  }

  if (trend === "up") insights.push("Compared with the week before, things look a little steadier.");
  if (trend === "flat") insights.push("Compared with the week before, things look fairly similar — steady, not dramatic.");
  if (trend === "down") insights.push("Compared with the week before, this week looks a bit heavier.");
  if (trend === "na") insights.push("There isn’t enough pattern yet to call a trend — and that’s completely fine.");

  return insights.slice(0, 4);
}

function gentleSuggestion(trend: Trend) {
  if (trend === "down") {
    return "If you want, keep it simple this week: one small check-in when things feel heavy — even a single sentence is enough.";
  }
  if (trend === "up") {
    return "If you want, notice what helped you feel steadier — not to “optimize,” just to keep a little of it close.";
  }
  if (trend === "flat") {
    return "If you want, try one gentle check-in at a calm moment — not to fix anything, just to stay connected.";
  }
  return "If you want, give it one quiet check-in this week. No pressure — just a little space.";
}

function makeSlotId(date: string, part: SlotPart) {
  return `${date}__${part}`;
}

function ymdInTz(d: Date) {
  // en-CA gives YYYY-MM-DD ordering reliably
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: USER_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function hourInTz(d: Date) {
  // returns 0..23 in USER_TZ
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: USER_TZ,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  const n = Number(h);
  return Number.isFinite(n) ? n : 0;
}

function partInTz(d: Date): SlotPart {
  return hourInTz(d) < 12 ? "AM" : "PM";
}

function buildLast14Windows(now = new Date()): { date: string; part: SlotPart; id: string }[] {
  // Build 14 windows by stepping 12h back from now.
  // Date+part are computed in Europe/Tallinn, so labels stay correct for the app.
  const out: { date: string; part: SlotPart; id: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 12 * 60 * 60 * 1000);
    const date = ymdInTz(t);
    const part = partInTz(t);
    out.push({ date, part, id: makeSlotId(date, part) });
  }

  // De-dupe in the rare case DST/time alignment causes duplicates:
  // keep order, but ensure length stays 14 by refilling forward if needed.
  const seen = new Set<string>();
  const deduped: typeof out = [];
  for (const w of out) {
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    deduped.push(w);
  }

  // If dedupe shortened, extend forward (still 12h steps) until we have 14
  let step = 1;
  while (deduped.length < 14) {
    const t = new Date(now.getTime() + step * 12 * 60 * 60 * 1000);
    const date = ymdInTz(t);
    const part = partInTz(t);
    const id = makeSlotId(date, part);
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push({ date, part, id });
    }
    step++;
    if (step > 10) break;
  }

  return deduped.slice(0, 14);
}

export async function GET(req: NextRequest) {
  try {
    const { userId, supabase } = await getApiSupabase(req);

    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Keep access check for future subscription re-enable.
    const access = await ensureTrialAndCheckAccess(supabase as any, userId);
    void access;

    const now = new Date();

    // We fetch a bit wider than 7 days to be safe (and cover 14 windows)
    const since = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    const { data: rows, error } = await supabase
      .from("daily_reflections")
      .select("date, emotion, energy, score, created_at, positive_text")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("daily/week fetch error:", error);
      return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
    }

    const typedRows = (rows || []) as Row[];

    // Build the 14 windows keys we will return (Tallinn-based labels)
    const windows = buildLast14Windows(now);

    // Bucket actual DB rows into AM/PM slots by created_at in USER_TZ
    const slotMap = new Map<string, Slot>();

    for (const r of typedRows) {
      const created = r.created_at ? new Date(r.created_at) : null;
      if (!created || Number.isNaN(created.getTime())) continue;

      const date = ymdInTz(created);
      const part = partInTz(created);
      const id = makeSlotId(date, part);

      // Only keep rows that are in our 14 windows set
      // (otherwise old data could fill random slots)
      // We'll check this later by presence in windows list.
      const existing = slotMap.get(id);

      // Keep the latest row in that slot (by created_at)
      if (!existing) {
        slotMap.set(id, {
          id,
          date,
          part,
          done: true,
          emotion: r.emotion ?? null,
          energy: r.energy ?? null,
          positive_text: r.positive_text ?? null,
          created_at: r.created_at ?? null,
        });
      } else {
        const prevTime = existing.created_at ? new Date(existing.created_at).getTime() : 0;
        const curTime = r.created_at ? new Date(r.created_at).getTime() : 0;
        if (curTime >= prevTime) {
          slotMap.set(id, {
            ...existing,
            done: true,
            emotion: r.emotion ?? existing.emotion ?? null,
            energy: r.energy ?? existing.energy ?? null,
            positive_text: r.positive_text ?? existing.positive_text ?? null,
            created_at: r.created_at ?? existing.created_at ?? null,
          });
        }
      }
    }

    // Final slots list in correct order (oldest -> newest)
    const slots: Slot[] = windows.map((w) => {
      const hit = slotMap.get(w.id);
      if (hit) return hit;
      return {
        id: w.id,
        date: w.date,
        part: w.part,
        done: false,
        emotion: null,
        energy: null,
        positive_text: null,
        created_at: null,
      };
    });

    // Build days[] for backwards compatibility (done if any slot done)
    const dayMap = new Map<string, Day>();

    for (const s of slots) {
      const existing = dayMap.get(s.date);
      if (!existing) {
        dayMap.set(s.date, {
          date: s.date,
          done: !!s.done,
          emotion: s.emotion ?? null,
          energy: s.energy ?? null,
          positive_text: s.positive_text ?? null,
        });
      } else {
        // done if any slot done
        const mergedDone = existing.done || s.done;

        // keep latest available details preference: PM overrides AM if both present,
        // or keep existing if new is empty
        const prefer = (existingPart: SlotPart, incomingPart: SlotPart) =>
          existingPart === "PM" ? "existing" : incomingPart === "PM" ? "incoming" : "existing";

        // We don’t store part on day, so do a light heuristic:
        // If incoming slot has content, prefer it.
        const takeIncoming = !!(s.emotion || s.energy || s.positive_text);

        dayMap.set(s.date, {
          date: s.date,
          done: mergedDone,
          emotion: takeIncoming ? (s.emotion ?? existing.emotion ?? null) : existing.emotion ?? s.emotion ?? null,
          energy: takeIncoming ? (s.energy ?? existing.energy ?? null) : existing.energy ?? s.energy ?? null,
          positive_text: takeIncoming ? (s.positive_text ?? existing.positive_text ?? null) : existing.positive_text ?? s.positive_text ?? null,
        });
      }
    }

    const days = Array.from(dayMap.values()).sort((a, b) => (a.date < b.date ? -1 : 1));

    // Trend calculation still uses "per day" rows, but we use the most recent 7 days worth
    // from dayMap to keep behavior stable.
    const last7Days = days.slice(-7);

    const completedDays = last7Days.filter((d) => d.done).length;
    const topEmotion = pickTopEmotion(last7Days);

    // Previous 7 days trend compare: fetch using created_at (wider but safe)
    const prevSince = new Date(since.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevUntil = since;

    const { data: prevRows, error: prevError } = await supabase
      .from("daily_reflections")
      .select("date, emotion, energy, score, created_at")
      .eq("user_id", userId)
      .gte("created_at", prevSince.toISOString())
      .lt("created_at", prevUntil.toISOString())
      .order("created_at", { ascending: true });

    if (prevError) {
      console.error("daily/week prev fetch error:", prevError);
    }

    const typedPrev = ((prevRows || []) as Row[]) ?? [];

    const last7Scores = typedRows
      .map((r) => (typeof r.score === "number" && Number.isFinite(r.score) ? r.score : null))
      .filter((v): v is number => typeof v === "number");

    const prev7Scores = typedPrev
      .map((r) => (typeof r.score === "number" && Number.isFinite(r.score) ? r.score : null))
      .filter((v): v is number => typeof v === "number");

    const fallbackLast =
      last7Scores.length > 0
        ? last7Scores
        : last7Days.map((r) => (r.emotion ? 1 : 0) + (r.energy ? 1 : 0));

    const fallbackPrev =
      prev7Scores.length > 0
        ? prev7Scores
        : typedPrev.map((r) => (r.emotion ? 1 : 0) + (r.energy ? 1 : 0));

    const trend = computeTrendFromTwoWeeks(fallbackLast, fallbackPrev);

    // FREE-FIRST: always include the premium layer (as if Premium)
    const insights = buildInsights({ completedDays, topEmotion, trend, last7Rows: typedRows });
    const suggestion = gentleSuggestion(trend);

    return NextResponse.json({
      completedDays,
      topEmotion,
      trend,
      // backwards compat:
      days,
      // ✅ NEW: 14x 12h windows
      slots,
      insights,
      suggestion,
      hasPremiumInsights: true,
    });
  } catch (e) {
    console.error("daily/week error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
