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

function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

// Convert an exp://... URL into an Android intent://... URL that forces Expo Go.
// Example:
// exp://192.168.1.135:8081/--/auth-callback#access_token=...
// => intent://192.168.1.135:8081/--/auth-callback#access_token=...#Intent;scheme=exp;package=host.exp.exponent;end
function expToIntentUrl(expUrl: string) {
  // expUrl should start with exp:// or exps://
  const schemeMatch = expUrl.match(/^(exp|exps):\/\//i);
  const scheme = (schemeMatch?.[1] || "exp").toLowerCase();

  // Strip scheme://
  const withoutScheme = expUrl.replace(/^(exp|exps):\/\//i, "");

  // Split off hash (keep it!)
  const [beforeHash, hashPart] = withoutScheme.split("#");
  const hash = hashPart ? `#${hashPart}` : "";

  return `intent://${beforeHash}${hash}#Intent;scheme=${scheme};package=host.exp.exponent;end`;
}

export default function AuthCallbackBridge() {
  const [primaryHref, setPrimaryHref] = useState<string>("#");
  const [secondaryHref, setSecondaryHref] = useState<string>("#");

  const computed = useMemo(() => {
    const fragment = getFragment();

    const hasTokens =
      fragment.includes("access_token=") && fragment.includes("refresh_token=");

    // In DEV (Expo Go), we pass app=exp://.../--/auth-callback from the mobile app.
    // In PROD (standalone), we can default to ventfreely://auth-callback
    const appParam = getParam("app");
    const deepLinkBase = appParam || "ventfreely://auth-callback";

    const deepLink = hasTokens ? `${deepLinkBase}#${fragment}` : deepLinkBase;

    // For Android + Expo Go, intent:// works more reliably than exp:// inside in-app browsers.
    const useIntent =
      isAndroid() && /^(exp|exps):\/\//i.test(deepLink);

    const intentLink = useIntent ? expToIntentUrl(deepLink) : null;

    return { deepLink, intentLink };
  }, []);

  function openApp() {
    // Try intent first (Android Expo Go), then deep link
    if (computed.intentLink) {
      window.location.href = computed.intentLink;
      // fallback to deep link shortly after
      setTimeout(() => {
        window.location.href = computed.deepLink;
      }, 500);
      return;
    }

    window.location.href = computed.deepLink;
  }

  useEffect(() => {
    // Show the best clickable link(s)
    setPrimaryHref(computed.intentLink || computed.deepLink);
    setSecondaryHref(computed.deepLink);

    // Auto-attempt open (some browsers will block; button remains)
    const t1 = setTimeout(() => openApp(), 50);
    const t2 = setTimeout(() => openApp(), 650);

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
          Some email apps block opening other apps automatically. If nothing happens, tap the button.
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
          <div style={{ wordBreak: "break-all" }}>{secondaryHref}</div>
          <div style={{ marginTop: 10 }}>
            Tip: if you’re in Gmail, use “⋮ → Open in Chrome” then tap the button again.
          </div>
        </div>
      </div>
    </main>
  );
}
