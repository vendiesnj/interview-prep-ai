"use client";

import React from "react";

export default function UpgradeModal({
  open,
  onClose,
  title = "Upgrade to Pro",
  message = "You’ve used your free attempts. Upgrade to keep practicing and unlock unlimited scoring, history, and question bank features.",
  primaryText = "Upgrade",
  secondaryText = "Not now",
  onPrimary,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  primaryText?: string;
  secondaryText?: string;
  onPrimary?: () => void;
}) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(17,24,39,0.92)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
          padding: 18,
          color: "#E5E7EB",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 950 }}>{title}</div>
            <div style={{ marginTop: 10, color: "#9CA3AF", lineHeight: 1.5 }}>
              {message}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              height: 36,
              width: 36,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "#E5E7EB",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(34,211,238,0.22)",
            background: "rgba(34,211,238,0.08)",
            color: "#A5F3FC",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          Pro includes: unlimited scored attempts • advanced coaching • question bank • saved history across devices
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "#E5E7EB",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {secondaryText}
          </button>

          <button
            onClick={() => (onPrimary ? onPrimary() : onClose())}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(34,211,238,0.45)",
              background: "rgba(34,211,238,0.18)",
              color: "#A5F3FC",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            {primaryText}
          </button>
        </div>
      </div>
    </div>
  );
}