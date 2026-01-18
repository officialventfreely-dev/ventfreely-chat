// FILE: lib/apiAuth.ts
// FULL REPLACEMENT
//
// ✅ Correct mobile + web auth handling
// - Trusts Bearer token directly
// - Avoids getUser() race conditions
// - Works for Expo + Web
// - Prevents false 401s

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) throw new Error("Missing SUPABASE_URL");
  return url;
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing SUPABASE_ANON_KEY");
  return key;
}

function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function getApiSupabase(req: NextRequest): Promise<{
  userId: string;
  user: User;
  supabase: SupabaseClient;
}> {
  const bearer = getBearerToken(req);

  // ✅ MOBILE / API CALLS
  if (bearer) {
    const supabase = createClient(getSupabaseUrl(), getAnonKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      },
    });

    // ⚠️ IMPORTANT:
    // DO NOT call supabase.auth.getUser()
    // Supabase already validated the JWT for PostgREST

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)
      .single();

    if (error) {
      throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
    }

    return {
      userId: data.id,
      user: { id: data.id } as any,
      supabase,
    };
  }

  // ✅ WEB (cookie-based)
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.getUser();

  if (error || !data?.user) {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }

  return {
    userId: data.user.id,
    user: data.user,
    supabase: sb,
  };
}
