import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseService } from "@/lib/supabaseService";

export const dynamic = "force-dynamic";

function verifyShopifyHmac(rawBody: string, hmacHeader: string | null) {
  if (!hmacHeader) return false;
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return false;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(hmacHeader, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function pickEmail(payload: any): string | null {
  const candidates = [
    payload?.email,
    payload?.customer?.email,
    payload?.contact_email,
    payload?.billing_address?.email,
    payload?.customer_email,
  ]
    .filter(Boolean)
    .map((x: any) => String(x).trim());

  return candidates[0] ?? null;
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  // 1) users_view (you used it previously)
  try {
    const { data, error } = await supabaseService
      .from("users_view")
      .select("id,email")
      .eq("email", email)
      .maybeSingle();

    if (!error && data?.id) return data.id as string;
  } catch (e) {
    console.error("[shopify-webhook] users_view lookup exception:", e);
  }

  // 2) profiles fallback (many Supabase apps store email here)
  try {
    const { data, error } = await supabaseService
      .from("profiles")
      .select("id,email")
      .eq("email", email)
      .maybeSingle();

    if (!error && data?.id) return data.id as string;
  } catch (e) {
    console.error("[shopify-webhook] profiles lookup exception:", e);
  }

  return null;
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "shopify-webhook" });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const topic = req.headers.get("x-shopify-topic") || "unknown";

  if (!verifyShopifyHmac(rawBody, hmac)) {
    console.error("[shopify-webhook] INVALID HMAC", {
      topic,
      hasSecret: Boolean(process.env.SHOPIFY_WEBHOOK_SECRET),
      hasHmacHeader: Boolean(hmac),
    });
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  let payload: any = null;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error("[shopify-webhook] Invalid JSON", e);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const webhookId =
    req.headers.get("x-shopify-webhook-id") ||
    `${topic}:${payload?.id ?? "no-id"}`;

  console.log("[shopify-webhook] received", {
    topic,
    webhookId,
    payloadId: payload?.id ?? null,
  });

  // Idempotency: store webhook event once
  try {
    const { data: exists, error: existsErr } = await supabaseService
      .from("webhook_events")
      .select("id")
      .eq("webhook_id", webhookId)
      .maybeSingle();

    if (existsErr) {
      console.error("[shopify-webhook] webhook_events lookup error:", existsErr);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (exists?.id) {
      console.log("[shopify-webhook] duplicate ignored", { webhookId });
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }

    const { error: insertEvtErr } = await supabaseService
      .from("webhook_events")
      .insert({ webhook_id: webhookId, topic });

    if (insertEvtErr) {
      console.error("[shopify-webhook] webhook_events insert error:", insertEvtErr);
      return NextResponse.json({ ok: true }, { status: 200 });
    }
  } catch (e) {
    console.error("[shopify-webhook] webhook_events exception:", e);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // ---- orders/paid -> activate subscription ----
  if (topic === "orders/paid") {
    const email = pickEmail(payload);
    const orderId = payload?.id ?? null;

    console.log("[shopify-webhook] orders/paid", { orderId, email });

    if (!email) {
      console.warn("[shopify-webhook] orders/paid missing email", { orderId });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const userId = await findUserIdByEmail(email);

    if (!userId) {
      console.warn("[shopify-webhook] user NOT found by email", { email, orderId });
      return NextResponse.json({ ok: true, userNotFound: true }, { status: 200 });
    }

    // NOTE: this is a temporary, order-based premium activation.
    // Later we’ll do real subscription_contracts webhooks (cancel/expire).
    const days = Number(process.env.PREMIUM_DAYS_PER_PAYMENT ?? "14");
    const end = new Date();
    end.setDate(end.getDate() + days);

    const upsertPayload: any = {
      user_id: userId,
      status: "active",
      current_period_end: end.toISOString(),
      updated_at: new Date().toISOString(),
    };

    // If your subscriptions table has these columns, it’s useful:
    // (won’t break if they don’t exist? -> it WILL break if column missing)
    // so we only add them if you confirm columns exist.
    // upsertPayload.shopify_order_id = String(orderId);

    const { error: upsertErr } = await supabaseService
      .from("subscriptions")
      .upsert(upsertPayload, { onConflict: "user_id" });

    if (upsertErr) {
      console.error("[shopify-webhook] subscriptions upsert ERROR:", {
        message: upsertErr.message,
        details: (upsertErr as any).details,
        hint: (upsertErr as any).hint,
        code: (upsertErr as any).code,
        payload: upsertPayload,
      });
      return NextResponse.json({ ok: true, subUpsertFailed: true }, { status: 200 });
    }

    console.log("[shopify-webhook] PREMIUM ACTIVATED", { userId, email, orderId });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // ignore other topics for now
  return NextResponse.json({ ok: true, ignored: topic }, { status: 200 });
}
