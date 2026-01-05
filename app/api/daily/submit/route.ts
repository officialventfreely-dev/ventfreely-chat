import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabaseServer";
import { getTodayEE } from "@/lib/getTodayEE";
import { EMOTIONS, ENERGIES, ENERGY_TO_SCORE } from "@/lib/dailyConfig";
import { ensureDailyAccess } from "@/lib/dailyAccess";

const BodySchema = z.object({
  positive_text: z.string().trim().min(3).max(500),
  emotion: z.enum(EMOTIONS),
  energy: z.enum(ENERGIES),
});

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await ensureDailyAccess(user.id);
  if (!access?.hasAccess) return NextResponse.json({ error: "Payment required" }, { status: 402 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { positive_text, emotion, energy } = parsed.data;
  const today = getTodayEE();
  const score = ENERGY_TO_SCORE[energy];

  const { data, error } = await supabase
    .from("daily_reflections")
    .upsert(
      { user_id: user.id, date: today, positive_text, emotion, energy, score },
      { onConflict: "user_id,date" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, reflection: data });
}
