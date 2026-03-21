"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import PremiumShell from "@/app/components/PremiumShell";

// ── Speech prompts ────────────────────────────────────────────────────────────
const PROMPT_CATEGORIES = [
  {
    id: "elevator",
    label: "Elevator Pitch",
    color: "var(--accent)",
    icon: "🚀",
    prompts: [
      "Introduce yourself in 60 seconds as if you just met your dream employer at a networking event.",
      "Pitch yourself to a potential mentor. Who are you, what are you working toward, and why should they care?",
      "You have 90 seconds on stage at a career fair. What do you say?",
    ],
  },
  {
    id: "presentation",
    label: "Presentation",
    color: "#8B5CF6",
    icon: "🎤",
    prompts: [
      "Present a project you worked on - what the problem was, your approach, and the result.",
      "Explain a concept from your field of study to someone who has no background in it.",
      "Walk through a decision you made, the trade-offs you considered, and what you learned.",
    ],
  },
  {
    id: "persuasion",
    label: "Persuasion & Opinion",
    color: "#10B981",
    icon: "💡",
    prompts: [
      "Make the case for a change you believe your school, workplace, or community should make.",
      "Argue for a position you hold on a topic in your field. Convince a skeptical audience.",
      "You have 2 minutes to persuade a room of investors to fund your idea. What do you say?",
    ],
  },
  {
    id: "storytelling",
    label: "Storytelling",
    color: "#F59E0B",
    icon: "📖",
    prompts: [
      "Tell a story about a moment that changed how you think about your career or field.",
      "Describe a challenge you overcame. Make it compelling - not just what happened, but what it meant.",
      "Share something you believe that most people in your field disagree with, and why.",
    ],
  },
];

const ALL_PROMPTS = PROMPT_CATEGORIES.flatMap((c) =>
  c.prompts.map((text) => ({ text, category: c.id, label: c.label, color: c.color }))
);

// ── Archetype colors ──────────────────────────────────────────────────────────
function archetypeColor(archetype: string): string {
  const a = archetype.toLowerCase();
  if (a.includes("storytell")) return "#10B981";
  if (a.includes("lecturer")) return "#8B5CF6";
  if (a.includes("rush")) return "#EF4444";
  if (a.includes("paus")) return "var(--accent)";
  if (a.includes("rambl")) return "#F59E0B";
  if (a.includes("mumbl")) return "#6B7280";
  return "var(--accent)";
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round((value / 10) * 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 950, color }}>{value.toFixed(1)}/10</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ── Waveform canvas ───────────────────────────────────────────────────────────
function WaveformCanvas({ analyserRef }: { analyserRef: React.RefObject<AnalyserNode | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const analyser = analyserRef.current;
      if (!analyser || !ctx || !canvas) return;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(buf);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "var(--accent)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const sliceW = canvas.width / buf.length;
      let x = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = buf[i] / 128.0;
        const y = (v * canvas.height) / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceW;
      }
      ctx.stroke();
    }
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserRef]);

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={60}
      style={{ width: "100%", height: 60, borderRadius: 10, background: "var(--input-bg)", border: "1px solid var(--card-border)" }}
    />
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
type Stage = "select" | "ready" | "recording" | "processing" | "results";

export default function PublicSpeakingPage() {
  const { data: session } = useSession();
  const isPro = (session?.user as any)?.subscriptionStatus === "active" || (session?.user as any)?.subscriptionStatus === "trialing";

  const [stage, setStage] = useState<Stage>("select");
  const [selectedCategory, setSelectedCategory] = useState<string>("elevator");
  const [prompt, setPrompt] = useState(PROMPT_CATEGORIES[0].prompts[0]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const activePrompt = useCustom ? customPrompt : prompt;
  const activeCategoryColor = PROMPT_CATEGORIES.find((c) => c.id === selectedCategory)?.color ?? "var(--accent)";

  // Timer
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 200);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recording]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(250);

      startTimeRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      setStage("recording");
    } catch {
      setError("Microphone access is required. Please allow access and try again.");
    }
  }, []);

  const stopAndProcess = useCallback(async () => {
    if (!mediaRecorderRef.current || !recording) return;
    setRecording(false);

    const mr = mediaRecorderRef.current;
    await new Promise<void>((res) => { mr.onstop = () => res(); mr.stop(); });

    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();

    const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const blob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });

    setStage("processing");

    try {
      // Transcribe
      setProcessingStep("Transcribing your speech…");
      const formData = new FormData();
      formData.append("audio", blob, "speech.webm");
      formData.append("duration", String(durationSec));

      const transcribeRes = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!transcribeRes.ok) throw new Error("Transcription failed");
      const { text } = await transcribeRes.json();
      setTranscript(text);

      // Feedback
      setProcessingStep("Analyzing your delivery…");
      const feedbackRes = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDesc: "",
          question: activePrompt,
          transcript: text,
          evaluationFramework: "public_speaking",
          deliveryMetrics: null,
        }),
      });

      if (!feedbackRes.ok) {
        const err = await feedbackRes.json().catch(() => ({}));
        if (feedbackRes.status === 402) throw new Error("FREE_LIMIT");
        throw new Error(err?.error ?? "Feedback failed");
      }

      const fb = await feedbackRes.json();
      setFeedback(fb);
      setStage("results");
    } catch (e: any) {
      if (e?.message === "FREE_LIMIT") {
        setError("You have used your free attempts. Upgrade to continue practicing.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setStage("ready");
    }
  }, [recording, activePrompt]);

  function formatTime(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function reset() {
    setStage("select");
    setFeedback(null);
    setTranscript("");
    setError(null);
    setElapsed(0);
  }

  const ps = feedback?.public_speaking;
  const archetype = feedback?.delivery_archetype ?? "";
  const archetypeCol = archetypeColor(archetype);
  const overallScore = feedback?.score ? Math.round(feedback.score * 10) : null;

  return (
    <PremiumShell title="Public Speaking" subtitle="Practice speeches, pitches, and presentations">
      <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 48 }}>

        {/* Back */}
        <Link href="/dashboard" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
          ← Dashboard
        </Link>

        {error && (
          <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", fontSize: 14, fontWeight: 800 }}>
            {error}
          </div>
        )}

        {/* ── SELECT ── */}
        {(stage === "select" || stage === "ready") && (
          <>
            {/* Category tabs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {PROMPT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setPrompt(cat.prompts[0]); setUseCustom(false); }}
                  style={{
                    padding: "8px 16px", borderRadius: 99, border: `1px solid ${selectedCategory === cat.id ? cat.color : "var(--card-border)"}`,
                    background: selectedCategory === cat.id ? cat.color + "18" : "var(--card-bg)",
                    color: selectedCategory === cat.id ? cat.color : "var(--text-primary)",
                    fontWeight: 900, fontSize: 13, cursor: "pointer",
                  }}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* Prompts */}
            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              {PROMPT_CATEGORIES.find((c) => c.id === selectedCategory)?.prompts.map((p) => (
                <div
                  key={p}
                  onClick={() => { setPrompt(p); setUseCustom(false); setStage("ready"); }}
                  style={{
                    padding: "16px 18px", borderRadius: "var(--radius-xl)",
                    border: `2px solid ${prompt === p && !useCustom ? activeCategoryColor : "var(--card-border)"}`,
                    background: prompt === p && !useCustom ? activeCategoryColor + "10" : "var(--card-bg)",
                    cursor: "pointer", fontSize: 14, fontWeight: prompt === p && !useCustom ? 900 : 700,
                    color: prompt === p && !useCustom ? activeCategoryColor : "var(--text-primary)",
                    lineHeight: 1.6, transition: "all 150ms",
                  }}
                >
                  {p}
                </div>
              ))}

              {/* Custom */}
              <div
                style={{
                  padding: "14px 18px", borderRadius: "var(--radius-xl)",
                  border: `2px solid ${useCustom ? "var(--accent)" : "var(--card-border)"}`,
                  background: useCustom ? "var(--accent-soft)" : "var(--card-bg)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--accent)", marginBottom: 8 }}>Custom prompt</div>
                <textarea
                  placeholder="Write your own speech topic or scenario…"
                  value={customPrompt}
                  onChange={(e) => { setCustomPrompt(e.target.value); setUseCustom(true); if (e.target.value) setStage("ready"); }}
                  style={{ width: "100%", minHeight: 72, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* Ready state */}
            {stage === "ready" && activePrompt && (
              <div style={{ padding: "24px 28px", borderRadius: "var(--radius-xl)", border: `1px solid ${activeCategoryColor}`, background: activeCategoryColor + "08", marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: activeCategoryColor, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>Your prompt</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.65 }}>{activePrompt}</div>
                <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
                  Take a moment to gather your thoughts, then hit record when ready. Aim for 60–180 seconds.
                </div>
              </div>
            )}

            {stage === "ready" && activePrompt && (
              <button
                onClick={startRecording}
                style={{ width: "100%", padding: "18px", borderRadius: "var(--radius-xl)", border: "none", background: "var(--accent)", color: "#fff", fontWeight: 950, fontSize: 16, cursor: "pointer", boxShadow: "var(--shadow-glow)" }}
              >
                🎙 Start Recording
              </button>
            )}

            {!isPro && (
              <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
                Free plan includes 3 total attempts across all modules.{" "}
                <Link href="/billing" style={{ color: "var(--accent)", fontWeight: 900 }}>Upgrade for unlimited →</Link>
              </p>
            )}
          </>
        )}

        {/* ── RECORDING ── */}
        {stage === "recording" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <div style={{ padding: "28px 36px", borderRadius: "var(--radius-xl)", border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", width: "100%", boxSizing: "border-box" }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "var(--accent)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>Now speaking</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.65 }}>{activePrompt}</div>
            </div>

            <WaveformCanvas analyserRef={analyserRef} />

            <div style={{ fontSize: 36, fontWeight: 950, color: "var(--text-primary)", letterSpacing: 1, fontVariantNumeric: "tabular-nums" }}>
              {formatTime(elapsed)}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Aim for 60–180 seconds</div>

            <button
              onClick={stopAndProcess}
              style={{ padding: "16px 40px", borderRadius: "var(--radius-xl)", border: "none", background: "#EF4444", color: "#fff", fontWeight: 950, fontSize: 15, cursor: "pointer" }}
            >
              ⏹ Stop & Analyze
            </button>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {stage === "processing" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, paddingTop: 60 }}>
            <div style={{ fontSize: 40 }}>🎙️</div>
            <div style={{ fontSize: 18, fontWeight: 950, color: "var(--text-primary)" }}>Analyzing your delivery</div>
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>{processingStep}</div>
            <div style={{ width: 200, height: 4, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: "60%", background: "var(--accent)", borderRadius: 99, animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {stage === "results" && feedback && (
          <div style={{ display: "grid", gap: 16 }}>
            {/* Overall + archetype */}
            <div style={{ padding: "28px 32px", borderRadius: "var(--radius-xl)", border: `1px solid ${archetypeCol}`, background: "linear-gradient(135deg, var(--card-bg-strong), var(--card-bg))", boxShadow: "var(--shadow-card-soft)", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Overall score</div>
                <div style={{ fontSize: 56, fontWeight: 950, color: "var(--text-primary)", lineHeight: 1 }}>{overallScore}<span style={{ fontSize: 22, fontWeight: 700, color: "var(--text-muted)" }}>/100</span></div>
              </div>
              <div style={{ flex: "1 1 220px" }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Delivery archetype</div>
                <div style={{ fontSize: 22, fontWeight: 950, color: archetypeCol, marginBottom: 8 }}>{archetype}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65, padding: "10px 14px", background: archetypeCol + "12", borderRadius: 10, borderLeft: `3px solid ${archetypeCol}` }}>
                  <strong style={{ color: archetypeCol }}>Your lever:</strong> {feedback.archetype_coaching}
                </div>
              </div>
            </div>

            {/* Dimension scores */}
            {ps && (
              <div style={{ padding: "22px 26px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow-card-soft)" }}>
                <div style={{ fontSize: 14, fontWeight: 950, color: "var(--text-primary)", marginBottom: 16 }}>Delivery dimensions</div>
                <ScoreBar label="Hook & Opening" value={ps.hook_impact} color={archetypeCol} />
                <ScoreBar label="Structure (Intro → Body → Close)" value={ps.structure} color={archetypeCol} />
                <ScoreBar label="Vocal Variety (Pitch & Pace)" value={ps.vocal_variety} color={archetypeCol} />
                <ScoreBar label="Clarity & Articulation" value={ps.clarity} color={archetypeCol} />
                <ScoreBar label="Audience Connection" value={ps.audience_connection} color={archetypeCol} />
                <ScoreBar label="Confidence & Presence" value={ps.confidence_presence} color={archetypeCol} />
              </div>
            )}

            {/* Strengths + improvements */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {feedback.speaking_strengths?.length > 0 && (
                <div style={{ padding: "20px 22px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow-card-soft)" }}>
                  <div style={{ fontSize: 13, fontWeight: 950, color: "#10B981", marginBottom: 12 }}>What worked</div>
                  <ul style={{ margin: 0, padding: "0 0 0 16px", display: "grid", gap: 8 }}>
                    {feedback.speaking_strengths.map((s: string, i: number) => (
                      <li key={i} style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.speaking_improvements?.length > 0 && (
                <div style={{ padding: "20px 22px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow-card-soft)" }}>
                  <div style={{ fontSize: 13, fontWeight: 950, color: "#F59E0B", marginBottom: 12 }}>To improve</div>
                  <ul style={{ margin: 0, padding: "0 0 0 16px", display: "grid", gap: 8 }}>
                    {feedback.speaking_improvements.map((s: string, i: number) => (
                      <li key={i} style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Better answer */}
            {feedback.better_answer && (
              <div style={{ padding: "20px 22px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow-card-soft)" }}>
                <div style={{ fontSize: 13, fontWeight: 950, color: "var(--accent)", marginBottom: 10 }}>A stronger version would sound like this</div>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.75, fontStyle: "italic" }}>{feedback.better_answer}</p>
              </div>
            )}

            {/* Transcript */}
            {transcript && (
              <details style={{ padding: "16px 20px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
                <summary style={{ fontSize: 13, fontWeight: 900, color: "var(--text-muted)", cursor: "pointer" }}>Your transcript</summary>
                <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{transcript}</p>
              </details>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={reset}
                style={{ flex: 1, padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid var(--accent-strong)", background: "var(--accent)", color: "#fff", fontWeight: 950, fontSize: 14, cursor: "pointer" }}
              >
                Practice again →
              </button>
              <Link
                href="/dashboard"
                style={{ flex: 1, padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontWeight: 900, fontSize: 14, cursor: "pointer", textDecoration: "none", textAlign: "center" }}
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </PremiumShell>
  );
}
