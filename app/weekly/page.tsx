"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type WeeklyData = {
  range: { start: string; end: string };
  completedDays: number;
  topEmotion: string | null;
  trend: "up" | "flat" | "down" | "na";
  trendLabel?: string;
  suggestion?: string;
  series: Array<{
    date: string;
    score: number;
    emotion: string;
    energy: string;
  }>;
};

export default function WeeklyPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<number | null>(null);
  const [data, setData] = useState<WeeklyData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        // IMPORTANT: your API path is /api/daily/week (not weekly)
        const res = await fetch("/api/daily/week", { method: "GET" });

        if (cancelled) return;

        setStatus(res.status);

        if (res.ok) {
          const json = await res.json();
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

  // Fallbacks (in case trendLabel/suggestion not returned)
  const trendLabel =
    data?.trendLabel ??
    (data?.trend === "up"
      ? "Trending up ↑"
      : data?.trend === "down"
      ? "Trending down ↓"
      : data?.trend === "flat"
      ? "Staying steady →"
      : "Not enough data yet");

  const suggestion =
    data?.suggestion ??
    (data?.trend === "up"
      ? "You’ve been building momentum. Keep it gentle — small wins count."
      : data?.trend === "down"
      ? "This week may have felt heavier. Try one small good thing per day — that’s enough."
      : data?.trend === "flat"
      ? "Steady weeks are progress too. Keep the routine simple and doable."
      : "Do a few more days and you’ll start seeing a clearer pattern.");

  return (
    <div className="min-h-screen bg-[#0b0614] text-white">
      <div className="mx-auto max-w-md px-5 pt-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="opacity-90 text-sm">
            ← Home
          </Link>
          <div className="text-sm opacity-80">Weekly</div>
        </div>

        <h1 className="mt-6 text-2xl font-semibold">Your Week</h1>
        <p className="mt-1 text-sm opacity-80">
          A calm summary of your last 7 days.
        </p>

        {/* Main card */}
        <div className="mt-6 rounded-2xl bg-white/10 p-5 shadow-sm">
          {/* Loading */}
          {loading && (
            <div className="text-sm opacity-80">Loading your weekly report…</div>
          )}

          {/* 401 - Unauthorized */}
          {!loading && status === 401 && (
            <div>
              <div className="text-base font-medium">Log in to see your week</div>
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
                  className="rounded-xl bg-white/20 px-4 py-2 text-sm font-medium"
                >
                  Create account
                </Link>
              </div>
            </div>
          )}

          {/* 402 - Premium required */}
          {!loading && status === 402 && (
            <div>
              <div className="text-base font-medium">Weekly is Premium</div>
              <p className="mt-2 text-sm opacity-80">
                Unlock Premium to view your weekly reflection summary.
              </p>
              <div className="mt-4">
                <a
                  href="https://ventfreely.com/checkouts/cn/hWN7GGnQzaRXVfX1lEc8TNBb/en-ee?_r=AQABKeCP8HYH1psvfNVgYdhHcOQv4nKIXPtf9iIbwGwZYbY&preview_theme_id=191156912392"
                  className="inline-flex rounded-xl bg-white text-black px-4 py-2 text-sm font-medium"
                >
                  Unlock Premium
                </a>
              </div>
            </div>
          )}

          {/* Error state */}
          {!loading && status !== 401 && status !== 402 && !data && (
            <div>
              <div className="text-base font-medium">Couldn’t load report</div>
              <p className="mt-2 text-sm opacity-80">
                Please try again in a moment.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-xl bg-white/20 px-4 py-2 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* OK state */}
          {!loading && data && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="space-y-2">
                <div className="text-sm opacity-80">
                  {data.completedDays} of 7 days completed
                  {data.range?.start && data.range?.end ? (
                    <span className="opacity-60">
                      {" "}
                      · {data.range.start} → {data.range.end}
                    </span>
                  ) : null}
                </div>

                <div className="text-base font-medium">{trendLabel}</div>

                <div className="text-sm opacity-80">
                  Most felt emotion:{" "}
                  <span className="text-white font-medium">
                    {data.topEmotion ?? "—"}
                  </span>
                </div>
              </div>

              {/* Suggestion */}
              <div className="rounded-xl bg-white/10 p-4">
                <div className="text-xs uppercase tracking-wide opacity-70">
                  Gentle suggestion
                </div>
                <div className="mt-2 text-sm leading-relaxed opacity-90">
                  {suggestion}
                </div>
              </div>

              {/* This week list (super simple, no charts) */}
              <div className="rounded-xl bg-white/10 p-4">
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
                      No reflections yet in the last 7 days.
                    </div>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div className="pt-1">
                <Link
                  href="/daily"
                  className="inline-flex rounded-xl bg-white text-black px-4 py-2 text-sm font-medium"
                >
                  Do today’s reflection
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-xs opacity-60">
          Keep it simple. Small moments count.
        </div>
      </div>
    </div>
  );
}
