"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabaseBrowser";
import { AppTopHeader } from "@/app/components/AppTopHeader";

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

/**
 * GlowCard – sama “ere lilla outline + glow outside” vibe nagu Home/Daily/Weekly.
 */
const PURPLE = "168,85,247"; // #A855F7
const LINE_ALPHA = 0.85;
const GLOW_ALPHA = 0.35;
const SOFT_GLOW_ALPHA = 0.18;

function GlowCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="pointer-events-none absolute -inset-[10px] rounded-[2rem] blur-2xl"
        style={{
          background: `radial-gradient(closest-side, rgba(${PURPLE},${SOFT_GLOW_ALPHA}), transparent 62%)`,
          opacity: 1,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-[2rem]"
        style={{ boxShadow: `inset 0 0 0 1.5px rgba(${PURPLE},${LINE_ALPHA})` }}
      />
      <div
        className="pointer-events-none absolute -inset-[2px] rounded-[2rem]"
        style={{ boxShadow: `0 0 18px rgba(${PURPLE},${GLOW_ALPHA})` }}
      />

      <div className="relative rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur">
        <div
          className="pointer-events-none absolute inset-0 rounded-[2rem]"
          style={{
            background:
              "linear-gradient(135deg, rgba(64,18,104,0.22) 0%, rgba(11,22,52,0.00) 50%, rgba(99,102,241,0.10) 100%)",
          }}
        />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[12px] text-white/60"
      style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.10em" }}
    >
      {children}
    </p>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] text-white/80">
      {children}
    </span>
  );
}

/** Inline icons (no packages) */
function IconSparkle(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"} fill="none" aria-hidden="true">
      <path
        d="M12 2l1.2 5.1L18 9l-4.8 1.9L12 16l-1.2-5.1L6 9l4.8-1.9L12 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 13.5l.6 2.4 2.4.6-2.4.6-.6 2.4-.6-2.4-2.4-.6 2.4-.6.6-2.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLock(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"} fill="none" aria-hidden="true">
      <path
        d="M7.5 10V8.2A4.5 4.5 0 0 1 12 3.7 4.5 4.5 0 0 1 16.5 8.2V10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M7 10h10a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClock(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"} fill="none" aria-hidden="true">
      <path
        d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ChatPage() {
  const router = useRouter();

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

  const isLoggedIn = !!userEmail;
  const showGuestTimerUI = !isLoggedIn && !hasActiveSubscription;
  const showSignupWall = showGuestTimerUI && secondsLeft <= 0;

  const formattedTime = `${Math.floor(secondsLeft / 60)
    .toString()
    .padStart(1, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`;

  const badge = useMemo(() => {
    if (hasActiveSubscription) return { icon: <IconSparkle className="h-4 w-4" />, text: "Premium" };
    if (isLoggedIn) return { icon: <IconLock className="h-4 w-4" />, text: "Logged in" };
    return { icon: <IconClock className="h-4 w-4" />, text: "Guest" };
  }, [hasActiveSubscription, isLoggedIn]);

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

        // Check subscriptions (kept as-is)
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
      <main className="min-h-screen w-full">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0" style={{ background: "var(--vf-bg)" }} />
          <div className="pointer-events-none absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#A855F7]/20 blur-[120px]" />
        </div>
        <div className="min-h-screen flex items-center justify-center px-4">
          <GlowCard className="w-full max-w-md">
            <div className="p-5 text-left">
              <Eyebrow>CHECKING</Eyebrow>
              <p className="mt-2 text-[14px] text-white/85">Checking your account…</p>
            </div>
          </GlowCard>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: "var(--vf-bg)" }} />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#A855F7]/20 blur-[120px]" />
      </div>

      {/* Unified header */}
      <AppTopHeader active="chat" />

      {/* PAYWALL overlay (402 from /api/chat) */}
      {paywallOpen && !showSignupWall && (
        <OverlayCard
          eyebrow="✨ PREMIUM REQUIRED"
          title="Your free trial has ended"
          text="Unlock Premium to keep chatting without limits."
          footnote={
            paywallAccess?.trialEndsAt
              ? `Trial ended: ${new Date(paywallAccess.trialEndsAt).toLocaleString()}`
              : null
          }
          primaryText="Unlock Premium"
          primaryOnClick={handleUnlockClick}
          secondaryText="Not now"
          secondaryOnClick={() => setPaywallOpen(false)}
          bullets={["Unlimited chat", "Saved memory summary", "Daily & Weekly features"]}
        />
      )}

      {/* SIGNUP wall (guest after 2 min) */}
      {showSignupWall && (
        <OverlayCard
          eyebrow="⏳ GUEST SESSION ENDED"
          title="Create an account to continue"
          text="Save your chat so you don’t have to start over."
          primaryText="Create account"
          primaryOnClick={handleSignupClick}
          secondaryText="I already have an account"
          secondaryOnClick={handleLoginClick}
        />
      )}

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
          {/* Chat */}
          <section className="space-y-4">
            {/* Header card */}
            <GlowCard>
              <div className="p-5 md:p-6 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Eyebrow>CHAT</Eyebrow>
                    <h1
                      className="mt-2 text-[20px] font-semibold text-white/95"
                      style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}
                    >
                      Say what’s heavy.
                    </h1>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/75">
                      I’ll listen and respond gently.
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {showGuestTimerUI ? (
                      <Pill>
                        <IconClock className="h-4 w-4" />
                        Free: {secondsLeft > 0 ? formattedTime : "Ended"}
                      </Pill>
                    ) : (
                      <Pill>
                        {badge.icon}
                        {badge.text}
                      </Pill>
                    )}
                  </div>
                </div>

                {/* memory */}
                {isLoggedIn && memorySummary ? (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] text-white/55">Last time</p>
                    <p className="mt-2 text-[12px] leading-relaxed text-white/85 line-clamp-4">
                      {memorySummary}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-white/50">Saved to help you continue.</span>

                      <button
                        onClick={handleClearMemory}
                        disabled={isClearingMemory}
                        className="text-[11px] text-white/70 hover:text-white disabled:opacity-60"
                      >
                        {isClearingMemory ? "Clearing…" : "Clear"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* quick account actions */}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {isLoggedIn ? (
                      <>
                        <Pill>👤 {userEmail}</Pill>
                        {hasActiveSubscription ? (
                          <Pill>
                            <IconSparkle className="h-4 w-4" />
                            Premium
                          </Pill>
                        ) : (
                          <Pill>🫧 Trial/Free</Pill>
                        )}
                      </>
                    ) : (
                      <Pill>🙈 Guest</Pill>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {isLoggedIn ? (
                      <>
                        <button
                          onClick={() => router.push("/account")}
                          className="text-[12px] text-white/60 hover:text-white/80"
                        >
                          Account →
                        </button>
                        <button
                          onClick={handleLogout}
                          className="text-[12px] text-white/60 hover:text-white/80"
                        >
                          Log out
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleLoginClick}
                          className="text-[12px] text-white/60 hover:text-white/80"
                        >
                          Log in →
                        </button>
                        <button
                          onClick={handleSignupClick}
                          className="text-[12px] text-white/60 hover:text-white/80"
                        >
                          Create account
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* Messages */}
            <GlowCard>
              <div className="p-3 md:p-4">
                <div className="flex flex-col gap-2 max-h-[520px] min-h-[340px] overflow-y-auto rounded-[1.5rem] border border-white/10 bg-black/10 px-3 py-3">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={[
                          "max-w-[82%] px-3 py-2 text-[12px] md:text-[13px] leading-relaxed",
                          "rounded-2xl shadow-[0_14px_30px_rgba(0,0,0,0.22)]",
                          m.role === "user"
                            ? "bg-white text-[var(--vf-ink)] rounded-br-[1.4rem]"
                            : "bg-white/10 text-white border border-white/15 rounded-bl-[1.4rem]",
                        ].join(" ")}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}

                  {isLoadingReply && (
                    <div className="flex justify-start">
                      <div className="max-w-[70%] px-3 py-2 rounded-2xl rounded-bl-[1.4rem] bg-white/10 border border-white/15 text-white/80 text-[12px] flex items-center gap-2">
                        <span className="flex gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse" />
                          <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse [animation-delay:120ms]" />
                          <span className="h-1.5 w-1.5 rounded-full bg-white/40 animate-pulse [animation-delay:240ms]" />
                        </span>
                        <span>Thinking…</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </GlowCard>

            {/* Error */}
            {error ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left">
                <p className="text-[12px] text-white/85">⚠️ {error}</p>
              </div>
            ) : null}

            {/* Input */}
            <GlowCard>
              <div className="p-4 md:p-5">
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-full bg-white/10 border border-white/15 px-4 py-3 text-[13px] text-white outline-none placeholder:text-white/35 focus:ring-2 focus:ring-white/20 focus:border-white/25 disabled:opacity-50"
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
                    className="rounded-full px-6 py-3 text-[var(--vf-ink)] bg-white hover:brightness-95 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      fontFamily: "var(--font-subheading)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                    disabled={!input.trim() || showSignupWall || isLoadingReply}
                  >
                    Send
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <Link href="/daily" className="text-[12px] text-white/60 hover:text-white/80">
                    Daily →
                  </Link>
                  <span className="text-[11px] text-white/45">No judgement. No pressure.</span>
                </div>
              </div>
            </GlowCard>
          </section>

          {/* Safety */}
          <aside className="space-y-4">
            <GlowCard>
              <div className="p-5 md:p-6 text-left">
                <Eyebrow>SAFETY</Eyebrow>
                <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                  Ventfreely is an AI companion, not a therapist. If you’re in immediate danger
                  or feel like you might hurt yourself or someone else, contact local emergency
                  services or someone you trust.
                </p>
              </div>
            </GlowCard>

            <GlowCard>
              <div className="p-5 md:p-6 text-left">
                <Eyebrow>QUICK LINKS</Eyebrow>
                <div className="mt-3 flex flex-col gap-2 text-[12px] text-white/70">
                  <Link href="/weekly" className="hover:text-white/85">
                    Weekly →
                  </Link>
                  <Link href="/insights" className="hover:text-white/85">
                    Insights →
                  </Link>
                  <Link href="/test" className="hover:text-white/85">
                    Quick test →
                  </Link>
                </div>
              </div>
            </GlowCard>
          </aside>
        </div>
      </div>
    </main>
  );
}

function OverlayCard({
  eyebrow,
  title,
  text,
  bullets,
  footnote,
  primaryText,
  primaryOnClick,
  secondaryText,
  secondaryOnClick,
}: {
  eyebrow: string;
  title: string;
  text: string;
  bullets?: string[];
  footnote?: string | null;
  primaryText: string;
  primaryOnClick: () => void;
  secondaryText: string;
  secondaryOnClick: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={secondaryOnClick} />
      <div className="relative w-full max-w-[480px]">
        <GlowCard>
          <div className="p-5 md:p-6 text-left">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h3
              className="mt-2 text-[18px] font-semibold text-white/95"
              style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}
            >
              {title}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/75">{text}</p>

            {bullets?.length ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[12px] text-white/80 font-semibold">Includes</p>
                <ul className="mt-2 list-disc pl-5 text-[12px] text-white/75 space-y-1">
                  {bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                {footnote ? <p className="mt-3 text-[11px] text-white/55">{footnote}</p> : null}
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-1 gap-2">
              <button
                onClick={primaryOnClick}
                className="w-full rounded-full bg-white px-6 py-3 text-[var(--vf-ink)] transition hover:brightness-95 active:scale-[0.99]"
                style={{
                  fontFamily: "var(--font-subheading)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {primaryText}
              </button>

              <button
                onClick={secondaryOnClick}
                className="w-full rounded-full border border-white/20 bg-white/10 px-6 py-3 text-white transition hover:bg-white/15 active:scale-[0.99]"
                style={{
                  fontFamily: "var(--font-subheading)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {secondaryText}
              </button>
            </div>

            <p className="mt-4 text-[10px] text-white/50 leading-relaxed">
              Ventfreely is a supportive AI companion, not a therapist. If you’re in immediate danger, contact local
              emergency services.
            </p>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}
