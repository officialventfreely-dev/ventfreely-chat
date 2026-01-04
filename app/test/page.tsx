// app/test/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Montserrat, Oswald, Barlow_Condensed } from "next/font/google";

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
  "I feel like I’m carrying too much on my own.",
];

export default function TestPage() {
  const [answers, setAnswers] = useState<(Answer | null)[]>(
    Array(QUESTIONS.length).fill(null)
  );
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const allAnswered = answers.every((a) => a !== null);

  const handleSelect = (qIndex: number, value: Answer) => {
    const next = [...answers];
    next[qIndex] = value;
    setAnswers(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAnswered) return;

    const total = answers.reduce((sum, val) => sum + (val ?? 0), 0);
    setScore(total);
    setSubmitted(true);
  };

  const maxScore = QUESTIONS.length * 5;
  const percent = Math.round((score / maxScore) * 100);

  const { summaryTitle, summaryText } = useMemo(() => {
    let title = "";
    let text = "";

    if (percent <= 33) {
      title = "You might be a bit stressed, but still managing.";
      text =
        "Your answers suggest that things are not completely overwhelming right now, but there are still feelings worth paying attention to. Venting can help you stay ahead of the stress instead of letting it quietly pile up.";
    } else if (percent <= 66) {
      title = "You’re carrying quite a lot emotionally.";
      text =
        "There’s a noticeable emotional weight here. You don’t have to hold all of this alone in your head. Having a calm space to talk through it – even with an AI – can help you feel less overloaded.";
    } else {
      title = "You might be under intense emotional pressure right now.";
      text =
        "Things may feel very heavy and exhausting, and that matters. You deserve support and a place to pour out everything you’ve been holding. Ventfreely can be one soft, low-pressure place to start doing that.";
    }

    return { summaryTitle: title, summaryText: text };
  }, [percent]);

  return (
    <main
      className={[
        "min-h-screen w-full text-white",
        "bg-[#0C1836]",
        bodyFont.variable,
        subheadingFont.variable,
        headingFont.variable,
      ].join(" ")}
      style={{
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Subtle background glow */}
      <div
        className="pointer-events-none fixed inset-0 opacity-80"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#401268]/25 blur-3xl" />
        <div className="absolute bottom-[-240px] right-[-180px] h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 w-full border-b border-white/10 bg-[#401268]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/15 transition group-hover:bg-white/20">
              <span
                className="text-xs font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                VF
              </span>
            </div>

            <div className="flex flex-col leading-tight">
              <span
                className="text-[15px] font-semibold tracking-tight text-white"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Ventfreely
              </span>
              <span
                className="text-[11px] text-white/80"
                style={{ fontFamily: "var(--font-subheading)" }}
              >
                Quick emotional check-in
              </span>
            </div>
          </Link>

          <span className="hidden text-[11px] text-white/85 sm:inline">
            Takes about 1–2 minutes
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="relative mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        <section className="mx-auto max-w-xl space-y-6">
          {/* Card */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur md:p-6">
            {/* Intro */}
            <div className="space-y-3 border-b border-white/10 pb-5">
              <h1
                className="text-xl font-semibold tracking-tight text-white md:text-2xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Before you start chatting, let&apos;s check in with how you are.
              </h1>

              <p className="text-sm text-white/80">
                For each statement, choose a number from{" "}
                <strong className="text-white">1 to 5</strong>.
              </p>

              <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/10 p-4">
                <p
                  className="text-[12px] uppercase tracking-wide text-white/70"
                  style={{ fontFamily: "var(--font-subheading)" }}
                >
                  How to answer
                </p>
                <ul className="space-y-1 text-[13px] text-white/80">
                  <li>
                    <span className="font-semibold text-white">1</span> = Not at
                    all true for me.
                  </li>
                  <li>
                    <span className="font-semibold text-white">3</span> =
                    Somewhat true / in the middle.
                  </li>
                  <li>
                    <span className="font-semibold text-white">5</span> =
                    Absolutely true for me.
                  </li>
                </ul>
                <p className="text-[12px] text-white/60">
                  No right or wrong answers — just what feels honest right now.
                </p>
              </div>
            </div>

            {/* Questions */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              {QUESTIONS.map((q, index) => (
                <div
                  key={index}
                  className="space-y-2 border-b border-white/10 pb-5 last:border-b-0 last:pb-0"
                >
                  <p className="text-sm text-white/90">
                    <span
                      className="mr-2 inline-flex items-center gap-2"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[12px] text-white/90 ring-1 ring-white/10">
                        Q{index + 1}
                      </span>
                    </span>
                    {q}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {[1, 2, 3, 4, 5].map((value) => {
                      const selected = answers[index] === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleSelect(index, value as Answer)}
                          className={[
                            "group flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition",
                            "active:scale-[0.98]",
                            selected
                              ? "border-[#401268] bg-[#401268] text-white shadow-[0_8px_20px_rgba(64,18,104,0.35)]"
                              : "border-white/15 bg-white/5 text-white/85 hover:bg-white/10 hover:border-white/25",
                          ].join(" ")}
                          style={{ fontFamily: "var(--font-heading)" }}
                          aria-pressed={selected}
                        >
                          {value}
                        </button>
                      );
                    })}

                    <span className="ml-1 text-[12px] text-white/55">
                      1 = not at all · 5 = absolutely
                    </span>
                  </div>
                </div>
              ))}

              {!allAnswered && (
                <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-[12px] text-amber-100">
                  Please answer all questions before continuing.
                </div>
              )}

              {/* Actions */}
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={!allAnswered}
                  className={[
                    "inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white transition",
                    "shadow-[0_10px_25px_rgba(64,18,104,0.35)]",
                    "bg-[#401268] hover:brightness-110 active:scale-[0.98]",
                    "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 disabled:active:scale-100",
                  ].join(" ")}
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  See my result
                </button>

                <Link
                  href="/chat"
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-[13px] font-medium text-white/85 transition hover:bg-white/10 hover:border-white/25 sm:flex-1"
                  style={{ fontFamily: "var(--font-subheading)" }}
                >
                  Skip test – go to chat
                </Link>
              </div>

              {/* Result */}
              {submitted && (
                <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-white/80">
                  <p className="text-[12px] text-white/55">
                    Your score: <strong className="text-white">{score}</strong>{" "}
                    / {maxScore} ({percent}%)
                  </p>

                  <p
                    className="text-lg font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {summaryTitle}
                  </p>

                  <p className="text-sm text-white/80">{summaryText}</p>

                  <Link
                    href="/chat"
                    className="inline-flex w-full items-center justify-center rounded-full bg-[#401268] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] sm:w-auto"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Continue to chat
                  </Link>
                </div>
              )}
            </form>
          </div>

          {/* Tiny footer note */}
          <p className="text-center text-[11px] text-white/45">
            This check-in is not a diagnosis — it’s a quick reflection tool.
          </p>
        </section>
      </div>
    </main>
  );
}
