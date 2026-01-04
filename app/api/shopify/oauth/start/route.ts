import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop"); // nt ventfreely.myshopify.com

  if (!shop) {
    return new NextResponse("Missing ?shop=", { status: 400 });
  }

  const state = crypto.randomBytes(16).toString("hex");

  const redirectUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${process.env.SHOPIFY_CLIENT_ID}` +
    `&scope=${encodeURIComponent(
      "read_customers,read_orders,read_own_subscription_contracts"
    )}` +
    `&redirect_uri=${encodeURIComponent(
      "https://chat.ventfreely.com/api/shopify/oauth/callback"
    )}` +
    `&state=${state}`;

  const res = NextResponse.redirect(redirectUrl);

  res.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 min
  });

  return res;
}
