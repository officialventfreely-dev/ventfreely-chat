// File: app/api/daily/week/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";
import { ensureTrialAndCheckAccess } from "@/lib/access";

type Trend = "up" | "flat" | "down" | "na";

type DayRow = {
  date: string; // YYYY-MM-DD
  emotion: string | null;
  energy: string | null;
  score?: number | null;
};

type PrevRow = {
  date: string; // YYYY-MM-DD
  emotion: string | null;
  energy: string | null;
  score?: number | null;
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

function buildInsights(params: {
  completedDays: number;
  topEmotion: string | null;
  trend: Trend;
  last7Rows: DayRow[];
}): string[] {
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

export async function GET(req: NextRequest) {
  try {
    const { userId, supabase } = await getApiSupabase(req);

    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Keep access check for future subscription re-enable.
    // In FREE_MODE (lib/access.ts), this returns hasAccess=true anyway.
    // IMPORTANT: We do not gate weekly insights/suggestions anymore.
    const access = await ensureTrialAndCheckAccess(supabase as any, userId);
    void access;

    // Last 7 days (including today)
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);

    const startStr = start.toISOString().slice(0, 10);
    const endStr = today.toISOString().slice(0, 10);

    const { data: rows, error } = await supabase
      .from("daily_reflections")
      .select("date, emotion, energy, score")
      .eq("user_id", userId)
      .gte("date", startStr)
      .lte("date", endStr)
      .order("date", { ascending: true });

    if (error) {
      console.error("daily/week fetch error:", error);
      return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
    }

    const typedRows = (rows || []) as DayRow[];
    const completedDays = typedRows.length;
    const topEmotion = pickTopEmotion(typedRows);

    // Previous 7 days (for trend compare)
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const prevStartStr = prevStart.toISOString().slice(0, 10);
    const prevEndStr = prevEnd.toISOString().slice(0, 10);

    const { data: prevRows, error: prevError } = await supabase
      .from("daily_reflections")
      .select("date, emotion, energy, score")
      .eq("user_id", userId)
      .gte("date", prevStartStr)
      .lte("date", prevEndStr)
      .order("date", { ascending: true });

    if (prevError) {
      console.error("daily/week prev fetch error:", prevError);
    }

    const typedPrev = (prevRows || []) as PrevRow[];

    const last7Scores = typedRows
      .map((r) => (typeof r.score === "number" && Number.isFinite(r.score) ? r.score : null))
      .filter((v): v is number => typeof v === "number");

    const prev7Scores = typedPrev
      .map((r) => (typeof r.score === "number" && Number.isFinite(r.score) ? r.score : null))
      .filter((v): v is number => typeof v === "number");

    const fallbackLast =
      last7Scores.length > 0
        ? last7Scores
        : typedRows.map((r) => (r.emotion ? 1 : 0) + (r.energy ? 1 : 0));

    const fallbackPrev =
      prev7Scores.length > 0
        ? prev7Scores
        : typedPrev.map((r) => (r.emotion ? 1 : 0) + (r.energy ? 1 : 0));

    const trend = computeTrendFromTwoWeeks(fallbackLast, fallbackPrev);

    const days = typedRows.map((r) => ({
      date: r.date,
      done: true,
      emotion: r.emotion,
      energy: r.energy,
    }));

    // FREE-FIRST: always include the premium layer (as if Premium)
    const insights = buildInsights({ completedDays, topEmotion, trend, last7Rows: typedRows });
    const suggestion = gentleSuggestion(trend);

    return NextResponse.json({
      completedDays,
      topEmotion,
      trend,
      days,
      insights,
      suggestion,
      hasPremiumInsights: true, // always true in free-first experience
    });
  } catch (e) {
    console.error("daily/week error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
