"use client";

import { useEffect, useMemo, useState } from "react";

function getFragment() {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  return hash.startsWith("#") ? hash.slice(1) : hash;
}

function getParam(name: string) {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get(name);
}

export default function AuthCallbackBridge() {
  const [target, setTarget] = useState<string | null>(null);

  const computed = useMemo(() => {
    const fragment = getFragment();

    const hasTokens =
      fragment.includes("access_token=") && fragment.includes("refresh_token=");

    // If the app param is present, use it (Expo Go: exp://.../--/auth-callback)
    // Otherwise default to production scheme (standalone build)
    const appParam = getParam("app");
    const deepLinkBase = appParam || "ventfreely://auth-callback";

    const url = hasTokens ? `${deepLinkBase}#${fragment}` : deepLinkBase;
    return { url, hasTokens };
  }, []);

  useEffect(() => {
    setTarget(computed.url);

    // Try immediate redirect
    const t1 = setTimeout(() => {
      window.location.href = computed.url;
    }, 50);

    // Try again shortly after (some browsers block the first attempt)
    const t2 = setTimeout(() => {
      window.location.href = computed.url;
    }, 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [computed.url]);

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
        <p style={{ marginTop: 10, opacity: 0.75 }}>
          If the app doesn’t open automatically, tap the button below.
        </p>

        <a
          href={target ?? "#"}
          style={{
            display: "inline-block",
            marginTop: 14,
            padding: "12px 16px",
            borderRadius: 12,
            textDecoration: "none",
            border: "1px solid rgba(64,18,104,0.18)",
            fontWeight: 700,
          }}
        >
          Open Ventfreely
        </a>

        <p style={{ marginTop: 14, opacity: 0.6, fontSize: 13 }}>
          (Dev note: in Expo Go, the link must be exp://…/--/auth-callback. In production builds it will be
          ventfreely://auth-callback.)
        </p>
      </div>
    </main>
  );
}
