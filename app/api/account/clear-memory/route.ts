import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  const auth = await getApiSupabase(req);
if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { userId, supabase } = auth;


  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("user_memory").delete().eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
