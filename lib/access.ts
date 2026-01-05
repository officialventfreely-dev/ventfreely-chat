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

export async function ensureTrialAndCheckAccess(
  supabaseSession: SupabaseClient,
  userId: string
): Promise<AccessResult> {
  // ✅ Always read MOST RECENT row
  let subRow = await readLatestSubscriptionRow(supabaseSession, userId);

  // If no row -> create trial row (service role) using UPSERT to avoid duplicates
  if (!subRow) {
    const trialEndsAt = addDaysISO(3);

    const { error: upsertErr } = await supabaseService
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          status: "trial",
          trial_ends_at: trialEndsAt,
          updated_at: new Date().toISOString(),
          // IMPORTANT: do NOT set shopify_subscription_id here (trial rows must keep it NULL)
        },
        { onConflict: "user_id" }
      );

    if (upsertErr) {
      // Don't hard-deny immediately: could be a race where row was created elsewhere
      console.error(
        "ensureTrialAndCheckAccess: upsert trial row error:",
        upsertErr
      );
    }

    // Re-read after attempting to create
    subRow = await readLatestSubscriptionRow(supabaseSession, userId);

    // If still no row (very unlikely) -> deny safely
    if (!subRow) {
      return {
        hasAccess: false,
        reason: "trial_expired",
        trialEndsAt: null,
        premiumUntil: null,
        status: null,
      };
    }
  }

  const rawStatus = (subRow.status as string | null) ?? null;
  const status = (rawStatus ?? "").toLowerCase();

  const premiumUntil = (subRow.current_period_end as string | null) ?? null;

  // --- PREMIUM LOGIC ---
  // Shopify active/trialing may have current_period_end = NULL.
  const isCanceled =
    status === "canceled" ||
    status === "cancelled" ||
    status === "expired" ||
    status === "inactive";

  const premiumStatusOk = status === "active" || status === "trialing";

  const premiumActive =
    !isCanceled && premiumStatusOk && (premiumUntil === null || isFuture(premiumUntil));

  if (premiumActive) {
    return {
      hasAccess: true,
      reason: "premium_active",
      trialEndsAt: (subRow.trial_ends_at as string | null) ?? null,
      premiumUntil,
      status: rawStatus,
    };
  }

  // --- TRIAL LOGIC ---
  // Ensure trial_ends_at exists (only for non-premium users)
  let trialEndsAt = (subRow.trial_ends_at as string | null) ?? null;

  if (!trialEndsAt) {
    trialEndsAt = addDaysISO(3);

    // Update only if still missing, to avoid overwriting other logic
    const { error: updErr } = await supabaseService
      .from("subscriptions")
      .update({
        trial_ends_at: trialEndsAt,
        // Keep existing status if present, else default to trial
        status: rawStatus ?? "trial",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updErr) {
      // Again: don't hard deny immediately — re-read row and continue
      console.error("ensureTrialAndCheckAccess: set trial_ends_at error:", updErr);
      const reread = await readLatestSubscriptionRow(supabaseSession, userId);
      if (reread) {
        subRow = reread;
        trialEndsAt = (subRow.trial_ends_at as string | null) ?? trialEndsAt;
      }
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
