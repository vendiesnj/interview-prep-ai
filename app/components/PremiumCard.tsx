"use client";

import React from "react";

export default function PremiumCard({
  children,
  style,
  interactive,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  interactive?: boolean;
}) {
  return (
    <div
      className={interactive ? "premium-card premium-card--interactive" : "premium-card"}
      style={{
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--card-border-soft)",
        background: "var(--card-bg)",
        boxShadow: "var(--shadow-card)",
        padding: 16,
        color: "var(--text-primary)",
        ...style,
      }}
    >
      {children}
      <style>{`
        .premium-card {
          transition: border-color 140ms ease, background 140ms ease;
        }
        .premium-card--interactive {
          cursor: pointer;
        }
        .premium-card--interactive:hover {
          background: var(--card-bg-strong);
          border-color: var(--card-border);
        }
      `}</style>
    </div>
  );
}