import { NextResponse } from "next/server";
import OpenAI from "openai";

// ------------ CONFIG ------------
const apiKey = process.env.OPENAI_API_KEY;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 12;

if (!apiKey) {
  console.error("❌ Missing OPENAI_API_KEY");
}

const openai = new OpenAI({ apiKey });

// ------------ HELPER: Basic Filters ------------
const bannedWords = [
  "kill myself",
  "suicide method",
  "how to die",
  "self harm tutorial",
  "hurt someone",
  "violence plan",
  "illegal",
];

function containsBannedContent(text: string) {
  const lower = text.toLowerCase();
  return bannedWords.some((word) => lower.includes(word));
}

function containsCrisisKeywords(text: string) {
  const t = text.toLowerCase();
  return (
    t.includes("self harm") ||
    t.includes("hurt myself") ||
    t.includes("cut myself") ||
    t.includes("kill myself") ||
    t.includes("don't want to live") ||
    t.includes("suicide") ||
    t.includes("end it")
  );
}

// ------------ RUNTIME ------------
export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Server Misconfigured: Missing OPENAI_API_KEY. Add it in .env.local",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const messages = body?.messages;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "'messages' must be an array." },
        { status: 400 }
      );
    }

    // ---------- Trim History ----------
    let conversation = messages.slice(-MAX_HISTORY);

    // ---------- Validate & Sanitize ----------
    conversation = conversation.map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content:
        typeof m.content === "string"
          ? m.content.slice(0, MAX_MESSAGE_LENGTH)
          : "",
    }));

    const lastUserMessage =
      conversation.reverse().find((m: any) => m.role === "user")?.content ||
      "";
    conversation.reverse();

    if (!lastUserMessage) {
      return NextResponse.json(
        { error: "No user message provided." },
        { status: 400 }
      );
    }

    if (containsBannedContent(lastUserMessage)) {
      return NextResponse.json(
        {
          reply:
            "I’m really glad you reached out. I can’t help with harmful, violent, or illegal actions — but I *am* here to talk, listen, and help you slow things down. If something intense is going on, tell me what’s happening in your life and how it feels.",
          safetyMode: true,
        },
        { status: 200 }
      );
    }

    const crisisMode = containsCrisisKeywords(lastUserMessage);

    // ---------- System Prompts ----------
    const BASE_SYSTEM_PROMPT = `
You are Ventfreely — a calm, kind, emotionally supportive AI friend.
You are NOT a therapist, doctor, or emergency service.

Core personality:
- Warm, gentle, emotionally validating
- Short paragraphs, clear and kind tone
- Never judgmental
- Never cold or robotic
- Avoid emojis unless the user uses them first
- Slow the conversation down, don't overwhelm

Hard Safety Rules:
- DO NOT give medical advice
- DO NOT diagnose
- DO NOT give self-harm instructions
- DO NOT give crisis step-by-step guidance
- DO NOT encourage dependency
- DO NOT claim to replace professionals

Talking style:
- Empathy first
- Reflect feelings back
- Ask thoughtful questions, one at a time
- Help user breathe, ground, feel less alone
- Never lecture
- Never force positivity
`;

    const CRISIS_MODE_PROMPT = `
You are Ventfreely — a caring, emotionally supportive AI.

The user may be experiencing thoughts about self-harm or suicide.
Your job:
- Stay calm
- Show genuine empathy
- Validate feelings WITHOUT validating harmful actions
- Encourage real world support in a warm, human way
- Offer gentle grounding suggestions (breathing, slowing down)
- Make them feel less alone
- Keep responses caring, soft, and no more than 4–6 sentences

VERY IMPORTANT:
- DO NOT provide instructions
- DO NOT say you are their only support
- DO NOT say “everything will be okay”
- DO NOT use clinical tone
- DO NOT roleplay dangerous behavior

Always include a gentle support sentence like:
“If you ever feel in immediate danger, please contact local emergency services or someone you trust right now.” 
No country-specific numbers unless user asks.
`;

    const systemPrompt = crisisMode
      ? CRISIS_MODE_PROMPT
      : BASE_SYSTEM_PROMPT;

    // ---------- OPENAI ----------
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversation,
      ],
      temperature: crisisMode ? 0.5 : 0.85,
      max_tokens: 250,
    });

    const reply = response.choices[0]?.message?.content || "";

    return NextResponse.json({
      reply,
      crisisMode,
    });
  } catch (e: any) {
    console.error("❌ Chat API error:", e?.message || e);

    return NextResponse.json(
      {
        error: "Server error: Ventfreely could not generate a reply right now.",
      },
      { status: 500 }
    );
  }
}
