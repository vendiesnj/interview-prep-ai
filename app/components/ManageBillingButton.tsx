"use client";

import { useState } from "react";

export default function ManageBillingButton({
  label = "Manage billing",
}: {
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const j = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(j?.message ?? j?.error ?? "Could not open billing portal.");
        setLoading(false);
        return;
      }

      if (!j?.url) {
        setErr("No portal URL returned.");
        setLoading(false);
        return;
      }

      window.location.href = j.url;
    } catch (e: any) {
      setErr(e?.message ?? "Network error");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
        type="button"
        onClick={go}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.06)",
          color: "#E5E7EB",
          fontWeight: 950,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Opening…" : label}
      </button>

      {err && (
        <div style={{ color: "#FCA5A5", fontSize: 12, fontWeight: 800 }}>
          {err}
        </div>
      )}
    </div>
  );
}