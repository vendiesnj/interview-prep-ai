"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function BillingSyncOnReturn() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const checkout = sp.get("checkout");
    const sessionId = sp.get("session_id");

    if (checkout !== "success" || !sessionId) return;

    let cancelled = false;

    (async () => {
      try {
        setMsg("Finalizing your upgrade…");

        const res = await fetch(`/api/billing/sync?session_id=${encodeURIComponent(sessionId)}`, {
          method: "POST",
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.message ?? j?.error ?? "Sync failed");
        }

        if (cancelled) return;

                // Remove params + refresh server component data
        setMsg(null);

        // Soft navigation first (App Router)
        router.replace("/account");
        router.refresh();

        // Hard fallback (covers cases where router.replace doesn't visibly update)
        setTimeout(() => {
          window.location.replace("/account");
        }, 50);
      } catch (e: any) {
        if (cancelled) return;
        setMsg(e?.message ?? "Could not finalize upgrade. Please refresh.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sp, router]);

  if (!msg) return null;

  return (
    <div
      style={{
        marginTop: 14,
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(34,211,238,0.35)",
        background: "rgba(34,211,238,0.10)",
        color: "#A5F3FC",
        fontWeight: 900,
        fontSize: 13,
      }}
    >
      {msg}
    </div>
  );
}