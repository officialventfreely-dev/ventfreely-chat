// File: app/api/daily/submit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

type Body = {
  positiveText?: string;
  emotion?: string;
  energy?: string;
};

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function getTallinnYMD() {
  // Europe/Tallinn local date (avoids UTC day-shift bugs)
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Tallinn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`; // YYYY-MM-DD
}

export async function POST(req: NextRequest) {
  try {
    const { userId, supabase } = await getApiSupabase(req);

    if (!userId) {
      return json(401, { error: "unauthorized" });
    }

    const body = (await req.json().catch(() => ({}))) as Body;

    const positiveText = String(body.positiveText ?? "").trim();
    const emotion = String(body.emotion ?? "").trim();
    const energy = String(body.energy ?? "").trim();

    // Light guardrails (free-first safety, no UI changes)
    if (positiveText.length < 3) return json(400, { error: "positiveText too short" });
    if (positiveText.length > 1000) return json(400, { error: "positiveText too long" });
    if (!emotion) return json(400, { error: "emotion required" });
    if (!energy) return json(400, { error: "energy required" });

    // ✅ IMPORTANT: use Tallinn-local date (not UTC)
    const date = getTallinnYMD();

    const nowIso = new Date().toISOString();

    const { error: upsertErr } = await supabase.from("daily_reflections").upsert(
      {
        user_id: userId,
        date,
        positive_text: positiveText,
        emotion,
        energy,
        updated_at: nowIso,
      },
      { onConflict: "user_id,date" }
    );

    if (upsertErr) {
      return json(500, { error: upsertErr.message });
    }

    // (Optional) tiny memory touch – safe no-op if RLS/columns differ
    try {
      await supabase.from("user_memory").upsert({ user_id: userId, updated_at: nowIso }, { onConflict: "user_id" });
    } catch {}

    return json(200, { ok: true, date });
  } catch (e: any) {
    return json(500, { error: e?.message ?? "server_error" });
  }
}
