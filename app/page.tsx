// FILE: app/page.tsx

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#0C1836",
        color: "#FFFFFF",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      <div style={{ width: "100%", maxWidth: 720, textAlign: "center" }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: 0.2 }}>
          Ventfreely
        </h1>
        <p style={{ marginTop: 12, marginBottom: 0, opacity: 0.8, lineHeight: 1.6 }}>
          Not advice. Just space.
        </p>

        <div style={{ height: 28 }} />

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href="/privacy"
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#FFFFFF",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Privacy
          </a>
          <a
            href="/terms"
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#FFFFFF",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Terms
          </a>
          <a
            href="/disclaimer"
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#FFFFFF",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Disclaimer
          </a>
        </div>

        <div style={{ height: 22 }} />

        <p style={{ margin: 0, opacity: 0.65, fontSize: 13, lineHeight: 1.6 }}>
          Support: official.ventfreely@gmail.com
        </p>
      </div>
    </main>
  );
}
