"use client";

import React from "react";

export default function PremiumCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--card-border)",
        background: `
          radial-gradient(800px 280px at 15% -20%, var(--accent-soft), transparent 55%),
          var(--card-bg)
        `,
        boxShadow: "var(--shadow-card)",
        padding: 16,
        color: "var(--text-primary)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}