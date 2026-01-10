// File: app/api/insights/weekly/route.ts

import { NextRequest, NextResponse } from "next/server";
import { ensureTrialAndCheckAccess } from "@/lib/access";
import { getApiSupabase } from "@/lib/apiAuth";

type Trend = "up" | "flat" | "down" | "na";

type Row = {
  date: string; // YYYY-MM-DD
  emotion: string | null;
  energy: string | null;
  score: number | null;
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
  // Gentle trend: require some data on BOTH weeks
  if (last7Scores.length < 3 || prev7Scores.length < 3) return "na";

  const a = avg(last7Scores);
  const b = avg(prev7Scores);
  if (a === null || b === null) return "na";

  const diff = a - b;

  // Soft thresholds so we don't overclaim
  if (diff > 0.15) return "up";
  if (diff < -0.15) return "down";
  return "flat";
}

function pickTopEmotion(rows: Row[]) {
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
  last7Rows: Row[];
}): string[] {
  const { completedDays, topEmotion, trend, last7Rows } = params;
  const insights: string[] = [];

  // 1) Presence / continuity (Ventfreely tone: gentle, non-judgy)
  if (completedDays === 0) {
    insights.push("There wasn’t much logged this week — and that’s okay. This space stays here for you.");
  } else if (completedDays <= 2) {
    insights.push("You checked in a couple of times this week — small moments still count.");
  } else if (completedDays <= 5) {
    insights.push("You came back to your space more than once this week. That kind of continuity matters.");
  } else {
    insights.push("You showed up for yourself most days this week — steady, quiet consistency.");
  }

  // 2) Emotional theme
  if (topEmotion) {
    insights.push(`The feeling that showed up most was “${topEmotion}.”`);
  } else if (completedDays > 0) {
    insights.push("A clear emotional theme didn’t stand out — this week looks mixed, not one-note.");
  }

  // 3) Energy texture (very light, no “metrics” vibe)
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

  // 4) Trend (soft framing)
  if (trend === "up") insights.push("Compared with the week before, things look a little steadier.");
  if (trend === "flat") insights.push("Compared with the week before, things look fairly similar — steady, not dramatic.");
  if (trend === "down") insights.push("Compared with the week before, this week looks a bit heavier.");
  if (trend === "na") insights.push("There isn’t enough pattern yet to call a trend — and that’s completely fine.");

  return insights.slice(0, 4);
}

function gentleSuggestion(trend: Trend) {
  // “Not advice. Just space.” → offer a soft option, no commands.
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

    const access = await ensureTrialAndCheckAccess(supabase as any, userId);
    if (!access.hasAccess) {
      return NextResponse.json({ error: "premium_required" }, { status: 402 });
    }

    // Fetch last 14 days (today and back 13)
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 13);
    const fromISO = from.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("daily_reflections")
      .select("date, emotion, energy, score")
      .eq("user_id", userId)
      .gte("date", fromISO)
      .order("date", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
    }

    const rows = ((data ?? []) as Row[]).filter((r) => !!r?.date);

    // Split into prev7 and last7 based on chronological order.
    const prev7Rows = rows.slice(0, Math.max(0, rows.length - 7));
    const last7Rows = rows.slice(Math.max(0, rows.length - 7));

    const completedDays = last7Rows.length;
    const topEmotion = pickTopEmotion(last7Rows);

    const last7Scores = last7Rows
      .map((r) => r.score)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    const prev7Scores = prev7Rows
      .slice(-7)
      .map((r) => r.score)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    const trend = computeTrendFromTwoWeeks(last7Scores, prev7Scores);

    const insights = buildInsights({ completedDays, topEmotion, trend, last7Rows });
    const suggestion = gentleSuggestion(trend);

    const days = last7Rows.map((r) => ({
      date: r.date,
      done: true,
      emotion: r.emotion,
      energy: r.energy,
    }));

    return NextResponse.json({
      completedDays,
      topEmotion,
      trend,
      insights,
      suggestion,
      days,
    });
  } catch (err: any) {
    if (err?.status === 401) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("Error in /api/insights/weekly:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
