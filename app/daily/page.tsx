// app/daily/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Montserrat, Oswald, Barlow_Condensed } from "next/font/google";
import { EMOTIONS, ENERGIES, type Emotion, type Energy } from "@/lib/dailyConfig";

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

type ReflectionRow = {
  id: string;
  user_id: string;
  date: string;
  positive_text: string;
  emotion: Emotion;
  energy: Energy;
  score: number;
  created_at: string;
};

type GateState = "ok" | "unauthorized" | "paywall" | "error";

const EMOTION_CHOICES = [
  {
    value: "Grateful" as const,
    emoji: "🤍",
    label: "Grateful",
    sub: "Appreciative",
    accent: "bg-emerald-400",
    glow: "shadow-[0_16px_45px_rgba(16,185,129,0.22)]",
    progress: "bg-emerald-300",
  },
  {
    value: "Calm" as const,
    emoji: "🙂",
    label: "Calm",
    sub: "Grounded",
    accent: "bg-sky-400",
    glow: "shadow-[0_16px_45px_rgba(56,189,248,0.22)]",
    progress: "bg-sky-300",
  },
  {
    value: "Happy" as const,
    emoji: "😄",
    label: "Happy",
    sub: "Light",
    accent: "bg-violet-400",
    glow: "shadow-[0_16px_45px_rgba(167,139,250,0.22)]",
    progress: "bg-violet-300",
  },
  {
    value: "Hopeful" as const,
    emoji: "🌱",
    label: "Hopeful",
    sub: "Forward",
    accent: "bg-pink-400",
    glow: "shadow-[0_16px_45px_rgba(244,114,182,0.22)]",
    progress: "bg-pink-300",
  },
] as const;

const ENERGY_CHOICES = [
  {
    value: "Low" as const,
    emoji: "🪫",
    label: "Low",
    sub: "Running out",
    accent: "bg-fuchsia-400",
    glow: "shadow-[0_16px_45px_rgba(232,121,249,0.22)]",
    progress: "bg-fuchsia-300",
    pct: 25,
  },
  {
    value: "Okay" as const,
    emoji: "😐",
    label: "Okay",
    sub: "Neutral",
    accent: "bg-violet-400",
    glow: "shadow-[0_16px_45px_rgba(167,139,250,0.22)]",
    progress: "bg-violet-300",
    pct: 50,
  },
  {
    value: "Good" as const,
    emoji: "⚡️",
    label: "Good",
    sub: "Decent",
    accent: "bg-sky-400",
    glow: "shadow-[0_16px_45px_rgba(56,189,248,0.22)]",
    progress: "bg-sky-300",
    pct: 75,
  },
  {
    value: "Great" as const,
    emoji: "🔥",
    label: "Great",
    sub: "Strong",
    accent: "bg-emerald-400",
    glow: "shadow-[0_16px_45px_rgba(16,185,129,0.22)]",
    progress: "bg-emerald-300",
    pct: 100,
  },
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function DailyPage() {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<string>("");
  const [existing, setExisting] = useState<ReflectionRow | null>(null);

  const [text, setText] = useState("");
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [energy, setEnergy] = useState<Energy | null>(null);

  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [focusBlock, setFocusBlock] = useState<"emotion" | "energy" | null>(null);
  const [progressTone, setProgressTone] = useState<"emotion" | "energy" | null>(null);

  const [gate, setGate] = useState<GateState>("ok");

  const emotionRef = useRef<HTMLDivElement | null>(null);
  const energyRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef<HTMLDivElement | null>(null);

  const canSubmit = useMemo(() => {
    return text.trim().length >= 3 && !!emotion && !!energy && !saving && gate === "ok";
  }, [text, emotion, energy, saving, gate]);

  const progressPercent = useMemo(() => {
    const a = text.trim().length >= 3 ? 1 : 0;
    const b = emotion ? 1 : 0;
    const c = energy ? 1 : 0;
    return Math.round(((a + b + c) / 3) * 100);
  }, [text, emotion, energy]);

  const progressHint = useMemo(() => {
    if (gate === "unauthorized") return "Log in to save your reflection.";
    if (gate === "paywall") return "Premium unlock required.";
    if (text.trim().length < 3) return "Write one good moment 👇";
    if (!emotion) return "Pick an emotion 👇";
    if (!energy) return "Pick your energy 👇";
    return "All set. Save it 👇";
  }, [gate, text, emotion, energy]);

  const progressClass = useMemo(() => {
    if (progressTone === "emotion" && emotion) {
      const match = EMOTION_CHOICES.find((c) => c.value === emotion);
      return match?.progress ?? "bg-white/70";
    }
    if (progressTone === "energy" && energy) {
      const match = ENERGY_CHOICES.find((c) => c.value === energy);
      return match?.progress ?? "bg-white/70";
    }
    return "bg-white/70";
  }, [progressTone, emotion, energy]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/daily/today", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));

        if (!mounted) return;

        if (res.status === 401) {
          setGate("unauthorized");
          setLoading(false);
          return;
        }
        if (res.status === 402) {
          setGate("paywall");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setGate("error");
          setLoading(false);
          return;
        }

        setGate("ok");
        setToday(data.today ?? "");
        setExisting(data.reflection ?? null);
        setSubmitted(!!data.reflection);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handlePickEmotion = (val: Emotion) => {
    setEmotion(val);
    setProgressTone("emotion");

    requestAnimationFrame(() => {
      setFocusBlock("energy");
      window.setTimeout(() => setFocusBlock(null), 650);
      energyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handlePickEnergy = (val: Energy) => {
    setEnergy(val);
    setProgressTone("energy");
    requestAnimationFrame(() => {
      doneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const save = async () => {
    if (!canSubmit) return;
    setSaving(true);

    try {
      const res = await fetch("/api/daily/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positive_text: text.trim(),
          emotion,
          energy,
        }),
      });

      if (res.status === 401) {
        setGate("unauthorized");
        return;
      }
      if (res.status === 402) {
        setGate("paywall");
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Could not save.");
        return;
      }

      setExisting(data.reflection);
      setSubmitted(true);

      requestAnimationFrame(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      });
    } finally {
      setSaving(false);
    }
  };

  const completed = submitted && existing;

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
              "radial-gradient(900px 500px at 50% 0%, rgba(255,255,255,0.08), transparent 60%), linear-gradient(180deg, #0B1634 0%, #07102A 55%, #061027 100%)",
          }}
        />
      </div>

      {/* Header (smaller ~2x, same as Home) */}
      <header className="w-full bg-[#401268]">
        <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-1.5">
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
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <section className="mx-auto max-w-xl text-center">
          <h1
            className="text-5xl font-semibold md:text-6xl"
            style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}
          >
            DAILY REFLECTION
          </h1>

          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/85">
            One minute. One good moment. That’s it.
          </p>

          {/* Progress */}
          <div className="mx-auto mt-6 max-w-xl">
            <div className="flex items-center justify-between text-[12px] text-white/70">
              <span style={{ fontFamily: "var(--font-subheading)" }}>Progress</span>
              <span className="text-white/70">{progressPercent}%</span>
            </div>

            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={[
                  "h-full rounded-full transition-all duration-500",
                  progressClass,
                ].join(" ")}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="mt-2 text-[12px] text-white/60">
              {today ? `Today: ${today} · ` : ""}
              {progressHint}
            </p>
          </div>

          {/* Gate states */}
          {!loading && gate === "unauthorized" && (
            <SimpleCard
              title="LOG IN TO SAVE"
              text="Saving your reflection requires an account."
              primaryHref="/login"
              primaryText="Log in"
              secondaryHref="/signup"
              secondaryText="Create account"
            />
          )}

          {!loading && gate === "paywall" && (
            <SimpleCard
              title="PREMIUM REQUIRED"
              text="Daily reflections are part of Premium."
              primaryHref={CHECKOUT_URL}
              primaryText="Unlock Premium"
              secondaryHref="/"
              secondaryText="Back home"
            />
          )}

          {!loading && gate === "error" && (
            <SimpleCard
              title="SOMETHING WENT WRONG"
              text="Please try again in a moment."
              primaryHref="/"
              primaryText="Back home"
            />
          )}

          {/* Completed */}
          {loading ? (
            <div className="mt-10 rounded-3xl border border-white/15 bg-white/5 p-6 text-left">
              <p className="text-[13px] text-white/70">Loading…</p>
            </div>
          ) : gate === "ok" && completed ? (
            <div className="mx-auto mt-10 max-w-xl text-left">
              <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
                <p
                  className="text-[12px] text-white/60"
                  style={{
                    fontFamily: "var(--font-subheading)",
                    letterSpacing: "0.08em",
                  }}
                >
                  COMPLETED TODAY ✅
                </p>

                <p className="mt-2 text-[15px] text-white/90">
                  “{existing.positive_text}”
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Tag>
                    {EMOTION_CHOICES.find((c) => c.value === existing.emotion)
                      ?.emoji}{" "}
                    {existing.emotion}
                  </Tag>
                  <Tag>
                    {ENERGY_CHOICES.find((c) => c.value === existing.energy)
                      ?.emoji}{" "}
                    {existing.energy}
                  </Tag>
                </div>

                <div className="mt-4 h-px bg-white/10" />

                <p className="mt-4 text-[12px] text-white/70">
                  Noticing small good moments helps them show up more often.
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-[#0B1634] transition hover:brightness-95 active:scale-[0.99] sm:w-auto"
                  style={{
                    fontFamily: "var(--font-subheading)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Back home
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
            </div>
          ) : gate === "ok" ? (
            // Form
            <div className="mt-10 text-left">
              {/* Step 1 */}
              <div className="rounded-3xl border border-white/15 bg-white/5 p-4">
                <p className="text-[14px] text-white/90">
                  <span
                    className="mr-2 inline-block text-white/70"
                    style={{ fontFamily: "var(--font-subheading)" }}
                  >
                    1.
                  </span>
                  What is one good thing that happened today?
                </p>

                <div className="mt-3">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="It can be something small — a moment, a thought, or a feeling."
                    rows={4}
                    className={[
                      "w-full rounded-2xl border border-white/15 bg-white/5 p-4 text-[14px] text-white/90",
                      "placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/25",
                    ].join(" ")}
                    maxLength={500}
                  />
                  <p className="mt-2 text-[11px] text-white/50">
                    {text.trim().length}/500
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div
                ref={emotionRef}
                className={[
                  "mt-7 space-y-3 scroll-mt-24 rounded-3xl p-3 transition",
                  focusBlock === "emotion"
                    ? "bg-white/10 ring-1 ring-white/25 shadow-[0_18px_50px_rgba(255,255,255,0.08)] animate-[pulse_0.7s_ease-in-out_1]"
                    : "",
                ].join(" ")}
              >
                <p className="text-[14px] text-white/90">
                  <span
                    className="mr-2 inline-block text-white/70"
                    style={{ fontFamily: "var(--font-subheading)" }}
                  >
                    2.
                  </span>
                  Pick one emotion.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  {EMOTION_CHOICES.filter((c) =>
                    (EMOTIONS as readonly string[]).includes(c.value)
                  ).map(({ value, emoji, label, sub, accent, glow }) => {
                    const selected = emotion === value;
                    const depth = clamp(12, 10, 18);

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handlePickEmotion(value)}
                        aria-pressed={selected}
                        className={[
                          "group relative overflow-hidden rounded-2xl border p-3 text-left transition-all",
                          "focus:outline-none focus:ring-2 focus:ring-white/30",
                          "active:scale-[0.99]",
                          selected
                            ? `border-white/70 bg-white/10 ${glow}`
                            : "border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30",
                        ].join(" ")}
                        style={{
                          fontFamily: "var(--font-subheading)",
                          boxShadow: selected
                            ? undefined
                            : `0 ${depth}px ${depth * 2}px rgba(0,0,0,0.18)`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-2xl leading-none">{emoji}</span>
                          <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] text-white/80">
                            pick
                          </span>
                        </div>

                        <div className="mt-2">
                          <div className="text-[13px] font-semibold text-white">
                            {label}
                          </div>
                          <div className="text-[11px] text-white/60">{sub}</div>
                        </div>

                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className={[
                              "h-full rounded-full transition-all duration-300",
                              accent,
                              selected ? "opacity-100" : "opacity-70",
                            ].join(" ")}
                            style={{ width: selected ? "100%" : "55%" }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="h-px bg-white/10" />
              </div>

              {/* Step 3 */}
              <div
                ref={energyRef}
                className={[
                  "mt-7 space-y-3 scroll-mt-24 rounded-3xl p-3 transition",
                  focusBlock === "energy"
                    ? "bg-white/10 ring-1 ring-white/25 shadow-[0_18px_50px_rgba(255,255,255,0.08)] animate-[pulse_0.7s_ease-in-out_1]"
                    : "",
                ].join(" ")}
              >
                <p className="text-[14px] text-white/90">
                  <span
                    className="mr-2 inline-block text-white/70"
                    style={{ fontFamily: "var(--font-subheading)" }}
                  >
                    3.
                  </span>
                  Pick your energy.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  {ENERGY_CHOICES.filter((c) =>
                    (ENERGIES as readonly string[]).includes(c.value)
                  ).map(({ value, emoji, label, sub, accent, glow, pct }) => {
                    const selected = energy === value;
                    const depth = clamp(12, 10, 18);

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handlePickEnergy(value)}
                        aria-pressed={selected}
                        className={[
                          "group relative overflow-hidden rounded-2xl border p-3 text-left transition-all",
                          "focus:outline-none focus:ring-2 focus:ring-white/30",
                          "active:scale-[0.99]",
                          selected
                            ? `border-white/70 bg-white/10 ${glow}`
                            : "border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30",
                        ].join(" ")}
                        style={{
                          fontFamily: "var(--font-subheading)",
                          boxShadow: selected
                            ? undefined
                            : `0 ${depth}px ${depth * 2}px rgba(0,0,0,0.18)`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-2xl leading-none">{emoji}</span>
                          <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] text-white/80">
                            {pct}%
                          </span>
                        </div>

                        <div className="mt-2">
                          <div className="text-[13px] font-semibold text-white">
                            {label}
                          </div>
                          <div className="text-[11px] text-white/60">{sub}</div>
                        </div>

                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className={[
                              "h-full rounded-full transition-all duration-300",
                              accent,
                              selected ? "opacity-100" : "opacity-70",
                            ].join(" ")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="h-px bg-white/10" />
              </div>

              {/* CTA */}
              <div ref={doneRef} className="mt-7">
                {text.trim().length < 3 || !emotion || !energy ? (
                  <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[12px] text-white/90">
                    Please complete all steps before saving.
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={save}
                  className={[
                    "mt-3 inline-flex w-full items-center justify-center rounded-full px-6 py-4",
                    "bg-white text-[#0B1634] transition",
                    "hover:brightness-95 active:scale-[0.99]",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                  ].join(" ")}
                  style={{
                    fontFamily: "var(--font-subheading)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {saving ? "Saving..." : "Done"}
                </button>

                <div className="mt-4 flex items-center justify-between">
                  <Link href="/" className="text-[12px] text-white/70 hover:text-white">
                    Back home
                  </Link>
                  <span className="text-[11px] text-white/45">Simplicity wins.</span>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
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
}: {
  title: string;
  text: string;
  primaryHref: string;
  primaryText: string;
  secondaryHref?: string;
  secondaryText?: string;
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
