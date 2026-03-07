"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() =>
        signOut({ callbackUrl: "/login?callbackUrl=%2Fdashboard" })
      }
      style={{
        width: "100%", // 👈 THIS is the key
        padding: "10px 12px",
        border: "none",
        background: "transparent",
        color: "var(--text-muted)",
        fontWeight: 900,
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      Log out
    </button>
  );
}