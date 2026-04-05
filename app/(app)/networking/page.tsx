"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import PremiumShell from "@/app/components/PremiumShell";

const SCENARIO_CATEGORIES = [
  {
    id: "career_fair",
    label: "Career Fair",
    color: "#0EA5E9",
    icon: "🎪",
    prompts: [
      "You just walked up to a recruiter at a career fair. You have 45 seconds before they move on. Go.",
      "A hiring manager from your dream company is standing alone at a career fair booth. Introduce yourself and make it count.",
      "You're at a career fair and a company you didn't plan on talking to has an interesting opening. Pitch yourself cold.",
    ],
  },
  {
    id: "alumni",
    label: "Alumni Coffee Chat",
    color: "#10B981",
    icon: "☕",
    prompts: [
      "An alum from your school works at a company you want to join. You have 30 seconds to open the conversation before the small talk runs out.",
      "You're on a coffee chat with someone 10 years ahead of you in your field. Introduce yourself and make a clear ask.",
      "An alum reached out to you. Open the call by introducing yourself and explaining why you wanted to connect.",
    ],
  },
  {
    id: "conference",
    label: "Conference / Event",
    color: "#8B5CF6",
    icon: "🤝",
    prompts: [
      "You're at an industry event and someone asks 'so what do you do?' Answer in a way that starts a real conversation.",
      "You just sat next to someone at a conference session. The break starts in 60 seconds. Introduce yourself.",
      "You're at a panel Q&A and the speaker walks past you after. You have one shot - introduce yourself and make an ask.",
    ],
  },
  {
    id: "linkedin",
    label: "LinkedIn / Cold Outreach",
    color: "#F59E0B",
    icon: "💼",
    prompts: [
      "Deliver the spoken version of a cold LinkedIn message to someone you admire in your field. What do you say?",
      "You're leaving a voicemail for someone who didn't respond to your message. Make it worth returning.",
      "You're following up on a connection request that was accepted. Open the conversation with a real ask.",
    ],
  },
];

function pitchStyleColor(style: string): string {
  const s = style.toLowerCase();
  if (s.includes("connector")) return "#10B981";
  if (s.includes("achiever")) return "#0EA5E9";
  if (s.includes("visionary")) return "#8B5CF6";
  if (s.includes("wanderer")) return "#6B7280";
  if (s.includes("bullet")) return "#F59E0B";
  if (s.includes("over")) return "#EF4444";
  return "var(--accent)";
}

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
      ctx.strokeStyle = "#0EA5E9";
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

type Stage = "select" | "ready" | "recording" | "processing" | "results";

export default function NetworkingPage() {
  const { data: session } = useSession();
  const isPro = (session?.user as any)?.subscriptionStatus === "active" || (session?.user as any)?.subscriptionStatus === "trialing";

  const [stage, setStage] = useState<Stage>("select");
  const [selectedCategory, setSelectedCategory] = useState<string>("career_fair");
  const [prompt, setPrompt] = useState(SCENARIO_CATEGORIES[0].prompts[0]);
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
  const activeCategoryColor = SCENARIO_CATEGORIES.find((c) => c.id === selectedCategory)?.color ?? "#0EA5E9";

  // Stop audio stream when navigating away
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

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
      setProcessingStep("Transcribing your pitch…");
      const formData = new FormData();
      formData.append("audio", blob, "pitch.webm");
      formData.append("duration", String(durationSec));

      const transcribeRes = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!transcribeRes.ok) throw new Error("Transcription failed");
      const { text } = await transcribeRes.json();
      setTranscript(text);

      setProcessingStep("Analyzing your networking pitch…");
      const feedbackRes = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDesc: "",
          question: activePrompt,
          transcript: text,
          evaluationFramework: "networking_pitch",
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

  const np = feedback?.networking_pitch;
  const pitchStyle = feedback?.pitch_style ?? "";
  const styleCol = pitchStyleColor(pitchStyle);
  const overallScore = feedback?.score ? Math.round(feedback.score * 10) : null;

  return (
    <PremiumShell title="Networking Pitch" subtitle="Practice cold approaches, coffee chat openers, and career fair pitches">
      <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 48 }}>

        <Link href="/dashboard" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
          ← Dashboard
        </Link>

        {error && (
          <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", fontSize: 14, fontWeight: 800 }}>
            {error}
          </div>
        )}

        {/* ── SELECT / READY ── */}
        {(stage === "select" || stage === "ready") && (
          <>
            {/* Context banner */}
            <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 14, background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.2)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>
              <strong style={{ color: "#0EA5E9" }}>How this works:</strong> Pick a real-world networking scenario, record your pitch (aim for 30–60 seconds), and get scored on your hook, clarity of ask, credibility, conciseness, and memorability.
            </div>

            {/* Category tabs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {SCENARIO_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setPrompt(cat.prompts[0]); setUseCustom(false); }}
                  style={{
                    padding: "8px 16px", borderRadius: 99,
                    border: `1px solid ${selectedCategory === cat.id ? cat.color : "var(--card-border)"}`,
                    background: selectedCategory === cat.id ? cat.color + "18" : "var(--card-bg)",
                    color: selectedCategory === cat.id ? cat.color : "var(--text-primary)",
                    fontWeight: 900, fontSize: 13, cursor: "pointer",
                  }}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* Scenario prompts */}
            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              {SCENARIO_CATEGORIES.find((c) => c.id === selectedCategory)?.prompts.map((p) => (
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
              <div style={{ padding: "14px 18px", borderRadius: "var(--radius-xl)", border: `2px solid ${useCustom ? "#0EA5E9" : "var(--card-border)"}`, background: useCustom ? "rgba(14,165,233,0.07)" : "var(--card-bg)" }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#0EA5E9", marginBottom: 8 }}>Custom scenario</div>
                <textarea
                  placeholder="Describe your own networking situation…"
                  value={customPrompt}
                  onChange={(e) => { setCustomPrompt(e.target.value); setUseCustom(true); if (e.target.value) setStage("ready"); }}
                  style={{ width: "100%", minHeight: 72, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {stage === "ready" && activePrompt && (
              <div style={{ padding: "24px 28px", borderRadius: "var(--radius-xl)", border: `1px solid ${activeCategoryColor}`, background: activeCategoryColor + "08", marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: activeCategoryColor, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>Your scenario</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.65 }}>{activePrompt}</div>
                <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
                  Aim for 30–60 seconds. Shorter and sharper is better than longer and vague.
                </div>
              </div>
            )}

            {stage === "ready" && activePrompt && (
              <button
                onClick={startRecording}
                style={{ width: "100%", padding: "18px", borderRadius: "var(--radius-xl)", border: "none", background: "#0EA5E9", color: "#fff", fontWeight: 950, fontSize: 16, cursor: "pointer", boxShadow: "0 4px 24px rgba(14,165,233,0.35)" }}
              >
                🎙 Start Recording
              </button>
            )}

            {!isPro && (
              <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
                Free plan includes 3 total attempts across all modules.{" "}
                <Link href="/account" style={{ color: "var(--accent)", fontWeight: 900 }}>Upgrade for unlimited →</Link>
              </p>
            )}
          </>
        )}

        {/* ── RECORDING ── */}
        {stage === "recording" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <div style={{ padding: "28px 36px", borderRadius: "var(--radius-xl)", border: "1px solid #0EA5E9", background: "rgba(14,165,233,0.07)", width: "100%", boxSizing: "border-box" }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#0EA5E9", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>Now pitching</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.65 }}>{activePrompt}</div>
            </div>

            <WaveformCanvas analyserRef={analyserRef} />

            <div style={{ fontSize: 36, fontWeight: 950, color: "var(--text-primary)", letterSpacing: 1, fontVariantNumeric: "tabular-nums" }}>
              {formatTime(elapsed)}
            </div>
            <div style={{ fontSize: 13, color: elapsed > 60 ? "#EF4444" : "var(--text-muted)", fontWeight: elapsed > 60 ? 900 : 400 }}>
              {elapsed > 90 ? "Wrapping up soon? Great pitches stay under 60s." : elapsed > 60 ? "Getting long - start closing." : "Aim for 30–60 seconds"}
            </div>

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
            <div style={{ fontSize: 40 }}>🤝</div>
            <div style={{ fontSize: 18, fontWeight: 950, color: "var(--text-primary)" }}>Analyzing your pitch</div>
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>{processingStep}</div>
            <div style={{ width: 200, height: 4, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: "60%", background: "#0EA5E9", borderRadius: 99, animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {stage === "results" && feedback && (
          <div style={{ display: "grid", gap: 16 }}>
            {/* Overall + pitch style */}
            <div style={{ padding: "28px 32px", borderRadius: "var(--radius-xl)", border: `1px solid ${styleCol}`, background: "linear-gradient(135deg, var(--card-bg-strong), var(--card-bg))", boxShadow: "var(--shadow-card-soft)", display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ flex: "1 1 200px" }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Pitch score</div>
                <div style={{ fontSize: 56, fontWeight: 950, color: "var(--text-primary)", lineHeight: 1 }}>{overallScore}<span style={{ fontSize: 22, fontWeight: 700, color: "var(--text-muted)" }}>/100</span></div>
              </div>
              <div style={{ flex: "1 1 220px" }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Pitch style</div>
                <div style={{ fontSize: 22, fontWeight: 950, color: styleCol, marginBottom: 8 }}>{pitchStyle}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65, padding: "10px 14px", background: styleCol + "12", borderRadius: 10, borderLeft: `3px solid ${styleCol}` }}>
                  <strong style={{ color: styleCol }}>Your lever:</strong> {feedback.pitch_coaching}
                </div>
              </div>
            </div>

            {/* Dimension scores */}
            {np && (
              <div style={{ padding: "22px 26px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow-card-soft)" }}>
                <div style={{ fontSize: 14, fontWeight: 950, color: "var(--text-primary)", marginBottom: 16 }}>Pitch dimensions</div>
                <ScoreBar label="Hook Strength" value={np.hook_strength} color={styleCol} />
                <ScoreBar label="Clarity of Ask" value={np.clarity_of_ask} color={styleCol} />
                <ScoreBar label="Credibility" value={np.credibility} color={styleCol} />
                <ScoreBar label="Conciseness" value={np.conciseness} color={styleCol} />
                <ScoreBar label="Memorability" value={np.memorability} color={styleCol} />
              </div>
            )}

            {/* Strengths + improvements */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {feedback.pitch_strengths?.length > 0 && (
                <div style={{ padding: "20px 22px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow-card-soft)" }}>
                  <div style={{ fontSize: 13, fontWeight: 950, color: "#10B981", marginBottom: 12 }}>What landed</div>
                  <ul style={{ margin: 0, padding: "0 0 0 16px", display: "grid", gap: 8 }}>
                    {feedback.pitch_strengths.map((s: string, i: number) => (
                      <li key={i} style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.pitch_improvements?.length > 0 && (
                <div style={{ padding: "20px 22px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow-card-soft)" }}>
                  <div style={{ fontSize: 13, fontWeight: 950, color: "#F59E0B", marginBottom: 12 }}>To sharpen</div>
                  <ul style={{ margin: 0, padding: "0 0 0 16px", display: "grid", gap: 8 }}>
                    {feedback.pitch_improvements.map((s: string, i: number) => (
                      <li key={i} style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Better version */}
            {feedback.better_answer && (
              <div style={{ padding: "20px 22px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow-card-soft)" }}>
                <div style={{ fontSize: 13, fontWeight: 950, color: "#0EA5E9", marginBottom: 10 }}>A sharper version would sound like this</div>
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
                style={{ flex: 1, padding: "14px", borderRadius: "var(--radius-md)", border: "none", background: "#0EA5E9", color: "#fff", fontWeight: 950, fontSize: 14, cursor: "pointer" }}
              >
                Try another scenario →
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
