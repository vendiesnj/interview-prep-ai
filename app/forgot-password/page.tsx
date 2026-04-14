"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        setMsg("If an account exists for that email, we sent a reset link.");
      } else {
        setMsg("If an account exists for that email, we sent a reset link.");
      }
    } catch {
      setMsg("If an account exists for that email, we sent a reset link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: `
          radial-gradient(900px 500px at 15% 0%, var(--app-bg-accent-b), transparent 55%),
          var(--app-bg)
        `,
        color: "var(--text-primary)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--card-border)",
          background: `
            radial-gradient(800px 280px at 15% -20%, var(--accent-soft), transparent 55%),
            var(--card-bg)
          `,
          boxShadow: "var(--shadow-card)",
          padding: 18,
        }}
      >
        <div style={{ padding: 6 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 0.8,
              color: "var(--text-muted)",
            }}
          >
            INTERVIEW PERFORMANCE COACH
          </div>

          <h1
            style={{
              margin: "8px 0 0 0",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: -0.2,
              color: "var(--text-primary)",
            }}
          >
            Reset your password
          </h1>

          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              fontSize: 13,
              color: "var(--text-muted)",
              lineHeight: 1.55,
            }}
          >
            Enter your email and we’ll send you a reset link.
          </p>

          <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              autoComplete="email"
              required
              style={{
                width: "100%",
                padding: "12px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                outline: "none",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "var(--radius-sm)",
                border: loading
                  ? "1px solid var(--card-border)"
                  : "1px solid var(--accent-strong)",
                background: loading
                  ? "var(--card-bg-strong)"
                  : "linear-gradient(135deg, var(--accent-2-soft), var(--accent-soft))",
                color: "var(--text-primary)",
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "var(--shadow-glow)",
              }}
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          {msg ? (
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "var(--text-muted)",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              {msg}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            <a
              href="/login"
              style={{
                color: "var(--accent)",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Back to login
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}