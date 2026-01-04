"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ support ?next=/chat so we can return user to where they came from
  const nextPath = useMemo(() => {
    const n = searchParams.get("next");
    if (!n) return "/chat";
    // basic safety: only allow internal paths
    return n.startsWith("/") ? n : "/chat";
  }, [searchParams]);

  // ✅ used for Google OAuth redirect
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const oauthRedirectTo = origin
    ? `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
    : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoadingEmail(true);

    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setLoadingEmail(false);

    if (error) {
      setError(error.message);
    } else {
      router.replace(nextPath);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setLoadingGoogle(true);

    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: oauthRedirectTo,
      },
    });

    // If this succeeds, browser navigates away to Google. If it fails, show error.
    if (error) {
      setLoadingGoogle(false);
      setError(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8FF] px-4">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center">
        <div className="w-full">
          {/* Header */}
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#401268] shadow-sm shadow-[#401268]/20">
              <span className="text-xs font-semibold text-white">VF</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#2A1740]">
              Log in to Ventfreely
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Continue your conversation in a calm, private space.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl bg-white/90 backdrop-blur-md shadow-xl border border-violet-200/60 overflow-hidden">
            {/* Accent top */}
            <div className="h-2 bg-gradient-to-r from-[#401268] via-[#A268F5] to-[#F973C9]" />

            <div className="p-6">
              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                disabled={loadingGoogle || loadingEmail}
                className="w-full rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-[#2A1740] shadow-sm hover:bg-violet-50 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingGoogle ? "Connecting to Google…" : "Continue with Google"}
              </button>

              {/* Divider */}
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-violet-200/60" />
                <span className="text-[11px] text-slate-500">or</span>
                <div className="h-px flex-1 bg-violet-200/60" />
              </div>

              {/* Email form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-2xl border border-violet-200 px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-[#A268F5] focus:border-[#A268F5]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-2xl border border-violet-200 px-3 py-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-[#A268F5] focus:border-[#A268F5]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loadingEmail || loadingGoogle}
                  className="w-full rounded-2xl bg-[#401268] text-white py-3 text-sm font-semibold shadow-md shadow-[#401268]/25 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingEmail ? "Logging in…" : "Log in"}
                </button>
              </form>

              {/* Footer */}
              <p className="mt-4 text-[12px] text-slate-600">
                Don&apos;t have an account yet?{" "}
                <a
                  href={`/signup?next=${encodeURIComponent(nextPath)}`}
                  className="text-[#401268] font-semibold hover:underline"
                >
                  Create one
                </a>
              </p>

              <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                By continuing, you agree Ventfreely is an AI companion — not a
                therapist. If you&apos;re in immediate danger, contact local
                emergency services.
              </p>
            </div>
          </div>

          {/* Tiny hint */}
          <div className="mt-4 text-center text-[10px] text-slate-500">
            You’ll return to <span className="font-semibold">{nextPath}</span>{" "}
            after logging in.
          </div>
        </div>
      </div>
    </div>
  );
}
