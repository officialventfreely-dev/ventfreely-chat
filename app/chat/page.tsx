"use client";

import { useEffect, useState } from "react";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

const FREE_LIMIT = 6;

// TODO: replace this with your real Shopify product URL
const SHOPIFY_PRODUCT_URL =
  "https://ventfreely.com/products/ventfreely-unlimited-14-days";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: "Hey, I’m Ventfreely. You can vent about anything here. What’s on your mind right now?",
    },
  ]);
  const [input, setInput] = useState("");
  const [freeMessagesUsed, setFreeMessagesUsed] = useState(0);
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const sendToBackend = async (conversation: Message[]) => {
    const payloadMessages = conversation.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    }));

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: payloadMessages }),
    });

    if (!res.ok) {
      throw new Error("Failed to get reply from server");
    }

    const data = await res.json();
    return data.reply as string;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (isLocked) return;
    if (isLoadingReply) return;

    setError(null);

    const userText = input.trim();

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: userText,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setFreeMessagesUsed((prev) => prev + 1);
    setIsLoadingReply(true);

    try {
      const replyText = await sendToBackend(nextMessages);

      const replyMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        text: replyText || "I’m here with you. It’s okay to take your time.",
      };

      setMessages((prev) => [...prev, replyMessage]);
    } catch (err) {
      console.error(err);
      setError("Ventfreely couldn’t respond right now. Please try again.");
    } finally {
      setIsLoadingReply(false);
    }
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUnlockClick = () => {
    window.location.href = SHOPIFY_PRODUCT_URL;
  };

  const handleAlreadyUnlocked = () => {
    setHasUnlocked(true);
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-violet-950 via-slate-950 to-slate-950 text-slate-50">
      {/* Header */}
      <header className="w-full border-b border-violet-700/40 bg-gradient-to-r from-violet-800 via-fuchsia-700 to-violet-900/90 shadow-lg shadow-violet-900/40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-fuchsia-300/20 border border-fuchsia-200/60">
              <span className="text-xs font-semibold tracking-tight text-fuchsia-50">
                VF
              </span>
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Ventfreely
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-pink-100/90">
            <span className="hidden sm:inline">Anonymous · 24/7 · Online</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-400/15 px-2 py-1 text-[11px] text-emerald-100">
              <span className="text-[9px]">●</span> Listening
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)] items-start">
          {/* Left: Chat */}
          <section className="bg-pink-50/5 border border-pink-200/40 backdrop-blur-xl rounded-3xl p-4 md:p-5 shadow-xl shadow-violet-950/50 flex flex-col gap-4">
            {/* Chat header */}
            <header className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h1 className="text-lg md:text-xl font-semibold tracking-tight">
                  Ventfreely chat
                </h1>
                <p className="text-xs md:text-sm text-pink-100/90 max-w-md">
                  A calm, anonymous space to vent about your thoughts and
                  feelings. No judgment. No pressure. Just a supportive AI
                  friend.
                </p>
              </div>

              <div className="hidden md:flex flex-col items-end gap-1 text-[11px] text-pink-100/90">
                <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-100 border border-emerald-300/60">
                  ● Online & listening
                </span>
                <span className="px-2 py-1 rounded-full bg-pink-50/10 text-pink-100 border border-pink-200/60">
                  Anonymous · 24/7 · Safe
                </span>
              </div>
            </header>

            {/* Free messages info */}
            <div className="rounded-2xl bg-pink-50/10 border border-pink-200/50 px-3 py-3 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-pink-50">
                  {hasUnlocked ? (
                    <span>
                      You currently have <strong>full access</strong> unlocked.
                      ✨
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
                    <span className="text-amber-200">
                      Your free messages are used up. Unlock to keep talking.
                    </span>
                  )}
                </span>
                {!hasUnlocked && (
                  <span className="text-[11px] text-pink-100/80">
                    Limit: {FREE_LIMIT} messages
                  </span>
                )}
              </div>

              {!hasUnlocked && (
                <div className="h-1.5 w-full rounded-full bg-pink-50/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 via-pink-300 to-rose-300 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>

            {/* Messages area */}
            <div className="flex flex-col gap-2 rounded-2xl bg-slate-950/80 border border-violet-900/70 max-h-[420px] min-h-[260px] overflow-y-auto p-3">
              <div className="flex justify-center my-1">
                <span className="px-3 py-1 rounded-full bg-violet-900/70 border border-violet-600/60 text-[10px] text-pink-100/80">
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
                        ? "bg-pink-300 text-violet-950 rounded-br-sm shadow-pink-500/40"
                        : "bg-violet-900/70 text-pink-50 rounded-bl-sm border border-violet-400/50"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {isLoadingReply && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] px-3 py-2 rounded-2xl rounded-bl-sm bg-violet-900/70 text-pink-100 border border-violet-400/50 text-xs flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                    <span>Ventfreely is thinking about how to respond…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-1 rounded-2xl border border-amber-300/70 bg-amber-900/40 px-3 py-2 text-[11px] text-amber-100">
                {error}
              </div>
            )}

            {/* Lock notice */}
            {isLocked && !hasUnlocked && (
              <div className="mt-1 p-3 rounded-2xl bg-pink-50/10 border border-pink-200/60 text-xs flex flex-col gap-2">
                <p className="text-pink-50">
                  You&apos;ve used all <strong>{FREE_LIMIT}</strong> free
                  messages. To keep talking without limits for{" "}
                  <strong>14 days</strong>, you can unlock full access for{" "}
                  <strong>€2.99</strong>.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleUnlockClick}
                    className="px-4 py-2 rounded-xl bg-pink-200 text-violet-950 text-xs font-semibold shadow shadow-pink-500/50 hover:bg-pink-100 active:scale-[0.98] transition"
                  >
                    Unlock full access · €2.99
                  </button>
                  <button
                    onClick={handleAlreadyUnlocked}
                    className="px-3 py-2 rounded-xl border border-pink-200/70 text-pink-50 text-xs hover:bg-pink-50/15 transition"
                  >
                    I already purchased access
                  </button>
                </div>
                <p className="text-[10px] text-pink-100/85">
                  MVP version: this button manually marks you as unlocked on
                  this device. Later we’ll connect this to Shopify so it happens
                  automatically after payment.
                </p>
              </div>
            )}

            {/* Input area */}
            <div className="flex gap-2 pt-1">
              <input
                className="flex-1 rounded-2xl bg-slate-950/90 border border-violet-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400/80 focus:border-pink-300/80 disabled:opacity-50"
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
                className="px-4 py-2 rounded-2xl text-sm font-medium bg-pink-300 text-violet-950 hover:bg-pink-200 active:bg-pink-400 transition disabled:opacity-50 disabled:cursor-not-allowed shadow shadow-pink-500/50"
                disabled={!input.trim() || (isLocked && !hasUnlocked)}
              >
                Send
              </button>
            </div>
          </section>

          {/* Right: info / safety card */}
          <aside className="space-y-4">
            <div className="bg-pink-50/8 border border-pink-200/50 rounded-3xl p-4 md:p-5 backdrop-blur-xl shadow-xl shadow-violet-950/50 text-sm">
              <h2 className="text-sm md:text-base font-semibold mb-2 text-pink-50">
                What is Ventfreely?
              </h2>
              <p className="text-xs md:text-sm text-pink-100/90 mb-3">
                Ventfreely is a mental-health style chat where you can talk
                about anything that’s on your mind. It&apos;s not a therapist or
                a doctor – but it is here to listen, reflect, and support you.
              </p>
              <ul className="space-y-1.5 text-xs text-pink-50/90">
                <li>• Anonymous by default – no real name needed.</li>
                <li>• Gentle, non-judgmental responses.</li>
                <li>• Short free trial, then affordable access.</li>
              </ul>
            </div>

            <div className="bg-pink-50/6 border border-pink-200/50 rounded-3xl p-4 backdrop-blur-xl text-[11px] text-pink-100/90 space-y-2">
              <h3 className="text-xs font-semibold text-pink-50">
                Important note
              </h3>
              <p>
                Ventfreely is an AI chat, not a human or a licensed
                professional. It can be comforting and helpful, but it cannot
                handle emergencies or replace real mental health care.
              </p>
              <p>
                If you ever feel like you might hurt yourself or someone else,
                or you’re in immediate danger, please contact local emergency
                services or a trusted person right away.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
