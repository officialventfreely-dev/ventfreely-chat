import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureTrialAndCheckAccess } from "@/lib/access";

/**
 * Daily API kasutab seda.
 * ETAPP 2 funktsioon jääb samaks.
 */
export async function ensureDailyAccess(userId: string) {
  // sinu error ütles, et access.ts ootab userId argumenti kuskil teisel kohal.
  // kõige tüüpilisem ETAPP 2 variant: ensureTrialAndCheckAccess(supabaseAdmin, userId)
  return ensureTrialAndCheckAccess(supabaseAdmin, userId);
}
