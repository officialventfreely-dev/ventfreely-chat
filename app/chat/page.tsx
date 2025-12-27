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
  "https://ventfreely.com/products/ventfreely-unlimited-14-days?variant=53006364410120";

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

  // Load limits from localStorage
  useEffect(() => {
    try {
      const storedUsed = localStorage.getItem("ventfreely_freeMessagesUsed");
      const storedUnlocked = localStorage.getItem("ventfreely_hasUnlocked");

      if (storedUsed) setFreeMessagesUsed(Number(storedUsed));
      if (storedUnlocked === "true") setHasUnlocked(true);
    } catch (err) {
      console.error("LocalStorage error:", err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage when values change
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
      headers: { "Content-Type": "application/json" },
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
    if (isLocked || isLoadingReply) return;

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
        text:
          replyText ||
          "I’m here with you. It’s okay to take your time and put your feelings into words.",
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
    <main className="min-h-screen w-full bg-[#FAF8FF] text-slate-900">
      {/* Header */}
      <header className="w-full bg-[#401268] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <span className="text-xs font-semibold tracking-tight">
                VF
              </span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">
                Ventfreely
              </span>
              <span className="text-[11px] text-violet-100/80">
                Gentle space to vent, not a therapist
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-violet-100/90">
            <span className="hidden sm:inline">Anonymous · 24/7</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Listening
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)] items-start">
          {/* Left: Chat */}
          <section className="space-y-4">
            {/* Text intro */}
            <header className="space-y-1 border-b border-violet-200/40 pb-3">
              <h1 className="text-base md:text-lg font-semibold tracking-tight text-[#2A1740]">
                Ventfreely chat
              </h1>
              <p className="text-xs md:text-sm text-slate-700 max-w-md">
                A calm, anonymous space to say the things that feel heavy in
                your head. No judgment. No pressure. Just a supportive AI
                friend listening to you.
              </p>
            </header>

            {/* Free messages info */}
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-700">
                  {hasUnlocked ? (
                    <>
                      You currently have{" "}
                      <strong className="font-semibold">full access</strong>.
                    </>
                  ) : remaining > 0 ? (
                    <>
                      You have{" "}
                      <strong className="font-semibold">
                        {remaining} free message{remaining === 1 ? "" : "s"}
                      </strong>{" "}
                      left.
                    </>
                  ) : (
                    <span className="text-amber-800">
                      Your free messages are used up. Unlock to keep talking.
                    </span>
                  )}
                </span>
                {!hasUnlocked && (
                  <span className="text-[10px] text-slate-500">
                    Limit: {FREE_LIMIT} messages
                  </span>
                )}
              </div>

              {!hasUnlocked && (
                <div className="h-1.5 w-full rounded-full bg-white/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#F973C9] via-[#F5A5E0] to-[#FBD3F4] transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>

            {/* Messages area */}
            <div className="flex flex-col gap-2 max-h-[420px] min-h-[260px] overflow-y-auto py-3 border-y border-violet-200/50">
              <div className="flex justify-center my-1">
                <span className="px-3 py-1 rounded-full bg-white/70 text-[10px] text-slate-600">
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
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs md:text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-[#401268] text-white rounded-br-[1.6rem]"
                        : "bg-white/80 text-slate-900 rounded-bl-[1.6rem]"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {isLoadingReply && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] px-3 py-2 rounded-2xl rounded-bl-[1.6rem] bg-white/80 text-slate-700 text-xs flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#401268] animate-pulse" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#A268F5] animate-pulse [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F5A5E0] animate-pulse [animation-delay:240ms]" />
                    </span>
                    <span>Ventfreely is thinking about how to respond…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-100 rounded-full px-3 py-2">
                {error}
              </div>
            )}

            {/* Lock notice */}
            {isLocked && !hasUnlocked && (
              <div className="space-y-2 text-[11px] border-t border-violet-200/40 pt-3">
                <p className="text-slate-700">
                  You&apos;ve used all <strong>{FREE_LIMIT}</strong> free
                  messages. To keep talking without limits for 14 days, you can
                  unlock full access for <strong>€2.99</strong>.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleUnlockClick}
                    className="px-4 py-2 rounded-full bg-[#401268] text-white text-xs font-semibold shadow-sm shadow-[#401268]/30 hover:brightness-110 active:scale-[0.98] transition"
                  >
                    Unlock full access · €2.99
                  </button>
                  <button
                    onClick={handleAlreadyUnlocked}
                    className="px-3 py-2 rounded-full border border-[#401268]/25 text-xs text-[#401268] bg-white/60 hover:bg-white transition"
                  >
                    I already have access
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  MVP version: this unlocks access on this device only. Later
                  we’ll connect it directly to your payment.
                </p>
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2 pt-2">
              <input
                className="flex-1 rounded-full bg-white/80 border border-violet-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#A268F5] focus:border-[#A268F5] disabled:opacity-50"
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
                className="px-4 py-2 rounded-full text-sm font-medium bg-[#401268] text-white hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!input.trim() || (isLocked && !hasUnlocked)}
              >
                Send
              </button>
            </div>
          </section>

          {/* Right: info / safety */}
          <aside className="space-y-4 text-xs md:text-sm text-slate-700">
            <section className="space-y-2 border-b border-violet-200/40 pb-4 md:pb-5">
              <h2 className="text-sm font-semibold text-[#2A1740]">
                What Ventfreely is (and isn&apos;t)
              </h2>
              <p>
                Ventfreely is a gentle AI chat where you can talk about
                stressful thoughts, feelings, and everyday mental load. It&apos;s
                designed to feel like a calm friend, not a lecture.
              </p>
              <ul className="space-y-1 list-disc pl-4 text-xs text-slate-700">
                <li>Anonymous by default – you don&apos;t need your real name.</li>
                <li>Validates your feelings instead of judging them.</li>
                <li>Short free trial, then affordable access if it helps you.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-[#2A1740]">
                Important safety note
              </h3>
              <p className="text-xs md:text-sm">
                Ventfreely is an AI companion, not a human and not a licensed
                professional. It can be comforting and reflective, but it cannot
                handle emergencies or replace real mental health care.
              </p>
              <p className="text-xs md:text-sm">
                If you ever feel like you might hurt yourself or someone else,
                or you&apos;re in immediate danger, please contact local
                emergency services or someone you trust right away.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
