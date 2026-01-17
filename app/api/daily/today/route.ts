// File: app/api/daily/today/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

function json(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function getTallinnYMD() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Tallinn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export async function GET(req: NextRequest) {
  try {
    const { userId, supabase } = await getApiSupabase(req);

    if (!userId) return json(401, { error: "unauthorized" });

    // ✅ IMPORTANT: use Tallinn-local date (not UTC)
    const date = getTallinnYMD();

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
