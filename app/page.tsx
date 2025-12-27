// app/page.tsx
"use client";

import Link from "next/link";

export default function HomePage() {
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
              Online
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10 space-y-10">
        {/* Hero */}
        <section className="space-y-4 pt-2 border-b border-violet-200/40 pb-8">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#2A1740]">
            You&apos;re not alone with your thoughts.
          </h1>
          <p className="text-sm md:text-base text-slate-700 max-w-2xl">
            Ventfreely is a calm, anonymous place to say what&apos;s really on
            your mind – without worrying how it sounds. No judgment. No
            pressure. Just a gentle AI companion listening to you.
          </p>

          <div className="flex flex-col gap-2 mt-2 sm:flex-row sm:items-center">
            <Link
              href="/test"
              className="inline-flex w-full items-center justify-center rounded-full bg-[#401268] px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-[#401268]/30 hover:brightness-110 active:scale-[0.98] transition sm:w-auto"
            >
              Take a quick emotional test
            </Link>
            <Link
              href="/chat"
              className="inline-flex w-full items-center justify-center rounded-full border border-[#401268]/20 bg-white/40 px-5 py-3 text-sm font-medium text-[#401268] hover:bg-white/70 transition sm:w-auto"
            >
              Skip test – start chatting
            </Link>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1">
              <span>⏱</span>
              <span>Starts in under a minute</span>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1">
              <span>🫶</span>
              <span>No real name needed</span>
            </div>
          </div>
        </section>

        {/* Preview */}
        <section className="space-y-3 border-b border-violet-200/40 pb-8">
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
              Example conversation
            </span>
            <span>Anonymous · not real data</span>
          </div>

          <div className="space-y-2 text-[11px] leading-relaxed">
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-[1.6rem] bg-white/80 px-3 py-2 text-slate-900">
                “My mind feels heavy lately. I keep overthinking everything and
                I&apos;m tired.”
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-[1.6rem] bg-[#401268] px-3 py-2 text-white">
                It makes sense that you feel drained when your thoughts are
                that loud. You don&apos;t have to tidy them up here – you can
                just let them out as they are.
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-2xl rounded-bl-[1.6rem] bg-white/80 px-3 py-2 text-slate-900">
                You&apos;re not too much, and you&apos;re not alone. You&apos;re
                allowed to take up space with how you feel.
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="space-y-4 pb-6">
          <h2 className="text-sm font-semibold text-[#2A1740]">
            How Ventfreely works
          </h2>

          <div className="grid gap-4 md:grid-cols-3 text-xs text-slate-700">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-[#401268]">
                1 · Quick emotional check-in
              </p>
              <p>
                Answer a few simple questions to see how heavy things feel for
                you right now.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-[#401268]">
                2 · Start venting safely
              </p>
              <p>
                Say the thoughts you keep in your head. Ventfreely responds
                gently, helping you slow everything down.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-[#401268]">
                3 · Decide if it helps you
              </p>
              <p>
                Try a few free messages. If it feels supportive, you can unlock
                more time for a small fee.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
