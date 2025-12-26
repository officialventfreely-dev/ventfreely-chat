// app/page.tsx
"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-950 via-slate-950 to-slate-950 text-slate-50">
      {/* Header */}
      <header className="w-full border-b border-violet-700/40 bg-gradient-to-r from-violet-800 via-fuchsia-700 to-violet-900/90 shadow-lg shadow-violet-900/40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-fuchsia-300/20 border border-fuchsia-200/60">
              <span className="text-xs font-semibold tracking-tight text-fuchsia-50">
                VF
              </span>
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Ventfreely
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-pink-100/90">
            <span className="hidden sm:inline">Anonymous · 24/7 · Online</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-400/15 px-2 py-1 text-[11px] text-emerald-100">
              <span className="text-[9px]">●</span> Listening
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-5xl flex-col px-4 py-8 md:px-6 md:py-10">
        {/* Hero section */}
        <section className="flex flex-1 flex-col gap-8 md:flex-row md:items-center">
          {/* Left: text */}
          <div className="flex-1 space-y-5">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              You&apos;re not alone.
            </h1>
            <p className="max-w-xl text-sm text-pink-100/95 md:text-base">
              Vent freely, say what you really feel, and let a calm, caring
              voice help you slow everything down. No pressure, no judgment –
              just space to talk.
            </p>

            <div className="flex flex-col gap-3 text-sm md:flex-row md:items-center">
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/test"
                  className="inline-flex items-center justify-center rounded-xl bg-pink-200 px-4 py-2 text-sm font-semibold text-violet-900 shadow shadow-pink-400/40 hover:bg-pink-100 active:scale-[0.98] transition"
                >
                  Take mental health test
                </Link>
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center rounded-xl border border-pink-300/60 bg-pink-50/10 px-4 py-2 text-sm font-medium text-pink-100 hover:bg-pink-50/20 transition"
                >
                  Skip test – start chatting
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-pink-100/80">
              <div className="inline-flex items-center gap-1 rounded-full bg-pink-50/10 px-2 py-1 border border-pink-200/40">
                <span>⏱</span>
                <span>Starts in under a minute</span>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-pink-50/10 px-2 py-1 border border-pink-200/40">
                <span>🫶</span>
                <span>No real name needed</span>
              </div>
            </div>
          </div>

          {/* Right: illustration / preview card */}
          <div className="mt-6 flex flex-1 justify-center md:mt-0">
            <div className="relative w-full max-w-xs">
              <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-fuchsia-500/25 via-pink-400/15 to-violet-500/25 blur-2xl" />
              <div className="relative rounded-[2rem] border border-pink-200/40 bg-pink-50/5 p-4 shadow-xl shadow-violet-950/50 backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between text-[11px] text-pink-100/90">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                    Ventfreely chat preview
                  </span>
                  <span>Anonymous</span>
                </div>

                <div className="space-y-2 text-[11px] leading-relaxed">
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-violet-900/60 px-3 py-2 text-pink-50 border border-violet-300/40">
                      “My mind won&apos;t stop. Too many thoughts. I don&apos;t
                      know how to slow them down.”
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-pink-300 px-3 py-2 text-violet-950 shadow shadow-pink-500/40">
                      It&apos;s okay to feel overwhelmed. Let&apos;s slow it
                      down together – one thought at a time.
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-violet-900/60 px-3 py-2 text-pink-50 border border-violet-300/40">
                      You&apos;re not a burden here. You&apos;re allowed to
                      take up space.
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-pink-50/10 px-3 py-2 text-[11px] text-pink-100 border border-pink-200/40">
                  <span>✨</span>
                  <p>
                    This is an AI companion – not a therapist – but it&apos;s
                    here to listen whenever you need to vent.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mt-10 grid gap-4 border-t border-pink-200/30 pt-6 text-sm text-pink-50/90 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-pink-200/80">
              1 · Take a short test
            </p>
            <p className="text-xs text-pink-100/80">
              A few quick questions help us understand what you&apos;re going
              through right now.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-pink-200/80">
              2 · Start talking freely
            </p>
            <p className="text-xs text-pink-100/80">
              Say the things you say in your head. The stuff you don&apos;t tell
              anyone else.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-pink-200/80">
              3 · Feel calmer and clearer
            </p>
            <p className="text-xs text-pink-100/80">
              Get gentle, thoughtful responses designed to slow your mind and
              help you breathe again.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
