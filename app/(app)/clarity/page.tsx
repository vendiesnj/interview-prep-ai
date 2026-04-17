"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Mic, Square, ChevronRight, Volume2, Target, RefreshCw, AlertCircle } from "lucide-react";
import PremiumShell from "@/app/components/PremiumShell";
import { userScopedKey } from "@/app/lib/userStorage";

// ── Drill library ─────────────────────────────────────────────────────────────

const DRILL_CATEGORIES = [
  {
    id: "fillers",
    label: "Filler Reduction",
    icon: "🚫",
    color: "#DC2626",
    colorSoft: "rgba(220,38,38,0.09)",
    description: "Practice eliminating um, uh, like, and other vocal fillers with silent pauses.",
    drills: [
      { id: "f1", prompt: "Tell me about a project you're proud of. No filler words — use silence instead.", target: "Zero fillers" },
      { id: "f2", prompt: "Describe your ideal career trajectory in the next 5 years.", target: "Zero fillers" },
      { id: "f3", prompt: "Explain something complex from your field as if to someone new to it.", target: "Zero fillers" },
    ],
  },
  {
    id: "precision",
    label: "Word Precision",
    icon: "🎯",
    color: "#4F46E5",
    colorSoft: "rgba(79,70,229,0.09)",
    description: "Choose exact words. Practice replacing vague language with specific, confident statements.",
    drills: [
      { id: "p1", prompt: "What is your greatest professional strength? Be specific — name it, prove it with one example, and quantify the result.", target: "Specific, no hedging" },
      { id: "p2", prompt: "Describe a decision you made under pressure. Use precise, active language.", target: "Active verbs, no hedging" },
      { id: "p3", prompt: "Explain a process improvement you implemented. Quantify the outcome.", target: "Numbers and outcomes" },
    ],
  },
  {
    id: "pace",
    label: "Pace & Clarity",
    icon: "⏱",
    color: "#D97706",
    colorSoft: "rgba(217,119,6,0.09)",
    description: "Slow down, articulate every word, and use deliberate pauses for emphasis.",
    drills: [
      { id: "pc1", prompt: "Walk me through your resume in 90 seconds. Speak slowly and clearly — every word should land.", target: "120–150 WPM, no rushing" },
      { id: "pc2", prompt: "Summarize your biggest professional win in 60 seconds. Pause after each key point.", target: "Deliberate pacing" },
      { id: "pc3", prompt: "Explain your working style and how you collaborate on teams.", target: "Even pace, clear articulation" },
    ],
  },
  {
    id: "openings",
    label: "Strong Openings",
    icon: "🚀",
    color: "#7C3AED",
    colorSoft: "rgba(124,58,237,0.09)",
    description: "Start every answer with a direct, confident statement — no warm-up phrases.",
    drills: [
      { id: "o1", prompt: "Tell me about yourself. Begin with your most compelling sentence.", target: "No \"so\", \"um\", \"well\"" },
      { id: "o2", prompt: "Why do you want this role? Start with your reason directly.", target: "Direct opener" },
      { id: "o3", prompt: "What makes you different from other candidates? Begin immediately.", target: "Confident, immediate" },
    ],
  },
] as const;

type DrillId = string;
type Stage = "select" | "ready" | "recording" | "processing" | "results";

// ── Score helpers ─────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return "var(--text-muted)";
  if (score >= 80) return "#16A34A";
  if (score >= 60) return "#D97706";
  return "#DC2626";
}

function scoreLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Developing";
  return "Needs work";
}

// Filler words to detect in transcript
const FILLER_RE = /\b(um+|uh+|hmm|ah+|er|like|basically|literally|actually|you know|i mean|right|okay so|kind of|sort of)\b/gi;

function countFillers(text: string): { count: number; words: string[] } {
  const matches = text.match(FILLER_RE) ?? [];
  return { count: matches.length, words: [...new Set(matches.map(m => m.toLowerCase()))] };
}

function computeWpmFromTranscript(text: string, durationSec: number): number | null {
  if (!text || durationSec < 3) return null;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((wordCount / durationSec) * 60);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClarityPage() {
  const { data: session } = useSession();
  const HISTORY_KEY = userScopedKey("ipc_history", session);
  const HISTORY_FALLBACK_KEY = "ipc_history";

  const [stage, setStage] = useState<Stage>("select");
  const [selectedCategory, setSelectedCategory] = useState<string>(DRILL_CATEGORIES[0].id);
  const [selectedDrill, setSelectedDrill] = useState<DrillId | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [voiceMetrics, setVoiceMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  const activeCategory = DRILL_CATEGORIES.find(c => c.id === selectedCategory)!;
  const activeDrill = activeCategory.drills.find(d => d.id === selectedDrill) ?? null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
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
    await new Promise<void>(res => { mr.onstop = () => res(); mr.stop(); });
    streamRef.current?.getTracks().forEach(t => t.stop());

    durationRef.current = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const blob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });

    setStage("processing");

    try {
      // Transcribe
      setProcessingStep("Transcribing…");
      const fd = new FormData();
      fd.append("audio", blob, "drill.webm");
      const txRes = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!txRes.ok) throw new Error("Transcription failed");
      const { text } = await txRes.json();
      setTranscript(text);

      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 10) {
        setError("Recording too short — make sure you're speaking into the mic.");
        setStage("ready");
        return;
      }

      // Voice metrics (Azure pronunciation assessment)
      setProcessingStep("Analyzing pronunciation & clarity…");
      const vmFd = new FormData();
      vmFd.append("audio", blob, "drill.webm");
      let vmData: any = null;
      try {
        const vmRes = await fetch("/api/voice-metrics", { method: "POST", body: vmFd });
        if (vmRes.ok) {
          const vmJson = await vmRes.json();
          vmData = vmJson?.metrics ?? null;
        }
      } catch {}

      setVoiceMetrics(vmData);
      setStage("results");

      // Save to shared history
      try {
        const entry = {
          id: crypto.randomUUID(),
          ts: Date.now(),
          question: activeDrill?.prompt ?? "Clarity drill",
          evaluationFramework: "clarity_drill",
          inputMethod: "spoken" as const,
          score: vmData?.acoustics?.pronunciationScore ?? null,
          deliveryMetrics: vmData ?? null,
        };
        const rawHistory = localStorage.getItem(HISTORY_KEY) ?? localStorage.getItem(HISTORY_FALLBACK_KEY);
        const prev: any[] = rawHistory ? JSON.parse(rawHistory) : [];
        const next = [entry, ...prev].slice(0, 50);
        const json = JSON.stringify(next);
        localStorage.setItem(HISTORY_FALLBACK_KEY, json);
        if (HISTORY_KEY) localStorage.setItem(HISTORY_KEY, json);
      } catch {}
    } catch {
      setError("Something went wrong — please try again.");
      setStage("ready");
    }
  }, [recording, activeDrill, HISTORY_KEY, HISTORY_FALLBACK_KEY]);

  function reset() {
    setStage(selectedDrill ? "ready" : "select");
    setTranscript("");
    setVoiceMetrics(null);
    setError(null);
    setElapsed(0);
  }

  function formatTime(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  // Derived results
  const pronunciationScore = voiceMetrics?.acoustics?.pronunciationScore ?? null;
  const fluencyScore = voiceMetrics?.acoustics?.fluencyScore ?? null;
  const prosodyScore = voiceMetrics?.acoustics?.prosodyScore ?? null;
  const unexpectedBreaks = voiceMetrics?.acoustics?.unexpectedBreaks ?? 0;
  const mumbleIndex = (voiceMetrics as any)?.mumbleIndex ?? (voiceMetrics?.acoustics as any)?.mumbleIndex ?? null;
  const avgWordAccuracy = (voiceMetrics as any)?.avgWordAccuracy ?? (voiceMetrics?.acoustics as any)?.avgWordAccuracy ?? null;
  const mumbledWordRate = (voiceMetrics as any)?.mumbledWordRate ?? (voiceMetrics?.acoustics as any)?.mumbledWordRate ?? null;
  const omissionRate = (voiceMetrics as any)?.omissionRate ?? (voiceMetrics?.acoustics as any)?.omissionRate ?? null;
  const mispronunciationRate = (voiceMetrics as any)?.mispronunciationRate ?? (voiceMetrics?.acoustics as any)?.mispronunciationRate ?? null;
  const fillerResult = countFillers(transcript);
  const wpm = computeWpmFromTranscript(transcript, durationRef.current);

  return (
    <PremiumShell title="Clarity & Articulation">
      <div style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 48 }}>

        {/* Back */}
        <Link href="/hub" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
          ← Practice
        </Link>

        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", margin: 0, lineHeight: 1.2 }}>
            Clarity & Articulation
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "6px 0 0", fontWeight: 500, lineHeight: 1.6 }}>
            Targeted drills for pronunciation, filler reduction, and precise delivery. Each drill has a specific goal — focus on one thing at a time.
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: "var(--radius-lg)", background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626", fontSize: 13, fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* ── SELECT ── */}
        {(stage === "select" || stage === "ready") && (
          <>
            {/* Category tabs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {DRILL_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setSelectedDrill(null); setStage("select"); }}
                  style={{
                    padding: "8px 16px", borderRadius: 99, border: `1px solid ${selectedCategory === cat.id ? cat.color : "var(--card-border-soft)"}`,
                    background: selectedCategory === cat.id ? cat.colorSoft : "var(--card-bg)",
                    color: selectedCategory === cat.id ? cat.color : "var(--text-muted)",
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* Category description */}
            <div style={{ padding: "14px 18px", borderRadius: "var(--radius-lg)", background: activeCategory.colorSoft, border: `1px solid ${activeCategory.color}33`, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Target size={14} color={activeCategory.color} />
                <span style={{ fontSize: 13, color: activeCategory.color, fontWeight: 700 }}>Goal</span>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, fontWeight: 500 }}>{activeCategory.description}</p>
            </div>

            {/* Drill list */}
            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              {activeCategory.drills.map(drill => {
                const active = selectedDrill === drill.id;
                return (
                  <div
                    key={drill.id}
                    onClick={() => { setSelectedDrill(drill.id); setStage("ready"); }}
                    style={{
                      padding: "16px 18px", borderRadius: "var(--radius-xl)",
                      border: `2px solid ${active ? activeCategory.color : "var(--card-border-soft)"}`,
                      background: active ? activeCategory.colorSoft : "var(--card-bg)",
                      cursor: "pointer", transition: "all 150ms",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: active ? 900 : 700, color: active ? activeCategory.color : "var(--text-primary)", lineHeight: 1.6 }}>
                          {drill.prompt}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginTop: 5 }}>
                          Focus: {drill.target}
                        </div>
                      </div>
                      <ChevronRight size={16} color={active ? activeCategory.color : "var(--text-muted)"} style={{ flexShrink: 0, marginTop: 2 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ready state */}
            {stage === "ready" && activeDrill && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ padding: "20px 24px", borderRadius: "var(--radius-xl)", border: `1px solid ${activeCategory.color}55`, background: activeCategory.colorSoft }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: activeCategory.color, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>Your drill</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.65 }}>{activeDrill.prompt}</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center" }}>
                    <Target size={12} color={activeCategory.color} />
                    <span style={{ fontSize: 12, color: activeCategory.color, fontWeight: 700 }}>Target: {activeDrill.target}</span>
                  </div>
                </div>

                <div style={{ padding: "12px 16px", borderRadius: "var(--radius-lg)", background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  <strong style={{ color: "var(--text-primary)" }}>How to practice:</strong> Aim for 30–90 seconds. Speak at your natural pace. After your recording, you'll see pronunciation, fluency, and filler scores with specific guidance.
                </div>

                <button
                  onClick={startRecording}
                  style={{
                    width: "100%", padding: "16px", borderRadius: "var(--radius-xl)",
                    border: "none", background: activeCategory.color,
                    color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  <Mic size={16} />
                  Start Drill
                </button>
              </div>
            )}
          </>
        )}

        {/* ── RECORDING ── */}
        {stage === "recording" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <div style={{ padding: "24px 28px", borderRadius: "var(--radius-xl)", border: `1px solid ${activeCategory.color}55`, background: activeCategory.colorSoft, width: "100%", boxSizing: "border-box" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: activeCategory.color, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>Now recording</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.65 }}>{activeDrill?.prompt}</div>
            </div>

            {/* Pulsing mic */}
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", width: 80, height: 80, borderRadius: "50%", background: `${activeCategory.color}22`, animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: activeCategory.colorSoft, border: `2px solid ${activeCategory.color}`, display: "grid", placeItems: "center" }}>
                <Mic size={22} color={activeCategory.color} />
              </div>
            </div>

            <div style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", letterSpacing: 1, fontVariantNumeric: "tabular-nums" }}>
              {formatTime(elapsed)}
            </div>

            <button
              onClick={stopAndProcess}
              style={{ padding: "14px 36px", borderRadius: "var(--radius-xl)", border: "none", background: "#DC2626", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            >
              <Square size={14} fill="#fff" />
              Stop & Analyze
            </button>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {stage === "processing" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, paddingTop: 48 }}>
            <Volume2 size={40} color={activeCategory.color} />
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>Analyzing your delivery</div>
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>{processingStep}</div>
            <div style={{ width: 180, height: 4, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: "60%", background: activeCategory.color, borderRadius: 99, animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {stage === "results" && (
          <div style={{ display: "grid", gap: 14 }}>
            {/* Drill header */}
            <div style={{ padding: "16px 20px", borderRadius: "var(--radius-xl)", border: `1px solid ${activeCategory.color}44`, background: activeCategory.colorSoft }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: activeCategory.color, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>{activeCategory.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{activeDrill?.prompt}</div>
            </div>

            {/* Azure pronunciation scores */}
            {(pronunciationScore !== null || fluencyScore !== null || prosodyScore !== null) && (
              <div style={{ padding: "22px 24px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg-strong)" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }}>Pronunciation Analysis</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {[
                    { label: "Pronunciation", score: pronunciationScore, desc: "Accuracy and intelligibility" },
                    { label: "Fluency", score: fluencyScore, desc: "Flow, pace, and naturalness" },
                    { label: "Prosody", score: prosodyScore, desc: "Rhythm and intonation" },
                  ].map(({ label, score, desc }) => (
                    <div key={label} style={{ textAlign: "center", padding: "14px 10px", borderRadius: "var(--radius-lg)", background: "var(--card-bg)", border: "1px solid var(--card-border-soft)" }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: scoreColor(score) }}>
                        {score !== null ? Math.round(score) : "—"}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)", marginTop: 3 }}>{label}</div>
                      <div style={{ fontSize: 10, color: scoreColor(score), fontWeight: 700, marginTop: 2 }}>{scoreLabel(score)}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.4 }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Filler count */}
              <div style={{ padding: "18px 20px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Filler Words</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: fillerResult.count === 0 ? "#16A34A" : fillerResult.count <= 2 ? "#D97706" : "#DC2626" }}>
                  {fillerResult.count}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>
                  {fillerResult.count === 0
                    ? "Clean — no fillers detected"
                    : fillerResult.count <= 2
                    ? `Light — ${fillerResult.words.join(", ")}`
                    : `Heavy — ${fillerResult.words.join(", ")}`
                  }
                </div>
              </div>

              {/* Pace */}
              <div style={{ padding: "18px 20px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Speaking Pace</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: wpm === null ? "var(--text-muted)" : wpm >= 120 && wpm <= 155 ? "#16A34A" : wpm < 120 ? "#D97706" : "#DC2626" }}>
                  {wpm ?? "—"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>
                  {wpm === null ? "Words per minute"
                    : wpm < 120 ? "WPM — slightly slow"
                    : wpm <= 155 ? "WPM — ideal range"
                    : wpm <= 175 ? "WPM — slightly fast"
                    : "WPM — rushing"
                  }
                </div>
              </div>
            </div>

            {/* Unexpected breaks (stutter-aware) */}
            {unexpectedBreaks > 0 && (
              <div style={{ padding: "14px 18px", borderRadius: "var(--radius-lg)", background: "rgba(79,70,229,0.06)", border: "1px solid rgba(79,70,229,0.18)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
                  {unexpectedBreaks} unexpected pause{unexpectedBreaks !== 1 ? "s" : ""} detected
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  These are natural — focus on smooth transitions between words rather than eliminating pauses. Deliberate pauses improve clarity; unexpected ones reduce it.
                </div>
              </div>
            )}

            {/* Mumble / articulation clarity */}
            {mumbleIndex !== null && (
              (() => {
                const isMumbled = mumbleIndex > 50;
                const isSlightlyUnclear = mumbleIndex > 25 && mumbleIndex <= 50;
                const isClear = mumbleIndex <= 25;
                const color = isMumbled ? "var(--danger)" : isSlightlyUnclear ? "#D97706" : "var(--success)";
                const bgColor = isMumbled ? "rgba(220,38,38,0.06)" : isSlightlyUnclear ? "rgba(217,119,6,0.06)" : "rgba(22,163,74,0.06)";
                const borderColor = isMumbled ? "rgba(220,38,38,0.2)" : isSlightlyUnclear ? "rgba(217,119,6,0.2)" : "rgba(22,163,74,0.2)";
                const label = isMumbled ? "Mumbling detected" : isSlightlyUnclear ? "Slight clarity issues" : "Clear articulation";
                return (
                  <div style={{ padding: "16px 20px", borderRadius: "var(--radius-lg)", background: bgColor, border: `1px solid ${borderColor}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>
                        {avgWordAccuracy !== null ? `${avgWordAccuracy}% avg word accuracy` : `Clarity index: ${mumbleIndex}`}
                      </div>
                    </div>
                    {(mumbledWordRate !== null || omissionRate !== null || mispronunciationRate !== null) && (
                      <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                        {mumbledWordRate !== null && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            <span style={{ fontWeight: 700, color: isMumbled ? color : "var(--text-primary)" }}>{mumbledWordRate}%</span> low-clarity words
                          </div>
                        )}
                        {omissionRate !== null && omissionRate > 0 && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            <span style={{ fontWeight: 700, color: omissionRate > 10 ? color : "var(--text-muted)" }}>{omissionRate}%</span> sounds dropped
                          </div>
                        )}
                        {mispronunciationRate !== null && mispronunciationRate > 0 && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            <span style={{ fontWeight: 700, color: mispronunciationRate > 10 ? color : "var(--text-muted)" }}>{mispronunciationRate}%</span> words unclear
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>
                      {isMumbled && omissionRate !== null && omissionRate > 15
                        ? "Word endings are being dropped. Finish each word fully before starting the next. Exaggerate final consonants in practice — this sounds natural at full speed."
                        : isMumbled && mispronunciationRate !== null && mispronunciationRate > 20
                        ? "Multiple words aren't landing clearly. Slow to 80% speed and sharpen the first and last consonant of each key word. Then build back to full pace."
                        : isMumbled
                        ? "Overall word clarity is below threshold. This is about shaping, not volume — open your mouth slightly more and commit to each consonant fully."
                        : isSlightlyUnclear
                        ? "Minor clarity issues. Most words are landing well. Watch for words you glide through at high speed — those are where precision drops."
                        : "Word-level clarity is strong. Keep articulating consonants fully as you push for higher pace targets."}
                    </div>
                  </div>
                );
              })()
            )}

            {/* Coaching note based on drill type */}
            <div style={{ padding: "18px 20px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>Coaching Note</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>
                {selectedCategory === "fillers" && fillerResult.count === 0
                  ? "Excellent — zero fillers. Now do the drill again at a faster pace and maintain the same clean delivery."
                  : selectedCategory === "fillers"
                  ? `You used ${fillerResult.count} filler${fillerResult.count !== 1 ? "s" : ""} (${fillerResult.words.join(", ")}). Next attempt: every time you feel the urge to say one, pause silently for 1–2 seconds instead.`
                  : selectedCategory === "precision" && (fluencyScore ?? 0) >= 75
                  ? "Strong fluency. Focus now on replacing any hedging language (\"kind of\", \"sort of\", \"basically\") with direct assertions."
                  : selectedCategory === "pace" && wpm !== null && wpm > 155
                  ? `You spoke at ${wpm} WPM — slightly fast. Aim for 120–150 WPM on the next attempt. After each key point, pause for a full 2 seconds.`
                  : selectedCategory === "openings"
                  ? "Review your transcript below. Did you start with a direct statement, or did you warm up first? Rerecord if your first sentence wasn't your strongest."
                  : "Good attempt. Review your transcript below and compare it to your target. Record again to improve one specific element."
                }
              </div>
            </div>

            {/* Transcript */}
            {transcript && (
              <details style={{ padding: "16px 20px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                <summary style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", cursor: "pointer" }}>Your transcript</summary>
                <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{transcript}</p>
              </details>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={reset}
                style={{ flex: 1, padding: "14px", borderRadius: "var(--radius-md)", border: "none", background: activeCategory.color, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <RefreshCw size={14} />
                Try again
              </button>
              <button
                onClick={() => { setSelectedDrill(null); setStage("select"); setTranscript(""); setVoiceMetrics(null); setError(null); }}
                style={{ flex: 1, padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                New drill
              </button>
            </div>
          </div>
        )}
      </div>
    </PremiumShell>
  );
}
