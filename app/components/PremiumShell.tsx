"use client";

import React from "react";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();
  const logoUrl = (session as any)?.tenant?.logoUrl ?? null;
  const tenantName = (session as any)?.tenant?.name ?? null;

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
                {!hideHeader && (title || subtitle || logoUrl || tenantName) ? (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 560px" }}>
                {title ? (
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      letterSpacing: -0.3,
                      lineHeight: 1.3,
                      color: "var(--text-primary)",
                    }}
                  >
                    {title}
                  </div>
                ) : null}

                {subtitle ? (
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                      fontWeight: 400,
                      color: "var(--text-muted)",
                      lineHeight: 1.6,
                      maxWidth: 760,
                    }}
                  >
                    {subtitle}
                  </div>
                ) : null}
              </div>

              {logoUrl ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 12,
                    flex: "0 0 auto",
                    minHeight: 56,
                  }}
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={tenantName ?? "Tenant"}
                      style={{
                        height: 56,
                        width: "auto",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  ) : null}

                </div>
              ) : null}
            </div>

          </div>
        ) : null}

        {children}

        <div
          style={{
            marginTop: 22,
            borderTop: "1px solid var(--card-border-soft)",
            paddingTop: 16,
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            flexWrap: "wrap",
            color: "var(--text-soft)",
            fontSize: 11,
          }}
        >
          <a
            href="/terms"
            style={{
              color: "var(--text-soft)",
              textDecoration: "none",
            }}
          >
            Terms
          </a>

          <span>•</span>

          <a
            href="/privacy"
            style={{
              color: "var(--text-soft)",
              textDecoration: "none",
            }}
          >
            Privacy
          </a>
        </div>
      </div>
    </div>
  );
}