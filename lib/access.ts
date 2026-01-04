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

function isFuture(iso: string | null) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t > Date.now();
}

export async function ensureTrialAndCheckAccess(
  supabaseSession: SupabaseClient,
  userId: string
): Promise<AccessResult> {
  // ✅ Read MOST RECENT subscription row (session client)
  const { data: subRows, error: subErr } = await supabaseSession
    .from("subscriptions")
    .select("user_id, status, current_period_end, trial_ends_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (subErr) {
    console.error("ensureTrialAndCheckAccess: read subscription error:", subErr);
  }

  const subRow = subRows?.[0] ?? null;

  // If no row -> create row + start trial (ADMIN / service role)
  if (!subRow) {
    const trialEndsAt = addDaysISO(3);

    const { error: insErr } = await supabaseService.from("subscriptions").insert({
      user_id: userId,
      status: "trial",
      trial_ends_at: trialEndsAt,
    });

    if (insErr) {
      console.error("ensureTrialAndCheckAccess: insert trial row error:", insErr);
      // Fail-safe: if insert fails, deny access
      return {
        hasAccess: false,
        reason: "trial_expired",
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

  const rawStatus = (subRow.status as string | null) ?? null;
  const status = (rawStatus ?? "").toLowerCase();

  const premiumUntil = (subRow.current_period_end as string | null) ?? null;

  // --- PREMIUM LOGIC (FIXED) ---
  // Shopify active subscriptions may have current_period_end = NULL.
  const isCanceled =
    status === "canceled" ||
    status === "cancelled" ||
    status === "expired" ||
    status === "inactive";

  const premiumStatusOk = status === "active" || status === "trialing";

  const premiumActive =
    !isCanceled &&
    premiumStatusOk &&
    (premiumUntil === null || isFuture(premiumUntil));

  if (premiumActive) {
    return {
      hasAccess: true,
      reason: "premium_active",
      trialEndsAt: (subRow.trial_ends_at as string | null) ?? null,
      premiumUntil,
      status: rawStatus,
    };
  }

  // Ensure trial_ends_at exists once (ADMIN) — only for non-premium users
  let trialEndsAt = (subRow.trial_ends_at as string | null) ?? null;

  if (!trialEndsAt) {
    trialEndsAt = addDaysISO(3);

    const { error: updErr } = await supabaseService
      .from("subscriptions")
      .update({
        trial_ends_at: trialEndsAt,
        status: rawStatus ?? "trial",
      })
      .eq("user_id", userId);

    if (updErr) {
      console.error("ensureTrialAndCheckAccess: set trial_ends_at error:", updErr);
      return {
        hasAccess: false,
        reason: "trial_expired",
        trialEndsAt: null,
        premiumUntil,
        status: rawStatus,
      };
    }
  }

  const trialActive = isFuture(trialEndsAt);

  if (trialActive) {
    return {
      hasAccess: true,
      reason: "trial_active",
      trialEndsAt,
      premiumUntil,
      status: rawStatus,
    };
  }

  return {
    hasAccess: false,
    reason: "trial_expired",
    trialEndsAt,
    premiumUntil,
    status: rawStatus,
  };
}
