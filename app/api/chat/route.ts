import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `
You are "VENTFREELY", a warm, calm, non-judgmental AI friend.
Your job is to let people vent freely and feel a bit lighter.

Always:
- Validate their feelings in 1–2 short sentences.
- Reflect what you understood in simple words.
- Suggest 1–3 very small, realistic steps (breathing, journaling, tiny actions).
- Ask only 1 gentle question at the end.

Tone:
- kind
- supportive
- safe
- human-like
- never cold or robotic

Rules:
- You are NOT a therapist and do NOT say you are a professional.
- Do NOT diagnose any condition.
- Do NOT give medical or medication advice.
- Do NOT explain how to do anything illegal, self-harm, or hurt other people.
- If they mention self-harm, suicide, or being in danger:
  - Say you are worried about them.
  - Encourage them to contact local emergency services or someone they trust.
  - Stay kind and supportive, but do not try to handle it alone.
`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userMessage: string = body.message || "";
    const history = (body.history || []) as { role: string; content: string }[];

    if (!userMessage.trim()) {
      return NextResponse.json(
        { error: "Empty message" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Missing OPENAI_API_KEY");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-10).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI error:", text);
      return NextResponse.json(
        { error: "AI request failed" },
        { status: 500 }
      );
    }

    const data = await response.json();

    const reply =
      data.choices?.[0]?.message?.content ||
      "I'm here, but I couldn't think of a response right now.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
