// app/api/daily/week/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";
import { ensureTrialAndCheckAccess } from "@/lib/access";

type DayRow = {
  date: string; // YYYY-MM-DD
  emotion: string | null;
  energy: string | null;
};

type PrevRow = {
  date: string; // YYYY-MM-DD
  emotion: string | null;
  energy: string | null;
};

function scoreFromRow(row: { emotion: string | null; energy: string | null }): number {
  let score = 0;
  if (row.emotion) score += 1;
  if (row.energy) score += 1;
  return score; // 0–2
}

function isAllowedAccess(access: unknown): boolean {
  const a = access as any;

  // kõige levinumad variandid eri versioonides:
  if (typeof a?.ok === "boolean") return a.ok;
  if (typeof a?.allowed === "boolean") return a.allowed;
  if (typeof a?.hasAccess === "boolean") return a.hasAccess;
  if (typeof a?.premium === "boolean") return a.premium;
  if (typeof a?.isPremium === "boolean") return a.isPremium;

  // kui on stringiline "access"/"status"
  const s = a?.access ?? a?.status;
  if (s === "premium" || s === "trial" || s === "active" || s === "trialing") return true;

  return false;
}

export async function GET(req: NextRequest) {
  try {
    // 1) Auth (Bearer token äpist või cookie webist)
    const { userId, supabase } = await getApiSupabase(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Premium/Trial gate
    // ⚠️ IMPORTANT: su access.ts signatuur tahab 2 argumenti
    const access = await ensureTrialAndCheckAccess(supabase as any, userId);

    if (!isAllowedAccess(access)) {
      return NextResponse.json({ error: "Premium required" }, { status: 402 });
    }

    // 3) Viimase 7 päeva andmed (sh täna)
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);

    const startStr = start.toISOString().slice(0, 10);
    const endStr = today.toISOString().slice(0, 10);

    const { data: rows, error } = await supabase
      .from("daily_reflections")
      .select("date, emotion, energy")
      .eq("user_id", userId)
      .gte("date", startStr)
      .lte("date", endStr)
      .order("date", { ascending: true });

    if (error) {
      console.error("daily/week fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch week" }, { status: 500 });
    }

    const typedRows = (rows || []) as DayRow[];

    // 4) Täidetud päevade arv
    const completedDays = typedRows.length;

    // 5) Top emotion
    const emotionCounts: Record<string, number> = {};
    for (const r of typedRows) {
      if (!r.emotion) continue;
      emotionCounts[r.emotion] = (emotionCounts[r.emotion] || 0) + 1;
    }
    const topEmotion =
      Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // 6) Trend: võrdle eelmise 7 päevaga
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const prevStartStr = prevStart.toISOString().slice(0, 10);
    const prevEndStr = prevEnd.toISOString().slice(0, 10);

    const { data: prevRows, error: prevError } = await supabase
      .from("daily_reflections")
      .select("date, emotion, energy")
      .eq("user_id", userId)
      .gte("date", prevStartStr)
      .lte("date", prevEndStr)
      .order("date", { ascending: true });

    if (prevError) {
      console.error("daily/week prev fetch error:", prevError);
      // ei katkesta — trend võib olla "na"
    }

    const typedPrev = (prevRows || []) as PrevRow[];

    const currentScore = typedRows.reduce((acc, r) => acc + scoreFromRow(r), 0);
    const prevScore = typedPrev.reduce((acc, r) => acc + scoreFromRow(r), 0);

    let trend: "up" | "flat" | "down" | "na" = "na";
    if (typedRows.length >= 3 && typedPrev.length >= 3) {
      if (currentScore > prevScore) trend = "up";
      else if (currentScore < prevScore) trend = "down";
      else trend = "flat";
    }

    // 7) Dots / päevade list
    const days = typedRows.map((r) => ({
      date: r.date,
      done: true,
      emotion: r.emotion,
      energy: r.energy,
    }));

    return NextResponse.json({
      completedDays,
      topEmotion,
      trend,
      days,
    });
  } catch (e) {
    console.error("daily/week error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
