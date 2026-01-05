import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountPrefs = {
  memoryEnabled: boolean;
  reflectionMemoryEnabled: boolean;
};

export async function ensureProfileAndGetPrefs(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null }
): Promise<AccountPrefs> {
  // Ensure profile exists (upsert is safe)
  const email = user.email ?? null;

  const { error: upsertErr } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        email,
      },
      { onConflict: "user_id" }
    );

  // If it fails (rare), we still try to read prefs; defaults apply.
  if (upsertErr) {
    // don’t throw — keep app usable
    console.error("ensureProfileAndGetPrefs: upsert error:", upsertErr);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("memory_enabled, reflection_memory_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("ensureProfileAndGetPrefs: select error:", error);
    return { memoryEnabled: true, reflectionMemoryEnabled: true };
  }

  return {
    memoryEnabled: (data?.memory_enabled ?? true) as boolean,
    reflectionMemoryEnabled: (data?.reflection_memory_enabled ?? true) as boolean,
  };
}
