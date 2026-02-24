"use client";

import React from "react";

export default function PremiumShell({
  title,
  subtitle,
  hideHeader,
  children,
}: {
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px 420px at 20% -10%, rgba(99,102,241,0.16), transparent 60%), #05070b",
        color: "#E5E7EB",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 20px 64px" }}>
        {/* Header */}
        {!hideHeader ? (
          <div style={{ marginBottom: 22 }}>
            {title ? (
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 950,
                  letterSpacing: -0.6,
                  lineHeight: 1.1,
                }}
              >
                {title}
              </div>
            ) : null}

            {subtitle ? (
              <div style={{ marginTop: 10, fontSize: 15, color: "#9CA3AF", lineHeight: 1.6, maxWidth: 760 }}>
                {subtitle}
              </div>
            ) : null}

            {(title || subtitle) ? (
              <div
                style={{
                  marginTop: 18,
                  height: 1,
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 999,
                }}
              />
            ) : null}
          </div>
        ) : null}

        {children}

        <div
  style={{
    marginTop: 28,
    paddingTop: 16,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    color: "#9CA3AF",
    fontSize: 12,
  }}
>
  <div style={{ opacity: 0.9 }}>
    © {new Date().getFullYear()} Interview Performance Coach
  </div>

  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <a
      href="/terms"
      style={{ color: "#A5F3FC", fontWeight: 900, textDecoration: "none" }}
    >
      Terms
    </a>
    <span style={{ color: "rgba(255,255,255,0.18)" }}>•</span>
    <a
      href="/privacy"
      style={{ color: "#A5F3FC", fontWeight: 900, textDecoration: "none" }}
    >
      Privacy
    </a>
  </div>
</div>

      </div>
    </div>
  );
}