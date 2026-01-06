"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppTopHeader } from "@/app/components/AppTopHeader";

type WeeklyData = {
  range: { start: string; end: string };
  completedDays: number;
  topEmotion: string | null;
  trend: "up" | "flat" | "down" | "na";
  suggestion?: string | null;
  trendLabel?: string | null;
  series: Array<{
    date: string;
    score: number;
    emotion: string;
    energy: string;
  }>;
};

const CHECKOUT_URL =
  "https://ventfreely.com/checkouts/cn/hWN7GGnQzaRXVfX1lEc8TNBb/en-ee?_r=AQABKeCP8HYH1psvfNVgYdhHcOQv4nKIXPtf9iIbwGwZYbY&preview_theme_id=191156912392";

function defaultTrendLabel(t: WeeklyData["trend"]) {
  if (t === "up") return "Trending up ↑";
  if (t === "down") return "Trending down ↓";
  if (t === "flat") return "Staying steady →";
  return "Not enough data yet";
}

function defaultSuggestion(t: WeeklyData["trend"]) {
  if (t === "up") return "You’ve been building momentum. Keep it gentle — small wins count.";
  if (t === "down") return "This week may have felt heavier. Try one small good thing per day — that’s enough.";
  if (t === "flat") return "Steady weeks are progress too. Keep the routine simple and doable.";
  return "Do a few more days and you’ll start seeing a clearer pattern.";
}

function trendArrow(t: WeeklyData["trend"]) {
  if (t === "up") return "↑";
  if (t === "down") return "↓";
  if (t === "flat") return "→";
  return "—";
}

function trendText(t: WeeklyData["trend"]) {
  if (t === "up") return "improving";
  if (t === "down") return "lower";
  if (t === "flat") return "steady";
  return "no data";
}

/**
 * GlowCard – sama “ere lilla outline + glow outside” vibe nagu Home/Daily.
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

export default function WeeklyPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<number | null>(null);
  const [data, setData] = useState<WeeklyData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/daily/week", { method: "GET", cache: "no-store" });
        if (cancelled) return;

        setStatus(res.status);

        if (res.ok) {
          const json = (await res.json()) as WeeklyData;
          setData(json);
        } else {
          setData(null);
        }
      } catch {
        if (!cancelled) {
          setStatus(500);
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const trendLabel = useMemo(() => {
    if (!data) return "";
    return (data.trendLabel && data.trendLabel.trim()) || defaultTrendLabel(data.trend);
  }, [data]);

  const suggestion = useMemo(() => {
    if (!data) return "";
    return (data.suggestion && data.suggestion.trim()) || defaultSuggestion(data.trend);
  }, [data]);

  const seriesDates = useMemo(() => new Set((data?.series ?? []).map((s) => s.date)), [data]);

  const weekDates = useMemo(() => {
    if (!data?.range?.start) return [];
    const start = new Date(data.range.start + "T00:00:00Z");
    const out: string[] = [];
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

  return (
    <main className="min-h-screen w-full" style={{ color: "white" }}>
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: "var(--vf-bg)" }} />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#A855F7]/20 blur-[120px]" />
      </div>

      {/* Unified header */}
      <AppTopHeader active="weekly" />

      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <section className="mx-auto max-w-xl text-center">
          {/* Hero */}
          <GlowCard>
            <div className="px-6 py-10 md:px-8">
              <Eyebrow>WEEKLY OVERVIEW</Eyebrow>

              <h1
                className="mt-3 text-4xl font-semibold md:text-5xl"
                style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}
              >
                Your Week
              </h1>

              <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
                A calm summary of the last 7 days.
              </p>

              <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2">
                <Pill>📅 7-day view</Pill>
                <Pill>🕊 gentle</Pill>
                <Pill>📈 simple trend</Pill>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                <Link
                  href="/daily"
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[var(--vf-ink)] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
                  style={{
                    fontFamily: "var(--font-subheading)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Open Daily
                </Link>

                <Link
                  href="/chat"
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-4 text-white transition hover:bg-white/15 active:scale-[0.99] sm:w-auto"
                  style={{
                    fontFamily: "var(--font-subheading)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Open chat
                </Link>
              </div>
            </div>
          </GlowCard>

          {/* Loading */}
          {loading && (
            <GlowCard className="mt-8">
              <div className="p-5 text-left">
                <Eyebrow>LOADING</Eyebrow>
                <p className="mt-2 text-[14px] text-white/80">Loading your weekly report…</p>
              </div>
            </GlowCard>
          )}

          {/* 401 */}
          {!loading && status === 401 && (
            <GateCard
              icon="🔒"
              title="LOG IN TO SEE YOUR WEEK"
              text="Your weekly report is tied to your account."
              primaryHref="/login"
              primaryText="Log in"
              secondaryHref="/signup"
              secondaryText="Create account"
            />
          )}

          {/* 402 */}
          {!loading && status === 402 && (
            <GateCard
              icon="✨"
              title="WEEKLY IS PREMIUM"
              text="Unlock Premium to view your weekly summary."
              primaryHref={CHECKOUT_URL}
              primaryText="Unlock Premium"
              secondaryHref="/daily"
              secondaryText="Open Daily"
            />
          )}

          {/* error */}
          {!loading && status !== 401 && status !== 402 && !data && (
            <GateCard
              icon="⚠️"
              title="COULDN’T LOAD REPORT"
              text="Please try again."
              primaryHref="/weekly"
              primaryText="Retry"
              secondaryHref="/"
              secondaryText="Back home"
              onPrimaryClick={() => window.location.reload()}
              useButtonForPrimary
            />
          )}

          {/* OK */}
          {!loading && data && (
            <div className="mt-8 text-left">
              {/* Summary */}
              <GlowCard>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Eyebrow>📅 THIS WEEK</Eyebrow>
                      <p className="mt-2 text-[14px] text-white/85">
                        {data.completedDays} of 7 days completed{" "}
                        {data.range?.start && data.range?.end ? (
                          <span className="text-white/50">
                            · {data.range.start} → {data.range.end}
                          </span>
                        ) : null}
                      </p>

                      <p className="mt-2 text-[15px] font-semibold text-white/90">{trendLabel}</p>

                      <p className="mt-1 text-[13px] text-white/75">
                        Most felt:{" "}
                        <span className="text-white/90 font-semibold">{data.topEmotion ?? "—"}</span>
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Pill>✅ {data.completedDays}/7</Pill>
                        <Pill>🧠 {data.topEmotion ?? "—"}</Pill>
                        <Pill>
                          {trendArrow(data.trend)} {trendText(data.trend)}
                        </Pill>
                      </div>
                    </div>

                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] text-white/85">
                      {data.completedDays}/7
                    </span>
                  </div>
                </div>
              </GlowCard>

              {/* Dots */}
              <GlowCard className="mt-4">
                <div className="p-5">
                  <Eyebrow>● LAST 7 DAYS</Eyebrow>
                  <div className="mt-3 flex items-center gap-1.5">
                    {weekDates.map((d) => {
                      const done = seriesDates.has(d);
                      return (
                        <span
                          key={d}
                          className={[
                            "h-2.5 w-2.5 rounded-full border",
                            done ? "bg-white/85 border-white/25" : "bg-transparent border-white/15",
                          ].join(" ")}
                          title={d}
                        />
                      );
                    })}
                    <span className="ml-2 text-xs text-white/60">{data.completedDays}/7</span>
                  </div>
                </div>
              </GlowCard>

              {/* Suggestion */}
              <GlowCard className="mt-4">
                <div className="p-5">
                  <Eyebrow>🕊 GENTLE SUGGESTION</Eyebrow>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/85">{suggestion}</p>
                </div>
              </GlowCard>

              {/* Series list */}
              <GlowCard className="mt-4">
                <div className="p-5">
                  <Eyebrow>📘 THIS WEEK</Eyebrow>

                  <div className="mt-3 space-y-2">
                    {data.series?.length ? (
                      data.series.map((d) => (
                        <div
                          key={d.date}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <span className="text-[12px] text-white/60">{d.date}</span>
                          <span className="text-[12px] text-white/85">
                            {d.emotion} · {d.energy}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[13px] text-white/60">No reflections yet.</p>
                    )}
                  </div>
                </div>
              </GlowCard>

              {/* CTA */}
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
                  Do today’s reflection
                </Link>

                <div className="flex items-center gap-4">
                  <Link href="/insights" className="text-[12px] text-white/60 hover:text-white/80">
                    Insights →
                  </Link>
                  <Link href="/chat" className="text-[12px] text-white/60 hover:text-white/80">
                    Open chat →
                  </Link>
                </div>
              </div>

              <p className="mt-8 text-center text-[11px] text-white/45">
                Patterns are just hints — not labels.
              </p>

              <p className="mt-2 text-center text-[10px] text-white/50 leading-relaxed">
                Ventfreely is an AI companion, not a therapist. If you’re in immediate danger, contact local emergency
                services.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function GateCard({
  icon,
  title,
  text,
  primaryHref,
  primaryText,
  secondaryHref,
  secondaryText,
  onPrimaryClick,
  useButtonForPrimary,
}: {
  icon?: string;
  title: string;
  text: string;
  primaryHref: string;
  primaryText: string;
  secondaryHref?: string;
  secondaryText?: string;
  onPrimaryClick?: () => void;
  useButtonForPrimary?: boolean;
}) {
  return (
    <GlowCard className="mt-8">
      <div className="p-5 text-left">
        <Eyebrow>
          {icon ? `${icon} ` : ""}
          {title}
        </Eyebrow>
        <p className="mt-2 text-[14px] text-white/85">{text}</p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {useButtonForPrimary ? (
            <button
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
