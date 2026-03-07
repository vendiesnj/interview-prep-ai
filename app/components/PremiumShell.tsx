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
        background: `
          radial-gradient(900px 420px at 20% -10%, var(--app-bg-accent-a), transparent 60%),
          radial-gradient(900px 420px at 100% 0%, var(--app-bg-accent-b), transparent 55%),
          var(--app-bg)
        `,
        color: "var(--text-primary)",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: 20 }}>
        {!hideHeader && (title || subtitle) ? (
          <div style={{ marginBottom: 18 }}>
            {title ? (
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 950,
                  letterSpacing: -0.3,
                  color: "var(--text-primary)",
                }}
              >
                {title}
              </div>
            ) : null}

            {subtitle ? (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 15,
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                  maxWidth: 760,
                }}
              >
                {subtitle}
              </div>
            ) : null}

            <div
              style={{
                marginTop: 16,
                height: 1,
                background: "var(--card-border-soft)",
              }}
            />
          </div>
        ) : null}

        {children}

        <div
          style={{
            marginTop: 22,
            borderTop: "1px solid var(--card-border-soft)",
            paddingTop: 16,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          <div>Interview Performance Coach</div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a
              href="/terms"
              style={{
                color: "var(--accent)",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Terms
            </a>

            <span style={{ color: "var(--text-soft)" }}>•</span>

            <a
              href="/privacy"
              style={{
                color: "var(--accent)",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Privacy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}