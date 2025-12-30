import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

// Example shape - you will adjust fields to match your Shopify app's webhook payload
type ShopifySubscriptionEvent = {
  customer: {
    email: string;
  };
  id: string; // subscription ID from Shopify
  status: string; // e.g. "ACTIVE", "CANCELLED"
  current_period_end: string; // ISO date string
};

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    // TODO later: verify Shopify HMAC signature here for security.
    // For now we just parse the JSON to get things working.

    const data = JSON.parse(rawBody) as ShopifySubscriptionEvent;

    const email = data.customer?.email?.trim().toLowerCase();
    const shopifySubId = data.id;
    const statusRaw = data.status;
    const periodEnd = new Date(data.current_period_end);

    if (!email) {
      console.warn("Shopify webhook: missing customer email");
      return NextResponse.json({ ok: true });
    }

    // Map Shopify status to our own
    const status =
      statusRaw === "ACTIVE"
        ? "active"
        : statusRaw === "CANCELLED"
        ? "canceled"
        : "expired";

    // 1) Find user in Supabase by email (using users_view)
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users_view")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (userError || !userData) {
      console.warn("Shopify webhook: no user found for email:", email, userError);
      // We still return ok to avoid Shopify retry storms
      return NextResponse.json({ ok: true });
    }

    const userId = userData.id;

    // 2) Upsert subscription row
    const { error: upsertError } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          shopify_subscription_id: shopifySubId,
          status,
          current_period_end: periodEnd.toISOString(),
        },
        { onConflict: "shopify_subscription_id" }
      );

    if (upsertError) {
      console.error("Shopify webhook: upsert error", upsertError);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Shopify webhook error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
