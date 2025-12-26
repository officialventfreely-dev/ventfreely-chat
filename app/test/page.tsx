// app/test/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

type Answer = 1 | 2 | 3 | 4 | 5;

const QUESTIONS = [
  "My thoughts feel overwhelming or hard to control.",
  "I feel emotionally drained or exhausted.",
  "I find it hard to talk to people around me about how I feel.",
  "I feel anxious, stressed, or on edge most of the time.",
  "I feel like I’m carrying everything alone.",
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

  let summaryTitle = "";
  let summaryText = "";

  if (percent <= 33) {
    summaryTitle = "You might be a bit stressed, but still managing.";
    summaryText =
      "Your answers suggest that things are not completely overwhelming right now, but there are still some feelings worth talking about. Chatting with Ventfreely can help you process them before they build up.";
  } else if (percent <= 66) {
    summaryTitle = "You’re carrying quite a lot emotionally.";
    summaryText =
      "You’re dealing with a noticeable amount of stress and emotional weight. You don’t have to hold all of this in your head alone. Ventfreely can be a safe place to unpack it slowly, at your own pace.";
  } else {
    summaryTitle = "You might be under intense emotional pressure right now.";
    summaryText =
      "Your answers suggest that things may feel heavy and overwhelming. You deserve support and a place to put all of these thoughts. Ventfreely can be a calm space to start letting it out, one message at a time.";
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-950 via-slate-950 to-slate-950 text-slate-50">
      {/* Header (same vibe as homepage) */}
      <header className="w-full border-b border-violet-700/40 bg-gradient-to-r from-violet-800 via-fuchsia-700 to-violet-900/90 shadow-lg shadow-violet-900/40">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-fuchsia-300/20 border border-fuchsia-200/60">
              <span className="text-xs font-semibold tracking-tight text-fuchsia-50">
                VF
              </span>
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Ventfreely
            </span>
          </Link>

          <span className="text-[11px] text-pink-100/90">
            Quick emotional check-in
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-4xl flex-col px-4 py-8 md:px-6 md:py-10">
        <section className="mx-auto w-full max-w-2xl rounded-3xl border border-pink-200/40 bg-pink-50/5 p-5 shadow-xl shadow-violet-950/60 backdrop-blur-xl">
          {/* Instructions */}
          <div className="mb-5 space-y-2">
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">
              Before you start chatting, let&apos;s check in with you.
            </h1>
            <p className="text-sm text-pink-100/95">
              Please rate each statement on a scale from{" "}
              <strong>1 to 5</strong>:
            </p>
            <ul className="list-disc pl-5 text-xs text-pink-100/90">
              <li>
                <strong>1</strong> = Not at all true for me.
              </li>
              <li>
                <strong>3</strong> = Somewhat true / in the middle.
              </li>
              <li>
                <strong>5</strong> = Absolutely true for me.
              </li>
            </ul>
            <p className="text-[11px] text-pink-100/80">
              There are no right or wrong answers. Just choose what feels most
              honest for you right now.
            </p>
          </div>

          {/* Questions form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {QUESTIONS.map((q, index) => (
              <div
                key={index}
                className="rounded-2xl border border-pink-200/40 bg-pink-50/10 p-3"
              >
                <p className="mb-2 text-sm text-pink-50/95">
                  <span className="mr-1 text-xs text-pink-200/90">
                    Q{index + 1}.
                  </span>
                  {q}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const selected = answers[index] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleSelect(index, value as Answer)}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition ${
                          selected
                            ? "bg-pink-300 text-violet-950 border-pink-100 shadow shadow-pink-500/50"
                            : "bg-pink-50/5 text-pink-50 border-pink-200/60 hover:bg-pink-50/20"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                  <span className="ml-1 text-[11px] text-pink-100/80">
                    1 = not at all · 5 = absolutely
                  </span>
                </div>
              </div>
            ))}

            {!allAnswered && (
              <p className="text-[11px] text-amber-200/90">
                Please answer all questions before continuing.
              </p>
            )}

            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={!allAnswered}
                className="inline-flex items-center justify-center rounded-xl bg-pink-200 px-4 py-2 text-sm font-semibold text-violet-900 shadow shadow-pink-400/40 hover:bg-pink-100 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                See my result
              </button>
              <Link
                href="/chat"
                className="inline-flex items-center justify-center rounded-xl border border-pink-200/60 bg-pink-50/10 px-4 py-2 text-xs font-medium text-pink-100 hover:bg-pink-50/20 transition"
              >
                Skip test – start chatting
              </Link>
            </div>
          </form>

          {/* Result */}
          {submitted && (
            <div className="mt-6 rounded-2xl border border-pink-200/50 bg-pink-50/15 p-4 text-sm text-pink-50/95">
              <p className="text-xs text-pink-200/90 mb-1">
                Your score: {score} / {maxScore} ({percent}%)
              </p>
              <p className="mb-2 font-semibold">{summaryTitle}</p>
              <p className="mb-3 text-xs text-pink-100/85">{summaryText}</p>

              <Link
                href="/chat"
                className="inline-flex items-center justify-center rounded-xl bg-pink-200 px-4 py-2 text-xs font-semibold text-violet-900 shadow shadow-pink-400/40 hover:bg-pink-100 active:scale-[0.98] transition"
              >
                Go to chat
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
