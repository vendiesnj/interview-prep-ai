"use client";

import React from "react";

export default function SetPasswordClient() {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(data?.error ?? "Unable to set password.");
        return;
      }

      setMsg("Password set successfully. You can now sign in with email + password.");
      setPassword("");
      setConfirm("");
    } catch {
      setErr("Network error. Please try again.");
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
        color: "var(--text-primary)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 18,
          border: "1px solid var(--card-border)",
          background: "rgba(255,255,255,0.04)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          padding: 18,
        }}
      >
        <div style={{ padding: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)" }}>
            INTERVIEW PERFORMANCE COACH
          </div>

          <h1 style={{ marginTop: 8, fontSize: 22, fontWeight: 800 }}>Set a password</h1>

          <p style={{ marginTop: 8, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
            If you signed up with Google, you can optionally set a password so you can also sign in
            with email + password.
          </p>

          <form onSubmit={onSubmit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              type="password"
              autoComplete="new-password"
              required
              style={{
                width: "100%",
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid var(--card-border)",
                background: "var(--card-bg)",
                color: "var(--text-primary)",
                outline: "none",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />

            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              type="password"
              autoComplete="new-password"
              required
              style={{
                width: "100%",
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid var(--card-border)",
                background: "var(--card-bg)",
                color: "var(--text-primary)",
                outline: "none",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />

            {err ? (
              <div style={{ fontSize: 12, color: "#FCA5A5", fontWeight: 800 }}>{err}</div>
            ) : null}

            {msg ? (
              <div style={{ fontSize: 12, color: "#A7F3D0", fontWeight: 800 }}>{msg}</div>
            ) : null}

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
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Saving..." : "Set password"}
            </button>
          </form>

          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
            <a href="/account" style={{ color: "#A5F3FC", fontWeight: 900, textDecoration: "none" }}>
              Back to account
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}