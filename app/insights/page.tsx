// FILE: app/insights/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Montserrat, Oswald, Barlow_Condensed } from "next/font/google";
import { AppTopHeader } from "@/app/components/AppTopHeader";

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

type Trend = "up" | "flat" | "down" | "na";

type InsightsCompare =
  | {
      thisWeek: {
        range: { start: string; end: string };
        completedDays: number;
        topEmotion: string | null;
        trend: Trend;
        insights: string[];
      };
      lastWeek: {
        range: { start: string; end: string };
        completedDays: number;
        topEmotion: string | null;
        trend: Trend;
        insights: string[];
      };
      change: { deltaDays: number; note: string };
    }
  | null;

type GateState = "loading" | "ok" | "unauthorized" | "paywall" | "error";

function trendArrow(t: Trend) {
  if (t === "up") return "↑";
  if (t === "down") return "↓";
  if (t === "flat") return "→";
  return "—";
}

function trendText(t: Trend) {
  if (t === "up") return "improving";
  if (t === "down") return "lower";
  if (t === "flat") return "steady";
  return "no data";
}

function fmtRange(range?: { start: string; end: string } | null) {
  if (!range?.start || !range?.end) return "";
  return `${range.start} → ${range.end}`;
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

export default function InsightsPage() {
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

  const note = useMemo(() => data?.change?.note ?? "", [data]);
  const thisWeek = data?.thisWeek ?? null;
  const lastWeek = data?.lastWeek ?? null;

  const insights = useMemo(() => {
    const arr = thisWeek?.insights ?? [];
    return arr.filter(Boolean).slice(0, 4);
  }, [thisWeek]);

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
        <div className="absolute inset-0" style={{ background: "var(--vf-bg)" }} />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#A855F7]/20 blur-[120px]" />
      </div>

      {/* ✅ Unified header */}
      <AppTopHeader active="insights" />

      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <section className="mx-auto max-w-xl text-center">
          <GlowCard>
            <div className="px-6 py-10 md:px-8">
              <Eyebrow>SOFT INSIGHTS</Eyebrow>

              <h1
                className="mt-3 text-4xl font-semibold md:text-5xl"
                style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}
              >
                Weekly insights
              </h1>

              <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
                A gentle comparison of this week vs last week.
              </p>

              <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2">
                <Pill>📊 comparison</Pill>
                <Pill>🕊 calm tone</Pill>
                <Pill>🧩 simple patterns</Pill>
              </div>
            </div>
          </GlowCard>

          {gate === "loading" && (
            <GlowCard className="mt-8">
              <div className="p-5 text-left">
                <Eyebrow>LOADING</Eyebrow>
                <p className="mt-2 text-[14px] text-white/80">Loading your insights…</p>
              </div>
            </GlowCard>
          )}

          {gate === "unauthorized" && (
            <SimpleCard
              title="LOG IN TO VIEW INSIGHTS"
              text="Insights are tied to your account."
              primaryHref="/login"
              primaryText="Log in"
              secondaryHref="/signup"
              secondaryText="Create account"
            />
          )}

          {gate === "paywall" && (
            <SimpleCard
              title="PREMIUM REQUIRED"
              text="Insights are part of Premium."
              primaryHref={CHECKOUT_URL}
              primaryText="Unlock Premium"
              secondaryHref="/daily"
              secondaryText="Open daily"
            />
          )}

          {gate === "error" && (
            <SimpleCard
              title="COULDN’T LOAD"
              text="Please try again in a moment."
              primaryHref="/insights"
              primaryText="Retry"
              secondaryHref="/"
              secondaryText="Back home"
              onPrimaryClick={() => window.location.reload()}
            />
          )}

          {gate === "ok" && (
            <div className="mt-8 text-left">
              <GlowCard>
                <div className="p-5">
                  <Eyebrow>WHAT CHANGED</Eyebrow>
                  <p className="mt-2 text-[14px] text-white/85">
                    {note || "Your weekly comparison is ready."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Pill>
                      ✅ {thisWeek?.completedDays ?? 0}/7 this week
                    </Pill>
                    <Pill>
                      📅 {lastWeek?.completedDays ?? 0}/7 last week
                    </Pill>
                    <Pill>
                      {trendArrow(thisWeek?.trend ?? "na")} {trendText(thisWeek?.trend ?? "na")}
                    </Pill>
                  </div>
                </div>
              </GlowCard>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <GlowCard>
                  <WeekCard
                    title="THIS WEEK"
                    range={fmtRange(thisWeek?.range)}
                    completedDays={thisWeek?.completedDays ?? 0}
                    topEmotion={thisWeek?.topEmotion ?? null}
                    trend={thisWeek?.trend ?? "na"}
                  />
                </GlowCard>

                <GlowCard>
                  <WeekCard
                    title="LAST WEEK"
                    range={fmtRange(lastWeek?.range)}
                    completedDays={lastWeek?.completedDays ?? 0}
                    topEmotion={lastWeek?.topEmotion ?? null}
                    trend={lastWeek?.trend ?? "na"}
                  />
                </GlowCard>
              </div>

              <GlowCard className="mt-4">
                <div className="p-5">
                  <Eyebrow>SOFT INSIGHTS</Eyebrow>

                  {insights.length ? (
                    <ul className="mt-3 space-y-2 text-[13px] text-white/85">
                      {insights.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-[7px] inline-block h-1.5 w-1.5 rounded-full bg-white/50" />
                          <span className="leading-relaxed">{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[13px] text-white/70">
                      Do a few more days to unlock clearer patterns.
                    </p>
                  )}
                </div>
              </GlowCard>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href="/daily"
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[var(--vf-ink)] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
                  style={{
                    fontFamily: "var(--font-subheading)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Open daily
                </Link>

                <div className="flex items-center gap-4">
                  <Link href="/weekly" className="text-[12px] text-white/60 hover:text-white/80">
                    Weekly report →
                  </Link>
                  <Link href="/chat" className="text-[12px] text-white/60 hover:text-white/80">
                    Open chat →
                  </Link>
                </div>
              </div>

              <p className="mt-8 text-center text-[11px] text-white/45">
                Calm, not perfect. Patterns are just hints — not labels.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function WeekCard({
  title,
  range,
  completedDays,
  topEmotion,
  trend,
}: {
  title: string;
  range: string;
  completedDays: number;
  topEmotion: string | null;
  trend: Trend;
}) {
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow>{title}</Eyebrow>
          <p className="mt-2 text-[12px] text-white/55">{range || "—"}</p>
        </div>

        <div className="text-right">
          <p className="text-[11px] text-white/50">Trend</p>
          <p className="text-[16px] font-semibold text-white/85">{trendArrow(trend)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniStat label="Completed" value={`${completedDays}/7`} />
        <MiniStat label="Top emotion" value={topEmotion ?? "—"} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-[11px] text-white/50">Trend</p>
        <p className="mt-1 text-[13px] font-semibold text-white/85">{trendText(trend)}</p>
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

function SimpleCard({
  title,
  text,
  primaryHref,
  primaryText,
  secondaryHref,
  secondaryText,
  onPrimaryClick,
}: {
  title: string;
  text: string;
  primaryHref: string;
  primaryText: string;
  secondaryHref?: string;
  secondaryText?: string;
  onPrimaryClick?: () => void;
}) {
  return (
    <GlowCard className="mt-8">
      <div className="p-5 text-left">
        <Eyebrow>{title}</Eyebrow>
        <p className="mt-2 text-[14px] text-white/85">{text}</p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {onPrimaryClick ? (
            <button
              type="button"
              onClick={onPrimaryClick}
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[var(--vf-ink)] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
              style={{
                fontFamily: "var(--font-subheading)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {primaryText}
            </button>
          ) : (
            <Link
              href={primaryHref}
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[var(--vf-ink)] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
              style={{
                fontFamily: "var(--font-subheading)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {primaryText}
            </Link>
          )}

          {secondaryHref && secondaryText ? (
            <Link
              href={secondaryHref}
              className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-4 text-white transition hover:bg-white/15 active:scale-[0.99] sm:w-auto"
              style={{
                fontFamily: "var(--font-subheading)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {secondaryText}
            </Link>
          ) : null}
        </div>
      </div>
    </GlowCard>
  );
}
