// FILE: app/api/account/summary/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { ensureTrialAndCheckAccess } from "@/lib/access";

type UserMemoryRow = {
  dominant_emotions: string[] | null;
  recurring_themes: string[] | null;
  preferred_tone: string | null;
  energy_pattern: string | null;
  updated_at?: string | null;
};

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Access (trial/premium) from existing logic (uses subscriptions table)
  const access = await ensureTrialAndCheckAccess(supabase, user.id);

  // user_memory (read-only)
  let memory: UserMemoryRow | null = null;
  try {
    const { data, error } = await supabase
      .from("user_memory")
      .select("dominant_emotions, recurring_themes, preferred_tone, energy_pattern, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error) memory = (data as UserMemoryRow) ?? null;
  } catch (e) {
    console.error("account summary: failed to read user_memory", e);
  }

  return NextResponse.json({
    user: { email: user.email ?? null },
    access,
    memory,
  });
}
