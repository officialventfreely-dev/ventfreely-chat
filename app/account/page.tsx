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

type AccessResult = {
  hasAccess: boolean;
  reason: "trial_active" | "premium_active" | "trial_expired";
  trialEndsAt: string | null;
  premiumUntil: string | null;
  status: string | null;
};

type Overview = {
  email: string | null;
  access: AccessResult;
  prefs: {
    memoryEnabled: boolean;
    reflectionMemoryEnabled: boolean;
  };
};

type Gate = "loading" | "unauthorized" | "ok" | "error";

function badgeText(access: AccessResult) {
  if (access.reason === "premium_active") return "Premium active";
  if (access.reason === "trial_active") return "Trial active";
  return "Trial ended";
}

function softDate(iso: string | null) {
  if (!iso) return null;
  const t = new Date(iso);
  if (!Number.isFinite(t.getTime())) return null;
  return t.toISOString().slice(0, 10);
}

export default function AccountPage() {
  const [gate, setGate] = useState<Gate>("loading");
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const memoryEnabled = data?.prefs.memoryEnabled ?? true;
  const reflectionMemoryEnabled = data?.prefs.reflectionMemoryEnabled ?? true;

  const premiumLabel = useMemo(() => {
    if (!data?.access) return "—";
    return badgeText(data.access);
  }, [data]);

  const untilText = useMemo(() => {
    if (!data?.access) return null;
    const prem = softDate(data.access.premiumUntil);
    const trial = softDate(data.access.trialEndsAt);

    if (data.access.reason === "premium_active" && prem) return `Until ${prem}`;
    if (data.access.reason === "trial_active" && trial) return `Trial ends ${trial}`;
    if (data.access.reason === "trial_expired") return "Upgrade to continue";
    return null;
  }, [data]);

  async function load() {
    setGate("loading");
    setToast(null);
    try {
      const res = await fetch("/api/account/overview", { cache: "no-store" });
      if (res.status === 401) {
        setGate("unauthorized");
        setData(null);
        return;
      }
      if (!res.ok) {
        setGate("error");
        setData(null);
        return;
      }
      const json = (await res.json()) as Overview;
      setData(json);
      setGate("ok");
    } catch {
      setGate("error");
      setData(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setPrefs(next: Partial<Overview["prefs"]>) {
    if (!data) return;
    setBusy("prefs");
    setToast(null);
    try {
      const res = await fetch("/api/account/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.status === 401) {
        setGate("unauthorized");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setToast(j?.error ?? "Could not update preferences.");
        return;
      }

      // optimistic update
      setData({
        ...data,
        prefs: { ...data.prefs, ...next },
      });

      setToast("Saved.");
      window.setTimeout(() => setToast(null), 1200);
    } finally {
      setBusy(null);
    }
  }

  async function doClear(kind: "memory" | "chat" | "daily") {
    const map: Record<typeof kind, string> = {
      memory: "/api/account/clear-memory",
      chat: "/api/account/clear-chat",
      daily: "/api/account/clear-daily",
    };

    const confirmText =
      kind === "memory"
        ? "Clear your saved memory?"
        : kind === "chat"
        ? "Clear your chat history?"
        : "Clear your daily reflections?";

    if (!window.confirm(confirmText)) return;

    setBusy(kind);
    setToast(null);
    try {
      const res = await fetch(map[kind], { method: "POST" });
      if (res.status === 401) {
        setGate("unauthorized");
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast(j?.error ?? "Could not clear.");
        return;
      }
      setToast("Cleared.");
      window.setTimeout(() => setToast(null), 1200);
    } finally {
      setBusy(null);
    }
  }

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

      <AppTopHeader />

      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <section className="mx-auto max-w-xl text-center">
          <h1
            className="text-5xl font-semibold md:text-6xl"
            style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}
          >
            ACCOUNT
          </h1>

          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
            Manage privacy, memory, and your data.
          </p>

          {/* gate */}
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
                Please log in to manage your account.
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

          {gate === "error" && (
            <Card>
              <p
                className="text-[12px] text-white/60"
                style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
              >
                SOMETHING WENT WRONG
              </p>
              <p className="mt-2 text-[14px] text-white/85">
                Couldn’t load your account. Try again.
              </p>

              <button
                onClick={load}
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
                style={{
                  fontFamily: "var(--font-subheading)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Retry
              </button>
            </Card>
          )}

          {gate === "ok" && data && (
            <>
              {/* status */}
              <div className="mt-8 grid gap-3 text-left">
                <Card>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className="text-[12px] text-white/60"
                        style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
                      >
                        STATUS
                      </p>
                      <p className="mt-2 text-[14px] text-white/85">
                        {data.email ?? "—"}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] text-white/85">
                        {premiumLabel}
                      </span>
                      {untilText ? (
                        <p className="mt-2 text-[11px] text-white/55">{untilText}</p>
                      ) : null}
                    </div>
                  </div>

                  {data.access.reason === "trial_expired" ? (
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
                  ) : (
                    <div className="mt-5 flex items-center justify-between">
                      <Link href="/chat" className="text-[12px] text-white/60 hover:text-white/80">
                        Chat →
                      </Link>
                      <Link href="/insights" className="text-[12px] text-white/60 hover:text-white/80">
                        Insights →
                      </Link>
                    </div>
                  )}
                </Card>

                {/* preferences */}
                <Card>
                  <p
                    className="text-[12px] text-white/60"
                    style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
                  >
                    PREFERENCES
                  </p>

                  <div className="mt-4 space-y-3">
                    <ToggleRow
                      title="Use memory in chat"
                      desc="If enabled, Ventfreely can use your saved memory to feel more consistent."
                      value={memoryEnabled}
                      disabled={busy === "prefs"}
                      onChange={(v) => setPrefs({ memoryEnabled: v })}
                    />

                    <div className="h-px bg-white/10" />

                    <ToggleRow
                      title="Save reflections into memory"
                      desc="If enabled, your Daily reflections can update your saved memory."
                      value={reflectionMemoryEnabled}
                      disabled={busy === "prefs"}
                      onChange={(v) => setPrefs({ reflectionMemoryEnabled: v })}
                    />
                  </div>

                  <p className="mt-4 text-[11px] text-white/50">
                    Your data stays private. You can clear everything any time.
                  </p>
                </Card>

                {/* data controls */}
                <Card>
                  <p
                    className="text-[12px] text-white/60"
                    style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
                  >
                    DATA CONTROLS
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <ActionButton
                      label={busy === "memory" ? "Clearing…" : "Clear memory"}
                      onClick={() => doClear("memory")}
                      disabled={!!busy}
                    />
                    <ActionButton
                      label={busy === "chat" ? "Clearing…" : "Clear chat"}
                      onClick={() => doClear("chat")}
                      disabled={!!busy}
                    />
                    <ActionButton
                      label={busy === "daily" ? "Clearing…" : "Clear daily"}
                      onClick={() => doClear("daily")}
                      disabled={!!busy}
                    />
                  </div>

                  <p className="mt-4 text-[11px] text-white/50">
                    Clearing is permanent. This won’t affect your subscription.
                  </p>
                </Card>

                {/* toast */}
                {toast ? (
                  <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-center text-[12px] text-white/85">
                    {toast}
                  </div>
                ) : null}

                <div className="mt-2 flex items-center justify-between">
                  <Link href="/" className="text-[12px] text-white/60 hover:text-white/80">
                    Back home
                  </Link>
                  <span className="text-[11px] text-white/45">
                    Control builds trust.
                  </span>
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

function ToggleRow({
  title,
  desc,
  value,
  disabled,
  onChange,
}: {
  title: string;
  desc: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[14px] text-white/90">{title}</p>
        <p className="mt-1 text-[12px] text-white/60 leading-relaxed">{desc}</p>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={[
          "relative h-8 w-14 flex-shrink-0 rounded-full border transition",
          value ? "border-white/40 bg-white/25" : "border-white/15 bg-white/10",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-white/15",
        ].join(" ")}
        aria-pressed={value}
      >
        <span
          className={[
            "absolute top-1 h-6 w-6 rounded-full bg-white transition-all",
            value ? "left-7" : "left-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-[12px] transition",
        "border border-white/15 bg-white/10 text-white/85 hover:bg-white/15",
        "disabled:opacity-60 disabled:cursor-not-allowed",
      ].join(" ")}
      style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.06em", textTransform: "uppercase" }}
    >
      {label}
    </button>
  );
}
