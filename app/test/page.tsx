// app/test/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

type Answer = 1 | 2 | 3 | 4 | 5;

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

  let summaryTitle = "";
  let summaryText = "";

  if (percent <= 33) {
    summaryTitle = "You might be a bit stressed, but still managing.";
    summaryText =
      "Your answers suggest that things are not completely overwhelming right now, but there are still feelings worth paying attention to. Venting can help you stay ahead of the stress instead of letting it quietly pile up.";
  } else if (percent <= 66) {
    summaryTitle = "You’re carrying quite a lot emotionally.";
    summaryText =
      "There’s a noticeable emotional weight here. You don’t have to hold all of this alone in your head. Having a calm space to talk through it – even with an AI – can help you feel less overloaded.";
  } else {
    summaryTitle = "You might be under intense emotional pressure right now.";
    summaryText =
      "Things may feel very heavy and exhausting, and that matters. You deserve support and a place to pour out everything you’ve been holding. Ventfreely can be one soft, low-pressure place to start doing that.";
  }

  return (
    <main className="min-h-screen w-full bg-[#FAF8FF] text-slate-900">
      {/* Header */}
      <header className="w-full bg-[#401268] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2">
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
                Quick emotional check-in
              </span>
            </div>
          </Link>
          <span className="text-[11px] text-violet-100/90">
            Takes about 1–2 minutes
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
        <section className="max-w-xl mx-auto space-y-6">
          {/* Intro */}
          <div className="space-y-2 border-b border-violet-200/40 pb-4">
            <h1 className="text-base md:text-lg font-semibold tracking-tight text-[#2A1740]">
              Before you start chatting, let&apos;s check in with how you are.
            </h1>
            <p className="text-xs md:text-sm text-slate-700">
              For each statement, choose a number from <strong>1 to 5</strong>:
            </p>
            <ul className="list-disc pl-4 text-[11px] text-slate-700 space-y-0.5">
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
            <p className="text-[11px] text-slate-500">
              There are no right or wrong answers. Just choose what feels most
              honest for you right now.
            </p>
          </div>

          {/* Questions */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {QUESTIONS.map((q, index) => (
              <div
                key={index}
                className="space-y-2 border-b border-violet-100/50 pb-4 last:border-b-0"
              >
                <p className="text-xs md:text-sm text-slate-800">
                  <span className="mr-1 text-[11px] text-[#401268] font-semibold">
                    Q{index + 1}.
                  </span>
                  {q}
                </p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const selected = answers[index] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleSelect(index, value as Answer)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-medium transition ${
                          selected
                            ? "bg-[#401268] text-white border-[#401268]"
                            : "bg-transparent text-slate-700 border-violet-200 hover:bg-white/60"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                  <span className="ml-1 text-[11px] text-slate-500">
                    1 = not at all · 5 = absolutely
                  </span>
                </div>
              </div>
            ))}

            {!allAnswered && (
              <p className="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-100 rounded-full px-3 py-2">
                Please answer all questions before continuing.
              </p>
            )}

            {/* Actions */}
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={!allAnswered}
                className="inline-flex w-full items-center justify-center rounded-full bg-[#401268] px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-[#401268]/30 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed sm:flex-1"
              >
                See my result
              </button>
              <Link
                href="/chat"
                className="inline-flex w-full items-center justify-center rounded-full border border-[#401268]/20 bg-white/60 px-4 py-3 text-xs font-medium text-[#401268] hover:bg-white transition sm:flex-1"
              >
                Skip test – go to chat
              </Link>
            </div>
          </form>

          {/* Result */}
          {submitted && (
            <div className="pt-4 mt-2 border-t border-violet-200/50 space-y-3 text-xs md:text-sm text-slate-700">
              <p className="text-[11px] text-slate-500">
                Your score: <strong>{score}</strong> / {maxScore} ({percent}
                %)
              </p>
              <p className="font-semibold text-[#2A1740]">{summaryTitle}</p>
              <p>{summaryText}</p>
              <Link
                href="/chat"
                className="inline-flex items-center justify-center rounded-full bg-[#401268] px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-[#401268]/30 hover:brightness-110 active:scale-[0.98] transition"
              >
                Continue to chat
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
