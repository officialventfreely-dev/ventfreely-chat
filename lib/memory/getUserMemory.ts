import { createClient } from "@/lib/supabaseServer";

export type UserMemory = {
  dominant_emotions: string[] | null;
  recurring_themes: string[] | null;
  preferred_tone: string | null;
  energy_pattern: string | null;
};

export async function getUserMemory(): Promise<UserMemory | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_memory")
    .select("dominant_emotions, recurring_themes, preferred_tone, energy_pattern")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return null;
  return data ?? null;
}
