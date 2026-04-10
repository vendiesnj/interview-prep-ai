"use client";

import { useEffect, useState } from "react";

type StreakData = {
  current: number;
  longest: number;
  lastActiveDate: string | null;
  totalActiveDays: number;
};

export default function StreakBanner() {
  const [data, setData] = useState<StreakData | null>(null);

  useEffect(() => {
    fetch("/api/streak")
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const { current, longest, totalActiveDays } = data;

  const statusText = current === 0
    ? "No active streak yet. Complete a session to start."
    : current === 1
    ? "1-day streak. Return tomorrow to keep it going."
    : `${current}-day streak.`;

  return (
    <div style={{
      marginBottom: 20,
      padding: "10px 16px",
      borderRadius: "var(--radius-sm, 8px)",
      border: "1px solid var(--card-border)",
      background: "var(--card-bg)",
      display: "flex",
      alignItems: "center",
      gap: 20,
      flexWrap: "wrap" as const,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          {statusText}
        </span>
        {current === 0 && (
          <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
            Any practice session, resume upload, or assessment counts.
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
        {[
          { label: "Current", value: current },
          { label: "Best",    value: longest },
          { label: "Total",   value: totalActiveDays ?? 0 },
        ].map(({ label, value }, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: i === 0 ? 0 : 0 }}>
            {i > 0 && <div style={{ width: 1, height: 20, background: "var(--card-border)", marginRight: 20 }} />}
            <div style={{ textAlign: "center" as const }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
