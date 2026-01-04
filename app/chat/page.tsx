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
const CHAT_START_KEY = "vf_chat_start_ms"; // ✅ persists timer across refresh

// Shopify checkout URL (kept here for later ETAPP 2, not used in ETAPP 1 signup wall)
const SHOPIFY_CHECKOUT_URL =
  "https://ventfreely.com/products/ventfreely-unlimited-14-days?variant=53006364410120";

export default function ChatPage() {
  const router = useRouter();

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: "Hey. You can vent about to me. What’s on your mind?",
    },
  ]);
  const [userId, setUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth + subscription state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  // ✅ NEW: Premium paywall UI state (for /api/chat 402)
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallAccess, setPaywallAccess] = useState<any | null>(null);

  // Memory state
  const [memorySummary, setMemorySummary] = useState<string | null>(null);
  const [memoryLastUser, setMemoryLastUser] = useState<string | null>(null);
  const [memoryLastAssistant, setMemoryLastAssistant] = useState<string | null>(
    null
  );
  const [isClearingMemory, setIsClearingMemory] = useState(false);

  // Timer for anonymous users
  const [secondsLeft, setSecondsLeft] = useState(FREE_SECONDS);

  // UI: account dropdown menu
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const isLoggedIn = !!userEmail;
  const isGuest = !isLoggedIn;
  const hasUnlimitedAccess = hasActiveSubscription;

  // ✅ ETAPP 1: Signup wall after 2 minutes ONLY for guests (not checkout)
  const showGuestTimerUI = isGuest && !hasUnlimitedAccess;
  const showSignupWall = showGuestTimerUI && secondsLeft <= 0;

  // Timeline progress (0 → 100%) – only meaningful for guests
  const totalSeconds = FREE_SECONDS;
  const usedSeconds = Math.min(totalSeconds - secondsLeft, totalSeconds);
  const progressPercent =
    totalSeconds > 0 ? (usedSeconds / totalSeconds) * 100 : 0;

  // Format timer mm:ss
  const formattedTime = `${Math.floor(secondsLeft / 60)
    .toString()
    .padStart(1, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`;

  // 1) Check Supabase session + subscription + memory on mount
  useEffect(() => {
    async function loadSessionAndSubscription() {
      try {
        const {
          data: { session },
        } = await supabaseBrowser.auth.getSession();

        const email = session?.user?.email ?? null;
        setUserEmail(email);
        const id = session?.user?.id ?? null;
        setUserId(id);

        // ✅ If user is logged in, guest timer isn't needed anymore
        if (session?.user) {
          try {
            localStorage.removeItem(CHAT_START_KEY);
          } catch {}
        }

        if (!session?.user) {
          setHasActiveSubscription(false);
          return;
        }

        // Check subscriptions table for active subscription
        const { data: subs, error: subsError } = await supabaseBrowser
          .from("subscriptions")
          .select("status,current_period_end")
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .gt("current_period_end", new Date().toISOString())
          .limit(1);

        if (!subsError && subs && subs.length > 0) {
          setHasActiveSubscription(true);
        } else {
          setHasActiveSubscription(false);
        }

        // Load last memory summary + last messages
        const { data: convs, error: convError } = await supabaseBrowser
          .from("conversations")
          .select("summary, last_user_message, last_assistant_message")
          .eq("user_id", session.user.id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(1);

        if (!convError && convs && convs.length > 0) {
          setMemorySummary(convs[0].summary);
          setMemoryLastUser(convs[0].last_user_message);
          setMemoryLastAssistant(convs[0].last_assistant_message);
        }
      } catch (err) {
        console.error("Error checking session/subscription/memory:", err);
        setHasActiveSubscription(false);
      } finally {
        setCheckingSession(false);
      }
    }

    loadSessionAndSubscription();
  }, []);

  // 2) Start 2-minute timer ONLY if user is guest and has no subscription
  // ✅ refresh-proof using localStorage start time
  useEffect(() => {
    if (checkingSession) return; // wait until we know login + subscription status
    if (!showGuestTimerUI) return; // no timer for logged-in or subscribed users

    let start = Date.now();
    try {
      const saved = localStorage.getItem(CHAT_START_KEY);
      if (saved && !Number.isNaN(Number(saved))) {
        start = Number(saved);
      } else {
        localStorage.setItem(CHAT_START_KEY, String(start));
      }
    } catch {
      // ignore localStorage issues; fallback to Date.now
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(FREE_SECONDS - elapsed, 0);
      setSecondsLeft(remaining);
      return remaining;
    };

    // Set immediately (so UI is correct on load/refresh)
    const remainingNow = tick();
    if (remainingNow <= 0) return;

    const id = setInterval(() => {
      const remaining = tick();
      if (remaining <= 0) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [checkingSession, showGuestTimerUI]);

  // ✅ NEW: sendToBackend handles 402 and 401 explicitly
  const sendToBackend = async (conversation: Message[]) => {
    const payloadMessages = conversation.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    }));

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // ✅ IMPORTANT: do NOT send userId anymore (server reads session cookie)
      body: JSON.stringify({
        messages: payloadMessages,
      }),
    });

    if (res.status === 401) {
      return { kind: "UNAUTHORIZED" as const };
    }

    if (res.status === 402) {
      const data = await res.json().catch(() => null);
      return { kind: "PAYWALL" as const, access: data?.access ?? null };
    }

    if (!res.ok) {
      throw new Error("Failed to get reply from server");
    }

    const data = await res.json();
    return { kind: "OK" as const, reply: data.reply as string };
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    // ✅ ETAPP 1: lock ONLY when signup wall is shown (guest after 2 min)
    if (showSignupWall || isLoadingReply) return;

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
      const result = await sendToBackend(nextMessages);

      // ✅ Session expired / not logged in
      if (result.kind === "UNAUTHORIZED") {
        setError("Your session expired. Please log in again.");
        router.push("/login?next=/chat");
        return;
      }

      // ✅ PAYWALL: show premium overlay (don’t show generic error)
      if (result.kind === "PAYWALL") {
        setPaywallAccess(result.access);
        setPaywallOpen(true);
        return;
      }

      // ✅ OK: show assistant reply
      const replyText = result.reply;
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

  // kept for later ETAPP 2
  const handleUnlockClick = () => {
    window.location.href = SHOPIFY_CHECKOUT_URL;
  };

  const handleLoginClick = () => {
    router.push("/login?next=/chat");
  };

  const handleSignupClick = () => {
    router.push("/signup?next=/chat");
  };

  const handleLogout = async () => {
    try {
      await supabaseBrowser.auth.signOut();
      setUserEmail(null);
      setUserId(null);
      setHasActiveSubscription(false);
      setSecondsLeft(FREE_SECONDS);
      setMemorySummary(null);
      setMemoryLastUser(null);
      setMemoryLastAssistant(null);

      // ✅ restart guest timer cleanly
      try {
        localStorage.removeItem(CHAT_START_KEY);
      } catch {}

      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleClearMemory = async () => {
    if (!userId) return;
    try {
      setIsClearingMemory(true);
      const { error } = await supabaseBrowser
        .from("conversations")
        .update({
          is_deleted: true,
          summary: null,
          last_user_message: null,
          last_assistant_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("is_deleted", false);

      if (error) {
        console.error("Error clearing memory:", error);
        return;
      }

      setMemorySummary(null);
      setMemoryLastUser(null);
      setMemoryLastAssistant(null);
    } catch (err) {
      console.error("Error clearing memory:", err);
    } finally {
      setIsClearingMemory(false);
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
              <span className="text-xs font-semibold tracking-tight">VF</span>
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
            {/* Timer for guests without subscription */}
            {showGuestTimerUI && (
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
                          router.push("/account");
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-violet-50"
                      >
                        Account
                      </button>

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

      {/* ✅ PREMIUM PAYWALL OVERLAY (shows when /api/chat returns 402) */}
      {paywallOpen && !showSignupWall && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setPaywallOpen(false)}
          />
          <div className="relative mx-4 w-full max-w-[460px]">
            <div className="rounded-3xl border border-violet-200/70 bg-white/90 backdrop-blur-md shadow-2xl overflow-hidden">
              <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-[#401268] via-[#6B21A8] to-[#F973C9] text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                      <span>Premium required</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight">
                      Your free trial has ended
                    </h3>
                    <p className="mt-1 text-[12px] text-white/90 leading-relaxed">
                      Unlock Premium to keep chatting without limits.
                    </p>
                  </div>

                  <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 border border-white/15">
                    <span className="text-xs font-semibold">VF</span>
                  </div>
                </div>

                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
              </div>

              <div className="px-6 py-5">
                <div className="rounded-2xl border border-violet-200/70 bg-white px-4 py-3 text-[12px] text-slate-700">
                  <div className="font-semibold text-[#2A1740]">
                    What you get
                  </div>
                  <ul className="mt-1 list-disc pl-4 text-[12px] text-slate-700 space-y-1">
                    <li>Unlimited chatting</li>
                    <li>Your memory summary stays saved</li>
                    <li>Supportive, calm responses</li>
                  </ul>

                  {paywallAccess?.trialEndsAt && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      Trial ended:{" "}
                      <span className="font-medium">
                        {new Date(paywallAccess.trialEndsAt).toLocaleString()}
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  <button
                    onClick={handleUnlockClick}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#401268]/25 bg-[#401268] hover:brightness-110 active:scale-[0.99] transition"
                  >
                    Unlock Premium
                  </button>

                  <button
                    onClick={() => setPaywallOpen(false)}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-[#401268] bg-white border border-violet-200 hover:bg-violet-50 active:scale-[0.99] transition"
                  >
                    Not now
                  </button>
                </div>

                <p className="mt-4 text-[10px] text-slate-500 leading-relaxed">
                  Ventfreely is a supportive AI companion — not a therapist. If
                  you’re in danger or feel like you might hurt yourself, contact
                  local emergency services right now.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YouTube-style top progress bar for guest timer */}
      {showGuestTimerUI && (
        <div className="w-full bg-[#FAF8FF]">
          <div className="mx-auto max-w-5xl px-4 md:px-6 pt-2">
            <div className="h-1.5 w-full rounded-full bg-white/70 overflow-hidden shadow-[0_0_0_1px_rgba(148,163,184,0.25)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#F973C9] via-[#F5A5E0] to-[#FBD3F4] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ✅ BEAUTIFUL SIGNUP WALL OVERLAY after 2 min (guest only) */}
      {showSignupWall && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

          {/* Card */}
          <div className="relative mx-4 w-full max-w-[440px]">
            <div className="rounded-3xl border border-violet-200/70 bg-white/90 backdrop-blur-md shadow-2xl overflow-hidden">
              {/* Top gradient header */}
              <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-[#401268] via-[#6B21A8] to-[#F973C9] text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      <span>Guest session ended</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold tracking-tight">
                      Create a free account to continue
                    </h3>
                    <p className="mt-1 text-[12px] text-white/90 leading-relaxed">
                      Your chat will be saved so you don’t have to start from
                      zero next time.
                    </p>
                  </div>

                  <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 border border-white/15">
                    <span className="text-xs font-semibold">VF</span>
                  </div>
                </div>

                {/* Decorative glow */}
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <div className="rounded-2xl border border-violet-200/70 bg-white px-4 py-3 text-[12px] text-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-7 w-7 rounded-xl bg-gradient-to-br from-[#F973C9] via-[#F5A5E0] to-[#FBD3F4] shadow-sm" />
                    <div className="leading-relaxed">
                      <div className="font-semibold text-[#2A1740]">
                        Continue in one click
                      </div>
                      <div className="mt-0.5 text-slate-600">
                        Sign up or log in to keep chatting — calm, private, and
                        saved.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  <button
                    onClick={handleSignupClick}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#401268]/25 bg-[#401268] hover:brightness-110 active:scale-[0.99] transition"
                  >
                    Create free account
                  </button>

                  <button
                    onClick={handleLoginClick}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-[#401268] bg-white border border-violet-200 hover:bg-violet-50 active:scale-[0.99] transition"
                  >
                    I already have an account
                  </button>
                </div>

                <p className="mt-4 text-[10px] text-slate-500 leading-relaxed">
                  Ventfreely is a supportive AI companion — not a therapist. If
                  you’re in danger or feel like you might hurt yourself, contact
                  local emergency services right now.
                </p>
              </div>
            </div>

            {/* Tiny bottom hint */}
            <div className="mt-3 flex justify-center">
              <span className="text-[10px] text-slate-500">
                Tip: Google sign-in can be added on the signup page (STEP 2).
              </span>
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
                your head. No judgment. No pressure. Just a supportive AI friend
                listening to you.
              </p>

              {/* Memory summary pill */}
              {isLoggedIn && memorySummary && (
                <div className="mt-3 rounded-xl bg-white/80 border border-violet-200 px-3 py-2 text-[11px] text-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[11px] text-[#2A1740] mb-1">
                        Last time you talked about:
                      </div>
                      <p className="line-clamp-4">{memorySummary}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-slate-500">
                      Ventfreely remembers this summary to help you not start
                      from zero.
                    </span>
                    <button
                      onClick={handleClearMemory}
                      disabled={isClearingMemory}
                      className="text-[10px] text-[#401268] hover:underline disabled:opacity-60"
                    >
                      {isClearingMemory ? "Clearing…" : "Delete my memory"}
                    </button>
                  </div>
                </div>
              )}
            </header>

            {/* Timer / access info */}
            {showGuestTimerUI ? (
              <div className="space-y-1 text-[11px]">
                {secondsLeft > 0 ? (
                  <p className="text-slate-700">
                    You&apos;re trying Ventfreely without an account. You have{" "}
                    <strong>{formattedTime}</strong> of free chat time left
                    before we ask you to save your conversation.
                  </p>
                ) : (
                  <p className="text-amber-800">
                    Your guest time has ended. Create a free account to continue
                    and save your chat.
                  </p>
                )}
              </div>
            ) : !hasUnlimitedAccess && isLoggedIn ? (
              <div className="space-y-1 text-[11px]">
                <p className="text-amber-800">
                  Your account doesn&apos;t have an active Ventfreely
                  subscription yet.
                </p>
              </div>
            ) : null}

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

            {/* Input */}
            <div className="flex gap-2 pt-2">
              <input
                className="flex-1 rounded-full bg-white/80 border border-violet-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#A268F5] focus:border-[#A268F5] disabled:opacity-50"
                placeholder={
                  showSignupWall
                    ? "Create a free account to continue…"
                    : "Type whatever you’re thinking right now…"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={showSignupWall || isLoadingReply}
              />
              <button
                onClick={handleSend}
                className="px-4 py-2 rounded-full text-sm font-medium bg-[#401268] text-white hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!input.trim() || showSignupWall || isLoadingReply}
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
                Ventfreely is a gentle AI chat where you can talk about stressful
                thoughts, feelings, and everyday mental load. It&apos;s designed
                to feel like a calm friend, not a lecture.
              </p>
              <ul className="space-y-1 list-disc pl-4 text-xs text-slate-700">
                <li>Anonymous by default – you don&apos;t need your real name.</li>
                <li>Validates your feelings instead of judging them.</li>
                <li>
                  Short free session, then we ask you to save the conversation.
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
