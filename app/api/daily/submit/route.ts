// File: app/api/daily/submit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";
import { ensureTrialAndCheckAccess } from "@/lib/access";

// Helps avoid caching weirdness in App Router
export const dynamic = "force-dynamic";

type Body = {
  positiveText?: string;
  emotion?: string;
  energy?: string;
};

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function localYYYYMMDD(d: Date) {
  // Keep consistent with the user's expectation (Estonia-style "today"),
  // without doing timezone libraries here.
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, supabase } = await getApiSupabase(req);

    if (!userId) {
      return json(401, { error: "unauthorized" });
    }

    // Premium / Trial gate (single source of truth)
    const access = await ensureTrialAndCheckAccess(supabase as any, userId);
    if (!access.hasAccess) {
      return json(402, { error: "premium_required" });
    }

    const body = (await req.json().catch(() => ({}))) as Body;

    const positiveText = String(body.positiveText ?? "").trim();
    const emotion = String(body.emotion ?? "").trim();
    const energy = String(body.energy ?? "").trim();

    if (positiveText.length < 3) {
      return json(400, { error: "positiveText_too_short" });
    }
    if (!emotion) {
      return json(400, { error: "emotion_required" });
    }
    if (!energy) {
      return json(400, { error: "energy_required" });
    }

    const date = localYYYYMMDD(new Date());

    // Save daily_reflections (upsert by user_id+date)
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
      console.error("daily/submit upsert error:", upsertErr);
      return json(500, { error: "save_failed" });
    }

    // Lightweight user_memory touch (never fail the whole request)
    // If your schema expects more, you can expand later — keep ETAPP 4 safe first.
    try {
      await supabase.from("user_memory").upsert(
        {
          user_id: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch (e) {
      // ignore intentionally
    }

    return json(200, { ok: true });
  } catch (e: any) {
    if (e?.status === 401) return json(401, { error: "unauthorized" });
    console.error("daily/submit error:", e);
    return json(500, { error: "server_error" });
  }
}
