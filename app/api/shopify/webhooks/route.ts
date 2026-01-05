import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseService } from "@/lib/supabaseService";

function timingSafeEqual(a: string, b: string) {
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function verifyShopifyHmac(rawBody: string, hmacHeader: string | null) {
  if (!hmacHeader) return false;

  // IMPORTANT:
  // This MUST be the "webhook signing secret" shown in Shopify Admin > Notifications > Webhooks
  // NOT the Shopify App "Client secret" from the Partners/Dev dashboard.
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return false;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  return timingSafeEqual(digest, hmacHeader);
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const topic = req.headers.get("x-shopify-topic") || "";
  const webhookId =
    req.headers.get("x-shopify-webhook-id") ||
    `${topic}:${req.headers.get("x-shopify-event-id") || ""}`;

  // Basic visibility in Vercel logs
  console.log("[shopify-webhook] received", { topic, webhookId });

  if (!verifyShopifyHmac(rawBody, hmac)) {
    console.error("[shopify-webhook] Invalid HMAC", {
      topic,
      webhookId,
      hasSecret: Boolean(process.env.SHOPIFY_WEBHOOK_SECRET),
      hasHmacHeader: Boolean(hmac),
    });

    // Return 401 so Shopify marks as failed (useful for debugging)
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  let payload: any = null;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error("[shopify-webhook] Invalid JSON", e);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // If webhookId missing, fallback to topic + payload.id (avoid null)
  const finalWebhookId =
    webhookId || `${topic}:${payload?.id?.toString?.() ?? String(payload?.id ?? "")}`;

  // Idempotency
  const { data: exists, error: existsErr } = await supabaseService
    .from("webhook_events")
    .select("id")
    .eq("webhook_id", finalWebhookId)
    .maybeSingle();

  if (existsErr) {
    console.error("[shopify-webhook] webhook_events lookup error:", existsErr);
    // Fail-safe: return 200 to avoid infinite retries
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (exists?.id) {
    console.log("[shopify-webhook] duplicate ignored", { finalWebhookId });
    return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
  }

  const { error: insertEvtErr } = await supabaseService
    .from("webhook_events")
    .insert({ webhook_id: finalWebhookId, topic });

  if (insertEvtErr) {
    console.error("[shopify-webhook] webhook_events insert error:", insertEvtErr);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // ---- Handlers ----

  // 1) Subscription contracts lifecycle (only works if you actually created these webhooks)
  if (topic.startsWith("subscription_contracts/")) {
    const contractId = payload?.id?.toString?.() ?? payload?.id;
    const status = payload?.status;
    const nextBilling = payload?.next_billing_date ?? null;

    if (!contractId) return NextResponse.json({ ok: true }, { status: 200 });

    const { data: subRow, error: subErr } = await supabaseService
      .from("subscriptions")
      .select("user_id, shopify_subscription_id")
      .eq("shopify_subscription_id", String(contractId))
      .maybeSingle();

    if (subErr) console.error("[shopify-webhook] subscriptions lookup error:", subErr);
    if (!subRow?.user_id) {
      console.warn("[shopify-webhook] no subscription row for contractId", { contractId });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const update: any = { status: "active", updated_at: new Date().toISOString() };

    if (nextBilling) update.current_period_end = new Date(nextBilling).toISOString();

    if (topic.endsWith("/cancel") || status === "cancelled" || status === "canceled") {
      update.status = "canceled";
    }

    await supabaseService.from("subscriptions").update(update).eq("user_id", subRow.user_id);

    console.log("[shopify-webhook] subscription updated", { userId: subRow.user_id, update });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // 2) Orders paid (this is what your Shopify Admin screenshot shows you created)
  if (topic === "orders/paid") {
    const email: string | undefined = payload?.email || payload?.customer?.email;
    const orderId: string | number | undefined = payload?.id;

    if (!email) {
      console.warn("[shopify-webhook] orders/paid missing email", { orderId });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const { data: userRow, error: userErr } = await supabaseService
      .from("users_view")
      .select("id,email")
      .eq("email", email)
      .maybeSingle();

    if (userErr) console.error("[shopify-webhook] users_view lookup error:", userErr);

    if (!userRow?.id) {
      console.warn("[shopify-webhook] user not found for email", { email });
      return NextResponse.json({ ok: true, userNotFound: true }, { status: 200 });
    }

    const days = Number(process.env.PREMIUM_DAYS_PER_PAYMENT ?? "14");
    const end = new Date();
    end.setDate(end.getDate() + days);

    await supabaseService
      .from("subscriptions")
      .upsert(
        {
          user_id: userRow.id,
          status: "active",
          current_period_end: end.toISOString(),
          // if your payload contains contract id, keep it, else null
          shopify_subscription_id: payload?.subscription_contract_id
            ? String(payload.subscription_contract_id)
            : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    console.log("[shopify-webhook] order activated subscription", {
      userId: userRow.id,
      orderId,
      email,
    });

    return NextResponse.json({ ok: true, orderId }, { status: 200 });
  }

  console.log("[shopify-webhook] ignored topic", { topic });
  return NextResponse.json({ ok: true, ignored: topic }, { status: 200 });
}
