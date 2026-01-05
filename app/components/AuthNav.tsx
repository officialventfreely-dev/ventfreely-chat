"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MeResponse = { loggedIn: boolean; email: string | null };

export function AuthNav({ className = "" }: { className?: string }) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const json = (await res.json()) as MeResponse;

        if (!mounted) return;
        setMe(json);
      } catch {
        if (!mounted) return;
        // fail safe: treat as logged out
        setMe({ loggedIn: false, email: null });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <span
        className={[
          "inline-flex items-center rounded-full px-3 py-1 text-[12px] text-white/60",
          "border border-white/10 bg-white/5",
          className,
        ].join(" ")}
      >
        …
      </span>
    );
  }

  if (me?.loggedIn) {
    return (
      <Link
        href="/account"
        className={[
          "inline-flex items-center rounded-full px-3 py-1 text-[12px] text-white/85",
          "border border-white/15 bg-white/10 hover:bg-white/15",
          className,
        ].join(" ")}
      >
        Account
      </Link>
    );
  }

  return (
    <div className={["flex items-center gap-2", className].join(" ")}>
      <Link
        href="/login"
        className="inline-flex items-center rounded-full px-3 py-1 text-[12px] text-white/85 border border-white/15 bg-white/10 hover:bg-white/15"
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className="inline-flex items-center rounded-full px-3 py-1 text-[12px] text-white/80 border border-white/10 bg-white/5 hover:bg-white/10"
      >
        Sign up
      </Link>
    </div>
  );
}
