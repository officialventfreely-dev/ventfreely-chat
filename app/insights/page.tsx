// FILE: app/insights/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Montserrat, Oswald, Barlow_Condensed } from "next/font/google";

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

          <nav className="hidden sm:flex items-center gap-1 text-[12px] text-white/80">
            <Link className="rounded-full px-3 py-1 hover:bg-white/10" href="/chat">
              Chat
            </Link>
            <Link className="rounded-full px-3 py-1 hover:bg-white/10" href="/daily">
              Daily
            </Link>
            <Link className="rounded-full px-3 py-1 hover:bg-white/10" href="/weekly">
              Weekly
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <section className="mx-auto max-w-xl text-center">
          <h1
            className="text-5xl font-semibold md:text-6xl"
            style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}
          >
            INSIGHTS
          </h1>

          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
            A gentle comparison of this week vs last week.
          </p>

          {gate === "loading" && (
            <div className="mt-10 rounded-3xl border border-white/15 bg-white/5 p-6 text-left">
              <p
                className="text-[12px] text-white/60"
                style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
              >
                LOADING
              </p>
              <p className="mt-2 text-[14px] text-white/80">Loading your insights…</p>
            </div>
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
            <div className="mt-10 text-left">
              <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
                <p
                  className="text-[12px] text-white/60"
                  style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
                >
                  WHAT CHANGED
                </p>
                <p className="mt-2 text-[14px] text-white/85">
                  {note || "Your weekly comparison is ready."}
                </p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <WeekCard
                  title="THIS WEEK"
                  range={fmtRange(thisWeek?.range)}
                  completedDays={thisWeek?.completedDays ?? 0}
                  topEmotion={thisWeek?.topEmotion ?? null}
                  trend={thisWeek?.trend ?? "na"}
                />

                <WeekCard
                  title="LAST WEEK"
                  range={fmtRange(lastWeek?.range)}
                  completedDays={lastWeek?.completedDays ?? 0}
                  topEmotion={lastWeek?.topEmotion ?? null}
                  trend={lastWeek?.trend ?? "na"}
                />
              </div>

              <div className="mt-4 rounded-3xl border border-white/15 bg-white/5 p-5">
                <p
                  className="text-[12px] text-white/60"
                  style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
                >
                  SOFT INSIGHTS
                </p>

                {insights.length ? (
                  <ul className="mt-3 space-y-2 text-[13px] text-white/85">
                    {insights.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-white/50" />
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

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href="/daily"
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
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
  trend: "up" | "flat" | "down" | "na";
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[12px] text-white/60"
            style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
          >
            {title}
          </p>
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
    <div className="mt-10 text-left">
      <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
        <p
          className="text-[12px] text-white/60"
          style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
        >
          {title}
        </p>
        <p className="mt-2 text-[14px] text-white/85">{text}</p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {onPrimaryClick ? (
            <button
              type="button"
              onClick={onPrimaryClick}
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
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
              className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
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
    </div>
  );
}
