"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabaseBrowser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Normalize email: trim spaces + lowercase
    const normalizedEmail = email.trim().toLowerCase();

    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.push("/chat");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8FF] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg border border-purple-100">
        <h1 className="text-2xl font-semibold text-[#401268] mb-2">
          Log in to Ventfreely
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Continue your conversation in a safe AI space.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-gray-50 text-black focus:outline-none focus:ring-2 focus:ring-purple-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-gray-50 text-black focus:outline-none focus:ring-2 focus:ring-purple-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#401268] text-white py-2.5 text-sm font-medium shadow-md hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-500">
          Don&apos;t have an account yet?{" "}
          <a href="/signup" className="text-[#401268] underline">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
