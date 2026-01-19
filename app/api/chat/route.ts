// FILE: ventfreely-chat/app/api/chat/route.ts
// FULL REPLACEMENT

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ensureTrialAndCheckAccess } from "@/lib/access";
import { getApiSupabase } from "@/lib/apiAuth";
import { supabaseService } from "@/lib/supabaseService";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * COST + QUALITY SETTINGS (FREE-FIRST)
 */
const MODEL = "gpt-4.1-mini";
const TEMPERATURE = 0.75;
const MAX_TOKENS = 180;
const TOP_P = 1;
const PRESENCE_PENALTY = 0;
const FREQUENCY_PENALTY = 0;

const SUMMARY_MAX_TOKENS = 120;

// Context trimming
const MAX_CONTEXT_MESSAGES = 14;

// Soft abuse guard (NOT a paywall)
const SOFT_DAILY_HEAVY_USAGE_THRESHOLD = 250;

// ✅ Active window for “resume”
const ACTIVE_WINDOW_MINUTES = 5;

type ChatMsg = { role: "user" | "assistant"; content: string };

type UserMemoryRow = {
  dominant_emotions: string[] | null;
  recurring_themes: string[] | null;
  preferred_tone: string | null;
  energy_pattern: string | null;
  updated_at?: string | null;
};

function safeIsoToMs(iso?: string | null) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeMemoryConfidence(memory: UserMemoryRow | null) {
  if (!memory) return { level: "none" as const, score: 0 };

  let score = 0;
  const emotions = memory.dominant_emotions?.length ?? 0;
  const themes = memory.recurring_themes?.length ?? 0;

  if (emotions >= 1) score += 35;
  if (emotions >= 2) score += 10;
  if (themes >= 1) score += 25;
  if (memory.preferred_tone) score += 10;
  if (memory.energy_pattern) score += 10;

  const updatedMs = safeIsoToMs(memory.updated_at ?? null);
  if (updatedMs) {
    const days = Math.floor((Date.now() - updatedMs) / (1000 * 60 * 60 * 24));
    if (days >= 60) score -= 25;
    else if (days >= 30) score -= 15;
    else if (days >= 14) score -= 8;
  }

  score = clamp(score, 0, 100);

  const level =
    score >= 70 ? ("high" as const) : score >= 40 ? ("medium" as const) : ("low" as const);

  return { level, score };
}

function buildMemoryBlock(memory: UserMemoryRow | null) {
  if (!memory) return "";
  const { level, score } = computeMemoryConfidence(memory);
  if (score < 25) return "";

  const lines: string[] = [];
  if (memory.dominant_emotions?.length)
    lines.push(`- Sometimes: ${memory.dominant_emotions.slice(0, 4).join(", ")}`);
  if (memory.recurring_themes?.length)
    lines.push(`- Often about: ${memory.recurring_themes.slice(0, 4).join(", ")}`);
  if (memory.preferred_tone) lines.push(`- Tone: ${memory.preferred_tone}`);
  if (memory.energy_pattern) lines.push(`- Energy: ${memory.energy_pattern}`);

  if (!lines.length) return "";

  return `
Soft context (use gently; not guaranteed):
Confidence: ${level} (${score}/100)

${lines.join("\n")}

Rules:
- Treat as hints, not facts.
- Only reference a hint if it clearly helps.
- Use tentative language ("maybe", "it sounds like", "sometimes").
- Never label/diagnose. Never mention memory systems.
`.trim();
}

function getLastUserText(messages: ChatMsg[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content ?? "";
  }
  return "";
}

function utcDateYYYYMMDD(d = new Date()) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function trimContext(messages: ChatMsg[]) {
  if (!Array.isArray(messages)) return [];
  if (messages.length <= MAX_CONTEXT_MESSAGES) return messages;
  return messages.slice(messages.length - MAX_CONTEXT_MESSAGES);
}

async function trackDailyUsage(userId: string): Promise<number | null> {
  const date = utcDateYYYYMMDD();

  const { data: row, error: readErr } = await supabaseService
    .from("chat_daily_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (readErr) {
    console.error("chat_daily_usage read error:", readErr);
    return null;
  }

  const current = typeof row?.count === "number" ? row.count : 0;
  const next = current + 1;

  const { error: upsertErr } = await supabaseService
    .from("chat_daily_usage")
    .upsert(
      {
        user_id: userId,
        date,
        count: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" }
    );

  if (upsertErr) {
    console.error("chat_daily_usage upsert error:", upsertErr);
    return null;
  }

  return next;
}

function isClearlyNonEnglish(text: string) {
  return /[äöõüšž]/i.test(text);
}

function buildSystemPrompt(opts: {
  memoryBlock: string;
  turnCount: number;
  heavyUsage: boolean;
  lastUserMessage: string;
}) {
  const { memoryBlock, turnCount, heavyUsage, lastUserMessage } = opts;

  const phase = turnCount <= 2 ? "early" : turnCount <= 6 ? "middle" : "late";

  const languageHint = isClearlyNonEnglish(lastUserMessage)
    ? "User may be writing in a non-English language. Mirror the user's language."
    : "Default to ENGLISH unless the user clearly writes in another language.";

  return `
You are Ventfreely.

Identity (non-negotiables):
- Not therapy, not medical advice, not coaching, not self-improvement.
- You're a real-feeling, calm friend who talks like a human.
- Your goal is to create a steady, safe conversation — not to “fix” the user.

Language:
- ${languageHint}
- Keep it simple, everyday, natural. No clinical words.

"CHAT SYSTEM" (human conversation style):
- Avoid therapist-y lines like "That must be hard" / "I'm sorry you're going through this" / "It's completely understandable".
- Don't do abstract emotional labeling. Don't dramatize. Don't lecture.
- Show care through curiosity and specificity.

Conversation phases:
- EARLY (first 1–2 assistant replies): be more curious than validating.
  Ask ONE simple, concrete question. Keep it short and natural.
- MIDDLE: reflect ONE concrete detail, then ask ONE focused question OR offer ONE tiny option.
- LATE: you can be warmer and more present, but still avoid clichés and repetition.

Rules:
- Most replies: 2–5 short sentences. No long paragraphs.
- Max 1 question per reply. Never ask "How does that make you feel?"
- Prefer real questions like:
  "Since when?", "What happened right before that?", "Which part is worse — X or Y?",
  "Is it more tired-empty or numb-empty?"
- Don't end every message with the same reassurance.
- No bullet lists, no step-by-step programs.

Safety:
- If user expresses intent to self-harm or harm others: respond calmly, encourage contacting local emergency services or a trusted person. Keep it short, caring, non-graphic.

Current phase: ${phase}

${heavyUsage ? `
Soft pacing (not a limit, not a paywall):
- Keep this reply extra short (1–3 sentences).
- Encourage a tiny pause/breath without sounding controlling.
` : ""}

${memoryBlock ? `\n${memoryBlock}\n` : ""}
`.trim();
}

async function getOrCreateActiveConversationId(supabase: any, userId: string) {
  const nowIso = new Date().toISOString();
  const cutoffIso = new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60 * 1000).toISOString();

  // Get latest conversation (even if stale) to decide archiving
  const { data: latest, error: latestErr } = await supabase
    .from("conversations")
    .select("id, status, last_active_at, archived_at, is_deleted")
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) {
    console.error("conversations latest read error:", latestErr);
  }

  // If latest is active but stale -> archive it
  if (latest?.id && latest.status === "active") {
    const lastActive = latest.last_active_at ? new Date(latest.last_active_at).getTime() : 0;
    const isStale = !lastActive || lastActive < Date.now() - ACTIVE_WINDOW_MINUTES * 60 * 1000;

    if (isStale) {
      const { error: archErr } = await supabase
        .from("conversations")
        .update({
          status: "archived",
          archived_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", latest.id)
        .eq("user_id", userId);

      if (archErr) console.error("conversations archive error:", archErr);
    }
  }

  // Find an active conversation within window
  const { data: active, error: activeErr } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .eq("status", "active")
    .is("archived_at", null)
    .gte("last_active_at", cutoffIso)
    .order("last_active_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeErr) {
    console.error("conversations active read error:", activeErr);
  }

  if (active?.id) return active.id as string;

  // Create new active conversation
  const { data: created, error: createErr } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      status: "active",
      last_active_at: nowIso,
      archived_at: null,
    })
    .select("id")
    .single();

  if (createErr || !created?.id) {
    console.error("conversations create error:", createErr);
    throw new Error("Failed to create conversation");
  }

  return created.id as string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawMessages = body?.messages as ChatMsg[] | undefined;

    if (!rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const auth = await getApiSupabase(req);
if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const { userId, supabase } = auth;


    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // Free-first access: never 402
    await ensureTrialAndCheckAccess(supabase as any, userId);

    // Track usage (never blocks)
    const usageCount = await trackDailyUsage(userId);
    const heavyUsage =
      typeof usageCount === "number" && usageCount >= SOFT_DAILY_HEAVY_USAGE_THRESHOLD;

    // Read memory (best-effort)
    let memory: UserMemoryRow | null = null;
    try {
      const { data, error } = await (supabase as any)
        .from("user_memory")
        .select("dominant_emotions, recurring_themes, preferred_tone, energy_pattern, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error) memory = (data as UserMemoryRow) ?? null;
    } catch {}

    const lastUserMessage = getLastUserText(rawMessages);
    const memoryBlock = buildMemoryBlock(memory);

    const messages = trimContext(rawMessages);
    const userTurns = messages.filter((m) => m.role === "user").length;

    const systemPrompt = buildSystemPrompt({
      memoryBlock,
      turnCount: userTurns,
      heavyUsage,
      lastUserMessage,
    });

    const openAiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
    ];

    // ✅ Ensure active conversation id (5-min resume)
    const convId = await getOrCreateActiveConversationId(supabase as any, userId);

    // ✅ Save the new USER message immediately (so if net drops after, we still have it)
    const nowIso = new Date().toISOString();
    if (lastUserMessage?.trim()) {
      const { error: insUserErr } = await (supabase as any)
        .from("conversation_messages")
        .insert({
          conversation_id: convId,
          user_id: userId,
          role: "user",
          content: lastUserMessage,
        });

      if (insUserErr) console.error("conversation_messages insert user error:", insUserErr);
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: openAiMessages,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      top_p: TOP_P,
      presence_penalty: PRESENCE_PENALTY,
      frequency_penalty: FREQUENCY_PENALTY,
    } as any);

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "What happened right before it started feeling like this?";

    // ✅ Save ASSISTANT message
    {
      const { error: insAsstErr } = await (supabase as any)
        .from("conversation_messages")
        .insert({
          conversation_id: convId,
          user_id: userId,
          role: "assistant",
          content: reply,
        });

      if (insAsstErr) console.error("conversation_messages insert assistant error:", insAsstErr);
    }

    // Summary (best-effort, occasional)
    let summary: string | null = null;
    try {
      if (rawMessages.length >= 8) {
        const summaryMessages = [
          {
            role: "system" as const,
            content:
              "Summarize this conversation in 2–3 short sentences. Focus on what the user is dealing with and what matters right now. Neutral, no advice.",
          },
          ...openAiMessages.slice(1),
          { role: "assistant" as const, content: reply },
        ];

        const summaryCompletion = await openai.chat.completions.create({
          model: MODEL,
          messages: summaryMessages,
          temperature: 0.35,
          max_tokens: SUMMARY_MAX_TOKENS,
        });

        summary = summaryCompletion.choices[0]?.message?.content?.trim() || null;
      }
    } catch {
      summary = null;
    }

    // ✅ Update conversation row (active heartbeat + last messages + optional summary)
    try {
      const updatePayload: Record<string, any> = {
        last_user_message: lastUserMessage,
        last_assistant_message: reply,
        last_active_at: nowIso,
        status: "active",
        archived_at: null,
        updated_at: nowIso,
      };
      if (summary) updatePayload.summary = summary;

      const { error: updErr } = await (supabase as any)
        .from("conversations")
        .update(updatePayload)
        .eq("id", convId)
        .eq("user_id", userId);

      if (updErr) console.error("conversations update error:", updErr);
    } catch (e) {
      console.error("conversations update exception:", e);
    }

    return NextResponse.json({ reply });
  } catch (err: any) {
    if (err?.status === 401) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    console.error("Error in /api/chat:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
