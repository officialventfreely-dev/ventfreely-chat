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

/**
 * TEMP GET – helps confirm routing (Shopify never uses GET)
 */
export async function GET() {
  console.log("[shopify-webhook] GET hit");
  return NextResponse.json({ ok: true, route: "shopify-webhook" });
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  console.log("[shopify-webhook] POST received");

  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const topic = req.headers.get("x-shopify-topic") || "unknown";

  if (!verifyShopifyHmac(rawBody, hmac)) {
    console.error("[shopify-webhook] INVALID HMAC", { topic });
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

  await supabaseService.from("webhook_events").insert({
    webhook_id: webhookId,
    topic,
  });

  console.log("[shopify-webhook] stored event", { topic, webhookId });

  return NextResponse.json({ ok: true });
}
