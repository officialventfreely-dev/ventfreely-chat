"use client";

import { useEffect, useMemo, useState } from "react";

function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

// exp://... -> intent://... (Android) to force open Expo Go
function expToIntentUrl(expUrl: string) {
  const schemeMatch = expUrl.match(/^(exp|exps):\/\//i);
  const scheme = (schemeMatch?.[1] || "exp").toLowerCase();

  const withoutScheme = expUrl.replace(/^(exp|exps):\/\//i, "");
  const [beforeHash, hashPart] = withoutScheme.split("#");
  const hash = hashPart ? `#${hashPart}` : "";

  return `intent://${beforeHash}${hash}#Intent;scheme=${scheme};package=host.exp.exponent;end`;
}

export default function AuthCallbackBridge() {
  const [primaryHref, setPrimaryHref] = useState<string>("#");
  const [fallbackHref, setFallbackHref] = useState<string>("#");

  const computed = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        deepLink: "ventfreely://auth-callback",
        intentLink: null as string | null,
      };
    }

    const url = new URL(window.location.href);

    // IMPORTANT:
    // OAuth often comes as ?code=...
    // Magic link often comes as #access_token=...&refresh_token=...
    // We forward BOTH search + hash into the app deep link.
    const search = url.search || "";
    const hash = url.hash || "";

    // In DEV (Expo Go) the mobile app passes ?app=exp://.../--/auth-callback
    // In PROD (standalone) we default to ventfreely://auth-callback
    const appParam = url.searchParams.get("app");
    const deepLinkBase = appParam || "ventfreely://auth-callback";

    // Remove app=... from forwarded query (so app doesn't receive it)
    if (url.searchParams.has("app")) {
      url.searchParams.delete("app");
    }
    const forwardedSearch = url.searchParams.toString()
      ? `?${url.searchParams.toString()}`
      : "";

    const deepLink = `${deepLinkBase}${forwardedSearch}${hash}`;

    const useIntent = isAndroid() && /^(exp|exps):\/\//i.test(deepLink);
    const intentLink = useIntent ? expToIntentUrl(deepLink) : null;

    return { deepLink, intentLink };
  }, []);

  function openApp() {
    if (computed.intentLink) {
      window.location.href = computed.intentLink;
      setTimeout(() => {
        window.location.href = computed.deepLink;
      }, 600);
      return;
    }
    window.location.href = computed.deepLink;
  }

  useEffect(() => {
    setPrimaryHref(computed.intentLink || computed.deepLink);
    setFallbackHref(computed.deepLink);

    // Try automatically (some in-app browsers block; button stays)
    const t1 = setTimeout(() => openApp(), 80);
    const t2 = setTimeout(() => openApp(), 750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed.deepLink, computed.intentLink]);

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
      <div style={{ maxWidth: 560, textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Opening Ventfreely…</h1>
        <p style={{ marginTop: 10, opacity: 0.75 }}>
          If the app doesn’t open automatically, tap the button below.
        </p>

        <button
          onClick={openApp}
          style={{
            marginTop: 14,
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid rgba(64,18,104,0.22)",
            background: "white",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Open Ventfreely
        </button>

        <div style={{ marginTop: 16, opacity: 0.7, fontSize: 13, lineHeight: 1.4 }}>
          <div><strong>Primary link:</strong></div>
          <div style={{ wordBreak: "break-all" }}>{primaryHref}</div>
          <div style={{ marginTop: 8 }}><strong>Fallback link:</strong></div>
          <div style={{ wordBreak: "break-all" }}>{fallbackHref}</div>
        </div>
      </div>
    </main>
  );
}
