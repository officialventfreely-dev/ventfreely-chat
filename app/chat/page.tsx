"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

const FREE_SECONDS = 120; // 2 minutes
const CHAT_START_KEY = "vf_chat_start_ms";

// kept for later ETAPP 2
const SHOPIFY_CHECKOUT_URL =
  "https://ventfreely.com/products/ventfreely-unlimited-14-days?variant=53006364410120";

/** tiny inline icons (no extra packages needed) */
function IconUser(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={props.className ?? "h-4 w-4"}
      fill="none"
    >
      <path
        d="M20 21a8 8 0 0 0-16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 13a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 13Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMenu(props: { open: boolean; className?: string }) {
  // hamburger / X
  return props.open ? (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={props.className ?? "h-4 w-4"}
      fill="none"
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={props.className ?? "h-4 w-4"}
      fill="none"
    >
      <path
        d="M5 7h14M5 12h14M5 17h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const pathname = usePathname();

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "assistant", text: "Hey. You can vent to me. What’s on your mind?" },
  ]);
  const [userId, setUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth + subscription state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  // Premium paywall UI state (for /api/chat 402)
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallAccess, setPaywallAccess] = useState<any | null>(null);

  // Memory state
  const [memorySummary, setMemorySummary] = useState<string | null>(null);
  const [isClearingMemory, setIsClearingMemory] = useState(false);

  // Timer for anonymous users
  const [secondsLeft, setSecondsLeft] = useState(FREE_SECONDS);

  // UI state
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isLoggedIn = !!userEmail;
  const showGuestTimerUI = !isLoggedIn && !hasActiveSubscription;
  const showSignupWall = showGuestTimerUI && secondsLeft <= 0;

  const formattedTime = `${Math.floor(secondsLeft / 60)
    .toString()
    .padStart(1, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`;

  const navItems = useMemo(
    () => [
      { href: "/", label: "Home" },
      { href: "/test", label: "Test" },
      { href: "/chat", label: "Chat" },
      { href: "/daily", label: "Daily" },
      { href: "/weekly", label: "Weekly" },
    ],
    []
  );

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Close menus on route change
  useEffect(() => {
    setAccountMenuOpen(false);
    setMobileNavOpen(false);
  }, [pathname]);

  // 1) Check session + subscription + memory on mount
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

        if (session?.user) {
          try {
            localStorage.removeItem(CHAT_START_KEY);
          } catch {}
        }

        if (!session?.user) {
          setHasActiveSubscription(false);
          return;
        }

        // Check subscriptions (same as your old code)
        const { data: subs, error: subsError } = await supabaseBrowser
          .from("subscriptions")
          .select("status,current_period_end")
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .gt("current_period_end", new Date().toISOString())
          .limit(1);

        setHasActiveSubscription(!subsError && !!subs && subs.length > 0);

        // Load last memory summary
        const { data: convs, error: convError } = await supabaseBrowser
          .from("conversations")
          .select("summary")
          .eq("user_id", session.user.id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(1);

        if (!convError && convs && convs.length > 0) {
          setMemorySummary(convs[0].summary);
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

  // 2) Start timer (guest only) – refresh-proof
  useEffect(() => {
    if (checkingSession) return;
    if (!showGuestTimerUI) return;

    let start = Date.now();
    try {
      const saved = localStorage.getItem(CHAT_START_KEY);
      if (saved && !Number.isNaN(Number(saved))) start = Number(saved);
      else localStorage.setItem(CHAT_START_KEY, String(start));
    } catch {}

    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(FREE_SECONDS - elapsed, 0);
      setSecondsLeft(remaining);
      return remaining;
    };

    const nowRemaining = tick();
    if (nowRemaining <= 0) return;

    const id = setInterval(() => {
      const r = tick();
      if (r <= 0) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [checkingSession, showGuestTimerUI]);

  const sendToBackend = async (conversation: Message[]) => {
    const payloadMessages = conversation.map((m) => ({
      role: m.role,
      content: m.text,
    }));

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: payloadMessages }),
    });

    if (res.status === 401) return { kind: "UNAUTHORIZED" as const };

    if (res.status === 402) {
      const data = await res.json().catch(() => null);
      return { kind: "PAYWALL" as const, access: data?.access ?? null };
    }

    if (!res.ok) throw new Error("Failed to get reply from server");

    const data = await res.json();
    return { kind: "OK" as const, reply: data.reply as string };
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (showSignupWall || isLoadingReply) return;

    setError(null);

    const userMessage: Message = { id: Date.now(), role: "user", text: input.trim() };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setIsLoadingReply(true);

    try {
      const result = await sendToBackend(nextMessages);

      if (result.kind === "UNAUTHORIZED") {
        setError("Your session expired. Please log in again.");
        router.push("/login?next=/chat");
        return;
      }

      if (result.kind === "PAYWALL") {
        setPaywallAccess(result.access);
        setPaywallOpen(true);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          text:
            result.reply ||
            "I’m here with you. It’s okay to take your time and put your feelings into words.",
        },
      ]);
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
    window.location.href = SHOPIFY_CHECKOUT_URL;
  };

  const handleLoginClick = () => router.push("/login?next=/chat");
  const handleSignupClick = () => router.push("/signup?next=/chat");

  const handleLogout = async () => {
    try {
      await supabaseBrowser.auth.signOut();
      setUserEmail(null);
      setUserId(null);
      setHasActiveSubscription(false);
      setSecondsLeft(FREE_SECONDS);
      setMemorySummary(null);

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
    } catch (err) {
      console.error("Error clearing memory:", err);
    } finally {
      setIsClearingMemory(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="min-h-screen w-full bg-[#FAF8FF] flex items-center justify-center">
        <div className="rounded-2xl bg-white px-5 py-3 shadow border border-purple-100 text-xs text-slate-600">
          Checking your account…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#FAF8FF] text-slate-900">
      {/* Header */}
      <header className="w-full bg-[#401268] text-white">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <div className="flex items-center justify-between py-2.5">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="relative h-7 w-7 overflow-hidden rounded-lg bg-white/10 border border-white/10">
                <Image
                  src="/logo.svg"
                  alt="Ventfreely"
                  fill
                  className="object-contain p-1"
                  sizes="28px"
                  priority
                />
              </div>
              <span className="text-sm font-semibold tracking-tight">
                Ventfreely
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      active ? "bg-white/15" : "hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right */}
            <div className="flex items-center gap-2">
              {showGuestTimerUI && (
                <div className="hidden sm:inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-violet-100/90">
                  {secondsLeft > 0 ? `Free: ${formattedTime}` : "Free ended"}
                </div>
              )}

              {/* Mobile nav toggle */}
              <button
                onClick={() => setMobileNavOpen((v) => !v)}
                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 transition"
                aria-label="Menu"
              >
                <IconMenu open={mobileNavOpen} />
              </button>

              {/* Account */}
              <div className="relative">
                <button
                  onClick={() => setAccountMenuOpen((v) => !v)}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-2.5 hover:bg-white/15 transition"
                  aria-label="Account"
                >
                  <IconUser className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs text-violet-100/90">
                    {isLoggedIn ? "Account" : "Sign in"}
                  </span>
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white text-slate-800 shadow-lg border border-violet-100 z-30 overflow-hidden">
                    <div className="px-3 py-2 border-b border-violet-100">
                      <div className="text-[11px] text-slate-500">Signed in as</div>
                      <div className="text-xs font-medium truncate">
                        {isLoggedIn ? userEmail : "Guest"}
                      </div>
                    </div>

                    {!isLoggedIn ? (
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setAccountMenuOpen(false);
                            handleSignupClick();
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-violet-50"
                        >
                          Sign up
                        </button>
                        <button
                          onClick={() => {
                            setAccountMenuOpen(false);
                            handleLoginClick();
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-violet-50"
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
                          className="w-full text-left px-3 py-2 text-xs hover:bg-violet-50"
                        >
                          Account
                        </button>
                        <button
                          onClick={() => {
                            setAccountMenuOpen(false);
                            handleLogout();
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-violet-50"
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

          {/* Mobile nav */}
          {mobileNavOpen && (
            <div className="md:hidden pb-3">
              <div className="grid grid-cols-2 gap-2">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-xl px-3 py-2 text-xs transition ${
                        active ? "bg-white/15" : "bg-white/10 hover:bg-white/15"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* PAYWALL overlay (402 from /api/chat) */}
      {paywallOpen && !showSignupWall && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setPaywallOpen(false)}
          />
          <div className="relative mx-4 w-full max-w-[440px]">
            <div className="rounded-3xl border border-violet-200/70 bg-white/90 backdrop-blur-md shadow-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-4 bg-[#401268] text-white">
                <div className="text-xs opacity-90">Premium required</div>
                <h3 className="mt-1 text-base font-semibold tracking-tight">
                  Your free trial has ended
                </h3>
                <p className="mt-1 text-xs text-white/85">
                  Unlock Premium to keep chatting without limits.
                </p>
              </div>

              <div className="px-5 py-4">
                <div className="rounded-2xl border border-violet-200/70 bg-white px-4 py-3 text-xs text-slate-700">
                  <div className="font-medium text-slate-900">Includes</div>
                  <ul className="mt-1 list-disc pl-4 space-y-1">
                    <li>Unlimited chat</li>
                    <li>Saved memory summary</li>
                    <li>Daily & Weekly features</li>
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

                <div className="mt-3 grid grid-cols-1 gap-2">
                  <button
                    onClick={handleUnlockClick}
                    className="w-full rounded-2xl px-4 py-2.5 text-sm font-semibold text-white bg-[#401268] hover:brightness-110 active:scale-[0.99] transition"
                  >
                    Unlock Premium
                  </button>
                  <button
                    onClick={() => setPaywallOpen(false)}
                    className="w-full rounded-2xl px-4 py-2.5 text-sm font-semibold text-[#401268] bg-white border border-violet-200 hover:bg-violet-50 active:scale-[0.99] transition"
                  >
                    Not now
                  </button>
                </div>

                <p className="mt-3 text-[10px] text-slate-500 leading-relaxed">
                  Ventfreely is a supportive AI companion, not a therapist. If you’re in
                  immediate danger, contact local emergency services.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIGNUP wall (guest after 2 min) */}
      {showSignupWall && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div className="relative mx-4 w-full max-w-[440px]">
            <div className="rounded-3xl border border-violet-200/70 bg-white/90 backdrop-blur-md shadow-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-4 bg-[#401268] text-white">
                <div className="text-xs opacity-90">Guest session ended</div>
                <h3 className="mt-1 text-base font-semibold tracking-tight">
                  Create an account to continue
                </h3>
                <p className="mt-1 text-xs text-white/85">
                  Save your chat so you don’t have to start over.
                </p>
              </div>

              <div className="px-5 py-4">
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={handleSignupClick}
                    className="w-full rounded-2xl px-4 py-2.5 text-sm font-semibold text-white bg-[#401268] hover:brightness-110 active:scale-[0.99] transition"
                  >
                    Create account
                  </button>
                  <button
                    onClick={handleLoginClick}
                    className="w-full rounded-2xl px-4 py-2.5 text-sm font-semibold text-[#401268] bg-white border border-violet-200 hover:bg-violet-50 active:scale-[0.99] transition"
                  >
                    I already have an account
                  </button>
                </div>

                <p className="mt-3 text-[10px] text-slate-500 leading-relaxed">
                  Ventfreely is a supportive AI companion, not a therapist. If you’re in
                  immediate danger, contact local emergency services.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-5 md:px-6 md:py-7">
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
          {/* Chat */}
          <section className="space-y-3">
            <div className="rounded-2xl bg-white/70 border border-violet-200/60 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-sm font-semibold text-[#2A1740]">Chat</h1>
                  <p className="mt-0.5 text-xs text-slate-700">
                    Say what’s heavy. I’ll listen and respond gently.
                  </p>
                </div>
                {showGuestTimerUI && (
                  <div className="text-[11px] text-slate-600">
                    {secondsLeft > 0 ? formattedTime : "Ended"}
                  </div>
                )}
              </div>

              {isLoggedIn && memorySummary && (
                <div className="mt-3 rounded-xl bg-white border border-violet-200/70 px-3 py-2 text-[11px] text-slate-700">
                  <div className="font-medium text-[#2A1740] mb-1">Last time:</div>
                  <p className="line-clamp-3">{memorySummary}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-slate-500">
                      Saved to help you continue.
                    </span>
                    <button
                      onClick={handleClearMemory}
                      disabled={isClearingMemory}
                      className="text-[10px] text-[#401268] hover:underline disabled:opacity-60"
                    >
                      {isClearingMemory ? "Clearing…" : "Clear"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex flex-col gap-2 max-h-[440px] min-h-[280px] overflow-y-auto rounded-2xl bg-white/70 border border-violet-200/60 px-3 py-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] px-3 py-2 rounded-2xl text-xs md:text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-[#401268] text-white rounded-br-[1.4rem]"
                        : "bg-white text-slate-900 border border-slate-200/60 rounded-bl-[1.4rem]"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {isLoadingReply && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] px-3 py-2 rounded-2xl rounded-bl-[1.4rem] bg-white border border-slate-200/60 text-slate-700 text-xs flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#401268] animate-pulse" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#A268F5] animate-pulse [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F5A5E0] animate-pulse [animation-delay:240ms]" />
                    </span>
                    <span>Thinking…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-100 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl bg-white/80 border border-violet-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#A268F5] focus:border-[#A268F5] disabled:opacity-50"
                placeholder={showSignupWall ? "Create an account to continue…" : "Type here…"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={showSignupWall || isLoadingReply}
              />
              <button
                onClick={handleSend}
                className="rounded-xl px-3.5 py-2 text-sm font-medium bg-[#401268] text-white hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!input.trim() || showSignupWall || isLoadingReply}
              >
                Send
              </button>
            </div>
          </section>

          {/* Quiet legal/safety */}
          <aside className="space-y-3">
            <div className="rounded-2xl bg-white/70 border border-violet-200/60 px-4 py-3">
              <div className="text-xs font-semibold text-[#2A1740]">Safety</div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                Ventfreely is an AI companion, not a therapist. If you’re in immediate danger
                or feel like you might hurt yourself or someone else, contact local emergency
                services or someone you trust.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
