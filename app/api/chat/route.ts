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
 * - Keep replies human + short most of the time
 * - Keep context small
 * - Avoid paywall / 402 entirely
 */
const MODEL = "gpt-4.1-mini";
const TEMPERATURE = 0.75;
const MAX_TOKENS = 180; // lowered for cost control (still high-quality for Ventfreely tone)
const TOP_P = 1;
const PRESENCE_PENALTY = 0;
const FREQUENCY_PENALTY = 0;

const SUMMARY_MAX_TOKENS = 120;

// Context trimming: send only the last N messages (plus system)
const MAX_CONTEXT_MESSAGES = 14;

// Soft abuse guard (NOT a paywall). We still return 200, just a calmer “slow down” response.
const SOFT_DAILY_HEAVY_USAGE_THRESHOLD = 250;

// ✅ Soft active window: keep conversation “alive” for a few minutes after leaving
const SOFT_ACTIVE_WINDOW_MS = 5 * 60 * 1000; // 5 min

type ChatMsg = { role: "user" | "assistant"; content: string };

type UserMemoryRow = {
  dominant_emotions: string[] | null;
  recurring_themes: string[] | null;
  preferred_tone: string | null;
  energy_pattern: string | null;
  updated_at?: string | null;
};

type ConversationPick = {
  id: string;
  status?: string | null;
  last_active_at?: string | null;
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

/**
 * Track daily usage (for monitoring + soft guard), but NEVER block.
 * Uses existing table: chat_daily_usage (user_id, date, count, updated_at).
 */
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
  // super lightweight heuristic; we keep your original rule:
  // default English, but if user clearly writes in another language, reply in that language.
  // (We leave detection to the model; this is only used for prompt guidance.)
  return /[äöõüšž]/i.test(text);
}

function buildSystemPrompt(opts: {
  memoryBlock: string;
  turnCount: number;
  heavyUsage: boolean;
  lastUserMessage: string;
}) {
  const { memoryBlock, turnCount, heavyUsage, lastUserMessage } = opts;

  const phase =
    turnCount <= 2 ? "early" : turnCount <= 6 ? "middle" : "late";

  const languageHint = isClearlyNonEnglish(lastUserMessage)
    ? "User may be writing in a non-English language. Mirror the user's language."
    : "Default to ENGLISH unless the user clearly writes in another language.";

  // “Chat süsteem” = more human friend vibe:
  // - early: more curious questions, less “that must be hard”
  // - later: more reflection + presence
  // - avoid therapist phrases, avoid over-validation
  // - vary across conversation, not same template each time
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

Conversation phases (important):
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

function isStale(lastActiveIso?: string | null) {
  const ms = safeIsoToMs(lastActiveIso ?? null);
  if (!ms) return true;
  return Date.now() - ms > SOFT_ACTIVE_WINDOW_MS;
}

/**
 * ✅ Find the current active conversation.
 * If it's stale (> window), archive it and return null (so we create a fresh one).
 * This is "lazy auto-archive": no cron needed, happens on next chat request.
 */
async function getOrCreateActiveConversationId(supabase: any, userId: string): Promise<string> {
  const nowIso = new Date().toISOString();

  // 1) Get most recent active conversation
  const { data: activeRows, error: activeErr } = await supabase
    .from("conversations")
    .select("id,status,last_active_at")
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .eq("status", "active")
    .order("last_active_at", { ascending: false })
    .limit(1);

  if (activeErr) {
    // If schema isn't migrated yet, fail gracefully by creating a new row via old behavior
    // (but in practice, you'll run the SQL first).
    console.error("conversations active read error:", activeErr);
  }

  const active = (activeRows?.[0] as ConversationPick | undefined) ?? undefined;

  // 2) If we have an active conversation but it's stale, archive it
  if (active?.id && isStale(active.last_active_at ?? null)) {
    try {
      await supabase
        .from("conversations")
        .update({
          status: "archived",
          archived_at: nowIso,
          updated_at: nowIso,
          last_active_at: nowIso,
        })
        .eq("id", active.id)
        .eq("user_id", userId);
    } catch (e) {
      console.error("conversations archive error:", e);
    }
  } else if (active?.id) {
    // 3) Active and not stale -> touch last_active_at now (so accidental leave doesn't kill it)
    try {
      await supabase
        .from("conversations")
        .update({
          last_active_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", active.id)
        .eq("user_id", userId);
    } catch {}
    return active.id;
  }

  // 4) No active (or stale archived) -> create a new active conversation
  const { data: inserted, error: insErr } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      status: "active",
      last_active_at: nowIso,
    })
    .select("id")
    .single();

  if (insErr || !inserted?.id) {
    console.error("conversations insert error:", insErr);
    // last resort: return a fake id (will fail update later but won't crash)
    return "unknown";
  }

  return inserted.id as string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawMessages = body?.messages as ChatMsg[] | undefined;

    if (!rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const { userId, supabase } = await getApiSupabase(req);

    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // Access check remains for future subscription re-enable,
    // but in FREE_MODE (via lib/access.ts) this returns hasAccess=true.
    // We do NOT use it to block or return 402 in free-first.
    await ensureTrialAndCheckAccess(supabase as any, userId);

    // ✅ Soft active window: decide which conversation this turn belongs to
    const conversationId = await getOrCreateActiveConversationId(supabase as any, userId);

    // Track usage for monitoring + soft guard (never blocks)
    const usageCount = await trackDailyUsage(userId);
    const heavyUsage =
      typeof usageCount === "number" && usageCount >= SOFT_DAILY_HEAVY_USAGE_THRESHOLD;

    // Read user memory (best-effort)
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

    // Trim context to reduce cost
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

    // Save conversation memory (best-effort)
    // To control cost, only summarize occasionally (when conversation has some length).
    if (lastUserMessage) {
      try {
        let summary: string | null = null;

        // Summarize only if we have enough turns AND not too often.
        // (Heuristic: every ~8+ total messages)
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

        const nowIso = new Date().toISOString();

        const updatePayload: Record<string, any> = {
          // keep conversation “alive” for the soft window
          status: "active",
          last_active_at: nowIso,
          updated_at: nowIso,

          last_user_message: lastUserMessage,
          last_assistant_message: reply,
        };
        if (summary) updatePayload.summary = summary;

        // ✅ Update THIS conversation (not “latest created_at”)
        await (supabase as any)
          .from("conversations")
          .update(updatePayload)
          .eq("id", conversationId)
          .eq("user_id", userId);
      } catch (e) {
        console.error("Error while updating memory:", e);
      }
    } else {
      // Even if no lastUserMessage somehow, still touch last_active_at
      try {
        await (supabase as any)
          .from("conversations")
          .update({
            status: "active",
            last_active_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationId)
          .eq("user_id", userId);
      } catch {}
    }

    // FREE-FIRST response: no remaining, no paywall signals
    return NextResponse.json({ reply });
  } catch (err: any) {
    if (err?.status === 401) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    console.error("Error in /api/chat:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
