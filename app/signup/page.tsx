"use client";

export const dynamic = "force-dynamic";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

export default function SignupPage() {
  const router = useRouter();

  // ✅ runtime query parsing (no useSearchParams -> no prerender crash)
  const [nextPath, setNextPath] = useState("/chat");
  const [fromCheckout, setFromCheckout] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const n = params.get("next");
    if (n && n.startsWith("/")) setNextPath(n);

    setFromCheckout(params.get("from") === "checkout");
  }, []);

  // ✅ used for Google OAuth redirect
  const oauthRedirectTo = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  }, [nextPath]);

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
      const { error: signInError } =
        await supabaseBrowser.auth.signInWithPassword({
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

    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: oauthRedirectTo,
      },
    });

    if (error) {
      setLoadingGoogle(false);
      setError(error.message);
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#FAF8FF] flex items-center justify-center px-4">
      <div className="w-full max-w-4xl grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-stretch">
        {/* Left: brand + explanation */}
        <section className="hidden md:flex flex-col justify-center rounded-3xl bg-gradient-to-br from-[#401268] via-[#5E36B5] to-[#F5A5E0] text-white p-8 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <div className="w-40 h-40 rounded-full bg-white/30 blur-3xl absolute -top-10 -left-10" />
            <div className="w-56 h-56 rounded-full bg-white/20 blur-3xl absolute bottom-0 right-0" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <span className="text-xs font-semibold tracking-tight">VF</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight">
                  Ventfreely
                </span>
                <span className="text-[11px] text-violet-50/90">
                  Gentle space to vent, not a therapist
                </span>
              </div>
            </div>

            <h1 className="text-2xl font-semibold leading-snug">
              Create your Ventfreely account
            </h1>

            <p className="text-sm text-violet-50/90 max-w-md">
              Save your chat, come back anytime, and continue without starting
              from zero.
            </p>

            <ul className="space-y-1 text-xs text-violet-50/90">
              <li>• Continue saved conversations.</li>
              <li>• Access from any device when logged in.</li>
              <li>• A calm place to unload heavy thoughts.</li>
            </ul>

            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              <span>You’ll return to {nextPath} after signup</span>
            </div>
          </div>
        </section>

        {/* Right: signup form */}
        <section className="rounded-3xl bg-white shadow-lg border border-violet-100 p-6 md:p-8 flex flex-col justify-center">
          <div className="space-y-4">
            <div className="md:hidden flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#401268]/10">
                <span className="text-xs font-semibold tracking-tight text-[#401268]">
                  VF
                </span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight text-[#2A1740]">
                  Ventfreely
                </span>
                <span className="text-[11px] text-slate-500">
                  Gentle space to vent
                </span>
              </div>
            </div>

            {fromCheckout && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-[11px] text-emerald-800 mb-1">
                <p className="font-medium">Payment confirmed 💜</p>
                <p className="mt-1 leading-relaxed">
                  Please create your account using the{" "}
                  <strong>same email</strong> you used at checkout, so we can
                  link your access.
                </p>
              </div>
            )}

            {!fromCheckout && (
              <>
                <h2 className="text-lg font-semibold text-[#2A1740]">
                  Sign up to continue
                </h2>
                <p className="text-xs text-slate-600">
                  Create an account to save your chat and come back anytime.
                </p>
              </>
            )}

            {/* ✅ Google signup */}
            <button
              onClick={handleGoogleSignup}
              disabled={loadingGoogle || loadingEmail}
              className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-[#2A1740] shadow-sm hover:bg-violet-50 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingGoogle ? "Connecting to Google…" : "Continue with Google"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-violet-200/60" />
              <span className="text-[11px] text-slate-500">or</span>
              <div className="h-px flex-1 bg-violet-200/60" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1 text-sm">
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className="w-full rounded-2xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#A268F5] focus:border-[#A268F5]"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={normalizeEmail}
                  disabled={loadingEmail || loadingGoogle}
                />
              </div>

              <div className="space-y-1 text-sm">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#A268F5] focus:border-[#A268F5]"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loadingEmail || loadingGoogle}
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loadingEmail || loadingGoogle}
                className="w-full rounded-2xl bg-[#401268] text-white text-sm font-semibold py-3 shadow-md shadow-[#401268]/25 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingEmail ? "Creating your account…" : "Create account"}
              </button>
            </form>

            <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
              <p>
                Already have an account?{" "}
                <button
                  onClick={() =>
                    router.push(`/login?next=${encodeURIComponent(nextPath)}`)
                  }
                  className="text-[#401268] font-medium hover:underline"
                >
                  Log in
                </button>
              </p>
              <p className="hidden sm:block">
                Ventfreely is a <span className="italic">supportive chat</span>,
                not professional care.
              </p>
            </div>

            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
              If you&apos;re in immediate danger or feel like you might hurt yourself,
              contact local emergency services right now.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
