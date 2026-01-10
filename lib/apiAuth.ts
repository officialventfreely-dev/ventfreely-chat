// File: lib/apiAuth.ts

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL in env.");
  return url;
}

function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY in env.");
  return key;
}

export async function getApiSupabase(req: NextRequest): Promise<{
  userId: string;
  user: User;
  supabase: SupabaseClient;
}> {
  const bearer = getBearerToken(req);

  // Mobile app: Bearer token (RLS-safe)
  if (bearer) {
    const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });

    // IMPORTANT: Use getUser() without args so it reads from Authorization header (most stable across versions)
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
    }

    return { userId: data.user.id, user: data.user, supabase };
  }

  // Web: cookie session
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
    }

  return { userId: data.user.id, user: data.user, supabase: sb };
}
