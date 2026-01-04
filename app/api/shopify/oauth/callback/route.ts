import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const shop = searchParams.get("shop");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!shop || !code || !state) {
    return new NextResponse("Missing shop/code/state", { status: 400 });
  }

  const cookieStore = await cookies();
  const cookieState = cookieStore.get("shopify_oauth_state")?.value;

  if (!cookieState || cookieState !== state) {
    return new NextResponse("Invalid state", { status: 401 });
  }

  // vahetame code -> access_token
  const tokenRes = await fetch(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      }),
    }
  );

  const data = await tokenRes.json();

  if (!data?.access_token) {
    return new NextResponse(
      "Token error: " + JSON.stringify(data),
      { status: 500 }
    );
  }

  // salvestame Supabase'i
  const { error } = await supabaseAdmin
    .from("shopify_tokens")
    .upsert({
      shop,
      access_token: data.access_token,
      scope: data.scope ?? null,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    return new NextResponse("Supabase error: " + error.message, {
      status: 500,
    });
  }

  // kustutame state cookie
  const res = NextResponse.redirect(
    "https://chat.ventfreely.com/account"
  );
  res.cookies.set("shopify_oauth_state", "", {
    maxAge: 0,
    path: "/",
  });

  return res;
}
