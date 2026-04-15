"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIsMobile } from "@/app/hooks/useIsMobile";
import { useRouter } from "next/navigation";
import PremiumShell from "../../components/PremiumShell";
import PremiumCard from "../../components/PremiumCard";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";
import { ARCHETYPE_COLOR } from "@/app/lib/feedback/archetypes";
import {
  asOverall100,
  asTenPoint,
  displayOverall100,
  displayTenPointAs100,
  avgTenPoint,
} from "@/app/lib/scoreScale";

type ProsodySeries = {
  t: number[]; // seconds
  energy: number[]; // rms (0..~0.3)
  pitch: number[]; // Hz (0 when unvoiced)
};

type Prosody = {
  pitchMean?: number;
  pitchStd?: number;
  pitchRange?: number;

  energyMean?: number;
  energyStd?: number;
  energyVariation?: number; // 0-10

  tempo?: number;
  tempoDynamics?: number; // 0-10
  monotoneScore?: number; // 0-10

  sampleRate?: number;
  durationSec?: number;

  series?: ProsodySeries;
};

type TimelineMarker = {
  label: string;
  t: number; // seconds
};

type StoredResult = {
  ts: number;
  question: string;
  questionCategory?: string;
  questionSource?: string;
  evaluationFramework?: string;
  transcript?: string;
  score?: number | null;
  wpm?: number | null;
  jobDesc?: string;
  deliveryMetrics?: any | null;
  questions?: string[];
questionBuckets?: {
  behavioral: string[];
  technical: string[];
  role_specific?: string[];
  custom?: string[];
} | null;
  prosody?: Prosody | null;
  feedback: any;
  audioId?: string | null;
  audioPath?: string | null;
  inputMethod?: "spoken" | "pasted";

  jobProfileId?: string | null;
  jobProfileTitle?: string | null;
  jobProfileCompany?: string | null;
  jobProfileRoleType?: string | null;
};


// -------------------- IndexedDB audio replay --------------------
const AUDIO_DB = "ipc_audio_db";
const AUDIO_STORE = "audio";

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AUDIO_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) db.createObjectStore(AUDIO_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAudio(id: string): Promise<Blob | null> {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, "readonly");
    const req = tx.objectStore(AUDIO_STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
}

// -------------------- Deterministic variant picker --------------------
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickVariant(lines: string[], seed: number) {
  if (!lines.length) return "";
  const r = mulberry32(seed)();
  return lines[Math.floor(r * lines.length)];
}

// -------------------- Delivery helpers --------------------
function paceContext(wpm: number) {
  if (wpm < 100) {
    return {
      label: "Slow",
      hint: "Try shortening pauses and tightening sentences. Aim for ~115–145 wpm.",
    };
  }
  if (wpm <= 140) {
    return {
      label: "Ideal",
      hint: "Great pace - clear, steady, and confident.",
    };
  }
  if (wpm <= 165) {
    return {
      label: "Fast",
      hint: "A bit quick - slow down on key points and numbers for clarity.",
    };
  }
  return {
    label: "Very fast",
    hint: "Too fast for most interviews - add intentional pauses after results and metrics.",
  };
}

function monotoneContext(score: number) {
  if (score <= 3) return "Expressive (great)";
  if (score <= 6) return "Moderate (good)";
  return "Flat (work on variation)";
}

function energyVarContext(score: number) {
  if (score < 3) return "Low energy variation";
  if (score <= 7) return "Healthy dynamics";
  return "Very dynamic (watch consistency)";
}

function tempoDynContext(score: number) {
  if (score < 3) return "Very steady pacing";
  if (score <= 7) return "Natural pacing variety";
  return "Highly variable pacing";
}

function pitchRangeContext(hz: number) {
  if (hz < 80) return "Narrow range (can sound flat)";
  if (hz <= 180) return "Good range (natural)";
  return "Wide range (very expressive)";
}

function tempoContext(bpm: number) {
  if (bpm < 90) return "Slow cadence";
  if (bpm <= 140) return "Normal cadence";
  return "Fast cadence";
}

function pitchStdContext(hz: number) {
  if (hz < 10) return "Low variation";
  if (hz <= 30) return "Good variation";
  return "High variation";
}

function crossSignalInsight(
  monotone: number | null | undefined,
  energyVar: number | null | undefined,
  wpm: number | null | undefined,
  pitchStd: number | null | undefined,
  eyeContact?: number | null,
): string | null {
  const m = typeof monotone === "number" ? monotone : null;
  const ev = typeof energyVar === "number" ? energyVar : null;
  const w = typeof wpm === "number" ? wpm : null;
  const ps = typeof pitchStd === "number" ? pitchStd : null;
  const ec = typeof eyeContact === "number" ? eyeContact : null;

  if (m === null && ev === null) return null;

  // Low eye contact + high monotone = double confidence reduction
  if (ec !== null && ec < 0.4 && m !== null && m >= 6) {
    return "Flat delivery and low eye contact compound each other — both signal disengagement to an interviewer. Start with the easier fix: add a deliberate pause before your result sentence. That single moment of contrast often resolves both.";
  }

  // High monotone + high energy = pitch flat but volume dynamic
  if (m !== null && m >= 7 && ev !== null && ev >= 6) {
    return "Your volume varies well, but pitch stays flat - interviewers hear energy without expressiveness. Adding pitch drops on key points will sharpen the impact significantly.";
  }
  // High monotone + low energy = fully flat
  if (m !== null && m >= 7 && ev !== null && ev < 4) {
    return "Both pitch and energy are flat. This reads as low stakes or low confidence regardless of content. Focus on varying the weight of your ending sentences first.";
  }
  // High monotone + high WPM = fast and flat (worst delivery combo)
  if (m !== null && m >= 6 && w !== null && w > 160) {
    return "Fast pace and flat pitch together compress the most important signal — your result. Slow your pace specifically on the outcome sentence and add a slight pitch lift. Those two seconds change how the entire answer is remembered.";
  }
  // Low eye contact + fast WPM = nervous energy pattern
  if (ec !== null && ec < 0.45 && w !== null && w > 155) {
    return "Fast pace and reduced eye contact often appear together under pressure. Camera gaze is a proxy for confidence — trying to hold the camera a beat longer as you land your result statement helps slow pace as a side effect.";
  }
  // Low monotone but low energy variation - different signals
  if (m !== null && m <= 3 && ev !== null && ev < 3) {
    return "Low monotone risk is a positive signal. Note that energy variation is separate from pitch - consider adding more volume contrast between setup and result to match your pitch variety.";
  }
  // Moderate monotone + good pitch std = nuanced flatness
  if (m !== null && m >= 4 && m <= 6 && ps !== null && ps >= 20) {
    return "Moderate monotone risk but healthy pitch range suggests your voice varies, just not consistently enough. Focus on the moments when you transition to your result - that's where expressiveness matters most.";
  }
  // Low monotone + slow WPM = measured and expressive
  if (m !== null && m <= 3 && w !== null && w < 120) {
    return "Low monotone risk combined with measured pace is a strong signal. This delivery style reads as confident and considered - maintain it on your result and outcome sentences.";
  }
  // Good eye contact + flat delivery = almost there
  if (ec !== null && ec >= 0.65 && m !== null && m >= 6) {
    return "Strong eye contact is a real positive here — that presence signal is working. The only missing piece is pitch variety. Eye contact gives you the channel; adding expressiveness fills it.";
  }

  return null;
}

const THEME_META: Record<string, { label: string; color: string; bg: string }> = {
  structure:        { label: "STAR Structure",     color: "rgba(99,102,241,0.9)",   bg: "rgba(99,102,241,0.08)" },
  clarity:          { label: "Clarity",             color: "rgba(34,197,94,0.9)",    bg: "rgba(34,197,94,0.07)" },
  delivery_control: { label: "Delivery Control",   color: "rgba(251,191,36,0.9)",   bg: "rgba(251,191,36,0.07)" },
  pace_control:     { label: "Pace Control",        color: "rgba(251,191,36,0.9)",   bg: "rgba(251,191,36,0.07)" },
  vocal_presence:   { label: "Vocal Presence",      color: "rgba(168,85,247,0.9)",   bg: "rgba(168,85,247,0.07)" },
  outcome_strength: { label: "Outcome Strength",    color: "rgba(249,115,22,0.9)",   bg: "rgba(249,115,22,0.07)" },
  specificity:      { label: "Specificity",         color: "rgba(20,184,166,0.9)",   bg: "rgba(20,184,166,0.07)" },
  ownership:        { label: "Ownership",           color: "rgba(99,102,241,0.85)",  bg: "rgba(99,102,241,0.07)" },
  depth:            { label: "Answer Depth",        color: "rgba(34,197,94,0.85)",   bg: "rgba(34,197,94,0.07)" },
  directness:       { label: "Directness",          color: "rgba(20,184,166,0.85)",  bg: "rgba(20,184,166,0.07)" },
  completeness:     { label: "Completeness",        color: "rgba(99,102,241,0.8)",   bg: "rgba(99,102,241,0.06)" },
  role_alignment:   { label: "Role Alignment",      color: "rgba(249,115,22,0.85)",  bg: "rgba(249,115,22,0.07)" },
};

function gradeFromScore(score: number) {
  if (score >= 9) return { grade: "A+", label: "Excellent" };
  if (score >= 8) return { grade: "A", label: "Strong" };
  if (score >= 7) return { grade: "B", label: "Good" };
  if (score >= 6) return { grade: "C", label: "Needs polish" };
  return { grade: "D", label: "Needs work" };
}

function scoreToBarPctFromOverall100(score: number | null | undefined) {
  const n = asOverall100(score);
  if (n === null) return 0;
  return Math.max(0, Math.min(100, n));
}

function scoreToBarPctFromTenPoint(score: number | null | undefined) {
  const n = asTenPoint(score);
  if (n === null) return 0;
  return Math.max(0, Math.min(100, n * 10));
}

// -------------------- UI components --------------------
function MetricBar({
  label,
  value,
  max,
  subtext,
}: {
  label: string;
  value: number;
  max: number;
  subtext?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: 0.2 }}>{label}</div>
        <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>
          {value}/{max}
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          height: 10,
          borderRadius: "var(--radius-sm)",
          background: "var(--card-border-soft)",
          overflow: "hidden",
          border: "1px solid var(--card-border-soft)",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "var(--radius-sm)",
            background: "linear-gradient(90deg, var(--accent-2), var(--accent))",
            boxShadow: "var(--shadow-glow)",
            transition: "width 250ms ease",
          }}
        />
      </div>

      {subtext ? (
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>{subtext}</div>
      ) : null}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <PremiumCard>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: -0.2,
          }}
        >
          {title}
        </div>
        <div style={{ marginTop: 10 }}>{children}</div>
      </PremiumCard>
    </div>
  );
}

function DimensionBar({ label, score, isGap, isStrength }: { label: string; score: number; isGap: boolean; isStrength: boolean }) {
  const pct = Math.max(0, Math.min(100, score * 10));
  const color = isStrength ? "#10B981" : isGap ? "#EF4444" : "var(--accent)";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: isGap ? "#EF4444" : isStrength ? "#10B981" : "var(--text-muted)", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: isGap ? "#EF4444" : isStrength ? "#10B981" : "var(--text-primary)" }}>{score.toFixed(1)}</span>
      </div>
      <div style={{ height: 5, borderRadius: "var(--radius-sm)", background: "var(--card-border-soft)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: "var(--radius-sm)", background: color, transition: "width 400ms ease" }} />
      </div>
    </div>
  );
}

function StarChip({
  letter,
  label,
  status,
}: {
  letter: string;
  label: string;
  status: "detected" | "missing";
}) {
  const isMissing = status === "missing";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 14,
        border: isMissing
          ? "1px solid rgba(248,113,113,0.22)"
          : "1px solid rgba(34,197,94,0.18)",
        background: isMissing ? "rgba(248,113,113,0.08)" : "rgba(34,197,94,0.10)",
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "var(--radius-md)",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
          color: "var(--text-primary)",
          background: "var(--card-border)",
          border: "1px solid var(--card-border)",
        }}
      >
        {letter}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 13 }}>{label}</div>
        <div
          style={{
            color: isMissing ? "rgba(248,113,113,0.95)" : "rgba(34,197,94,0.95)",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {isMissing ? "Missing" : "Detected"}
        </div>
      </div>
    </div>
  );
}

// -------------------- STAR evidence extraction (heuristic) --------------------
function splitSentences(text: string) {
  const cleaned = (text || "").trim().replace(/\s+/g, " ");
  if (!cleaned) return [];
  return cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function findSentenceIndex(
  sentences: string[],
  tests: Array<(s: string) => boolean>,
  fallbackIndex: number
) {
  for (const test of tests) {
    const idx = sentences.findIndex((s) => test(s));
    if (idx >= 0) return idx;
  }
  return Math.max(0, Math.min(fallbackIndex, Math.max(0, sentences.length - 1)));
}

function sentenceIndexToTime(idx: number, total: number, durationSec: number) {
  if (total <= 1) return Math.max(0, durationSec * 0.18);
  const pct = idx / Math.max(1, total - 1);
  return Math.max(0, Math.min(durationSec, pct * durationSec));
}

function buildSpeechMoments(transcript: string, durationSec: number): TimelineMarker[] {
  const sentences = splitSentences(transcript);
  if (!sentences.length || !durationSec || durationSec <= 0) return [];

  const openingIdx = 0;

  const contextIdx = findSentenceIndex(
    sentences,
    [
      (s) => /\bin my previous role\b|\bwhen\b|\bwe were\b|\bthere was\b|\bchallenge\b|\bproblem\b|\bbackground\b/i.test(s),
      (s) => /\btask\b|\bgoal\b|\bobjective\b|\basked to\b/i.test(s),
    ],
    Math.max(1, Math.floor(sentences.length * 0.22))
  );

  const actionIdx = findSentenceIndex(
    sentences,
    [
      (s) =>
        /\bi (built|created|designed|drove|implemented|led|ran|set up|worked|partnered|coordinated|analyz|audit)\b/i.test(
          s
        ),
      (s) => /\bthen i\b|\bi started\b|\bi focused\b|\bi decided\b/i.test(s),
    ],
    Math.max(contextIdx + 1, Math.floor(sentences.length * 0.55))
  );

  const resultIdx = findSentenceIndex(
    sentences,
    [
      (s) => /\bas a result\b|\boutcome\b|\bimpact\b|\btherefore\b/i.test(s),
      (s) => /\b(reduced|improved|increased|decreased|saved|delivered|grew)\b/i.test(s),
      (s) => /\b\d+\s?%\b|\$\s?\d+|\bweeks?\b|\bmonths?\b/i.test(s),
    ],
    Math.max(actionIdx + 1, Math.floor(sentences.length * 0.82))
  );

  const raw: TimelineMarker[] = [
    { label: "Opening", t: sentenceIndexToTime(openingIdx, sentences.length, durationSec) },
    { label: "Context", t: sentenceIndexToTime(contextIdx, sentences.length, durationSec) },
    { label: "Action", t: sentenceIndexToTime(actionIdx, sentences.length, durationSec) },
    { label: "Result", t: sentenceIndexToTime(resultIdx, sentences.length, durationSec) },
  ];

  const deduped: TimelineMarker[] = [];
  for (const marker of raw) {
    const rounded = Math.round(marker.t * 10) / 10;
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(prev.t - rounded) < 0.75) continue;
    deduped.push({ ...marker, t: rounded });
  }

  return deduped;
}

// -------------------- Speaking timeline --------------------
// -------------------- Speaking timeline --------------------
function SpeakingTimeline({
  series,
  markers = [],
  height = 110,
}: {
  series: { t: number[]; energy: number[]; pitch: number[] };
  markers?: TimelineMarker[];
  height?: number;
}) {
  const w = 760;
  const h = height;

  const t = series.t ?? [];
  const energy = series.energy ?? [];
  const pitch = series.pitch ?? [];

  const n = Math.min(t.length, energy.length, pitch.length);
  if (n < 2) return null;

  const e = energy.slice(0, n);
  const p = pitch.slice(0, n);

  const eMax = Math.max(...e, 1e-8);
  const pNonZero = p.filter((x) => x > 0);
  const pMin = pNonZero.length ? Math.min(...pNonZero) : 0;
  const pMax = pNonZero.length ? Math.max(...pNonZero) : 1;

  const xFor = (i: number) => (i / (n - 1)) * w;

  const eY = (val: number) => {
    const norm = Math.min(Math.max(val / eMax, 0), 1);
    return h - norm * h;
  };

  const pY = (val: number) => {
    if (!pNonZero.length || val <= 0) return h;
    const denom = Math.max(pMax - pMin, 1e-6);
    const norm = Math.min(Math.max((val - pMin) / denom, 0), 1);
    return h - norm * h;
  };

  const energyPath = e.map((v, i) => `${xFor(i).toFixed(2)},${eY(v).toFixed(2)}`).join(" ");
  const pitchPath = p.map((v, i) => `${xFor(i).toFixed(2)},${pY(v).toFixed(2)}`).join(" ");

  const duration = t[n - 1] ?? 0;

  const positionedMarkers =
    duration > 0
      ? markers
          .filter((m) => Number.isFinite(m.t) && m.t >= 0 && m.t <= duration)
          .map((m) => ({
            ...m,
            leftPct: Math.max(0, Math.min(100, (m.t / duration) * 100)),
          }))
      : [];

return (
  <div
    style={{
      marginTop: 14,
      padding: 16,
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--card-border-soft)",
      background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
      boxShadow: "var(--shadow-card-soft)",
    }}
  >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>How your voice moved</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{duration ? `${duration.toFixed(1)}s` : ""}</div>
      </div>

    <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
  The white line shows energy. The colored line shows pitch. More healthy variation usually sounds more engaging.
</div>  

            <div style={{ marginTop: 10 }}>
        {positionedMarkers.length ? (
          <div
  style={{
    position: "relative",
    height: 42,
    marginBottom: 10,
  }}
>
            {positionedMarkers.map((marker) => (
              <div
                key={`${marker.label}-${marker.t}`}
                style={{
                  position: "absolute",
                  left: `${marker.leftPct}%`,
                  top: 0,
                  transform: "translateX(-50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    padding: "3px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--card-border)",
                    background: "var(--card-bg-strong)",
                    color: "var(--text-primary)",
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    boxShadow: "var(--shadow-card-soft)",
                  }}
                >
                  {marker.label}
                </div>
                <div
                  style={{
                    width: 1,
                    height: 10,
                    background: "var(--card-border)",
                    opacity: 0.9,
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}

        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: "block" }}>
          <polyline points={energyPath} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
          <polyline points={pitchPath} fill="none" stroke="var(--accent-2)" strokeWidth="2" />
        </svg>

       <div
  style={{
    marginTop: 10,
    display: "flex",
    gap: 18,
    flexWrap: "wrap",
    fontSize: 12,
    color: "var(--text-muted)",
    alignItems: "center",
  }}
>
          <div>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 2,
                background: "rgba(255,255,255,0.55)",
                marginRight: 6,
              }}
            />
            Energy
          </div>
          <div>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 2,
                background: "var(--accent-2)",
                marginRight: 6,
              }}
            />
            Pitch
          </div>
        </div>
      </div>
    </div>
  );
}



function mean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sliceThirds<T>(arr: T[]) {
  const n = arr.length;
  if (n < 3) return { first: arr, last: arr };
  const k = Math.max(1, Math.floor(n / 3));
  return { first: arr.slice(0, k), last: arr.slice(n - k) };
}


const numOrNull = (v: any): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// -------------------- Main page --------------------
export default function ResultsPage() {
const router = useRouter();
const isMobile = useIsMobile();
const [stored, setStored] = useState<StoredResult | null>(null);
const [loadState, setLoadState] = useState<"hydrating" | "ready">("hydrating");
const { data: session, status } = useSession();

const [percentile, setPercentile] = useState<number | null>(null);
const [percentileSampleSize, setPercentileSampleSize] = useState<number | null>(null);

const [replayUrl, setReplayUrl] = useState<string | null>(null);
  const LAST_RESULT_KEY = userScopedKey("ipc_last_result", session);
  const SELECTED_KEY = userScopedKey("ipc_selected_attempt", session);

useEffect(() => {
  if (status === "loading") return;

  setLoadState("hydrating");

  try {
    const fromPractice = sessionStorage.getItem("ipc_from_practice") === "1";

    if (fromPractice) {
      sessionStorage.removeItem("ipc_from_practice");

      const practiceRaw =
        sessionStorage.getItem(LAST_RESULT_KEY) ||
        localStorage.getItem(LAST_RESULT_KEY);

      if (practiceRaw) {
        setStored(JSON.parse(practiceRaw));
        setLoadState("ready");
        return;
      }
    }

    const selectedRaw =
      sessionStorage.getItem(SELECTED_KEY) ||
      localStorage.getItem(SELECTED_KEY);

    if (selectedRaw) {
      setStored(JSON.parse(selectedRaw));
      setLoadState("ready");
      return;
    }

    const raw =
      sessionStorage.getItem(LAST_RESULT_KEY) ||
      localStorage.getItem(LAST_RESULT_KEY);

    if (raw) setStored(JSON.parse(raw));
    else setStored(null);
  } catch {
    setStored(null);
  } finally {
    setLoadState("ready");
  }
}, [status, SELECTED_KEY, LAST_RESULT_KEY]);

useEffect(() => {
  const score =
    typeof stored?.score === "number"
      ? stored.score
      : typeof feedback?.score === "number"
      ? feedback.score
      : null;

  if (score === null) {
    setPercentile(null);
    setPercentileSampleSize(null);
    return;
  }

  let cancelled = false;

  (async () => {
    try {
      const res = await fetch(
        `/api/percentile?score=${encodeURIComponent(String(score))}`,
        { cache: "no-store" }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || !data) return;

      if (!cancelled) {
        setPercentile(
          typeof data.percentile === "number" ? data.percentile : null
        );
        setPercentileSampleSize(
          typeof data.totalSamples === "number" ? data.totalSamples : null
        );
      }
    } catch {
      // ignore
    }
  })();

  return () => {
    cancelled = true;
  };
}, [stored]);

const feedback = stored?.feedback ?? null;
const overallScore100 = useMemo(() => {
  const raw =
    typeof stored?.score === "number"
      ? stored.score
      : typeof feedback?.score === "number"
      ? feedback.score
      : null;

  return asOverall100(raw);
}, [stored?.score, feedback?.score]);

const overallScoreTen = useMemo(() => {
  const raw =
    typeof stored?.score === "number"
      ? stored.score
      : typeof feedback?.score === "number"
      ? feedback.score
      : null;

  return asTenPoint(raw);
}, [stored?.score, feedback?.score]);

const communicationScoreTen = useMemo(() => {
  return asTenPoint(
    typeof feedback?.communication_score === "number"
      ? feedback.communication_score
      : null
  );
}, [feedback]);

const confidenceScoreTen = useMemo(() => {
  return asTenPoint(
    typeof feedback?.confidence_score === "number"
      ? feedback.confidence_score
      : null
  );
}, [feedback]);

const topStrengths = useMemo(() => {
  return Array.isArray(feedback?.strengths)
    ? feedback.strengths.slice(0, 4).map(String)
    : [];
}, [feedback]);

const topImprovements = useMemo(() => {
  return Array.isArray(feedback?.improvements)
    ? feedback.improvements.slice(0, 4).map(String)
    : [];
}, [feedback]);

const missedOpportunities = useMemo(() => {
  return Array.isArray(feedback?.missed_opportunities)
    ? feedback.missed_opportunities.slice(0, 3)
    : [];
}, [feedback]);

const strengthThemeKeys = useMemo(() => {
  return Array.isArray(feedback?.strength_theme_keys)
    ? feedback.strength_theme_keys.slice(0, 3).map(String)
    : [];
}, [feedback]);

const improvementThemeKeys = useMemo(() => {
  return Array.isArray(feedback?.improvement_theme_keys)
    ? feedback.improvement_theme_keys.slice(0, 3).map(String)
    : [];
}, [feedback]);

const percentileText =
  typeof percentile === "number"
    ? `Better than ${Math.max(0, Math.min(99, Math.round(percentile * 100)))}% of users`
    : null;

const resolvedFramework =
  stored?.evaluationFramework === "star" ||
  stored?.evaluationFramework === "technical_explanation" ||
  stored?.evaluationFramework === "experience_depth"
    ? stored.evaluationFramework
    : feedback?.star
    ? "star"
    : feedback?.technical_explanation
    ? "technical_explanation"
    : feedback?.experience_depth
    ? "experience_depth"
    : "star";

const isStarFramework = resolvedFramework === "star";
const isTechnicalFramework = resolvedFramework === "technical_explanation";
const isExperienceFramework = resolvedFramework === "experience_depth";

const starAvg = useMemo(() => {
  if (!feedback?.star) return null;
  return avgTenPoint([
    asTenPoint(feedback.star.situation),
    asTenPoint(feedback.star.task),
    asTenPoint(feedback.star.action),
    asTenPoint(feedback.star.result),
  ]);
}, [feedback]);

  const dm =
    (stored as any)?.deliveryMetrics ??
    (stored as any)?.feedback?.deliveryMetrics ??
    (feedback as any)?.deliveryMetrics ??
    null;

  const acoustics: Prosody | null =
    ((dm as any)?.acoustics as Prosody | undefined) ?? ((stored as any)?.prosody as Prosody | undefined) ?? null;

  const scoreFromStd = (std: number | null, cap: number) => (std === null ? null : clamp((std / cap) * 10, 0, 10));

  const seriesNorm: ProsodySeries | null = (() => {
    const s = (acoustics as any)?.series?.t ? (acoustics as any).series : (acoustics as any)?.series?.series;
    if (!s) return null;

    const t = Array.isArray(s.t) ? s.t.map(Number) : [];
    const energy = Array.isArray(s.energy) ? s.energy.map(Number) : [];
    const pitch = Array.isArray(s.pitch) ? s.pitch.map(Number) : [];

    const n = Math.min(t.length, energy.length, pitch.length);
    if (n < 2) return null;

    return { t: t.slice(0, n), energy: energy.slice(0, n), pitch: pitch.slice(0, n) };
  })();

  const energyStd = numOrNull((acoustics as any)?.energyStd);
  const pitchStdHz = numOrNull((acoustics as any)?.pitchStd) ?? numOrNull((acoustics as any)?.pitchStdHz);

  const acousticsNorm = acoustics
    ? {
        monotoneScore: numOrNull((acoustics as any).monotoneScore),
        pitchMean: numOrNull((acoustics as any).pitchMean),
        pitchStd: pitchStdHz,
        pitchRange: numOrNull((acoustics as any).pitchRange),
        energyMean: numOrNull((acoustics as any).energyMean),
        energyStd,
        energyVariation: numOrNull((acoustics as any).energyVariation) ?? scoreFromStd(energyStd, 0.12),
        tempo: numOrNull((acoustics as any).tempo),
        tempoDynamics: numOrNull((acoustics as any).tempoDynamics),
        series: seriesNorm,
      }
    : null;

  const series = acousticsNorm?.series ?? null;

  const hasNum = (v: any): v is number => typeof v === "number" && Number.isFinite(v);

  useEffect(() => {
    let cancelled = false;
    let urlToRevoke: string | null = null;

    async function load() {
      try {
        setReplayUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });

        if (!stored?.audioId) return;

        const blob = await idbGetAudio(stored.audioId);
        if (!blob || cancelled) return;

        const url = URL.createObjectURL(blob);
        urlToRevoke = url;
        setReplayUrl(url);
      } catch {}
    }

    load();

    return () => {
      cancelled = true;
      if (urlToRevoke) {
        try {
          URL.revokeObjectURL(urlToRevoke);
        } catch {}
      }
    };
  }, [stored?.audioId]);

  const deliverySummary = useMemo(() => {
    const fillersPer100 = typeof feedback?.filler?.per100 === "number" ? feedback.filler.per100 : null;

    const pauseCount = typeof dm?.pauseCount === "number" ? dm.pauseCount : null;
    const longPauseCount = typeof dm?.longPauseCount === "number" ? dm.longPauseCount : null;
    const avgPauseMs = typeof dm?.avgPauseMs === "number" ? dm.avgPauseMs : null;

    const durationSec =
      typeof series?.t?.[series.t.length - 1] === "number" && Number.isFinite(series.t[series.t.length - 1])
        ? Number(series.t[series.t.length - 1])
        : typeof (acoustics as any)?.durationSec === "number"
        ? Number((acoustics as any).durationSec)
        : null;

const pauseDensity =
  durationSec && pauseCount !== null && durationSec > 0
    ? pauseCount / durationSec
    : null;

const longPauseRatio =
  pauseCount && longPauseCount !== null && pauseCount > 0
    ? longPauseCount / pauseCount
    : null;

const longPausesPerMin =
  durationSec && longPauseCount !== null && durationSec > 0
    ? (longPauseCount / durationSec) * 60
    : null;

    let energyDrift: number | null = null;
    let pitchTrend: number | null = null;

    if (series?.energy?.length && series?.pitch?.length) {
      const n = Math.min(series.energy.length, series.pitch.length);
      const e = series.energy.slice(0, n).map(Number).filter((x) => Number.isFinite(x));
      const p = series.pitch.slice(0, n).map(Number).filter((x) => Number.isFinite(x));

      if (e.length >= 6) {
        const thirdsE = sliceThirds(e);
        const startE = mean(thirdsE.first);
        const endE = mean(thirdsE.last);
        energyDrift = endE - startE;
      }

      if (p.length >= 6) {
        const thirdsP = sliceThirds(p);
        const startP = mean(thirdsP.first.filter((x) => x > 0));
        const endP = mean(thirdsP.last.filter((x) => x > 0));
        if (Number.isFinite(startP) && Number.isFinite(endP) && (startP > 0 || endP > 0)) {
          pitchTrend = endP - startP;
        }
      }
    }

    const monotone = typeof acousticsNorm?.monotoneScore === "number" ? acousticsNorm.monotoneScore : null;
    const energyVar = typeof acousticsNorm?.energyVariation === "number" ? acousticsNorm.energyVariation : null;
    const tempo = typeof acousticsNorm?.tempo === "number" ? acousticsNorm.tempo : null;
    const tempoDyn = typeof acousticsNorm?.tempoDynamics === "number" ? acousticsNorm.tempoDynamics : null;
    const pitchStd = typeof acousticsNorm?.pitchStd === "number" ? acousticsNorm.pitchStd : null;
    const pitchRange = typeof acousticsNorm?.pitchRange === "number" ? acousticsNorm.pitchRange : null;

    const pitchVarScore = pitchStd === null ? null : Math.max(0, Math.min(10, (pitchStd / 30) * 10));
    const pitchRangeScore = pitchRange === null ? null : Math.max(0, Math.min(10, (pitchRange / 180) * 10));

    const tempoScore =
      tempo === null
        ? null
        : (() => {
            const idealLo = 90;
            const idealHi = 140;
            if (tempo >= idealLo && tempo <= idealHi) return 9.0;
            const dist = tempo < idealLo ? idealLo - tempo : tempo - idealHi;
            return Math.max(2, 9 - dist / 8);
          })();

    const rhythmScore = (() => {
      const parts: number[] = [];

      if (pauseDensity !== null) {
        const target = 0.12;
        const d = Math.abs(pauseDensity - target);
        const s = Math.max(0, 10 - d * 60);
        parts.push(s);
      }

      if (longPauseRatio !== null) {
        const s = Math.max(0, 10 - longPauseRatio * 16);
        parts.push(s);
      }

      if (avgPauseMs !== null) {
        const over = Math.max(0, avgPauseMs - 900);
        const s = Math.max(0, 10 - over / 120);
        parts.push(s);
      }

      if (tempoDyn !== null) {
        const s = tempoDyn <= 7 ? 8.5 : Math.max(3, 8.5 - (tempoDyn - 7) * 1.5);
        parts.push(s);
      }

      if (!parts.length) return null;
      return parts.reduce((a, b) => a + b, 0) / parts.length;
    })();

    const vocalPresenceScore = (() => {
      const parts: number[] = [];
      if (monotone !== null) parts.push(10 - Math.max(0, Math.min(10, monotone)));
      if (energyVar !== null) parts.push(Math.max(0, Math.min(10, energyVar)));
      if (pitchVarScore !== null) parts.push(pitchVarScore);
      if (pitchRangeScore !== null) parts.push(pitchRangeScore);
      if (!parts.length) return null;
      return parts.reduce((a, b) => a + b, 0) / parts.length;
    })();

    const clarityScore = (() => {
      const parts: number[] = [];
      if (fillersPer100 !== null) {
        const s = Math.max(0, 10 - fillersPer100 * 1.6);
        parts.push(s);
      }
      if (pauseDensity !== null) {
        const s = Math.max(0, 10 - Math.max(0, pauseDensity - 0.18) * 60);
        parts.push(s);
      }
      if (longPauseRatio !== null) {
        const s = Math.max(0, 10 - longPauseRatio * 18);
        parts.push(s);
      }
      if (!parts.length) return null;
      return parts.reduce((a, b) => a + b, 0) / parts.length;
    })();

    const engagementScore = (() => {
      const parts: number[] = [];
      if (vocalPresenceScore !== null) parts.push(vocalPresenceScore * 0.45);
      if (rhythmScore !== null) parts.push(rhythmScore * 0.30);
      if (tempoScore !== null) parts.push(tempoScore * 0.15);

      if (energyDrift !== null) {
        const driftScore = energyDrift >= 0 ? 8.5 : Math.max(2, 8.5 + energyDrift * 120);
        parts.push(driftScore * 0.10);
      }

      if (!parts.length) return null;
      const sum = parts.reduce((a, b) => a + b, 0);
      return Math.max(0, Math.min(10, sum));
    })();

    const pitchTrendLabel =
      pitchTrend === null ? null : pitchTrend > 12 ? "Rising (can sound unsure)" : pitchTrend < -12 ? "Falling (often confident)" : "Stable (steady)";

    const energyDriftLabel =
      energyDrift === null ? null : energyDrift > 0.01 ? "Building energy" : energyDrift < -0.01 ? "Energy dropping" : "Stable energy";

    return {
  fillersPer100,
  pauseCount,
  longPauseCount,
  longPausesPerMin,
  avgPauseMs,
  durationSec,
  pauseDensity,
  longPauseRatio,
  energyDrift,
  pitchTrend,
  pitchTrendLabel,
  energyDriftLabel,
  tempo,
  tempoDyn,
  engagementScore,
  vocalPresenceScore,
  rhythmScore,
  clarityScore,
};
  }, [feedback, dm, acousticsNorm, series, acoustics]);

  const speechMoments = useMemo(() => {
    const duration =
      series?.t?.length && typeof series.t[series.t.length - 1] === "number"
        ? series.t[series.t.length - 1]
        : null;

    if (!duration || !stored?.transcript) return [];
    return buildSpeechMoments(stored.transcript, duration);
  }, [stored?.transcript, series]);

  const starMissingList = useMemo(() => {
    const raw = Array.isArray(feedback?.star_missing) ? (feedback.star_missing as any[]) : [];
    return raw.map((s) => String(s).toLowerCase());
  }, [feedback]);









  // Dimension scores from new engine
  const dimensionScores = (feedback as any)?.dimension_scores as Record<string, { label: string; score: number; coaching: string; isStrength: boolean; isGap: boolean; driverSignals: string[] }> | undefined;
  const ibmMetrics = (feedback as any)?.ibm_metrics;
  const archetypeColor = feedback?.delivery_archetype
    ? (ARCHETYPE_COLOR as any)[feedback.delivery_archetype] ?? "var(--accent)"
    : "var(--accent)";

  const DIM_ORDER = ["narrative_clarity", "evidence_quality", "ownership_agency", "vocal_engagement", "response_control", "cognitive_depth", "presence_confidence"];

  return (
    <PremiumShell title="Results" subtitle="Review performance and iterate.">
      <div style={{ marginTop: 16, maxWidth: 1100, margin: "16px auto 0" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => { try { sessionStorage.setItem("ipc_force_restore", "1"); } catch {} router.back(); }}
            style={{ padding: "8px 14px", cursor: "pointer", borderRadius: "var(--radius-sm)", border: "none", background: "var(--card-bg-strong)", color: "var(--text-primary)", fontWeight: 700, fontSize: 13 }}
          >
            ← Back
          </button>
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
            {stored?.ts ? `Saved ${new Date(stored.ts).toLocaleString()}` : ""}
          </div>
        </div>

        {/* ── Audio player ── */}
        {stored?.audioId && replayUrl ? (
          <div style={{ marginBottom: 14 }}>
            <audio controls preload="none" src={replayUrl} style={{ width: "100%", borderRadius: "var(--radius-sm)" }} />
          </div>
        ) : null}

        {/* ── Loading / empty state ── */}
        {loadState === "hydrating" ? (
          <SectionCard title="Loading results">
            <div style={{ display: "grid", gap: 10 }}>
              {[34, 56, 100].map(w => (
                <div key={w} style={{ height: 14, width: `${w}%`, borderRadius: "var(--radius-sm)", background: "var(--card-border-soft)" }} />
              ))}
            </div>
          </SectionCard>
        ) : !stored || !feedback ? (
          <SectionCard title="No results found">
            <div style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
              Go back, record an answer, then click <strong style={{ color: "var(--text-primary)" }}>Analyze My Answer</strong>.
            </div>
          </SectionCard>
        ) : (
          /* ── Two-column layout ── */
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 20, alignItems: "flex-start" }}>

            {/* ────────────────────────────────────────────────────────────
                LEFT STICKY SIDEBAR
            ──────────────────────────────────────────────────────────── */}
            <div style={{ width: isMobile ? "100%" : 272, flexShrink: 0, position: isMobile ? "static" : "sticky", top: 20 }}>
              <div style={{
                padding: 18,
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--card-border-soft)",
                background: "var(--card-bg)",
                display: "flex",
                flexDirection: "column" as const,
                gap: 18,
              }}>

                {/* Overall score */}
                <div style={{ textAlign: "center" as const }}>
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 80, height: 80,
                    borderRadius: "50%",
                    border: `3px solid ${overallScore100 !== null && overallScore100 >= 70 ? "#10B981" : overallScore100 !== null && overallScore100 >= 55 ? "#F59E0B" : "#EF4444"}`,
                    background: "var(--card-bg-strong)",
                  }}>
                    <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: "var(--text-primary)" }}>
                      {overallScore100 !== null ? Math.round(overallScore100) : "—"}
                    </span>
                  </div>
                  {percentileText && (
                    <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>{percentileText}</div>
                  )}
                  {stored?.inputMethod === "pasted" && (
                    <div style={{ marginTop: 4, fontSize: 10, color: "var(--text-muted)", letterSpacing: 0.4 }}>TEXT ONLY</div>
                  )}
                </div>

                {/* Archetype card */}
                {feedback.delivery_archetype && (
                  <div style={{
                    padding: "12px 14px",
                    borderRadius: "var(--radius-lg)",
                    border: `1px solid ${archetypeColor}33`,
                    background: `${archetypeColor}0d`,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: archetypeColor, marginBottom: 4, textTransform: "uppercase" as const }}>
                      Delivery Pattern
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                      {feedback.delivery_archetype}
                    </div>
                    {(feedback as any).archetype_tagline && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                        {(feedback as any).archetype_tagline}
                      </div>
                    )}
                  </div>
                )}

                {/* Secondary archetype */}
                {(feedback as any).secondary_archetype && (
                  <div style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--card-border-soft)",
                    background: "var(--card-bg-strong)",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-muted)", marginBottom: 3, textTransform: "uppercase" as const }}>
                      Also shows
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                      {(feedback as any).secondary_archetype}
                    </div>
                  </div>
                )}

                {/* Dimension bars */}
                {dimensionScores && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 10 }}>
                      7 Dimensions
                    </div>
                    {DIM_ORDER.map(k => {
                      const d = dimensionScores[k];
                      if (!d || typeof d !== "object" || typeof d.score !== "number") return null;
                      return <DimensionBar key={k} label={d.label} score={d.score} isGap={d.isGap} isStrength={d.isStrength} />;
                    })}
                  </div>
                )}

                {/* Top coaching action */}
                {feedback.archetype_coaching && (
                  <div style={{
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${archetypeColor}22`,
                    background: `${archetypeColor}08`,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: archetypeColor, marginBottom: 4, textTransform: "uppercase" as const }}>
                      #1 Action
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.6 }}>
                      {feedback.archetype_coaching}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* ────────────────────────────────────────────────────────────
                RIGHT SCROLLING CONTENT
            ──────────────────────────────────────────────────────────── */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" as const, gap: 14 }}>

              {/* Question */}
              {stored?.question && (
                <PremiumCard>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 8 }}>
                    Question
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-primary)" }}>
                    {stored.question}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                    {stored.questionCategory && (
                      <span style={{ padding: "3px 9px", borderRadius: "var(--radius-sm)", border: "1px solid var(--card-border)", background: "var(--card-bg-strong)", color: "var(--text-primary)", fontSize: 11, fontWeight: 600, textTransform: "capitalize" as const }}>
                        {stored.questionCategory.replace(/_/g, " ")}
                      </span>
                    )}
                    {stored.evaluationFramework && (
                      <span style={{ padding: "3px 9px", borderRadius: "var(--radius-sm)", border: "1px solid var(--card-border)", background: "var(--card-bg-strong)", color: "var(--text-muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const }}>
                        {stored.evaluationFramework.replace(/_/g, " ")}
                      </span>
                    )}
                    {(ibmMetrics as any)?.questionIntent && (
                      <span style={{ padding: "3px 9px", borderRadius: "var(--radius-sm)", border: "1px solid var(--card-border)", background: "var(--card-bg-strong)", color: "var(--text-muted)", fontSize: 11, fontWeight: 500 }}>
                        {String((ibmMetrics as any).questionIntent)}
                      </span>
                    )}
                  </div>
                </PremiumCard>
              )}

              {/* Score + quick stats */}
              <PremiumCard>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.5, marginBottom: 4, textTransform: "uppercase" as const }}>Overall</div>
                    <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, color: "var(--text-primary)", lineHeight: 1 }}>
                      {overallScore100 !== null ? Math.round(overallScore100) : "—"}
                      <span style={{ fontSize: 16, fontWeight: 500, color: "var(--text-muted)", marginLeft: 2 }}>/100</span>
                    </div>
                    {typeof feedback.trajectory_note === "string" && (
                      <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{feedback.trajectory_note}</div>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, auto)", gap: "6px 16px" }}>
                    {[
                      { label: "Communication", val: communicationScoreTen !== null ? `${Math.round(communicationScoreTen * 10)}/100` : "—" },
                      { label: "Confidence",     val: confidenceScoreTen !== null    ? `${Math.round(confidenceScoreTen * 10)}/100`    : "—" },
                      { label: "WPM",             val: stored?.wpm != null ? `${Math.round(stored.wpm)} wpm` : "—" },
                      { label: "Fillers",         val: typeof feedback?.filler?.per100 === "number" ? `${feedback.filler.per100.toFixed(1)}/100w` : "—" },
                      { label: "Words",           val: typeof deliverySummary?.fillersPer100 === "number" ? "—" : "—" },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, letterSpacing: 0.4 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {typeof feedback.milestone_note === "string" && (
                  <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)", fontSize: 12, color: "var(--text-muted)" }}>
                    {feedback.milestone_note}
                  </div>
                )}
              </PremiumCard>

              {/* Archetype deep-dive */}
              {feedback.delivery_archetype && (
                <PremiumCard>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: archetypeColor, flexShrink: 0 }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{feedback.delivery_archetype}</div>
                    {(feedback as any).archetype_effort && (feedback as any).archetype_impact && (
                      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                        <span style={{ padding: "2px 8px", borderRadius: "var(--radius-sm)", fontSize: 10, fontWeight: 700, background: "var(--card-bg-strong)", color: "var(--text-muted)", border: "1px solid var(--card-border)" }}>
                          Effort: {(feedback as any).archetype_effort}
                        </span>
                        <span style={{ padding: "2px 8px", borderRadius: "var(--radius-sm)", fontSize: 10, fontWeight: 700, background: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
                          Impact: {(feedback as any).archetype_impact}
                        </span>
                      </div>
                    )}
                  </div>

                  {(feedback as any).archetype_what_interviewers_hear && (
                    <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--card-bg-strong)", border: "1px solid var(--card-border-soft)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase" as const }}>What interviewers hear</div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>{(feedback as any).archetype_what_interviewers_hear}</div>
                    </div>
                  )}

                  {typeof feedback.archetype_description === "string" && (
                    <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 10 }}>{feedback.archetype_description}</div>
                  )}

                  {/* Dimension drivers beneath archetype */}
                  {dimensionScores && Array.isArray((feedback as any)?.archetype_signals) && (
                    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                      {((feedback as any).archetype_signals as string[]).map((k: string) => {
                        const d = dimensionScores[k];
                        if (!d || typeof d !== "object" || typeof d.score !== "number") return null;
                        return (
                          <span key={k} style={{
                            padding: "3px 10px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: 11,
                            fontWeight: 600,
                            background: d.isGap ? "rgba(239,68,68,0.08)" : d.isStrength ? "rgba(16,185,129,0.08)" : "var(--card-bg-strong)",
                            color: d.isGap ? "#EF4444" : d.isStrength ? "#10B981" : "var(--text-muted)",
                            border: `1px solid ${d.isGap ? "rgba(239,68,68,0.2)" : d.isStrength ? "rgba(16,185,129,0.2)" : "var(--card-border)"}`,
                          }}>
                            {d.label} {d.score.toFixed(1)}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Compound note */}
                  {typeof (feedback as any)?.compound_note === "string" && (
                    <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid rgba(249,115,22,0.25)", background: "rgba(249,115,22,0.06)", fontSize: 13, color: "var(--text-primary)", lineHeight: 1.65 }}>
                      <span style={{ fontWeight: 700, color: "rgba(249,115,22,0.9)", marginRight: 6 }}>Key insight:</span>
                      {(feedback as any).compound_note}
                    </div>
                  )}
                </PremiumCard>
              )}

              {/* Dimension coaching — gaps first */}
              {(() => {
                if (!dimensionScores) return null;
                const dimItems = DIM_ORDER
                  .map(k => { const d = dimensionScores[k]; return (d && typeof d === "object") ? { key: k, ...d } : null; })
                  .filter((d): d is NonNullable<typeof d> => !!d && typeof (d as any).score === "number" && !!(d as any).label);
                if (dimItems.length === 0) return null;
                return (
                <PremiumCard>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>Dimension Analysis</div>
                  {dimItems
                    .sort((a, b) => {
                      if (a.isGap && !b.isGap) return -1;
                      if (!a.isGap && b.isGap) return 1;
                      if (a.isStrength && !b.isStrength) return 1;
                      if (!a.isStrength && b.isStrength) return -1;
                      return a.score - b.score;
                    })
                    .map(d => (
                      <div key={d.key} style={{
                        marginBottom: 14,
                        paddingBottom: 14,
                        borderBottom: "1px solid var(--card-border-soft)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                              width: 6, height: 6, borderRadius: "50%",
                              background: d.isGap ? "#EF4444" : d.isStrength ? "#10B981" : "var(--text-muted)",
                              flexShrink: 0,
                            }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{d.label}</span>
                            {d.isGap && <span style={{ fontSize: 10, fontWeight: 700, color: "#EF4444", background: "rgba(239,68,68,0.08)", padding: "1px 6px", borderRadius: "var(--radius-sm)" }}>Gap</span>}
                            {d.isStrength && <span style={{ fontSize: 10, fontWeight: 700, color: "#10B981", background: "rgba(16,185,129,0.08)", padding: "1px 6px", borderRadius: "var(--radius-sm)" }}>Strength</span>}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: d.isGap ? "#EF4444" : d.isStrength ? "#10B981" : "var(--text-primary)" }}>
                            {d.score.toFixed(1)}/10
                          </span>
                        </div>
                        <div style={{ height: 4, borderRadius: "var(--radius-sm)", background: "var(--card-border-soft)", marginBottom: 8, overflow: "hidden" }}>
                          <div style={{
                            width: `${Math.max(0, Math.min(100, d.score * 10))}%`,
                            height: "100%",
                            borderRadius: "var(--radius-sm)",
                            background: d.isGap ? "#EF4444" : d.isStrength ? "#10B981" : "var(--accent)",
                            transition: "width 400ms ease",
                          }} />
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{d.coaching}</div>
                      </div>
                    ))
                  }
                </PremiumCard>
                );
              })()}

              {/* What's working + Focus area */}
              {(topStrengths.length > 0 || topImprovements.length > 0) && (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                  {topStrengths.length > 0 && (
                    <PremiumCard>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#10B981", marginBottom: 10 }}>What's working</div>
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                        {topStrengths.slice(0, 3).map((s: string, i: number) => (
                          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", borderRadius: "var(--radius-sm)", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(16,185,129,0.12)", color: "#10B981", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</div>
                            <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.6 }}>{s}</div>
                          </div>
                        ))}
                      </div>
                    </PremiumCard>
                  )}
                  {topImprovements.length > 0 && (
                    <PremiumCard>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 10 }}>Focus area</div>
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                        <div style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: 0.5, marginBottom: 4, textTransform: "uppercase" as const }}>Top priority</div>
                          <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.6 }}>{topImprovements[0]}</div>
                        </div>
                        {topImprovements.slice(1, 3).map((s: string, i: number) => (
                          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--card-border-soft)" }}>
                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-muted)", flexShrink: 0, marginTop: 5 }} />
                            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{s}</div>
                          </div>
                        ))}
                      </div>
                    </PremiumCard>
                  )}
                </div>
              )}

              {/* Missed opportunities */}
              {missedOpportunities.length > 0 && (
                <PremiumCard>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>Missed opportunities</div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                    {missedOpportunities.map((m: any, i: number) => (
                      <div key={i} style={{ padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", marginBottom: 4 }}>{m?.label ?? "Opportunity"}</div>
                        {m?.why && <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{String(m.why)}</div>}
                        {m?.add_sentence && (
                          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-primary)", lineHeight: 1.6 }}>
                            <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>Add this: </span>
                            <em>&ldquo;{String(m.add_sentence)}&rdquo;</em>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </PremiumCard>
              )}

              {/* STAR breakdown */}
              {isStarFramework && feedback.star && (
                <PremiumCard>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
                    STAR Breakdown {starAvg !== null ? <span style={{ fontWeight: 500, color: "var(--text-muted)", fontSize: 12 }}>(avg {displayTenPointAs100(starAvg)}/100)</span> : null}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: isMobile ? 6 : 10, marginBottom: 14 }}>
                    <StarChip letter="S" label="Situation" status={starMissingList.includes("situation") ? "missing" : "detected"} />
                    <StarChip letter="T" label="Task"      status={starMissingList.includes("task")      ? "missing" : "detected"} />
                    <StarChip letter="A" label="Action"    status={starMissingList.includes("action")    ? "missing" : "detected"} />
                    <StarChip letter="R" label="Result"    status={starMissingList.includes("result")    ? "missing" : "detected"} />
                  </div>
                  {(["situation", "task", "action", "result"] as const).map(section => {
                    const val = asTenPoint(feedback.star?.[section]);
                    if (val === null) return null;
                    const advice = (feedback as any)?.star_advice?.[section];
                    return (
                      <div key={section} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "capitalize" as const }}>{section}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{displayTenPointAs100(val)}/100</span>
                        </div>
                        <div style={{ height: 4, borderRadius: "var(--radius-sm)", background: "var(--card-border-soft)", overflow: "hidden" }}>
                          <div style={{ width: `${val * 10}%`, height: "100%", background: "linear-gradient(90deg, var(--accent-2), var(--accent))", transition: "width 300ms ease" }} />
                        </div>
                        {advice && <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{advice}</div>}
                      </div>
                    );
                  })}
                </PremiumCard>
              )}

              {/* Relevance */}
              {feedback?.relevance && (
                <PremiumCard>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Question Relevance</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" as const }}>
                    <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, color: "var(--text-primary)" }}>
                      {displayTenPointAs100(asTenPoint(feedback.relevance.relevance_score))}
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)", marginLeft: 2 }}>/100</span>
                    </div>
                    <span style={{ padding: "4px 10px", borderRadius: "var(--radius-sm)", fontSize: 11, fontWeight: 700, border: feedback.relevance.answered_question ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(248,113,113,0.3)", background: feedback.relevance.answered_question ? "rgba(16,185,129,0.1)" : "rgba(248,113,113,0.1)", color: feedback.relevance.answered_question ? "#10B981" : "#F87171" }}>
                      {feedback.relevance.answered_question ? "On question" : "Missed the ask"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10 }}>
                    {[
                      { label: "Directness",   value: feedback.relevance.directness_score },
                      { label: "Completeness", value: feedback.relevance.completeness_score },
                      { label: "On-topic",     value: feedback.relevance.off_topic_score },
                    ].map(m => (
                      <div key={m.label} style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--card-bg-strong)", border: "1px solid var(--card-border-soft)" }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{displayTenPointAs100(asTenPoint(m.value))}</div>
                      </div>
                    ))}
                  </div>
                </PremiumCard>
              )}

              {/* Delivery signals */}
              {(stored?.wpm != null || acousticsNorm?.monotoneScore != null || acousticsNorm?.energyVariation != null || (dm as any)?.face?.eyeContact != null) && (
                <PremiumCard>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Delivery Signals</div>
                  {series && speechMoments.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <SpeakingTimeline series={series} markers={speechMoments} />
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: isMobile ? 8 : 10 }}>
                    {stored?.wpm != null && (
                      <div style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--card-bg-strong)", border: "1px solid var(--card-border-soft)" }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 2 }}>Pace</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{Math.round(stored.wpm)} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)" }}>WPM</span></div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{paceContext(stored.wpm).label}</div>
                      </div>
                    )}
                    {acousticsNorm?.monotoneScore != null && (
                      <div style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--card-bg-strong)", border: "1px solid var(--card-border-soft)" }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 2 }}>Vocal Variety</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{monotoneContext(acousticsNorm.monotoneScore)}</div>
                      </div>
                    )}
                    {acousticsNorm?.energyVariation != null && (
                      <div style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--card-bg-strong)", border: "1px solid var(--card-border-soft)" }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 2 }}>Energy Variation</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{energyVarContext(acousticsNorm.energyVariation)}</div>
                      </div>
                    )}
                    {acousticsNorm?.pitchRange != null && (
                      <div style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--card-bg-strong)", border: "1px solid var(--card-border-soft)" }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 2 }}>Pitch Range</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{pitchRangeContext(acousticsNorm.pitchRange)}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{Math.round(acousticsNorm.pitchRange)} Hz</div>
                      </div>
                    )}
                  </div>
                  {(() => {
                    const insight = crossSignalInsight(acousticsNorm?.monotoneScore, acousticsNorm?.energyVariation, stored?.wpm, acousticsNorm?.pitchStd, (stored as any)?.faceMetrics?.eyeContact ?? (dm as any)?.face?.eyeContact ?? null);
                    if (!insight) return null;
                    return (
                      <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--card-bg-strong)", border: "1px solid var(--card-border-soft)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>
                        {insight}
                      </div>
                    );
                  })()}
                </PremiumCard>
              )}

              {/* Visual presence panel */}
              {(() => {
                const fm = (stored as any)?.faceMetrics ?? (dm as any)?.face ?? null;
                if (!fm || typeof fm.eyeContact !== "number") return null;
                type VRow = { label: string; raw: number | null; display: string; hint: string; goodHigh: boolean; max: number };
                const blinkOk = typeof fm.blinkRate === "number" && fm.blinkRate >= 10 && fm.blinkRate <= 25;
                const blinkBad = typeof fm.blinkRate === "number" && (fm.blinkRate > 30 || fm.blinkRate < 8);
                const rows: VRow[] = [
                  { label: "Eye Contact",      raw: fm.eyeContact     != null ? fm.eyeContact     * 100 : null, display: fm.eyeContact     != null ? `${Math.round(fm.eyeContact * 100)}%`     : "—", hint: fm.eyeContact >= 0.65 ? "Strong" : fm.eyeContact >= 0.35 ? "Moderate" : "Needs work",     goodHigh: true,  max: 100 },
                  { label: "Expressiveness",   raw: fm.expressiveness != null ? fm.expressiveness * 100 : null, display: fm.expressiveness != null ? `${Math.round(fm.expressiveness * 100)}%` : "—", hint: fm.expressiveness >= 0.5 ? "Engaging" : fm.expressiveness >= 0.2 ? "Moderate" : "Flat face",  goodHigh: true,  max: 100 },
                  { label: "Head Stability",   raw: fm.headStability  != null ? fm.headStability  * 100 : null, display: fm.headStability  != null ? `${Math.round(fm.headStability  * 100)}%` : "—", hint: fm.headStability >= 0.8 ? "Steady" : fm.headStability >= 0.5 ? "Some movement" : "Fidgeting",  goodHigh: true,  max: 100 },
                  { label: "Smile Rate",       raw: fm.smileRate      != null ? fm.smileRate      * 100 : null, display: fm.smileRate      != null ? `${Math.round(fm.smileRate      * 100)}%` : "—", hint: fm.smileRate > 0.25 ? "Warm affect" : fm.smileRate > 0.08 ? "Neutral" : "Flat affect",       goodHigh: true,  max: 100 },
                  { label: "Blink Rate",       raw: typeof fm.blinkRate === "number" ? Math.min(fm.blinkRate, 40) : null, display: typeof fm.blinkRate === "number" ? `${fm.blinkRate}/min` : "—", hint: blinkOk ? "Normal range" : blinkBad && fm.blinkRate > 30 ? "High — may signal nerves" : blinkBad ? "Low — forced" : "Moderate", goodHigh: false, max: 40 },
                  { label: "Brow Engagement",  raw: fm.browEngagement != null ? fm.browEngagement * 100 : null, display: fm.browEngagement != null ? `${Math.round(fm.browEngagement * 100)}%` : "—", hint: fm.browEngagement > 0.12 ? "Animated" : fm.browEngagement > 0.05 ? "Moderate" : "Frozen brows",  goodHigh: true,  max: 100 },
                  { label: "Look-Away Rate",   raw: fm.lookAwayRate   != null ? fm.lookAwayRate   * 100 : null, display: fm.lookAwayRate   != null ? `${Math.round(fm.lookAwayRate   * 100)}%` : "—", hint: fm.lookAwayRate <= 0.12 ? "Minimal" : fm.lookAwayRate <= 0.3 ? "Occasional" : "Frequent",      goodHigh: false, max: 100 },
                ];
                const visibleRows = rows.filter(row => row.raw !== null);
                if (visibleRows.length === 0) return (
                  <PremiumCard>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Visual Presence</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>Camera metrics unavailable for this session.</div>
                  </PremiumCard>
                );
                return (
                  <PremiumCard>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Visual Presence</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: isMobile ? 8 : 10 }}>
                      {visibleRows.map(row => {
                        const hasVal = row.raw !== null;
                        const isGood = hasVal && (row.goodHigh ? row.raw! >= (row.max * 0.55) : row.raw! <= (row.max * 0.4));
                        const isBad  = hasVal && (row.goodHigh ? row.raw! < (row.max * 0.3) : row.raw! > (row.max * 0.65));
                        const color  = !hasVal ? "var(--text-muted)" : isGood ? "#10B981" : isBad ? "#EF4444" : "#F59E0B";
                        const barPct = hasVal ? (row.goodHigh ? Math.min(100, row.raw!) : Math.max(0, 100 - row.raw!)) : 0;
                        return (
                          <div key={row.label} style={{ padding: 12, borderRadius: "var(--radius-md)", background: "var(--card-bg-strong)", border: "1px solid var(--card-border-soft)" }}>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>{row.label}</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color, marginBottom: 4 }}>{row.display}</div>
                            <div style={{ height: 3, borderRadius: 99, background: "var(--card-border)", overflow: "hidden", marginBottom: 4 }}>
                              <div style={{ height: "100%", width: `${barPct}%`, background: color, borderRadius: 99, transition: "width 0.5s" }} />
                            </div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{row.hint}</div>
                          </div>
                        );
                      })}
                    </div>
                  </PremiumCard>
                );
              })()}

              {/* IBM metrics panel */}
              {ibmMetrics && (
                <PremiumCard>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Language Analytics</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                    Lexical richness, cognitive complexity, and behavioral indicator signals — the same dimensions enterprise hiring tools measure.
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 10 }}>
                    {[
                      { label: "Lexical Richness",    value: ibmMetrics.lexicalRichnessScore,    hint: "Vocabulary diversity" },
                      { label: "Cognitive Depth",      value: ibmMetrics.cognitiveComplexityScore, hint: "Tradeoff & nuance markers" },
                      { label: "Behavioral Language",  value: ibmMetrics.behavioralIndicatorScore, hint: "I-led, I-drove phrases" },
                      { label: "Hedging Penalty",      value: ibmMetrics.hedgingPenaltyScore,      hint: "10 = no hedging" },
                      { label: "Fluency",              value: ibmMetrics.fragmentationScore,       hint: "Sentence completion" },
                      { label: "Length Fit",           value: ibmMetrics.answerLengthScore,        hint: "Ideal for question type" },
                    ].map(({ label, value, hint }) => {
                      const score = typeof value === "number" ? value : null;
                      const isLow = score !== null && score < 5.5;
                      const isHigh = score !== null && score >= 7.5;
                      return (
                        <div key={label} style={{ padding: 12, borderRadius: "var(--radius-md)", background: isLow ? "rgba(239,68,68,0.06)" : isHigh ? "rgba(16,185,129,0.06)" : "var(--card-bg-strong)", border: `1px solid ${isLow ? "rgba(239,68,68,0.2)" : isHigh ? "rgba(16,185,129,0.2)" : "var(--card-border-soft)"}` }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: isLow ? "#EF4444" : isHigh ? "#10B981" : "var(--text-primary)" }}>
                            {score !== null ? score.toFixed(1) : "—"}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{hint}</div>
                        </div>
                      );
                    })}
                  </div>
                </PremiumCard>
              )}

              {/* Better answer */}
              {typeof feedback.better_answer === "string" && feedback.better_answer.length > 20 && (
                <PremiumCard>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>Stronger version</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75, whiteSpace: "pre-wrap" as const }}>
                    {feedback.better_answer}
                  </div>
                </PremiumCard>
              )}

              {/* Transcript */}
              {stored?.transcript && (
                <PremiumCard>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>Transcript</div>
                  <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.75, whiteSpace: "pre-wrap" as const }}>
                    {stored.transcript}
                  </div>
                </PremiumCard>
              )}

            </div>{/* end right panel */}
          </div>
        )}

      </div>
    </PremiumShell>
  );
}
