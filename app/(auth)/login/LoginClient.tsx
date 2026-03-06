"use client";

import React from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("from") || sp.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    setLoading(false);

    if (!res || res.error) {
      setError("Invalid email or password.");
      return;
    }

    window.location.href = res.url ?? callbackUrl;
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
            Sign in to continue
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
            Practice answers, get coaching, and track improvement over time.
          </p>

          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl })}
            style={{
              marginTop: 14,
              width: "100%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--card-border)",
              background: "var(--card-bg-strong)",
              color: "var(--text-primary)",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Continue with Google
          </button>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ height: 1, flex: 1, background: "var(--card-border-soft)" }} />
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                fontWeight: 800,
              }}
            >
              or
            </div>
            <div style={{ height: 1, flex: 1, background: "var(--card-border-soft)" }} />
          </div>

          <form
            onSubmit={onEmailLogin}
            style={{ marginTop: 14, display: "grid", gap: 10 }}
          >
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

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 2,
              }}
            >
              <a
                href="/forgot-password"
                style={{
                  fontSize: 12,
                  color: "var(--accent)",
                  fontWeight: 900,
                  textDecoration: "none",
                }}
              >
                Forgot password?
              </a>
            </div>

            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              autoComplete="current-password"
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
              {loading ? "Signing in..." : "Sign in with Email"}
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
            New here?{" "}
            <a
              href="/signup"
              style={{
                color: "var(--accent)",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Create an account
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
            By continuing, you agree to our Terms and Privacy Policy.
          </div>
        </div>
      </div>
    </main>
  );
}