// File: app/api/daily/today/route.ts
// FULL REPLACEMENT
//
// ✅ Production-correct "today":
// - Uses Postgres for Tallinn-local date (no Node Intl/timezone surprises)
// - Uses authed supabase client for read (RLS-safe)
// - Returns { date, reflection } with date = Tallinn YYYY-MM-DD

import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

async function getTallinnYmdFromPostgres(supabase: any) {
  // We ask Postgres for the Tallinn-local date boundary.
  // This avoids Intl/Node timezone issues completely.
  const { data, error } = await supabase.rpc("vent_today_tallinn");
  if (error) throw new Error(error.message);

  // Expecting RPC to return 'YYYY-MM-DD'
  const ymd = String(data ?? "").slice(0, 10);
  if (!ymd || ymd.length !== 10) throw new Error("invalid_today_date");
  return ymd;
}

export async function GET(req: NextRequest) {
  try {
    const { userId, supabase } = await getApiSupabase(req);
    if (!userId) return json(401, { error: "unauthorized" });

    // ✅ Postgres-defined Tallinn "today"
    const date = await getTallinnYmdFromPostgres(supabase);

    const { data, error } = await supabase
      .from("daily_reflections")
      .select("date, positive_text, emotion, energy")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    if (error) {
      console.error("daily/today fetch error:", error);
      return json(500, { error: "fetch_failed" });
    }

    return json(200, { date, reflection: data ?? null });
  } catch (e: any) {
    if (e?.status === 401) return json(401, { error: "unauthorized" });
    return json(500, { error: e?.message ?? "server_error" });
  }
}
