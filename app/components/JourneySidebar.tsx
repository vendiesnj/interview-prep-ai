"use client";

import Link from "next/link";
import { X, CheckCircle2, Circle, ChevronRight } from "lucide-react";

type SignalData = {
  speaking: {
    interview: { count: number; avgScore: number | null };
    networking: { count: number };
    publicSpeaking: { count: number };
  };
  aptitude: { primary: string } | null;
  careerCheckIn: { employmentStatus?: string } | null;
  resumeHistory: { id: string }[];
  interviewPipeline: { total: number };
  instincts: { totalXp: number };
  checklist: { financialLiteracy: { done: number } };
  completeness: number;
  signalScore: number | null;
};

type Step = {
  id: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
  metric?: string;
};

function buildSteps(data: SignalData): Step[] {
  return [
    {
      id: "aptitude",
      title: "Career Assessment",
      description: "Discover your RIASEC profile and get matched to career paths that fit how you think.",
      href: "/aptitude",
      done: !!data.aptitude,
      metric: data.aptitude ? `Type: ${data.aptitude.primary}` : undefined,
    },
    {
      id: "interview",
      title: "Interview Practice",
      description: "Build STAR-method answers. Aim for 5+ sessions to start building your Signal Score.",
      href: "/practice",
      done: data.speaking.interview.count >= 5,
      metric: data.speaking.interview.count > 0
        ? `${data.speaking.interview.count} session${data.speaking.interview.count !== 1 ? "s" : ""}${data.speaking.interview.avgScore !== null ? ` · avg ${Math.round(data.speaking.interview.avgScore)}` : ""}`
        : undefined,
    },
    {
      id: "networking",
      title: "Networking Pitch",
      description: "Practice your 60-second professional introduction. One session makes a measurable difference.",
      href: "/networking",
      done: data.speaking.networking.count >= 1,
      metric: data.speaking.networking.count > 0
        ? `${data.speaking.networking.count} session${data.speaking.networking.count !== 1 ? "s" : ""}`
        : undefined,
    },
    {
      id: "public_speaking",
      title: "Public Speaking",
      description: "Strengthen your presence, vocal variety, and delivery structure.",
      href: "/public-speaking",
      done: data.speaking.publicSpeaking.count >= 1,
      metric: data.speaking.publicSpeaking.count > 0
        ? `${data.speaking.publicSpeaking.count} session${data.speaking.publicSpeaking.count !== 1 ? "s" : ""}`
        : undefined,
    },
    {
      id: "career_checkin",
      title: "Career Check-In",
      description: "Tell us where you are - student, employed, job hunting. This unlocks financial readiness tracking.",
      href: "/career-checkin",
      done: !!data.careerCheckIn,
      metric: data.careerCheckIn?.employmentStatus
        ? data.careerCheckIn.employmentStatus.replace(/_/g, " ")
        : undefined,
    },
    {
      id: "resume",
      title: "Resume Analysis",
      description: "Upload your resume to get an AI gap analysis and ATS score against your target roles.",
      href: "/resume-gap",
      done: data.resumeHistory.length > 0,
      metric: data.resumeHistory.length > 0 ? `${data.resumeHistory.length} analysis` : undefined,
    },
    {
      id: "financial",
      title: "Financial Literacy",
      description: "Complete at least 10 modules to start building your Financial Readiness score.",
      href: "/financial-literacy",
      done: data.checklist.financialLiteracy.done >= 10,
      metric: data.checklist.financialLiteracy.done > 0
        ? `${data.checklist.financialLiteracy.done} of 40 modules`
        : undefined,
    },
    {
      id: "pipeline",
      title: "Track Job Applications",
      description: "Log companies you've applied to. Signal tracks your pipeline stage and offer rate.",
      href: "/my-journey",
      done: data.interviewPipeline.total >= 1,
      metric: data.interviewPipeline.total > 0
        ? `${data.interviewPipeline.total} application${data.interviewPipeline.total !== 1 ? "s" : ""}`
        : undefined,
    },
    {
      id: "instincts",
      title: "Career Instincts",
      description: "Play scenario-based games to build teamwork, leadership, and decision-making data.",
      href: "/career-instincts",
      done: data.instincts.totalXp > 0,
      metric: data.instincts.totalXp > 0 ? `${data.instincts.totalXp} XP earned` : undefined,
    },
  ];
}

export default function JourneySidebar({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: SignalData | null;
}) {
  if (!open) return null;

  const steps = data ? buildSteps(data) : [];
  const doneCount = steps.filter(s => s.done).length;
  const nextStep = steps.find(s => !s.done);
  const pct = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;

  const ACCENT = "#2563EB";
  const GREEN  = "#16A34A";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.35)" }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 301,
        width: 360, background: "var(--card-bg)",
        borderLeft: "1px solid var(--card-border)",
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
        overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--card-border)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
          position: "sticky", top: 0, background: "var(--card-bg)", zIndex: 1,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text-primary)", marginBottom: 4 }}>
              Your Signal Journey
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
              {doneCount} of {steps.length} steps complete
            </div>
            {/* Progress bar */}
            <div style={{ height: 6, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`, borderRadius: 99,
                background: `linear-gradient(90deg, ${ACCENT}, ${GREEN})`,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "flex", flexShrink: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Signal score summary */}
        {data && (
          <div style={{
            margin: "16px 16px 0",
            padding: "12px 16px",
            borderRadius: 12,
            background: data.signalScore !== null ? `${ACCENT}09` : "var(--card-bg-strong)",
            border: `1px solid ${data.signalScore !== null ? ACCENT + "20" : "var(--card-border)"}`,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ fontSize: 28, fontWeight: 950, color: data.signalScore !== null ? ACCENT : "var(--text-muted)", lineHeight: 1 }}>
              {data.signalScore ?? "-"}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Signal Score</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                {data.completeness}% profile complete
              </div>
            </div>
          </div>
        )}

        {/* Next step highlight */}
        {nextStep && (
          <div style={{ margin: "12px 16px 0", padding: "12px 14px", borderRadius: 12, background: `${ACCENT}08`, border: `1px solid ${ACCENT}20` }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: ACCENT, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Next up</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>{nextStep.title}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, lineHeight: 1.5 }}>{nextStep.description}</div>
            <Link href={nextStep.href} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, color: ACCENT, textDecoration: "none" }}>
              Start now <ChevronRight size={13} />
            </Link>
          </div>
        )}

        {/* All steps */}
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {steps.map((step, idx) => (
            <Link
              key={step.id}
              href={step.done ? step.href : step.href}
              style={{ textDecoration: "none" }}
            >
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "10px 12px", borderRadius: 10,
                background: step.done ? `${GREEN}08` : "transparent",
                border: `1px solid ${step.done ? GREEN + "20" : "var(--card-border-soft)"}`,
                transition: "background 120ms",
                opacity: step.done ? 1 : 1,
              }}>
                {/* Step number / check */}
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: step.done ? `${GREEN}15` : "var(--card-bg-strong)",
                  border: `1px solid ${step.done ? GREEN + "30" : "var(--card-border)"}`,
                  marginTop: 1,
                }}>
                  {step.done
                    ? <CheckCircle2 size={14} color={GREEN} strokeWidth={2.5} />
                    : <span style={{ fontSize: 10, fontWeight: 900, color: "var(--text-muted)" }}>{idx + 1}</span>
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 800,
                    color: step.done ? "var(--text-muted)" : "var(--text-primary)",
                    textDecoration: step.done ? "line-through" : "none",
                    marginBottom: step.metric ? 2 : 0,
                  }}>
                    {step.title}
                  </div>
                  {step.metric && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: step.done ? GREEN : ACCENT }}>
                      {step.metric}
                    </div>
                  )}
                  {!step.done && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.45 }}>
                      {step.description}
                    </div>
                  )}
                </div>

                {!step.done && (
                  <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 3 }} />
                )}
              </div>
            </Link>
          ))}
        </div>

        <div style={{ padding: "12px 16px 24px", borderTop: "1px solid var(--card-border)", fontSize: 11, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.5 }}>
          Each step you complete raises your Signal Score and profile completeness.
        </div>
      </div>
    </>
  );
}
