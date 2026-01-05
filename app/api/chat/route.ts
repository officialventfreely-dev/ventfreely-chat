// FILE: app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabaseServer";
import { ensureTrialAndCheckAccess } from "@/lib/access";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODEL = "gpt-4.1-mini";
const TEMPERATURE = 0.7;
const MAX_TOKENS = 400;
const TOP_P = 1;
const PRESENCE_PENALTY = 0;
const FREQUENCY_PENALTY = 0;

const SUMMARY_MAX_TOKENS = 200;

/**
 * ETAPP 4.1 – User memory (light, safe)
 * ETAPP 4.4.4 – Memory-aware polish:
 * - Adds "confidence" so the assistant doesn't sound certain
 * - Uses patterns only when helpful, never as facts
 * - Never mentions "memory" / "user_memory" / "patterns database" explicitly
 */
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

  // recency penalty
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

  // If confidence is extremely low, don’t inject anything at all.
  if (score < 20) return "";

  const lines: string[] = [];

  if (memory.dominant_emotions?.length) {
    lines.push(`- Emotions that sometimes appear: ${memory.dominant_emotions.join(", ")}`);
  }

  if (memory.recurring_themes?.length) {
    lines.push(`- Themes that sometimes come up: ${memory.recurring_themes.join(", ")}`);
  }

  if (memory.preferred_tone) {
    lines.push(`- Tone preference: ${memory.preferred_tone}`);
  }

  if (memory.energy_pattern) {
    lines.push(`- Energy tendency: ${memory.energy_pattern}`);
  }

  if (!lines.length) return "";

  return `
Soft context (use gently; not guaranteed):
Confidence: ${level} (${score}/100)

${lines.join("\n")}

How to use this:
- Treat as hints, not facts.
- Only reflect a hint if it clearly helps the user feel understood.
- Use tentative language: "maybe", "it sounds like", "sometimes", "could be".
- Never claim certainty, never label/diagnose.
- Never mention any database, memory system, or "patterns" explicitly.
`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const messages = body?.messages as
      | { role: "user" | "assistant"; content: string }[]
      | undefined;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // ✅ SECURE: user comes from Supabase session cookie (not from body)
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // ✅ ETAPP 4.1: fetch user_memory (RLS protected)
    let memory: UserMemoryRow | null = null;
    try {
      const { data, error } = await supabase
        .from("user_memory")
        .select(
          "dominant_emotions, recurring_themes, preferred_tone, energy_pattern, updated_at"
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (!error) memory = (data as UserMemoryRow) ?? null;
    } catch (e) {
      console.error("Failed to fetch user_memory:", e);
    }

    // ✅ ETAPP 2.3: access check
    const access = await ensureTrialAndCheckAccess(supabase, userId);
    if (!access.hasAccess) {
      return NextResponse.json({ error: "PAYWALL", access }, { status: 402 });
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user")?.content;

    const memoryBlock = buildMemoryBlock(memory);

    const systemPrompt = `
You are Ventfreely, a calm and supportive AI friend in a mental-health style chat.

Rules:
- Not a therapist/doctor/lawyer.
- No professional advice.
- No self-harm/violence/illegal instructions.
- Warm, calm, short responses.
- Ask 1 gentle question max when useful.
- Reply in the same language as the user.
- Do not over-assume; reflect what the user actually said.

Tone & safety:
- Prefer validation + small reflection over advice.
- If the user wants action steps, give tiny, low-pressure steps.
- Never diagnose. Never label the user.
- Avoid certainty words like "clearly" or "definitely" about the user's inner state.

${memoryBlock ? `\n${memoryBlock}\n` : ""}
    `.trim();

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
    });

    const reply =
      completion.choices[0]?.message?.content ??
      "I’m here with you. We can take it one small step at a time.";

    // ✅ Save memory (summary + last 2 msg) using session client
    if (lastUserMessage) {
      try {
        let summary: string | null = null;

        if (messages.length >= 4) {
          const summaryMessages = [
            {
              role: "system" as const,
              content:
                "Summarize this conversation in 2–4 sentences. Focus on the user's emotional situation and what matters most right now. Be concise and neutral.",
            },
            ...openAiMessages.slice(1),
            { role: "assistant" as const, content: reply },
          ];

          const summaryCompletion = await openai.chat.completions.create({
            model: MODEL,
            messages: summaryMessages,
            temperature: 0.4,
            max_tokens: SUMMARY_MAX_TOKENS,
          });

          summary = summaryCompletion.choices[0]?.message?.content?.trim() || null;
        }

        const lastAssistantMessage = reply;

        const { data: existing, error: fetchError } = await supabase
          .from("conversations")
          .select("id")
          .eq("user_id", userId)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(1);

        if (fetchError) {
          console.error("Error fetching existing conversation:", fetchError);
        } else if (existing && existing.length > 0) {
          const convId = existing[0].id;

          const updatePayload: Record<string, any> = {
            last_user_message: lastUserMessage,
            last_assistant_message: lastAssistantMessage,
            updated_at: new Date().toISOString(),
          };

          if (summary) updatePayload.summary = summary;

          const { error: updateError } = await supabase
            .from("conversations")
            .update(updatePayload)
            .eq("id", convId);

          if (updateError) {
            console.error("Error updating conversation:", updateError);
          }
        } else {
          const insertPayload: Record<string, any> = {
            user_id: userId,
            last_user_message: lastUserMessage,
            last_assistant_message: lastAssistantMessage,
          };

          if (summary) insertPayload.summary = summary;

          const { error: insertError } = await supabase
            .from("conversations")
            .insert(insertPayload);

          if (insertError) {
            console.error("Error inserting conversation:", insertError);
          }
        }
      } catch (memoryErr) {
        console.error("Error while updating memory:", memoryErr);
      }
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Error in /api/chat:", err);
    return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 });
  }
}
