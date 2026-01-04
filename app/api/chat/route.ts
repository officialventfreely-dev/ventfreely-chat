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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const messages = body?.messages as
      | { role: "user" | "assistant"; content: string }[]
      | undefined;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
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

    // ✅ ETAPP 2.3: access check
    const access = await ensureTrialAndCheckAccess(supabase, userId);

    if (!access.hasAccess) {
      return NextResponse.json({ error: "PAYWALL", access }, { status: 402 });
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user")?.content;

    const systemPrompt = `
You are **Ventfreely**, a calm and supportive AI friend in a mental-health style chat.

Rules:
- Not a therapist/doctor/lawyer.
- No professional advice.
- No self-harm/violence/illegal instructions.
- Warm, calm, short responses.
- Reply in the same language as the user.
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

          summary =
            summaryCompletion.choices[0]?.message?.content?.trim() || null;
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
    return NextResponse.json(
      { error: "Failed to generate reply" },
      { status: 500 }
    );
  }
}
