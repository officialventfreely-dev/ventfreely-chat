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

  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  const callbackUrl = process.env.SHOPIFY_WEBHOOK_CALLBACK_URL;
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2026-01";

  if (!shop || !callbackUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing SHOPIFY_SHOP_DOMAIN or SHOPIFY_WEBHOOK_CALLBACK_URL" },
      { status: 500 }
    );
  }

  // võta access_token Supabase'ist
  const { data: tokenRow, error: tokenErr } = await supabaseAdmin
    .from("shopify_tokens")
    .select("access_token")
    .eq("shop", shop)
    .single();

  if (tokenErr || !tokenRow?.access_token) {
    return NextResponse.json(
      { ok: false, error: "No token found for shop", details: tokenErr?.message },
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
    const id = create?.webhookSubscription?.id || null;
    const userErrors = create?.userErrors || [];

    results.push({
      topic,
      id,
      userErrors,
      rawErrors: json?.errors || [],
    });
  }

  return NextResponse.json({ ok: true, shop, callbackUrl, results });
}
