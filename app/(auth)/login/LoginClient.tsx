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

  // Redirect manually
  window.location.href = res.url ?? callbackUrl;
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
            Sign in to continue
          </h1>
          <p style={{ marginTop: 8, fontSize: 13, color: "#9CA3AF", lineHeight: 1.5 }}>
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
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#E5E7EB",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Continue with Google
          </button>
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
  <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.10)" }} />
  <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 800 }}>or</div>
  <div style={{ height: 1, flex: 1, background: "rgba(255,255,255,0.10)" }} />
</div>

<form onSubmit={onEmailLogin} style={{ marginTop: 14, display: "grid", gap: 10 }}>
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
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.03)",
      color: "#E5E7EB",
      outline: "none",
      fontSize: 14,
      boxSizing: "border-box",
    }}
  />

  {error ? (
    <div style={{ fontSize: 12, color: "#FCA5A5", fontWeight: 800 }}>{error}</div>
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
      fontWeight: 950,
      cursor: loading ? "not-allowed" : "pointer",
    }}
  >
    {loading ? "Signing in..." : "Sign in with Email"}
  </button>
</form>

<div style={{ marginTop: 12, fontSize: 12, color: "#9CA3AF", textAlign: "center" }}>
  New here?{" "}
  <a href="/signup" style={{ color: "#A5F3FC", fontWeight: 900, textDecoration: "none" }}>
    Create an account
  </a>
</div>

          <div style={{ marginTop: 14, fontSize: 12, color: "#6B7280", textAlign: "center" }}>
            By continuing, you agree to our Terms and Privacy Policy.
          </div>
        </div>
      </div>
    </main>
  );
}