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
        border: "1px solid var(--ipc-card-border)",
        background: "var(--ipc-card-bg)",
        boxShadow: "var(--ipc-card-shadow)",
        padding: 18,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
