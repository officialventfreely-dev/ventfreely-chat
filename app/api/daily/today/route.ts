// File: app/api/daily/today/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { userId, supabase } = await getApiSupabase(req);

    if (!userId) return json(401, { error: "unauthorized" });

    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(today.getUTCDate()).padStart(2, "0");
    const date = `${yyyy}-${mm}-${dd}`;

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
    return json(500, { error: "server_error" });
  }
}
