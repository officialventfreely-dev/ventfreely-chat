// FILE: ventfreely-chat/app/api/chat/history/route.ts
// NEW FILE

import { NextRequest, NextResponse } from "next/server";
import { getApiSupabase } from "@/lib/apiAuth";

const ACTIVE_WINDOW_MINUTES = 5;

export async function GET(req: NextRequest) {
  try {
    const { userId, supabase } = await getApiSupabase(req);
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const cutoffIso = new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60 * 1000).toISOString();

    // Find current active conversation inside window
    const { data: active, error: activeErr } = await (supabase as any)
      .from("conversations")
      .select("id, last_active_at")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .eq("status", "active")
      .is("archived_at", null)
      .gte("last_active_at", cutoffIso)
      .order("last_active_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeErr) {
      console.error("history: conversations read error:", activeErr);
      return NextResponse.json({ conversationId: null, messages: [] });
    }

    if (!active?.id) {
      return NextResponse.json({ conversationId: null, messages: [] });
    }

    const convId = active.id as string;

    const { data: msgs, error: msgErr } = await (supabase as any)
      .from("conversation_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (msgErr) {
      console.error("history: conversation_messages read error:", msgErr);
      return NextResponse.json({ conversationId: convId, messages: [] });
    }

    return NextResponse.json({
      conversationId: convId,
      messages: (msgs ?? []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.created_at,
      })),
    });
  } catch (err: any) {
    if (err?.status === 401) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    console.error("history: server error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
