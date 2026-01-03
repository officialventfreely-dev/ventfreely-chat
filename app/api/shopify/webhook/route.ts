// app/api/shopify/webhook/route.ts
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // oluline: kasutame Node crypto't (mitte Edge)

function verifyShopifyHmac(rawBody: string, hmacHeader: string | null, secret: string) {
  if (!hmacHeader) return false;

  const generated = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  // timing-safe compare
  const a = Buffer.from(generated);
  const b = Buffer.from(hmacHeader);

  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getNoteAttribute(order: any, key: string): string | null {
  const attrs = order?.note_attributes;
  if (!Array.isArray(attrs)) return null;
  const found = attrs.find((x: any) => x?.name === key);
  return found?.value ?? null;
}

export async function POST(req: Request) {
  const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET!;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // 1) loe RAW body (HMAC kontroll vajab raw teksti)
  const rawBody = await req.text();

  // 2) HMAC verify
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const topic = req.headers.get("x-shopify-topic");
  const shopDomain = req.headers.get("x-shopify-shop-domain");

  const ok = verifyShopifyHmac(rawBody, hmac, SHOPIFY_WEBHOOK_SECRET);
  if (!ok) {
    console.error("❌ Shopify HMAC verify failed", { topic, shopDomain });
    return new Response("Unauthorized", { status: 401 });
  }

  // 3) parse JSON
  const payload = JSON.parse(rawBody);

  // Logi alati alguses — et sa näeksid Vercelis, et päring tuli kohale
  console.log("✅ Shopify webhook received", { topic, shopDomain });

  // Hetkel kasutame “Order payment” (orders/paid)
  // Shopify order payload sisaldab tavaliselt:
  // payload.id, payload.email, payload.customer.id, payload.line_items, payload.note_attributes
  const orderId = String(payload?.id ?? "");
  const email = String(payload?.email ?? "");
  const shopifyCustomerId = payload?.customer?.id ? String(payload.customer.id) : null;

  // Kui sa hakkad checkout’i külge lisama supabase_user_id, siis siit me loeme selle välja:
  const supabaseUserId =
    getNoteAttribute(payload, "supabase_user_id") ||
    getNoteAttribute(payload, "user_id") ||
    null;

  console.log("📦 Order basics", { orderId, email, shopifyCustomerId, supabaseUserId });

  // 4) Supabase server-side client (Service Role!)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // 5) Leia user_id
  // Kui note_attributes ei sisalda veel supabase_user_id, proovime emailiga users_view’st leida (ajutine fallback).
  let userIdToUse = supabaseUserId;

  if (!userIdToUse && email) {
    const { data: userRow, error: userErr } = await supabase
      .from("users_view")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (userErr) {
      console.error("❌ users_view lookup error", userErr);
    } else {
      userIdToUse = userRow?.id ?? null;
    }
  }

  if (!userIdToUse) {
    // Me EI FAILI webhooki (muidu Shopify proovib uuesti ja uuesti).
    // Aga logime selgelt, miks subscriptions ei täitu.
    console.warn("⚠️ No matching Supabase user. Not inserting subscription yet.", { email });
    return new Response("OK", { status: 200 });
  }

  // 6) Insert/Upsert subscriptions tabelisse
  // Sinu tabelis on: user_id, shopify_subscription_id, status, current_period_end
  // Kuna meil on “Order payment”, paneme status=active ja shopify_subscription_id=orderId (praegu).
  const { error: subErr } = await supabase.from("subscriptions").upsert(
    {
      user_id: userIdToUse,
      shopify_subscription_id: orderId,
      status: "active",
      current_period_end: null, // hiljem saad siia panna perioodi lõpu, kui hakkad subscription contracts infot võtma
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" } // soovitan user_id teha UNIQUE (allpool SQL)
  );

  if (subErr) {
    console.error("❌ subscriptions upsert failed", subErr);
    return new Response("OK", { status: 200 }); // jälle: Shopify ei tohi retry loopi minna
  }

  console.log("✅ Subscription row upserted for user", { userIdToUse });

  return new Response("OK", { status: 200 });
}
