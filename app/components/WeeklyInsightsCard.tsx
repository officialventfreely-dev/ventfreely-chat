"use client";

import { useEffect, useMemo, useState } from "react";

type Trend = "up" | "flat" | "down" | "na";

type WeeklyInsightsResponse = {
  completedDays: number;
  topEmotion: string | null;
  trend: Trend;
  insights: string[];
};

const CHECKOUT_URL =
  "https://ventfreely.com/checkouts/cn/hWN7GGnQzaRXVfX1lEc8TNBb/en-ee?_r=AQABKeCP8HYH1psvfNVgYdhHcOQv4nKIXPtf9iIbwGwZYbY&preview_theme_id=191156912392";

function trendLabel(trend: Trend) {
  if (trend === "up") return "Up";
  if (trend === "down") return "Down";
  if (trend === "flat") return "Steady";
  return "Not enough data";
}

function trendSymbol(trend: Trend) {
  if (trend === "up") return "↗";
  if (trend === "down") return "↘";
  if (trend === "flat") return "→";
  return "•";
}

type ViewState =
  | { kind: "loading" }
  | { kind: "unauthorized" }
  | { kind: "paywall" }
  | { kind: "error"; message?: string }
  | { kind: "ok"; data: WeeklyInsightsResponse };

export function WeeklyInsightsCard() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  async function load() {
    setState({ kind: "loading" });

    try {
      const res = await fetch("/api/insights/weekly", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (res.status === 401) {
        setState({ kind: "unauthorized" });
        return;
      }

      if (res.status === 402) {
        setState({ kind: "paywall" });
        return;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setState({ kind: "error", message: txt || "Request failed" });
        return;
      }

      const data = (await res.json()) as WeeklyInsightsResponse;

      setState({
        kind: "ok",
        data: {
          completedDays: Number.isFinite(data.completedDays) ? data.completedDays : 0,
          topEmotion: data.topEmotion ?? null,
          trend: (data.trend ?? "na") as Trend,
          insights: Array.isArray(data.insights) ? data.insights.slice(0, 4) : [],
        },
      });
    } catch (e: any) {
      setState({ kind: "error", message: e?.message || "Network error" });
    }
  }

  useEffect(() => {
    load();
  }, []);

  const headerRight = useMemo(() => {
    if (state.kind !== "ok") return null;
    return (
      <div className="flex items-center gap-2 text-xs text-white/80">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
          <span className="text-white/90">{trendSymbol(state.data.trend)}</span>
          <span>{trendLabel(state.data.trend)}</span>
        </span>
      </div>
    );
  }, [state]);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-white">Weekly Insights</div>
          <div className="mt-1 text-xs text-white/70">A soft summary of the last 7 days.</div>
        </div>
        {headerRight}
      </div>

      <div className="mt-4">
        {state.kind === "loading" && (
          <div className="space-y-3">
            <div className="h-4 w-2/3 rounded bg-white/10" />
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-11/12 rounded bg-white/10" />
            <div className="h-3 w-10/12 rounded bg-white/10" />
          </div>
        )}

        {state.kind === "unauthorized" && (
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-sm text-white">You’re not logged in.</div>
            <div className="mt-1 text-xs text-white/70">
              Log in to see your weekly insights.
            </div>

            <div className="mt-3 flex gap-2">
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-medium text-black"
              >
                Log in
              </a>
              <a
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white"
              >
                Create account
              </a>
            </div>
          </div>
        )}

        {state.kind === "paywall" && (
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-sm text-white">Premium required.</div>
            <div className="mt-1 text-xs text-white/70">
              Weekly insights are part of Premium.
            </div>

            <div className="mt-3 flex gap-2">
              <a
                href={CHECKOUT_URL}
                className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-medium text-black"
              >
                Unlock Premium
              </a>
              <button
                onClick={load}
                className="inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {state.kind === "error" && (
          <div className="rounded-xl bg-white/5 p-3">
            <div className="text-sm text-white">Something went wrong.</div>
            <div className="mt-1 text-xs text-white/70">
              {state.message ? state.message.slice(0, 140) : "Please try again."}
            </div>

            <div className="mt-3">
              <button
                onClick={load}
                className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-medium text-black"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {state.kind === "ok" && (
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-1 text-xs text-white/85">
                {state.data.completedDays === 0 ? (
                  <>
                    Days: <span className="ml-1 font-semibold text-white">No check-ins yet</span>
                  </>
                ) : (
                  <>
                    Days:{" "}
                    <span className="ml-1 font-semibold text-white">
                      {state.data.completedDays}
                    </span>
                    /7
                  </>
                )}
              </span>

              <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-1 text-xs text-white/85">
                Top emotion:{" "}
                <span className="ml-1 font-semibold text-white">
                  {state.data.topEmotion ?? "—"}
                </span>
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {(state.data.insights.length ? state.data.insights : ["No insights yet for this week."]).map(
                (line, idx) => (
                  <div
                    key={idx}
                    className="flex gap-2 rounded-xl bg-white/5 p-3 text-sm text-white/90"
                  >
                    <span className="mt-0.5 text-white/50">•</span>
                    <span className="leading-relaxed">{line}</span>
                  </div>
                )
              )}
            </div>

            {/* Soft navigation CTA when empty week */}
            {state.data.completedDays === 0 && (
              <div className="mt-3 flex gap-2">
                <a
                  href="/daily"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-medium text-black"
                >
                  Go to Daily
                </a>
                <a
                  href="/weekly"
                  className="inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white"
                >
                  View Weekly
                </a>
              </div>
            )}

            <div className="mt-3 text-[11px] text-white/55">
              This is a gentle snapshot — not a diagnosis or advice.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
