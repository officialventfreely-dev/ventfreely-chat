// FILE: ventfreely-chat/lib/supabaseService.ts
// FULL REPLACEMENT
//
// ✅ Production-safe service client:
// - Uses SUPABASE_URL (server) with fallback to NEXT_PUBLIC_SUPABASE_URL
// - Hard-fails with a clear error if SERVICE_ROLE_KEY is missing
// - No persisted session

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) in server environment.");
}

if (!supabaseServiceKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in server environment.");
}

export const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
