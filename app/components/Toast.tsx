"use client";

import React, { useEffect, useRef } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type?: ToastType;
}

/** Single toast notification */
export function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(() => onDismiss(toast.id), 3500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [toast.id, onDismiss]);

  const bg = toast.type === "error"
    ? "var(--danger)"
    : toast.type === "info"
    ? "var(--accent)"
    : "var(--success)";

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => onDismiss(toast.id)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "11px 16px",
        borderRadius: "var(--radius-md)",
        background: bg,
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        cursor: "pointer",
        maxWidth: 340,
        lineHeight: 1.4,
        animation: "toast-in 0.2s ease",
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      <span style={{ opacity: 0.7, fontSize: 16, lineHeight: 1 }}>×</span>
    </div>
  );
}

/** Toast container — render at the bottom of any page */
export function ToastContainer({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 8,
      pointerEvents: "none",
    }}>
      <style>{`@keyframes toast-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <Toast toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

/** Hook for managing toasts */
export function useToast() {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const show = React.useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, show, dismiss };
}
