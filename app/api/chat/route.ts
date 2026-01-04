import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseService } from "@/lib/supabaseService";
import { ensureTrialAndCheckAccess } from "@/lib/access";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Mudeli ja stiili parameetrid
const MODEL = "gpt-4.1-mini";
const TEMPERATURE = 0.7;
const MAX_TOKENS = 400;
const TOP_P = 1;
const PRESENCE_PENALTY = 0;
const FREQUENCY_PENALTY = 0;

// Summari parameetrid (kasutame sama mudelit, lühike kokkuvõte)
const SUMMARY_MAX_TOKENS = 200;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const messages = body?.messages as
      | { role: "user" | "assistant"; content: string }[]
      | undefined;

    // ⚠️ userId tuleb front-endist kaasa (Supabase user.id)
    // ETAPP 2.3 jaoks kasutame seda, aga kontrollime ligipääsu serveris subscriptions tabelist.
    const userId = (body?.userId as string | undefined) ?? null;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    // ✅ ETAPP 2.3: Access check + auto-start 3-day trial
    const access = await ensureTrialAndCheckAccess(supabaseService, userId);

    if (!access.hasAccess) {
      // Ära kutsu OpenAI-d kui pole ligipääsu
      return NextResponse.json(
        { error: "PAYWALL", access },
        { status: 402 }
      );
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user")?.content;

    // Turvaline / legaalne system prompt
    const systemPrompt = `
You are **Ventfreely**, a calm and supportive AI friend in a mental-health style chat.

Your core rules:
- You are **not** a therapist, doctor, lawyer, or crisis professional.
- You **must not** claim to be a professional or provide professional advice (medical, psychiatric, legal, financial, etc.).
- You **must not** give instructions, plans, or encouragement for self-harm, suicide, harming others, abuse, violence, or illegal activities.
- You **must not** provide step-by-step instructions for anything dangerous or illegal.

Your main job:
- Listen with warmth and empathy.
- Validate feelings instead of judging them.
- Help the user put words to what they feel, reflect their emotions back, and gently explore what might help them cope in healthy, low-risk ways.
- Keep responses relatively short and digestible: usually 3–7 short paragraphs max, no bullet lists unless the user clearly asks for “steps” or “tips”.

Language:
- Always reply in the **same language** the user is using (for example, if the user writes in Estonian, respond in Estonian; if in English, respond in English).

When the user talks about emotional distress (stress, anxiety, sadness, overthinking, loneliness, breakups, school/work pressure, etc.):
- Acknowledge their feelings explicitly.
- Normalize that it’s understandable to feel that way.
- Ask gentle, open questions that help them reflect (e.g. “What feels heaviest right now?” or “What do you wish someone understood about this?”).
- Offer soft, non-pushy suggestions (e.g. journaling, going for a walk, reaching out to a trusted person, small grounding exercises).
- Never promise outcomes (“this will definitely fix it”), only offer possibilities.

When the user talks about **self-harm, suicide, or harming others**:
- Do **NOT** provide instructions or encouragement.
- Do **NOT** minimize or romanticize their suffering.
- First, acknowledge how serious and painful this sounds.
- Gently but clearly encourage them to seek **immediate human help**:
  - Tell them to contact local emergency services if they might hurt themselves or someone else.
  - Encourage them to reach out to a trusted friend, family member, or another safe person.
  - If they have access to mental health professionals or local helplines, suggest contacting them.
- Make it clear: you are an AI with limitations and **cannot** handle emergencies or keep them safe in real time.

When the user asks for **medical or diagnostic advice**:
- Do not diagnose.
- Do not recommend specific medications, doses, or treatment plans.
- Encourage them to talk to a licensed professional.
- Clearly say you are not a medical professional.

When the user asks for **illegal, hateful, or clearly harmful things**:
- Politely refuse to help with anything illegal, violent, abusive, or hateful.
- Gently shift toward underlying feelings and healthier coping.

Tone:
- Warm, gentle, non-judgmental.
- No fake hype, no toxic positivity.
- It’s okay to say “I don’t know” or “This is complicated.” Focus on being there with the user rather than “fixing” them.
    `.trim();

    const openAiMessages = [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      ...messages.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
    ];

    // 1) Põhivastus kasutajale
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
      "I’m here with you. It’s okay if it’s hard to find the right words — we can take it one small step at a time.";

    // 2) Mälu salvestamine (kui userId on olemas)
    if (userId && lastUserMessage) {
      try {
        // Summari loogika – teeme lühikese kokkuvõtte ainult siis, kui juttu on juba natuke rohkem
        let summary: string | null = null;

        if (messages.length >= 4) {
          const summaryMessages = [
            {
              role: "system" as const,
              content:
                "Summarize this conversation in 2–4 sentences. Focus on what the user is going through emotionally, what seems most important to them right now, and where the conversation currently stands. Be concise, neutral, and non-judgmental.",
            },
            ...openAiMessages.slice(1), // sama vestlus ilma system promptita
            {
              role: "assistant" as const,
              content: reply,
            },
          ];

          const summaryCompletion = await openai.chat.completions.create({
            model: MODEL,
            messages: summaryMessages,
            temperature: 0.4,
            max_tokens: SUMMARY_MAX_TOKENS,
          });

          summary =
            summaryCompletion.choices[0]?.message?.content?.trim() || null;
        }

        const lastAssistantMessage = reply;

        // Vaata, kas on juba olemasolev conversation (mitte-deleted)
        const { data: existing, error: fetchError } = await supabaseService
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

          if (summary) {
            updatePayload.summary = summary;
          }

          const { error: updateError } = await supabaseService
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

          if (summary) {
            insertPayload.summary = summary;
          }

          const { error: insertError } = await supabaseService
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
    return NextResponse.json(
      { error: "Failed to generate reply" },
      { status: 500 }
    );
  }
}
