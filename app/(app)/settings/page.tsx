"use client";

import React from "react";
import PremiumShell from "../../components/PremiumShell";
import PremiumCard from "../../components/PremiumCard";
import { getProfile, saveProfile, type UserProfile } from "../../lib/profileStore";

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "12px 0",
        borderTop: "1px solid var(--card-border-soft)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 900,
            color: "var(--text-primary)",
          }}
        >
          {label}
        </div>

        {description ? (
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}
          >
            {description}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        style={{
          width: 46,
          height: 28,
          borderRadius: 999,
          border: value
            ? "1px solid var(--accent-strong)"
            : "1px solid var(--card-border)",
          background: value ? "var(--accent-soft)" : "var(--card-bg-strong)",
          position: "relative",
          cursor: "pointer",
          flex: "0 0 auto",
          boxShadow: value ? "var(--shadow-glow)" : "none",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: value ? 22 : 3,
            width: 22,
            height: 22,
            borderRadius: 999,
            background: value ? "var(--accent)" : "rgba(229,231,235,0.75)",
            transition: "left 140ms ease",
            boxShadow: "0 8px 18px rgba(0,0,0,0.35)",
          }}
        />
      </button>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 16,
        fontWeight: 950,
        letterSpacing: -0.2,
        color: "var(--text-primary)",
      }}
    >
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    setProfile(getProfile());
  }, []);

  function updateSettings(partial: Partial<UserProfile["settings"]>) {
    setProfile((prev) => {
      const base = prev ?? getProfile();
      const next: UserProfile = {
        ...base,
        settings: {
          ...base.settings,
          ...partial,
        },
      };
      saveProfile(next);
      return next;
    });
  }

  const s = profile?.settings;

  return (
    <PremiumShell
      title="Settings"
      subtitle="Control scoring behavior, timing, and the app experience."
    >
      <div style={{ display: "grid", gap: 16, maxWidth: 920 }}>
        <PremiumCard
          style={{
            padding: 16,
            borderRadius: "var(--radius-md)",
          }}
        >
          <SectionTitle>Scoring</SectionTitle>

          <Toggle
            label="Strict mode"
            description="Harsher scoring that demands clear STAR structure and measurable impact."
            value={!!s?.strictMode}
            onChange={(next) => updateSettings({ strictMode: next })}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              padding: "12px 0",
              borderTop: "1px solid var(--card-border-soft)",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: "var(--text-primary)",
                }}
              >
                Answer time limit
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                }}
              >
                Sets the default countdown for practice answers.
              </div>
            </div>

            <select
              value={s?.answerTimeLimit ?? 120}
              onChange={(e) => updateSettings({ answerTimeLimit: Number(e.target.value) })}
              style={{
                height: 36,
                borderRadius: "var(--radius-sm)",
                padding: "0 12px",
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontWeight: 800,
              }}
            >
              <option value={60}>60s</option>
              <option value={90}>90s</option>
              <option value={120}>2 min</option>
              <option value={150}>2.5 min</option>
              <option value={180}>3 min</option>
              <option value={240}>4 min</option>
            </select>
          </div>
        </PremiumCard>
      </div>
    </PremiumShell>
  );
}