// app/test/page.tsx
"use client";

import { useState, type FormEvent } from "react";
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
  "I feel like I'm carrying too much on my own.",
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!allAnswered) return;

    const total = answers.reduce((sum, val) => sum + (val ?? 0), 0);
    setScore(total);
    setSubmitted(true);
  };

  const maxScore = QUESTIONS.length * 5;
  const percent = Math.round((score / maxScore) * 100);

  // ✅ Safe summary logic (no useMemo = no parser headaches)
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
      className={[
        "min-h-screen w-full",
        bodyFont.variable,
        subheadingFont.variable,
        headingFont.variable,
      ].join(" ")}
      style={{ fontFamily: "var(--font-body)", color: "white" }}
    >
      {/* Background like your screenshots */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 500px at 50% 0%, rgba(255,255,255,0.08), transparent 60%), linear-gradient(180deg, #0B1634 0%, #07102A 55%, #061027 100%)",
          }}
        />
      </div>

      {/* Purple top bar */}
      <header className="w-full bg-[#401268]">
        <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-4">
          <Link href="/" className="text-center">
            <span
              className="block text-[22px] leading-none"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              VF
            </span>
            <span className="text-[11px] text-white/85">VentFreely</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <section className="mx-auto max-w-xl text-center">
          <h1
            className="text-5xl font-semibold md:text-6xl"
            style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}
          >
            TAKE MENTAL HEALTH TEST
          </h1>

          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
            Answer a few quick questions so we understand what you're going through
            right now.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6 text-left">
            {QUESTIONS.map((q, index) => (
              <div key={index} className="space-y-2">
                <p className="text-[14px] text-white/90">
                  <span
                    className="mr-2 inline-block text-white/70"
                    style={{ fontFamily: "var(--font-subheading)" }}
                  >
                    {index + 1}.
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
                          "h-10 w-10 rounded-full border text-sm font-semibold transition",
                          "active:scale-[0.98]",
                          selected
                            ? "bg-white text-[#0B1634] border-white shadow-[0_14px_30px_rgba(0,0,0,0.28)]"
                            : "bg-white/10 text-white border-white/20 hover:bg-white/15",
                        ].join(" ")}
                        style={{ fontFamily: "var(--font-heading)" }}
                        aria-pressed={selected}
                      >
                        {value}
                      </button>
                    );
                  })}
                  <span className="ml-2 text-[12px] text-white/55">
                    1 = not at all · 5 = absolutely
                  </span>
                </div>

                <div className="h-px bg-white/10" />
              </div>
            ))}

            {!allAnswered && (
              <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[12px] text-white/90">
                Please answer all questions before continuing.
              </div>
            )}

            {/* Main CTA (white pill) */}
            <button
              type="submit"
              disabled={!allAnswered}
              className={[
                "mt-4 inline-flex w-full items-center justify-center rounded-full px-6 py-4",
                "bg-white text-[#0B1634] transition",
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
                Your score: <strong className="text-white">{score}</strong> /{" "}
                {maxScore} ({percent}%)
              </p>

              <h2
                className="mt-3 text-4xl font-semibold md:text-5xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {summaryTitle}
              </h2>

              <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-white/85">
                {summaryText}
              </p>

              <Link
                href="/chat"
                className="mx-auto mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
                style={{
                  fontFamily: "var(--font-subheading)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Continue to chat
              </Link>

              <p className="mt-4 text-[11px] text-white/50">
                This check-in is not a diagnosis — it's a quick reflection tool.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
