"use client";

import React from "react";
import { useSession } from "next-auth/react";
import PremiumShell from "../../components/PremiumShell";
import PremiumCard from "../../components/PremiumCard";
import { getProfile, saveProfile, type UserProfile } from "../../lib/profileStore";
import type { AttemptEntitlement } from "../../lib/entitlements";

const STAGES = [
  { id: "pre_college",    label: "Pre-College",    icon: "🎓", color: "#10B981", desc: "High school → college prep" },
  { id: "during_college", label: "During College",  icon: "📚", color: "#2563EB", desc: "Internships, interviews, campus life" },
  { id: "post_college",   label: "Post-College",    icon: "🚀", color: "#8B5CF6", desc: "First job, finances, career growth" },
] as const;

const TARGET_INDUSTRY_OPTIONS = [
  "Technology",
  "Finance",
  "Consulting",
  "Healthcare",
  "Government",
  "Education",
  "Non-profit",
  "Retail/Consumer",
  "Media/Entertainment",
  "Other",
];

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
  const { data: session, update } = useSession();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [entitlement, setEntitlement] = React.useState<AttemptEntitlement | null>(null);
  const [billingLoading, setBillingLoading] = React.useState(false);
  const [billingError, setBillingError] = React.useState<string | null>(null);
  const isTenantUser = !!(session as any)?.tenant;

  // Career profile state
  const [careerProfile, setCareerProfile] = React.useState({
    name: "",
    graduationYear: "" as string | number,
    major: "",
    targetRole: "",
    targetIndustry: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [savedMsg, setSavedMsg] = React.useState(false);

  // Stage state
  const [stageSaving, setStageSaving] = React.useState(false);
  const currentStage: string = (session?.user as any)?.demoPersona ?? "during_college";

  async function switchStage(stageId: string) {
    if (stageId === currentStage || stageSaving) return;
    setStageSaving(true);
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demoPersona: stageId }),
    });
    await update();
    setStageSaving(false);
  }

  React.useEffect(() => {
    if (!isTenantUser) {
      fetch("/api/entitlement", { cache: "no-store" })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setEntitlement(d); })
        .catch(() => {});
    }
  }, [isTenantUser]);

  async function handleBilling() {
    if (billingLoading) return;
    setBillingLoading(true);
    setBillingError(null);
    try {
      const endpoint = entitlement?.isPro ? "/api/billing/portal" : "/api/billing/checkout";
      const body = entitlement?.isPro ? undefined : JSON.stringify({ mode: "subscription" });
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
      setBillingError(j?.message ?? "Billing unavailable. Please try again or contact support.");
    } catch (err: any) {
      setBillingError(err?.message ?? "Something went wrong.");
    }
    setBillingLoading(false);
  }

  React.useEffect(() => {
    setProfile(getProfile());
    // Fetch career profile from API
    fetch("/api/profile")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setCareerProfile({
            name: data.name ?? "",
            graduationYear: data.graduationYear ?? "",
            major: data.major ?? "",
            targetRole: data.targetRole ?? "",
            targetIndustry: data.targetIndustry ?? "",
          });
        }
      })
      .catch(() => {});
  }, []);

  async function saveCareerProfile() {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: careerProfile.name || undefined,
          graduationYear: careerProfile.graduationYear
            ? Number(careerProfile.graduationYear)
            : undefined,
          major: careerProfile.major || undefined,
          targetRole: careerProfile.targetRole || undefined,
          targetIndustry: careerProfile.targetIndustry || undefined,
        }),
      });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

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
        {/* Stage selector */}
        <PremiumCard style={{ padding: 16, borderRadius: "var(--radius-md)" }}>
          <SectionTitle>My Stage</SectionTitle>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, marginBottom: 16 }}>
            Controls which checklist and resources you see when you log in.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {STAGES.map((s) => {
              const active = currentStage === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => switchStage(s.id)}
                  disabled={stageSaving}
                  style={{
                    padding: "14px 12px", borderRadius: 12, textAlign: "left",
                    border: `2px solid ${active ? s.color : "var(--card-border)"}`,
                    background: active ? s.color + "12" : "var(--card-bg-strong)",
                    cursor: stageSaving ? "wait" : "pointer",
                    transition: "all 150ms",
                    opacity: stageSaving && !active ? 0.6 : 1,
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: active ? 950 : 800, color: active ? s.color : "var(--text-primary)" }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{s.desc}</div>
                  {active && <div style={{ marginTop: 8, fontSize: 10, fontWeight: 900, color: s.color, background: s.color + "18", padding: "2px 8px", borderRadius: 99, display: "inline-block" }}>Current</div>}
                </button>
              );
            })}
          </div>
        </PremiumCard>

        {/* Career Profile card */}
        <PremiumCard
          style={{
            padding: 16,
            borderRadius: "var(--radius-md)",
          }}
        >
          <SectionTitle>Career Profile</SectionTitle>

          {/* Name */}
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
                Name
              </div>
            </div>
            <input
              type="text"
              value={careerProfile.name}
              onChange={(e) =>
                setCareerProfile((p) => ({ ...p, name: e.target.value }))
              }
              style={{
                height: 36,
                borderRadius: "var(--radius-sm)",
                padding: "0 12px",
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontWeight: 800,
                minWidth: 200,
              }}
            />
          </div>

          {/* Graduation Year */}
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
                Graduation Year
              </div>
            </div>
            <input
              type="number"
              placeholder="2024"
              value={careerProfile.graduationYear}
              onChange={(e) =>
                setCareerProfile((p) => ({ ...p, graduationYear: e.target.value }))
              }
              style={{
                height: 36,
                borderRadius: "var(--radius-sm)",
                padding: "0 12px",
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontWeight: 800,
                minWidth: 120,
              }}
            />
          </div>

          {/* Major */}
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
                Major
              </div>
            </div>
            <input
              type="text"
              placeholder="Computer Science"
              value={careerProfile.major}
              onChange={(e) =>
                setCareerProfile((p) => ({ ...p, major: e.target.value }))
              }
              style={{
                height: 36,
                borderRadius: "var(--radius-sm)",
                padding: "0 12px",
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontWeight: 800,
                minWidth: 200,
              }}
            />
          </div>

          {/* Target Role */}
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
                Target Role
              </div>
            </div>
            <input
              type="text"
              placeholder="Product Manager"
              value={careerProfile.targetRole}
              onChange={(e) =>
                setCareerProfile((p) => ({ ...p, targetRole: e.target.value }))
              }
              style={{
                height: 36,
                borderRadius: "var(--radius-sm)",
                padding: "0 12px",
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontWeight: 800,
                minWidth: 200,
              }}
            />
          </div>

          {/* Target Industry */}
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
                Target Industry
              </div>
            </div>
            <select
              value={careerProfile.targetIndustry}
              onChange={(e) =>
                setCareerProfile((p) => ({ ...p, targetIndustry: e.target.value }))
              }
              style={{
                height: 36,
                borderRadius: "var(--radius-sm)",
                padding: "0 12px",
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontWeight: 800,
                minWidth: 200,
              }}
            >
              <option value="">Select industry…</option>
              {TARGET_INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Save button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 0",
              borderTop: "1px solid var(--card-border-soft)",
            }}
          >
            <button
              type="button"
              onClick={saveCareerProfile}
              disabled={saving}
              style={{
                height: 36,
                paddingInline: 20,
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: "var(--accent)",
                color: "#fff",
                fontWeight: 900,
                fontSize: 14,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {savedMsg && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "var(--accent)",
                }}
              >
                Saved!
              </span>
            )}
          </div>
        </PremiumCard>

        {/* Billing card — only for non-tenant (consumer) users */}
        {!isTenantUser && (
          <PremiumCard style={{ padding: 16, borderRadius: "var(--radius-md)" }}>
            <SectionTitle>Plan</SectionTitle>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: entitlement?.isPro ? "var(--accent)" : "var(--text-muted)" }}>
                  {entitlement == null ? "Loading…" : entitlement.isPro ? "Pro" : "Free"}
                </div>
                {!entitlement?.isPro && entitlement != null && (
                  <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
                    {entitlement.remaining != null
                      ? `${entitlement.remaining} of ${entitlement.cap} free attempts remaining`
                      : "3 free attempts included"}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleBilling}
                disabled={billingLoading || entitlement == null}
                style={{
                  padding: "9px 18px",
                  borderRadius: "var(--radius-sm)",
                  border: entitlement?.isPro ? "1px solid var(--card-border)" : "none",
                  background: entitlement?.isPro ? "var(--card-bg-strong)" : "var(--accent)",
                  color: entitlement?.isPro ? "var(--text-primary)" : "#fff",
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: billingLoading || entitlement == null ? "not-allowed" : "pointer",
                  opacity: billingLoading ? 0.7 : 1,
                }}
              >
                {billingLoading ? "Opening…" : entitlement?.isPro ? "Manage billing" : "Upgrade to Pro"}
              </button>
            </div>
            {billingError && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#EF4444", lineHeight: 1.5 }}>
                {billingError}
              </div>
            )}
          </PremiumCard>
        )}

        {/* Scoring card */}
        <PremiumCard
          style={{
            padding: 16,
            borderRadius: "var(--radius-md)",
          }}
        >
          <SectionTitle>Scoring</SectionTitle>

          <Toggle
            label="Strict mode"
            description="Harsher scoring that demands clear structure, specificity, and measurable impact when appropriate to the question type."
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