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

export async function POST(req: Request) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const topic = req.headers.get("x-shopify-topic") || "";

  if (!verifyShopifyHmac(rawBody, hmac)) {
    console.error("[shopify-webhook] INVALID HMAC");
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

  // Idempotency
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

  // 🔥 PREMIUM UNLOCK
  if (topic === "orders/paid") {
    const email = payload?.email || payload?.customer?.email;
    if (!email) {
      console.warn("[shopify-webhook] orders/paid without email");
      return NextResponse.json({ ok: true });
    }

    const { data: user } = await supabaseService
      .from("users_view")
      .select("id,email")
      .eq("email", email)
      .maybeSingle();

    if (!user?.id) {
      console.warn("[shopify-webhook] user not found for email", email);
      return NextResponse.json({ ok: true });
    }

    const days = Number(process.env.PREMIUM_DAYS_PER_PAYMENT ?? "14");
    const end = new Date();
    end.setDate(end.getDate() + days);

    await supabaseService
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          status: "active",
          current_period_end: end.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    console.log("[shopify-webhook] PREMIUM ACTIVATED", {
      userId: user.id,
      email,
    });
  }

  return NextResponse.json({ ok: true });
}
