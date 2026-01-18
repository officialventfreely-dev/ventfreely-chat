// File: app/api/daily/submit/route.ts
// FULL REPLACEMENT
//
// ✅ Production-correct Daily submit:
// - Date comes from Postgres RPC: public.vent_today_tallinn() (Tallinn-local)
// - Always sets score (handles NOT NULL score constraint)
// - Service-role writes (bypass RLS) + auth only to identify user
// - Insert-or-update (no dependency on updated_at / unique constraints)
// - Better error diagnostics (stage + date + userId)

import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";
import { supabaseService } from "@/lib/supabaseService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
  positiveText?: string;
  positive_text?: string;
  emotion?: string;
  energy?: string;
};

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function energyToScore(energyRaw: string) {
  const e = (energyRaw || "").trim().toLowerCase();
  if (e === "low") return 1;
  if (e === "okay") return 2;
  if (e === "good") return 3;
  if (e === "great") return 4;
  return 2; // safe default
}

async function getTallinnYmdFromPostgres(): Promise<string> {
  // Use service-role to call RPC (always available, no RLS surprises)
  const { data, error } = await supabaseService.rpc("vent_today_tallinn");
  if (error) throw new Error(error.message);

  // RPC returns date; Supabase may serialize as "YYYY-MM-DD" or ISO
  const ymd = String(data ?? "").slice(0, 10);
  if (!ymd || ymd.length !== 10) throw new Error("invalid_today_date");
  return ymd;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getApiSupabase(req);
    if (!userId) return json(401, { error: "unauthorized" });

    const body = (await req.json().catch(() => ({}))) as Body;

    const positiveText = String(body.positiveText ?? body.positive_text ?? "").trim();
    const emotion = String(body.emotion ?? "").trim();
    const energy = String(body.energy ?? "").trim();

    if (positiveText.length < 3) return json(400, { error: "positiveText too short" });
    if (positiveText.length > 1000) return json(400, { error: "positiveText too long" });
    if (!emotion) return json(400, { error: "emotion required" });
    if (!energy) return json(400, { error: "energy required" });

    const targetDate = await getTallinnYmdFromPostgres();
    const score = energyToScore(energy);

    // 1) Check if today's row exists
    const { data: existing, error: existErr } = await supabaseService
      .from("daily_reflections")
      .select("id")
      .eq("user_id", userId)
      .eq("date", targetDate)
      .maybeSingle();

    if (existErr) {
      return json(500, {
        error: existErr.message,
        stage: "select_existing",
        userId,
        date: targetDate,
      });
    }

    if (existing?.id) {
      // 2a) Update existing
      const { error: updErr } = await supabaseService
        .from("daily_reflections")
        .update({
          positive_text: positiveText,
          emotion,
          energy,
          score, // ✅ NOT NULL safe
        })
        .eq("id", existing.id);

      if (updErr) {
        return json(500, {
          error: updErr.message,
          stage: "update_existing",
          userId,
          date: targetDate,
        });
      }

      return json(200, { ok: true, date: targetDate, mode: "updated" });
    }

    // 2b) Insert new
    const { error: insErr } = await supabaseService.from("daily_reflections").insert({
      user_id: userId,
      date: targetDate,
      positive_text: positiveText,
      emotion,
      energy,
      score, // ✅ NOT NULL safe
    });

    if (insErr) {
      return json(500, {
        error: insErr.message,
        stage: "insert_new",
        userId,
        date: targetDate,
      });
    }

    return json(200, { ok: true, date: targetDate, mode: "inserted" });
  } catch (e: any) {
    return json(500, { error: e?.message ?? "server_error", stage: "unknown" });
  }
}
