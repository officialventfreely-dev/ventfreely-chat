import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { ensureDailyAccess } from "@/lib/dailyAccess";

function formatDateEE(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Tallinn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}
const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await ensureDailyAccess(user.id);
  if (!access?.hasAccess) return NextResponse.json({ error: "Payment required" }, { status: 402 });

  const now = new Date();
  const end = formatDateEE(now);
  const start = formatDateEE(addDays(now, -6));

  const { data: last7, error } = await supabase
    .from("daily_reflections")
    .select("date, emotion, energy, score")
    .eq("user_id", user.id)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const completedDays = last7?.length ?? 0;

  const counts = new Map<string, number>();
  for (const r of last7 ?? []) counts.set(r.emotion, (counts.get(r.emotion) ?? 0) + 1);
  const topEmotion = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const avgLast7 = avg((last7 ?? []).map((r) => r.score));

  const prevEnd = formatDateEE(addDays(now, -7));
  const prevStart = formatDateEE(addDays(now, -13));

  const { data: prev7, error: prevErr } = await supabase
    .from("daily_reflections")
    .select("score")
    .eq("user_id", user.id)
    .gte("date", prevStart)
    .lte("date", prevEnd);

  if (prevErr) return NextResponse.json({ error: prevErr.message }, { status: 500 });

  const avgPrev7 = avg((prev7 ?? []).map((r) => r.score));

  let trend: "up" | "flat" | "down" | "na" = "na";
  if (avgLast7 !== null && avgPrev7 !== null) {
    const delta = avgLast7 - avgPrev7;
    if (delta > 0.15) trend = "up";
    else if (delta < -0.15) trend = "down";
    else trend = "flat";
  }

  return NextResponse.json({
    range: { start, end },
    completedDays,
    topEmotion,
    trend,
    series: (last7 ?? []).map((r) => ({ date: r.date, score: r.score, emotion: r.emotion, energy: r.energy })),
  });
}
