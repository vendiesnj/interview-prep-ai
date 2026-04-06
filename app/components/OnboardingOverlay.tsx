"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  BookOpen,
  Rocket,
  Mic,
  DollarSign,
  BarChart2,
  Gamepad2,
  Calendar,
  X,
} from "lucide-react";

const STORAGE_KEY = "ipc_onboarded_v1";
const TOTAL_STEPS = 4;

// ── Step 1 - Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 24 }}>
        {[GraduationCap, BookOpen, Rocket].map((Icon, i) => (
          <div
            key={i}
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "var(--accent-soft)",
              border: "1px solid var(--accent-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
            }}
          >
            <Icon size={26} />
          </div>
        ))}
      </div>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 950,
          color: "var(--text-primary)",
          margin: "0 0 10px",
          letterSpacing: -0.4,
        }}
      >
        Welcome to Signal
      </h2>
      <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 28px" }}>
        Your career readiness platform - built to help you land the right job with the right skills.
      </p>
      <button onClick={onNext} style={primaryBtn}>
        Get Started
      </button>
    </div>
  );
}

// ── Step 2 - Stage ────────────────────────────────────────────────────────────

const STAGES = [
  {
    icon: <GraduationCap size={22} />,
    label: "Pre-College",
    desc: "Exploring your options before starting higher education",
  },
  {
    icon: <BookOpen size={22} />,
    label: "During College",
    desc: "Currently enrolled and building your career foundation",
  },
  {
    icon: <Rocket size={22} />,
    label: "Post-College",
    desc: "Graduated and ready to launch your career",
  },
];

function StepStage({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 950,
          color: "var(--text-primary)",
          margin: "0 0 6px",
          letterSpacing: -0.3,
        }}
      >
        Where are you in your journey?
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
        This helps us show the most relevant content and tasks for you.
      </p>
      <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
        {STAGES.map((s) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
            }}
          >
            <span
              style={{
                color: "var(--accent)",
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "var(--accent-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 auto",
              }}
            >
              {s.icon}
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>
                {s.label}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onNext} style={primaryBtn}>
        {"That's me \u2192"}
      </button>
    </div>
  );
}

// ── Step 3 - Signal Score ─────────────────────────────────────────────────────

const SCORE_ITEMS = [
  {
    icon: <Mic size={20} />,
    label: "Interview Readiness",
    desc: "Built through mock interviews and practice sessions",
  },
  {
    icon: <DollarSign size={20} />,
    label: "Financial Health",
    desc: "Informed by assessments, budgeting, and literacy modules",
  },
  {
    icon: <BarChart2 size={20} />,
    label: "Career Clarity",
    desc: "Driven by your RIASEC assessment and career exploration",
  },
];

function StepSignalScore({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 950,
          color: "var(--text-primary)",
          margin: "0 0 6px",
          letterSpacing: -0.3,
        }}
      >
        Your score tracks 3 things
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
        Your Signal Score (0–100) combines these pillars to show your overall career readiness.
      </p>
      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        {SCORE_ITEMS.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              padding: "13px 16px",
              borderRadius: 12,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
            }}
          >
            <span
              style={{
                color: "var(--accent)",
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "var(--accent-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 auto",
              }}
            >
              {item.icon}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                {item.label}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          background: "var(--accent-soft)",
          border: "1px solid var(--accent-strong)",
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 20,
          lineHeight: 1.5,
        }}
      >
        Take the Career Assessment to set your baseline and unlock your first score.
      </div>
      <button onClick={onNext} style={primaryBtn}>
        Got it &rarr;
      </button>
    </div>
  );
}

// ── Step 4 - Daily Loop ───────────────────────────────────────────────────────

const LOOP_ITEMS = [
  {
    icon: <Gamepad2 size={20} />,
    label: "Daily Games",
    desc: "Hustle, Career Connections, Career of the Day",
  },
  {
    icon: <Calendar size={20} />,
    label: "Planner",
    desc: "Check off today's tasks and keep your streak alive",
  },
  {
    icon: <Mic size={20} />,
    label: "Practice",
    desc: "One mock interview a day sharpens your delivery fast",
  },
];

function StepDailyLoop({ onFinish }: { onFinish: () => void }) {
  return (
    <div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 950,
          color: "var(--text-primary)",
          margin: "0 0 6px",
          letterSpacing: -0.3,
        }}
      >
        Come back every day
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
        Your daily loop keeps momentum building - even 15 minutes makes a real difference.
      </p>
      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        {LOOP_ITEMS.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              padding: "13px 16px",
              borderRadius: 12,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
            }}
          >
            <span
              style={{
                color: "var(--accent)",
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "var(--accent-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 auto",
              }}
            >
              {item.icon}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                {item.label}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          textAlign: "center",
          marginBottom: 20,
          lineHeight: 1.5,
        }}
      >
        15 minutes a day builds real career confidence.
      </div>
      <button onClick={onFinish} style={primaryBtn}>
        Start Exploring &rarr;
      </button>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const primaryBtn: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  borderRadius: 12,
  border: "1px solid var(--accent-strong)",
  background: "linear-gradient(135deg, var(--accent-2-soft, var(--accent-soft)), var(--accent-soft))",
  color: "var(--accent)",
  fontWeight: 950,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "var(--shadow-glow)",
};

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === step ? 20 : 8,
            height: 8,
            borderRadius: 4,
            background: i === step ? "var(--accent)" : "var(--card-border-soft)",
            transition: "width 200ms ease, background 200ms ease",
          }}
        />
      ))}
    </div>
  );
}

// ── Main overlay component ────────────────────────────────────────────────────

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) setVisible(true);
    } catch {}
  }, []);

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setVisible(false);
  }

  function dismiss() {
    finish();
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        background: "rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--card-bg-strong)",
          border: "1px solid var(--card-border-soft)",
          borderRadius: 20,
          padding: "28px 28px 24px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
          position: "relative",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
        }}
      >
        {/* Dismiss */}
        <button
          onClick={dismiss}
          aria-label="Skip onboarding"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 30,
            height: 30,
            borderRadius: 8,
            border: "1px solid var(--card-border-soft)",
            background: "var(--card-bg)",
            color: "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={14} />
        </button>

        <ProgressDots step={step} />

        {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
        {step === 1 && <StepStage onNext={() => setStep(2)} />}
        {step === 2 && <StepSignalScore onNext={() => setStep(3)} />}
        {step === 3 && <StepDailyLoop onFinish={finish} />}
      </div>
    </div>
  );
}
