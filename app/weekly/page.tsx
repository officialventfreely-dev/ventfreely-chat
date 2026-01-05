"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
    <div className="min-h-screen bg-[#0b0614] text-white">
      <div className="mx-auto max-w-md px-5 pt-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xs opacity-85 hover:opacity-100">
            ← Home
          </Link>
          <div className="text-xs opacity-70">Weekly</div>
        </div>

        <h1 className="mt-5 text-xl font-semibold">Your Week</h1>
        <p className="mt-1 text-sm opacity-80">
          A calm summary of the last 7 days.
        </p>

        {/* Main card */}
        <div className="mt-6 rounded-2xl bg-white/10 p-5 border border-white/10">
          {/* Loading */}
          {loading && (
            <div className="text-sm opacity-80">Loading your weekly report…</div>
          )}

          {/* 401 - Unauthorized */}
          {!loading && status === 401 && (
            <div>
              <div className="text-sm font-medium">Log in to see your week</div>
              <p className="mt-2 text-sm opacity-80">
                Your weekly report is tied to your account.
              </p>
              <div className="mt-4 flex gap-2">
                <Link
                  href="/login"
                  className="rounded-xl bg-white text-black px-4 py-2 text-sm font-medium"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium"
                >
                  Create account
                </Link>
              </div>
            </div>
          )}

          {/* 402 - Premium required */}
          {!loading && status === 402 && (
            <div>
              <div className="text-sm font-medium">Weekly is Premium</div>
              <p className="mt-2 text-sm opacity-80">
                Unlock Premium to view your weekly summary.
              </p>
              <div className="mt-4 flex gap-2">
                <a
                  href={CHECKOUT_URL}
                  className="rounded-xl bg-white text-black px-4 py-2 text-sm font-medium"
                >
                  Unlock Premium
                </a>
                <Link
                  href="/daily"
                  className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium"
                >
                  Open Daily
                </Link>
              </div>
            </div>
          )}

          {/* Error */}
          {!loading && status !== 401 && status !== 402 && !data && (
            <div>
              <div className="text-sm font-medium">Couldn’t load report</div>
              <p className="mt-2 text-sm opacity-80">
                Please try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* OK */}
          {!loading && data && (
            <div className="space-y-4">
              {/* Summary */}
              <div>
                <div className="text-sm opacity-80">
                  {data.completedDays} of 7 days completed
                  {data.range?.start && data.range?.end ? (
                    <span className="opacity-60">
                      {" "}
                      · {data.range.start} → {data.range.end}
                    </span>
                  ) : null}
                </div>

                <div className="mt-2 text-base font-medium">{trendLabel}</div>

                <div className="mt-1 text-sm opacity-80">
                  Most felt:{" "}
                  <span className="text-white font-medium">
                    {data.topEmotion ?? "—"}
                  </span>
                </div>
              </div>

              {/* 7-day dots */}
              <div className="rounded-xl bg-white/10 p-4 border border-white/10">
                <div className="text-xs uppercase tracking-wide opacity-70">
                  Last 7 days
                </div>
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
                  <span className="ml-2 text-xs opacity-70">{data.completedDays}/7</span>
                </div>
              </div>

              {/* Suggestion (✅ guaranteed) */}
              <div className="rounded-xl bg-white/10 p-4 border border-white/10">
                <div className="text-xs uppercase tracking-wide opacity-70">
                  Gentle suggestion
                </div>
                <div className="mt-2 text-sm leading-relaxed opacity-90">
                  {suggestion}
                </div>
              </div>

              {/* This week list */}
              <div className="rounded-xl bg-white/10 p-4 border border-white/10">
                <div className="text-xs uppercase tracking-wide opacity-70">
                  This week
                </div>

                <div className="mt-3 space-y-2">
                  {data.series?.length ? (
                    data.series.map((d) => (
                      <div
                        key={d.date}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="opacity-80">{d.date}</span>
                        <span className="opacity-90">
                          {d.emotion} · {d.energy}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm opacity-70">
                      No reflections yet.
                    </div>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div className="pt-1 flex gap-2">
                <Link
                  href="/daily"
                  className="rounded-xl bg-white text-black px-4 py-2 text-sm font-medium"
                >
                  Do today’s reflection
                </Link>
                <Link
                  href="/chat"
                  className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium"
                >
                  Open chat
                </Link>
              </div>

              {/* Quiet legal */}
              <p className="pt-2 text-[10px] opacity-60 leading-relaxed">
                Ventfreely is an AI companion, not a therapist. If you’re in immediate danger,
                contact local emergency services.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
