"use client";

import { useState } from "react";

export default function UpgradeButton({
  mode = "subscription",
  label = "Upgrade to Pro",
}: {
  mode?: "subscription" | "payment";
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function startCheckout() {
    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      const j = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(j?.message ?? j?.error ?? "Checkout failed");
        setLoading(false);
        return;
      }

      if (!j?.url) {
        setErr("No checkout URL returned.");
        setLoading(false);
        return;
      }

      // ✅ Redirect to Stripe Checkout
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
        onClick={startCheckout}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid rgba(34,211,238,0.45)",
          background: "rgba(34,211,238,0.18)",
          color: "#A5F3FC",
          fontWeight: 950,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Redirecting…" : label}
      </button>

      {err && (
        <div style={{ color: "#FCA5A5", fontSize: 12, fontWeight: 800 }}>
          {err}
        </div>
      )}
    </div>
  );
}