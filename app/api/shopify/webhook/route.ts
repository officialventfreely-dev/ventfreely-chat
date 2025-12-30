import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

// Kui sul on üks kindel toode (14 päeva pass), võid soovi korral kontrollida handle/title põhjal
const VENTFREELY_PRODUCT_KEYWORD = "Unlimited Venting Pass (14 Days)"; // kohanda vastavalt Shopify product handle/title'ile

// 1️⃣ Shopify HMAC kontroll
function verifyShopifyHmac(request: NextRequest, rawBody: string): boolean {
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256") || "";
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || "";

  if (!secret) {
    console.error("SHOPIFY_WEBHOOK_SECRET is not set");
    return false;
  }

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(digest, "utf-8"),
    Buffer.from(hmacHeader, "utf-8")
  );
}

export async function POST(request: NextRequest) {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch (err) {
    console.error("Failed to read raw body:", err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // 1️⃣ Verifitseeri HMAC
  const isValid = verifyShopifyHmac(request, rawBody);
  if (!isValid) {
    console.error("Invalid Shopify HMAC");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // 2️⃣ Võta topic ja body
  const topic = request.headers.get("x-shopify-topic") || "";
  const shopDomain = request.headers.get("x-shopify-shop-domain") || "";
  let payload: any;

  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("Failed to parse Shopify payload:", err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  console.log("Shopify webhook:", { topic, shopDomain });

  // Me kasutame siin 'orders/paid' sündmust (või 'orders/fulfilled' – olenevalt, mida seadistad)
  if (topic === "orders/paid" || topic === "orders/fulfilled") {
    try {
      const customerEmail: string | undefined =
        payload?.email || payload?.customer?.email;

      if (!customerEmail) {
        console.warn("No customer email on order, skipping.");
        return NextResponse.json({ ok: true });
      }

      // 3️⃣ Kontrollime, kas tellimus sisaldab Ventfreely toodet (vajadusel kohanda loogikat)
      const lineItems: any[] = payload?.line_items || [];
      const hasVentfreelyProduct = lineItems.some((item) => {
        const title: string = item.title?.toLowerCase?.() ?? "";
        const handle: string =
          item.handle?.toLowerCase?.() ?? item.name?.toLowerCase?.() ?? "";
        return (
          title.includes("ventfreely") ||
          handle.includes("ventfreely") ||
          title.includes(VENTFREELY_PRODUCT_KEYWORD) ||
          handle.includes(VENTFREELY_PRODUCT_KEYWORD)
        );
      });

      if (!hasVentfreelyProduct) {
        console.log(
          "Order does not contain Ventfreely product, ignoring. Order id:",
          payload?.id
        );
        return NextResponse.json({ ok: true });
      }

      // 4️⃣ Leia Supabase kasutaja selle emailiga
      const { data: userView, error: userError } = await supabaseService
        .from("users_views")
        .select("id, email")
        .eq("email", customerEmail.toLowerCase())
        .maybeSingle();

      if (userError) {
        console.error("Error fetching user by email:", userError);
        return NextResponse.json({ ok: false }, { status: 500 });
      }

      if (!userView) {
        console.warn(
          "No Supabase user found for email from Shopify order:",
          customerEmail
        );
        // Siin võid hiljem teha eraldi "pending" tabeli emaili põhjal
        return NextResponse.json({ ok: true });
      }

      const userId = userView.id as string;

      // 5️⃣ Arvuta 14 päeva lõpp
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 14);

      const shopifySubscriptionId = String(payload.id);

      // 6️⃣ Upsert subscriptions (unique user_id constraint lubab "üks rida per user")
      const { error: upsertError } = await supabaseService
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            shopify_subscription_id: shopifySubscriptionId,
            status: "active",
            current_period_end: periodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (upsertError) {
        console.error("Error upserting subscription:", upsertError);
        return NextResponse.json({ ok: false }, { status: 500 });
      }

      console.log(
        `Subscription activated/updated for user ${userId} via Shopify order ${shopifySubscriptionId}`
      );

      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("Error handling Shopify order webhook:", err);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }

  // Muud webhookid – võime lihtsalt logida ja OK tagastada
  console.log("Unhandled Shopify topic:", topic);
  return NextResponse.json({ ok: true });
}
