"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Montserrat, Oswald, Barlow_Condensed } from "next/font/google";
import { EMOTIONS, ENERGIES, type Emotion, type Energy } from "@/lib/dailyConfig";
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

/**
 * GlowCard – sama “ere lilla outline + glow outside” vibe nagu Home.
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

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[12px] text-white/60"
      style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.10em" }}
    >
      {children}
    </p>
  );
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
  const [saveError, setSaveError] = useState<string>("");

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
    setSaveError("");

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
        setSaveError(data?.error ?? "Could not save. Try again.");
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
      {/* Background (match Home vibe via CSS var) */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: "var(--vf-bg)" }} />
        {/* subtle extra glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#A855F7]/20 blur-[120px]" />
      </div>

      {/* Unified header */}
      <AppTopHeader active="daily" />

      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <section className="mx-auto max-w-xl text-center">
          <GlowCard>
            <div className="px-6 py-9 md:px-8">
              <div className="flex items-start justify-between gap-4 text-left">
                <div>
                  <SectionEyebrow>DAILY REFLECTION</SectionEyebrow>
                  <h1
                    className="mt-2 text-[26px] font-semibold text-white/95 md:text-[32px]"
                    style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}
                  >
                    One minute. One good moment.
                  </h1>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                    A small check-in that keeps things simple.
                  </p>
                </div>

                <Link href="/weekly" className="mt-1 text-[12px] text-white/60 hover:text-white/80">
                  Weekly →
                </Link>
              </div>

              {/* Progress */}
              <div className="mt-6 text-left">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-[12px] text-white/70">
                    <span style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.06em" }}>
                      Progress
                    </span>
                    <span className="text-white/70">{progressPercent}%</span>
                  </div>

                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={["h-full rounded-full transition-all duration-500", progressClass].join(" ")}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <p className="mt-2 text-[12px] text-white/60">
                    {today ? `Today: ${today} · ` : ""}
                    {progressHint}
                  </p>
                </div>
              </div>

              {/* Gate states */}
              {!loading && gate === "unauthorized" && (
                <div className="mt-6 text-left">
                  <SimpleCard
                    icon="🔒"
                    title="LOG IN TO SAVE"
                    text="Saving your reflection requires an account."
                    primaryHref="/login"
                    primaryText="Log in"
                    secondaryHref="/signup"
                    secondaryText="Create account"
                  />
                </div>
              )}

              {!loading && gate === "paywall" && (
                <div className="mt-6 text-left">
                  <SimpleCard
                    icon="✨"
                    title="PREMIUM REQUIRED"
                    text="Daily reflections are part of Premium."
                    primaryHref={CHECKOUT_URL}
                    primaryText="Unlock Premium"
                    secondaryHref="/"
                    secondaryText="Back home"
                  />
                </div>
              )}

              {!loading && gate === "error" && (
                <div className="mt-6 text-left">
                  <SimpleCard
                    icon="⚠️"
                    title="SOMETHING WENT WRONG"
                    text="Please try again in a moment."
                    primaryHref="/"
                    primaryText="Back home"
                  />
                </div>
              )}

              {/* Loading */}
              {loading ? (
                <div className="mt-6 text-left">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[13px] text-white/70">Loading…</p>
                  </div>
                </div>
              ) : null}

              {/* Completed */}
              {!loading && gate === "ok" && completed ? (
                <div className="mt-6 text-left">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <SectionEyebrow>COMPLETED TODAY ✅</SectionEyebrow>

                    <p className="mt-2 text-[15px] leading-relaxed text-white/90">
                      “{existing.positive_text}”
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Tag>
                        {EMOTION_CHOICES.find((c) => c.value === existing.emotion)?.emoji} {existing.emotion}
                      </Tag>
                      <Tag>
                        {ENERGY_CHOICES.find((c) => c.value === existing.energy)?.emoji} {existing.energy}
                      </Tag>
                    </div>

                    <div className="mt-4 h-px bg-white/10" />

                    <p className="mt-4 text-[12px] leading-relaxed text-white/70">
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
              ) : null}
            </div>
          </GlowCard>

          {/* Steps (only if OK and not completed) */}
          {!loading && gate === "ok" && !completed ? (
            <div className="mt-8 text-left">
              {/* Step 1 */}
              <GlowCard>
                <div className="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <SectionEyebrow>📝 STEP 1</SectionEyebrow>
                      <p className="mt-2 text-[14px] text-white/90">
                        What is one good thing that happened today?
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-white/60">
                        It can be small — a moment, a thought, or a feeling.
                      </p>
                    </div>

                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] text-white/75">
                      {text.trim().length}/500
                    </span>
                  </div>

                  <div className="mt-4">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="A small moment that felt okay…"
                      rows={4}
                      className={[
                        "w-full resize-none rounded-2xl border border-white/15 bg-white/5 p-4 text-[14px] text-white/90",
                        "placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-white/25",
                      ].join(" ")}
                      maxLength={500}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <Link href="/" className="text-[12px] text-white/60 hover:text-white/80">
                      ← Back home
                    </Link>
                    <span className="text-[11px] text-white/45">Keep it simple.</span>
                  </div>
                </div>
              </GlowCard>

              {/* Step 2 */}
              <div
                ref={emotionRef}
                className={[
                  "mt-7 scroll-mt-24 transition",
                  focusBlock === "emotion"
                    ? "rounded-[2rem] ring-1 ring-white/25 shadow-[0_18px_50px_rgba(255,255,255,0.08)]"
                    : "",
                ].join(" ")}
              >
                <GlowCard>
                  <div className="p-5 md:p-6">
                    <SectionEyebrow>🙂 STEP 2</SectionEyebrow>
                    <p className="mt-2 text-[14px] text-white/90">Pick one emotion.</p>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                      {EMOTION_CHOICES.filter((c) => (EMOTIONS as readonly string[]).includes(c.value)).map(
                        ({ value, emoji, label, sub, accent, glow }) => {
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
                                boxShadow: selected ? undefined : `0 ${depth}px ${depth * 2}px rgba(0,0,0,0.18)`,
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-2xl leading-none">{emoji}</span>
                                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] text-white/80">
                                  {selected ? "selected" : "pick"}
                                </span>
                              </div>

                              <div className="mt-2">
                                <div className="text-[13px] font-semibold text-white">{label}</div>
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
                        }
                      )}
                    </div>

                    <div className="mt-4 h-px bg-white/10" />
                    <p className="mt-4 text-[12px] text-white/60">
                      Tip: pick the one that feels closest — not perfect.
                    </p>
                  </div>
                </GlowCard>
              </div>

              {/* Step 3 */}
              <div
                ref={energyRef}
                className={[
                  "mt-7 scroll-mt-24 transition",
                  focusBlock === "energy"
                    ? "rounded-[2rem] ring-1 ring-white/25 shadow-[0_18px_50px_rgba(255,255,255,0.08)]"
                    : "",
                ].join(" ")}
              >
                <GlowCard>
                  <div className="p-5 md:p-6">
                    <SectionEyebrow>⚡️ STEP 3</SectionEyebrow>
                    <p className="mt-2 text-[14px] text-white/90">Pick your energy.</p>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                      {ENERGY_CHOICES.filter((c) => (ENERGIES as readonly string[]).includes(c.value)).map(
                        ({ value, emoji, label, sub, accent, glow, pct }) => {
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
                                boxShadow: selected ? undefined : `0 ${depth}px ${depth * 2}px rgba(0,0,0,0.18)`,
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-2xl leading-none">{emoji}</span>
                                <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] text-white/80">
                                  {pct}%
                                </span>
                              </div>

                              <div className="mt-2">
                                <div className="text-[13px] font-semibold text-white">{label}</div>
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
                        }
                      )}
                    </div>

                    <div className="mt-4 h-px bg-white/10" />
                    <p className="mt-4 text-[12px] text-white/60">
                      This helps Weekly show gentle patterns.
                    </p>
                  </div>
                </GlowCard>
              </div>

              {/* CTA */}
              <div ref={doneRef} className="mt-7">
                <GlowCard>
                  <div className="p-5 md:p-6 text-left">
                    <SectionEyebrow>✅ FINISH</SectionEyebrow>
                    <p className="mt-2 text-[14px] text-white/85">
                      {text.trim().length < 3 || !emotion || !energy
                        ? "Complete the steps above, then save."
                        : "Ready when you are."}
                    </p>

                    {saveError ? (
                      <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-[12px] text-white/85">
                        {saveError}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      disabled={!canSubmit}
                      onClick={save}
                      className={[
                        "mt-4 inline-flex w-full items-center justify-center rounded-full px-6 py-4",
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
                      {saving ? "Saving..." : "Save"}
                    </button>

                    <div className="mt-4 flex items-center justify-between">
                      <Link href="/" className="text-[12px] text-white/60 hover:text-white/80">
                        Back home
                      </Link>
                      <Link href="/weekly" className="text-[12px] text-white/60 hover:text-white/80">
                        Weekly →
                      </Link>
                    </div>
                  </div>
                </GlowCard>
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
  icon,
  title,
  text,
  primaryHref,
  primaryText,
  secondaryHref,
  secondaryText,
}: {
  icon?: string;
  title: string;
  text: string;
  primaryHref: string;
  primaryText: string;
  secondaryHref?: string;
  secondaryText?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p
        className="text-[12px] text-white/60"
        style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.08em" }}
      >
        {icon ? `${icon} ` : ""}{title}
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
  );
}
