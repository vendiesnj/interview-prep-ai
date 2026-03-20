"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const STAGES = [
  {
    id: "pre_college",
    icon: "🎓",
    label: "Pre-College",
    sub: "Getting ready for college — orientation, major exploration, communication skills",
    color: "#10B981",
    examples: ["Choosing a major", "Preparing for orientation", "Building confidence before college"],
  },
  {
    id: "during_college",
    icon: "📚",
    label: "During College",
    sub: "Currently in college — interview prep, internships, public speaking, career planning",
    color: "#2563EB",
    examples: ["Internship interviews", "Class presentations", "Career fair prep"],
  },
  {
    id: "post_college",
    icon: "🚀",
    label: "Post-College",
    sub: "In the workforce — career growth, financial planning, professional development",
    color: "#8B5CF6",
    examples: ["Salary benchmarks", "401k & finances", "Career progression"],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const firstName = (session?.user?.name ?? "").split(" ")[0] || "there";

  async function onContinue() {
    if (!selected) return;
    setSaving(true);

    try {
      await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoPersona: selected }),
      });
      await update();
    } catch {
      // non-critical — continue anyway
    }

    router.push("/dashboard");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: `
          radial-gradient(900px 600px at 20% 0%, rgba(37,99,235,0.07), transparent 60%),
          radial-gradient(700px 500px at 85% 10%, rgba(14,165,233,0.05), transparent 60%),
          var(--app-bg, #0a0f1a)
        `,
        fontFamily: "var(--font-manrope, system-ui, sans-serif)",
        boxSizing: "border-box",
      }}
    >
      {/* Brand mark */}
      <div style={{ marginBottom: 36, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #2563EB, #0EA5E9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📡</div>
        <span style={{ fontSize: 20, fontWeight: 950, color: "var(--text-primary, #fff)", letterSpacing: -0.3 }}>Signal</span>
      </div>

      <div style={{ maxWidth: 600, width: "100%", textAlign: "center", marginBottom: 36 }}>
        <h1 style={{ margin: "0 0 12px", fontSize: 32, fontWeight: 950, color: "var(--text-primary, #fff)", letterSpacing: -0.7, lineHeight: 1.2 }}>
          Welcome, {firstName} 👋
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: "var(--text-muted, rgba(255,255,255,0.5))", lineHeight: 1.7 }}>
          Signal covers every stage of your journey. Where are you right now? We'll personalize your platform based on your answer.
        </p>
      </div>

      {/* Stage cards */}
      <div style={{ display: "grid", gap: 14, width: "100%", maxWidth: 600, marginBottom: 28 }}>
        {STAGES.map((stage) => {
          const active = selected === stage.id;
          return (
            <div
              key={stage.id}
              onClick={() => setSelected(stage.id)}
              style={{
                padding: "22px 24px",
                borderRadius: 18,
                border: `2px solid ${active ? stage.color : "rgba(255,255,255,0.08)"}`,
                background: active ? stage.color + "12" : "rgba(255,255,255,0.03)",
                cursor: "pointer",
                transition: "all 150ms",
                display: "flex",
                gap: 18,
                alignItems: "flex-start",
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 32, flexShrink: 0, marginTop: 2 }}>{stage.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 17, fontWeight: 950, color: active ? stage.color : "var(--text-primary, #fff)" }}>
                    {stage.label}
                  </span>
                  {active && (
                    <span style={{ fontSize: 11, fontWeight: 900, color: stage.color, background: stage.color + "20", padding: "2px 8px", borderRadius: 6, letterSpacing: 0.4 }}>
                      Selected
                    </span>
                  )}
                </div>
                <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--text-muted, rgba(255,255,255,0.5))", lineHeight: 1.6 }}>
                  {stage.sub}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {stage.examples.map((ex) => (
                    <span
                      key={ex}
                      style={{ fontSize: 11, fontWeight: 800, color: active ? stage.color : "rgba(255,255,255,0.3)", background: active ? stage.color + "15" : "rgba(255,255,255,0.05)", padding: "3px 10px", borderRadius: 6 }}
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div style={{ width: "100%", maxWidth: 600 }}>
        <button
          onClick={onContinue}
          disabled={!selected || saving}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 14,
            border: "none",
            background: selected ? "linear-gradient(135deg, #2563EB, #0EA5E9)" : "rgba(255,255,255,0.05)",
            color: selected ? "#fff" : "rgba(255,255,255,0.25)",
            fontWeight: 950,
            fontSize: 16,
            cursor: selected && !saving ? "pointer" : "not-allowed",
            boxShadow: selected ? "0 4px 24px rgba(37,99,235,0.35)" : "none",
            transition: "all 200ms",
          }}
        >
          {saving ? "Setting things up…" : selected ? "Take me to Signal →" : "Select your stage to continue"}
        </button>

        <p style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
          You can change this anytime in your account settings.
        </p>
      </div>
    </main>
  );
}
