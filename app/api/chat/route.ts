// FILE: ventfreely-chat/app/api/chat/route.ts

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ensureTrialAndCheckAccess } from "@/lib/access";
import { getApiSupabase } from "@/lib/apiAuth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const MODEL = "gpt-4.1-mini";
const TEMPERATURE = 0.7;
const MAX_TOKENS = 400;
const TOP_P = 1;
const PRESENCE_PENALTY = 0;
const FREQUENCY_PENALTY = 0;
const SUMMARY_MAX_TOKENS = 200;

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
  if (score < 20) return "";

  const lines: string[] = [];
  if (memory.dominant_emotions?.length)
    lines.push(`- Emotions that sometimes appear: ${memory.dominant_emotions.join(", ")}`);
  if (memory.recurring_themes?.length)
    lines.push(`- Topics that sometimes come up: ${memory.recurring_themes.join(", ")}`);
  if (memory.preferred_tone) lines.push(`- Tone preference: ${memory.preferred_tone}`);
  if (memory.energy_pattern) lines.push(`- Energy tendency: ${memory.energy_pattern}`);

  if (!lines.length) return "";

  return `
Soft context (use gently; not guaranteed):
Confidence: ${level} (${score}/100)

${lines.join("\n")}

How to use this:
- Treat as hints, not facts.
- Only reference a hint if it clearly helps the user feel understood.
- Use tentative language: "maybe", "it sounds like", "sometimes", "could be".
- Never claim certainty, never label/diagnose.
- Never mention databases, memory systems, or "patterns".
`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body?.messages as { role: "user" | "assistant"; content: string }[] | undefined;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // 1) Auth (Bearer or cookie) + correct Supabase client
    const { userId, supabase } = await getApiSupabase(req);

    // 2) Premium gate
    const access = await ensureTrialAndCheckAccess(supabase as any, userId);
    if (!access.hasAccess) {
      return NextResponse.json({ error: "PAYWALL", access }, { status: 402 });
    }

    // 3) Read user_memory (RLS)
    let memory: UserMemoryRow | null = null;
    try {
      const { data, error } = await (supabase as any)
        .from("user_memory")
        .select("dominant_emotions, recurring_themes, preferred_tone, energy_pattern, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error) memory = (data as UserMemoryRow) ?? null;
    } catch {}

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content;
    const memoryBlock = buildMemoryBlock(memory);

    /**
     * ETAPP 2.1 – Ventfreely persona rewrite
     * - Not therapy, not coaching, not advice.
     * - Calm, simple, human.
     * - Reflect emotion first.
     * - Avoid repetitive questions.
     * - Offer at most ONE gentle, practical option only when it clearly helps (never commands).
     * - Default to Estonian unless user clearly writes in another language.
     */
    const systemPrompt = `
You are Ventfreely.

Identity:
- You are not a therapist, doctor, lawyer, or crisis service.
- You are a calm, supportive friend who listens and stays with the user.
- You are "space", not "solutions".

Language:
- Default to ESTONIAN.
- If the user clearly writes in another language, reply in that same language.
- Keep language simple and natural (avoid clinical terms).

Style:
- Calm, warm, minimal.
- Short paragraphs. No long speeches.
- Do NOT use bullet-point "plans" or step-by-step programs.
- Do NOT sound like a coach, mentor, or self-improvement app.
- Do NOT ask many questions. Ask at most ONE gentle question, only if it truly helps.

What you do:
1) Mirror the user's emotion in a human way (first).
2) Name what seems hard in a soft way ("it sounds like...", "that feels...") without certainty.
3) If it genuinely fits: offer ONE tiny, low-pressure option ("If you want, one small thing that can help is...") — never a command.
4) End with presence, not pressure. Avoid "Do you want to talk more?" loops.

What you avoid:
- Diagnosing, labeling, or implying disorders.
- Medical or professional advice.
- Moralizing ("you should"), lecturing, or forced positivity.
- Repetitive prompts like "How does that make you feel?".
- Mentioning memory systems, databases, or "patterns".

Safety:
- If the user expresses intent to harm themselves or others: respond with calm care, encourage contacting local emergency help or a trusted person. Keep it short and non-graphic.
- Otherwise, stay in the "supportive friend" lane.

${memoryBlock ? `\n${memoryBlock}\n` : ""}
    `.trim();

    const openAiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
    ];

    const completion = await openai.chat.completions.create(
      {
        model: MODEL,
        messages: openAiMessages,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        top_p: TOP_P,
        presence_penalty: PRESENCE_PENALTY,
        frequency_penalty: FREQUENCY_PENALTY,
      } as any
    );

    const reply =
      completion.choices[0]?.message?.content ??
      "I'm here with you. We can take this one small moment at a time.";

    // Save conversation memory
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

        const { data: existing } = await (supabase as any)
          .from("conversations")
          .select("id")
          .eq("user_id", userId)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(1);

        if (existing && existing.length > 0) {
          const convId = existing[0].id;

          const updatePayload: Record<string, any> = {
            last_user_message: lastUserMessage,
            last_assistant_message: reply,
            updated_at: new Date().toISOString(),
          };
          if (summary) updatePayload.summary = summary;

          await (supabase as any).from("conversations").update(updatePayload).eq("id", convId);
        } else {
          const insertPayload: Record<string, any> = {
            user_id: userId,
            last_user_message: lastUserMessage,
            last_assistant_message: reply,
          };
          if (summary) insertPayload.summary = summary;

          await (supabase as any).from("conversations").insert(insertPayload);
        }
      } catch (e) {
        console.error("Error while updating memory:", e);
      }
    }

    return NextResponse.json({ reply });
  } catch (err: any) {
    // Map auth error thrown by getApiSupabase
    if (err?.status === 401) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    console.error("Error in /api/chat:", err);
    return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 });
  }
}
