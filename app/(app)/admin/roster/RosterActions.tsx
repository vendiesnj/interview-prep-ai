"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RosterActions({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleToggle() {
    if (currentStatus === "active" && !confirm) {
      setConfirm(true);
      return;
    }

    setLoading(true);
    setConfirm(false);
    try {
      const newStatus = currentStatus === "disabled" ? "active" : "disabled";
      await fetch("/api/admin/roster", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: newStatus }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (confirm) {
    return (
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={handleToggle}
          disabled={loading}
          style={{
            padding: "5px 10px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--danger)",
            background: "rgba(220,38,38,0.08)",
            color: "var(--danger)",
            fontSize: 11,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Confirm
        </button>
        <button
          onClick={() => setConfirm(false)}
          style={{
            padding: "5px 10px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--card-border-soft)",
            background: "transparent",
            color: "var(--text-muted)",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      style={{
        padding: "5px 12px",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${currentStatus === "disabled" ? "rgba(22,163,74,0.30)" : "var(--card-border-soft)"}`,
        background: currentStatus === "disabled" ? "rgba(22,163,74,0.07)" : "transparent",
        color: currentStatus === "disabled" ? "#16A34A" : "var(--text-muted)",
        fontSize: 11,
        fontWeight: 900,
        cursor: loading ? "wait" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {loading ? "..." : currentStatus === "disabled" ? "Re-enable" : "Disable"}
    </button>
  );
}
