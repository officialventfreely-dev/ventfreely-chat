// FILE: app/api/daily/today/route.ts
// FULL REPLACEMENT
//
// ✅ Fix:
// - Supports BOTH GET and POST (prevents 405 Method Not Allowed)
// - Tallinn-local date comes from Postgres RPC vent_today_tallinn (same family as submit)
// - Auth only to identify user (Bearer/cookie). Uses service-role to read reflection reliably.
// - No UI changes

import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";
import { supabaseService } from "@/lib/supabaseService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

async function getTallinnYmdFromPostgresAuthed(supabase: any) {
  const { data, error } = await supabase.rpc("vent_today_tallinn");
  if (error) throw new Error(error.message);

  const ymd = String(data ?? "").slice(0, 10);
  if (!ymd || ymd.length !== 10) throw new Error("invalid_today_date");
  return ymd;
}

async function handle(req: NextRequest) {
  const auth = await getApiSupabase(req);
  if (!auth) return json(401, { error: "Unauthorized" });

  const { userId, supabase } = auth;

  // ✅ Must match submit date logic
  const date = await getTallinnYmdFromPostgresAuthed(supabase);

  const { data: row, error } = await supabaseService
    .from("daily_reflections")
    .select("date, positive_text, emotion, energy, score, created_at")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return json(500, { error: error.message, stage: "select_today" });
  }

  // If none exists, return a calm empty payload (UI can show “not done” state)
  if (!row) {
    return json(200, {
      date,
      done: false,
      positive_text: null,
      emotion: null,
      energy: null,
    });
  }

  return json(200, {
    date,
    done: true,
    positive_text: row.positive_text ?? null,
    emotion: row.emotion ?? null,
    energy: row.energy ?? null,
  });
}

export async function GET(req: NextRequest) {
  try {
    return await handle(req);
  } catch (e: any) {
    return json(500, { error: e?.message ?? "server_error", stage: "unknown" });
  }
}

// Some clients accidentally call POST for “today” (or older app builds)
// so we support it too to avoid 405.
export async function POST(req: NextRequest) {
  try {
    return await handle(req);
  } catch (e: any) {
    return json(500, { error: e?.message ?? "server_error", stage: "unknown" });
  }
}
