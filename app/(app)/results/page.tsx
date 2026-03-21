"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import PremiumShell from "../../components/PremiumShell";
import PremiumCard from "../../components/PremiumCard";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";
import { computeDeliveryCoach } from "@/app/lib/deliveryCoach";
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
  pitchStd: number | null | undefined
): string | null {
  const m = typeof monotone === "number" ? monotone : null;
  const ev = typeof energyVar === "number" ? energyVar : null;
  const w = typeof wpm === "number" ? wpm : null;
  const ps = typeof pitchStd === "number" ? pitchStd : null;

  if (m === null && ev === null) return null;

  // High monotone + high energy = pitch flat but volume dynamic
  if (m !== null && m >= 7 && ev !== null && ev >= 6) {
    return "Your volume varies well, but pitch stays flat - interviewers hear energy without expressiveness. Adding pitch drops on key points will sharpen the impact significantly.";
  }
  // High monotone + low energy = fully flat
  if (m !== null && m >= 7 && ev !== null && ev < 4) {
    return "Both pitch and energy are flat. This reads as low stakes or low confidence regardless of content. Focus on varying the weight of your ending sentences first.";
  }
  // High monotone + high WPM = fast and flat
  if (m !== null && m >= 6 && w !== null && w > 160) {
    return "Speaking fast with flat delivery creates a particularly compressed impression - interviewers absorb less. Slow your pace on result statements to let important points land.";
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
          borderRadius: 999,
          background: "var(--card-border-soft)",
          overflow: "hidden",
          border: "1px solid var(--card-border-soft)",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
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

type ResultsTab = "overview" | "relevance" | "structure" | "delivery" | "coaching" | "transcript";

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 12px",
        borderRadius: "var(--radius-sm)",
        border: "none",
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-muted)",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
        boxShadow: "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
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
          borderRadius: 10,
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

function pickFirst(sentences: string[], tests: Array<(s: string) => boolean>) {
  for (const t of tests) {
    const hit = sentences.find((s) => t(s));
    if (hit) return hit.length > 180 ? hit.slice(0, 177) + "..." : hit;
  }
  return null;
}

function extractStarEvidence(transcript: string) {
  const sents = splitSentences(transcript);

  const situation = pickFirst(sents, [
    (s) => /\bin my previous role\b|\bat (a|an)\b|\bwhen\b|\bwe were\b|\bthere was\b/i.test(s),
    (s) => /\bcontext\b|\bbackground\b|\bproblem\b|\bchallenge\b/i.test(s),
  ]);

  const task = pickFirst(sents, [
    (s) => /\bmy task\b|\bi was responsible\b|\bi needed to\b|\bmy goal\b/i.test(s),
    (s) => /\bobjective\b|\bmission\b|\basked to\b/i.test(s),
  ]);

  const action = pickFirst(sents, [
    (s) =>
      /\bi (analyz|audit|built|created|designed|drove|implemented|led|ran|set up|worked|partnered|coordinated)\b/i.test(
        s
      ),
    (s) => /\bthen i\b|\bi started\b|\bi focused\b/i.test(s),
  ]);

  const result = pickFirst(sents, [
    (s) => /\bas a result\b|\bresult\b|\boutcome\b|\bimpact\b/i.test(s),
    (s) => /\b(reduced|improved|increased|decreased|saved|delivered)\b/i.test(s),
    (s) => /\b\d+\s?%\b|\$\s?\d+|\bweeks?\b|\bmonths?\b/i.test(s),
  ]);

  return { situation, task, action, result };
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
                    borderRadius: 999,
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
const [stored, setStored] = useState<StoredResult | null>(null);
const [loadState, setLoadState] = useState<"hydrating" | "ready">("hydrating");
const [activeTab, setActiveTab] = useState<ResultsTab>("overview");
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
        localStorage.getItem(LAST_RESULT_KEY) ||
        sessionStorage.getItem("ipc_last_result") ||
        localStorage.getItem("ipc_last_result");

      if (practiceRaw) {
        setStored(JSON.parse(practiceRaw));
        setLoadState("ready");
        return;
      }
    }

    const selectedRaw =
      sessionStorage.getItem(SELECTED_KEY) ||
      localStorage.getItem(SELECTED_KEY) ||
      sessionStorage.getItem("ipc_selected_attempt") ||
      localStorage.getItem("ipc_selected_attempt");

    if (selectedRaw) {
      setStored(JSON.parse(selectedRaw));
      setLoadState("ready");
      return;
    }

    const raw =
      sessionStorage.getItem(LAST_RESULT_KEY) ||
      localStorage.getItem(LAST_RESULT_KEY) ||
      sessionStorage.getItem("ipc_last_result") ||
      localStorage.getItem("ipc_last_result");

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

const communicationEvidence = useMemo(() => {
  return Array.isArray(feedback?.communication_evidence)
    ? feedback.communication_evidence.slice(0, 4).map(String)
    : [];
}, [feedback]);

const confidenceEvidence = useMemo(() => {
  return Array.isArray(feedback?.confidence_evidence)
    ? feedback.confidence_evidence.slice(0, 4).map(String)
    : [];
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

  const starEvidence = useMemo(() => extractStarEvidence(stored?.transcript ?? ""), [stored?.transcript]);

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

  const insightBullets = useMemo(() => {
    if (!stored || !feedback) return null;
    const lines: string[] = [];
    if (typeof feedback.strengths?.[0] === "string") lines.push(feedback.strengths[0]);
    if (typeof feedback.improvements?.[0] === "string") lines.push(feedback.improvements[0]);
    if (typeof feedback.trajectory_note === "string") lines.push(feedback.trajectory_note);
    else if (typeof feedback.confidence_explanation === "string" && lines.length < 2) lines.push(feedback.confidence_explanation);
    return lines.length > 0 ? lines : null;
  }, [stored, feedback]);


const deliveryProfile = useMemo(() => {
  return computeDeliveryCoach({
    wpm: stored?.wpm ?? null,
    fillersPer100: deliverySummary?.fillersPer100 ?? null,
    monotoneScore: acousticsNorm?.monotoneScore ?? null,
    energyVariation: acousticsNorm?.energyVariation ?? null,
    energyStd: acousticsNorm?.energyStd ?? null,
    pitchStd: acousticsNorm?.pitchStd ?? null,
    pitchRange: acousticsNorm?.pitchRange ?? null,
    longPauseRate: deliverySummary?.longPausesPerMin ?? null,
    inputMethod: stored?.inputMethod ?? undefined,
    jobDesc: stored?.jobDesc ?? undefined,
    question: stored?.question ?? undefined,
    framework: stored?.evaluationFramework ?? undefined,
    contentScore: feedback ? (asTenPoint(typeof feedback.score === "number" ? feedback.score : stored?.score ?? null) ?? null) : null,
    starMissing: Array.isArray(feedback?.star_missing) ? feedback.star_missing : [],
    hasStrongStructure: isStarFramework && typeof feedback?.star?.action === "number" && feedback.star.action >= 7,
  });
}, [stored, deliverySummary, acousticsNorm, feedback, isStarFramework]);




  return (
    <PremiumShell title="Results" subtitle="Review performance and iterate.">
     <div
  style={{
    marginTop: 24,
    padding: 18,
    borderRadius: "var(--radius-xl)",
    border: "1px solid var(--card-border-soft)",
    background: `
      radial-gradient(900px 400px at 20% -10%, var(--accent-2-soft), transparent 60%),
      var(--card-bg)
    `,
  }}
>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <button
  onClick={() => {
    try {
      sessionStorage.setItem("ipc_force_restore", "1");
    } catch {}
    router.back();
  }}
  style={{
    padding: "10px 14px",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "var(--card-bg-strong)",
    color: "var(--text-primary)",
    fontWeight: 700,
  }}
>
  ← Back
</button>

          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
  {stored?.ts ? `Saved ${new Date(stored.ts).toLocaleString()}` : ""}
</div>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <TabButton label="Overview" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
          <TabButton label="Relevance" active={activeTab === "relevance"} onClick={() => setActiveTab("relevance")} />
          <TabButton label="Structure" active={activeTab === "structure"} onClick={() => setActiveTab("structure")} />
          <TabButton label="Delivery" active={activeTab === "delivery"} onClick={() => setActiveTab("delivery")} />
          <TabButton label="Coaching" active={activeTab === "coaching"} onClick={() => setActiveTab("coaching")} />
          <TabButton label="Transcript" active={activeTab === "transcript"} onClick={() => setActiveTab("transcript")} />
        </div>

        {stored?.audioId ? (
          <div style={{ marginTop: 12 }}>
            {replayUrl ? (
              <audio controls preload="none" src={replayUrl} style={{ width: "100%" }} />
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading recording…</div>
            )}
          </div>
        ) : null}

        <div style={{ marginTop: 16 }}>
  <div
    style={{
      fontSize: 32,
      fontWeight: 700,
      letterSpacing: -0.5,
      color: "var(--text-primary)",
    }}
  >
    Results
  </div>
  <div style={{ marginTop: 6, color: "var(--text-muted)" }}>
    {stored?.ts ? `Saved ${new Date(stored.ts).toLocaleString()}` : "No saved result yet."}
  </div>
</div>

        {stored?.jobProfileTitle || stored?.jobProfileCompany || stored?.jobProfileRoleType ? (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                padding: 16,
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--accent-strong)",
                background: "var(--accent-soft)",
                boxShadow: "var(--shadow-card)",
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.8,
                  color: "var(--accent)",
                }}
              >
                Interview Context
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {stored.jobProfileTitle ?? "Target role"}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {stored.jobProfileCompany ? (
                      <span
                        style={{
                          padding: "4px 9px",
                          borderRadius: 999,
                          border: "1px solid var(--card-border)",
                          background: "var(--card-bg)",
                          color: "var(--text-primary)",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {stored.jobProfileCompany}
                      </span>
                    ) : null}

                    {stored.jobProfileRoleType ? (
                      <span
                        style={{
                          padding: "4px 9px",
                          borderRadius: 999,
                          border: "1px solid var(--card-border)",
                          background: "var(--card-bg)",
                          color: "var(--text-muted)",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {stored.jobProfileRoleType}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "var(--text-muted)",
                }}
              >
                This attempt is being evaluated in the context of your selected job profile, which will later power role-based trends, strengths, and benchmarking.
              </div>
            </div>
          </div>
        ) : null}

        {loadState === "hydrating" ? (
  <SectionCard title="Loading results">
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          height: 14,
          width: "34%",
          borderRadius: 999,
          background: "var(--card-border-soft)",
        }}
      />
      <div
        style={{
          height: 14,
          width: "56%",
          borderRadius: 999,
          background: "var(--card-border-soft)",
        }}
      />
      <div
        style={{
          height: 120,
          width: "100%",
          borderRadius: "var(--radius-md)",
          background: "var(--card-border-soft)",
        }}
      />
    </div>
  </SectionCard>
) : !stored || !feedback ? (
  <SectionCard title="No results found">
    <div style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
      Go back, record an answer, then click <strong style={{ color: "var(--text-primary)" }}>Analyze My Answer</strong>.
    </div>
  </SectionCard>
) : (
          <>
            {activeTab === "overview" ? (
              <SectionCard title="Performance Overview">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 14,
                    flexWrap: "wrap",
                  }}
                >
                  {insightBullets ? (
                    <ul style={{ marginTop: 16, marginBottom: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                      {insightBullets.map((t, i) => (
                        <li key={i} style={{ marginTop: i === 0 ? 0 : 6, color: "var(--text-muted)", fontSize: 13 }}>
                          {t}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <div
  style={{
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid var(--card-border)",
    background: "var(--card-bg-strong)",
    color: "var(--text-primary)",
    fontSize: 12,
    fontWeight: 500,
    display: "flex",
    gap: 8,
    alignItems: "center",
  }}
>
  <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Pace</span>
                      <span>{typeof stored?.wpm === "number" ? `${stored.wpm} wpm` : " - "}</span>
                      {typeof stored?.wpm === "number" ? (
                        <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>· {paceContext(stored.wpm).label}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {stored?.question ? (
  <div
    style={{
      marginTop: 16,
      marginBottom: 18,
      padding: 16,
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--card-border-soft)",
      background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
      boxShadow: "var(--shadow-card-soft)",
      minWidth: 0,
    }}
  >
    <div
      style={{
        fontSize: 12,
        color: "var(--text-muted)",
        fontWeight: 500,
        letterSpacing: 0.5,
      }}
    >
      Question
    </div>

    <div
      style={{
        marginTop: 8,
        fontSize: 14,
        lineHeight: 1.6,
        color: "var(--text-primary)",
      }}
    >
      {stored.question}
    </div>

   {stored.questionCategory || stored.questionSource || stored.evaluationFramework ? (
  <div
    style={{
      marginTop: 10,
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center",
    }}
  >
    {stored.questionCategory ? (
      <span
        style={{
          padding: "4px 9px",
          borderRadius: 999,
          border: "1px solid var(--card-border)",
          background: "var(--card-bg)",
          color: "var(--text-primary)",
          fontSize: 12,
          fontWeight: 500,
          textTransform: "capitalize",
        }}
      >
        {stored.questionCategory.replace(/_/g, " ")}
      </span>
    ) : null}

    {stored.questionSource ? (
      <span
        style={{
          padding: "4px 9px",
          borderRadius: 999,
          border: "1px solid var(--card-border)",
          background: "var(--card-bg)",
          color: "var(--text-muted)",
          fontSize: 12,
          fontWeight: 500,
          textTransform: "capitalize",
        }}
      >
        {stored.questionSource}
      </span>
    ) : null}

   {resolvedFramework ? (
  <span
    style={{
      padding: "4px 9px",
      borderRadius: 999,
      border: "1px solid var(--accent-strong)",
      background: "var(--accent-soft)",
      color: "var(--accent)",
      fontSize: 12,
      fontWeight: 600,
    }}
  >
    {resolvedFramework === "star"
      ? "Behavioral (STAR)"
      : resolvedFramework === "technical_explanation"
      ? "Technical explanation"
      : resolvedFramework === "experience_depth"
      ? "Experience depth"
      : resolvedFramework}
  </span>
) : null} 


  </div>
) : null}
  </div>
) : null}

                <div style={{ marginTop: 10 }}>
                  <div
  style={{
    padding: 22,
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--card-border)",
    background: `
  radial-gradient(900px 420px at 15% -10%, var(--accent-2-soft), transparent 60%),
  var(--card-bg)
`,
    boxShadow: "var(--shadow-card)",
  }}
>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, letterSpacing: 0.5 }}>
                            Overall
                          </div>
                   <div
  style={{
    marginTop: 8,
    fontSize: 44,
    fontWeight: 700,
    letterSpacing: -0.8,
    color: "var(--text-primary)",
  }}
>
  {displayOverall100(overallScore100)}
</div>
<div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>
  {gradeFromScore(overallScoreTen ?? 0).label}
</div>

                        {percentileText ? (
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 13,
                              fontWeight: 500,
                              color: "var(--text-muted)",
                              lineHeight: 1.5,
                            }}
                          >
                            {percentileText}
                            {typeof percentileSampleSize === "number"
                              ? ` · ${percentileSampleSize} samples`
                              : ""}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ marginTop: 14, height: 8, borderRadius: 999, background: "var(--card-border-soft)", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${scoreToBarPctFromOverall100(overallScore100)}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, var(--accent-2), var(--accent))",
                          transition: "width 300ms ease",
                        }}
                      />
                    </div>
                  </div>

                  {(feedback as any).trajectory_note ? (
                    <div style={{
                      marginTop: 14,
                      padding: "11px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--accent-strong)",
                      background: "var(--accent-soft)",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      lineHeight: 1.6,
                    }}>
                      {(feedback as any).trajectory_note}
                    </div>
                  ) : null}

                  {(feedback as any).milestone_note ? (
                    <div style={{
                      marginTop: 8,
                      padding: "9px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--card-border)",
                      background: "var(--card-bg-strong)",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                      lineHeight: 1.6,
                    }}>
                      {(feedback as any).milestone_note}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
{[
  {
    label: "Communication",
    displayValue: displayTenPointAs100(communicationScoreTen),
    displaySuffix: "",
    barPct: scoreToBarPctFromTenPoint(communicationScoreTen),
    sub: "Clarity + structure",
  },
  {
    label: "Confidence",
    displayValue: displayTenPointAs100(confidenceScoreTen),
    displaySuffix: "",
    barPct: scoreToBarPctFromTenPoint(confidenceScoreTen),
    sub: "Tone + decisiveness",
  },
  {
    label: "STAR Avg",
    displayValue: typeof starAvg === "number" ? `${starAvg.toFixed(1)}` : " - ",
    displaySuffix: typeof starAvg === "number" ? "/10" : "",
    barPct: scoreToBarPctFromTenPoint(starAvg),
    sub: "Situation/Task/Action/Result",
  },
].map((m) => (
                      <div
  key={m.label}
  style={{
    padding: 18,
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--card-border-soft)",
    background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
    boxShadow: "var(--shadow-card-soft)",
    minWidth: 0,
  }}
>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, letterSpacing: 0.5 }}>
  {m.label}
</div>

                        <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
  {m.displayValue}
  {m.displayValue !== " - " ? m.displaySuffix : ""}
</div>

                        <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
  {m.sub}
</div>

                        <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: "var(--card-border-soft)", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${m.barPct}%`,
                              height: "100%",
                              background: "linear-gradient(90deg, var(--accent-2), var(--accent))",
                              transition: "width 300ms ease",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
  style={{
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  }}
>
  {communicationEvidence.length > 0 ? (
  <div
    style={{
      padding: 16,
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--card-border-soft)",
      background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
      boxShadow: "var(--shadow-card-soft)",
    }}
  >
    <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-muted)" }}>
      Why communication scored this way
    </div>

    <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--text-primary)" }}>
      {communicationEvidence.map((item: string, i: number) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  </div>
  ) : null}

  <div
    style={{
      padding: 16,
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--card-border-soft)",
      background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
      boxShadow: "var(--shadow-card-soft)",
    }}
  >
    <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-muted)" }}>
      Why confidence scored this way
    </div>

    {confidenceEvidence.length > 0 ? (
  <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--text-primary)" }}>
    {confidenceEvidence.map((item: string, i: number) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
) : (
      <div style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 13 }}>
        {feedback.confidence_explanation ?? "Confidence evidence will appear after more analyzed attempts."}
      </div>
    )}
  </div>
</div>

<div
  style={{
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  }}
>
  <div
    style={{
      padding: 16,
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--card-border-soft)",
      background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
      boxShadow: "var(--shadow-card-soft)",
    }}
  >
    <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-muted)" }}>
      Strongest parts of this answer
    </div>

    {topStrengths.length > 0 ? (
      <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--text-primary)" }}>
        {topStrengths.map((s: string, i: number) => (
  <li key={i}>{s}</li>
))}
      </ul>
    ) : (
      <div style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 13 }}>
        Strength analysis will appear here.
      </div>
    )}
  </div>

  <div
    style={{
      padding: 16,
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--card-border-soft)",
      background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
      boxShadow: "var(--shadow-card-soft)",
    }}
  >
    <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-muted)" }}>
      Biggest opportunities to improve
    </div>

    {missedOpportunities.length > 0 ? (
      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        {missedOpportunities.map((m: any, i: number) => (
          <div
            key={i}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid var(--card-border)",
              background: "var(--card-bg)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              {m?.label ? String(m.label) : "Opportunity"}
            </div>
            {m?.why ? (
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                {String(m.why)}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    ) : topImprovements.length > 0 ? (
      <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--text-primary)" }}>
        {topImprovements.map((s: string, i: number) => (
  <li key={i}>{s}</li>
))}
      </ul>
    ) : (
      <div style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 13 }}>
        Improvement analysis will appear here.
      </div>
    )}
  </div>
</div>
              </SectionCard>
            ) : null}

            {activeTab === "relevance" && feedback?.relevance ? (
  <SectionCard title="Question Relevance">
    <div
  style={{
    marginTop: 6,
    color: "var(--text-muted)",
    fontSize: 13,
    lineHeight: 1.6,
  }}
>
  This tab measures whether you actually answered the interviewer’s question directly and completely.
</div>

    <div
  style={{
    marginTop: 18,
    padding: 16,
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--card-border-soft)",
    background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
    boxShadow: "var(--shadow-card-soft)",
    minWidth: 0,
  }}
>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              fontWeight: 500,
              letterSpacing: 0.5,
            }}
          >
            Relevance score
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: -0.5,
              color: "var(--text-primary)",
            }}
          >
            {displayTenPointAs100(asTenPoint(feedback.relevance.relevance_score))}
          </div>

          <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
            {feedback.relevance.answered_question
              ? "Answered the interviewer’s question"
              : "Did not fully answer the interviewer’s question"}
          </div>
        </div>

        <div
          style={{
            padding: "7px 12px",
            borderRadius: 999,
            border: feedback.relevance.answered_question
              ? "1px solid rgba(34,197,94,0.30)"
              : "1px solid rgba(248,113,113,0.30)",
            background: feedback.relevance.answered_question
              ? "rgba(34,197,94,0.12)"
              : "rgba(248,113,113,0.10)",
            color: feedback.relevance.answered_question
              ? "rgba(34,197,94,0.95)"
              : "rgba(248,113,113,0.95)",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {feedback.relevance.answered_question ? "On question" : "Missed the ask"}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          height: 8,
          borderRadius: 999,
          background: "var(--card-border-soft)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${scoreToBarPctFromTenPoint(feedback.relevance.relevance_score)}%`,
            height: "100%",
              background: "linear-gradient(90deg, var(--accent-2), var(--accent))",
            transition: "width 300ms ease",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {[
          {
            label: "Directness",
            value: feedback.relevance.directness_score,
            sub: "How quickly you got to the point",
          },
          {
            label: "Completeness",
            value: feedback.relevance.completeness_score,
            sub: "How fully you answered all parts",
          },
          {
            label: "On-topic",
            value: feedback.relevance.off_topic_score,
            sub: "How well you stayed on the actual ask",
          },
        ].map((m) => (
          <div
  key={m.label}
  style={{
    padding: 16,
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--card-border-soft)",
    background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
    boxShadow: "var(--shadow-card-soft)",
    minWidth: 0,
  }}
>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                fontWeight: 500,
                letterSpacing: 0.5,
              }}
            >
              {m.label}
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 24,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {displayTenPointAs100(asTenPoint(m.value))}
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "var(--text-muted)",
                lineHeight: 1.45,
              }}
            >
              {m.sub}
            </div>

            <div
              style={{
                marginTop: 10,
                height: 6,
                borderRadius: 999,
                background: "var(--card-border-soft)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${scoreToBarPctFromTenPoint(m.value)}%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg, var(--accent-2), var(--accent))",
                  transition: "width 300ms ease",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {Array.isArray(feedback.relevance.missed_parts) &&
      feedback.relevance.missed_parts.length > 0 ? (
        <div
  style={{
    marginTop: 16,
    padding: 14,
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--card-border-soft)",
    background: "var(--card-bg)",
  }}
>
          <div
            style={{
              color: "var(--text-muted)",
              fontWeight: 500,
              fontSize: 12,
              letterSpacing: 0.4,
            }}
          >
            Missed parts of the question
          </div>

          <ul
            style={{
              marginTop: 8,
              marginBottom: 0,
              paddingLeft: 18,
              lineHeight: 1.7,
              color: "var(--text-primary)",
            }}
          >
            {feedback.relevance.missed_parts.map((part: string, i: number) => (
              <li key={i}>{part}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {typeof feedback.relevance.relevance_explanation === "string" &&
      feedback.relevance.relevance_explanation.trim() ? (
        <div
          style={{
            marginTop: 14,
            color: "var(--text-muted)",
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          {feedback.relevance.relevance_explanation}
        </div>
      ) : null}
    </div>
  </SectionCard>
) : null}

            {activeTab === "delivery" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {!deliveryProfile.hasData ? (
                  <SectionCard title="Voice Delivery">
                    <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
                      {stored?.inputMethod === "pasted"
                        ? "Paste answers don't generate audio signals. Record a spoken answer to unlock delivery coaching - pace, vocal variety, energy, and filler words are analyzed automatically."
                        : "Record a spoken answer to unlock delivery coaching - pace, filler words, vocal variety, and energy are analyzed automatically."}
                    </div>
                  </SectionCard>
                ) : (
                  <>
                    {/* Partial data notice for spoken answers missing acoustics */}
                    {stored?.inputMethod === "spoken" && !acousticsNorm && deliveryProfile.hasData ? (
                      <div style={{
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid rgba(251,191,36,0.2)",
                        background: "rgba(251,191,36,0.05)",
                        fontSize: 12,
                        color: "var(--text-muted)",
                        lineHeight: 1.6,
                      }}>
                        <span style={{ fontWeight: 600, color: "rgba(251,191,36,0.9)" }}>Partial data</span>
                        {" - "}Pace and filler words are measured from your transcript, but vocal variety and energy require audio analysis that wasn't captured for this attempt. Re-record to get the full profile.
                      </div>
                    ) : null}

                    {/* Profile card */}
                    <div style={{
                      padding: 20,
                      borderRadius: "var(--radius-xl)",
                      border: "1px solid var(--card-border-soft)",
                      background: "var(--card-bg)",
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 8 }}>
                        Delivery Profile
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: -0.3 }}>
                        {deliveryProfile.archetypeLabel}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                        {deliveryProfile.tagline}
                      </div>
                      <div style={{
                        marginTop: 14,
                        padding: "12px 14px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--card-bg-strong)",
                        border: "1px solid var(--card-border-soft)",
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-muted)", marginBottom: 6 }}>
                          What interviewers hear
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, fontStyle: "italic" as const }}>
                          &ldquo;{deliveryProfile.whatInterviewersHear}&rdquo;
                        </div>
                      </div>
                      <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>
                        {deliveryProfile.patternDetail}
                      </div>
                    </div>

                    {/* Primary lever */}
                    <div style={{
                      padding: 20,
                      borderRadius: "var(--radius-xl)",
                      border: "1px solid rgba(99,102,241,0.2)",
                      background: "rgba(99,102,241,0.05)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--accent)", textTransform: "uppercase" as const, marginBottom: 8 }}>
                            ↑ Primary lever
                          </div>
                          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", letterSpacing: -0.2 }}>
                            {deliveryProfile.primaryLever}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, border: "1px solid var(--card-border)", color: "var(--text-muted)" }}>
                            Effort: {deliveryProfile.effort}
                          </span>
                          <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, border: "1px solid var(--card-border)", color: deliveryProfile.impact === "High" ? "var(--accent)" : "var(--text-muted)" }}>
                            Impact: {deliveryProfile.impact}
                          </span>
                        </div>
                      </div>
                      <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.65 }}>
                        {deliveryProfile.primaryLeverDetail}
                      </div>
                    </div>

                    {/* Signal grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                      {([
                        deliveryProfile.signals.pace,
                        deliveryProfile.signals.variety,
                        deliveryProfile.signals.fillers,
                        deliveryProfile.signals.energy,
                      ]).map((sig) => {
                        const isIdeal = sig.rating === "ideal";
                        const isNeeds = sig.rating === "needs_work";
                        const isUnavail = sig.rating === "unavailable";
                        return (
                          <div key={sig.label} style={{
                            padding: "14px 16px",
                            borderRadius: "var(--radius-lg)",
                            border: isNeeds
                              ? "1px solid rgba(248,113,113,0.2)"
                              : isIdeal
                              ? "1px solid rgba(34,197,94,0.2)"
                              : "1px solid var(--card-border-soft)",
                            background: isNeeds
                              ? "rgba(248,113,113,0.04)"
                              : isIdeal
                              ? "rgba(34,197,94,0.04)"
                              : "var(--card-bg)",
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.4, color: "var(--text-muted)" }}>
                                {sig.label}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: isNeeds ? "rgba(248,113,113,0.9)" : isIdeal ? "rgba(34,197,94,0.9)" : isUnavail ? "var(--text-soft)" : "var(--text-muted)" }}>
                                {isIdeal ? "✓" : isNeeds ? "⚠" : isUnavail ? " - " : "·"}
                              </div>
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginTop: 6, lineHeight: 1.2 }}>
                              {sig.value}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
                              {sig.coaching}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Composite delivery scores */}
                    {(() => {
                      const rows = [
                        { label: "Overall Engagement", value: deliverySummary?.engagementScore, desc: "Vocal presence + rhythm + pace - how captivating the delivery sounds overall", accent: true },
                        { label: "Vocal Presence",     value: deliverySummary?.vocalPresenceScore, desc: "Pitch variety, energy dynamics, and expressiveness" },
                        { label: "Rhythm",             value: deliverySummary?.rhythmScore, desc: "Pause patterns, pacing consistency, and natural flow" },
                        { label: "Clarity",            value: deliverySummary?.clarityScore, desc: "Filler word control and absence of disruptive pauses" },
                      ].filter((r) => typeof r.value === "number" && r.value !== null);
                      if (!rows.length) return null;
                      return (
                        <div style={{ padding: 20, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 16 }}>
                            Composite Delivery Scores
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {rows.map((row) => {
                              const pct = Math.round(clamp(row.value as number, 0, 10) * 10);
                              const barColor = pct >= 70 ? "rgba(34,197,94,0.85)" : pct >= 45 ? "rgba(251,191,36,0.85)" : "rgba(248,113,113,0.85)";
                              return (
                                <div key={row.label}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                                    <div style={{ fontSize: 13, fontWeight: row.accent ? 700 : 500, color: "var(--text-primary)" }}>{row.label}</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{pct}/100</div>
                                  </div>
                                  <div style={{ height: 5, borderRadius: 999, background: "var(--card-border)", overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 999 }} />
                                  </div>
                                  <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{row.desc}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Content × Delivery insight */}
                    {deliveryProfile.contentInsight ? (
                      <div style={{
                        padding: "14px 16px",
                        borderRadius: "var(--radius-lg)",
                        border: "1px solid var(--card-border-soft)",
                        background: "var(--card-bg-strong)",
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 8 }}>
                          Content × Delivery
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.65 }}>
                          {deliveryProfile.contentInsight}
                        </div>
                      </div>
                    ) : null}

                    {/* Role calibration */}
                    {deliveryProfile.roleNote ? (
                      <div style={{
                        padding: "12px 14px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--card-border-soft)",
                        background: "var(--card-bg)",
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-muted)", marginBottom: 4 }}>
                          Role calibration
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
                          {deliveryProfile.roleNote}
                        </div>
                      </div>
                    ) : null}

                    {/* Raw acoustic breakdown */}
                    {acousticsNorm ? (
                      <div style={{
                        padding: "14px 16px",
                        borderRadius: "var(--radius-lg)",
                        border: "1px solid var(--card-border-soft)",
                        background: "var(--card-bg)",
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 12 }}>
                          Raw Acoustic Signals
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                          {hasNum(acousticsNorm.monotoneScore) ? (
                            <MetricBar label="Monotone risk" value={clamp(acousticsNorm.monotoneScore, 0, 10)} max={10} subtext={monotoneContext(acousticsNorm.monotoneScore)} />
                          ) : null}
                          {hasNum(acousticsNorm.energyVariation) ? (
                            <MetricBar label="Energy variation" value={Math.round(clamp(acousticsNorm.energyVariation, 0, 10) * 10) / 10} max={10} subtext={energyVarContext(acousticsNorm.energyVariation)} />
                          ) : null}
                          {hasNum(acousticsNorm.tempo) ? (
                            <MetricBar label="Tempo" value={Math.round(acousticsNorm.tempo)} max={200} subtext={`${tempoContext(acousticsNorm.tempo)} (BPM)`} />
                          ) : null}
                          {hasNum(acousticsNorm.tempoDynamics) ? (
                            <MetricBar label="Tempo dynamics" value={clamp(acousticsNorm.tempoDynamics, 0, 10)} max={10} subtext={tempoDynContext(acousticsNorm.tempoDynamics)} />
                          ) : null}
                          {hasNum(acousticsNorm.pitchRange) ? (
                            <MetricBar label="Pitch range" value={Math.round(acousticsNorm.pitchRange)} max={200} subtext={pitchRangeContext(acousticsNorm.pitchRange)} />
                          ) : null}
                          {hasNum(acousticsNorm.pitchStd) ? (
                            <MetricBar label="Pitch variety" value={Math.round(acousticsNorm.pitchStd)} max={60} subtext={`${pitchStdContext(acousticsNorm.pitchStd)} (std dev Hz)`} />
                          ) : null}
                        </div>
                        {(() => {
                          const insight = crossSignalInsight(
                            acousticsNorm.monotoneScore,
                            acousticsNorm.energyVariation,
                            stored?.wpm,
                            acousticsNorm.pitchStd
                          );
                          if (!insight) return null;
                          return (
                            <div style={{
                              marginTop: 12,
                              padding: "10px 14px",
                              borderRadius: "var(--radius-sm)",
                              background: "rgba(99,102,241,0.06)",
                              border: "1px solid rgba(99,102,241,0.15)",
                            }}>
                              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "rgba(99,102,241,0.8)", marginBottom: 4 }}>
                                Signal interpretation
                              </div>
                              <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.65 }}>{insight}</div>
                            </div>
                          );
                        })()}
                        {series ? <SpeakingTimeline series={series} markers={speechMoments} /> : null}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {activeTab === "coaching" ? (
              <>
              {(strengthThemeKeys.length > 0 || improvementThemeKeys.length > 0) ? (
                <div style={{
                  padding: "14px 18px",
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--card-border-soft)",
                  background: "var(--card-bg)",
                  marginBottom: 14,
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: 10,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase" as const }}>
                    Answer patterns detected
                  </div>
                  {strengthThemeKeys.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(34,197,94,0.7)", fontWeight: 600, marginBottom: 6 }}>Strengths</div>
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                        {strengthThemeKeys.map((key: string) => {
                          const meta = THEME_META[key] ?? { label: key, color: "rgba(34,197,94,0.9)", bg: "rgba(34,197,94,0.07)" };
                          return (
                            <span key={key} style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              color: meta.color,
                              background: meta.bg,
                              border: `1px solid ${meta.color.replace("0.9", "0.2").replace("0.85", "0.2").replace("0.8", "0.2")}`,
                            }}>
                              {meta.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {improvementThemeKeys.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(251,191,36,0.75)", fontWeight: 600, marginBottom: 6 }}>Needs work</div>
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                        {improvementThemeKeys.map((key: string) => {
                          const meta = THEME_META[key] ?? { label: key, color: "rgba(251,191,36,0.9)", bg: "rgba(251,191,36,0.07)" };
                          return (
                            <span key={key} style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              color: "rgba(251,191,36,0.9)",
                              background: "rgba(251,191,36,0.07)",
                              border: "1px solid rgba(251,191,36,0.2)",
                            }}>
                              {meta.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
              <SectionCard title="Why this score">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {isStarFramework && typeof starAvg === "number" ? (
  <div style={{ color: "var(--text-primary)", fontSize: 13 }}>
    Behavioral structure drove most of the score (avg <span style={{ fontWeight: 700 }}>{displayTenPointAs100(starAvg)}</span>).
  </div>
) : isTechnicalFramework && (feedback as any)?.technical_explanation ? (
  <div style={{ color: "var(--text-primary)", fontSize: 13 }}>
    Technical explanation quality drove most of the score.
  </div>
) : isExperienceFramework && (feedback as any)?.experience_depth ? (
  <div style={{ color: "var(--text-primary)", fontSize: 13 }}>
    Experience depth and specificity drove most of the score.
  </div>
) : null}

                  {dm && (typeof dm.longPauseCount === "number" || typeof dm.maxPauseMs === "number") ? (
                    <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      Delivery penalty applied:{" "}
                      {typeof dm.longPauseCount === "number" ? `long pauses=${dm.longPauseCount}` : ""}
                      {typeof dm.longPauseCount === "number" && typeof dm.maxPauseMs === "number" ? ", " : ""}
                      {typeof dm.maxPauseMs === "number" ? `max pause=${dm.maxPauseMs}ms` : ""}
                    </div>
                  ) : null}

                  {typeof stored?.wpm === "number" ? <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Delivery pace detected: {stored.wpm} words per minute</div> : null}

                  {Array.isArray(feedback?.keywords_missing) && feedback.keywords_missing.length > 0 ? (
                    <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Missing role keywords also limited the score.</div>
                  ) : null}

                  <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
  {isStarFramework
    ? "Higher scores require strong behavioral structure and measurable impact."
    : isTechnicalFramework
    ? "Higher scores require clear technical reasoning, structure, and credible depth."
    : isExperienceFramework
    ? "Higher scores require specific examples, tool fluency, and clear business impact."
    : "Higher scores require clear, specific, and relevant answers."}
</div>
                </div>
              </SectionCard>
              </>
            ) : null}


            <div style={{ marginTop: 32 }} />

            {activeTab === "structure" &&
isStarFramework &&
feedback.star ? (
              <SectionCard title={`STAR Breakdown${starAvg !== null ? ` (avg ${starAvg}/10)` : ""}`}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
                  <StarChip letter="S" label="Situation" status={starMissingList.includes("situation") ? "missing" : "detected"} />
                  <StarChip letter="T" label="Task" status={starMissingList.includes("task") ? "missing" : "detected"} />
                  <StarChip letter="A" label="Action" status={starMissingList.includes("action") ? "missing" : "detected"} />
                  <StarChip letter="R" label="Result" status={starMissingList.includes("result") ? "missing" : "detected"} />
                </div>

                <div
  style={{
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--card-border)",
    background: "var(--card-bg)",
    padding: 14,
    marginBottom: 14,
  }}
>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                    <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 13, letterSpacing: 0.4 }}>Evidence excerpts</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Based on your transcript (auto-selected)</div>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {([
                      { key: "situation", label: "Situation", q: starEvidence.situation },
                      { key: "task", label: "Task", q: starEvidence.task },
                      { key: "action", label: "Action", q: starEvidence.action },
                      { key: "result", label: "Result", q: starEvidence.result },
                    ] as const).map((row) => {
                      const missing = starMissingList.includes(row.key);
                      const advice = feedback.star_advice?.[row.key];

                      const evidenceArr = (feedback as any)?.star_evidence?.[row.key];
                      const evidenceQuote =
                        Array.isArray(evidenceArr) && evidenceArr.length > 0 ? String(evidenceArr[0]) : null;

                      const excerpt = evidenceQuote || row.q;

                      return (
                        <div
                          key={row.key}
                          style={{
  borderRadius: 14,
  padding: 12,
  border: missing ? "1px solid rgba(248,113,113,0.18)" : "1px solid var(--card-border-soft)",
  background: missing ? "rgba(248,113,113,0.06)" : "var(--card-bg)",
}}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                            <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 13 }}>{row.label}</div>
                            <div style={{ color: missing ? "rgba(248,113,113,0.95)" : "var(--text-muted)", fontSize: 12, fontWeight: 500 }}>
                              {missing ? "Missing" : "Detected"}
                            </div>
                          </div>

                          <div style={{ marginTop: 8, color: "var(--text-primary)", fontSize: 13, lineHeight: 1.6 }}>
                            {excerpt ? (
                              <div style={{ fontStyle: "italic", opacity: 0.95 }}>&ldquo;{excerpt}&rdquo;</div>
                            ) : (
                              <div style={{ color: "var(--text-muted)" }}>
                                No clear excerpt detected. Add 1 sentence that explicitly states your {row.label.toLowerCase()}.
                              </div>
                            )}
                          </div>

                          {advice ? (
                            <div style={{ marginTop: 10, color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>
                              <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>Fix:</span> {advice}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <MetricBar label="Situation" value={feedback.star.situation} max={10} />
                <MetricBar label="Task" value={feedback.star.task} max={10} />
                <MetricBar label="Action" value={feedback.star.action} max={10} />
                <MetricBar label="Result" value={feedback.star.result} max={10} />

                {Array.isArray(feedback.star_missing) ? (
                  <div style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 13 }}>
                    <strong style={{ color: "var(--text-muted)" }}>Missing:</strong> {feedback.star_missing.length ? feedback.star_missing.join(", ") : "None"}
                  </div>
                ) : null}
              </SectionCard>
            ) : null}

{activeTab === "structure" &&
isTechnicalFramework ? (
  <SectionCard title="Technical Explanation Breakdown">
    <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
      This answer is being evaluated as a technical explanation, so STAR structure is not the primary rubric.
      Focus is placed on clarity, technical accuracy, structure, depth, and practical reasoning.
    </div>

    {(feedback as any)?.technical_explanation ? (
      <>
        <MetricBar
          label="Technical clarity"
          value={Number((feedback as any).technical_explanation.technical_clarity ?? 0)}
          max={10}
        />
        <MetricBar
          label="Technical accuracy"
          value={Number((feedback as any).technical_explanation.technical_accuracy ?? 0)}
          max={10}
        />
        <MetricBar
          label="Structure"
          value={Number((feedback as any).technical_explanation.structure ?? 0)}
          max={10}
        />
        <MetricBar
          label="Depth"
          value={Number((feedback as any).technical_explanation.depth ?? 0)}
          max={10}
        />
        <MetricBar
          label="Practical reasoning"
          value={Number((feedback as any).technical_explanation.practical_reasoning ?? 0)}
          max={10}
        />

        {Array.isArray((feedback as any)?.technical_strengths) &&
        (feedback as any).technical_strengths.length > 0 ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 13 }}>
              Technical strengths
            </div>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--text-primary)" }}>
              {(feedback as any).technical_strengths.map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {Array.isArray((feedback as any)?.technical_improvements) &&
        (feedback as any).technical_improvements.length > 0 ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 13 }}>
              Technical improvements
            </div>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--text-primary)" }}>
              {(feedback as any).technical_improvements.map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </>
    ) : (
      <div style={{ marginTop: 14, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
        Detailed technical rubric fields were not returned for this attempt yet.
      </div>
    )}
  </SectionCard>


) : activeTab === "structure" &&
  isExperienceFramework ? (
  <SectionCard title="Experience Depth Breakdown">
    <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
      This answer is being evaluated for experience depth, so STAR structure is not the primary rubric.
      Focus is placed on specificity, real examples, tool fluency, and business impact.
    </div>

    {(feedback as any)?.experience_depth ? (
      <>
        <MetricBar
          label="Experience depth"
          value={Number((feedback as any).experience_depth.experience_depth ?? 0)}
          max={10}
        />
        <MetricBar
          label="Specificity"
          value={Number((feedback as any).experience_depth.specificity ?? 0)}
          max={10}
        />
        <MetricBar
          label="Tool fluency"
          value={Number((feedback as any).experience_depth.tool_fluency ?? 0)}
          max={10}
        />
        <MetricBar
          label="Business impact"
          value={Number((feedback as any).experience_depth.business_impact ?? 0)}
          max={10}
        />
        <MetricBar
          label="Example quality"
          value={Number((feedback as any).experience_depth.example_quality ?? 0)}
          max={10}
        />

        {Array.isArray((feedback as any)?.experience_strengths) &&
        (feedback as any).experience_strengths.length > 0 ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 13 }}>
              Experience strengths
            </div>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--text-primary)" }}>
              {(feedback as any).experience_strengths.map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {Array.isArray((feedback as any)?.experience_improvements) &&
        (feedback as any).experience_improvements.length > 0 ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 13 }}>
              Experience improvements
            </div>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--text-primary)" }}>
              {(feedback as any).experience_improvements.map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </>
    ) : (
      <div style={{ marginTop: 14, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
        Detailed experience rubric fields were not returned for this attempt yet.
      </div>
    )}
  </SectionCard>
) : activeTab === "structure" &&
  !isStarFramework ? (
  <SectionCard title="Evaluation Breakdown">
    <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
      This answer is using a non-STAR evaluation framework.
    </div>
  </SectionCard>
) : null} 

            {activeTab === "coaching" ? (
  <SectionCard title="What's working">
    {topStrengths.length > 0 ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {topStrengths.map((s: string, i: number) => (
          <div key={i} style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.15)",
          }}>
            <div style={{
              width: 20, height: 20,
              borderRadius: "50%",
              background: "rgba(34,197,94,0.12)",
              color: "rgba(34,197,94,0.9)",
              display: "grid",
              placeItems: "center",
              fontSize: 11,
              fontWeight: 700,
              flex: "0 0 auto",
              marginTop: 1,
            }}>✓</div>
            <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>{s}</div>
          </div>
        ))}
      </div>
    ) : (
      <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No strengths available yet.</div>
    )}
  </SectionCard>
) : null}

            {activeTab === "coaching" ? (
  <SectionCard title="Focus area">
    {topImprovements.length > 0 ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{
          padding: "12px 14px",
          borderRadius: "var(--radius-sm)",
          background: "rgba(99,102,241,0.07)",
          border: "1px solid rgba(99,102,241,0.18)",
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{
              fontSize: 16,
              color: "var(--accent)",
              flex: "0 0 auto",
              marginTop: 1,
            }}>↑</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: 0.6, marginBottom: 5, textTransform: "uppercase" }}>
                Top priority
              </div>
              <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>{topImprovements[0]}</div>
            </div>
          </div>
        </div>
        {topImprovements.slice(1).map((s: string, i: number) => (
          <div key={i} style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            padding: "10px 12px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--card-border-soft)",
          }}>
            <div style={{
              width: 6, height: 6,
              borderRadius: "50%",
              background: "var(--text-muted)",
              flex: "0 0 auto",
              marginTop: 6,
            }} />
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{s}</div>
          </div>
        ))}
      </div>
    ) : (
      <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No improvement notes available yet.</div>
    )}
  </SectionCard>
) : null}

            {activeTab === "coaching" &&
            Array.isArray((feedback as any)?.missed_opportunities) &&
            (feedback as any).missed_opportunities.length > 0 ? (
              <SectionCard title="Missed opportunities">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(feedback as any).missed_opportunities.slice(0, 4).map((m: any, i: number) => (
  <div
    key={i}
    style={{
      borderRadius: "var(--radius-sm)",
      padding: 12,
      border: "1px solid var(--card-border-soft)",
      background: "var(--card-bg)",
    }}
  >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                        <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 13 }}>
                          {m?.label ? String(m.label) : "Opportunity"}
                        </div>
                      </div>

                      {m?.why ? (
                        <div style={{ marginTop: 6, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>{String(m.why)}</div>
                      ) : null}

                      {m?.add_sentence ? (
                        <div style={{ marginTop: 10, color: "var(--text-primary)", fontSize: 13, lineHeight: 1.7 }}>
                          <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Add this sentence:</span>{" "}
                          <span style={{ fontStyle: "italic" }}>&ldquo;{String(m.add_sentence)}&rdquo;</span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {activeTab === "coaching" && feedback.better_answer ? (
              <SectionCard title="Stronger version">
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75, color: "var(--text-primary)" }}>{feedback.better_answer}</div>
              </SectionCard>
            ) : null}

            {activeTab === "structure" && (Array.isArray(feedback.keywords_used) || Array.isArray(feedback.keywords_missing)) ? (
              <SectionCard title="Keywords">
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {Array.isArray(feedback.keywords_used) && feedback.keywords_used.length > 0 ? (
                    <div>
                      <div style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: 12, letterSpacing: 0.5 }}>Used effectively</div>
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {feedback.keywords_used.map((k: string) => (
                          <div
                            key={k}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 500,
                              background: "rgba(34,197,94,0.15)",
                              border: "1px solid rgba(34,197,94,0.35)",
                              color: "rgba(34,197,94,0.95)",
                            }}
                          >
                            {k}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {Array.isArray(feedback.keywords_missing) && feedback.keywords_missing.length > 0 ? (
                    <div>
                      <div style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: 12, letterSpacing: 0.5 }}>Missing from your answer</div>
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {feedback.keywords_missing.map((k: string) => (
                          <div
                            key={k}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 500,
                              background: "rgba(248,113,113,0.10)",
                              border: "1px solid rgba(248,113,113,0.30)",
                              color: "rgba(248,113,113,0.95)",
                            }}
                          >
                            {k}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {Array.isArray(feedback.keywords_used) && feedback.keywords_used.length === 0 ? (
                    <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
                      No strong job-specific keywords detected yet. Try naming the system/tool/process you used (ERP/MRP, schedule adherence, KPIs).
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            ) : null}

            {activeTab === "transcript" ? (
  <SectionCard title="Transcript">
    <div
      style={{
        whiteSpace: "pre-wrap",
        lineHeight: 1.75,
        color: "var(--text-primary)",
      }}
    >
      {stored?.transcript ?? "No transcript saved."}
    </div>
  </SectionCard>
) : null}
          </>
        )}
      </div>
    </PremiumShell>
  );
}