import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json({
    loggedIn: !!user,
    // email is optional; keep minimal for privacy
    email: user?.email ?? null,
  });
}