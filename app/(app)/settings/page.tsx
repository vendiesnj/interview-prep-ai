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
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 900 }}>{label}</div>
        {description ? (
          <div style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>{description}</div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          width: 46,
          height: 28,
          borderRadius: 999,
          border: value ? "1px solid rgba(34,211,238,0.50)" : "1px solid rgba(255,255,255,0.14)",
          background: value ? "rgba(34,211,238,0.20)" : "rgba(255,255,255,0.06)",
          position: "relative",
          cursor: "pointer",
          flex: "0 0 auto",
          boxShadow: value ? "0 0 18px rgba(34,211,238,0.12)" : "none",
        }}
        aria-pressed={value}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: value ? 22 : 3,
            width: 22,
            height: 22,
            borderRadius: 999,
            background: value ? "rgba(34,211,238,0.95)" : "rgba(229,231,235,0.75)",
            transition: "left 140ms ease",
            boxShadow: "0 8px 18px rgba(0,0,0,0.35)",
          }}
        />
      </button>
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
      document.documentElement.setAttribute("data-ipc-theme", next.settings.theme ?? "dark");
if (partial.theme) {
  document.documentElement.dataset.theme = partial.theme as any;
}

      return next;
    });
  }

  const s = profile?.settings;

  return (
    <PremiumShell title="Settings" subtitle="Control scoring behavior, timing, privacy, and the app’s look & feel.">
      <div style={{ display: "grid", gap: 16, maxWidth: 920 }}>
        <PremiumCard>
          <div style={{ fontSize: 16, fontWeight: 950 }}>Scoring</div>

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
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>Answer time limit</div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>
                Sets the default countdown for practice answers.
              </div>
            </div>

            <select
              value={s?.answerTimeLimit ?? 120}
              onChange={(e) => updateSettings({ answerTimeLimit: Number(e.target.value) })}
              style={{
                height: 36,
                borderRadius: 12,
                padding: "0 12px",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "#E5E7EB",
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

        <PremiumCard>
          <div style={{ fontSize: 16, fontWeight: 950 }}>Appearance</div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              padding: "12px 0",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>Theme</div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>
                Visual theme preference (we’ll wire this into the whole app next).
              </div>
            </div>

            <select
              value={s?.theme ?? "blue"}
              onChange={(e) => updateSettings({ theme: e.target.value as any })}
              style={{
                height: 36,
                borderRadius: 12,
                padding: "0 12px",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "#E5E7EB",
                fontWeight: 800,
              }}
            >
              <option value="blue">Blue (default)</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </PremiumCard>

        <PremiumCard>
          <div style={{ fontSize: 16, fontWeight: 950 }}>Notifications & Privacy</div>

          <Toggle
            label="Email reminders"
            description="Turn on reminders for scheduled practice (UI only for now — we’ll wire email later)."
            value={!!s?.emailReminders}
            onChange={(next) => updateSettings({ emailReminders: next })}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              padding: "12px 0",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>Privacy mode</div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>
                Private mode can hide transcripts on-screen and reduce saved detail (we’ll enforce behavior next).
              </div>
            </div>

            <select
              value={s?.privacyMode ?? "normal"}
              onChange={(e) => updateSettings({ privacyMode: e.target.value as any })}
              style={{
                height: 36,
                borderRadius: 12,
                padding: "0 12px",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "#E5E7EB",
                fontWeight: 800,
              }}
            >
              <option value="normal">Normal</option>
              <option value="private">Private</option>
            </select>
          </div>
        </PremiumCard>
      </div>
    </PremiumShell>
  );
}