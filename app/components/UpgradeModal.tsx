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
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--card-border)",
          background: "rgba(17,24,39,0.92)",
          boxShadow: "var(--shadow-card)",
          padding: 18,
          color: "var(--text-primary)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--text-primary)",
              }}
            >
              {title}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "var(--text-muted)",
                lineHeight: 1.5,
              }}
            >
              {message}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              height: 36,
              width: 36,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--card-border)",
              background: "var(--card-bg)",
              color: "var(--text-primary)",
              fontWeight: 700,
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
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--accent-strong)",
            background: "var(--accent-soft)",
            color: "var(--accent)",
            fontWeight: 800,
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Pro includes: unlimited scored attempts • advanced coaching • question bank • saved history across devices
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--card-border)",
              background: "var(--card-bg)",
              color: "var(--text-primary)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {secondaryText}
          </button>

          <button
            onClick={() => (onPrimary ? onPrimary() : onClose())}
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--accent-strong)",
              background: "linear-gradient(135deg, var(--accent-2-soft), var(--accent-soft))",
              color: "var(--text-primary)",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            {primaryText}
          </button>
        </div>
      </div>
    </div>
  );
}