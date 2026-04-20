"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Mic, Square, RefreshCw, AlertCircle, Sparkles, ChevronRight,
  Volume2, Music, Zap, Activity,
} from "lucide-react";
import PremiumShell from "@/app/components/PremiumShell";
import { userScopedKey } from "@/app/lib/userStorage";
import type { WarmupDrill } from "@/app/api/warmup/route";

// ── Stage ─────────────────────────────────────────────────────────────────────

type Stage = "idle" | "generating" | "select" | "ready" | "recording" | "processing" | "results";

// ── Phoneme group colors ──────────────────────────────────────────────────────

const GROUP_META: Record<string, { color: string; colorSoft: string; icon: React.ReactNode }> = {
  plosives:   { color: "#4F46E5", colorSoft: "rgba(79,70,229,0.09)",  icon: <Activity size={14} /> },
  sibilants:  { color: "#0EA5E9", colorSoft: "rgba(14,165,233,0.09)", icon: <Volume2 size={14} /> },
  fricatives: { color: "#D97706", colorSoft: "rgba(217,119,6,0.09)",  icon: <Zap size={14} /> },
  vowels:     { color: "#16A34A", colorSoft: "rgba(22,163,74,0.09)",  icon: <Music size={14} /> },
  clusters:   { color: "#7C3AED", colorSoft: "rgba(124,58,237,0.09)", icon: <Activity size={14} /> },
  pitch:      { color: "#EC4899", colorSoft: "rgba(236,72,153,0.09)", icon: <Music size={14} /> },
};

function groupMeta(g: string) {
  return GROUP_META[g] ?? { color: "var(--accent)", colorSoft: "var(--accent-soft)", icon: <Mic size={14} /> };
}

// ── Score helpers ─────────────────────────────────────────────────────────────

function scoreColor(score: number | null, inverted = false): string {
  if (score === null) return "var(--text-muted)";
  const good = inverted ? score <= 3 : score >= 80;
  const ok   = inverted ? score <= 6 : score >= 60;
  if (good) return "#16A34A";
  if (ok)   return "#D97706";
  return "#DC2626";
}

function scoreLabel(score: number | null, inverted = false): string {
  if (score === null) return "—";
  if (inverted) {
    if (score <= 3)  return "Dynamic";
    if (score <= 6)  return "Moderate";
    return "Flat";
  }
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Developing";
  return "Needs work";
}

function pitchLabel(monotoneScore: number | null): string {
  if (monotoneScore === null) return "—";
  if (monotoneScore <= 3) return "Dynamic";
  if (monotoneScore <= 6) return "Moderate";
  return "Flat";
}

function pitchNote(monotoneScore: number | null): string {
  if (monotoneScore === null) return "Pitch variety not measured";
  if (monotoneScore <= 3) return "Strong pitch variation — delivery sounds engaged and expressive";
  if (monotoneScore <= 6) return "Moderate variation — some vocal color, room to push further";
  return "Flat delivery detected — raise and lower your pitch deliberately on key words";
}

function energyLabel(v: number | null): string {
  if (v === null) return "—";
  if (v >= 1.2) return "Animated";
  if (v >= 0.8) return "Present";
  return "Flat";
}

function energyNote(v: number | null): string {
  if (v === null) return "Energy data not available";
  if (v >= 1.2) return "Good amplitude variation — you're landing emphasis where it counts";
  if (v >= 0.8) return "Healthy energy range — maintain this into the real interview";
  return "Low energy variation — stress key words louder than the words around them";
}

function energyColor(v: number | null): string {
  if (v === null) return "var(--text-muted)";
  if (v >= 0.8) return "#16A34A";
  return "#DC2626";
}

const FILLER_RE = /\b(um+|uh+|hmm|ah+|er|like|basically|literally|actually|you know|i mean|right|okay so|kind of|sort of)\b/gi;
function countFillers(text: string) {
  const matches = text.match(FILLER_RE) ?? [];
  return { count: matches.length, words: [...new Set(matches.map(m => m.toLowerCase()))] };
}

function computeWpm(text: string, durationSec: number): number | null {
  if (!text || durationSec < 3) return null;
  return Math.round((text.trim().split(/\s+/).filter(Boolean).length / durationSec) * 60);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClarityPage() {
  const { data: session } = useSession();
  const HISTORY_KEY = userScopedKey("ipc_history", session);

  const [stage, setStage]           = useState<Stage>("idle");
  const [drills, setDrills]         = useState<WarmupDrill[]>([]);
  const [activeDrill, setActiveDrill] = useState<WarmupDrill | null>(null);
  const [recording, setRecording]   = useState(false);
  const [elapsed, setElapsed]       = useState(0);
  const [transcript, setTranscript] = useState("");
  const [voiceMetrics, setVoiceMetrics] = useState<any>(null);
  const [error, setError]           = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const streamRef        = useRef<MediaStream | null>(null);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef     = useRef<number>(0);
  const durationRef      = useRef<number>(0);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 200);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recording]);

  // ── Generate warmup drills ────────────────────────────────────────────────

  async function generateDrills() {
    setError(null);
    setStage("generating");

    // Pull recent delivery metrics from localStorage history
    let metrics: Record<string, number | null> = {};
    try {
      const raw = localStorage.getItem(HISTORY_KEY) ?? localStorage.getItem("ipc_history");
      const history: any[] = raw ? JSON.parse(raw) : [];
      const recent = history.filter(a => a.deliveryMetrics).slice(0, 5);
      if (recent.length > 0) {
        const avg = (vals: (number | null | undefined)[]) => {
          const nums = vals.filter((v): v is number => typeof v === "number");
          return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
        };
        const ac = (a: any) => a.deliveryMetrics?.acoustics ?? a.deliveryMetrics ?? {};
        metrics = {
          pronunciationScore:  avg(recent.map(a => ac(a).pronunciationScore)),
          fluencyScore:        avg(recent.map(a => ac(a).fluencyScore)),
          prosodyScore:        avg(recent.map(a => ac(a).prosodyScore)),
          monotoneScore:       avg(recent.map(a => ac(a).monotoneScore)),
          energyVariation:     avg(recent.map(a => ac(a).energyVariation)),
          mumbleIndex:         avg(recent.map(a => a.deliveryMetrics?.mumbleIndex ?? ac(a).mumbleIndex)),
          mispronunciationRate:avg(recent.map(a => a.deliveryMetrics?.mispronunciationRate ?? ac(a).mispronunciationRate)),
          wpm:                 avg(recent.map(a => a.deliveryMetrics?.wpm)),
        };
      }
    } catch {}

    try {
      const res = await fetch("/api/warmup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setDrills(data.drills ?? []);
      setStage("select");
    } catch {
      setError("Failed to generate warmup drills. Please try again.");
      setStage("idle");
    }
  }

  // ── Recording ─────────────────────────────────────────────────────────────

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
      setProcessingStep("Transcribing…");
      const fd = new FormData();
      fd.append("audio", blob, "warmup.webm");
      const txRes = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!txRes.ok) throw new Error("Transcription failed");
      const { text } = await txRes.json();
      setTranscript(text);

      if (text.trim().split(/\s+/).filter(Boolean).length < 5) {
        setError("Recording too short — speak clearly into the mic.");
        setStage("ready");
        return;
      }

      setProcessingStep("Analyzing pronunciation, pitch, and energy…");
      const vmFd = new FormData();
      vmFd.append("audio", blob, "warmup.webm");
      let vmData: any = null;
      try {
        const vmRes = await fetch("/api/voice-metrics", { method: "POST", body: vmFd });
        if (vmRes.ok) vmData = (await vmRes.json())?.metrics ?? null;
      } catch {}

      setVoiceMetrics(vmData);
      setStage("results");

      // Save to shared history
      try {
        const entry = {
          id: crypto.randomUUID(),
          ts: Date.now(),
          question: activeDrill?.text ?? "Voice warmup",
          evaluationFramework: "warmup",
          inputMethod: "spoken" as const,
          score: vmData?.pronunciationScore ?? null,
          deliveryMetrics: vmData ?? null,
        };
        const raw = localStorage.getItem(HISTORY_KEY) ?? localStorage.getItem("ipc_history");
        const prev: any[] = raw ? JSON.parse(raw) : [];
        const next = [entry, ...prev].slice(0, 50);
        const json = JSON.stringify(next);
        localStorage.setItem("ipc_history", json);
        if (HISTORY_KEY) localStorage.setItem(HISTORY_KEY, json);
      } catch {}
    } catch {
      setError("Something went wrong — please try again.");
      setStage("ready");
    }
  }, [recording, activeDrill, HISTORY_KEY]);

  function reset() {
    setStage("ready");
    setTranscript("");
    setVoiceMetrics(null);
    setError(null);
    setElapsed(0);
  }

  function newDrill() {
    setActiveDrill(null);
    setStage("select");
    setTranscript("");
    setVoiceMetrics(null);
    setError(null);
    setElapsed(0);
  }

  function fmt(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  // ── Derived results ────────────────────────────────────────────────────────

  const ac               = voiceMetrics?.acoustics ?? voiceMetrics ?? {};
  const pronunciationScore   = ac.pronunciationScore ?? null;
  const fluencyScore         = ac.fluencyScore ?? null;
  const prosodyScore         = ac.prosodyScore ?? null;
  const monotoneScore        = ac.monotoneScore ?? null;
  const energyVariation      = ac.energyVariation ?? null;
  const mumbleIndex          = voiceMetrics?.mumbleIndex ?? ac.mumbleIndex ?? null;
  const avgWordAccuracy      = voiceMetrics?.avgWordAccuracy ?? ac.avgWordAccuracy ?? null;
  const mispronunciationRate = voiceMetrics?.mispronunciationRate ?? ac.mispronunciationRate ?? null;
  const unexpectedBreaks     = ac.unexpectedBreaks ?? 0;
  const fillerResult         = countFillers(transcript);
  const wpm                  = computeWpm(transcript, durationRef.current);

  const meta = groupMeta(activeDrill?.phonemeGroup ?? "");

  // Warmup readiness score: weighted average of key delivery signals
  const readinessScore = (() => {
    const signals: number[] = [];
    if (pronunciationScore !== null) signals.push(pronunciationScore);
    if (fluencyScore !== null)       signals.push(fluencyScore);
    if (monotoneScore !== null)      signals.push(Math.max(0, 100 - monotoneScore * 10));
    if (energyVariation !== null)    signals.push(Math.min(100, energyVariation * 50));
    if (mumbleIndex !== null)        signals.push(Math.max(0, 100 - mumbleIndex));
    if (signals.length === 0) return null;
    return Math.round(signals.reduce((a, b) => a + b, 0) / signals.length);
  })();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PremiumShell title="Voice Warmup">
      <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 48 }}>

        <Link href="/hub" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
          ← Back
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", margin: "0 0 6px", lineHeight: 1.2 }}>
            Voice Warmup
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, fontWeight: 500, lineHeight: 1.6 }}>
            AI-generated tongue twisters and delivery drills personalized to your weak spots. 2 minutes before your interview.
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: "var(--radius-lg)", background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", color: "#DC2626", fontSize: 13, fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* ── IDLE ── */}
        {stage === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ padding: "24px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>What this does</div>
              <div style={{ display: "grid", gap: 10 }}>
                {[
                  { icon: <Sparkles size={14} />, color: "#4F46E5", text: "Generates drills targeting your specific pronunciation and delivery weak spots from recent sessions" },
                  { icon: <Activity size={14} />, color: "#EC4899", text: "Includes pitch variety exercises so your voice sounds engaged, not flat" },
                  { icon: <Volume2 size={14} />, color: "#16A34A", text: "Results show pronunciation, fluency, pitch variety, energy, and clarity — not response content" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: `${item.color}12`, border: `1px solid ${item.color}22`, display: "flex", alignItems: "center", justifyContent: "center", color: item.color, flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65, paddingTop: 4 }}>{item.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={generateDrills}
              style={{
                width: "100%", padding: "16px", borderRadius: "var(--radius-xl)",
                border: "none", background: "var(--accent)",
                color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Sparkles size={16} />
              Generate My Warmup
            </button>
          </div>
        )}

        {/* ── GENERATING ── */}
        {stage === "generating" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, paddingTop: 48 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--accent-soft)", border: "1px solid var(--accent-strong)", display: "grid", placeItems: "center" }}>
              <Sparkles size={22} color="var(--accent)" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>Building your warmup…</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Analyzing your delivery history and generating personalized drills</div>
            <div style={{ width: 160, height: 4, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: "70%", background: "var(--accent)", borderRadius: 99, animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
          </div>
        )}

        {/* ── SELECT ── */}
        {stage === "select" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
              Pick a drill — or do all four for a full warmup
            </div>
            {drills.map(drill => {
              const m = groupMeta(drill.phonemeGroup);
              return (
                <div
                  key={drill.id}
                  onClick={() => { setActiveDrill(drill); setStage("ready"); }}
                  style={{
                    padding: "18px 20px", borderRadius: "var(--radius-xl)",
                    border: `1px solid var(--card-border-soft)`,
                    background: "var(--card-bg)",
                    cursor: "pointer", transition: "border-color 150ms",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = m.color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--card-border-soft)")}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, background: m.colorSoft, border: `1px solid ${m.color}33`, fontSize: 11, fontWeight: 700, color: m.color }}>
                          {m.icon}
                          {drill.target}
                        </div>
                        <div style={{
                          padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                          color: drill.difficulty === "easy" ? "#16A34A" : drill.difficulty === "medium" ? "#D97706" : "#DC2626",
                          background: drill.difficulty === "easy" ? "rgba(22,163,74,0.08)" : drill.difficulty === "medium" ? "rgba(217,119,6,0.08)" : "rgba(220,38,38,0.08)",
                          border: `1px solid ${drill.difficulty === "easy" ? "rgba(22,163,74,0.2)" : drill.difficulty === "medium" ? "rgba(217,119,6,0.2)" : "rgba(220,38,38,0.2)"}`,
                          textTransform: "capitalize" as const,
                        }}>{drill.difficulty}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.65, marginBottom: 6 }}>
                        {drill.text}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                        Focus: {drill.focus}
                      </div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 4 }} />
                  </div>
                </div>
              );
            })}

            <button
              onClick={generateDrills}
              style={{ padding: "12px 20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)", color: "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}
            >
              <RefreshCw size={13} />
              Regenerate drills
            </button>
          </div>
        )}

        {/* ── READY ── */}
        {stage === "ready" && activeDrill && (() => {
          const m = groupMeta(activeDrill.phonemeGroup);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Drill card */}
              <div style={{ padding: "22px 24px", borderRadius: "var(--radius-xl)", border: `1px solid ${m.color}44`, background: m.colorSoft }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, background: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, color: m.color }}>
                    {m.icon}
                    {activeDrill.target}
                  </div>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.65, marginBottom: 10 }}>
                  {activeDrill.text}
                </div>
                <div style={{ fontSize: 12, color: m.color, fontWeight: 700 }}>
                  Focus: {activeDrill.focus}
                </div>
              </div>

              <div style={{ padding: "12px 16px", borderRadius: "var(--radius-lg)", background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>
                <strong style={{ color: "var(--text-primary)" }}>How to practice:</strong> Read the text above aloud 2–3 times, then record your best attempt. Go slow enough to hit every sound cleanly. For pitch drills, vary your tone — high on key words, lower on supporting words.
              </div>

              <button
                onClick={startRecording}
                style={{ width: "100%", padding: "16px", borderRadius: "var(--radius-xl)", border: "none", background: m.color, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <Mic size={16} />
                Record Your Attempt
              </button>

              <button
                onClick={() => setStage("select")}
                style={{ padding: "11px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border-soft)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                ← Choose a different drill
              </button>
            </div>
          );
        })()}

        {/* ── RECORDING ── */}
        {stage === "recording" && activeDrill && (() => {
          const m = groupMeta(activeDrill.phonemeGroup);
          return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
              {/* Prompt */}
              <div style={{ padding: "20px 24px", borderRadius: "var(--radius-xl)", border: `1px solid ${m.color}44`, background: m.colorSoft, width: "100%", boxSizing: "border-box" as const }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: m.color, letterSpacing: 0.8, textTransform: "uppercase" as const, marginBottom: 8 }}>Read aloud</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.65 }}>{activeDrill.text}</div>
              </div>

              {/* Pulsing mic */}
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ position: "absolute", width: 80, height: 80, borderRadius: "50%", background: `${m.color}22`, animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: m.colorSoft, border: `2px solid ${m.color}`, display: "grid", placeItems: "center" }}>
                  <Mic size={22} color={m.color} />
                </div>
              </div>

              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", letterSpacing: 1, fontVariantNumeric: "tabular-nums" }}>
                {fmt(elapsed)}
              </div>

              <button
                onClick={stopAndProcess}
                style={{ padding: "14px 36px", borderRadius: "var(--radius-xl)", border: "none", background: "#DC2626", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
              >
                <Square size={14} fill="#fff" />
                Stop & Analyze
              </button>
            </div>
          );
        })()}

        {/* ── PROCESSING ── */}
        {stage === "processing" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, paddingTop: 48 }}>
            <Volume2 size={40} color="var(--accent)" />
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>Analyzing your delivery</div>
            <div style={{ fontSize: 14, color: "var(--text-muted)" }}>{processingStep}</div>
            <div style={{ width: 180, height: 4, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: "60%", background: "var(--accent)", borderRadius: 99, animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {stage === "results" && activeDrill && (() => {
          const m = groupMeta(activeDrill.phonemeGroup);
          return (
            <div style={{ display: "grid", gap: 14 }}>

              {/* Drill header */}
              <div style={{ padding: "14px 18px", borderRadius: "var(--radius-xl)", border: `1px solid ${m.color}44`, background: m.colorSoft, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: m.color, letterSpacing: 0.8, textTransform: "uppercase" as const, marginBottom: 3 }}>{activeDrill.target}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.5 }}>{activeDrill.text}</div>
                </div>
                {readinessScore !== null && (
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: readinessScore >= 75 ? "#16A34A" : readinessScore >= 55 ? "#D97706" : "#DC2626", lineHeight: 1 }}>
                      {readinessScore}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", marginTop: 2 }}>Readiness</div>
                  </div>
                )}
              </div>

              {/* Pronunciation row: pronunciation + fluency + prosody */}
              {(pronunciationScore !== null || fluencyScore !== null || prosodyScore !== null) && (
                <div style={{ padding: "20px 22px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg-strong)" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", marginBottom: 14 }}>Pronunciation</div>
                  <div className="ipc-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {[
                      { label: "Accuracy",  score: pronunciationScore, desc: "Word-level precision" },
                      { label: "Fluency",   score: fluencyScore,        desc: "Natural flow & pace" },
                      { label: "Prosody",   score: prosodyScore,        desc: "Rhythm & intonation" },
                    ].map(({ label, score, desc }) => (
                      <div key={label} style={{ textAlign: "center", padding: "14px 8px", borderRadius: "var(--radius-lg)", background: "var(--card-bg)", border: "1px solid var(--card-border-soft)" }}>
                        <div style={{ fontSize: 26, fontWeight: 900, color: scoreColor(score) }}>{score !== null ? Math.round(score) : "—"}</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>{label}</div>
                        <div style={{ fontSize: 10, color: scoreColor(score), fontWeight: 700, marginTop: 1 }}>{scoreLabel(score)}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.3 }}>{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pitch & Energy row */}
              <div style={{ padding: "20px 22px", borderRadius: "var(--radius-xl)", border: "1px solid rgba(236,72,153,0.18)", background: "rgba(236,72,153,0.03)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", marginBottom: 14 }}>Pitch & Energy</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  {/* Pitch variety */}
                  <div style={{ padding: "14px", borderRadius: "var(--radius-lg)", background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: scoreColor(monotoneScore, true), lineHeight: 1 }}>
                      {pitchLabel(monotoneScore)}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }}>Pitch Variety</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Tonal variation detected</div>
                  </div>
                  {/* Energy */}
                  <div style={{ padding: "14px", borderRadius: "var(--radius-lg)", background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: energyColor(energyVariation), lineHeight: 1 }}>
                      {energyLabel(energyVariation)}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }}>Energy Level</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Amplitude variation</div>
                  </div>
                </div>

                {/* Pitch coaching note */}
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65, padding: "10px 12px", borderRadius: "var(--radius-md)", background: "rgba(236,72,153,0.05)", border: "1px solid rgba(236,72,153,0.15)" }}>
                  <strong style={{ color: "#EC4899" }}>Pitch: </strong>{pitchNote(monotoneScore)}
                  {energyVariation !== null && <><br /><strong style={{ color: "#EC4899" }}>Energy: </strong>{energyNote(energyVariation)}</>}
                </div>
              </div>

              {/* Pace & Fillers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: "18px 20px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 0.6, marginBottom: 8 }}>Speaking Pace</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: wpm === null ? "var(--text-muted)" : wpm >= 120 && wpm <= 155 ? "#16A34A" : "#D97706" }}>
                    {wpm ?? "—"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>
                    {wpm === null ? "words per minute"
                      : wpm < 120 ? "WPM — slightly slow"
                      : wpm <= 155 ? "WPM — ideal range"
                      : wpm <= 175 ? "WPM — slightly fast"
                      : "WPM — rushing"}
                  </div>
                </div>
                <div style={{ padding: "18px 20px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 0.6, marginBottom: 8 }}>Filler Words</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: fillerResult.count === 0 ? "#16A34A" : fillerResult.count <= 2 ? "#D97706" : "#DC2626" }}>
                    {fillerResult.count}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>
                    {fillerResult.count === 0 ? "Clean — zero detected"
                      : fillerResult.count <= 2 ? `Light — ${fillerResult.words.join(", ")}`
                      : `Heavy — ${fillerResult.words.join(", ")}`}
                  </div>
                </div>
              </div>

              {/* Word clarity */}
              {(mumbleIndex !== null || avgWordAccuracy !== null) && (
                <div style={{
                  padding: "16px 20px", borderRadius: "var(--radius-xl)",
                  border: `1px solid ${(mumbleIndex ?? 0) > 35 ? "rgba(220,38,38,0.2)" : (mumbleIndex ?? 0) > 18 ? "rgba(217,119,6,0.2)" : "rgba(22,163,74,0.2)"}`,
                  background: (mumbleIndex ?? 0) > 35 ? "rgba(220,38,38,0.04)" : (mumbleIndex ?? 0) > 18 ? "rgba(217,119,6,0.04)" : "rgba(22,163,74,0.04)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: (mumbleIndex ?? 0) > 35 ? "#DC2626" : (mumbleIndex ?? 0) > 18 ? "#D97706" : "#16A34A" }}>
                      {(mumbleIndex ?? 0) <= 18 ? "Clear articulation" : (mumbleIndex ?? 0) <= 35 ? "Slight clarity issues" : "Mumbling detected"}
                    </div>
                    {avgWordAccuracy !== null && (
                      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)" }}>{avgWordAccuracy}% word accuracy</div>
                    )}
                  </div>
                  {(mispronunciationRate !== null && mispronunciationRate > 0) && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, color: mispronunciationRate > 15 ? "#DC2626" : "var(--text-muted)" }}>{mispronunciationRate}%</span> of words unclear
                    </div>
                  )}
                  {unexpectedBreaks > 0 && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {unexpectedBreaks} unexpected pause{unexpectedBreaks !== 1 ? "s" : ""} detected
                    </div>
                  )}
                </div>
              )}

              {/* Transcript */}
              {transcript && (
                <details style={{ padding: "14px 18px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                  <summary style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", cursor: "pointer" }}>Your transcript</summary>
                  <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{transcript}</p>
                </details>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
                <button
                  onClick={reset}
                  style={{ flex: 1, padding: "14px", borderRadius: "var(--radius-md)", border: "none", background: m.color, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <RefreshCw size={14} />
                  Try again
                </button>
                <button
                  onClick={newDrill}
                  style={{ flex: 1, padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)", color: "var(--text-primary)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                >
                  New drill
                </button>
                <button
                  onClick={generateDrills}
                  style={{ flex: 1, padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)", color: "var(--text-muted)", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Sparkles size={13} />
                  New set
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </PremiumShell>
  );
}
