"use client";

import PremiumShell from "@/app/components/PremiumShell";
import { ARCHETYPE_DATA, ARCHETYPE_COLOR, type DeliveryArchetype } from "@/app/lib/feedback/archetypes";

const ARCHETYPES = Object.keys(ARCHETYPE_DATA) as DeliveryArchetype[];

const EFFORT_COLOR: Record<string, string> = {
  Low:    "#10B981",
  Medium: "#F59E0B",
  High:   "#EF4444",
};

const IMPACT_COLOR: Record<string, string> = {
  High:   "#10B981",
  Medium: "#F59E0B",
  Low:    "#EF4444",
};

export default function ArchetypesPage() {
  return (
    <PremiumShell title="Delivery Patterns" subtitle="15 archetypes that describe how you show up in an interview.">
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
            After each practice session, Signal assigns you a delivery pattern based on how your 7 dimension scores combine.
            These aren't fixed labels — they shift as your skills improve. Use them to identify your highest-leverage fix.
          </p>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {ARCHETYPES.map((name) => {
            const data = ARCHETYPE_DATA[name];
            const color = ARCHETYPE_COLOR[name];
            return (
              <div
                key={name}
                id={name.toLowerCase().replace(/\s+/g, "-")}
                style={{
                  borderRadius: "var(--radius-xl)",
                  border: `1px solid ${color}28`,
                  background: "var(--card-bg)",
                  overflow: "hidden",
                }}
              >
                {/* Header */}
                <div style={{
                  padding: "14px 18px",
                  borderBottom: `1px solid ${color}18`,
                  background: `${color}08`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{name}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: "var(--radius-sm)",
                      fontSize: 10, fontWeight: 700,
                      background: "var(--card-bg-strong)", color: EFFORT_COLOR[data.effort],
                      border: `1px solid ${EFFORT_COLOR[data.effort]}30`,
                    }}>
                      Effort: {data.effort}
                    </span>
                    <span style={{
                      padding: "2px 8px", borderRadius: "var(--radius-sm)",
                      fontSize: 10, fontWeight: 700,
                      background: "var(--card-bg-strong)", color: IMPACT_COLOR[data.impact],
                      border: `1px solid ${IMPACT_COLOR[data.impact]}30`,
                    }}>
                      Impact: {data.impact}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>

                  {/* Tagline */}
                  <div style={{ fontSize: 13, fontWeight: 600, color, fontStyle: "italic" }}>
                    "{data.tagline}"
                  </div>

                  {/* Description */}
                  <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.65 }}>
                    {data.description}
                  </div>

                  {/* What interviewers hear */}
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--card-bg-strong)",
                    border: "1px solid var(--card-border-soft)",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
                      What interviewers hear
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                      {data.whatInterviewersHear}
                    </div>
                  </div>

                  {/* Coaching */}
                  <div style={{
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    background: `${color}08`,
                    border: `1px solid ${color}22`,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color, textTransform: "uppercase", marginBottom: 4 }}>
                      #1 fix
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.65 }}>
                      {data.coaching}
                    </div>
                  </div>

                  {/* Key dimensions */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {data.primaryDimensions.map((dim) => (
                      <span key={dim} style={{
                        padding: "3px 10px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 11, fontWeight: 600,
                        background: `${color}10`,
                        color,
                        border: `1px solid ${color}25`,
                      }}>
                        {dim.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PremiumShell>
  );
}
