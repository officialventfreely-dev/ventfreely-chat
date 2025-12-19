import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
        background: "#0f172a",
        color: "white",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          borderRadius: "16px",
          padding: "24px",
          background: "#020617",
          border: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <header>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            VENTFREELY
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "#cbd5f5",
              lineHeight: 1.6,
            }}
          >
            A safe place to vent when you don&apos;t feel like talking to anyone
            face to face. No judgment. Just a calm AI friend who listens and
            supports you.
          </p>
        </header>

        <section
          style={{
            fontSize: "14px",
            color: "#94a3b8",
          }}
        >
          <p style={{ marginBottom: "4px" }}>
            🔹 Start with a quick check-in test.
          </p>
          <p style={{ marginBottom: "4px" }}>
            🔹 Then chat with VENTFREELY as long as you want.
          </p>
          <p>🔹 First messages are free, then you can unlock full access.</p>
        </section>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "8px",
          }}
        >
          <Link href="/test">
            <button
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "9999px",
                border: "none",
                cursor: "pointer",
                background: "#22c55e",
                color: "black",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              Start test
            </button>
          </Link>

          <Link href="/chat">
            <button
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "9999px",
                border: "1px solid #334155",
                cursor: "pointer",
                background: "#020617",
                color: "white",
                fontSize: "15px",
                fontWeight: 500,
              }}
            >
              Skip test, start chatting
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
