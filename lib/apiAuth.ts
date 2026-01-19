// FILE: lib/apiAuth.ts
// FULL REPLACEMENT
//
// ✅ Correct mobile + web auth handling (NO throws that become 500)
// - Mobile: extracts userId from Bearer JWT (sub) (no DB call)
// - Creates a Supabase client that uses the Bearer token for RLS-safe reads
// - Web: cookie-based supabaseServer() auth.getUser()
// - Returns `null` when unauthenticated (routes can return 401 cleanly)

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) throw new Error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL");
  return url;
}

function getAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return key;
}

export function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

function base64UrlToString(input: string) {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  return Buffer.from(b64 + pad, "base64").toString("utf8");
}

function getUserIdFromJwt(bearer: string): string | null {
  const parts = bearer.split(".");
  if (parts.length < 2) return null;

  try {
    const payloadJson = base64UrlToString(parts[1]);
    const payload = JSON.parse(payloadJson) as any;
    const sub = typeof payload?.sub === "string" ? payload.sub : null;
    return sub;
  } catch {
    return null;
  }
}

export type ApiAuthResult = {
  userId: string;
  user: User;
  supabase: SupabaseClient;
};

export async function getApiSupabase(req: NextRequest): Promise<ApiAuthResult | null> {
  const bearer = getBearerToken(req);

  // ✅ Mobile app: Bearer token
  if (bearer) {
    const userId = getUserIdFromJwt(bearer);
    if (!userId) return null;

    const supabase = createClient(getSupabaseUrl(), getAnonKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });

    return {
      userId,
      user: { id: userId } as any,
      supabase,
    };
  }

  // ✅ Web: cookie session
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.getUser();

  if (error || !data?.user) return null;

  return { userId: data.user.id, user: data.user, supabase: sb };
}
