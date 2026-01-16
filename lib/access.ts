// File: lib/access.ts

import type { SupabaseClient } from "@supabase/supabase-js";

type AccessResult = {
  hasAccess: boolean; // true = Premium (paid) OR FREE_MODE bypass
  reason: "premium_active" | "free";
  trialEndsAt: string | null; // kept for compatibility (always null in new model)
  premiumUntil: string | null;
  status: string | null;
};

/**
 * FREE-FIRST SWITCH
 * - When FREE_MODE is enabled, all users have access as if Premium.
 * - This keeps subscription/webhook architecture intact for later re-enable.
 *
 * How to enable:
 *   Set environment variable:
 *     FREE_MODE=true
 *
 * Notes:
 * - We intentionally do NOT write anything to DB in free mode.
 * - We avoid returning "free" in free mode so upstream gates won't block.
 */
function isFreeModeEnabled() {
  const v =
    process.env.FREE_MODE ??
    process.env.NEXT_PUBLIC_FREE_MODE ?? // optional fallback if you ever mirror it (not required)
    "";
  return String(v).toLowerCase().trim() === "true";
}

function isFuture(iso: string | null) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t > Date.now();
}

function normalizeStatus(raw: string | null) {
  return (raw ?? "").toLowerCase().trim();
}

function isCanceledStatus(status: string) {
  return (
    status === "canceled" ||
    status === "cancelled" ||
    status === "expired" ||
    status === "inactive"
  );
}

async function readLatestSubscriptionRow(
  supabaseSession: SupabaseClient,
  userId: string
) {
  const { data: subRows, error: subErr } = await supabaseSession
    .from("subscriptions")
    .select("user_id, status, current_period_end, trial_ends_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (subErr) {
    console.error("ensureTrialAndCheckAccess: read subscription error:", subErr);
    return null;
  }

  return subRows?.[0] ?? null;
}

/**
 * NEW MODEL (Ventfreely):
 * - Free by default (no auto-trial creation)
 * - Premium ONLY if:
 *    status is active/trialing
 *    AND current_period_end is in the future
 * - Trial rows (status="trial", trial_ends_at) are ignored for access
 *   (they can exist in DB from older versions; doesn't matter)
 *
 * FREE MODE override:
 * - If FREE_MODE=true, ALWAYS allow access (acts like Premium)
 */
export async function ensureTrialAndCheckAccess(
  supabaseSession: SupabaseClient,
  userId: string
): Promise<AccessResult> {
  // FREE MODE: everything unlocked, no DB reads required
  if (isFreeModeEnabled()) {
    return {
      hasAccess: true,
      reason: "premium_active",
      trialEndsAt: null,
      premiumUntil: null,
      status: "free_mode",
    };
  }

  // Guard: never write/read with empty userId
  if (!userId) {
    return {
      hasAccess: false,
      reason: "free",
      trialEndsAt: null,
      premiumUntil: null,
      status: null,
    };
  }

  const subRow = await readLatestSubscriptionRow(supabaseSession, userId);

  // No subscription row => FREE
  if (!subRow) {
    return {
      hasAccess: false,
      reason: "free",
      trialEndsAt: null,
      premiumUntil: null,
      status: null,
    };
  }

  const rawStatus = (subRow.status as string | null) ?? null;
  const status = normalizeStatus(rawStatus);

  const premiumUntil = (subRow.current_period_end as string | null) ?? null;

  // Premium active ONLY if paid period exists and is in the future
  const canceled = isCanceledStatus(status);
  const premiumStatusOk = status === "active" || status === "trialing";
  const premiumActive = !canceled && premiumStatusOk && isFuture(premiumUntil);

  if (premiumActive) {
    return {
      hasAccess: true,
      reason: "premium_active",
      trialEndsAt: null,
      premiumUntil,
      status: rawStatus,
    };
  }

  // Everything else => FREE
  return {
    hasAccess: false,
    reason: "free",
    trialEndsAt: null,
    premiumUntil,
    status: rawStatus,
  };
}
