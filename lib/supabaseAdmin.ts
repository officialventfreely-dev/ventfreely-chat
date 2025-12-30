// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// This client uses the SERVICE ROLE key – ONLY USE ON THE SERVER (API routes, webhooks)
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
