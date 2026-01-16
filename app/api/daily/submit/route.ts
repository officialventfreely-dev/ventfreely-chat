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
    // Keep it generous so users don't feel limited.
    if (positiveText.length < 3) return json(400, { error: "positiveText too short" });
    if (positiveText.length > 1000) return json(400, { error: "positiveText too long" });
    if (!emotion) return json(400, { error: "emotion required" });
    if (!energy) return json(400, { error: "energy required" });

    // Use UTC date for consistency
    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(today.getUTCDate()).padStart(2, "0");
    const date = `${yyyy}-${mm}-${dd}`;

    const { error: upsertErr } = await supabase.from("daily_reflections").upsert(
      {
        user_id: userId,
        date,
        positive_text: positiveText,
        emotion,
        energy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    );

    if (upsertErr) {
      return json(500, { error: upsertErr.message });
    }

    // (Optional) tiny memory touch – safe no-op if RLS/columns differ
    try {
      await supabase
        .from("user_memory")
        .upsert({ user_id: userId, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    } catch {}

    return json(200, { ok: true });
  } catch (e: any) {
    return json(500, { error: e?.message ?? "server_error" });
  }
}
