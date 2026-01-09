import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";
import { ensureTrialAndCheckAccess } from "@/lib/access";
import { ensureProfileAndGetPrefs } from "@/lib/accountPrefs";

export async function GET(req: NextRequest) {
  const { userId, supabase } = await getApiSupabase(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // (optional but useful) fetch email in a way that works for BOTH cookie + bearer clients
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  // if token/cookie was weird, treat as unauthorized
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await ensureTrialAndCheckAccess(supabase as any, userId);

  const prefs = await ensureProfileAndGetPrefs(supabase as any, {
    id: userId,
    email: user.email ?? null,
  });

  return NextResponse.json({
    email: user.email ?? null,
    access,
    prefs,
  });
}
