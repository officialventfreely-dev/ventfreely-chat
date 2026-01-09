import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  const { userId, supabase } = await getApiSupabase(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("conversations").delete().eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
