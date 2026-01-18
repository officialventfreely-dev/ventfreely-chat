// File: app/api/daily/week/route.ts
// FULL REPLACEMENT
//
// Fix:
// - Weekly dots were computed from created_at + 12h slots -> timezone/RLS mismatch => missing dots.
// - Restore SIMPLE 1x/24h logic: "days" are Tallinn dates; done=true if row exists for that date.
// - Use service-role for reads to avoid mobile bearer/RLS issues (same root cause as submit not saving).
//
// Response stays compatible: completedDays, topEmotion, trend, days, insights, suggestion.

import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";
import { ensureTrialAndCheckAccess } from "@/lib/access";
import { supabaseService } from "@/lib/supabaseService";

type Trend = "up" | "flat" | "down" | "na";

const USER_TZ = "Europe/Tallinn";

type Row = {
  date: string; // YYYY-MM-DD (stored)
  emotion: string | null;
  energy: string | null;
  score?: number | null;
  created_at?: string | null;
  positive_text?: string | null;
};

type Day = {
  date: string; // YYYY-MM-DD (Tallinn local)
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

function ymdInTz(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: USER_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function buildLast7DatesTallinn(now = new Date()) {
  // oldest -> newest, all as YYYY-MM-DD in Tallinn
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const t = addDays(now, -i);
    out.push(ymdInTz(t));
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    const { userId, supabase } = await getApiSupabase(req);

    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // keep for future re-enable, no UX effect now
    try {
      const access = await ensureTrialAndCheckAccess(supabase as any, userId);
      void access;
    } catch {}

    const now = new Date();

    const last7Dates = buildLast7DatesTallinn(now);
    const startDate = last7Dates[0];
    const endDate = last7Dates[last7Dates.length - 1];

    // ✅ Read via service-role to avoid RLS/mobile bearer mismatch
    const { data: rows, error } = await supabaseService
      .from("daily_reflections")
      .select("date, emotion, energy, score, created_at, positive_text")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) {
      console.error("daily/week fetch error:", error);
      return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
    }

    const typedRows = (rows || []) as Row[];

    // map by date (if multiple rows somehow exist, keep latest by created_at)
    const byDate = new Map<string, Row>();

    for (const r of typedRows) {
      const key = String(r.date);
      const prev = byDate.get(key);
      if (!prev) {
        byDate.set(key, r);
        continue;
      }

      const prevT = prev.created_at ? new Date(prev.created_at).getTime() : 0;
      const curT = r.created_at ? new Date(r.created_at).getTime() : 0;
      if (curT >= prevT) byDate.set(key, r);
    }

    const days: Day[] = last7Dates.map((d) => {
      const hit = byDate.get(d);
      return {
        date: d,
        done: !!hit,
        emotion: hit?.emotion ?? null,
        energy: hit?.energy ?? null,
        positive_text: hit?.positive_text ?? null,
      };
    });

    const last7DoneRows = days.filter((d) => d.done);
    const completedDays = last7DoneRows.length;
    const topEmotion = pickTopEmotion(last7DoneRows);

    // Trend compare: previous 7 days (date-based, same TZ semantics)
    const prevEnd = addDays(now, -7);
    const prevDates: string[] = [];
    for (let i = 13; i >= 7; i--) {
      prevDates.push(ymdInTz(addDays(now, -i)));
    }
    const prevStartDate = prevDates[0];
    const prevEndDate = prevDates[prevDates.length - 1];

    const { data: prevRows, error: prevError } = await supabaseService
      .from("daily_reflections")
      .select("date, emotion, energy, score, created_at")
      .eq("user_id", userId)
      .gte("date", prevStartDate)
      .lte("date", prevEndDate)
      .order("date", { ascending: true });

    if (prevError) {
      console.error("daily/week prev fetch error:", prevError);
    }

    const typedPrev = ((prevRows || []) as Row[]) ?? [];

    const last7Scores = typedRows
      .filter((r) => last7Dates.includes(String(r.date)))
      .map((r) => (typeof r.score === "number" && Number.isFinite(r.score) ? r.score : null))
      .filter((v): v is number => typeof v === "number");

    const prev7Scores = typedPrev
      .map((r) => (typeof r.score === "number" && Number.isFinite(r.score) ? r.score : null))
      .filter((v): v is number => typeof v === "number");

    // fallback if score missing
    const fallbackLast =
      last7Scores.length > 0 ? last7Scores : last7DoneRows.map((r) => (r.emotion ? 1 : 0) + (r.energy ? 1 : 0));

    const fallbackPrev =
      prev7Scores.length > 0 ? prev7Scores : typedPrev.map((r) => (r.emotion ? 1 : 0) + (r.energy ? 1 : 0));

    const trend = computeTrendFromTwoWeeks(fallbackLast, fallbackPrev);

    const insights = buildInsights({
      completedDays,
      topEmotion,
      trend,
      last7Rows: typedRows.filter((r) => last7Dates.includes(String(r.date))),
    });

    const suggestion = gentleSuggestion(trend);

    return NextResponse.json({
      completedDays,
      topEmotion,
      trend,
      days, // ✅ This is what your weekly dots should use
      insights,
      suggestion,
      hasPremiumInsights: true,
    });
  } catch (e) {
    console.error("daily/week error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
