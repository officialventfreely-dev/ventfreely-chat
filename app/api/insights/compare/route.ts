import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { ensureDailyAccess } from "@/lib/dailyAccess";
import { getTodayEE } from "@/lib/getTodayEE";

type Trend = "up" | "flat" | "down" | "na";

type WeekSummary = {
  range: { start: string; end: string };
  completedDays: number;
  topEmotion: string | null;
  trend: Trend;
  series: Array<{ date: string; score: number; emotion: string; energy: string }>;
  insights: string[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function addDaysUTC(yyyyMmDd: string, days: number) {
  const d = new Date(yyyyMmDd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function makeRangeFromEnd(end: string) {
  // 7 days: start = end - 6
  const start = addDaysUTC(end, -6);
  return { start, end };
}

function calcTrend(series: Array<{ score: number }>): Trend {
  if (series.length < 3) return "na";
  const first = series[0].score;
  const last = series[series.length - 1].score;
  const diff = last - first;

  if (diff >= 0.6) return "up";
  if (diff <= -0.6) return "down";
  return "flat";
}

function topEmotion(series: Array<{ emotion: string }>) {
  if (!series.length) return null;
  const counts = new Map<string, number>();
  for (const s of series) counts.set(s.emotion, (counts.get(s.emotion) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [k, v] of counts.entries()) {
    if (v > bestN) {
      best = k;
      bestN = v;
    }
  }
  return best;
}

function buildSoftInsights(summary: {
  completedDays: number;
  topEmotion: string | null;
  trend: Trend;
}) {
  const out: string[] = [];

  // 1) Data amount
  if (summary.completedDays === 0) {
    out.push("There were no reflections this week yet.");
  } else if (summary.completedDays <= 2) {
    out.push("There wasn’t enough reflection data this week to notice patterns yet.");
  } else {
    out.push(`You checked in ${summary.completedDays}/7 days this week.`);
  }

  // 2) Top emotion
  if (summary.topEmotion) {
    out.push(`The most common emotion you picked was “${summary.topEmotion}”.`);
  } else {
    out.push("Top emotion: not enough data yet.");
  }

  // 3) Trend
  if (summary.trend === "na") {
    out.push("There wasn’t enough data to identify an energy trend this week.");
  } else if (summary.trend === "up") {
    out.push("Your energy trend looked a bit higher by the end of the week.");
  } else if (summary.trend === "down") {
    out.push("Your energy trend looked a bit lower by the end of the week.");
  } else {
    out.push("Your energy trend looked steady across the week.");
  }

  // Keep it short (3–4 lines)
  return out.slice(0, 4);
}

async function fetchWeek(
  supabase: any,
  userId: string,
  range: { start: string; end: string }
): Promise<WeekSummary> {
  const { data, error } = await supabase
    .from("daily_reflections")
    .select("date, score, emotion, energy")
    .eq("user_id", userId)
    .gte("date", range.start)
    .lte("date", range.end)
    .order("date", { ascending: true });

  if (error) throw new Error(error.message);

  const series =
    (data ?? []).map((r: any) => ({
      date: r.date as string,
      score: Number(r.score ?? 0),
      emotion: String(r.emotion ?? ""),
      energy: String(r.energy ?? ""),
    })) ?? [];

  const completedDays = series.length;
  const trend = calcTrend(series);
  const top = topEmotion(series);

  const insights = buildSoftInsights({ completedDays, topEmotion: top, trend });

  return {
    range,
    completedDays,
    topEmotion: top,
    trend,
    series,
    insights,
  };
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await ensureDailyAccess(user.id);
  if (!access?.hasAccess) {
    return NextResponse.json({ error: "Payment required" }, { status: 402 });
  }

  // This week ends today (EE date string)
  const thisEnd = getTodayEE();
  const thisRange = makeRangeFromEnd(thisEnd);

  // Last week ends 7 days before thisEnd
  const lastEnd = addDaysUTC(thisEnd, -7);
  const lastRange = makeRangeFromEnd(lastEnd);

  try {
    const thisWeek = await fetchWeek(supabase, user.id, thisRange);
    const lastWeek = await fetchWeek(supabase, user.id, lastRange);

    // Save snapshot for THIS week into weekly_reports (upsert by PK user_id + week_start)
    const weekStart = thisWeek.range.start;
    const weekEnd = thisWeek.range.end;

    await supabase.from("weekly_reports").upsert(
      {
        user_id: user.id,
        week_start: weekStart,
        week_end: weekEnd,
        completed_days: thisWeek.completedDays,
        top_emotion: thisWeek.topEmotion,
        trend: thisWeek.trend,
        insights: { lines: thisWeek.insights },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,week_start" }
    );

    const deltaDays = thisWeek.completedDays - lastWeek.completedDays;

    // very light delta note
    const changeNote =
      deltaDays === 0
        ? "Same number of check-ins as last week."
        : deltaDays > 0
        ? `More check-ins than last week (+${deltaDays}).`
        : `Fewer check-ins than last week (${deltaDays}).`;

    return NextResponse.json({
      thisWeek,
      lastWeek,
      change: {
        deltaDays,
        note: changeNote,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
