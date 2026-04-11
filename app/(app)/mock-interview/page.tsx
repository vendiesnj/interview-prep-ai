"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import PremiumShell from "@/app/components/PremiumShell";
import WebcamOverlay, { type WebcamOverlayHandle } from "@/app/components/WebcamOverlay";
import type { FaceMetrics } from "@/app/hooks/useFaceAnalysis";
import type { ConversationTurn, MockScoreResult } from "@/app/api/mock-interview/route";
import { buildUserCoachingProfile } from "@/app/lib/feedback/coachingProfile";

// ── Local storage ─────────────────────────────────────────────────────────────

function safeJSONParse<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase =
  | "setup"
  | "countdown"
  | "question"
  | "recording"
  | "processing"
  | "between"
  | "finishing"
  | "results";

interface SessionConfig {
  role: string;
  industry: string;
  numQuestions: number;
  questionTypes: ("behavioral" | "situational")[];
}

// ── Dimension labels ──────────────────────────────────────────────────────────

const DIM_ORDER = [
  "narrative_clarity",
  "evidence_quality",
  "ownership_agency",
  "response_control",
  "cognitive_depth",
  "presence_confidence",
  "vocal_engagement",
] as const;

// ── Small components ──────────────────────────────────────────────────────────

function ScoreBar({ label, score, coaching }: { label: string; score: number; coaching: string }) {
  const color = score >= 7.5 ? "#10B981" : score >= 5.5 ? "var(--accent)" : "#EF4444";
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{score.toFixed(1)}/10</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden", marginBottom: 5 }}>
        <div style={{ width: `${Math.round(score * 10)}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{coaching}</div>
    </div>
  );
}

function ReadinessBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    strong:      { label: "Interview Ready",    color: "#10B981", bg: "rgba(16,185,129,0.12)" },
    ready:       { label: "Ready to Interview", color: "#10B981", bg: "rgba(16,185,129,0.08)" },
    developing:  { label: "Developing",         color: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
    not_ready:   { label: "More Practice Needed", color: "#EF4444", bg: "rgba(239,68,68,0.10)" },
  };
  const { label, color, bg } = map[level] ?? map.developing;
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99,
      color, background: bg, border: `1px solid ${color}33`,
    }}>
      {label}
    </span>
  );
}

function PulsingDot() {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: "#EF4444", marginRight: 8,
      animation: "mockPulse 1.2s ease-in-out infinite",
    }} />
  );
}

// ── Setup Screen ──────────────────────────────────────────────────────────────

function SetupScreen({ onStart }: { onStart: (cfg: SessionConfig) => void }) {
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("Technology");
  const [numQuestions, setNumQuestions] = useState(5);
  const [types, setTypes] = useState<("behavioral" | "situational")[]>(["behavioral", "situational"]);

  const industries = ["Technology", "Finance", "Consulting", "Healthcare", "Marketing", "Operations", "Research", "Non-profit"];

  function toggleType(t: "behavioral" | "situational") {
    setTypes(prev =>
      prev.includes(t)
        ? prev.length > 1 ? prev.filter(x => x !== t) : prev
        : [...prev, t]
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: 500,
    border: "1px solid var(--card-border)", background: "var(--input-bg)",
    color: "var(--text-primary)", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 580, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: "var(--accent)", textTransform: "uppercase", marginBottom: 8 }}>
          Mock Interview
        </div>
        <h1 style={{ margin: "0 0 10px", fontSize: 30, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.5 }}>
          Full Interview Simulation
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 460, marginInline: "auto" }}>
          An AI interviewer asks real questions, adapts to your answers, and generates a
          coaching report tied to your full practice history.
        </p>
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 16, padding: 24, marginBottom: 16, display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Role */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>
            Target Role
          </label>
          <input
            type="text"
            value={role}
            onChange={e => setRole(e.target.value)}
            placeholder="e.g. Product Manager, Financial Analyst, Software Engineer"
            style={inputStyle}
          />
        </div>

        {/* Industry */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.7 }}>
            Industry
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {industries.map(ind => (
              <button
                key={ind}
                onClick={() => setIndustry(ind)}
                style={{
                  padding: "6px 14px", borderRadius: 99, fontSize: 13, fontWeight: 600,
                  border: `1px solid ${industry === ind ? "var(--accent)" : "var(--card-border)"}`,
                  background: industry === ind ? "var(--accent-soft)" : "transparent",
                  color: industry === ind ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        {/* Question count */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.7 }}>
            Number of Questions
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            {[3, 5, 7].map(n => (
              <button
                key={n}
                onClick={() => setNumQuestions(n)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 14, fontWeight: 700,
                  border: `1px solid ${numQuestions === n ? "var(--accent)" : "var(--card-border)"}`,
                  background: numQuestions === n ? "var(--accent-soft)" : "transparent",
                  color: numQuestions === n ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {n} questions
                <div style={{ fontSize: 10, fontWeight: 500, marginTop: 2, opacity: 0.7 }}>
                  {n === 3 ? "~10 min" : n === 5 ? "~18 min" : "~25 min"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Question types */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.7 }}>
            Question Types
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            {(["behavioral", "situational"] as const).map(t => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  border: `1px solid ${types.includes(t) ? "var(--accent)" : "var(--card-border)"}`,
                  background: types.includes(t) ? "var(--accent-soft)" : "transparent",
                  color: types.includes(t) ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {t === "behavioral" ? "Behavioral" : "Situational"}
                <div style={{ fontSize: 10, fontWeight: 500, marginTop: 2, opacity: 0.7 }}>
                  {t === "behavioral" ? '"Tell me about a time..."' : '"Imagine you\'re in..."'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* What to expect */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, padding: "14px 18px", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>What to expect</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[
            "AI interviewer adapts follow-up questions based on your actual answers",
            "Coaching report scored across 7 communication dimensions",
            "Results saved to your profile and factored into your insights",
            "Webcam optional — enables on-camera presence scoring",
          ].map(item => (
            <div key={item} style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: "#10B981", flexShrink: 0, marginTop: 1 }}>✓</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onStart({ role: role || "a professional role", industry, numQuestions, questionTypes: types })}
        style={{
          width: "100%", padding: "15px 0", borderRadius: 12,
          background: "linear-gradient(135deg, var(--accent), #0EA5E9)",
          color: "#fff", fontWeight: 800, fontSize: 16, border: "none",
          cursor: "pointer", letterSpacing: -0.3,
        }}
      >
        Start Interview →
      </button>
    </div>
  );
}

// ── Results Screen ────────────────────────────────────────────────────────────

function ResultsScreen({
  config,
  score,
  history,
  saved,
  onSave,
  onRetry,
}: {
  config: SessionConfig;
  score: MockScoreResult;
  history: ConversationTurn[];
  saved: boolean;
  onSave: () => void;
  onRetry: () => void;
}) {
  const readinessColor: Record<string, string> = {
    strong: "#10B981", ready: "#10B981", developing: "#F59E0B", not_ready: "#EF4444",
  };
  const color = readinessColor[score.readinessLevel] ?? "#F59E0B";

  const candidateTurns = history.filter(t => t.speaker === "candidate");
  const totalWords = candidateTurns.reduce((sum, t) => sum + t.content.split(/\s+/).length, 0);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 16, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: "var(--accent)", textTransform: "uppercase", marginBottom: 6 }}>
              Interview Complete — {config.role}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 10 }}>
              <span style={{ fontSize: 64, fontWeight: 900, color, lineHeight: 1 }}>
                {score.overallScore}
              </span>
              <span style={{ fontSize: 16, color: "var(--text-muted)", fontWeight: 500 }}>/100</span>
            </div>
            <ReadinessBadge level={score.readinessLevel} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {history.filter(t => t.speaker === "interviewer").length} questions &nbsp;·&nbsp; ~{totalWords} words spoken
            </div>
            {!saved ? (
              <button
                onClick={onSave}
                style={{
                  padding: "9px 20px", borderRadius: 10, background: "var(--accent)",
                  color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
                }}
              >
                Save to Profile
              </button>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 700, color: "#10B981" }}>✓ Saved to profile</span>
            )}
            <button
              onClick={onRetry}
              style={{
                padding: "9px 20px", borderRadius: 10, background: "transparent",
                color: "var(--text-muted)", fontWeight: 600, fontSize: 13,
                border: "1px solid var(--card-border)", cursor: "pointer",
              }}
            >
              New Interview
            </button>
          </div>
        </div>

        {/* Coaching summary */}
        <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 10, background: "var(--card-bg-strong)", borderLeft: "3px solid var(--accent)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>Coaching Summary</div>
          <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7 }}>{score.coachingSummary}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Strengths */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#10B981", marginBottom: 14 }}>What You Did Well</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {score.strengths.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                <span style={{ color: "#10B981", flexShrink: 0, marginTop: 2 }}>✓</span>
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Improvements */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B", marginBottom: 14 }}>Work On Next</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {score.improvements.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                <span style={{ color: "#F59E0B", flexShrink: 0, marginTop: 2 }}>→</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7 Dimensions */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 18 }}>Communication Scorecard</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 32px" }}>
          {DIM_ORDER.map(key => {
            const d = score.dimensionScores?.[key];
            if (!d) return null;
            return <ScoreBar key={key} label={d.label} score={d.score} coaching={d.coaching} />;
          })}
        </div>
      </div>

      {/* STAR */}
      {score.starScores && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 18 }}>STAR Structure</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {(["situation", "task", "action", "result"] as const).map(k => {
              const v = score.starScores[k];
              const c = v >= 70 ? "#10B981" : v >= 50 ? "#F59E0B" : "#EF4444";
              return (
                <div key={k} style={{ textAlign: "center", padding: "14px 10px", borderRadius: 10, background: "var(--card-bg-strong)", border: `1px solid ${c}22` }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: c, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, textTransform: "capitalize", fontWeight: 600 }}>{k}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-question breakdown */}
      {score.questionBreakdowns?.length > 0 && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Question Breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {score.questionBreakdowns.map((qb, i) => {
              const c = qb.score >= 70 ? "#10B981" : qb.score >= 50 ? "#F59E0B" : "#EF4444";
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "start", padding: "12px 0", borderBottom: i < score.questionBreakdowns.length - 1 ? "1px solid var(--card-border-soft)" : "none" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: `${c}15`, border: `1px solid ${c}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: c }}>{qb.score}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3, lineHeight: 1.4 }}>{qb.question}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{qb.note}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap", marginTop: 2 }}>
                    {qb.competency?.replace(/_/g, " ")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Interview Page ───────────────────────────────────────────────────────

export default function MockInterviewPage() {
  const { data: session } = useSession();

  // Phase + config
  const [phase, setPhase] = useState<Phase>("setup");
  const [config, setConfig] = useState<SessionConfig | null>(null);

  // Conversation
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentCompetency, setCurrentCompetency] = useState("");
  const [currentQuestionType, setCurrentQuestionType] = useState<string>("behavioral");
  const [isFollowup, setIsFollowup] = useState(false);
  const [mainQuestionsAsked, setMainQuestionsAsked] = useState(0);

  // Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown
  const [countdown, setCountdown] = useState(3);

  // Status messages
  const [statusMsg, setStatusMsg] = useState("");

  // Results
  const [scoreResult, setScoreResult] = useState<MockScoreResult | null>(null);
  const [saved, setSaved] = useState(false);

  // Face metrics
  const webcamRef = useRef<WebcamOverlayHandle>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const faceSessionSamples = useRef<FaceMetrics[]>([]);

  // Coaching profile context from practice history
  const [coachingContext, setCoachingContext] = useState<string | null>(null);

  // Load coaching profile from localStorage
  useEffect(() => {
    if (!session?.user) return;
    const key = `ipc_history_${session.user.email ?? ""}`;
    const saved = safeJSONParse<any[]>(localStorage.getItem(key), []);
    if (saved.length >= 2) {
      try {
        const profile = buildUserCoachingProfile(saved);
        setCoachingContext(profile.llmContext ?? null);
      } catch {
        // if history is malformed, skip coaching context
      }
    }
    // Also try fetching from API for logged-in users
    fetch("/api/attempts?limit=200", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const attempts = Array.isArray(data?.attempts) ? data.attempts : [];
        if (attempts.length >= 2) {
          const profile = buildUserCoachingProfile(attempts);
          setCoachingContext(profile.llmContext ?? null);
        }
      })
      .catch(() => {});
  }, [session]);

  // Webcam: collect face samples after each answer
  function collectFaceSample() {
    if (!webcamEnabled) return;
    const metrics = webcamRef.current?.stop();
    if (metrics) faceSessionSamples.current.push(metrics);
    // Restart for next question
    webcamRef.current?.start().catch(() => {});
  }

  function avgFaceMetrics(): Record<string, number> | null {
    const samples = faceSessionSamples.current;
    if (samples.length === 0) return null;
    const keys: (keyof FaceMetrics)[] = ["eyeContact", "expressiveness", "headStability", "smileRate", "blinkRate", "browEngagement", "lookAwayRate"];
    const out: Record<string, number> = {};
    for (const k of keys) {
      const vals = samples.map(s => s[k] as number).filter(v => typeof v === "number");
      if (vals.length > 0) out[k] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  // ── Start session ───────────────────────────────────────────────────────────

  async function handleStart(cfg: SessionConfig) {
    setConfig(cfg);
    setHistory([]);
    setMainQuestionsAsked(0);
    setScoreResult(null);
    setSaved(false);
    faceSessionSamples.current = [];

    // Request mic
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: webcamEnabled });
      streamRef.current = s;
    } catch {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = s;
      } catch {
        alert("Microphone access is required for the interview.");
        return;
      }
    }

    if (webcamEnabled) {
      webcamRef.current?.start().catch(() => {});
    }

    setStatusMsg("Preparing your interview…");
    setPhase("countdown");

    // Fetch first question while countdown runs
    const questionPromise = fetch("/api/mock-interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        role: cfg.role,
        industry: cfg.industry,
        numQuestions: cfg.numQuestions,
        questionTypes: cfg.questionTypes,
        coachingContext,
      }),
    }).then(r => r.json());

    // 3-second countdown
    setCountdown(3);
    await new Promise<void>(resolve => {
      let c = 3;
      const interval = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) { clearInterval(interval); resolve(); }
      }, 1000);
    });

    const data = await questionPromise;
    setCurrentQuestion(data.message);
    setCurrentCompetency(data.competency ?? "");
    setCurrentQuestionType(data.questionType ?? "behavioral");
    setIsFollowup(false);
    setMainQuestionsAsked(1);
    setHistory([{ speaker: "interviewer", content: data.message, questionIndex: 1, competency: data.competency, questionType: data.questionType }]);
    setPhase("question");
  }

  // ── Recording ───────────────────────────────────────────────────────────────

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: "audio/webm" });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start(250);
    mediaRecorderRef.current = mr;
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    setPhase("recording");
  }

  async function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);

    await new Promise<void>(resolve => {
      const mr = mediaRecorderRef.current!;
      mr.onstop = () => resolve();
      mr.stop();
    });

    setPhase("processing");
    setStatusMsg("Transcribing your answer…");
    collectFaceSample();

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const form = new FormData();
    form.append("audio", blob, "answer.webm");

    const transcribeRes = await fetch("/api/mock-interview/transcribe", { method: "POST", body: form });
    const { transcript } = await transcribeRes.json();

    const newHistory: ConversationTurn[] = [
      ...history,
      { speaker: "candidate", content: transcript },
    ];
    setHistory(newHistory);

    // Get next action from AI
    setStatusMsg("Thinking…");
    const nextRes = await fetch("/api/mock-interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "respond",
        role: config!.role,
        industry: config!.industry,
        transcript,
        history: newHistory,
        mainQuestionsAsked,
        numQuestions: config!.numQuestions,
        questionTypes: config!.questionTypes,
        coachingContext,
      }),
    });
    const next = await nextRes.json();

    if (next.action === "done") {
      await finishInterview(newHistory);
    } else {
      const nextTurn: ConversationTurn = {
        speaker: "interviewer",
        content: next.message,
        questionIndex: next.isFollowup ? mainQuestionsAsked : mainQuestionsAsked + 1,
        isFollowup: next.isFollowup,
        competency: next.competency,
        questionType: next.questionType,
      };
      const fullHistory = [...newHistory, nextTurn];
      setHistory(fullHistory);
      setCurrentQuestion(next.message);
      setCurrentCompetency(next.competency ?? "");
      setCurrentQuestionType(next.questionType ?? "behavioral");
      setIsFollowup(next.isFollowup ?? false);
      if (!next.isFollowup) setMainQuestionsAsked(q => q + 1);
      setPhase("between");
    }
  }

  // ── Finish & score ──────────────────────────────────────────────────────────

  async function finishInterview(finalHistory: ConversationTurn[]) {
    setPhase("finishing");
    setStatusMsg("Scoring your interview…");

    streamRef.current?.getTracks().forEach(t => t.stop());

    const scoreRes = await fetch("/api/mock-interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "score",
        role: config!.role,
        industry: config!.industry,
        history: finalHistory,
        faceMetrics: avgFaceMetrics(),
      }),
    });
    const scored: MockScoreResult = await scoreRes.json();
    setScoreResult(scored);
    setPhase("results");
  }

  // ── Save to profile ─────────────────────────────────────────────────────────

  async function saveToProfile() {
    if (!scoreResult || !config) return;
    const res = await fetch("/api/mock-interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        role: config.role,
        industry: config.industry,
        history,
        scoreResult,
        faceMetrics: avgFaceMetrics(),
      }),
    });
    if (res.ok) setSaved(true);
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const competencyColor: Record<string, string> = {
    leadership: "#F59E0B",
    communication: "#2563EB",
    problem_solving: "#8B5CF6",
    collaboration: "#10B981",
    "domain knowledge": "#0EA5E9",
    teamwork: "#10B981",
    professionalism: "#0EA5E9",
  };
  const qColor = competencyColor[currentCompetency?.toLowerCase()] ?? "var(--accent)";

  // ── Conversation log (right sidebar) ────────────────────────────────────────

  const conversationLog = useMemo(() => {
    return history.slice().reverse();
  }, [history]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (phase === "setup") {
    return (
      <PremiumShell title="Mock Interview">
        <style>{`@keyframes mockPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }`}</style>
        <SetupScreen onStart={handleStart} />
      </PremiumShell>
    );
  }

  if (phase === "results" && scoreResult && config) {
    return (
      <PremiumShell title="Mock Interview — Results">
        <style>{`@keyframes mockPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }`}</style>
        <ResultsScreen
          config={config}
          score={scoreResult}
          history={history}
          saved={saved}
          onSave={saveToProfile}
          onRetry={() => setPhase("setup")}
        />
      </PremiumShell>
    );
  }

  // ── Countdown ───────────────────────────────────────────────────────────────

  if (phase === "countdown") {
    return (
      <PremiumShell title="Mock Interview">
        <div style={{ maxWidth: 580, margin: "0 auto", textAlign: "center", paddingTop: 80 }}>
          <div style={{ fontSize: 96, fontWeight: 900, color: "var(--accent)", lineHeight: 1, marginBottom: 16 }}>
            {countdown > 0 ? countdown : "Go"}
          </div>
          <div style={{ fontSize: 16, color: "var(--text-muted)" }}>Get ready — interview starting…</div>
        </div>
      </PremiumShell>
    );
  }

  // ── Interview UI ─────────────────────────────────────────────────────────────

  const progressPct = config ? Math.round((mainQuestionsAsked / config.numQuestions) * 100) : 0;

  return (
    <PremiumShell title="Mock Interview">
      <style>{`@keyframes mockPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }`}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>

        {/* ── Left: Interview area ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Progress bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, var(--accent), #0EA5E9)", borderRadius: 99, transition: "width 0.5s ease" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              {mainQuestionsAsked} / {config?.numQuestions ?? 5}
            </span>
          </div>

          {/* Question card */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 16, padding: 28, minHeight: 140 }}>
            {isFollowup && (
              <div style={{ marginBottom: 10, display: "inline-block", fontSize: 11, fontWeight: 700, color: "#F59E0B", background: "rgba(245,158,11,0.12)", padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(245,158,11,0.25)" }}>
                Follow-up
              </div>
            )}
            {currentCompetency && !isFollowup && (
              <div style={{ marginBottom: 10, display: "inline-block", fontSize: 11, fontWeight: 700, color: qColor, background: `${qColor}18`, padding: "3px 10px", borderRadius: 99, border: `1px solid ${qColor}33`, textTransform: "capitalize" }}>
                {currentCompetency.replace(/_/g, " ")} · {currentQuestionType}
              </div>
            )}
            <div style={{ fontSize: 19, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.55 }}>
              {currentQuestion || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Loading question…</span>}
            </div>
          </div>

          {/* Controls */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>

            {(phase === "processing" || phase === "finishing") && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>{statusMsg}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", opacity: 0.6 }}>This takes a few seconds…</div>
              </div>
            )}

            {phase === "question" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                  Take a moment to think, then press record when ready.
                </div>
                <button
                  onClick={startRecording}
                  style={{
                    width: 80, height: 80, borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--accent), #0EA5E9)",
                    border: "none", cursor: "pointer", fontSize: 30,
                    boxShadow: "0 6px 24px rgba(37,99,235,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  🎙️
                </button>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>Tap to start recording</div>
              </div>
            )}

            {phase === "recording" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PulsingDot />
                  Recording &nbsp;
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatTime(recordingSeconds)}</span>
                </div>
                <button
                  onClick={stopRecording}
                  style={{
                    width: 80, height: 80, borderRadius: "50%",
                    background: "#EF4444", border: "none", cursor: "pointer", fontSize: 22,
                    boxShadow: "0 6px 24px rgba(239,68,68,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700,
                  }}
                >
                  ■
                </button>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>Tap to stop</div>
              </div>
            )}

            {phase === "between" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                  Next question is ready. Take a breath.
                </div>
                <button
                  onClick={() => setPhase("question")}
                  style={{
                    padding: "12px 32px", borderRadius: 12,
                    background: "linear-gradient(135deg, var(--accent), #0EA5E9)",
                    color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
                  }}
                >
                  I'm Ready →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Camera + conversation log ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 20 }}>

          {/* Webcam toggle + feed */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Camera</span>
              <button
                onClick={() => {
                  const next = !webcamEnabled;
                  setWebcamEnabled(next);
                  if (next) webcamRef.current?.start().catch(() => {});
                  else webcamRef.current?.stop();
                }}
                style={{
                  padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                  border: `1px solid ${webcamEnabled ? "var(--accent)" : "var(--card-border)"}`,
                  background: webcamEnabled ? "var(--accent-soft)" : "transparent",
                  color: webcamEnabled ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {webcamEnabled ? "On" : "Off"}
              </button>
            </div>
            <div style={{ position: "relative", height: webcamEnabled ? 180 : 80, background: "var(--card-bg-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {webcamEnabled
                ? <WebcamOverlay ref={webcamRef} isRecording={phase === "recording"} position="bottom-right" />
                : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Camera off — enable for presence scoring</span>
              }
            </div>
          </div>

          {/* Conversation log */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 16, maxHeight: 420, overflowY: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 }}>
              Conversation
            </div>
            {conversationLog.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Interview starting…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {conversationLog.map((turn, i) => (
                  <div key={i} style={{
                    padding: "9px 11px", borderRadius: 8,
                    background: turn.speaker === "interviewer" ? "var(--card-bg-strong)" : "var(--accent-soft)",
                    borderLeft: `2px solid ${turn.speaker === "interviewer" ? "var(--card-border)" : "var(--accent)"}`,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: turn.speaker === "interviewer" ? "var(--text-muted)" : "var(--accent)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {turn.speaker === "interviewer" ? "Interviewer" : "You"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.5 }}>
                      {turn.content.length > 120 ? turn.content.slice(0, 120) + "…" : turn.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PremiumShell>
  );
}
