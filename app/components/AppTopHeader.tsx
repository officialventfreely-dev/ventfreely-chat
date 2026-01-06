// FILE: app/components/AppTopHeader.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect } from "react";

export type AppTopHeaderActive =
  | "test"
  | "chat"
  | "daily"
  | "weekly"
  | "insights"
  | "account"
  | undefined;

type ItemKey = Exclude<AppTopHeaderActive, undefined>;

const ITEMS: Array<{ href: string; label: string; key: ItemKey }> = [
  { href: "/test", label: "Test", key: "test" },
  { href: "/chat", label: "Chat", key: "chat" },
  { href: "/daily", label: "Daily", key: "daily" },
  { href: "/weekly", label: "Weekly", key: "weekly" },
  { href: "/insights", label: "Insights", key: "insights" },
  { href: "/account", label: "Account", key: "account" },
];

function IconMenu({ open, className = "h-4 w-4" }: { open: boolean; className?: string }) {
  return open ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function matchPathnameToKey(pathname: string | null | undefined): ItemKey | null {
  if (!pathname) return null;

  // exact root not used here; only app routes
  const match = ITEMS.find((it) => pathname === it.href || pathname.startsWith(it.href + "/"));
  return match?.key ?? null;
}

export function AppTopHeader({ active }: { active?: AppTopHeaderActive }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const derivedActive = useMemo<ItemKey | null>(() => {
    if (active) return active;
    return matchPathnameToKey(pathname);
  }, [active, pathname]);

  const isActive = (key: ItemKey) => derivedActive === key;

  return (
    <header className="w-full bg-[#401268] text-white">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between py-2.5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image src="/brand/logo.svg" alt="Ventfreely" width={92} height={24} priority className="opacity-95" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1 text-[12px] text-white/85">
            {ITEMS.map((it) => {
              const on = isActive(it.key);
              return (
                <Link
                  key={it.key}
                  href={it.href}
                  className={[
                    "rounded-full px-3 py-1 transition",
                    on ? "bg-white/15" : "hover:bg-white/10",
                  ].join(" ")}
                >
                  {it.label}
                </Link>
              );
            })}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2">
            <Link href="/chat" className="hidden sm:inline text-[12px] text-white/70 hover:text-white/85">
              Open chat →
            </Link>

            {/* Mobile toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="sm:hidden inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 transition"
              aria-label="Menu"
            >
              <IconMenu open={mobileOpen} />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="sm:hidden pb-3">
            <div className="grid grid-cols-2 gap-2">
              {ITEMS.map((it) => {
                const on = isActive(it.key);
                return (
                  <Link
                    key={it.key}
                    href={it.href}
                    className={[
                      "rounded-xl px-3 py-2 text-[12px] transition",
                      on ? "bg-white/15" : "bg-white/10 hover:bg-white/15",
                    ].join(" ")}
                  >
                    {it.label}
                  </Link>
                );
              })}
            </div>

            <div className="pt-3">
              <Link href="/chat" className="text-[12px] text-white/70 hover:text-white/85">
                Open chat →
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
