// FILE: app/signup/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabaseBrowser";
import { AppTopHeader } from "@/app/components/AppTopHeader";

/**
 * GlowCard – sama “ere lilla outline + glow outside” vibe nagu Chat/Daily/Weekly/Login.
 */
const PURPLE = "168,85,247"; // #A855F7
const LINE_ALPHA = 0.85;
const GLOW_ALPHA = 0.35;
const SOFT_GLOW_ALPHA = 0.18;

function GlowCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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
    <p className="text-[12px] text-white/60" style={{ fontFamily: "var(--font-subheading)", letterSpacing: "0.10em" }}>
      {children}
    </p>
  );
}

function IconMail({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 7.5 12 12.2l6.5-4.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLock({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M7 11V8.8A5 5 0 0 1 12 4a5 5 0 0 1 5 4.8V11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7.5 11h9A2.5 2.5 0 0 1 19 13.5v5A2.5 2.5 0 0 1 16.5 21h-9A2.5 2.5 0 0 1 5 18.5v-5A2.5 2.5 0 0 1 7.5 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGoogle({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path
        d="M20 12.2c0-.6-.1-1.2-.2-1.8H12v3.4h4.5a3.9 3.9 0 0 1-1.7 2.5v2.1h2.7c1.6-1.5 2.5-3.7 2.5-6.2Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M12 21c2.3 0 4.2-.8 5.6-2.1l-2.7-2.1c-.8.5-1.8.9-2.9.9-2.2 0-4.1-1.5-4.8-3.6H4.4v2.2A9 9 0 0 0 12 21Z"
        fill="currentColor"
        opacity="0.6"
      />
      <path
        d="M7.2 14.1A5.4 5.4 0 0 1 7 12c0-.7.1-1.4.3-2.1V7.7H4.4A9 9 0 0 0 3 12c0 1.5.4 3 1.4 4.3l2.8-2.2Z"
        fill="currentColor"
        opacity="0.35"
      />
      <path
        d="M12 6.3c1.3 0 2.4.5 3.3 1.3l2.4-2.4A8.3 8.3 0 0 0 12 3a9 9 0 0 0-7.6 4.7l2.8 2.2C7.9 7.8 9.8 6.3 12 6.3Z"
        fill="currentColor"
        opacity="0.45"
      />
    </svg>
  );
}

function Note({
  title,
  text,
  tone = "neutral",
}: {
  title: string;
  text: string;
  tone?: "neutral" | "success";
}) {
  const box =
    tone === "success"
      ? "border-emerald-200/30 bg-emerald-400/10"
      : "border-white/10 bg-white/5";
  return (
    <div className={`rounded-2xl border ${box} p-4`}>
      <p className="text-[12px] text-white/80 font-semibold">{title}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-white/70">{text}</p>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();

  // runtime query parsing
  const [nextPath, setNextPath] = useState("/chat");
  const [fromCheckout, setFromCheckout] = useState(false);
  const [oauthRedirectTo, setOauthRedirectTo] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const n = params.get("next");
    const safeNext = n && n.startsWith("/") ? n : "/chat";
    setNextPath(safeNext);

    setFromCheckout(params.get("from") === "checkout");

    const origin = window.location.origin;
    setOauthRedirectTo(`${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`);
  }, []);

  const title = useMemo(() => {
    if (fromCheckout) return "Create your account to unlock access";
    if (nextPath.startsWith("/daily")) return "Create account to continue Daily";
    if (nextPath.startsWith("/weekly")) return "Create account to continue Weekly";
    if (nextPath.startsWith("/insights")) return "Create account to view Insights";
    if (nextPath.startsWith("/account")) return "Create account to view Account";
    return "Create your Ventfreely account";
  }, [fromCheckout, nextPath]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeEmail = () => setEmail((v) => v.trim().toLowerCase());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!normalizedEmail || !trimmedPassword) {
      setError("Please fill in both email and password.");
      return;
    }
    if (trimmedPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      setLoadingEmail(true);

      // 1) Create account in Supabase
      const { error: signUpError } = await supabaseBrowser.auth.signUp({
        email: normalizedEmail,
        password: trimmedPassword,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // 2) Log in immediately (if email confirmation is disabled)
      const { error: signInError } = await supabaseBrowser.auth.signInWithPassword({
        email: normalizedEmail,
        password: trimmedPassword,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // 3) Redirect back
      router.replace(nextPath);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoadingEmail(false);
    }
  };

  async function handleGoogleSignup() {
    setError(null);
    setLoadingGoogle(true);

    if (!oauthRedirectTo) {
      setLoadingGoogle(false);
      setError("Please try again in a moment.");
      return;
    }

    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: oauthRedirectTo },
    });

    if (error) {
      setLoadingGoogle(false);
      setError(error.message);
    }
  }

  return (
    <main className="min-h-screen w-full" style={{ color: "white" }}>
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: "var(--vf-bg)" }} />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#A855F7]/20 blur-[120px]" />
      </div>

      {/* Unified header */}
      <AppTopHeader />

      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <section className="mx-auto max-w-xl">
          <GlowCard>
            <div className="px-6 py-9 md:px-8">
              <div className="text-left">
                <Eyebrow>CREATE ACCOUNT</Eyebrow>
                <h1
                  className="mt-2 text-[26px] font-semibold text-white/95 md:text-[32px]"
                  style={{ fontFamily: "var(--font-heading)", letterSpacing: "0.02em" }}
                >
                  {title}
                </h1>
                <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                  Calm, private, and simple. You’ll return to{" "}
                  <span className="text-white/90 font-semibold">{nextPath}</span>.
                </p>
              </div>

              {/* Checkout note */}
              {fromCheckout ? (
                <div className="mt-6">
                  <Note
                    tone="success"
                    title="Payment confirmed 💜"
                    text="Please create your account using the same email you used at checkout, so we can link your access."
                  />
                </div>
              ) : (
                <div className="mt-6">
                  <Note
                    title="What you get"
                    text="Saved chat, access from any device, and a calm place to unload heavy thoughts."
                  />
                </div>
              )}

              {/* Google */}
              <div className="mt-6">
                <button
                  onClick={handleGoogleSignup}
                  disabled={loadingGoogle || loadingEmail}
                  className="w-full rounded-full border border-white/15 bg-white/10 px-5 py-3 text-left text-[13px] text-white/90 transition hover:bg-white/15 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 border border-white/10">
                      <IconGoogle className="h-4 w-4 text-white/90" />
                    </span>
                    <span className="font-semibold">
                      {loadingGoogle ? "Connecting to Google…" : "Continue with Google"}
                    </span>
                  </span>
                </button>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[11px] text-white/45">or</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Email form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-white/55 mb-1">Email</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/45">
                        <IconMail />
                      </span>
                      <input
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        className="w-full rounded-full bg-white/10 border border-white/15 pl-11 pr-4 py-3 text-[13px] text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-white/20 focus:border-white/25"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={normalizeEmail}
                        disabled={loadingEmail || loadingGoogle}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-white/55 mb-1">Password</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/45">
                        <IconLock />
                      </span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        className="w-full rounded-full bg-white/10 border border-white/15 pl-11 pr-4 py-3 text-[13px] text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-white/20 focus:border-white/25"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loadingEmail || loadingGoogle}
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[12px] text-white/85">
                      <span className="mr-2">⚠️</span>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loadingEmail || loadingGoogle}
                    className="mt-2 w-full rounded-full bg-white px-6 py-3 text-[var(--vf-ink)] transition hover:brightness-95 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      fontFamily: "var(--font-subheading)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {loadingEmail ? "Creating…" : "Create account"}
                  </button>
                </form>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-[12px] text-white/60">
                    Already have an account?{" "}
                    <Link
                      href={`/login?next=${encodeURIComponent(nextPath)}`}
                      className="text-white/85 hover:text-white underline underline-offset-4 decoration-white/25"
                    >
                      Log in
                    </Link>
                  </p>

                  <Link href="/" className="text-[12px] text-white/55 hover:text-white/75">
                    Back home
                  </Link>
                </div>

                <p className="mt-4 text-[10px] leading-relaxed text-white/45">
                  Ventfreely is a supportive AI companion, not a therapist. If you’re in immediate danger, contact local
                  emergency services right now.
                </p>
              </div>
            </div>
          </GlowCard>
        </section>
      </div>
    </main>
  );
}
