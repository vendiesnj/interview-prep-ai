"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "../components/LogoutButton";

const PRACTICE_NAV = [
  { href: "/practice", label: "Practice" },
  { href: "/question-bank", label: "Question Bank" },
  { href: "/job-profiles", label: "Job Profiles" },
  { href: "/results", label: "Results" },
  { href: "/progress", label: "Insights" },
  { href: "/sessions", label: "Sessions" },
];

function PracticeTopNav() {
  const pathname = usePathname();

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        borderBottom: "1px solid var(--card-border-soft)",
        background: `
          radial-gradient(900px 400px at 10% -10%, var(--app-bg-accent-a), transparent 55%),
          var(--card-bg)
        `,
        padding: "12px 16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              fontWeight: 900,
              letterSpacing: 0.6,
            }}
          >
            PRACTICE
          </div>

          <div
            style={{
              fontSize: 16,
              color: "var(--text-primary)",
              fontWeight: 800,
            }}
          >
            Tools
          </div>
        </div>

        <nav style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {PRACTICE_NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href + "/"));

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: "var(--radius-lg)",
                  border: active
                    ? "1px solid var(--accent-strong)"
                    : "1px solid var(--card-border)",
                  background: active ? "var(--accent-soft)" : "var(--card-bg)",
                  color: active ? "var(--accent)" : "var(--text-primary)",
                  fontWeight: active ? 900 : 800,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: active ? "var(--accent)" : "var(--text-soft)",
                    boxShadow: active ? "var(--shadow-glow)" : "none",
                  }}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showPracticeSubNav =
    pathname?.startsWith("/practice") ||
    pathname?.startsWith("/question-bank") ||
    pathname?.startsWith("/job-profiles") ||
    pathname?.startsWith("/results") ||
    pathname?.startsWith("/progress") ||
    pathname?.startsWith("/sessions");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: `
          radial-gradient(900px 420px at 20% -10%, var(--app-bg-accent-a), transparent 60%),
          radial-gradient(900px 420px at 100% 0%, var(--app-bg-accent-b), transparent 55%),
          var(--app-bg)
        `,
        color: "var(--text-primary)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px" }}>
        <LogoutButton />
      </div>

      {showPracticeSubNav ? <PracticeTopNav /> : null}

      <main
        style={{
          flex: "1 1 auto",
          padding: 22,
          minWidth: 0,
          overflowX: "hidden",
        }}
      >
        {children}
      </main>
    </div>
  );
}