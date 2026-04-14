"use client";

import { useState } from "react";

const STAGE_OPTIONS = [
  { value: "pre_college",    label: "Pre-College",    color: "#10B981" },
  { value: "during_college", label: "During College", color: "#2563EB" },
  { value: "post_college",   label: "Post-College",   color: "#8B5CF6" },
] as const;

export default function StageSetterClient({
  userId,
  currentStage,
}: {
  userId: string;
  currentStage: string | null;
}) {
  const [stage, setStage] = useState<string | null>(currentStage);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function setStudentStage(newStage: string | null) {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/admin/set-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, stage: newStage }),
      });
      setStage(newStage);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.7, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>
        Student Stage
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
        Sets which milestone checklist this student sees on their dashboard.{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Currently: {stage ?? "None set"}
        </strong>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {STAGE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            disabled={saving}
            onClick={() => setStudentStage(opt.value)}
            style={{
              padding: "7px 16px",
              borderRadius: "var(--radius-sm)",
              fontSize: 12,
              fontWeight: 800,
              border: `1px solid ${stage === opt.value ? opt.color : "var(--card-border)"}`,
              background: stage === opt.value ? opt.color + "18" : "var(--card-bg)",
              color: stage === opt.value ? opt.color : "var(--text-muted)",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              transition: "all 120ms",
            }}
          >
            {stage === opt.value ? "✓ " : ""}{opt.label}
          </button>
        ))}
        {stage && (
          <button
            type="button"
            disabled={saving}
            onClick={() => setStudentStage(null)}
            style={{ padding: "7px 16px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 800, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-muted)", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
          >
            Clear
          </button>
        )}
        {saved && (
          <span style={{ fontSize: 12, color: "#10B981", fontWeight: 700 }}>Saved</span>
        )}
      </div>
    </div>
  );
}
