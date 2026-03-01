"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMessage(data?.error ?? "Something went wrong.");
    } else {
      setMessage("Password reset successful. You can now log in.");
    }

    setLoading(false);
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
            Reset Password
          </h1>

          <p style={{ marginTop: 8, fontSize: 13, color: "#9CA3AF", lineHeight: 1.5 }}>
            Enter a new password (min 8 characters).
          </p>

          <form onSubmit={handleSubmit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              disabled={loading || !token}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(34,211,238,0.35)",
                background: loading ? "rgba(34,211,238,0.10)" : "rgba(34,211,238,0.14)",
                color: "#A5F3FC",
                fontWeight: 950,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: !token ? 0.6 : 1,
              }}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          {!token ? (
            <div style={{ marginTop: 12, fontSize: 12, color: "#FCA5A5", fontWeight: 800 }}>
              Missing token. Please use the reset link from your email.
            </div>
          ) : null}

          {message ? (
            <div style={{ marginTop: 12, fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>
              {message}
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