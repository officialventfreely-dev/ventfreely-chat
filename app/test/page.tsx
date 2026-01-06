// app/test/page.tsx
"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Montserrat, Oswald, Barlow_Condensed } from "next/font/google";
import { AppTopHeader } from "@/app/components/AppTopHeader";

type Answer = 1 | 2 | 3 | 4 | 5;

const bodyFont = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const subheadingFont = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-subheading",
});

const headingFont = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
});

const QUESTIONS = [
  "My thoughts feel overwhelming or hard to switch off.",
  "I feel emotionally drained or exhausted most days.",
  "I find it hard to talk to people around me about how I feel.",
  "I feel anxious, stressed, or on edge a lot of the time.",
  "I feel like I'm carrying too much on my own.",
] as const;

const CHOICES = [
  {
    value: 1,
    emoji: "😌",
    label: "Not really",
    sub: "I feel okay",
    accent: "bg-emerald-400",
    glow: "shadow-[0_16px_45px_rgba(16,185,129,0.22)]",
    progress: "bg-emerald-300",
  },
  {
    value: 2,
    emoji: "🙂",
    label: "A little",
    sub: "A bit present",
    accent: "bg-sky-400",
    glow: "shadow-[0_16px_45px_rgba(56,189,248,0.22)]",
    progress: "bg-sky-300",
  },
  {
    value: 3,
    emoji: "😐",
    label: "Sometimes",
    sub: "In-between",
    accent: "bg-violet-400",
    glow: "shadow-[0_16px_45px_rgba(167,139,250,0.22)]",
    progress: "bg-violet-300",
  },
  {
    value: 4,
    emoji: "😟",
    label: "Quite a lot",
    sub: "It’s heavy",
    accent: "bg-fuchsia-400",
    glow: "shadow-[0_16px_45px_rgba(232,121,249,0.22)]",
    progress: "bg-fuchsia-300",
  },
  {
    value: 5,
    emoji: "😣",
    label: "Very much",
    sub: "Overwhelming",
    accent: "bg-pink-400",
    glow: "shadow-[0_16px_45px_rgba(244,114,182,0.22)]",
    progress: "bg-pink-300",
  },
] as const satisfies ReadonlyArray<{
  value: Answer;
  emoji: string;
  label: string;
  sub: string;
  accent: string;
  glow: string;
  progress: string;
}>;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

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
        style={{
          boxShadow: `inset 0 0 0 1.5px rgba(${PURPLE},${LINE_ALPHA})`,
        }}
      />
      <div
        className="pointer-events-none absolute -inset-[2px] rounded-[2rem]"
        style={{
          boxShadow: `0 0 18px rgba(${PURPLE},${GLOW_ALPHA})`,
        }}
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

export default function TestPage() {
  const [answers, setAnswers] = useState<(Answer | null)[]>(Array(QUESTIONS.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // premium: highlight next question briefly
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  // progress color based on last selection intensity
  const [progressTone, setProgressTone] = useState<Answer | null>(null);

  // Auto-scroll refs
  const questionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const submitRef = useRef<HTMLButtonElement | null>(null);

  const allAnswered = answers.every((a) => a !== null);
  const answeredCount = answers.filter((a) => a !== null).length;
  const progressPercent = Math.round((answeredCount / QUESTIONS.length) * 100);

  const progressHint = useMemo(() => {
    if (answeredCount === 0) return "Start with the first question 👇";
    if (answeredCount < QUESTIONS.length) return "Nice — keep going 👇";
    return "All set. See your results 👇";
  }, [answeredCount]);

  const progressClass = useMemo(() => {
    const tone = progressTone ?? 3;
    const match = CHOICES.find((c) => c.value === tone);
    return match?.progress ?? "bg-white/70";
  }, [progressTone]);

  const handleSelect = (qIndex: number, value: Answer) => {
    const next = [...answers];
    next[qIndex] = value;
    setAnswers(next);

    setProgressTone(value);

    requestAnimationFrame(() => {
      const nextIndex = qIndex + 1;

      if (nextIndex < QUESTIONS.length) {
        setFocusIndex(nextIndex);
        window.setTimeout(() => setFocusIndex(null), 650);

        const el = questionRefs.current[nextIndex];
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        submitRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!allAnswered) return;

    const total = answers.reduce((sum, val) => sum + (val ?? 0), 0);
    setScore(total);
    setSubmitted(true);

    requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  };

  const maxScore = QUESTIONS.length * 5;
  const percent = Math.round((score / maxScore) * 100);

  let summaryTitle = "";
  let summaryText = "";

  if (percent <= 33) {
    summaryTitle = "YOU'RE DOING OKAY";
    summaryText =
      "You might be a bit stressed, but still managing. Venting can help you stay ahead of the stress instead of letting it quietly pile up.";
  } else if (percent <= 66) {
    summaryTitle = "YOU'RE CARRYING A LOT";
    summaryText =
      "There's a noticeable emotional weight here. You don't have to hold all of this alone in your head — talking it out can help you feel less overloaded.";
  } else {
    summaryTitle = "YOU'RE UNDER PRESSURE";
    summaryText =
      "Things may feel heavy and exhausting, and that matters. You deserve support and a place to pour out what you've been holding.";
  }

  return (
    <main
      className={["min-h-screen w-full", bodyFont.variable, subheadingFont.variable, headingFont.variable].join(" ")}
      style={{ fontFamily: "var(--font-body)", color: "white" }}
    >
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: "var(--vf-bg)" }} />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#A855F7]/20 blur-[120px]" />
      </div>

      {/* ✅ Unified header */}
      <AppTopHeader active="test" />

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <section className="mx-auto max-w-xl text-center">
          <GlowCard>
            <div className="px-6 py-10 md:px-8">
              <div className="flex flex-col items-center gap-2">
                <Eyebrow>FAST CHECK-IN</Eyebrow>
                <h1
                  className="text-4xl font-semibold md:text-5xl"
                  style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}
                >
                  Quick mental check
                </h1>
                <p className="mx-auto mt-1 max-w-md text-[14px] leading-relaxed text-white/80">
                  Answer a few simple questions. No diagnosis — just clarity.
                </p>

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Pill>🕊 gentle tone</Pill>
                  <Pill>⏱ ~1 minute</Pill>
                  <Pill>🙈 private</Pill>
                </div>
              </div>

              {/* Progress */}
              <div className="mx-auto mt-7 max-w-xl text-left">
                <div className="flex items-center justify-between text-[12px] text-white/70">
                  <span style={{ fontFamily: "var(--font-subheading)" }}>Progress</span>
                  <span className="text-white/70">
                    {answeredCount}/{QUESTIONS.length} ({progressPercent}%)
                  </span>
                </div>

                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={["h-full rounded-full transition-all duration-500", progressClass].join(" ")}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <p className="mt-2 text-[12px] text-white/60">{progressHint}</p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-7 text-left">
                {QUESTIONS.map((q, index) => {
                  const isFocus = focusIndex === index;

                  return (
                    <GlowCard key={index} className="!rounded-[2rem]">
                      <div
                        ref={(el) => {
                          questionRefs.current[index] = el;
                        }}
                        className={[
                          "p-4 md:p-5 scroll-mt-24 transition",
                          isFocus
                            ? "ring-1 ring-white/20 shadow-[0_18px_50px_rgba(255,255,255,0.08)] animate-[pulse_0.7s_ease-in-out_1]"
                            : "",
                        ].join(" ")}
                      >
                        <p className="text-[14px] text-white/90">
                          <span className="mr-2 inline-block text-white/60" style={{ fontFamily: "var(--font-subheading)" }}>
                            {index + 1}.
                          </span>
                          {q}
                        </p>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
                          {CHOICES.map(({ value, emoji, label, sub, accent, glow }) => {
                            const selected = answers[index] === value;
                            const depth = clamp(8 + value * 2, 10, 18);

                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => handleSelect(index, value)}
                                aria-pressed={selected}
                                className={[
                                  "group relative overflow-hidden rounded-2xl border p-3 text-left transition-all",
                                  "focus:outline-none focus:ring-2 focus:ring-white/30",
                                  "active:scale-[0.99]",
                                  selected
                                    ? `border-white/50 bg-white/10 ${glow}`
                                    : "border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30",
                                ].join(" ")}
                                style={{
                                  fontFamily: "var(--font-subheading)",
                                  boxShadow: selected ? undefined : `0 ${depth}px ${depth * 2}px rgba(0,0,0,0.18)`,
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-2xl leading-none">{emoji}</span>
                                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] text-white/80">
                                    {value}
                                  </span>
                                </div>

                                <div className="mt-2">
                                  <div className="text-[13px] font-semibold text-white">{label}</div>
                                  <div className="text-[11px] text-white/60">{sub}</div>
                                </div>

                                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className={[
                                      "h-full rounded-full transition-all duration-300",
                                      accent,
                                      selected ? "opacity-100" : "opacity-70",
                                    ].join(" ")}
                                    style={{ width: `${value * 20}%` }}
                                  />
                                </div>

                                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center pb-2 opacity-0 transition group-hover:opacity-100 sm:hidden">
                                  <span className="text-[10px] text-white/60">tap to select</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-4 h-px bg-white/10" />
                      </div>
                    </GlowCard>
                  );
                })}

                {!allAnswered && (
                  <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[12px] text-white/90">
                    Please answer all questions before continuing.
                  </div>
                )}

                {/* Main CTA */}
                <button
                  ref={submitRef}
                  type="submit"
                  disabled={!allAnswered}
                  className={[
                    "mt-2 inline-flex w-full items-center justify-center rounded-full px-6 py-4",
                    "bg-white text-[var(--vf-ink)] transition",
                    "hover:brightness-95 active:scale-[0.99]",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                  ].join(" ")}
                  style={{
                    fontFamily: "var(--font-subheading)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  See results
                </button>
              </form>

              {/* Result */}
              {submitted && (
                <div className="mx-auto mt-10 max-w-xl text-center">
                  <p className="text-[12px] text-white/60">
                    Your score: <strong className="text-white">{score}</strong> / {maxScore} ({percent}%)
                  </p>

                  <h2
                    className="mt-3 text-4xl font-semibold md:text-5xl"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {summaryTitle}
                  </h2>

                  <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-white/85">{summaryText}</p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                    <Link
                      href="/chat"
                      className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[var(--vf-ink)] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
                      style={{
                        fontFamily: "var(--font-subheading)",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      Continue to chat
                    </Link>

                    <Link
                      href="/daily"
                      className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-4 text-white transition hover:bg-white/15 active:scale-[0.99] sm:w-auto"
                      style={{
                        fontFamily: "var(--font-subheading)",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      Try Daily
                    </Link>
                  </div>

                  <p className="mt-4 text-[11px] text-white/50">
                    This check-in is not a diagnosis — it’s a quick reflection tool.
                  </p>
                </div>
              )}
            </div>
          </GlowCard>
        </section>
      </div>
    </main>
  );
}
