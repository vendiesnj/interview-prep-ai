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
        border: "1px solid var(--card-border-soft)",
        background: "var(--card-bg)",
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