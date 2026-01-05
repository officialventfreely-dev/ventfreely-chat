"use client";

import Link from "next/link";
import Image from "next/image";
import { AuthNav } from "@/app/components/AuthNav";

export function AppTopHeader({
  active,
}: {
  active?: "test" | "chat" | "daily" | "weekly" | "insights";
}) {
  const itemClass = (key: typeof active) =>
    [
      "rounded-full px-3 py-1 transition",
      key === active ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10",
    ].join(" ");

  return (
    <header className="w-full bg-[#401268]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-1.5">
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

        <div className="hidden sm:flex items-center gap-2">
          <nav className="flex items-center gap-1 text-[12px]">
            <Link className={itemClass("test")} href="/test">
              Test
            </Link>
            <Link className={itemClass("chat")} href="/chat">
              Chat
            </Link>
            <Link className={itemClass("daily")} href="/daily">
              Daily
            </Link>
            <Link className={itemClass("weekly")} href="/weekly">
              Weekly
            </Link>
            <Link className={itemClass("insights")} href="/insights">
              Insights
            </Link>
          </nav>

          <AuthNav className="ml-1" />
        </div>
      </div>
    </header>
  );
}
