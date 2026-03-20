"use client";

import React from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupPage() {
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
        setLoading(false);
        return;
      }

      // Auto-login after account creation → go to onboarding
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/onboarding",
        redirect: false,
      });

      if (result?.error) {
        setError("Account created — please log in.");
        setLoading(false);
        return;
      }

      window.location.href = "/onboarding";
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "radial-gradient(900px 500px at 15% 0%, rgba(37,99,235,0.06), transparent 55%), var(--app-bg, #0a0f1a)", color: "var(--text-primary)" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #2563EB, #0EA5E9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💬</div>
            <span style={{ fontSize: 20, fontWeight: 950, color: "var(--text-primary, #fff)", letterSpacing: -0.3 }}>Signal</span>
          </Link>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted, rgba(255,255,255,0.45))" }}>
            Communication & career platform
          </p>
        </div>

        {/* Card */}
        <div style={{ borderRadius: 20, border: "1px solid var(--card-border, rgba(255,255,255,0.08))", background: "var(--card-bg, rgba(255,255,255,0.03))", backdropFilter: "blur(20px)", padding: "32px 28px" }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 950, color: "var(--text-primary, #fff)", letterSpacing: -0.3 }}>
            Create your account
          </h1>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-muted, rgba(255,255,255,0.45))", lineHeight: 1.6 }}>
            Join Signal and start building your communication skills.
          </p>

          <form onSubmit={onSignup} style={{ display: "grid", gap: 12 }}>
            {[
              { value: name, setter: setName, placeholder: "Full name", type: "text" },
              { value: email, setter: setEmail, placeholder: "Email address", type: "email" },
              { value: password, setter: setPassword, placeholder: "Password (min 8 characters)", type: "password" },
            ].map(({ value, setter, placeholder, type }) => (
              <input
                key={placeholder}
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => setter(e.target.value)}
                required
                style={{ width: "100%", padding: "13px 14px", borderRadius: 12, border: "1px solid var(--input-border, rgba(255,255,255,0.1))", background: "var(--input-bg, rgba(255,255,255,0.05))", color: "var(--text-primary, #fff)", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            ))}

            {error && (
              <div style={{ fontSize: 13, color: "#EF4444", fontWeight: 800, padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ padding: "13px", borderRadius: 12, border: "none", background: loading ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #2563EB, #0EA5E9)", color: "#fff", fontWeight: 950, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 4px 20px rgba(37,99,235,0.35)", marginTop: 4 }}
            >
              {loading ? "Creating your account…" : "Create account →"}
            </button>
          </form>

          <p style={{ marginTop: 20, fontSize: 13, color: "var(--text-muted, rgba(255,255,255,0.4))", textAlign: "center" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#60A5FA", fontWeight: 900, textDecoration: "none" }}>Sign in</Link>
          </p>
          <p style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted, rgba(255,255,255,0.25))", textAlign: "center", lineHeight: 1.5 }}>
            By creating an account you agree to our{" "}
            <Link href="/terms" style={{ color: "inherit", textDecoration: "underline" }}>Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
