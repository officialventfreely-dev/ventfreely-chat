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

type Week = {
  range: { start: string; end: string };
  completedDays: number;
  topEmotion: string | null;
  trend: Trend;
  series: Array<{ date: string; score: number; emotion: string; energy: string }>;
  insights: string[];
};

type CompareData = {
  thisWeek: Week;
  lastWeek: Week;
  change: { deltaDays: number; note: string };
};

type Gate = "loading" | "ok" | "unauthorized" | "paywall" | "error";

function trendChip(t: Trend) {
  if (t === "up") return "↑ Improving";
  if (t === "down") return "↓ Lower";
  if (t === "flat") return "→ Steady";
  return "• Not enough data";
}

export default function InsightsPage() {
  const [gate, setGate] = useState<Gate>("loading");
  const [data, setData] = useState<CompareData | null>(null);

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

        const json = (await res.json()) as CompareData;
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

  const changeNote = data?.change?.note ?? "";

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
            <Link className="rounded-full px-3 py-1 hover:bg-white/10" href="/weekly">
              Weekly
            </Link>
            <Link className="rounded-full px-3 py-1 hover:bg-white/10" href="/daily">
              Daily
            </Link>
            <Link className="rounded-full px-3 py-1 hover:bg-white/10" href="/chat">
              Chat
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <section className="mx-auto max-w-3xl text-center">
          <h1
            className="text-5xl font-semibold md:text-6xl"
            style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}
          >
            INSIGHTS
          </h1>

          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
            A soft snapshot of your last 7 days — and how it compares to the week before.
          </p>

          {/* Gate states */}
          {gate === "loading" && (
            <Card>
              <p className="text-[13px] text-white/70">Loading…</p>
            </Card>
          )}

          {gate === "unauthorized" && (
            <Card>
              <p
                className="text-[12px] text-white/60"
                style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
              >
                LOG IN REQUIRED
              </p>
              <p className="mt-2 text-[14px] text-white/85">
                Please log in to view your insights.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
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
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-4 text-white transition hover:bg-white/15 active:scale-[0.99] sm:w-auto"
                  style={{
                    fontFamily: "var(--font-subheading)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Create account
                </Link>
              </div>
            </Card>
          )}

          {gate === "paywall" && (
            <Card>
              <p
                className="text-[12px] text-white/60"
                style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
              >
                PREMIUM REQUIRED
              </p>
              <p className="mt-2 text-[14px] text-white/85">
                Insights are part of Premium.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={CHECKOUT_URL}
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
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
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-4 text-white transition hover:bg-white/15 active:scale-[0.99] sm:w-auto"
                  style={{
                    fontFamily: "var(--font-subheading)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Open Daily
                </Link>
              </div>
            </Card>
          )}

          {gate === "error" && (
            <Card>
              <p
                className="text-[12px] text-white/60"
                style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
              >
                COULDN’T LOAD
              </p>
              <p className="mt-2 text-[14px] text-white/85">
                Please try again in a moment.
              </p>

              <div className="mt-5">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
                  style={{
                    fontFamily: "var(--font-subheading)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Retry
                </button>
              </div>
            </Card>
          )}

          {/* OK */}
          {gate === "ok" && data && (
            <>
              <div className="mt-8 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[12px] text-white/85">
                {changeNote}
              </div>

              <div className="mt-6 grid gap-3 text-left md:grid-cols-2">
                <WeekCard title="THIS WEEK" week={data.thisWeek} />
                <WeekCard title="LAST WEEK" week={data.lastWeek} />
              </div>

              <div className="mt-8 text-center">
                <p className="text-[11px] text-white/45">
                  This is a gentle snapshot — not a diagnosis or advice.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                  <Link
                    href="/daily"
                    className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
                    style={{
                      fontFamily: "var(--font-subheading)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Do today’s reflection
                  </Link>
                  <Link
                    href="/weekly"
                    className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-4 text-white transition hover:bg-white/15 active:scale-[0.99] sm:w-auto"
                    style={{
                      fontFamily: "var(--font-subheading)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Weekly report
                  </Link>
                </div>

                <div className="mt-5">
                  <Link href="/" className="text-[12px] text-white/60 hover:text-white/80">
                    Back home
                  </Link>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mt-8 rounded-3xl border border-white/15 bg-white/5 p-5 text-left">{children}</div>;
}

function WeekCard({ title, week }: { title: string; week: Week }) {
  const chip = useMemo(() => trendChip(week.trend), [week.trend]);

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
          <p className="mt-2 text-[14px] text-white/85">
            Days: {week.completedDays}/7
          </p>
          <p className="mt-1 text-[12px] text-white/60">
            Top emotion:{" "}
            <span className="text-white/85 font-medium">{week.topEmotion ?? "—"}</span>
          </p>
        </div>

        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] text-white/85">
          {chip}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="space-y-2 text-[13px] text-white/90">
          {(week.insights?.length ? week.insights : ["Not enough data yet."]).map((line, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="text-white/50">•</span>
              <span className="text-white/85">{line}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[11px] text-white/45">
        {week.range.start} → {week.range.end}
      </p>
    </div>
  );
}
