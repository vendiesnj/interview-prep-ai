"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";

// ── Types ─────────────────────────────────────────────────────────────────────

type RecordingState = "idle" | "recording" | "processing" | "done";
type SessionState = "setup" | "interview" | "results";

interface HistoryEntry {
  question: string;
  transcript: string;
  starAnalysis: Record<string, boolean>;
  isFollowup?: boolean;
}

interface ScoreResult {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  starCompleteness: Record<string, number>;
  coachingSummary: string;
  readinessLevel: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StarBadge({ label, present }: { label: string; present: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 900, padding: "3px 9px", borderRadius: 99,
      background: present ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.08)",
      color: present ? "#10B981" : "#EF4444",
      border: `1px solid ${present ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.2)"}`,
    }}>
      {present ? "✓" : "○"} {label}
    </span>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "#10B981" : value >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 900, color }}>{value}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 99, width: `${value}%`, background: color, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

// ── Setup Screen ──────────────────────────────────────────────────────────────

function SetupScreen({ onStart }: { onStart: (role: string, industry: string) => void }) {
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [camAllowed, setCamAllowed] = useState<boolean | null>(null);

  async function requestCamera() {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCamAllowed(true);
    } catch {
      setCamAllowed(false);
    }
  }

  useEffect(() => { requestCamera(); }, []);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: 600,
    border: "1px solid var(--card-border)", background: "var(--input-bg)",
    color: "var(--text-primary)", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎙️</div>
        <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.5 }}>
          Mock Interview
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.6 }}>
          A 5-question AI-powered interview with follow-up questions based on your answers.
          Webcam on for visual feedback.
        </p>
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>
              Target Role (optional)
            </label>
            <input
              type="text"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="e.g. Software Engineer, Marketing Manager"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>
              Industry (optional)
            </label>
            <input
              type="text"
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              placeholder="e.g. Technology, Finance, Healthcare"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Camera status */}
      <div style={{
        marginBottom: 20, padding: "10px 14px", borderRadius: 10,
        background: camAllowed === false ? "rgba(239,68,68,0.07)" : "rgba(16,185,129,0.07)",
        border: `1px solid ${camAllowed === false ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>{camAllowed === null ? "⏳" : camAllowed ? "📷" : "⚠️"}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: camAllowed === false ? "#EF4444" : "var(--text-primary)" }}>
          {camAllowed === null ? "Requesting camera access…" : camAllowed ? "Camera & microphone ready" : "Camera access denied — interview will be audio-only"}
        </span>
      </div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, padding: "12px 16px", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>What to expect</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {["5 behavioral questions targeting NACE competencies", "AI follow-up questions if your answer is missing STAR components", "Real-time STAR tracking as you speak", "Full coaching report at the end"].map(item => (
            <div key={item} style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: "#10B981", flexShrink: 0, marginTop: 1 }}>✓</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onStart(role || "a professional role", industry || "general")}
        style={{
          width: "100%", padding: "14px 0", borderRadius: 12,
          background: "linear-gradient(135deg, #2563EB, #0EA5E9)",
          color: "#fff", fontWeight: 950, fontSize: 16, border: "none",
          cursor: "pointer", boxShadow: "0 4px 20px rgba(37,99,235,0.35)",
        }}
      >
        Start Interview →
      </button>
    </div>
  );
}

// ── Interview Screen ──────────────────────────────────────────────────────────

function InterviewScreen({
  role,
  industry,
  onComplete,
}: {
  role: string;
  industry: string;
  onComplete: (history: HistoryEntry[], score: ScoreResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [currentHint, setCurrentHint] = useState<string>("");
  const [currentCompetency, setCurrentCompetency] = useState<string>("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isFollowup, setIsFollowup] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [latestStar, setLatestStar] = useState<Record<string, boolean> | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start camera
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
        }
      })
      .catch(() => {
        // audio only fallback
        navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => { streamRef.current = s; }).catch(() => {});
      });

    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  // Fetch first question on mount
  useEffect(() => {
    fetchStart();
  }, []);

  async function fetchStart() {
    setLoadingQuestion(true);
    const res = await fetch("/api/mock-interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", role, industry }),
    });
    const data = await res.json();
    setCurrentQuestion(data.question);
    setCurrentHint(data.hint ?? "");
    setCurrentCompetency(data.competency ?? "");
    setQuestionIndex(0);
    setIsFollowup(false);
    setLoadingQuestion(false);
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: "audio/webm" });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start(250);
    mediaRecorderRef.current = mr;
    setRecordingState("recording");
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
  }

  async function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordingState("processing");

    await new Promise<void>((resolve) => {
      const mr = mediaRecorderRef.current!;
      mr.onstop = () => resolve();
      mr.stop();
    });

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const form = new FormData();
    form.append("audio", blob, "answer.webm");

    const transcribeRes = await fetch("/api/mock-interview/transcribe", { method: "POST", body: form });
    const { transcript, starAnalysis } = await transcribeRes.json();

    setLatestStar(starAnalysis);

    const newEntry: HistoryEntry = {
      question: currentQuestion,
      transcript,
      starAnalysis,
      isFollowup,
    };
    const newHistory = [...history, newEntry];
    setHistory(newHistory);

    // Get next question or finish
    const followupRes = await fetch("/api/mock-interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "followup",
        transcript,
        starAnalysis,
        questionIndex,
        history: newHistory.map(h => ({ question: h.question, transcript: h.transcript })),
        role,
        industry,
      }),
    });
    const next = await followupRes.json();

    if (next.done || questionIndex >= 4) {
      // Score the full session
      const scoreRes = await fetch("/api/mock-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "score", history: newHistory, role }),
      });
      const scoreData = await scoreRes.json();
      streamRef.current?.getTracks().forEach(t => t.stop());
      onComplete(newHistory, scoreData);
    } else {
      setCurrentQuestion(next.question);
      setCurrentHint(next.hint ?? "");
      setCurrentCompetency(next.competency ?? "");
      setQuestionIndex(next.questionIndex);
      setIsFollowup(next.isFollowup ?? false);
      setLatestStar(null);
      setRecordingState("idle");
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const competencyColors: Record<string, string> = {
    communication: "#2563EB",
    critical_thinking: "#8B5CF6",
    leadership: "#F59E0B",
    teamwork: "#10B981",
    professionalism: "#0EA5E9",
    career_dev: "#EC4899",
  };

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
      {/* Left: Question + controls */}
      <div>
        {/* Progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, width: `${(questionIndex / 5) * 100}%`, background: "linear-gradient(90deg,#2563EB,#0EA5E9)", transition: "width 0.4s" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {questionIndex + 1} / 5
          </span>
        </div>

        {/* Question card */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
          {isFollowup && (
            <div style={{ marginBottom: 10, display: "inline-block", fontSize: 11, fontWeight: 900, color: "#F59E0B", background: "rgba(245,158,11,0.12)", padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(245,158,11,0.3)" }}>
              Follow-up question
            </div>
          )}
          {currentCompetency && !isFollowup && (
            <div style={{ marginBottom: 10, display: "inline-block", fontSize: 11, fontWeight: 900, color: competencyColors[currentCompetency] ?? "#2563EB", background: (competencyColors[currentCompetency] ?? "#2563EB") + "14", padding: "3px 10px", borderRadius: 99 }}>
              {currentCompetency.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            </div>
          )}
          {loadingQuestion ? (
            <div style={{ fontSize: 16, color: "var(--text-muted)", fontStyle: "italic" }}>Generating question…</div>
          ) : (
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.5 }}>
              {currentQuestion}
            </div>
          )}
          {currentHint && (
            <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "var(--card-bg-strong)", fontSize: 12, color: "var(--text-muted)", borderLeft: "3px solid var(--accent)" }}>
              💡 {currentHint}
            </div>
          )}
        </div>

        {/* STAR tracker */}
        {latestStar && (
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>STAR Coverage</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <StarBadge label="Situation" present={latestStar.situation} />
              <StarBadge label="Task" present={latestStar.task} />
              <StarBadge label="Action" present={latestStar.action} />
              <StarBadge label="Result" present={latestStar.result} />
            </div>
          </div>
        )}

        {/* Record controls */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {recordingState === "idle" && (
            <button
              onClick={startRecording}
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, #2563EB, #0EA5E9)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, boxShadow: "0 4px 20px rgba(37,99,235,0.4)",
              }}
            >
              🎙️
            </button>
          )}
          {recordingState === "recording" && (
            <>
              <button
                onClick={stopRecording}
                style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "#EF4444", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, boxShadow: "0 4px 20px rgba(239,68,68,0.4)",
                  animation: "pulse 1.5s infinite",
                }}
              >
                ⏹
              </button>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#EF4444" }}>
                Recording {formatTime(recordingSeconds)}
              </div>
            </>
          )}
          {recordingState === "processing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--card-bg-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🧠</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>Analyzing your answer…</div>
            </div>
          )}

          {recordingState === "idle" && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>Press to start recording your answer</div>
          )}
        </div>
      </div>

      {/* Right: Webcam */}
      <div style={{ position: "sticky", top: 80 }}>
        <div style={{ borderRadius: 16, overflow: "hidden", background: "#000", aspectRatio: "4/3", position: "relative" }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {recordingState === "recording" && (
            <div style={{ position: "absolute", top: 10, right: 10, width: 10, height: 10, borderRadius: "50%", background: "#EF4444", boxShadow: "0 0 8px #EF4444", animation: "pulse 1s infinite" }} />
          )}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)", textAlign: "center", fontWeight: 700 }}>
          Your video stays on your device
        </div>

        {/* Q history */}
        {history.length > 0 && (
          <div style={{ marginTop: 16, background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>Answered</div>
            {history.map((h, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 8, marginBottom: 6 }}>
                <span style={{ color: "#10B981", flexShrink: 0 }}>✓</span>
                <span style={{ lineHeight: 1.4 }}>{h.question.slice(0, 60)}{h.question.length > 60 ? "…" : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}

// ── Results Screen ────────────────────────────────────────────────────────────

function ResultsScreen({ history, score }: { history: HistoryEntry[]; score: ScoreResult }) {
  const readinessColors: Record<string, string> = {
    strong: "#10B981", ready: "#2563EB", developing: "#F59E0B", not_ready: "#EF4444",
  };
  const readinessLabels: Record<string, string> = {
    strong: "Interview Ready — Strong", ready: "Interview Ready", developing: "Still Developing", not_ready: "Needs More Practice",
  };

  const color = readinessColors[score.readinessLevel] ?? "#2563EB";
  const label = readinessLabels[score.readinessLevel] ?? score.readinessLevel;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Hero score */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 72, fontWeight: 950, color, lineHeight: 1 }}>{score.overallScore}</div>
        <div style={{ fontSize: 16, fontWeight: 900, color, marginTop: 6 }}>{label}</div>
        <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
          Based on {history.length} questions answered
        </div>
      </div>

      {/* Coaching summary */}
      <div style={{ background: "var(--card-bg)", border: `1px solid ${color}40`, borderLeft: `3px solid ${color}`, borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>Coaching Summary</div>
        <p style={{ margin: 0, fontSize: 15, color: "var(--text-primary)", lineHeight: 1.7, fontWeight: 600 }}>{score.coachingSummary}</p>
      </div>

      {/* Two columns: strengths + improvements */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: "#10B981", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 }}>✓ Strengths</div>
          {score.strengths.map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 700, marginBottom: 8, display: "flex", gap: 8 }}>
              <span style={{ color: "#10B981", flexShrink: 0 }}>•</span>{s}
            </div>
          ))}
        </div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: "#F59E0B", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 }}>↑ To Improve</div>
          {score.improvements.map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 700, marginBottom: 8, display: "flex", gap: 8 }}>
              <span style={{ color: "#F59E0B", flexShrink: 0 }}>•</span>{s}
            </div>
          ))}
        </div>
      </div>

      {/* STAR completeness */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 14 }}>STAR Framework Scores</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.entries(score.starCompleteness).map(([key, val]) => (
            <ScoreBar key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={val} />
          ))}
        </div>
      </div>

      {/* Q&A review */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 16, marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 14 }}>Interview Transcript</div>
        {history.map((h, i) => (
          <div key={i} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < history.length - 1 ? "1px solid var(--card-border-soft)" : "none" }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)", marginBottom: 4 }}>
              {h.isFollowup ? "Follow-up" : `Q${i + 1}`}
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>{h.question}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 8 }}>{h.transcript}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(h.starAnalysis).map(([k, v]) => (
                <StarBadge key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} present={v as boolean} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <a
          href="/mock-interview"
          style={{
            padding: "12px 28px", borderRadius: 12,
            background: "linear-gradient(135deg, #2563EB, #0EA5E9)",
            color: "#fff", fontWeight: 900, fontSize: 14, textDecoration: "none",
          }}
        >
          Try Again →
        </a>
        <Link
          href="/practice"
          style={{
            padding: "12px 28px", borderRadius: 12,
            border: "1px solid var(--card-border)", background: "var(--card-bg)",
            color: "var(--text-primary)", fontWeight: 900, fontSize: 14, textDecoration: "none",
          }}
        >
          Practice More
        </Link>
        <Link
          href="/my-journey"
          style={{
            padding: "12px 28px", borderRadius: 12,
            border: "1px solid var(--card-border)", background: "var(--card-bg)",
            color: "var(--text-primary)", fontWeight: 900, fontSize: 14, textDecoration: "none",
          }}
        >
          View My Journey
        </Link>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MockInterviewPage() {
  const [sessionState, setSessionState] = useState<SessionState>("setup");
  const [role, setRole] = useState("a professional role");
  const [industry, setIndustry] = useState("general");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [score, setScore] = useState<ScoreResult | null>(null);

  function handleStart(r: string, i: string) {
    setRole(r);
    setIndustry(i);
    setSessionState("interview");
  }

  function handleComplete(h: HistoryEntry[], s: ScoreResult) {
    setHistory(h);
    setScore(s);
    setSessionState("results");
  }

  return (
    <PremiumShell title={sessionState === "setup" ? "Mock Interview" : sessionState === "results" ? "Interview Results" : undefined} hideHeader={sessionState === "interview"}>
      <div style={{ paddingBottom: 48, paddingTop: sessionState === "interview" ? 12 : 0 }}>
        {sessionState === "setup" && <SetupScreen onStart={handleStart} />}
        {sessionState === "interview" && (
          <InterviewScreen role={role} industry={industry} onComplete={handleComplete} />
        )}
        {sessionState === "results" && score && (
          <ResultsScreen history={history} score={score} />
        )}
      </div>
    </PremiumShell>
  );
}
