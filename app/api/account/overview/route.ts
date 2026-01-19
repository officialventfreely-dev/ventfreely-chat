// FILE: app/api/account/overview/route.ts
// FULL REPLACEMENT
//
// ✅ Fix: return 401 cleanly instead of throwing -> 500
// Works for both:
// - Mobile (Bearer token client from getApiSupabase)
// - Web (cookie session from supabaseServer)

import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";
import { ensureTrialAndCheckAccess } from "@/lib/access";
import { ensureProfileAndGetPrefs } from "@/lib/accountPrefs";

export async function GET(req: NextRequest) {
  try {
    const auth = await getApiSupabase(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId, supabase } = auth;

    // Fetch email in a way that works for BOTH cookie + bearer clients
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // FREE-FIRST: access always effectively allowed, but keep call for future
    let access: any = null;
    try {
      access = await ensureTrialAndCheckAccess(supabase as any, userId);
    } catch {
      access = null;
    }

    const prefs = await ensureProfileAndGetPrefs(supabase as any, {
      id: userId,
      email: user.email ?? null,
    });

    return NextResponse.json({
      email: user.email ?? null,
      access,
      prefs,
    });
  } catch (e) {
    console.error("account/overview error:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
