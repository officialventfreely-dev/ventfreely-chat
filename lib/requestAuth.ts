import { createClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { supabaseServer } from "./supabaseServer";

function getBearerToken(req: NextRequest): string | null {
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

export type AuthedUserResult =
  | { ok: true; user: User; mode: "bearer" | "cookie" }
  | { ok: false; status: 401; error: "UNAUTHORIZED" };

export async function getAuthedUser(req: NextRequest): Promise<AuthedUserResult> {
  // 1) Native app: Bearer token
  const bearer = getBearerToken(req);
  if (bearer) {
    const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getUser(bearer);
    if (error || !data?.user) return { ok: false, status: 401, error: "UNAUTHORIZED" };
    return { ok: true, user: data.user, mode: "bearer" };
  }

  // 2) Web: cookie session
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return { ok: false, status: 401, error: "UNAUTHORIZED" };
  return { ok: true, user: data.user, mode: "cookie" };
}
