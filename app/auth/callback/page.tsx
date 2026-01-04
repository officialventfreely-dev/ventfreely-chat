"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabaseBrowser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        // ✅ read next from URL safely (no useSearchParams -> no prerender crash)
        const params = new URLSearchParams(window.location.search);
        const next = params.get("next");
        const nextPath = next && next.startsWith("/") ? next : "/chat";

        // 🔐 Finish OAuth session
        const {
          data: { session },
          error: sessionError,
        } = await supabaseBrowser.auth.getSession();

        if (sessionError || !session) {
          setError(
            sessionError?.message ??
              "We couldn’t complete the login. Please try again."
          );
          return;
        }

        router.replace(nextPath);
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("Something went wrong during login.");
      }
    }

    handleAuthCallback();
  }, [router]);

  return (
    <main className="min-h-screen w-full bg-[#FAF8FF] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white/90 backdrop-blur-md border border-violet-200 shadow-xl p-6 text-center">
        {!error ? (
          <>
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#401268] shadow-sm shadow-[#401268]/25">
              <span className="text-xs font-semibold text-white">VF</span>
            </div>

            <h1 className="text-base font-semibold text-[#2A1740]">
              Signing you in…
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Just a moment while we finish setting things up.
            </p>

            <div className="mt-4 flex justify-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#401268] animate-pulse" />
              <span className="h-2 w-2 rounded-full bg-[#A268F5] animate-pulse [animation-delay:120ms]" />
              <span className="h-2 w-2 rounded-full bg-[#F5A5E0] animate-pulse [animation-delay:240ms]" />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-base font-semibold text-red-600">
              Login failed
            </h1>
            <p className="mt-2 text-sm text-slate-700">{error}</p>

            <button
              onClick={() => router.replace("/login?next=/chat")}
              className="mt-4 rounded-2xl bg-[#401268] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition"
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </main>
  );
}
