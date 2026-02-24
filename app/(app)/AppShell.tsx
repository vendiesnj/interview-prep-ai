"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "../components/LogoutButton";
const PRACTICE_NAV = [
  { href: "/practice", label: "Practice" },
  { href: "/question-bank", label: "Question Bank" },
];

function PracticeTopNav() {
  const pathname = usePathname();

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background:
          "radial-gradient(900px 400px at 10% -10%, rgba(34,211,238,0.10), transparent 55%), rgba(17,24,39,0.92)",
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
          <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 900, letterSpacing: 0.6 }}>
            PRACTICE
          </div>
          <div style={{ fontSize: 16, color: "#E5E7EB", fontWeight: 950 }}>Tools</div>
        </div>

        <nav style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {PRACTICE_NAV.map((item) => {
            const active =
              pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href + "/"));

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
                  borderRadius: 12,
                  border: active
                    ? "1px solid rgba(34,211,238,0.35)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: active ? "rgba(34,211,238,0.10)" : "rgba(255,255,255,0.03)",
                  color: active ? "#A5F3FC" : "#E5E7EB",
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
                    background: active ? "rgba(34,211,238,0.95)" : "rgba(255,255,255,0.18)",
                    boxShadow: active ? "0 0 14px rgba(34,211,238,0.35)" : "none",
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
    pathname?.startsWith("/practice") || pathname?.startsWith("/question-bank");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "rgba(3,7,18,1)",
        color: "#E5E7EB",
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px" }}>
  <LogoutButton />
</div>
      {showPracticeSubNav ? <PracticeTopNav /> : null}

      <main style={{ flex: "1 1 auto", padding: 22, minWidth: 0, overflowX: "hidden" }}>
        {children}
      </main>
    </div>
  );
}