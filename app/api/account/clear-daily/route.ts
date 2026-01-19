// FILE: app/api/account/clear-daily/route.ts
// FULL REPLACEMENT
//
// ✅ Fix: getApiSupabase now returns ApiAuthResult | null
// so we must handle null -> 401 instead of destructuring.

import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  try {
    const auth = await getApiSupabase(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, supabase } = auth;

    // Delete daily reflections for this user
    const { error } = await supabase.from("daily_reflections").delete().eq("user_id", userId);

    if (error) {
      console.error("clear-daily error:", error);
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("clear-daily server_error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
