"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DangerZoneDeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onDelete() {
    setErr(null);

    if (confirm !== "DELETE_MY_ACCOUNT") {
      setErr('Type DELETE_MY_ACCOUNT to confirm.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErr(data?.error ?? "Delete failed.");
        setLoading(false);
        return;
      }

      // Sign out and return to home
      await signOut({ redirect: false });
      router.push("/");
      router.refresh();
    } catch {
      setErr("Network error.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(252,165,165,0.25)",
        background: "rgba(252,165,165,0.06)",
      }}
    >
      <div style={{ fontWeight: 900, color: "#FCA5A5", marginBottom: 8 }}>
        Danger zone
      </div>

      <div style={{ color: "#E5E7EB", fontSize: 13, lineHeight: 1.5 }}>
        Permanently deletes your account and all interview attempts. This cannot be undone.
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setErr(null);
            setConfirm("");
          }}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(252,165,165,0.40)",
            background: "rgba(252,165,165,0.10)",
            color: "#FCA5A5",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Delete my account
        </button>
      </div>

      {open ? (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(17,24,39,0.55)",
          }}
        >
          <div style={{ color: "#E5E7EB", fontWeight: 900, marginBottom: 8 }}>
            Confirm deletion
          </div>

          <div style={{ color: "#9CA3AF", fontSize: 12, lineHeight: 1.5 }}>
            Type <span style={{ color: "#E5E7EB", fontWeight: 900 }}>DELETE_MY_ACCOUNT</span> to confirm.
          </div>

          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE_MY_ACCOUNT"
            style={{
              marginTop: 10,
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(17,24,39,0.55)",
              color: "#E5E7EB",
              outline: "none",
              fontWeight: 800,
            }}
          />

          {err ? (
            <div style={{ marginTop: 10, color: "#FCA5A5", fontSize: 12, fontWeight: 800 }}>
              {err}
            </div>
          ) : null}

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "#E5E7EB",
                fontWeight: 900,
                cursor: "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onDelete}
              disabled={loading}
              style={{
                marginLeft: "auto",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(252,165,165,0.45)",
                background: "rgba(252,165,165,0.12)",
                color: "#FCA5A5",
                fontWeight: 900,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Deleting…" : "Permanently delete"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}