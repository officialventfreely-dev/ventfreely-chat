// app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";

function getFragment() {
  // Example hash: #access_token=...&refresh_token=...&type=magiclink
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  return hash.startsWith("#") ? hash.slice(1) : hash;
}

function getQueryParam(name: string) {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

export default function AuthCallbackBridge() {
  useEffect(() => {
    const fragment = getFragment();

    // If no tokens, just fall back to app home
    // (this can happen if link opened weirdly)
    const hasTokens =
      fragment.includes("access_token=") && fragment.includes("refresh_token=");

    // 1) Choose where to deep-link:
    // - If "app" param exists, use it (lets you test Expo Go explicitly)
    // - Otherwise default to production scheme (ventfreely://)
    //
    // You can test Expo Go by opening:
    // https://chat.ventfreely.com/auth/callback?app=exp://192.168.1.135:8081/--/auth-callback
    const appOverride = getQueryParam("app");
    const deepLinkBase = appOverride || "ventfreely://auth-callback";

    const target = hasTokens
      ? `${deepLinkBase}#${fragment}`
      : `${deepLinkBase}`;

    // 2) Redirect to app (or Expo Go) immediately
    window.location.replace(target);
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Opening Ventfreely…</h1>
        <p style={{ marginTop: 10, opacity: 0.7 }}>
          If nothing happens, open the Ventfreely app and try the magic link again.
        </p>
      </div>
    </main>
  );
}
