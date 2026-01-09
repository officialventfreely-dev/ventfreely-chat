import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";
import { ensureProfileAndGetPrefs } from "@/lib/accountPrefs";

export async function GET(req: NextRequest) {
  const { userId, supabase } = await getApiSupabase(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // get email (works for both cookie + bearer)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = await ensureProfileAndGetPrefs(supabase as any, {
    id: userId,
    email: user.email ?? null,
  });

  return NextResponse.json(prefs);
}

export async function POST(req: NextRequest) {
  const { userId, supabase } = await getApiSupabase(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    memoryEnabled?: boolean;
    reflectionMemoryEnabled?: boolean;
  };

  // Ensure row exists (and get defaults)
  await ensureProfileAndGetPrefs(supabase as any, { id: userId, email: user.email ?? null });

  const nextMemoryEnabled = typeof body.memoryEnabled === "boolean" ? body.memoryEnabled : undefined;
  const nextReflectionEnabled =
    typeof body.reflectionMemoryEnabled === "boolean" ? body.reflectionMemoryEnabled : undefined;

  const update: Record<string, any> = {};
  if (typeof nextMemoryEnabled === "boolean") update.memory_enabled = nextMemoryEnabled;
  if (typeof nextReflectionEnabled === "boolean")
    update.reflection_memory_enabled = nextReflectionEnabled;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(update).eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
