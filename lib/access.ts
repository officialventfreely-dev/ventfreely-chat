import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseService } from "@/lib/supabaseService";

type AccessResult = {
  hasAccess: boolean;
  reason: "trial_active" | "premium_active" | "trial_expired";
  trialEndsAt: string | null;
  premiumUntil: string | null;
  status: string | null;
};

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function ensureTrialAndCheckAccess(
  supabaseSession: SupabaseClient,
  userId: string
): Promise<AccessResult> {
  // Read current subscription row (session client)
  const { data: subRow } = await supabaseSession
    .from("subscriptions")
    .select("user_id, status, current_period_end, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();

  // If no row -> create row + start trial (ADMIN / service role)
  if (!subRow) {
    const trialEndsAt = addDaysISO(3);

    await supabaseService.from("subscriptions").insert({
      user_id: userId,
      status: "trial",
      trial_ends_at: trialEndsAt,
    });

    return {
      hasAccess: true,
      reason: "trial_active",
      trialEndsAt,
      premiumUntil: null,
      status: "trial",
    };
  }

  // Ensure trial_ends_at exists once (ADMIN)
  let trialEndsAt = (subRow.trial_ends_at as string | null) ?? null;
  if (!trialEndsAt) {
    trialEndsAt = addDaysISO(3);
    await supabaseService
      .from("subscriptions")
      .update({ trial_ends_at: trialEndsAt, status: subRow.status ?? "trial" })
      .eq("user_id", userId);
  }

  const now = new Date();

  const status = ((subRow.status ?? "") as string).toLowerCase();
  const premiumUntil = (subRow.current_period_end as string | null) ?? null;

  const premiumActive =
    (status === "active" || status === "trialing") &&
    !!premiumUntil &&
    new Date(premiumUntil) > now;

  if (premiumActive) {
    return {
      hasAccess: true,
      reason: "premium_active",
      trialEndsAt,
      premiumUntil,
      status: subRow.status ?? null,
    };
  }

  const trialActive = trialEndsAt ? new Date(trialEndsAt) > now : false;

  if (trialActive) {
    return {
      hasAccess: true,
      reason: "trial_active",
      trialEndsAt,
      premiumUntil,
      status: subRow.status ?? null,
    };
  }

  return {
    hasAccess: false,
    reason: "trial_expired",
    trialEndsAt,
    premiumUntil,
    status: subRow.status ?? null,
  };
}
