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
  const hasStreak = current >= 2;
  const isOnFire = current >= 5;

  return (
    <div style={{
      marginBottom: 24,
      padding: "12px 18px",
      borderRadius: 14,
      border: `1px solid ${isOnFire ? "rgba(251,146,60,0.4)" : hasStreak ? "rgba(16,185,129,0.3)" : "var(--card-border-soft)"}`,
      background: isOnFire ? "rgba(251,146,60,0.06)" : hasStreak ? "rgba(16,185,129,0.05)" : "var(--card-bg-strong)",
      display: "flex",
      alignItems: "center",
      gap: 16,
      flexWrap: "wrap" as const,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 26, lineHeight: 1 }}>
          {isOnFire ? "🔥" : current >= 2 ? "⚡" : "✨"}
        </span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)" }}>
            {current === 0
              ? "Start your streak today"
              : current === 1
              ? "1-day streak — come back tomorrow!"
              : `${current}-day streak — keep it going!`}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
            {current === 0
              ? "Complete any task to begin your streak."
              : isOnFire
              ? "You're on fire. Consistency is the secret."
              : "Every day you show up is progress."}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginLeft: "auto" }}>
        <div style={{ textAlign: "center" as const }}>
          <div style={{ fontSize: 18, fontWeight: 950, color: isOnFire ? "#F97316" : hasStreak ? "#10B981" : "var(--text-primary)" }}>
            {current}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.4 }}>CURRENT</div>
        </div>
        <div style={{ width: 1, background: "var(--card-border-soft)" }} />
        <div style={{ textAlign: "center" as const }}>
          <div style={{ fontSize: 18, fontWeight: 950, color: "var(--text-primary)" }}>{longest}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.4 }}>BEST</div>
        </div>
        <div style={{ width: 1, background: "var(--card-border-soft)" }} />
        <div style={{ textAlign: "center" as const }}>
          <div style={{ fontSize: 18, fontWeight: 950, color: "var(--text-primary)" }}>{totalActiveDays ?? 0}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.4 }}>TOTAL DAYS</div>
        </div>
      </div>
    </div>
  );
}
