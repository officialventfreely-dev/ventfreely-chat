"use client";

import { useState } from "react";

type MessageRole = "user" | "assistant";

type Message = {
  role: MessageRole;
  content: string;
};

const FREE_LIMIT = 6;

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [locked, setLocked] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    if (locked) {
      setError(
        "Your free limit is used. Unlock full access to keep chatting with VENTFREELY."
      );
      return;
    }

    if (userMessageCount >= FREE_LIMIT) {
      setLocked(true);
      setError(
        "Your free limit (6 messages) is used. Unlock full access to keep chatting with VENTFREELY."
      );
      return;
    }

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: input },
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);
    setUserMessageCount((prev) => prev + 1);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          history: newMessages,
        }),
      });

      if (!res.ok) {
        throw new Error("Server error");
      }

      const data: { reply: string } = await res.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleUnlockClick = () => {
    window.open("https://your-shopify-store-url.com", "_blank");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "24px",
        background: "#0f172a",
        color: "white",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          borderRadius: "16px",
          padding: "16px",
          background: "#020617",
          border: "1px solid #1e293b",
        }}
      >
        <header style={{ marginBottom: "8px" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 600,
              marginBottom: "4px",
            }}
          >
            VENTFREELY Chat
          </h1>
          <p style={{ fontSize: "14px", color: "#cbd5f5" }}>
            Talk to a calm, non-judgmental AI friend. First {FREE_LIMIT}{" "}
            messages are free. After that you can unlock full access.
          </p>
        </header>

        <section
          style={{
            flexGrow: 1,
            minHeight: "300px",
            maxHeight: "60vh",
            overflowY: "auto",
            padding: "12px",
            borderRadius: "12px",
            background: "#020617",
            border: "1px solid #1e293b",
          }}
        >
          {messages.length === 0 && (
            <p style={{ fontSize: "14px", color: "#64748b" }}>
              You can start by telling me what&apos;s on your mind.
            </p>
          )}

          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: "12px",
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  padding: "8px 12px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  whiteSpace: "pre-wrap",
                  background:
                    m.role === "user" ? "#1d4ed8" : "#020617",
                  border:
                    m.role === "assistant"
                      ? "1px solid #1e293b"
                      : "1px solid transparent",
                }}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>
              VENTFREELY is typing…
            </p>
          )}
        </section>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#94a3b8",
          }}
        >
          <span>
            Free messages used: {userMessageCount} / {FREE_LIMIT}
          </span>
          {locked && (
            <span style={{ color: "#fbbf24" }}>Free limit reached</span>
          )}
        </div>

        {error && (
          <p style={{ fontSize: "13px", color: "#f97373" }}>{error}</p>
        )}

        {locked ? (
          <div
            style={{
              marginTop: "4px",
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid #fbbf24",
              background: "#451a03",
            }}
          >
            <p
              style={{
                fontSize: "14px",
                marginBottom: "8px",
              }}
            >
              You&apos;ve reached your free limit with VENTFREELY. To keep
              venting as long as you want, unlock full access.
            </p>
            <button
              onClick={handleUnlockClick}
              style={{
                padding: "10px 16px",
                borderRadius: "9999px",
                border: "none",
                cursor: "pointer",
                background: "#fbbf24",
                color: "black",
                fontSize: "14px",
                fontWeight: 600,
                width: "100%",
              }}
            >
              Unlock full access
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "4px",
            }}
          >
            <input
              type="text"
              placeholder="Type what you want to vent about..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flexGrow: 1,
                padding: "10px 12px",
                borderRadius: "9999px",
                border: "1px solid #1e293b",
                background: "#020617",
                color: "white",
                fontSize: "14px",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              style={{
                padding: "10px 16px",
                borderRadius: "9999px",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "#334155" : "#22c55e",
                color: "black",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Send
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
