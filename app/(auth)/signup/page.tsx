"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed.");
        return;
      }

      router.push("/login");
    } catch {
      setError("Network error.");
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
              fontWeight: 950,
              letterSpacing: -0.2,
              color: "var(--text-primary)",
            }}
          >
            Create your account
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
            Start practicing interview answers, get coaching, and track your progress over time.
          </p>

          <form
            onSubmit={onSignup}
            style={{ marginTop: 16, display: "grid", gap: 10 }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
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

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
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

            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 8 chars)"
              type="password"
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

            {error ? (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--danger)",
                  fontWeight: 800,
                }}
              >
                {error}
              </div>
            ) : null}

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
                fontWeight: 950,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "var(--shadow-glow)",
              }}
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            Already have an account?{" "}
            <a
              href="/login"
              style={{
                color: "var(--accent)",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Sign in
            </a>
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color: "var(--text-soft)",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            By creating an account, you agree to our Terms and Privacy Policy.
          </div>
        </div>
      </div>
    </main>
  );
}