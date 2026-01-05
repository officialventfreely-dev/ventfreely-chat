// app/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Montserrat, Oswald, Barlow_Condensed } from "next/font/google";

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

export default function HomePage() {
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
      {/* Background (same as /test) */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 500px at 50% 0%, rgba(255,255,255,0.08), transparent 60%), linear-gradient(180deg, #0B1634 0%, #07102A 55%, #061027 100%)",
          }}
        />
      </div>

      {/* Header (same vibe as /test) */}
      <header className="w-full bg-[#401268]">
        <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-2.5">
          <Link href="/" className="flex items-center justify-center">
            <Image
              src="/brand/logo.svg"
              alt="Ventfreely"
              width={116}
              height={32}
              priority
              className="opacity-95"
            />
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <section className="mx-auto max-w-xl text-center">
          <h1
            className="text-5xl font-semibold md:text-6xl"
            style={{
              fontFamily: "var(--font-heading)",
              letterSpacing: "0.02em",
            }}
          >
            SIMPLICITY
            <span className="block">WHEN YOU NEED IT MOST</span>
          </h1>

          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
            Ventfreely is a calm, anonymous place to let your thoughts out.
            No judgement. No pressure. Just a gentle AI companion listening.
          </p>

          {/* Primary actions */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Link
              href="/test"
              className={[
                "inline-flex w-full items-center justify-center rounded-full px-6 py-4",
                "bg-white text-[#0B1634] transition",
                "hover:brightness-95 active:scale-[0.99]",
                "sm:w-auto",
              ].join(" ")}
              style={{
                fontFamily: "var(--font-subheading)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Take the quick test
            </Link>

            <Link
              href="/chat"
              className={[
                "inline-flex w-full items-center justify-center rounded-full px-6 py-4",
                "border border-white/20 bg-white/10 text-white transition",
                "hover:bg-white/15 active:scale-[0.99]",
                "sm:w-auto",
              ].join(" ")}
              style={{
                fontFamily: "var(--font-subheading)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Start chatting
            </Link>
          </div>

          {/* Minimal trust badges */}
          <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2 text-[11px] text-white/70">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
              <span>⏱</span> under 1 minute
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
              <span>🫶</span> no real name
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
              <span>🕊</span> gentle tone
            </span>
          </div>

          {/* Example (keep it short, simplicity) */}
          <div className="mt-10 text-left">
            <div className="flex items-center justify-between text-[11px] text-white/60">
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
                Example (not real data)
              </span>
              <span>Anonymous</span>
            </div>

            <div className="mt-3 space-y-2 text-[11px] leading-relaxed">
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-[1.6rem] border border-white/10 bg-white/10 px-3 py-2 text-white/90">
                  “My mind feels heavy lately. I keep overthinking everything.”
                </div>
              </div>

              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-[1.6rem] bg-white px-3 py-2 text-[#0B1634]">
                  That makes sense. You don’t have to tidy your thoughts here —
                  you can just let them out as they are.
                </div>
              </div>

              <div className="flex justify-start">
                <div className="max-w-[75%] rounded-2xl rounded-bl-[1.6rem] border border-white/10 bg-white/10 px-3 py-2 text-white/90">
                  You’re allowed to take up space with how you feel.
                </div>
              </div>
            </div>
          </div>

          {/* How it works (kept ultra simple) */}
          <div className="mt-10 text-left">
            <h2
              className="text-sm text-white/80"
              style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
            >
              HOW IT WORKS
            </h2>

            <div className="mt-3 grid gap-3 text-[12px] text-white/80 md:grid-cols-3">
              <StepCard title="1 · Quick check-in">
                Answer a few questions to see how heavy things feel right now.
              </StepCard>
              <StepCard title="2 · Vent safely">
                Say what you’ve been holding. Ventfreely responds gently.
              </StepCard>
              <StepCard title="3 · Keep it simple">
                Try it. If it helps, unlock more time for a small fee.
              </StepCard>
            </div>

            {/* Optional: daily CTA, still simple */}
            <div className="mt-6 rounded-3xl border border-white/15 bg-white/5 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p
                    className="text-[12px] text-white/60"
                    style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
                  >
                    DAILY REFLECTION
                  </p>
                  <p className="mt-1 text-[14px] text-white/85">
                    One good moment. One emotion. One energy. Done.
                  </p>
                </div>

                <Link
                  href="/daily"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99]"
                  style={{
                    fontFamily: "var(--font-subheading)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Open daily
                </Link>
              </div>
            </div>

            <p className="mt-6 text-[11px] text-white/45">
              Ventfreely is not a therapist or a diagnosis. It’s a gentle space to vent.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-4">
      <p
        className="text-[11px] font-semibold text-white/85"
        style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
      >
        {title}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-white/70">{children}</p>
    </div>
  );
}
