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

function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function pickEmail(payload: any): string | null {
  const candidates = [
    payload?.email,
    payload?.customer?.email,
    payload?.contact_email,
    payload?.customer_email,
  ]
    .filter(Boolean)
    .map((x: any) => String(x).trim());

  return candidates[0] ?? null;
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  // preferred
  const { data: uv } = await supabaseService
    .from("users_view")
    .select("id,email")
    .eq("email", email)
    .maybeSingle();
  if (uv?.id) return uv.id as string;

  // fallback
  const { data: prof } = await supabaseService
    .from("profiles")
    .select("id,email")
    .eq("email", email)
    .maybeSingle();
  if (prof?.id) return prof.id as string;

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

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const webhookId =
    req.headers.get("x-shopify-webhook-id") ||
    `${topic}:${payload?.id ?? "no-id"}`;

  // idempotency
  const { data: exists } = await supabaseService
    .from("webhook_events")
    .select("id")
    .eq("webhook_id", webhookId)
    .maybeSingle();

  if (exists?.id) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  await supabaseService.from("webhook_events").insert({
    webhook_id: webhookId,
    topic,
  });

  // ---- ORDERS/PAID -> 14 days premium ----
  if (topic === "orders/paid") {
    const email = pickEmail(payload);
    const orderId = payload?.id ?? null;

    if (!email) {
      console.warn("[shopify-webhook] orders/paid missing email", { orderId });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const userId = await findUserIdByEmail(email);

    if (!userId) {
      console.warn("[shopify-webhook] user not found for email", { email, orderId });
      return NextResponse.json({ ok: true, userNotFound: true }, { status: 200 });
    }

    const days = Number(process.env.PREMIUM_DAYS_PER_PAYMENT ?? "14");
    const currentPeriodEnd = addDaysISO(days);

    const { error: upsertErr } = await supabaseService
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          status: "active",
          current_period_end: currentPeriodEnd,
          // leave trial_ends_at as-is (no need to wipe)
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertErr) {
      console.error("[shopify-webhook] subscriptions upsert failed", upsertErr);
      return NextResponse.json({ ok: true, subUpsertFailed: true }, { status: 200 });
    }

    console.log("[shopify-webhook] PREMIUM 14D ACTIVATED", {
      userId,
      email,
      orderId,
      currentPeriodEnd,
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
