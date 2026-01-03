"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

type SubRow = {
  status: string | null;
  current_period_end: string | null; // ISO string
  shopify_subscription_id?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

const SHOPIFY_CHECKOUT_URL =
  "https://ventfreely.com/products/ventfreely-unlimited-14-days?variant=53006364410120";

function formatDate(dateIso: string) {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function daysLeft(endIso: string) {
  const end = new Date(endIso).getTime();
  const now = Date.now();
  const diff = end - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

export default function AccountPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [sub, setSub] = useState<SubRow | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!userEmail;

  const computed = useMemo(() => {
    const now = new Date();
    const end = sub?.current_period_end ? new Date(sub.current_period_end) : null;

    const isActive =
      (sub?.status ?? "") === "active" &&
      !!end &&
      !Number.isNaN(end.getTime()) &&
      end > now;

    const endLabel = sub?.current_period_end ? formatDate(sub.current_period_end) : "—";

    const left = sub?.current_period_end ? daysLeft(sub.current_period_end) : null;

    const daysLeftLabel =
      isActive && typeof left === "number"
        ? left <= 0
          ? "Ends today"
          : left === 1
          ? "1 day left"
          : `${left} days left`
        : null;

    return { isActive, endLabel, daysLeftLabel };
  }, [sub]);

  useEffect(() => {
    async function load() {
      setChecking(true);
      setError(null);

      try {
        const {
          data: { session },
          error: sessErr,
        } = await supabaseBrowser.auth.getSession();

        if (sessErr) throw sessErr;

        const email = session?.user?.email ?? null;
        const id = session?.user?.id ?? null;

        setUserEmail(email);
        setUserId(id);

        if (!session?.user) {
          // not logged in
          setSub(null);
          return;
        }

        setSubLoading(true);

        // Fetch latest subscription row for this user
        const { data, error: subErr } = await supabaseBrowser
          .from("subscriptions")
          .select("status,current_period_end,shopify_subscription_id,created_at,updated_at")
          .eq("user_id", session.user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subErr) throw subErr;

        setSub((data as SubRow) ?? null);
      } catch (e: any) {
        console.error("Account load error:", e);
        setError("Couldn’t load your account. Please refresh and try again.");
      } finally {
        setSubLoading(false);
        setChecking(false);
      }
    }

    load();
  }, []);

  const handleLogout = async () => {
    try {
      await supabaseBrowser.auth.signOut();
      router.push("/");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const handleGoCheckout = () => {
    window.location.href = SHOPIFY_CHECKOUT_URL;
  };

  if (checking) {
    return (
      <main className="min-h-screen w-full bg-[#FAF8FF] flex items-center justify-center">
        <div className="rounded-2xl bg-white px-6 py-4 shadow-lg border border-purple-100 text-sm text-gray-600">
          Loading your account…
        </div>
      </main>
    );
  }

  // Not logged in UI
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen w-full bg-[#FAF8FF] text-slate-900">
        <header className="w-full bg-[#401268] text-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <span className="text-xs font-semibold tracking-tight">VF</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight">Ventfreely</span>
                <span className="text-[11px] text-violet-100/80">Account Center</span>
              </div>
            </div>

            <button
              onClick={() => router.push("/login")}
              className="rounded-full bg-white/10 px-3 py-2 text-[12px] hover:bg-white/15 transition"
            >
              Log in
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
          <div className="rounded-2xl bg-white/90 border border-violet-200/70 shadow-lg p-6 max-w-xl">
            <h1 className="text-lg font-semibold text-[#2A1740]">Account Center</h1>
            <p className="text-sm text-slate-700 mt-2">
              Please log in to view your subscription status and account details.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-2 rounded-full bg-[#401268] text-white text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition"
              >
                Log in
              </button>
              <button
                onClick={() => router.push("/signup")}
                className="px-4 py-2 rounded-full bg-white border border-violet-200 text-sm font-semibold text-[#401268] hover:bg-violet-50 active:scale-[0.98] transition"
              >
                Sign up
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mt-4">
              Tip: Use the same email when checking out so your subscription activates automatically.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const { isActive, endLabel, daysLeftLabel } = computed;

  return (
    <main className="min-h-screen w-full bg-[#FAF8FF] text-slate-900">
      {/* Header */}
      <header className="w-full bg-[#401268] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <span className="text-xs font-semibold tracking-tight">VF</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">Ventfreely</span>
              <span className="text-[11px] text-violet-100/80">Account Center</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/chat")}
              className="rounded-full bg-white/10 px-3 py-2 text-[12px] hover:bg-white/15 transition"
            >
              Back to chat
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full bg-white/10 px-3 py-2 text-[12px] hover:bg-white/15 transition"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)] items-start">
          {/* Left */}
          <section className="space-y-6">
            <div className="rounded-2xl bg-white/90 border border-violet-200/70 shadow-lg p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-lg md:text-xl font-semibold tracking-tight text-[#2A1740]">
                    Your account
                  </h1>
                  <p className="text-[12px] text-slate-600 mt-1">
                    Everything about your access, in one place.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-[11px] text-slate-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#A268F5]" />
                    {userEmail}
                  </span>
                </div>
              </div>

              {/* Status card */}
              <div className="mt-5 rounded-2xl border border-violet-200/70 bg-gradient-to-br from-white to-violet-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[12px] text-slate-600">Subscription status</div>

                    {subLoading ? (
                      <div className="mt-2 text-sm text-slate-700">Checking subscription…</div>
                    ) : isActive ? (
                      <>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-sm font-semibold text-emerald-700">
                            ✅ Active
                          </span>
                          {daysLeftLabel && (
                            <span className="text-[11px] rounded-full bg-white border border-violet-200 px-2 py-1 text-slate-700">
                              {daysLeftLabel}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-[12px] text-slate-700">
                          Access until <span className="font-semibold">{endLabel}</span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                          If you renew with the same email, access continues automatically.
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-sm font-semibold text-red-700">🔒 Inactive</span>
                          <span className="text-[11px] rounded-full bg-white border border-violet-200 px-2 py-1 text-slate-700">
                            No active access
                          </span>
                        </div>
                        <div className="mt-2 text-[12px] text-slate-700">
                          To continue chatting without limits, renew your access.
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                          Important: checkout email must match your Ventfreely account email.
                        </div>
                      </>
                    )}
                  </div>

                  {/* Badge */}
                  <div
                    className={`shrink-0 rounded-2xl border px-3 py-2 text-[11px] ${
                      isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {isActive ? "Unlimited chat" : "Limited"}
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {isActive ? (
                    <>
                      <button
                        onClick={() => router.push("/chat")}
                        className="px-4 py-2 rounded-full bg-[#401268] text-white text-sm font-semibold shadow-sm shadow-[#401268]/30 hover:brightness-110 active:scale-[0.98] transition"
                      >
                        Open chat
                      </button>
                      <button
                        onClick={handleGoCheckout}
                        className="px-4 py-2 rounded-full bg-white border border-violet-200 text-sm font-semibold text-[#401268] hover:bg-violet-50 active:scale-[0.98] transition"
                      >
                        Renew / extend (14 days)
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleGoCheckout}
                        className="px-4 py-2 rounded-full bg-[#401268] text-white text-sm font-semibold shadow-sm shadow-[#401268]/30 hover:brightness-110 active:scale-[0.98] transition"
                      >
                        Renew access · €2.99
                      </button>
                      <button
                        onClick={() => router.push("/chat")}
                        className="px-4 py-2 rounded-full bg-white border border-violet-200 text-sm font-semibold text-[#401268] hover:bg-violet-50 active:scale-[0.98] transition"
                      >
                        Back to chat
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 text-[11px] text-amber-800 bg-amber-50/80 border border-amber-100 rounded-2xl px-4 py-3">
                  {error}
                </div>
              )}
            </div>

            {/* Extra: helpful explanation (reduces support tickets) */}
            <div className="rounded-2xl bg-white/90 border border-violet-200/70 shadow-lg p-6">
              <h2 className="text-sm font-semibold text-[#2A1740]">How activation works</h2>
              <p className="text-[12px] text-slate-700 mt-2 leading-relaxed">
                Your access activates when we detect a successful Shopify payment made with the{" "}
                <span className="font-semibold">same email</span> as your Ventfreely account.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-violet-200/70 bg-white p-4">
                  <div className="text-[11px] font-semibold text-[#2A1740]">Correct</div>
                  <div className="mt-1 text-[11px] text-slate-700">
                    Account email = checkout email
                  </div>
                </div>
                <div className="rounded-2xl border border-violet-200/70 bg-white p-4">
                  <div className="text-[11px] font-semibold text-[#2A1740]">Common issue</div>
                  <div className="mt-1 text-[11px] text-slate-700">
                    Different email at checkout → access won’t auto-activate
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[11px] text-slate-500">
                If you used a different email by accident, contact support and we can help.
              </div>
            </div>
          </section>

          {/* Right */}
          <aside className="space-y-4">
            <div className="rounded-2xl bg-white/90 border border-violet-200/70 shadow-lg p-5">
              <h3 className="text-sm font-semibold text-[#2A1740]">Account details</h3>
              <div className="mt-3 space-y-2 text-[12px] text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Email</span>
                  <span className="font-medium">{userEmail}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">User ID</span>
                  <span className="font-mono text-[11px] text-slate-600">
                    {userId ? `${userId.slice(0, 6)}…${userId.slice(-4)}` : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Access until</span>
                  <span className="font-medium">{isActive ? endLabel : "—"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/90 border border-violet-200/70 shadow-lg p-5">
              <h3 className="text-sm font-semibold text-[#2A1740]">Quick actions</h3>
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => router.push("/chat")}
                  className="w-full px-4 py-2 rounded-full bg-white border border-violet-200 text-sm font-semibold text-[#401268] hover:bg-violet-50 active:scale-[0.98] transition"
                >
                  Open chat
                </button>
                <button
                  onClick={handleGoCheckout}
                  className="w-full px-4 py-2 rounded-full bg-[#401268] text-white text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition"
                >
                  Go to checkout
                </button>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                Checkout email must match your account email.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
