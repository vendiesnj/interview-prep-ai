"use client";

import { useEffect, useState } from "react";

type Entitlement = {
  isPro: boolean;
};

export default function BillingSidebarButton({
  collapsed,
}: {
  collapsed: boolean;
}) {
  const [isPro, setIsPro] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/entitlement", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as Partial<Entitlement>;
        if (typeof j?.isPro === "boolean") setIsPro(j.isPro);
      } catch {}
    })();
  }, []);

  async function go() {
    if (loading) return;
    setLoading(true);

    try {
      const endpoint = isPro ? "/api/billing/portal" : "/api/billing/checkout";
      const body = isPro ? undefined : JSON.stringify({ mode: "subscription" });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });

      const j = await res.json().catch(() => ({}));

      if (j?.url) {
        window.location.href = j.url;
        return;
      }
    } catch {}

    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={go}
      title={isPro ? "Manage billing" : "Upgrade"}
      disabled={loading}
      style={{
        textDecoration: "none",
        padding: collapsed ? "10px 6px" : "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "linear-gradient(90deg, rgba(99,102,241,0.35), rgba(34,211,238,0.22))",
        color: "#E5E7EB",
        fontWeight: 950,
        fontSize: 13,
        textAlign: "center",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.75 : 1,
      }}
    >
      {!collapsed ? (isPro ? "Manage billing" : "Upgrade") : "▲"}
    </button>
  );
}