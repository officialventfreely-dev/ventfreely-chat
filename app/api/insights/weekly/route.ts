import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { ensureTrialAndCheckAccess } from "@/lib/access";

type Trend = "up" | "flat" | "down" | "na";

function computeTrend(scores: number[]): Trend {
  if (scores.length < 4) return "na";

  const mid = Math.floor(scores.length / 2);
  const first = scores.slice(0, mid);
  const second = scores.slice(mid);

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const diff = avg(second) - avg(first);

  if (diff > 0.3) return "up";
  if (diff < -0.3) return "down";
  return "flat";
}

function generateInsights(params: {
  completedDays: number;
  topEmotion: string | null;
  trend: Trend;
}): string[] {
  const insights: string[] = [];
  const { completedDays, topEmotion, trend } = params;

  if (completedDays === 0) {
    insights.push(
      "There wasn’t enough reflection data this week to notice patterns yet."
    );
  } else if (completedDays <= 2) {
    insights.push(
      "You checked in on a few days this week, which gives a small snapshot of how things felt."
    );
  } else if (completedDays <= 4) {
    insights.push(
      "Your reflections this week form a light but meaningful pattern."
    );
  } else {
    insights.push(
      "You reflected consistently this week, creating a clear emotional snapshot."
    );
  }

  if (topEmotion) {
    insights.push(
      `The emotion that appeared most often was ${topEmotion.toLowerCase()}.`
    );
  }

  if (trend === "up") {
    insights.push(
      "Overall energy levels showed a gentle upward direction across the week."
    );
  } else if (trend === "down") {
    insights.push(
      "Overall energy levels leaned slightly lower as the week progressed."
    );
  } else if (trend === "flat") {
    insights.push("Energy levels stayed relatively steady throughout the week.");
  } else {
    insights.push(
      "There wasn’t enough data to identify an energy trend this week."
    );
  }

  return insights.slice(0, 4);
}

export async function GET() {
  const supabase = await createClient();

  // 🔐 Auth
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 💎 Premium gate (trial counts as access too in your logic)
  const access = await ensureTrialAndCheckAccess(supabase, user.id);

  if (!access.hasAccess) {
    return NextResponse.json({ error: "premium_required" }, { status: 402 });
  }

  // 📅 Last 7 days (incl today)
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 6);
  const fromISO = from.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_reflections")
    .select("date, emotion, score")
    .eq("user_id", user.id)
    .gte("date", fromISO)
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const completedDays = data.length;

  const emotionCounts: Record<string, number> = {};
  const scores: number[] = [];

  for (const row of data) {
    if (row.emotion) {
      emotionCounts[row.emotion] = (emotionCounts[row.emotion] || 0) + 1;
    }
    if (typeof row.score === "number") {
      scores.push(row.score);
    }
  }

  const topEmotion =
    Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const trend = computeTrend(scores);

  const insights = generateInsights({
    completedDays,
    topEmotion,
    trend,
  });

  return NextResponse.json({
    completedDays,
    topEmotion,
    trend,
    insights,
  });
}
