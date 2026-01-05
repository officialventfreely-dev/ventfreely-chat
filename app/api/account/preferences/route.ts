import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
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

  const prefs = await ensureProfileAndGetPrefs(supabase, { id: user.id, email: user.email });
  return NextResponse.json(prefs);
}

export async function POST(req: Request) {
  const supabase = await createClient();

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
  await ensureProfileAndGetPrefs(supabase, { id: user.id, email: user.email });

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

  const { error } = await supabase.from("profiles").update(update).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
