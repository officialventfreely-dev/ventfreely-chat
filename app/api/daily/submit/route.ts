import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabaseServer";
import { getTodayEE } from "@/lib/getTodayEE";
import { EMOTIONS, ENERGIES, ENERGY_TO_SCORE } from "@/lib/dailyConfig";
import { ensureDailyAccess } from "@/lib/dailyAccess";
import { ensureProfileAndGetPrefs } from "@/lib/accountPrefs";

const BodySchema = z.object({
  positive_text: z.string().trim().min(3).max(500),
  emotion: z.enum(EMOTIONS),
  energy: z.enum(ENERGIES),
});

type UserMemoryRow = {
  dominant_emotions: string[] | null;
  recurring_themes: string[] | null;
  preferred_tone: string | null;
  energy_pattern: string | null;
};

function normalizeUniqueRecent(list: string[], max = 3) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const key = item.trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= max) break;
  }
  return out;
}

function computeEnergyPattern(energy: string) {
  const low = ["Low"];
  const high = ["Great"];

  if (low.includes(energy)) return "low_tendency";
  if (high.includes(energy)) return "high_tendency";
  return "mixed";
}

export async function POST(req: Request) {
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

  // ✅ ETAPP 4.3: Preferences (ensure profile exists + read toggles)
  const prefs = await ensureProfileAndGetPrefs(supabase, {
    id: user.id,
    email: user.email ?? null,
  });

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { positive_text, emotion, energy } = parsed.data;
  const today = getTodayEE();
  const score = ENERGY_TO_SCORE[energy];

  // 1) Save reflection
  const { data, error } = await supabase
    .from("daily_reflections")
    .upsert(
      { user_id: user.id, date: today, positive_text, emotion, energy, score },
      { onConflict: "user_id,date" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 2) ETAPP 4.1 – Update user_memory (ONLY if prefs allow)
  if (prefs.reflectionMemoryEnabled) {
    try {
      const { data: existingMemory } = await supabase
        .from("user_memory")
        .select("dominant_emotions, recurring_themes, preferred_tone, energy_pattern")
        .eq("user_id", user.id)
        .maybeSingle();

      const prev = (existingMemory as UserMemoryRow | null) ?? null;

      const prevEmotions = prev?.dominant_emotions ?? [];
      const nextEmotions = normalizeUniqueRecent([emotion, ...prevEmotions], 3);

      const energyPattern = computeEnergyPattern(energy);

      await supabase
        .from("user_memory")
        .upsert(
          {
            user_id: user.id,
            dominant_emotions: nextEmotions,
            recurring_themes: prev?.recurring_themes ?? null,
            preferred_tone: "calm",
            energy_pattern: energyPattern,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
    } catch (e) {
      console.error("Failed to upsert user_memory from daily_submit:", e);
    }
  }

  return NextResponse.json({ ok: true, reflection: data });
}
