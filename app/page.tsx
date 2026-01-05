// FILE: app/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Montserrat, Oswald, Barlow_Condensed } from "next/font/google";
import { AuthNav } from "@/app/components/AuthNav";

const CHECKOUT_URL =
  "https://ventfreely.com/checkouts/cn/hWN7GGnQzaRXVfX1lEc8TNBb/en-ee?_r=AQABKeCP8HYH1psvfNVgYdhHcOQv4nKIXPtf9iIbwGwZYbY&preview_theme_id=191156912392";

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

type WeekData =
  | {
      range: { start: string; end: string };
      completedDays: number;
      topEmotion: string | null;
      trend: "up" | "flat" | "down" | "na";
      series: Array<{ date: string; score: number; emotion: string; energy: string }>;
      trendLabel?: string;
      suggestion?: string;
    }
  | null;

type InsightsCompare =
  | {
      thisWeek: {
        range: { start: string; end: string };
        completedDays: number;
        topEmotion: string | null;
        trend: "up" | "flat" | "down" | "na";
        insights: string[];
      };
      lastWeek: {
        range: { start: string; end: string };
        completedDays: number;
        topEmotion: string | null;
        trend: "up" | "flat" | "down" | "na";
        insights: string[];
      };
      change: { deltaDays: number; note: string };
    }
  | null;

type GateState = "loading" | "ok" | "unauthorized" | "paywall" | "error";

function trendLabel(t: "up" | "flat" | "down" | "na") {
  if (t === "up") return "↑";
  if (t === "down") return "↓";
  if (t === "flat") return "→";
  return "—";
}

function trendText(t: "up" | "flat" | "down" | "na") {
  if (t === "up") return "improving";
  if (t === "down") return "lower";
  if (t === "flat") return "steady";
  return "no data";
}

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
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 500px at 50% 0%, rgba(255,255,255,0.10), transparent 60%), linear-gradient(180deg, #0B1634 0%, #07102A 55%, #061027 100%)",
          }}
        />
      </div>

      {/* Header */}
      <header className="w-full bg-[#401268]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-1.5">
          <Link href="/" className="flex items-center justify-center">
            <Image
              src="/brand/logo.svg"
              alt="Ventfreely"
              width={92}
              height={24}
              priority
              className="opacity-95"
            />
          </Link>

          <div className="hidden sm:flex items-center gap-2">
            <nav className="flex items-center gap-1 text-[12px] text-white/80">
              <Link className="rounded-full px-3 py-1 hover:bg-white/10" href="/test">
                Test
              </Link>
              <Link className="rounded-full px-3 py-1 hover:bg-white/10" href="/chat">
                Chat
              </Link>
              <Link className="rounded-full px-3 py-1 hover:bg-white/10" href="/daily">
                Daily
              </Link>
              <Link className="rounded-full px-3 py-1 hover:bg-white/10" href="/weekly">
                Weekly
              </Link>
              <Link className="rounded-full px-3 py-1 hover:bg-white/10" href="/insights">
                Insights
              </Link>
            </nav>

            {/* ✅ Auth state (Account vs Log in / Sign up) */}
            <AuthNav className="ml-1" />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <section className="mx-auto max-w-xl text-center">
          {/* Hero */}
          <div className="rounded-[2rem] border border-white/10 bg-white/5 px-6 py-10 shadow-sm backdrop-blur md:px-8">
            <h1
              className="text-5xl font-semibold md:text-6xl"
              style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}
            >
              A CALM SPACE
              <span className="block">WHEN YOU NEED IT MOST</span>
            </h1>

            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
              Ventfreely is a calm, anonymous place to let your thoughts out. No judgement. No pressure.
              Just a gentle AI companion listening.
            </p>

            {/* Primary actions */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Link
                href="/chat"
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
                Start chatting
              </Link>

              <Link
                href="/test"
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
                Take the quick test
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2 text-[11px] text-white/70">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <span>🕊</span> gentle tone
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <span>🙈</span> no real name
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                <span>⏱</span> quick start
              </span>
            </div>

            <p className="mx-auto mt-4 max-w-lg text-[11px] leading-relaxed text-white/55">
              Ventfreely is not a therapist and doesn’t provide diagnoses. If you’re in immediate danger,
              contact local emergency services.
            </p>
          </div>

          {/* Action hub (fast mission path) */}
          <div className="mt-6 grid gap-3 text-left md:grid-cols-2">
            <QuickCard
              eyebrow="FAST CHECK-IN"
              title="Daily Reflection"
              desc="One good moment. One emotion. One energy. Done."
              primaryHref="/daily"
              primaryLabel="Open daily"
              secondaryHref="/weekly"
              secondaryLabel="Weekly report →"
            />

            <QuickCard
              eyebrow="SOFT INSIGHTS"
              title="Weekly Insights"
              desc="A gentle snapshot of your last 7 days — simple and calm."
              primaryHref="/insights"
              primaryLabel="Open insights"
              secondaryHref="/weekly"
              secondaryLabel="Weekly report →"
            />
          </div>

          {/* ✅ Daily Status (your real data + gating) */}
          <DailyStatusCard />

          {/* ✅ NEW: Insights preview (This week vs Last week) */}
          <InsightsPreviewCard />

          {/* How it works (short + mission aligned) */}
          <div className="mt-10 text-left">
            <h2
              className="text-sm text-white/80"
              style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
            >
              HOW IT WORKS
            </h2>

            <div className="mt-3 grid gap-3 text-[12px] text-white/80 md:grid-cols-3">
              <StepCard title="1 · Quick check-in">
                Take the test or do a daily reflection to name what’s going on.
              </StepCard>
              <StepCard title="2 · Vent safely">
                Say what you’ve been holding. The AI responds gently.
              </StepCard>
              <StepCard title="3 · Keep momentum">
                If it helps, unlock more time and tracking with Premium.
              </StepCard>
            </div>

            {/* Premium CTA (simple + direct) */}
            <div className="mt-6 rounded-3xl border border-white/15 bg-white/5 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p
                    className="text-[12px] text-white/60"
                    style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
                  >
                    PREMIUM
                  </p>
                  <p className="mt-1 text-[14px] text-white/85">
                    Daily tracking + weekly report + insights — in one calm flow.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Link
                    href={CHECKOUT_URL}
                    className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99]"
                    style={{
                      fontFamily: "var(--font-subheading)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Unlock premium
                  </Link>
                  <Link href="/daily" className="text-[12px] text-white/60 hover:text-white/80">
                    Start with Daily →
                  </Link>
                </div>
              </div>
            </div>

            {/* Example (kept, but pushed lower) */}
            <div className="mt-10">
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
                    That makes sense. You don’t have to tidy your thoughts here — you can just let them out as they are.
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="max-w-[75%] rounded-2xl rounded-bl-[1.6rem] border border-white/10 bg-white/10 px-3 py-2 text-white/90">
                    You’re allowed to take up space with how you feel.
                  </div>
                </div>
              </div>
            </div>

            {/* Tiny footer */}
            <div className="mt-10 text-center">
              <div className="mx-auto h-px w-full max-w-xl bg-white/10" />
              <p className="mt-4 text-[11px] text-white/45">
                Made for calm moments. No judgement. No pressure.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-3 text-[11px] text-white/55">
                <Link href="/chat" className="hover:text-white/75">
                  Chat
                </Link>
                <Link href="/daily" className="hover:text-white/75">
                  Daily
                </Link>
                <Link href="/weekly" className="hover:text-white/75">
                  Weekly
                </Link>
                <Link href="/insights" className="hover:text-white/75">
                  Insights
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function QuickCard({
  eyebrow,
  title,
  desc,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
      <p
        className="text-[12px] text-white/60"
        style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
      >
        {eyebrow}
      </p>
      <p className="mt-2 text-[16px] font-semibold text-white/90">{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-white/70">{desc}</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={primaryHref}
          className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99]"
          style={{
            fontFamily: "var(--font-subheading)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {primaryLabel}
        </Link>

        <Link href={secondaryHref} className="text-[12px] text-white/60 hover:text-white/80">
          {secondaryLabel}
        </Link>
      </div>
    </div>
  );
}

function DailyStatusCard() {
  const [gate, setGate] = useState<GateState>("loading");
  const [data, setData] = useState<WeekData>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setGate("loading");
        const res = await fetch("/api/daily/week", { cache: "no-store" });
        if (!mounted) return;

        if (res.status === 401) return setGate("unauthorized");
        if (res.status === 402) return setGate("paywall");
        if (!res.ok) return setGate("error");

        const json = (await res.json()) as WeekData;
        setData(json);
        setGate("ok");
      } catch {
        if (mounted) setGate("error");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const completedDays = data?.completedDays ?? 0;
  const trend = data?.trend ?? "na";

  const seriesDates = useMemo(() => new Set((data?.series ?? []).map((s) => s.date)), [data]);

  const todayDone = useMemo(() => {
    if (!data?.range?.end) return false;
    return seriesDates.has(data.range.end);
  }, [data, seriesDates]);

  const weekDates = useMemo(() => {
    if (!data?.range?.start || !data?.range?.end) return [];
    const out: string[] = [];
    const start = new Date(data.range.start + "T00:00:00Z");
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      out.push(`${yyyy}-${mm}-${dd}`);
    }
    return out;
  }, [data]);

  if (gate === "loading") {
    return (
      <div className="mt-8 rounded-3xl border border-white/15 bg-white/5 p-5 text-left">
        <p
          className="text-[12px] text-white/60"
          style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
        >
          YOUR WEEK (DAILY)
        </p>
        <p className="mt-2 text-[13px] text-white/70">Loading…</p>
      </div>
    );
  }

  if (gate === "unauthorized") {
    return (
      <div className="mt-8 rounded-3xl border border-white/15 bg-white/5 p-5 text-left">
        <p
          className="text-[12px] text-white/60"
          style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
        >
          YOUR WEEK (DAILY)
        </p>
        <p className="mt-2 text-[14px] text-white/85">
          Log in to save your daily moments and track progress.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
            style={{
              fontFamily: "var(--font-subheading)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-white transition hover:bg-white/15 active:scale-[0.99] sm:w-auto"
            style={{
              fontFamily: "var(--font-subheading)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  if (gate === "paywall") {
    return (
      <div className="mt-8 rounded-3xl border border-white/15 bg-white/5 p-5 text-left">
        <p
          className="text-[12px] text-white/60"
          style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
        >
          YOUR WEEK (DAILY)
        </p>
        <p className="mt-2 text-[14px] text-white/85">Daily tracking is part of Premium.</p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href={CHECKOUT_URL}
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
            style={{
              fontFamily: "var(--font-subheading)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Unlock Premium
          </Link>
          <Link
            href="/daily"
            className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-white transition hover:bg-white/15 active:scale-[0.99] sm:w-auto"
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
    );
  }

  if (gate === "error") {
    return (
      <div className="mt-8 rounded-3xl border border-white/15 bg-white/5 p-5 text-left">
        <p
          className="text-[12px] text-white/60"
          style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
        >
          YOUR WEEK (DAILY)
        </p>
        <p className="mt-2 text-[14px] text-white/85">
          Couldn’t load your daily status. Try again soon.
        </p>
        <div className="mt-5">
          <Link
            href="/daily"
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
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
    );
  }

  return (
    <div className="mt-8 rounded-3xl border border-white/15 bg-white/5 p-5 text-left">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[12px] text-white/60"
            style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
          >
            YOUR WEEK (DAILY)
          </p>
          <p className="mt-2 text-[14px] text-white/85">
            {todayDone ? "Done today ✅" : "Not done today"}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] text-white/50">Trend</p>
          <p className="text-[16px] font-semibold text-white/85">{trendLabel(trend)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {weekDates.map((d) => {
          const done = seriesDates.has(d);
          return (
            <span
              key={d}
              className={[
                "h-2.5 w-2.5 rounded-full border",
                done ? "bg-white/85 border-white/30" : "bg-transparent border-white/20",
              ].join(" ")}
              title={d}
            />
          );
        })}
        <span className="ml-2 text-[11px] text-white/55">{completedDays}/7</span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <MiniStat label="This week" value={`${completedDays}/7`} />
        <MiniStat label="Status" value={todayDone ? "Done" : "Start"} />
        <MiniStat label="Trend" value={trendText(trend)} />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/daily"
          className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
          style={{
            fontFamily: "var(--font-subheading)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {todayDone ? "View daily" : "Start daily"}
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/insights" className="text-[12px] text-white/60 hover:text-white/80">
            Insights →
          </Link>
          <Link href="/weekly" className="text-[12px] text-white/60 hover:text-white/80">
            Weekly report →
          </Link>
        </div>
      </div>
    </div>
  );
}

function InsightsPreviewCard() {
  const [gate, setGate] = useState<GateState>("loading");
  const [data, setData] = useState<InsightsCompare>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setGate("loading");
        const res = await fetch("/api/insights/compare", { cache: "no-store" });
        if (!mounted) return;

        if (res.status === 401) return setGate("unauthorized");
        if (res.status === 402) return setGate("paywall");
        if (!res.ok) return setGate("error");

        const json = (await res.json()) as InsightsCompare;
        setData(json);
        setGate("ok");
      } catch {
        if (mounted) setGate("error");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (gate === "loading") {
    return (
      <div className="mt-6 rounded-3xl border border-white/15 bg-white/5 p-5 text-left">
        <p
          className="text-[12px] text-white/60"
          style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
        >
          INSIGHTS (WEEKLY)
        </p>
        <p className="mt-2 text-[13px] text-white/70">Loading…</p>
      </div>
    );
  }

  if (gate === "unauthorized") {
    return (
      <div className="mt-6 rounded-3xl border border-white/15 bg-white/5 p-5 text-left">
        <p
          className="text-[12px] text-white/60"
          style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
        >
          INSIGHTS (WEEKLY)
        </p>
        <p className="mt-2 text-[14px] text-white/85">Log in to view your insights.</p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
            style={{
              fontFamily: "var(--font-subheading)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-white transition hover:bg-white/15 active:scale-[0.99] sm:w-auto"
            style={{
              fontFamily: "var(--font-subheading)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  if (gate === "paywall") {
    return (
      <div className="mt-6 rounded-3xl border border-white/15 bg-white/5 p-5 text-left">
        <p
          className="text-[12px] text-white/60"
          style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
        >
          INSIGHTS (WEEKLY)
        </p>
        <p className="mt-2 text-[14px] text-white/85">Insights are part of Premium.</p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href={CHECKOUT_URL}
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
            style={{
              fontFamily: "var(--font-subheading)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Unlock Premium
          </Link>
          <Link
            href="/insights"
            className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-white transition hover:bg-white/15 active:scale-[0.99] sm:w-auto"
            style={{
              fontFamily: "var(--font-subheading)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Open insights
          </Link>
        </div>
      </div>
    );
  }

  if (gate === "error") {
    return (
      <div className="mt-6 rounded-3xl border border-white/15 bg-white/5 p-5 text-left">
        <p
          className="text-[12px] text-white/60"
          style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
        >
          INSIGHTS (WEEKLY)
        </p>
        <p className="mt-2 text-[14px] text-white/85">Couldn’t load insights. Try again soon.</p>

        <div className="mt-5">
          <Link
            href="/insights"
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
            style={{
              fontFamily: "var(--font-subheading)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Open insights
          </Link>
        </div>
      </div>
    );
  }

  const note = data?.change?.note ?? "Weekly comparison is ready.";
  const thisDays = data?.thisWeek?.completedDays ?? 0;
  const lastDays = data?.lastWeek?.completedDays ?? 0;

  return (
    <div className="mt-6 rounded-3xl border border-white/15 bg-white/5 p-5 text-left">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[12px] text-white/60"
            style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
          >
            INSIGHTS (WEEKLY)
          </p>
          <p className="mt-2 text-[14px] text-white/85">{note}</p>
        </div>

        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] text-white/85">
          {thisDays}/7 vs {lastDays}/7
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniStat label="This week" value={`${thisDays}/7`} />
        <MiniStat label="Last week" value={`${lastDays}/7`} />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/insights"
          className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
          style={{
            fontFamily: "var(--font-subheading)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Open insights
        </Link>

        <Link href="/weekly" className="text-[12px] text-white/60 hover:text-white/80">
          Weekly report →
        </Link>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] text-white/50">{label}</p>
      <p className="mt-1 text-[14px] font-semibold text-white/85">{value}</p>
    </div>
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
