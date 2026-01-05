import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { ensureTrialAndCheckAccess } from "@/lib/access";
import { ensureProfileAndGetPrefs } from "@/lib/accountPrefs";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await ensureTrialAndCheckAccess(supabase, user.id);
  const prefs = await ensureProfileAndGetPrefs(supabase, { id: user.id, email: user.email });

  return NextResponse.json({
    email: user.email ?? null,
    access,
    prefs,
  });
}
