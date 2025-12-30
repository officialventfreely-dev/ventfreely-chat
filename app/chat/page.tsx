"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

const FREE_SECONDS = 120; // 2 minutes

// Shopify checkout URL (set this to your real checkout link)
const SHOPIFY_CHECKOUT_URL =
  "https://ventfreely.com/checkouts/cn/hWN725VxGoce2BUe9FrEvdmF/en-ee?_r=AQABNbyc5Ctd37Q487qYXfMKfSlhlJam-JhDpCjf_X1nqHg&preview_theme_id=191156912392";

export default function ChatPage() {
  const router = useRouter();

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: "Hey, I’m Ventfreely. You can vent about anything here. What’s on your mind right now?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Timer for anonymous users
  const [secondsLeft, setSecondsLeft] = useState(FREE_SECONDS);

  // UI: account dropdown menu
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const isLoggedIn = !!userEmail;
  const isLocked = !isLoggedIn && secondsLeft <= 0;

  // Format timer mm:ss
  const formattedTime = `${Math.floor(secondsLeft / 60)
    .toString()
    .padStart(1, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`;

  // 1) Check Supabase session on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const {
          data: { session },
        } = await supabaseBrowser.auth.getSession();
        setUserEmail(session?.user?.email ?? null);
      } catch (err) {
        console.error("Error checking session:", err);
      } finally {
        setCheckingSession(false);
      }
    }

    loadSession();
  }, []);

  // 2) Start 2-minute timer ONLY if user is NOT logged in
  useEffect(() => {
    if (checkingSession) return; // wait until we know login status
    if (isLoggedIn) return; // logged-in users have no timer/paywall

    setSecondsLeft(FREE_SECONDS);
    const start = Date.now();

    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(FREE_SECONDS - elapsed, 0);
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(id);
      }
    }, 1000);

    return () => clearInterval(id);
  }, [checkingSession, isLoggedIn]);

  // 3) Send messages to your /api/chat backend
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUnlockClick = () => {
    // Here you send user to Shopify checkout.
    // In Shopify settings, you explain in emails that they’ll get a signup link.
    window.location.href = SHOPIFY_CHECKOUT_URL;
  };

  const handleLoginClick = () => {
    router.push("/login");
  };

  const handleSignupClick = () => {
    router.push("/signup");
  };

  const handleLogout = async () => {
    try {
      await supabaseBrowser.auth.signOut();
      setUserEmail(null);
      setSecondsLeft(FREE_SECONDS); // start timer again for anonymous
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (checkingSession) {
    return (
      <main className="min-h-screen w-full bg-[#FAF8FF] flex items-center justify-center">
        <div className="rounded-2xl bg-white px-6 py-4 shadow-lg border border-purple-100 text-sm text-gray-600">
          Checking your account...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#FAF8FF] text-slate-900">
      {/* Header */}
      <header className="w-full bg-[#401268] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          {/* Left: logo + tagline */}
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

          {/* Right: timer (for guests) + account menu */}
          <div className="flex items-center gap-3">
            {/* Timer for guests */}
            {!isLoggedIn && (
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-violet-100/90">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  <span>
                    {secondsLeft > 0
                      ? `Free time: ${formattedTime}`
                      : "Free time ended"}
                  </span>
                </span>
              </div>
            )}

            {/* Account dropdown */}
            <div className="relative">
              <button
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full bg-white/10 px-2 py-1 text-[11px] hover:bg-white/15 transition"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                  <span className="text-xs font-semibold">
                    {isLoggedIn
                      ? userEmail?.charAt(0).toUpperCase() ?? "U"
                      : "A"}
                  </span>
                </div>
                <span className="hidden sm:inline text-violet-100/90">
                  {isLoggedIn ? userEmail : "Account"}
                </span>
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-xl bg-white text-[12px] text-slate-800 shadow-lg border border-violet-100 z-20">
                  {!isLoggedIn ? (
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setAccountMenuOpen(false);
                          handleSignupClick();
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-violet-50"
                      >
                        Sign up
                      </button>
                      <button
                        onClick={() => {
                          setAccountMenuOpen(false);
                          handleLoginClick();
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-violet-50"
                      >
                        Log in
                      </button>
                    </div>
                  ) : (
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setAccountMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-violet-50"
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 🔔 Floating info overlay after 2 min (only for guests) */}
      {isLocked && !isLoggedIn && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pointer-events-none">
          <div className="mt-10 vf-animate-slide-down pointer-events-auto">
            <div className="rounded-2xl shadow-2xl border border-violet-200/60 bg-white/95 backdrop-blur-md px-6 py-4 max-w-[380px] text-center">
              <h3 className="text-sm font-semibold text-[#2A1740]">
                Your free time has ended
              </h3>

              <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                To keep chatting, you’ll be taken to checkout.
                <br />
                After payment, you&apos;ll receive an email with a link to
                create your Ventfreely account and activate access.
              </p>

              <div className="flex justify-center mt-3">
                <div className="h-1.5 w-24 rounded-full bg-gradient-to-r from-[#F973C9] via-[#F5A5E0] to-[#FBD3F4]" />
              </div>
            </div>
          </div>
        </div>
      )}

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

            {/* Timer info inside chat for guests */}
            {!isLoggedIn && (
              <div className="space-y-1 text-[11px]">
                {secondsLeft > 0 ? (
                  <p className="text-slate-700">
                    You&apos;re trying Ventfreely without an account. You have{" "}
                    <strong>{formattedTime}</strong> of free chat time left
                    before we ask you to unlock access.
                  </p>
                ) : (
                  <p className="text-amber-800">
                    Your free time as a guest has ended. To keep talking, please
                    unlock access via checkout. After payment, check your email
                    for a link to create your Ventfreely account.
                  </p>
                )}
              </div>
            )}

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

            {/* Paywall for guests after timer */}
            {isLocked && !isLoggedIn && (
              <div className="space-y-2 text-[11px] border-t border-violet-200/40 pt-3">
                <p className="text-slate-700">
                  Your free 2-minute guest session has ended. To keep talking
                  without time limits, you can unlock access for{" "}
                  <strong>€2.99 / 14 days</strong>.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleUnlockClick}
                    className="px-4 py-2 rounded-full bg-[#401268] text-white text-xs font-semibold shadow-sm shadow-[#401268]/30 hover:brightness-110 active:scale-[0.98] transition"
                  >
                    Go to checkout · €2.99
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  After checkout, check your email. You&apos;ll receive a link
                  to create your Ventfreely account with the same email you used
                  for payment.
                </p>
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2 pt-2">
              <input
                className="flex-1 rounded-full bg-white/80 border border-violet-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#A268F5] focus:border-[#A268F5] disabled:opacity-50"
                placeholder={
                  isLocked && !isLoggedIn
                    ? "Your free time as a guest has ended. Unlock access to keep talking."
                    : "Type whatever you’re thinking right now…"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLocked && !isLoggedIn}
              />
              <button
                onClick={handleSend}
                className="px-4 py-2 rounded-full text-sm font-medium bg-[#401268] text-white hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!input.trim() || (isLocked && !isLoggedIn)}
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
                <li>
                  Short free session, then affordable access if it helps you.
                </li>
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
