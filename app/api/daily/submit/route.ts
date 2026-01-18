// File: app/api/daily/submit/route.ts
// FULL REPLACEMENT
//
// Fix: Daily not saving from mobile due to RLS/auth context mismatch.
// Solution: use service-role client for writes, keep auth only for identifying user.
// Also: enforce 1x / 24h window (within 24h -> update same slot/date).

import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";
import { supabaseService } from "@/lib/supabaseService";

export const dynamic = "force-dynamic";

type Body = {
  // accept both (mobile/web compatibility)
  positiveText?: string;
  positive_text?: string;
  emotion?: string;
  energy?: string;
};

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function formatTallinnDate(d: Date) {
  // YYYY-MM-DD in Europe/Tallinn (stable + correct for user)
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Tallinn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${day}`;
}

export async function POST(req: NextRequest) {
  try {
    // We only use this to identify the user (works for both cookie + bearer)
    const { userId } = await getApiSupabase(req);

    if (!userId) return json(401, { error: "unauthorized" });

    const body = (await req.json().catch(() => ({}))) as Body;

    const positiveText = String(body.positiveText ?? body.positive_text ?? "").trim();
    const emotion = String(body.emotion ?? "").trim();
    const energy = String(body.energy ?? "").trim();

    // generous guardrails (same idea as before)
    if (positiveText.length < 3) return json(400, { error: "positiveText too short" });
    if (positiveText.length > 1000) return json(400, { error: "positiveText too long" });
    if (!emotion) return json(400, { error: "emotion required" });
    if (!energy) return json(400, { error: "energy required" });

    // 1x / 24h: if user has a reflection created in the last 24h,
    // we update that same "slot" (same date) instead of creating a new one.
    const now = new Date();
    const nowIso = now.toISOString();

    let targetDate = formatTallinnDate(now);
    let reusedWithin24h = false;

    const { data: lastRow, error: lastErr } = await supabaseService
      .from("daily_reflections")
      .select("date, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastErr && lastRow?.created_at) {
      const lastCreatedAt = new Date(lastRow.created_at);
      const diffMs = now.getTime() - lastCreatedAt.getTime();
      const within24h = diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000;

      if (within24h && lastRow.date) {
        targetDate = String(lastRow.date);
        reusedWithin24h = true;
      }
    }

    // ✅ WRITE via service role (bypasses RLS issues from mobile bearer context)
    const { error: upsertErr } = await supabaseService
      .from("daily_reflections")
      .upsert(
        {
          user_id: userId,
          date: targetDate,
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

    // optional lightweight touch
    try {
      await supabaseService
        .from("user_memory")
        .upsert({ user_id: userId, updated_at: nowIso }, { onConflict: "user_id" });
    } catch {}

    return json(200, {
      ok: true,
      date: targetDate,
      reused: reusedWithin24h, // UI can ignore
    });
  } catch (e: any) {
    return json(500, { error: e?.message ?? "server_error" });
  }
}
