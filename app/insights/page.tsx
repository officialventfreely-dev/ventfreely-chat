import { WeeklyInsightsCard } from "@/app/components/WeeklyInsightsCard";

export default function InsightsPage() {
  return (
    <main className="min-h-screen bg-[#0b0614]">
      {/* Background gradient (Ventfreely feel) */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#2a0d46]/50 via-[#0b0614] to-[#0b0614]" />
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#8b5cf6]/15 blur-3xl" />
        <div className="absolute top-40 left-10 h-56 w-56 rounded-full bg-[#ec4899]/10 blur-3xl" />
        <div className="absolute top-64 right-10 h-56 w-56 rounded-full bg-[#22c55e]/8 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-xl px-4 pb-16 pt-8">
        {/* Minimal header */}
        <div className="mb-5 flex items-center justify-between">
          <a href="/" className="text-sm font-semibold text-white/90">
            Ventfreely
          </a>

          <div className="flex items-center gap-3">
            <a
              href="/weekly"
              className="text-xs text-white/70 hover:text-white/90"
            >
              Weekly
            </a>
            <a
              href="/daily"
              className="text-xs text-white/70 hover:text-white/90"
            >
              Daily
            </a>
          </div>
        </div>

        <WeeklyInsightsCard />

        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white"
          >
            Back to home
          </a>
        </div>
      </div>
    </main>
  );
}
