"use client";

import { useState } from "react";

type Question = {
  id: number;
  text: string;
};

const QUESTIONS: Question[] = [
  { id: 1, text: "I feel tense or on edge most of the day." },
  { id: 2, text: "My thoughts keep racing and it’s hard to slow them down." },
  { id: 3, text: "I worry a lot about the future or what might go wrong." },
  { id: 4, text: "I find it hard to relax, even when I have time." },
  { id: 5, text: "I often feel overwhelmed by small things." },
  { id: 6, text: "I avoid situations because they make me anxious." },
  { id: 7, text: "I have trouble falling asleep or staying asleep." },
  { id: 8, text: "I feel pressure to be perfect or not disappoint others." },
  { id: 9, text: "I feel alone with my feelings, like no one would understand." },
  { id: 10, text: "My mood or anxiety makes it harder to enjoy daily life." },
];

const OPTIONS = [
  { value: 1, label: "Not at all" },
  { value: 2, label: "A little" },
  { value: 3, label: "Sometimes" },
  { value: 4, label: "Often" },
  { value: 5, label: "Almost always" },
];

export default function TestPage() {
  const [answers, setAnswers] = useState<number[]>(
    Array(QUESTIONS.length).fill(0)
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [scoreText, setScoreText] = useState<string | null>(null);

  const handleChange = (questionIndex: number, value: number) => {
    const copy = [...answers];
    copy[questionIndex] = value;
    setAnswers(copy);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (answers.some((a) => a === 0)) {
      setError("Please answer all questions before seeing your result.");
      return;
    }

    const total = answers.reduce((sum, v) => sum + v, 0);
    const average = total / answers.length;

    let summary = "";
    let scoreInfo = `Total score: ${total} (average: ${average.toFixed(1)} / 5)`;

    if (average <= 2) {
      summary =
        "Your answers suggest that your anxiety and stress levels are on the lower side right now. You still have real feelings and worries, but they may be more manageable at the moment.";
    } else if (average <= 3.5) {
      summary =
        "Your answers suggest a moderate level of stress or anxiety. Things are not unbearable, but they are clearly affecting how you feel and move through daily life.";
    } else {
      summary =
        "Your answers suggest a higher level of anxiety or emotional pressure. It doesn’t mean anything is wrong with you, but it does mean you are carrying a lot right now.";
    }

    setResult(summary);
    setScoreText(scoreInfo);
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
          maxWidth: "720px",
          borderRadius: "16px",
          padding: "24px",
          background: "#020617",
          border: "1px solid #1e293b",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          VENTFREELY check-in test
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#cbd5f5",
            marginBottom: "16px",
            lineHeight: 1.6,
          }}
        >
          This is not a diagnosis. It&apos;s a quick check-in to understand how
          heavy things feel for you right now. Answer honestly for yourself,
          not for what you “should” feel.
        </p>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              maxHeight: "60vh",
              overflowY: "auto",
              paddingRight: "4px",
              marginBottom: "16px",
            }}
          >
            {QUESTIONS.map((q, index) => (
              <div
                key={q.id}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  background: "#020617",
                  border: "1px solid #1e293b",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    marginBottom: "8px",
                  }}
                >
                  {q.id}. {q.text}
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    fontSize: "12px",
                  }}
                >
                  {OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 8px",
                        borderRadius: "9999px",
                        border:
                          answers[index] === opt.value
                            ? "1px solid #22c55e"
                            : "1px solid #1e293b",
                        background:
                          answers[index] === opt.value
                            ? "#14532d"
                            : "#020617",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt.value}
                        checked={answers[index] === opt.value}
                        onChange={() =>
                          handleChange(index, opt.value)
                        }
                        style={{ accentColor: "#22c55e" }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p
              style={{
                fontSize: "13px",
                color: "#f97373",
                marginBottom: "8px",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
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
              marginBottom: "12px",
            }}
          >
            See my result
          </button>
        </form>

        {result && (
          <div
            style={{
              marginTop: "8px",
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid #1e293b",
              background: "#020617",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "#94a3b8",
                marginBottom: "6px",
              }}
            >
              {scoreText}
            </p>
            <p
              style={{
                fontSize: "14px",
                marginBottom: "10px",
              }}
            >
              {result}
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "#cbd5f5",
                marginBottom: "8px",
              }}
            >
              Remember: this is just a quick check-in. If things feel heavy,
              talking regularly – even with an AI – can help you feel less
              alone with it.
            </p>
            <a
              href="/chat"
              style={{
                display: "inline-block",
                marginTop: "4px",
                padding: "10px 16px",
                borderRadius: "9999px",
                border: "none",
                background: "#22c55e",
                color: "black",
                fontWeight: 600,
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              Go to chat with VENTFREELY
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
