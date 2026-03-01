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

      // Always show same message (prevents account enumeration)
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
        background:
          "radial-gradient(900px 500px at 15% 0%, rgba(34,211,238,0.18), transparent 55%), rgba(3,7,18,1)",
        color: "#E5E7EB",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          padding: 18,
        }}
      >
        <div style={{ padding: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.8, color: "#9CA3AF" }}>
            INTERVIEW PERFORMANCE COACH
          </div>

          <h1 style={{ marginTop: 8, fontSize: 22, fontWeight: 950 }}>
            Reset your password
          </h1>

          <p style={{ marginTop: 8, fontSize: 13, color: "#9CA3AF", lineHeight: 1.5 }}>
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
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                color: "#E5E7EB",
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
                borderRadius: 14,
                border: "1px solid rgba(34,211,238,0.35)",
                background: loading ? "rgba(34,211,238,0.10)" : "rgba(34,211,238,0.14)",
                color: "#A5F3FC",
                fontWeight: 950,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          {msg ? (
            <div style={{ marginTop: 12, fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>
              {msg}
            </div>
          ) : null}

          <div style={{ marginTop: 12, fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>
            <a href="/login" style={{ color: "#A5F3FC", fontWeight: 900, textDecoration: "none" }}>
              Back to login
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}