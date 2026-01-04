export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const TOPICS = [
  "SUBSCRIPTION_CONTRACTS_CREATE",
  "SUBSCRIPTION_CONTRACTS_UPDATE",
  "SUBSCRIPTION_CONTRACTS_CANCEL",
  "SUBSCRIPTION_CONTRACTS_EXPIRE",
] as const;

function mutationFor(topic: string, callbackUrl: string) {
  return `
    mutation {
      webhookSubscriptionCreate(
        topic: ${topic}
        webhookSubscription: { callbackUrl: "${callbackUrl}", format: JSON }
      ) {
        webhookSubscription { id }
        userErrors { field message }
      }
    }
  `;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (!secret || secret !== process.env.SHOPIFY_WEBHOOK_SETUP_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const shop = process.env.SHOPIFY_SHOP_DOMAIN || "";
  const callbackUrl = process.env.SHOPIFY_WEBHOOK_CALLBACK_URL || "";
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2026-01";

  if (!shop || !callbackUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing env",
        shop,
        callbackUrl,
        apiVersion,
      },
      { status: 500 }
    );
  }

  // ✅ ÄRA kasuta .single() — see tekitas su errori
  const { data: tokenRows, error: tokenErr } = await supabaseAdmin
    .from("shopify_tokens")
    .select("shop, access_token, updated_at")
    .ilike("shop", shop)
    .order("updated_at", { ascending: false })
    .limit(5);

  if (tokenErr) {
    return NextResponse.json(
      { ok: false, error: "Supabase query error", details: tokenErr.message, shopLookingFor: shop },
      { status: 500 }
    );
  }

  const tokenRow = tokenRows?.[0];

  if (!tokenRow?.access_token) {
    return NextResponse.json(
      {
        ok: false,
        error: "No token found for shop",
        shopLookingFor: shop,
        foundRowsCount: tokenRows?.length ?? 0,
        foundShops: (tokenRows ?? []).map(r => r.shop),
      },
      { status: 500 }
    );
  }

  const accessToken = tokenRow.access_token;

  const results: any[] = [];
  for (const topic of TOPICS) {
    const query = mutationFor(topic, callbackUrl);

    const r = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query }),
    });

    const json = await r.json();
    const create = json?.data?.webhookSubscriptionCreate;

    results.push({
      topic,
      id: create?.webhookSubscription?.id ?? null,
      userErrors: create?.userErrors ?? [],
      rawErrors: json?.errors ?? [],
    });
  }

  return NextResponse.json({
    ok: true,
    shopUsed: shop,
    callbackUrlUsed: callbackUrl,
    tokenShopMatched: tokenRow.shop,
    results,
  });
}
