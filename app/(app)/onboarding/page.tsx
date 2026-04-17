"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle2, ArrowRight, Zap } from "lucide-react";

// ── Step 1: Career stage ──────────────────────────────────────────────────────

const STAGES = [
  {
    id: "student",
    label: "Student",
    sub: "In college or finishing a degree — internships, presentations, career planning",
    tags: ["Interview prep", "Internship apps", "Class presentations"],
  },
  {
    id: "early_career",
    label: "Early Career",
    sub: "0–4 years in the workforce — landing the right role, building presence",
    tags: ["Job interviews", "First impressions", "Building confidence"],
  },
  {
    id: "mid_career",
    label: "Mid-Career",
    sub: "4–12 years in — stepping into leadership, executive presence, high-stakes communication",
    tags: ["Leadership presence", "Promotions", "Stakeholder communication"],
  },
  {
    id: "senior",
    label: "Senior / Executive",
    sub: "Leading teams, boards, or organizations — polish, gravitas, conciseness at the top",
    tags: ["Board communication", "Executive presence", "Conciseness under pressure"],
  },
];

// ── Step 2: Communication goals ────────────────────────────────────────────────

const GOALS = [
  { id: "get_a_job",           label: "Land a job or internship",        icon: "🎯" },
  { id: "get_promoted",        label: "Get promoted or advance",          icon: "📈" },
  { id: "improve_presenting",  label: "Be a better presenter",            icon: "🎤" },
  { id: "build_confidence",    label: "Build confidence when speaking",   icon: "💪" },
  { id: "networking",          label: "Network and pitch effectively",     icon: "🤝" },
  { id: "general_development", label: "General communication growth",     icon: "🧠" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const ACCENT = "#4F46E5";
const ACCENT_SOFT = "rgba(79,70,229,0.09)";
const ACCENT_MED = "rgba(79,70,229,0.18)";
const TEXT = "#1C1917";
const MUTED = "#78716C";
const CARD = "#FDFAF4";
const BORDER = "rgba(28,25,23,0.08)";
const BORDER_ACTIVE = "rgba(79,70,229,0.35)";

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 40 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 4,
            flex: 1,
            borderRadius: 99,
            background: i < step ? ACCENT : "rgba(28,25,23,0.10)",
            transition: "background 300ms",
          }}
        />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [step, setStep] = useState(1);
  const [stage, setStage] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const firstName = (session?.user?.name ?? "").split(" ")[0] || "there";

  function toggleGoal(id: string) {
    setGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  async function saveAndFinish(goToPractice: boolean) {
    setSaving(true);
    try {
      await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboardingComplete: true,
          ...(stage ? { careerStage: stage } : {}),
          ...(goals.length > 0 ? { communicationGoals: goals } : {}),
        }),
      });
      await update();
    } catch {
      // non-critical
    }
    router.push(goToPractice ? "/practice" : "/dashboard");
  }

  async function handleSkip() {
    setSaving(true);
    try {
      await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingComplete: true }),
      });
      await update();
    } catch {
      // non-critical
    }
    router.push("/dashboard");
  }

  // ── Shared page wrapper ────────────────────────────────────────────────────

  const wrap = (content: React.ReactNode) => (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 44 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: ACCENT,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Zap size={16} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, color: TEXT, letterSpacing: -0.3 }}>
            Signal
          </span>
        </div>

        <ProgressBar step={step} total={3} />
        {content}

        {/* Skip */}
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <button
            onClick={handleSkip}
            disabled={saving}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, color: MUTED, fontWeight: 600,
              textDecoration: "underline", textDecorationColor: "rgba(120,113,108,0.35)",
            }}
          >
            Skip setup for now
          </button>
        </div>
      </div>
    </main>
  );

  // ── Step 1: Career stage ───────────────────────────────────────────────────

  if (step === 1) {
    return wrap(
      <>
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              margin: "0 0 10px", fontSize: 28, fontWeight: 800,
              color: TEXT, letterSpacing: -0.6, lineHeight: 1.2,
            }}
          >
            Welcome, {firstName}.
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: MUTED, lineHeight: 1.7 }}>
            Where are you right now? Signal will tailor your coaching to match.
          </p>
        </div>

        <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
          {STAGES.map((s) => {
            const active = stage === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setStage(s.id)}
                style={{
                  padding: "18px 20px",
                  borderRadius: 14,
                  border: `1.5px solid ${active ? BORDER_ACTIVE : BORDER}`,
                  background: active ? ACCENT_SOFT : CARD,
                  cursor: "pointer",
                  transition: "all 140ms",
                }}
              >
                <div
                  style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 15, fontWeight: 700,
                      color: active ? ACCENT : TEXT,
                    }}
                  >
                    {s.label}
                  </span>
                  {active && <CheckCircle2 size={18} color={ACCENT} />}
                </div>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
                  {s.sub}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {s.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 11, fontWeight: 700,
                        color: active ? ACCENT : MUTED,
                        background: active ? ACCENT_MED : "rgba(28,25,23,0.06)",
                        padding: "2px 8px", borderRadius: 6,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setStep(2)}
          disabled={!stage}
          style={{
            width: "100%", padding: "14px 20px",
            borderRadius: 12, border: "none",
            background: stage ? ACCENT : "rgba(28,25,23,0.08)",
            color: stage ? "#fff" : "rgba(28,25,23,0.3)",
            fontWeight: 700, fontSize: 15,
            cursor: stage ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 160ms",
          }}
        >
          Continue <ArrowRight size={16} />
        </button>
      </>
    );
  }

  // ── Step 2: Goals ──────────────────────────────────────────────────────────

  if (step === 2) {
    return wrap(
      <>
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              margin: "0 0 10px", fontSize: 28, fontWeight: 800,
              color: TEXT, letterSpacing: -0.6, lineHeight: 1.2,
            }}
          >
            What are you working on?
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: MUTED, lineHeight: 1.7 }}>
            Pick everything that applies — this shapes how Signal coaches you.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
          {GOALS.map((g) => {
            const active = goals.includes(g.id);
            return (
              <div
                key={g.id}
                onClick={() => toggleGoal(g.id)}
                style={{
                  padding: "16px 18px",
                  borderRadius: 12,
                  border: `1.5px solid ${active ? BORDER_ACTIVE : BORDER}`,
                  background: active ? ACCENT_SOFT : CARD,
                  cursor: "pointer",
                  transition: "all 140ms",
                  display: "flex", flexDirection: "column", gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 20 }}>{g.icon}</span>
                  {active && <CheckCircle2 size={15} color={ACCENT} />}
                </div>
                <span
                  style={{
                    fontSize: 13, fontWeight: 700, lineHeight: 1.3,
                    color: active ? ACCENT : TEXT,
                  }}
                >
                  {g.label}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setStep(1)}
            style={{
              flex: "0 0 auto", padding: "14px 18px",
              borderRadius: 12, border: `1.5px solid ${BORDER}`,
              background: "transparent", color: MUTED,
              fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            Back
          </button>
          <button
            onClick={() => setStep(3)}
            disabled={goals.length === 0}
            style={{
              flex: 1, padding: "14px 20px",
              borderRadius: 12, border: "none",
              background: goals.length > 0 ? ACCENT : "rgba(28,25,23,0.08)",
              color: goals.length > 0 ? "#fff" : "rgba(28,25,23,0.3)",
              fontWeight: 700, fontSize: 15,
              cursor: goals.length > 0 ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 160ms",
            }}
          >
            Continue <ArrowRight size={16} />
          </button>
        </div>
      </>
    );
  }

  // ── Step 3: Baseline invite ────────────────────────────────────────────────

  return wrap(
    <>
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            width: 52, height: 52, borderRadius: 14,
            background: ACCENT_SOFT, border: `1.5px solid ${ACCENT_MED}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Zap size={26} color={ACCENT} />
        </div>
        <h1
          style={{
            margin: "0 0 12px", fontSize: 28, fontWeight: 800,
            color: TEXT, letterSpacing: -0.6, lineHeight: 1.2,
          }}
        >
          Set your baseline.
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: MUTED, lineHeight: 1.7 }}>
          Your first practice session establishes a starting point Signal tracks against. It takes
          about 5–7 minutes and immediately unlocks your Communication Profile.
        </p>
      </div>

      {/* What you get */}
      <div
        style={{
          padding: "20px 22px",
          borderRadius: 14,
          border: `1.5px solid ${BORDER}`,
          background: CARD,
          marginBottom: 28,
        }}
      >
        <p
          style={{
            margin: "0 0 14px", fontSize: 12, fontWeight: 700,
            color: MUTED, textTransform: "uppercase", letterSpacing: 0.6,
          }}
        >
          After your first session you'll have
        </p>
        {[
          "Your Communication Level — where you stand right now",
          "Your Archetype — your natural communication style",
          "Your 8 dimension scores — strengths and gaps",
          "A personalized coaching plan",
        ].map((item) => (
          <div
            key={item}
            style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              marginBottom: 10,
            }}
          >
            <CheckCircle2 size={16} color={ACCENT} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 14, color: TEXT, lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          onClick={() => saveAndFinish(true)}
          disabled={saving}
          style={{
            width: "100%", padding: "15px 20px",
            borderRadius: 12, border: "none",
            background: ACCENT, color: "#fff",
            fontWeight: 700, fontSize: 15,
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all 160ms",
          }}
        >
          {saving ? "Setting things up…" : "Start my baseline session"}
          {!saving && <ArrowRight size={16} />}
        </button>
        <button
          onClick={() => saveAndFinish(false)}
          disabled={saving}
          style={{
            width: "100%", padding: "14px 20px",
            borderRadius: 12,
            border: `1.5px solid ${BORDER}`,
            background: "transparent", color: MUTED,
            fontWeight: 600, fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          Skip for now — take me to my dashboard
        </button>
      </div>
    </>
  );
}
