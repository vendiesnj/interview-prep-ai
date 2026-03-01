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
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(800px 280px at 15% -20%, rgba(34,211,238,0.10), transparent 55%), rgba(255,255,255,0.03)",
        boxShadow:
          "0 18px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}