// app/api/daily/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";
import { ensureTrialAndCheckAccess } from "@/lib/access";

// (optional but safe in App Router, helps avoid caching weirdness)
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
      return json(401, { error: "Unauthorized" });
    }

    // Premium / Trial gate (same as everywhere)
    const access = await ensureTrialAndCheckAccess(supabase as any, userId);
    const allowed =
      (access as any)?.ok === true ||
      (access as any)?.allowed === true ||
      (access as any)?.hasAccess === true ||
      (access as any)?.premium === true ||
      (access as any)?.isPremium === true ||
      ["premium", "trial", "active", "trialing"].includes((access as any)?.access ?? (access as any)?.status);

    if (!allowed) {
      return json(402, { error: "Premium required" });
    }

    const body = (await req.json().catch(() => ({}))) as Body;

    const positiveText = String(body.positiveText ?? "").trim();
    const emotion = String(body.emotion ?? "").trim();
    const energy = String(body.energy ?? "").trim();

    if (positiveText.length < 3) {
      return json(400, { error: "positiveText too short" });
    }
    if (!emotion) {
      return json(400, { error: "emotion required" });
    }
    if (!energy) {
      return json(400, { error: "energy required" });
    }

    // Date (EE) – simplest: rely on DB default date if you have it.
    // If your table requires a date, set it here:
    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(today.getUTCDate()).padStart(2, "0");
    const date = `${yyyy}-${mm}-${dd}`;

    // Save daily_reflections (upsert by user_id+date if you have that unique)
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

    // Optional: keep a light user_memory update (safe/no-op if columns differ)
    // If your user_memory schema is different, this won't break build; but could 500 at runtime.
    // Comment out if you don't want it.
    try {
      await supabase.from("user_memory").upsert(
        {
          user_id: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch {}

    return json(200, { ok: true });
  } catch (e: any) {
    return json(500, { error: e?.message ?? "Server error" });
  }
}
