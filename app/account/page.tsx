// FILE: app/account/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Montserrat, Oswald, Barlow_Condensed } from "next/font/google";

const CHECKOUT_URL =
  "https://ventfreely.com/checkouts/cn/hWN7GGnQzaRXVfX1lEc8TNBb/en-ee?_r=AQABKeCP8HYH1psvfNVgYdhHcOQv4nKIXPtf9iIbwGwZYbY&preview_theme_id=191156912392";

// If you have a real "Manage subscription" URL later, replace this.
// For now we reuse checkout to keep it simple.
const MANAGE_URL = CHECKOUT_URL;

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

type UserMemoryRow = {
  dominant_emotions: string[] | null;
  recurring_themes: string[] | null;
  preferred_tone: string | null;
  energy_pattern: string | null;
  updated_at?: string | null;
};

type AccountSummary =
  | {
      user: { email: string | null };
      access: AccessResult;
      memory: UserMemoryRow | null;
    }
  | null;

type GateState = "loading" | "ok" | "unauthorized" | "error";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function accessLabel(access: AccessResult) {
  if (access?.reason === "premium_active") return "Premium active";
  if (access?.reason === "trial_active") return "Trial active";
  return "No access";
}

export default function AccountPage() {
  const [gate, setGate] = useState<GateState>("loading");
  const [data, setData] = useState<AccountSummary>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setGate("loading");
        const res = await fetch("/api/account/summary", { cache: "no-store" });
        if (!mounted) return;

        if (res.status === 401) return setGate("unauthorized");
        if (!res.ok) return setGate("error");

        const json = (await res.json()) as AccountSummary;
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

  const access = data?.access ?? null;
  const memory = data?.memory ?? null;

  const emotions = useMemo(() => memory?.dominant_emotions ?? [], [memory]);
  const themes = useMemo(() => memory?.recurring_themes ?? [], [memory]);

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
            <Link className="rounded-full px-3 py-1 hover:bg-white/10" href="/insights">
              Insights
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
            ACCOUNT
          </h1>

          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
            Your access and your calm patterns (read-only).
          </p>

          {gate === "loading" && (
            <div className="mt-10 rounded-3xl border border-white/15 bg-white/5 p-6 text-left">
              <p
                className="text-[12px] text-white/60"
                style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
              >
                LOADING
              </p>
              <p className="mt-2 text-[14px] text-white/80">Loading your account…</p>
            </div>
          )}

          {gate === "unauthorized" && (
            <SimpleCard
              title="LOG IN"
              text="Log in to view your account."
              primaryHref="/login"
              primaryText="Log in"
              secondaryHref="/signup"
              secondaryText="Create account"
            />
          )}

          {gate === "error" && (
            <SimpleCard
              title="COULDN’T LOAD"
              text="Please try again in a moment."
              primaryHref="/account"
              primaryText="Retry"
              secondaryHref="/"
              secondaryText="Back home"
              onPrimaryClick={() => window.location.reload()}
            />
          )}

          {gate === "ok" && data && access && (
            <div className="mt-10 text-left space-y-3">
              {/* Access */}
              <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
                <p
                  className="text-[12px] text-white/60"
                  style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
                >
                  YOUR ACCESS
                </p>

                <p className="mt-2 text-[15px] text-white/90">
                  {accessLabel(access)}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MiniStat label="Status" value={(access.status ?? "—").toString()} />
                  <MiniStat
                    label="Premium until"
                    value={access.reason === "premium_active" ? fmtDate(access.premiumUntil) : "—"}
                  />
                  <MiniStat
                    label="Trial ends"
                    value={access.reason === "trial_active" ? fmtDate(access.trialEndsAt) : "—"}
                  />
                  <MiniStat label="Email" value={data.user?.email ?? "—"} />
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  {access.hasAccess ? (
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
                  ) : (
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
                  )}

                  <Link
                    href={MANAGE_URL}
                    className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-4 text-white transition hover:bg-white/15 active:scale-[0.99] sm:w-auto"
                    style={{
                      fontFamily: "var(--font-subheading)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Manage subscription
                  </Link>
                </div>
              </div>

              {/* Patterns */}
              <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
                <p
                  className="text-[12px] text-white/60"
                  style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
                >
                  YOUR PATTERNS
                </p>

                <p className="mt-2 text-[13px] text-white/70">
                  These are gentle hints from your recent check-ins. Not facts. Not labels.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] text-white/50">Dominant emotions</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {emotions.length ? (
                        emotions.map((e) => <Tag key={e}>{e}</Tag>)
                      ) : (
                        <span className="text-[12px] text-white/60">—</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] text-white/50">Energy tendency</p>
                    <p className="mt-2 text-[13px] text-white/85">
                      {memory?.energy_pattern ?? "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                    <p className="text-[11px] text-white/50">Themes (optional)</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {themes.length ? (
                        themes.map((t) => <Tag key={t}>{t}</Tag>)
                      ) : (
                        <span className="text-[12px] text-white/60">—</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                    <p className="text-[11px] text-white/50">Preferred tone</p>
                    <p className="mt-2 text-[13px] text-white/85">
                      {memory?.preferred_tone ?? "—"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[11px] text-white/45">
                  Tip: do Daily a few more days and this becomes more accurate.
                </p>
              </div>

              {/* Small nav */}
              <div className="flex items-center justify-between">
                <Link href="/" className="text-[12px] text-white/60 hover:text-white/80">
                  Back home
                </Link>
                <Link href="/chat" className="text-[12px] text-white/60 hover:text-white/80">
                  Open chat →
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] text-white/50">{label}</p>
      <p className="mt-1 text-[14px] font-semibold text-white/85 break-words">{value}</p>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] text-white/85">
      {children}
    </span>
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
