"use client";

import { useEffect, useState } from "react";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

const FREE_LIMIT = 6;

// TODO: replace with your real Shopify product URL
const SHOPIFY_PRODUCT_URL =
  "https://YOURSTORE.myshopify.com/products/ventfreely-14-day-access";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: "Hey, I’m Ventfreely 👋 You can vent about anything here. What’s on your mind right now?",
    },
  ]);
  const [input, setInput] = useState("");
  const [freeMessagesUsed, setFreeMessagesUsed] = useState(0);
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const isLocked = !hasUnlocked && freeMessagesUsed >= FREE_LIMIT;
  const remaining = Math.max(FREE_LIMIT - freeMessagesUsed, 0);
  const usedForBar = Math.min(freeMessagesUsed, FREE_LIMIT);
  const progressPercent = (usedForBar / FREE_LIMIT) * 100;

  // Load from localStorage on first render
  useEffect(() => {
    try {
      const storedUsed = localStorage.getItem("ventfreely_freeMessagesUsed");
      const storedUnlocked = localStorage.getItem("ventfreely_hasUnlocked");

      if (storedUsed) {
        setFreeMessagesUsed(Number(storedUsed));
      }
      if (storedUnlocked === "true") {
        setHasUnlocked(true);
      }
    } catch (err) {
      console.error("LocalStorage error:", err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever values change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(
        "ventfreely_freeMessagesUsed",
        String(freeMessagesUsed)
      );
      localStorage.setItem("ventfreely_hasUnlocked", String(hasUnlocked));
    } catch (err) {
      console.error("LocalStorage error:", err);
    }
  }, [freeMessagesUsed, hasUnlocked, isLoaded]);

  const handleSend = () => {
    if (!input.trim()) return;
    if (isLocked) return;

    const userText = input.trim();

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: userText,
    };

    // TEMP: fake reply. Later we’ll replace this with real AI
    const reply: Message = {
      id: Date.now() + 1,
      role: "assistant",
      text:
        'I hear you. You said: "' +
        userText +
        '". In the future, I’ll respond in a much smarter and more personal way – but for now, thank you for sharing 🫶',
    };

    setMessages((prev) => [...prev, userMessage, reply]);
    setInput("");

    setFreeMessagesUsed((prev) => prev + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUnlockClick = () => {
    window.location.href = SHOPIFY_PRODUCT_URL;
  };

  const handleAlreadyUnlocked = () => {
    // MVP: user can manually mark themselves as unlocked
    setHasUnlocked(true);
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-4xl grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] items-start">
        {/* Left side: Chat */}
        <section className="bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-4 md:p-5 shadow-xl shadow-slate-950/40 flex flex-col gap-4">
          {/* Header */}
          <header className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2">
                <div className="h-8 w-8 rounded-2xl bg-blue-500/20 flex items-center justify-center text-xs font-semibold text-blue-300 border border-blue-500/40">
                  VF
                </div>
                <h1 className="text-lg md:text-xl font-semibold tracking-tight">
                  Ventfreely chat
                </h1>
              </div>
              <p className="text-xs md:text-sm text-slate-400 max-w-md">
                A calm, anonymous space to vent about your thoughts and feelings.
                No judgment. No pressure. Just a supportive AI friend.
              </p>
            </div>

            <div className="hidden md:flex flex-col items-end gap-1 text-xs">
              <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                ● Online & listening
              </span>
              <span className="px-2 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 text-[11px]">
                Anonymous · 24/7 · Safe
              </span>
            </div>
          </header>

          {/* Free messages info */}
          <div className="rounded-2xl bg-slate-950/70 border border-slate-800 px-3 py-3 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-300">
                {hasUnlocked ? (
                  <span>
                    You currently have <strong>full access</strong> unlocked. ✨
                  </span>
                ) : remaining > 0 ? (
                  <span>
                    You have{" "}
                    <strong>
                      {remaining} free message{remaining === 1 ? "" : "s"}
                    </strong>{" "}
                    left.
                  </span>
                ) : (
                  <span className="text-amber-300">
                    Your free messages are used up. Unlock to keep talking. ✨
                  </span>
                )}
              </span>
              {!hasUnlocked && (
                <span className="text-[11px] text-slate-500">
                  Limit: {FREE_LIMIT} messages
                </span>
              )}
            </div>

            {!hasUnlocked && (
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>

          {/* Messages area */}
          <div className="flex flex-col gap-2 rounded-2xl bg-slate-950/70 border border-slate-900 max-h-[420px] min-h-[260px] overflow-y-auto p-3">
            <div className="flex justify-center my-1">
              <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400">
                Today
              </span>
            </div>

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm shadow-blue-900/40"
                      : "bg-slate-800 text-slate-50 rounded-bl-sm border border-slate-700/80"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Lock notice */}
          {isLocked && !hasUnlocked && (
            <div className="mt-1 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs flex flex-col gap-2">
              <p className="text-slate-200">
                You’ve used all <strong>{FREE_LIMIT}</strong> free messages. To
                keep talking without limits for{" "}
                <strong>14 days</strong>, you can unlock full access for{" "}
                <strong>€2.99</strong>.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleUnlockClick}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-sky-400 text-slate-950 text-xs font-semibold shadow shadow-blue-900/40 hover:brightness-110 active:scale-[0.98] transition"
                >
                  Unlock full access · €2.99
                </button>
                <button
                  onClick={handleAlreadyUnlocked}
                  className="px-3 py-2 rounded-xl border border-slate-600 text-slate-200 text-xs hover:bg-slate-900 transition"
                >
                  I already purchased access
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                MVP version: this button manually marks you as unlocked on this
                device. Later we’ll connect this to Shopify so it happens
                automatically after payment.
              </p>
            </div>
          )}

          {/* Input area */}
          <div className="flex gap-2 pt-1">
            <input
              className="flex-1 rounded-2xl bg-slate-950/90 border border-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/70 disabled:opacity-50"
              placeholder={
                isLocked && !hasUnlocked
                  ? "Free messages are used up. Unlock access to keep talking."
                  : "Type whatever you’re thinking right now…"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLocked && !hasUnlocked}
            />
            <button
              onClick={handleSend}
              className="px-4 py-2 rounded-2xl text-sm font-medium bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow shadow-blue-900/40"
              disabled={!input.trim() || (isLocked && !hasUnlocked)}
            >
              Send
            </button>
          </div>
        </section>

        {/* Right side: Info / teaser */}
        <aside className="space-y-4">
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-4 md:p-5 backdrop-blur-xl shadow-xl shadow-slate-950/40">
            <h2 className="text-sm md:text-base font-semibold mb-2">
              What is Ventfreely?
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mb-3">
              Ventfreely is a mental-health style chat where you can talk about
              anything that’s on your mind. It’s not a therapist or a doctor –
              but it is here to listen, reflect, and support you.
            </p>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li>• Anonymous by default – no real name needed.</li>
              <li>• Helpful, non-judgmental responses.</li>
              <li>• Short free trial, then affordable access.</li>
            </ul>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-4 backdrop-blur-xl text-[11px] text-slate-400 space-y-2">
            <h3 className="text-xs font-semibold text-slate-200">
              Important note
            </h3>
            <p>
              Ventfreely is an AI chat, not a human or a licensed professional.
              It can be comforting and helpful, but it cannot handle emergencies
              or replace real mental health care.
            </p>
            <p>
              If you ever feel like you might hurt yourself or someone else, or
              you’re in immediate danger, please contact local emergency
              services or a trusted person right away.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
