import { NextRequest, NextResponse } from "next/server";
import { getTodayEE } from "@/lib/getTodayEE";
import { ensureDailyAccess } from "@/lib/dailyAccess";
import { getApiSupabase } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  try {
    const { userId, supabase } = await getApiSupabase(req);

    const access = await ensureDailyAccess(userId);
    if (!access?.hasAccess) {
      return NextResponse.json({ error: "Payment required" }, { status: 402 });
    }

    const today = getTodayEE();

    const { data, error } = await (supabase as any)
      .from("daily_reflections")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ today, reflection: data ?? null });
  } catch (err: any) {
    if (err?.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error in /api/daily/today:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
