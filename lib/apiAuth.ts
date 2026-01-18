// File: lib/apiAuth.ts
// FULL REPLACEMENT
//
// ✅ Production-correct API auth for BOTH web + native:
// - Native: Authorization Bearer token -> getUser(bearer) (robust, does not depend on header propagation)
// - Web: cookie session via supabaseServer()
// - Returns { userId, user, supabase } where supabase is RLS-safe authed client

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
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL in env.");
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY in env.");
  return key;
}

export async function getApiSupabase(req: NextRequest): Promise<{
  userId: string;
  user: User;
  supabase: SupabaseClient;
}> {
  const bearer = getBearerToken(req);

  // Native app: Bearer token
  if (bearer) {
    const url = getSupabaseUrl();
    const anon = getSupabaseAnonKey();

    // RLS-safe client; we attach both apikey + Authorization
    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        headers: {
          apikey: anon,
          Authorization: `Bearer ${bearer}`,
        },
      },
    });

    // ✅ Most robust: pass token directly (avoids any header propagation weirdness)
    const { data, error } = await supabase.auth.getUser(bearer);
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
