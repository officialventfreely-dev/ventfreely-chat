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
        webhookSubscription: {
          callbackUrl: "${callbackUrl}"
          format: JSON
        }
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

  // 🔐 kaitse setup URL-ile
  if (!secret || secret !== process.env.SHOPIFY_WEBHOOK_SETUP_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const callbackUrl = process.env.SHOPIFY_WEBHOOK_CALLBACK_URL;
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2026-01";

  if (!callbackUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing SHOPIFY_WEBHOOK_CALLBACK_URL" },
      { status: 500 }
    );
  }

  // 🚀 KIIRLAHENDUS:
  // võta LIHTSALT UUSIM Shopify token Supabase'ist
  const { data: tokenRows, error: tokenErr } = await supabaseAdmin
    .from("shopify_tokens")
    .select("shop, access_token, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (tokenErr || !tokenRows || tokenRows.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "No Shopify token found at all",
        details: tokenErr?.message,
      },
      { status: 500 }
    );
  }

  const tokenRow = tokenRows[0];
  const accessToken = tokenRow.access_token;
  const shop = tokenRow.shop; // ← kasutame seda shopi, mille token on

  const results: any[] = [];

  for (const topic of TOPICS) {
    const query = mutationFor(topic, callbackUrl);

    const r = await fetch(
      `https://${shop}/admin/api/${apiVersion}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query }),
      }
    );

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
    results,
  });
}
