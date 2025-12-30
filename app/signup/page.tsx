"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

export default function SignupPage() {
  const router = useRouter();

  const [fromCheckout, setFromCheckout] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read ?from=checkout only in the browser (no issues with prerender)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === "checkout") {
      setFromCheckout(true);
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please fill in both email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      setLoading(true);

      // 1) Create account in Supabase
      const { error: signUpError } = await supabaseBrowser.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // 2) Log in immediately (since email confirmation is disabled)
      const { error: signInError } =
        await supabaseBrowser.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // 3) Redirect to chat
      router.push("/chat");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
                <span className="text-xs font-semibold tracking-tight">
                  VF
                </span>
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
              Your account lets you come back to the same safe space whenever
              you need it. Just log in and continue your conversations without
              starting from zero.
            </p>

            <ul className="space-y-1 text-xs text-violet-50/90">
              <li>• Access from any device when logged in.</li>
              <li>• Short, affordable subscription instead of big commitment.</li>
              <li>• A calm place to unload your thoughts when they feel heavy.</li>
            </ul>
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
                <p>
                  Please create your Ventfreely account using the{" "}
                  <strong>same email</strong> you used at checkout. This will
                  make sure your subscription can be linked to your account.
                </p>
              </div>
            )}

            {!fromCheckout && (
              <>
                <h2 className="text-lg font-semibold text-[#2A1740]">
                  Sign up to start venting
                </h2>
                <p className="text-xs text-slate-600">
                  Create an account so you can return to your conversation
                  anytime. If you&apos;ve already paid, use the same email you
                  used at checkout.
                </p>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 mt-2">
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
                  className="w-full rounded-2xl border border-violet-200 bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-[#A268F5] focus:border-[#A268F5]"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
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
                  className="w-full rounded-2xl border border-violet-200 bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-[#A268F5] focus:border-[#A268F5]"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 rounded-2xl bg-[#401268] text-white text-sm font-medium py-2.5 shadow-md shadow-[#401268]/25 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Creating your account..." : "Create account"}
              </button>
            </form>

            <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
              <p>
                Already have an account?{" "}
                <button
                  onClick={() => router.push("/login")}
                  className="text-[#401268] font-medium hover:underline"
                >
                  Log in
                </button>
              </p>
              <p className="hidden sm:block">
                By signing up, you agree to use Ventfreely as a{" "}
                <span className="italic">supportive chat</span>, not a
                replacement for professional care.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
