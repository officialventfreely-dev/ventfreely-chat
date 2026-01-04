import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseService } from "@/lib/supabaseService";

function verifyShopifyHmac(rawBody: string, hmacHeader: string | null) {
  if (!hmacHeader) return false;
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET!;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(hmacHeader, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyHmac(rawBody, hmac)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic") || "";
  const payload = JSON.parse(rawBody);

  // idempotency: Shopify webhook unique id
  const webhookId =
    req.headers.get("x-shopify-webhook-id") || `${topic}:${payload?.id ?? ""}`;

  // ✅ store webhookId so duplicates don't re-apply
  const { data: exists, error: existsErr } = await supabaseService
    .from("webhook_events")
    .select("id")
    .eq("webhook_id", webhookId)
    .maybeSingle();

  if (existsErr) {
    console.error("webhook_events lookup error:", existsErr);
    // fail-safe: still return 200 to avoid infinite retries
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (exists?.id) {
    // duplicate delivery → ignore
    return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
  }

  const { error: insertEvtErr } = await supabaseService
    .from("webhook_events")
    .insert({ webhook_id: webhookId, topic });

  if (insertEvtErr) {
    console.error("webhook_events insert error:", insertEvtErr);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // ✅ NOW handle your subscription updates:
  // You said you have shopify_subscription_id in subscriptions table.
  // Let's cover the essential lifecycle topics.

  if (topic.startsWith("subscription_contracts/")) {
    const contractId = payload?.id?.toString?.() ?? payload?.id;
    const status = payload?.status; // active / cancelled etc (depends on payload)
    const nextBilling = payload?.next_billing_date ?? null; // sometimes present

    if (!contractId) return NextResponse.json({ ok: true }, { status: 200 });

    // find row by shopify_subscription_id
    const { data: subRow, error: subErr } = await supabaseService
      .from("subscriptions")
      .select("user_id, shopify_subscription_id")
      .eq("shopify_subscription_id", String(contractId))
      .maybeSingle();

    if (subErr) console.error("subscriptions lookup error:", subErr);
    if (!subRow?.user_id) return NextResponse.json({ ok: true }, { status: 200 });

    // Decide status + period end
    const update: any = { status: "active" };

    // If we have next billing date, use it as period end, else keep existing (or set +30d as fallback)
    if (nextBilling) update.current_period_end = new Date(nextBilling).toISOString();

    // Cancel event → keep active until period end OR mark canceled immediately
    if (topic.endsWith("/cancel") || status === "cancelled" || status === "canceled") {
      update.status = "canceled";
      // optional: keep current_period_end as-is (user has access until it ends)
    }

    await supabaseService
      .from("subscriptions")
      .update(update)
      .eq("user_id", subRow.user_id);

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // If your Shopify setup uses orders/paid instead:
  if (topic === "orders/paid") {
    const email: string | undefined = payload?.email || payload?.customer?.email;
    const orderId: string | number | undefined = payload?.id;

    if (!email) return NextResponse.json({ ok: true }, { status: 200 });

    const { data: userRow } = await supabaseService
      .from("users_view")
      .select("id,email")
      .eq("email", email)
      .maybeSingle();

    if (!userRow?.id) return NextResponse.json({ ok: true, userNotFound: true }, { status: 200 });

    // fallback: +14 days
    const days = Number(process.env.PREMIUM_DAYS_PER_PAYMENT ?? "14");
    const end = new Date();
    end.setDate(end.getDate() + days);

    await supabaseService.from("subscriptions").upsert(
      {
        user_id: userRow.id,
        status: "active",
        current_period_end: end.toISOString(),
        shopify_subscription_id: payload?.subscription_contract_id
          ? String(payload.subscription_contract_id)
          : null,
      },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ ok: true, orderId }, { status: 200 });
  }

  return NextResponse.json({ ok: true, ignored: topic }, { status: 200 });
}
