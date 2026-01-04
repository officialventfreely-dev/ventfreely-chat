import type { SupabaseClient } from "@supabase/supabase-js";

type AccessResult = {
  hasAccess: boolean;
  reason: "ok" | "trial_active" | "premium_active" | "trial_expired" | "no_subscription_row";
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
  supabase: SupabaseClient,
  userId: string
): Promise<AccessResult> {
  const { data: subRow, error } = await supabase
    .from("subscriptions")
    .select("id, user_id, status, current_period_end, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      hasAccess: false,
      reason: "no_subscription_row",
      trialEndsAt: null,
      premiumUntil: null,
      status: null,
    };
  }

  // if no row yet -> create it + start trial
  if (!subRow) {
    const trialEndsAt = addDaysISO(3);

    const { error: insErr } = await supabase.from("subscriptions").insert({
      user_id: userId,
      status: "trial",
      trial_ends_at: trialEndsAt,
    });

    if (insErr) {
      return {
        hasAccess: false,
        reason: "no_subscription_row",
        trialEndsAt: null,
        premiumUntil: null,
        status: null,
      };
    }

    return {
      hasAccess: true,
      reason: "trial_active",
      trialEndsAt,
      premiumUntil: null,
      status: "trial",
    };
  }

  // ensure trial_ends_at exists once
  let trialEndsAt = subRow.trial_ends_at as string | null;
  if (!trialEndsAt) {
    trialEndsAt = addDaysISO(3);
    await supabase
      .from("subscriptions")
      .update({ trial_ends_at: trialEndsAt, status: subRow.status ?? "trial" })
      .eq("user_id", userId);
  }

  const now = new Date();

  const trialActive = trialEndsAt ? new Date(trialEndsAt) > now : false;

  const status = (subRow.status ?? "").toLowerCase();
  const premiumUntil = subRow.current_period_end as string | null;

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
