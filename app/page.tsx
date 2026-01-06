"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AuthNav } from "@/app/components/AuthNav";

const CHECKOUT_URL =
  "https://ventfreely.com/checkouts/cn/hWN7GGnQzaRXVfX1lEc8TNBb/en-ee?_r=AQABKeCP8HYH1psvfNVgYdhHcOQv4nKIXPtf9iIbwGwZYbY&preview_theme_id=191156912392";

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

/* ✨ Small helper for purple glow cards */
function GlowCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="pointer-events-none absolute -inset-[1px] rounded-[2rem] blur-md"
        style={{
          background:
            "linear-gradient(120deg, rgba(192,132,252,0.55), rgba(168,85,247,0.35), rgba(99,102,241,0.35))",
          opacity: 0.75,
        }}
      />
      <div className="relative rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur">
        {children}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen w-full">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: "var(--vf-bg)" }} />
      </div>

      {/* Header */}
      <header className="w-full bg-[var(--vf-header)]">
        <div className="relative mx-auto flex max-w-5xl items-center px-4 py-1.5">
          {/* Left: Menu */}
          <button
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="inline-flex items-center justify-center rounded-full p-2 text-white/80 hover:bg-white/10"
          >
            <span className="text-xl">☰</span>
          </button>

          {/* Center: Logo */}
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
            <Link href="/" className="pointer-events-auto flex items-center">
              <Image
                src="/brand/logo.svg"
                alt="Ventfreely"
                width={90}
                height={24}
                priority
                className="opacity-95"
              />
            </Link>
          </div>

          {/* Right: Account */}
          <div className="ml-auto">
            <AuthNav />
          </div>
        </div>
      </header>

      {/* Slide-in Menu */}
      <div
        className={[
          "fixed inset-0 z-50 transition",
          menuOpen ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
      >
        {/* Backdrop */}
        <div
          onClick={() => setMenuOpen(false)}
          className={[
            "absolute inset-0 bg-black/40 transition-opacity",
            menuOpen ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />

        {/* Panel */}
        <div
          className={[
            "absolute left-0 top-0 h-full w-[280px] bg-[#0B1634] shadow-xl transition-transform duration-300",
            menuOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <Image src="/brand/logo.svg" alt="Ventfreely" width={84} height={22} />
            <button
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="rounded-full p-2 text-white/70 hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          <nav className="mt-4 flex flex-col gap-1 px-3 text-[14px] text-white/85">
            {[
              ["Home", "/"],
              ["Test", "/test"],
              ["Chat", "/chat"],
              ["Daily", "/daily"],
              ["Weekly", "/weekly"],
              ["Insights", "/insights"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-white/10"
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 border-t border-white/10 px-3 pt-4">
            <p
              className="text-[12px] text-white/50"
              style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
            >
              ACCOUNT
            </p>
            <div className="mt-2">
              <AuthNav />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <section className="mx-auto max-w-xl text-center">
          {/* Hero */}
          <GlowCard>
            <div className="px-6 py-10 md:px-8">
              <p
                className="text-[12px] text-white/60"
                style={{
                  fontFamily: "var(--font-subheading)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                }}
              >
                Gentle emotional support
              </p>

              <h1
                className="mt-3 text-4xl font-semibold md:text-5xl"
                style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}
              >
                Feel a little lighter
                <span className="block">— one message at a time</span>
              </h1>

              <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
                Ventfreely helps when you feel low, empty, or mentally tired. No therapy. No diagnosis.
                Just a calm, simple way to talk things through.
              </p>

              {/* Primary actions */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                <Link
                  href="/chat"
                  className={[
                    "inline-flex w-full items-center justify-center rounded-full px-6 py-4",
                    "bg-white text-[var(--vf-ink)] transition",
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
              <div className="mx-auto mt-7 flex max-w-xl flex-wrap justify-center gap-2 text-[11px] text-white/70">
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

              <p className="mx-auto mt-5 max-w-lg text-[11px] leading-relaxed text-white/55">
                Ventfreely isn’t a therapist and doesn’t provide medical advice or diagnoses. If you’re in
                immediate danger, contact local emergency services.
              </p>
            </div>
          </GlowCard>

          {/* Action hub */}
          <div className="mt-10 grid gap-4 text-left md:grid-cols-2">
            <GlowCard>
              <QuickCard
                eyebrow="FAST CHECK-IN"
                title="Daily Reflection"
                desc="One good moment. One emotion. One energy. Done."
                primaryHref="/daily"
                primaryLabel="Open daily"
                secondaryHref="/weekly"
                secondaryLabel="Weekly report →"
              />
            </GlowCard>

            <GlowCard>
              <QuickCard
                eyebrow="SOFT INSIGHTS"
                title="Weekly Insights"
                desc="A gentle snapshot of your last 7 days — simple and calm."
                primaryHref="/insights"
                primaryLabel="Open insights"
                secondaryHref="/weekly"
                secondaryLabel="Weekly report →"
              />
            </GlowCard>
          </div>

          <GlowCard className="mt-10">
            <DailyStatusCard />
          </GlowCard>

          <GlowCard className="mt-8">
            <InsightsPreviewCard />
          </GlowCard>

          {/* How it works */}
          <div className="mt-14 text-left">
            <h2
              className="text-sm text-white/80"
              style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
            >
              HOW IT WORKS
            </h2>

            <div className="mt-4 grid gap-4 text-[12px] text-white/80 md:grid-cols-3">
              <GlowCard>
                <StepCard title="1 · Start small">
                  Take the test or do a 1-minute daily check-in.
                </StepCard>
              </GlowCard>
              <GlowCard>
                <StepCard title="2 · Talk it out">
                  Say what’s been sitting in your mind — gently.
                </StepCard>
              </GlowCard>
              <GlowCard>
                <StepCard title="3 · Stay consistent">
                  Premium unlocks more time + tracking.
                </StepCard>
              </GlowCard>
            </div>

            {/* Premium CTA */}
            <GlowCard className="mt-10">
              <div className="p-5">
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
                      className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-[var(--vf-ink)] transition hover:brightness-95 active:scale-[0.99]"
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
            </GlowCard>

            {/* Example */}
            <div className="mt-14">
              <div className="flex items-center justify-between text-[11px] text-white/60">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
                  Example (not real data)
                </span>
                <span>Anonymous</span>
              </div>

              <div className="mt-3 space-y-2 text-[11px] leading-relaxed">
                <GlowCard>
                  <div className="px-3 py-2 text-white/90">
                    “My mind feels heavy lately. I keep overthinking everything.”
                  </div>
                </GlowCard>

                <GlowCard>
                  <div className="px-3 py-2 text-[var(--vf-ink)] bg-white rounded-[2rem]">
                    That makes sense. You don’t have to tidy your thoughts here — you can just let them out
                    as they are.
                  </div>
                </GlowCard>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-14 text-center">
              <div className="mx-auto h-px w-full max-w-xl bg-white/10" />
              <p className="mt-4 text-[11px] text-white/45">
                Made for quiet moments. No judgement. No pressure.
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

/* --- Existing components below, unchanged in logic --- */

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
    <div className="p-5">
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
          className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-[var(--vf-ink)] transition hover:brightness-95 active:scale-[0.99]"
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

  if (gate !== "ok") {
    return (
      <div className="p-5 text-left">
        <p
          className="text-[12px] text-white/60"
          style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
        >
          YOUR WEEK (DAILY)
        </p>
        <p className="mt-2 text-[14px] text-white/85">
          {gate === "loading" && "Loading…"}
          {gate === "unauthorized" && "Log in to save your daily moments and track progress."}
          {gate === "paywall" && "Daily tracking is part of Premium."}
          {gate === "error" && "Couldn’t load your daily status. Try again soon."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 text-left">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[12px] text-white/60"
            style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
          >
            YOUR WEEK (DAILY)
          </p>
          <p className="mt-2 text-[14px] text-white/85">{todayDone ? "Done today ✅" : "Not done today"}</p>
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

  if (gate !== "ok") {
    return (
      <div className="p-5 text-left">
        <p
          className="text-[12px] text-white/60"
          style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
        >
          INSIGHTS (WEEKLY)
        </p>
        <p className="mt-2 text-[14px] text-white/85">
          {gate === "loading" && "Loading…"}
          {gate === "unauthorized" && "Log in to view your insights."}
          {gate === "paywall" && "Insights are part of Premium."}
          {gate === "error" && "Couldn’t load insights. Try again soon."}
        </p>
      </div>
    );
  }

  const note = data?.change?.note ?? "Weekly comparison is ready.";
  const thisDays = data?.thisWeek?.completedDays ?? 0;
  const lastDays = data?.lastWeek?.completedDays ?? 0;

  return (
    <div className="p-5 text-left">
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
    <div className="p-4">
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
