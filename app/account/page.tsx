// FILE: app/account/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppTopHeader } from "@/app/components/AppTopHeader";

const CHECKOUT_URL =
  "https://ventfreely.com/checkouts/cn/hWN7GGnQzaRXVfX1lEc8TNBb/en-ee?_r=AQABKeCP8HYH1psvfNVgYdhHcOQv4nKIXPtf9iIbwGwZYbY&preview_theme_id=191156912392";

// If you have a real "Manage subscription" URL later, replace this.
// For now we reuse checkout to keep it simple.
const MANAGE_URL = CHECKOUT_URL;

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

/**
 * GlowCard – sama “ere lilla outline + glow outside” vibe.
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
        style={{ boxShadow: `inset 0 0 0 1.5px rgba(${PURPLE},${LINE_ALPHA})` }}
      />
      <div
        className="pointer-events-none absolute -inset-[2px] rounded-[2rem]"
        style={{ boxShadow: `0 0 18px rgba(${PURPLE},${GLOW_ALPHA})` }}
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

/** Inline icons (no packages) */
function IconSparkle(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"} fill="none" aria-hidden="true">
      <path
        d="M12 2l1.2 5.1L18 9l-4.8 1.9L12 16l-1.2-5.1L6 9l4.8-1.9L12 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 13.5l.6 2.4 2.4.6-2.4.6-.6 2.4-.6-2.4-2.4-.6 2.4-.6.6-2.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLock(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"} fill="none" aria-hidden="true">
      <path
        d="M7.5 10V8.2A4.5 4.5 0 0 1 12 3.7 4.5 4.5 0 0 1 16.5 8.2V10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M7 10h10a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUser(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"} fill="none" aria-hidden="true">
      <path
        d="M20 21a8 8 0 0 0-16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 13a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 13Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCalendar(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"} fill="none" aria-hidden="true">
      <path
        d="M7 3v3M17 3v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M4.5 8.5h15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6.5 5.5h11A2 2 0 0 1 19.5 7.5v12A2 2 0 0 1 17.5 21.5h-11A2 2 0 0 1 4.5 19.5v-12A2 2 0 0 1 6.5 5.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function IconBrain(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"} fill="none" aria-hidden="true">
      <path
        d="M9.5 4.5c-2 0-3.5 1.6-3.5 3.5v.6A3 3 0 0 0 4 11.4v.1A3 3 0 0 0 6 14.3V15c0 2 1.6 3.5 3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M14.5 4.5c2 0 3.5 1.6 3.5 3.5v.6A3 3 0 0 1 20 11.4v.1a3 3 0 0 1-2 2.8V15c0 2-1.6 3.5-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M12 5v14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

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

function accessBadge(access: AccessResult) {
  if (access.reason === "premium_active")
    return (
      <Pill>
        <IconSparkle className="h-4 w-4" />
        Premium
      </Pill>
    );
  if (access.reason === "trial_active")
    return (
      <Pill>
        <IconLock className="h-4 w-4" />
        Trial
      </Pill>
    );
  return <Pill>—</Pill>;
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
    <main className="min-h-screen w-full" style={{ color: "white" }}>
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: "var(--vf-bg)" }} />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#A855F7]/20 blur-[120px]" />
      </div>

      {/* Unified header */}
      <AppTopHeader active="account" />

      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <section className="mx-auto max-w-xl text-center">
          <GlowCard>
            <div className="px-6 py-9 md:px-8 text-left">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Eyebrow>ACCOUNT</Eyebrow>
                  <h1
                    className="mt-2 text-[26px] font-semibold text-white/95 md:text-[32px]"
                    style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}
                  >
                    Your access & patterns
                  </h1>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                    Read-only overview. Gentle hints — not labels.
                  </p>
                </div>

                <Link href="/chat" className="mt-1 text-[12px] text-white/60 hover:text-white/80">
                  Chat →
                </Link>
              </div>

              {/* Loading */}
              {gate === "loading" && (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[13px] text-white/70">Loading your account…</p>
                </div>
              )}

              {/* Unauthorized */}
              {gate === "unauthorized" && (
                <div className="mt-6">
                  <GateCard
                    icon="🔒"
                    title="LOG IN"
                    text="Log in to view your account."
                    primaryHref="/login"
                    primaryText="Log in"
                    secondaryHref="/signup"
                    secondaryText="Create account"
                  />
                </div>
              )}

              {/* Error */}
              {gate === "error" && (
                <div className="mt-6">
                  <GateCard
                    icon="⚠️"
                    title="COULDN’T LOAD"
                    text="Please try again in a moment."
                    primaryHref="/account"
                    primaryText="Retry"
                    secondaryHref="/"
                    secondaryText="Back home"
                    onPrimaryClick={() => window.location.reload()}
                    useButtonForPrimary
                  />
                </div>
              )}

              {/* OK */}
              {gate === "ok" && data && access && (
                <div className="mt-6 space-y-4">
                  {/* Access */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Eyebrow>✨ YOUR ACCESS</Eyebrow>
                        <p className="mt-2 text-[15px] font-semibold text-white/90">{accessLabel(access)}</p>
                        <p className="mt-1 text-[12px] text-white/60">
                          Status: <span className="text-white/80">{(access.status ?? "—").toString()}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {accessBadge(access)}
                        {data.user?.email ? (
                          <Pill>
                            <IconUser className="h-4 w-4" />
                            {data.user.email}
                          </Pill>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <MiniStat
                        icon={<IconCalendar className="h-4 w-4" />}
                        label="Premium until"
                        value={access.reason === "premium_active" ? fmtDate(access.premiumUntil) : "—"}
                      />
                      <MiniStat
                        icon={<IconCalendar className="h-4 w-4" />}
                        label="Trial ends"
                        value={access.reason === "trial_active" ? fmtDate(access.trialEndsAt) : "—"}
                      />
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      {access.hasAccess ? (
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
                      ) : (
                        <Link
                          href={CHECKOUT_URL}
                          className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[var(--vf-ink)] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
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
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Eyebrow>🧠 YOUR PATTERNS</Eyebrow>
                        <p className="mt-2 text-[13px] text-white/70">
                          Gentle hints from recent check-ins. Not facts. Not labels.
                        </p>
                      </div>
                      <Pill>
                        <IconBrain className="h-4 w-4" />
                        Read-only
                      </Pill>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-[11px] text-white/50">Dominant emotions</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {emotions.length ? emotions.map((e) => <Tag key={e}>{e}</Tag>) : <Empty />}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-[11px] text-white/50">Energy tendency</p>
                        <p className="mt-2 text-[13px] text-white/85">{memory?.energy_pattern ?? "—"}</p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                        <p className="text-[11px] text-white/50">Themes (optional)</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {themes.length ? themes.map((t) => <Tag key={t}>{t}</Tag>) : <Empty />}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                        <p className="text-[11px] text-white/50">Preferred tone</p>
                        <p className="mt-2 text-[13px] text-white/85">{memory?.preferred_tone ?? "—"}</p>
                      </div>
                    </div>

                    <p className="mt-4 text-[11px] text-white/45">
                      Tip: do Daily a few more days and this becomes clearer.
                    </p>
                  </div>

                  {/* Small nav */}
                  <div className="flex items-center justify-between">
                    <Link href="/" className="text-[12px] text-white/60 hover:text-white/80">
                      Back home
                    </Link>
                    <div className="flex items-center gap-4">
                      <Link href="/weekly" className="text-[12px] text-white/60 hover:text-white/80">
                        Weekly →
                      </Link>
                      <Link href="/insights" className="text-[12px] text-white/60 hover:text-white/80">
                        Insights →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </GlowCard>

          <p className="mt-8 text-center text-[11px] text-white/45">
            Calm, not perfect. Patterns are just hints — not labels.
          </p>
        </section>
      </div>
    </main>
  );
}

function Empty() {
  return <span className="text-[12px] text-white/60">—</span>;
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-2 text-[11px] text-white/50">
        {icon ? <span className="text-white/55">{icon}</span> : null}
        <span>{label}</span>
      </div>
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
      <p
        className="text-[12px] text-white/60"
        style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
      >
        {icon ? `${icon} ` : ""}
        {title}
      </p>
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
  );
}
