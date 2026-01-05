import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getTodayEE } from "@/lib/getTodayEE";
import { ensureDailyAccess } from "@/lib/dailyAccess";

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await ensureDailyAccess(user.id);
  if (!access?.hasAccess) {
    return NextResponse.json({ error: "Payment required" }, { status: 402 });
  }

  const today = getTodayEE();

  const { data, error } = await supabase
    .from("daily_reflections")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ today, reflection: data ?? null });
}
