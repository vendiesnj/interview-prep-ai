"use client";

import UpgradeModal from "@/app/components/UpgradeModal";
import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import PremiumShell from "../../components/PremiumShell";
import PremiumCard from "../../components/PremiumCard";
import { getProfile } from "../../lib/profileStore";

import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";
import type { AttemptEntitlement } from "@/app/lib/entitlements";
import { posthog } from "@/app/lib/posthog-client";

function MetricRow({
  label,
  value,
  subtext,
}: {
  label: string;
  value: number; // 0-10 or 0-200 etc (we'll pass normalized for bars)
  subtext?: string;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 13, color: "#9CA3AF", letterSpacing: 0.2 }}>{label}</div>
        <div style={{ fontSize: 14, color: "#E5E7EB", fontWeight: 700 }}>{value}</div>
      </div>
      {subtext && <div style={{ marginTop: 4, fontSize: 12, color: "#9CA3AF" }}>{subtext}</div>}
    </div>
  );
}

function clampStr(value: unknown, max = 20000): string {
  if (typeof value !== "string") return "";
  return value.length > max ? value.slice(0, max) : value;
}

function safeSetJSON(
  key: string,
  value: any
): { ok: boolean; where: "sessionStorage" | "localStorage" | null } {
  const json = JSON.stringify(value);

  try {
    sessionStorage.setItem(key, json);
    return { ok: true, where: "sessionStorage" };
  } catch (e) {
    console.error(`sessionStorage setItem failed for ${key}`, e);
  }

  try {
    localStorage.setItem(key, json);
    return { ok: true, where: "localStorage" };
  } catch (e) {
    console.error(`localStorage setItem failed for ${key}`, e);
  }

  return { ok: false, where: null };
}





function GaugeTile({
  title,
  value,
  max,
  subtitle,
  children,
}: {
  title?: string;
  value: number;
  max: number;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const deg = Math.round(pct * 360);

  return (
    <details
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        padding: 14,
      }}
    >
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Gauge ring */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background: `conic-gradient(rgba(34,211,238,0.95) ${deg}deg, rgba(255,255,255,0.10) 0deg)`,
              display: "grid",
              placeItems: "center",
              boxShadow: "0 0 18px rgba(34,211,238,0.18)",
              flex: "0 0 auto",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                background: "rgba(17,24,39,0.95)",
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#E5E7EB",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {value}/{max}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, color: "#9CA3AF", letterSpacing: 0.2 }}>
              {title}
            </div>
            {subtitle && (
              <div style={{ marginTop: 3, fontSize: 12, color: "#9CA3AF" }}>{subtitle}</div>
            )}
          </div>
        </div>

        <div style={{ color: "#9CA3AF", fontSize: 12 }}>Details ▾</div>
      </summary>

      {children && <div style={{ marginTop: 12 }}>{children}</div>}
    </details>
  );
}


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
        <div style={{ fontSize: 13, color: "#9CA3AF", letterSpacing: 0.2 }}>{label}</div>
        <div style={{ fontSize: 14, color: "#E5E7EB", fontWeight: 700 }}>
          {value}/{max}
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, rgba(99,102,241,0.95), rgba(34,211,238,0.85))",
            boxShadow: "0 0 18px rgba(99,102,241,0.35)",
            transition: "width 250ms ease",
          }}
        />
      </div>

      {subtext && <div style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF" }}>{subtext}</div>}
    </div>
  );
}

// --- IndexedDB helpers for audio replay ---
const AUDIO_DB = "ipc_audio_db";
const AUDIO_STORE = "audio";

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AUDIO_DB, 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE);
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbClearAllAudio() {
  try {
    const db = await openAudioDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AUDIO_STORE, "readwrite");
      tx.objectStore(AUDIO_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore (private mode / blocked / etc.)
  }
}


async function idbPutAudio(id: string, blob: Blob) {
  const db = await openAudioDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, "readwrite");
    tx.objectStore(AUDIO_STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
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

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function buildSparkPath(values: number[], w: number, h: number, pad = 6, fixedMax?: number) {
  if (!values.length) return "";
  const min = 0;
const max = typeof fixedMax === "number" ? fixedMax : Math.max(...values);
  const range = Math.max(1e-6, max - min);

  const xs = values.map((_, i) =>
    pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1)
  );

  const ys = values.map((v) => {
    const t = (v - min) / range; // 0..1
    const y = pad + (1 - clamp01(t)) * (h - pad * 2);
    return y;
  });

  return xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(" ");
}

function withHoverLift(base: React.CSSProperties): React.CSSProperties {
  return {
    transition: "transform 120ms ease, background 120ms ease, border-color 120ms ease, opacity 120ms ease",
    ...base,
  };
}

function hoverLiftHandlers() {
  return {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "translateY(-1px)";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.transform = "translateY(0px)";
    },
  };
}

function CollapsibleNoteCard({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        marginTop: 14,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 14px",
          cursor: "pointer",
          background: "transparent",
          border: "none",
          color: "#E5E7EB",
          textAlign: "left",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 900, letterSpacing: 0.5 }}>
            {title}
          </div>

          {summary ? (
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "rgba(229,231,235,0.85)",
                lineHeight: 1.35,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={summary}
            >
              {summary}
            </div>
          ) : null}
        </div>

        <div
          style={{
            flex: "0 0 auto",
            fontSize: 12,
            fontWeight: 900,
            color: "#9CA3AF",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>{open ? "Hide" : "Show"}</span>
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 180ms ease",
            }}
          >
            ▾
          </span>
        </div>
      </button>

      {open ? (
        <div style={{ padding: "0 14px 14px 14px" }}>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: 12,
              color: "#E5E7EB",
            }}
          >
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}


export default function PracticePage() {
  const router = useRouter();
    const { data: session } = useSession();
    const email = session?.user?.email ?? null;
  const HISTORY_KEY = userScopedKey("ipc_history", session);
  const LAST_RESULT_KEY = userScopedKey("ipc_last_result", session);
  const HOME_STATE_KEY = userScopedKey("ipc_home_state", session);
  const HISTORY_FALLBACK_KEY = "ipc_history";
const HOME_STATE_FALLBACK_KEY = "ipc_home_state";
  const FOCUS_KEY = userScopedKey("ipc_focus_goal", session);
  const [jobDesc, setJobDesc] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
type QuestionBuckets = { behavioral: string[]; technical: string[]; culture: string[] };
const [questionBuckets, setQuestionBuckets] = useState<QuestionBuckets | null>(null);
  const [loading, setLoading] = useState(false);
  const hydratedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  type Entitlement = {
  isPro: boolean;
  remaining: number;
};

  const [entitlement, setEntitlement] = useState<AttemptEntitlement | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // --- Live waveform ---
const analyserRef = useRef<AnalyserNode | null>(null);
const audioCtxRef = useRef<AudioContext | null>(null);
const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const attemptIdRef = useRef<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  type TrendMetric = "overall" | "communication" | "confidence" | "pace" | "fillers" | "star_result" | "vocal_variety";
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("overall");
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [hasHistoryLS, setHasHistoryLS] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  type Stage = "pick" | "record" | "review";
const [stage, setStage] = useState<Stage>("pick");
const answerTimeLimit = getProfile().settings.answerTimeLimit;
const [timeLeft, setTimeLeft] = React.useState(answerTimeLimit);
const [timerRunning, setTimerRunning] = React.useState(false);
const [mode, setMode] = React.useState<"setup" | "questions" | "answer">("setup");

React.useEffect(() => {
  if (!timerRunning) return;

  const id = window.setInterval(() => {
    setTimeLeft((t) => {
      if (t <= 1) {
        window.clearInterval(id);
        setTimerRunning(false);
        stopRecording();
        return 0;
      }
      return t - 1;
    });
  }, 1000);

  return () => window.clearInterval(id);
}, [timerRunning]);



useEffect(() => setMounted(true), []);

async function playHistoryAudio(audioId: string) {
  try {
    // Stop existing
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = "";
      audioElRef.current = null;
    }

    const blob = await idbGetAudio(audioId);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    audioElRef.current = a;

    setPlayingId(audioId);

    a.onended = () => {
      setPlayingId(null);
      URL.revokeObjectURL(url);
    };

    a.play();
  } catch {
    setPlayingId(null);
  }
}

function stopHistoryAudio() {
  if (!audioElRef.current) return;
  try {
    audioElRef.current.pause();
    audioElRef.current.src = "";
  } catch {}
  audioElRef.current = null;
  setPlayingId(null);
}

async function clearHistory() {
  stopHistoryAudio();

  setHistory([]);
  setPlayingId(null);

  try { localStorage.removeItem(HISTORY_KEY); } catch {}
  try { sessionStorage.removeItem(HISTORY_KEY); } catch {}

  await idbClearAllAudio();

  setConfirmClearHistory(false); // close confirm
}


  const recordingStartRef = useRef<number | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [showQuestions, setShowQuestions] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<number | null>(null);
  const [feedback, setFeedback] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const lastTranscribedRef = useRef<string>("");
const [inputMethod, setInputMethod] = useState<"spoken" | "pasted">("pasted");
type FocusGoal = "pace" | "fillers" | "star_result" | "vocal_variety" | "clarity";

const [focusGoal, setFocusGoal] = useState<FocusGoal | null>(null);

useEffect(() => {
  try {
    const raw = localStorage.getItem(FOCUS_KEY);
    if (raw) setFocusGoal(raw as FocusGoal);
    else setFocusGoal(null);
  } catch {}
}, [email, FOCUS_KEY]);

useEffect(() => {
  try {
    const force = sessionStorage.getItem("ipc_force_restore");
    if (force === "1") {
      sessionStorage.removeItem("ipc_force_restore");
      restoreHomeState(); // re-apply persisted state
    }
  } catch {}
}, []);


useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") setShowAdvanced(false);
  }
  if (showAdvanced) window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [showAdvanced]);

useEffect(() => {
  // Inject once (prevents styled-jsx nesting issues)
  const id = "ipc-adv-keyframes";
  if (document.getElementById(id)) return;

  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    @keyframes advSlideUp {
      from { opacity: 0; transform: translateY(24px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0px) scale(1); }
    }
  `;
  document.head.appendChild(style);

  return () => {
    // optional: keep it, or remove on unmount
    // style.remove();
  };
}, []);




function saveFocus(next: FocusGoal | null) {
  setFocusGoal(next);
  try {
    if (!next) localStorage.removeItem(FOCUS_KEY);
    else localStorage.setItem(FOCUS_KEY, next);
  } catch {}
}

// Command+F anchor: const [result, setResult]
const [result, setResult] = useState<any>(null);

useEffect(() => {
  if (!session?.user) return;

  try {
    const raw =
      sessionStorage.getItem(LAST_RESULT_KEY) ||
      localStorage.getItem(LAST_RESULT_KEY);

    if (raw) setResult(JSON.parse(raw));
    else setResult(null);
  } catch {
    setResult(null);
  }
}, [session?.user, LAST_RESULT_KEY]);

const suggestedFocus = useMemo<FocusGoal>(() => {
  const last = history?.[0];
  if (!last) return "clarity";

  const wpmLast = typeof last.wpm === "number" ? last.wpm : null;
  if (wpmLast !== null && (wpmLast < 100 || wpmLast > 165)) return "pace";

  const fillerPer100 = last.feedback?.filler?.per100;
  if (typeof fillerPer100 === "number" && fillerPer100 >= 3) return "fillers";

  const mono = last.prosody?.monotoneScore;
  if (typeof mono === "number" && mono <= 4) return "vocal_variety";

  const star = last.feedback?.star;
  if (star && typeof star.result === "number" && star.result <= 6) return "star_result";

  return "clarity";
}, [history]);

const activeFocus = focusGoal ?? suggestedFocus;

const focusCopy: Record<FocusGoal, { title: string; tip: string }> = {
  pace: {
    title: "Pace",
    tip: "Aim 115–145 wpm. Pause after metrics and outcomes.",
  },
  fillers: {
    title: "Fillers",
    tip: "Replace “um/like” with a one-beat pause. Keep sentences shorter.",
  },
  star_result: {
    title: "STAR Result",
    tip: "End with 1 crisp outcome + metric (%, $, time, SLA).",
  },
  vocal_variety: {
    title: "Vocal variety",
    tip: "Emphasize numbers + outcomes; vary pitch at sentence ends.",
  },
  clarity: {
    title: "Clarity",
    tip: "Lead with your claim, then 2 supporting points, then result.",
  },
};
  const capHit = !entitlement?.isPro && entitlement?.remaining === 0;

const analyzeDisabled =
  feedbackLoading ||
  !transcript.trim();
  const [prosody, setProsody] = useState<null | {
  pitchStdHz: number;
  energyStd: number;
  monotoneScore: number; // 1-10
  feedback: string;
}>(null);

const chartPoints = history
  .slice(0, 20)
  .reverse(); // oldest -> newest


const scores = chartPoints
  .map((h) => {
    if (trendMetric === "communication")
      return Number(h.communication_score ?? h.feedback?.communication_score ?? NaN);

    if (trendMetric === "confidence")
      return Number(h.confidence_score ?? h.feedback?.confidence_score ?? NaN);

    if (trendMetric === "pace")
      return typeof h.wpm === "number" ? Number(h.wpm) : NaN;

    if (trendMetric === "fillers")
      return Number(h.feedback?.filler?.per100 ?? NaN);

    if (trendMetric === "star_result")
      return Number(h.feedback?.star?.result ?? NaN);

    if (trendMetric === "vocal_variety")
      return Number(h.prosody?.monotoneScore ?? NaN);

    return Number(h.score ?? NaN);
  })
  .filter((n) => Number.isFinite(n));

  const scorePoints = scores.length ? scores : [0];


function trendMeta(metric: TrendMetric) {
  switch (metric) {
    case "communication":
      return { label: "Communication (0–10)", max: 10 };
    case "confidence":
      return { label: "Confidence (0–10)", max: 10 };
    case "pace":
      return { label: "Pace (WPM)", max: 220 }; // good default cap
    case "fillers":
      return { label: "Fillers (per 100 words)", max: 20 }; // typical range
    case "star_result":
      return { label: "STAR – Result (0–10)", max: 10 };
    case "vocal_variety":
      return { label: "Vocal variety (0–10)", max: 10 };
    default:
      return { label: "Overall (0–10)", max: 10 };
  }
}


const lastScore = scores.length ? scores[scores.length - 1] : null;
const prevScore = scores.length > 1 ? scores[scores.length - 2] : null;
const delta = lastScore !== null && prevScore !== null ? lastScore - prevScore : null;

const avgScore =
  scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
const minScore = scores.length ? Math.min(...scores) : null;
const maxScore = scores.length ? Math.max(...scores) : null;

const sparkW = 100;
const sparkH = 90;
const { max: yMax } = trendMeta(trendMetric);
const sparkPath = buildSparkPath(scores, sparkW, sparkH, 6, yMax);

// Command+F anchor: const coachingInsights =
const coachingInsights = useMemo(() => {
  if (!history.length) return [];

  const last = history[0];
  const last5 = history.slice(0, 5);

  // --- Helpers ---
  const isNum = (n: any) => typeof n === "number" && Number.isFinite(n);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const pickNums = (arr: any[], fn: (h: any) => any) =>
    arr.map(fn).filter((x) => isNum(x)) as number[];

  // --- Core series ---
  const overall = pickNums(last5, (h) => h.score);
  const comm = pickNums(last5, (h) => h.communication_score ?? h.feedback?.communication_score);
  const conf = pickNums(last5, (h) => h.confidence_score ?? h.feedback?.confidence_score);

  const spoken = last5.filter((h) => h.inputMethod === "spoken");
  const wpmSeries = pickNums(spoken, (h) => h.wpm);

  const fillerSeries = pickNums(last5, (h) => h.feedback?.filler?.per100);
  const starResultSeries = pickNums(last5, (h) => h.feedback?.star?.result);

  const monoSeries = pickNums(spoken, (h) => h.prosody?.monotoneScore);

  // --- Trend (compare most recent vs oldest in window) ---
  const trend = (arr: number[]) => (arr.length >= 2 ? arr[0] - arr[arr.length - 1] : 0);

  const tips: string[] = [];

  // 1) Overall trend callout (more specific)
  if (overall.length >= 2) {
    const d = trend(overall);
    if (d >= 1) tips.push(`Up ${d.toFixed(1)} overall in your last ${overall.length} attempts — keep the same structure and tighten the close.`);
    else if (d <= -1) tips.push(`Down ${Math.abs(d).toFixed(1)} overall recently — simplify: 1 claim → 2 support points → 1 result line.`);
    else tips.push(`Stable overall lately — pick ONE lever next attempt (STAR result, fillers, pace, or vocal variety).`);
  }

  // 2) Biggest lever (lowest average dimension)
  const aOverall = avg(overall);
  const aComm = avg(comm);
  const aConf = avg(conf);

  if (aOverall !== null && aComm !== null && aConf !== null) {
    const entries = [
      { k: "overall", v: aOverall },
      { k: "communication", v: aComm },
      { k: "confidence", v: aConf },
    ].sort((x, y) => x.v - y.v);

    const weakest = entries[0];
    if (weakest.k === "communication") tips.push(`Biggest lever: Communication (avg ${aComm.toFixed(1)}/10). Shorten sentences + remove softeners (“kind of”, “maybe”).`);
    if (weakest.k === "confidence") tips.push(`Biggest lever: Confidence (avg ${aConf.toFixed(1)}/10). Start with a strong claim, then deliver 1 metric earlier.`);
    if (weakest.k === "overall") tips.push(`Biggest lever: Overall (avg ${aOverall.toFixed(1)}/10). Add a crisp “Result” sentence with a measurable outcome.`);
  }

  // 3) STAR Result weakness (only if it’s truly showing up)
  const aStarR = avg(starResultSeries);
  if (aStarR !== null && aStarR <= 6) {
    tips.push(`STAR “Result” is weak (avg ${aStarR.toFixed(1)}/10). End with: “Result: improved X by Y% / saved $Z / reduced time by N days.”`);
  }

  // 4) Fillers pattern
  const aFill = avg(fillerSeries);
  if (aFill !== null && aFill >= 3) {
    tips.push(`Fillers are hurting clarity (~${aFill.toFixed(1)}/100 words). Replace “um/like” with a one-beat pause + continue.`);
  }

  // 5) Pace (spoken only)
  const aWpm = avg(wpmSeries);
  if (aWpm !== null) {
    if (aWpm < 100) tips.push(`Spoken pace trends slow (avg ${Math.round(aWpm)} wpm). Tighten pauses—aim 115–145.`);
    if (aWpm > 165) tips.push(`Spoken pace trends fast (avg ${Math.round(aWpm)} wpm). Add micro-pauses after metrics.`);
  }

  // 6) Vocal variety (spoken only)
  const aMono = avg(monoSeries);
  if (aMono !== null && aMono <= 4) {
    tips.push(`Vocal variety is low (avg ${aMono.toFixed(1)}/10). Lift pitch on outcomes + emphasize numbers.`);
  }

  // Optional: last-attempt “next action” (super specific)
  if (last?.feedback?.star && isNum(last.feedback?.star.result) && last.feedback?.star.result <= 6) {
    tips.push(`Next attempt: add ONE final result line (“Result: …”) even if it’s a rough estimate.`);
  }

  return tips.slice(0, 4);
}, [history]);


useEffect(() => {
  // Auto-switch chart to match focus (but only if user hasn't manually changed it)
  // Simple version: always follow focus
  if (activeFocus === "pace") setTrendMetric("pace");
  else if (activeFocus === "fillers") setTrendMetric("fillers");
  else if (activeFocus === "star_result") setTrendMetric("star_result");
  else if (activeFocus === "vocal_variety") setTrendMetric("vocal_variety");
  else setTrendMetric("overall");
}, [activeFocus]);




function persistHomeState(
  next?: Partial<{
    jobDesc: string;
    questions: string[];
    questionBuckets: QuestionBuckets | null;
    transcript: string;
    selectedQuestion: string;
    mode: "setup" | "questions" | "answer";
  }>
) {
  if (!hydratedRef.current) return;

  try {
    // Read previous from either scoped or fallback
    const raw =
      localStorage.getItem(HOME_STATE_KEY) ||
      localStorage.getItem(HOME_STATE_FALLBACK_KEY);

    const prev = raw ? JSON.parse(raw) : {};
    const merged = { ...prev, ...next };

    const json = JSON.stringify(merged);

    // Always write fallback
    localStorage.setItem(HOME_STATE_FALLBACK_KEY, json);

    // Also write scoped if available
    if (HOME_STATE_KEY) localStorage.setItem(HOME_STATE_KEY, json);
  } catch {}
}



function restoreHomeState() {
  try {
    const raw =
      localStorage.getItem(HOME_STATE_KEY) ||
      localStorage.getItem(HOME_STATE_FALLBACK_KEY);

    if (!raw) return;

    const parsed = JSON.parse(raw);

    if (typeof parsed.jobDesc === "string") setJobDesc(parsed.jobDesc);
    if (Array.isArray(parsed.questions)) setQuestions(parsed.questions);

    if (parsed.questionBuckets && typeof parsed.questionBuckets === "object") {
      setQuestionBuckets(parsed.questionBuckets);
    }

    if (typeof parsed.transcript === "string") setTranscript(parsed.transcript);
    if (typeof parsed.selectedQuestion === "string") setSelectedQuestion(parsed.selectedQuestion);

    // If mode wasn't persisted (older data), infer it from existing state
    const inferredMode =
      (typeof parsed.selectedQuestion === "string" && parsed.selectedQuestion.trim().length > 0)
        ? "answer"
        : (Array.isArray(parsed.questions) && parsed.questions.length > 0)
        ? "questions"
        : "setup";

    // Only set mode if persisted value isn't present/valid
    if (parsed.mode === "setup" || parsed.mode === "questions" || parsed.mode === "answer") {
      setMode(parsed.mode);
    } else {
      setMode(inferredMode);
    }

    // Decide mode on restore:
    const hasSelected =
      typeof parsed.selectedQuestion === "string" && parsed.selectedQuestion.trim().length > 0;

    const hasQuestions = Array.isArray(parsed.questions) && parsed.questions.length > 0;

    if (hasSelected) {
      setMode("answer");
    } else if (hasQuestions) {
      setMode("questions");
    } else if (parsed.mode === "setup" || parsed.mode === "questions" || parsed.mode === "answer") {
      setMode(parsed.mode);
    } else {
      setMode("setup");
    }
  } catch {}
}




function calcWpm(text: string, seconds: number | null) {
  if (!seconds || seconds <= 0) return null;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((words / seconds) * 60);
}

function saveHomeState() {
  // This is used right before navigating away (e.g., /results).
  // IMPORTANT: never wipe fields by writing a smaller shape than persistHomeState expects.
  if (!hydratedRef.current) return;

  const payload = {
    jobDesc,
    questions,
    questionBuckets,
    transcript,
    selectedQuestion,
    mode,
  };

  try {
    // user-scoped
    localStorage.setItem(HOME_STATE_KEY, JSON.stringify(payload));
  } catch {}

  try {
    // fallback (works even if session hasn't hydrated yet)
    localStorage.setItem(HOME_STATE_FALLBACK_KEY, JSON.stringify(payload));
  } catch {}
}


const wpm = calcWpm(transcript, durationSeconds);

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function rms(frame: Float32Array) {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

// Rough pitch estimate via autocorrelation (works “good enough” for monotone detection)
// Returns Hz or null if unvoiced/unclear.

// --- Prosody analysis (tighter) ---
// Uses WebAudio pitch detection via AMDF + smoothing + voiced gating.
// Goal: fewer false pitch hits, more stable "vocal variety" score.

function median(nums: number[]) {
  if (!nums.length) return 0;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function iqr(nums: number[]) {
  if (nums.length < 4) return 0;
  const a = [...nums].sort((x, y) => x - y);
  const q1 = a[Math.floor(a.length * 0.25)];
  const q3 = a[Math.floor(a.length * 0.75)];
  return q3 - q1;
}

function movingAvg(nums: number[], win: number) {
  if (!nums.length) return [];
  const w = Math.max(1, Math.floor(win));
  const out: number[] = [];
  for (let i = 0; i < nums.length; i++) {
    let s = 0;
    let c = 0;
    for (let k = Math.max(0, i - w + 1); k <= i; k++) {
      s += nums[k];
      c++;
    }
    out.push(s / c);
  }
  return out;
}

// AMDF pitch estimation (more stable than naive autocorr for noisy mics)
function estimatePitchHzAMDF(frame: Float32Array, sampleRate: number) {
  // Energy gate (ignore silence)
  const e = rms(frame);
  if (e < 0.012) return null;

  // Typical speech pitch range
  const minHz = 85;
  const maxHz = 300;
  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.floor(sampleRate / minHz);

  // Remove DC
  let mean = 0;
  for (let i = 0; i < frame.length; i++) mean += frame[i];
  mean /= frame.length;

  // AMDF: average magnitude difference
  let bestLag = -1;
  let bestVal = Number.POSITIVE_INFINITY;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    const n = frame.length - lag;
    for (let i = 0; i < n; i++) {
      const a = frame[i] - mean;
      const b = frame[i + lag] - mean;
      sum += Math.abs(a - b);
    }
    const v = sum / n;
    if (v < bestVal) {
      bestVal = v;
      bestLag = lag;
    }
  }

  if (bestLag < 0) return null;

  // Voicing confidence heuristic:
  // Compare best AMDF to median AMDF across search window (lower is better)
  // If "best" isn't much better than typical, treat as unvoiced.
  // (Keeps pitch from jumping on noise.)
  // We'll do a lightweight second pass around bestLag to estimate "contrast".
  const window = 6;
  let local: number[] = [];
  for (let lag = Math.max(minLag, bestLag - window); lag <= Math.min(maxLag, bestLag + window); lag++) {
    let sum = 0;
    const n = frame.length - lag;
    for (let i = 0; i < n; i++) {
      const a = frame[i] - mean;
      const b = frame[i + lag] - mean;
      sum += Math.abs(a - b);
    }
    local.push(sum / n);
  }
  const med = median(local);
  if (med <= 1e-6) return null;

  // Require "contrast" (best significantly below median)
  if (bestVal / med > 0.92) return null;

  return sampleRate / bestLag;
}

function stddev(nums: number[]) {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const varr = nums.reduce((acc, x) => acc + (x - mean) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(varr);
}

async function analyzeProsodyFromBlob(blob: Blob) {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

  const arrayBuf = await blob.arrayBuffer();
  const audioBuf = await audioCtx.decodeAudioData(arrayBuf);

  const channel = audioBuf.getChannelData(0);
  const sr = audioBuf.sampleRate;

  // Slightly longer frames for stability: 50ms frames, 25ms hop
  const frameSize = Math.floor(sr * 0.05);
  const hop = Math.floor(sr * 0.025);

  const pitches: number[] = [];
  const energies: number[] = [];

  for (let start = 0; start + frameSize < channel.length; start += hop) {
    const frame = channel.slice(start, start + frameSize);

    const e = rms(frame);
    energies.push(e);

    const p = estimatePitchHzAMDF(frame, sr);
    if (p !== null) pitches.push(p);
  }

  // Smooth pitch slightly to reduce spiky detections
  const pitchSmooth = movingAvg(pitches, 3);

  // Robust pitch variation: remove wild outliers first
  // (Using IQR guardrail)
  const pMed = median(pitchSmooth);
  const pIqr = iqr(pitchSmooth) || 0;
  const lo = pMed - 2.5 * pIqr;
  const hi = pMed + 2.5 * pIqr;

  const pitchClean =
    pIqr > 0 ? pitchSmooth.filter((p) => p >= lo && p <= hi) : pitchSmooth;

  const pitchStdHz = stddev(pitchClean);

  // Energy variation
  const energySmooth = movingAvg(energies, 3);
  const energyStd = stddev(energySmooth);

  // Map to a 1–10 score (tighter anchors)
  // Typical "good variety" pitch std: ~25–60Hz
  // Monotone tends to be < ~18Hz (after cleaning)
  const pitchScore = clamp((pitchStdHz - 10) / 5, 0, 10); // 10->0, 60->10
  const energyScore = clamp((energyStd - 0.008) / 0.012, 0, 10); // heuristic for mic variation

  // Weight pitch more than energy
  const monotoneScore = Math.round(clamp(0.75 * pitchScore + 0.25 * energyScore, 1, 10));

  let feedback = "";
  if (monotoneScore <= 3) feedback = "You sound a bit monotone — lift pitch on key points and land sentences confidently.";
  else if (monotoneScore <= 6) feedback = "Moderate vocal variety — emphasize outcomes and pause after metrics.";
  else feedback = "Nice vocal variety — your tone sounds engaging and confident.";

  try { await audioCtx.close(); } catch {}

  return {
    pitchStdHz: Number(pitchStdHz.toFixed(1)),
    energyStd: Number(energyStd.toFixed(3)),
    monotoneScore,
    feedback,
  };
}

useEffect(() => {
  let cancelled = false;

  (async () => {
    try {
      const res = await fetch("/api/attempts?limit=1", { method: "GET" });
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;

      if (data?.entitlement) setEntitlement(data.entitlement as AttemptEntitlement);
    } catch {
      // ignore
    }
  })();

  return () => {
    cancelled = true;
  };
}, []);

useEffect(() => {
  try {
    const raw =
      localStorage.getItem(HISTORY_KEY) ||
      localStorage.getItem(HISTORY_FALLBACK_KEY);

    setHasHistoryLS(!!raw);
    setHistory(raw ? JSON.parse(raw) : []);
  } catch {
    setHasHistoryLS(false);
    setHistory([]);
  }

  // restore home state again too
  try {
    restoreHomeState();
  } catch {}

  hydratedRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [HISTORY_KEY, HOME_STATE_KEY]);


useEffect(() => {
  // Once we know the final scoped key (or fallback), restore state again.
  // This fixes the "session was null, then became real" key flip.
  restoreHomeState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [HOME_STATE_KEY]);

  async function generateQuestions() {
  setLoading(true);
  setError(null);

  try {
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDesc }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data?.error ?? "Something went wrong.");
      setQuestions([]);
      setMode("questions");
      persistHomeState({ mode: "questions"});
      return;
    }

    const b = data?.buckets ?? null;

const qs =
  Array.isArray(data?.questions)
    ? (data.questions as string[]).map(String)
    : b
      ? [
          ...(Array.isArray(b.behavioral) ? b.behavioral : []),
          ...(Array.isArray(b.technical) ? b.technical : []),
          ...(Array.isArray(b.culture) ? b.culture : []),
        ].map(String)
      : [];

setQuestionBuckets(
  b &&
    typeof b === "object" &&
    Array.isArray(b.behavioral) &&
    Array.isArray(b.technical) &&
    Array.isArray(b.culture)
    ? { behavioral: b.behavioral.map(String), technical: b.technical.map(String), culture: b.culture.map(String) }
    : null
);

setQuestions(qs);
persistHomeState({ questions: qs, questionBuckets: b ? {
  behavioral: (Array.isArray(b.behavioral) ? b.behavioral : []).map(String),
  technical: (Array.isArray(b.technical) ? b.technical : []).map(String),
  culture: (Array.isArray(b.culture) ? b.culture : []).map(String),
} : null });

setMode("questions");


if (qs.length) setShowQuestions(true);


  } catch {
    setError("Network error. Check your server is running.");
    setQuestions([]);
  } finally {
    setLoading(false);
  }
}

function stopWaveform() {
  if (animationRef.current) {
    cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
  }
}

function drawWaveform() {
  const canvas = waveformCanvasRef.current;
  const analyser = analyserRef.current;
  if (!canvas || !analyser) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);

  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 420;
  const cssH = canvas.clientHeight || 90;

  // Ensure crisp drawing on retina
  const neededW = Math.floor(cssW * dpr);
  const neededH = Math.floor(cssH * dpr);
  if (canvas.width !== neededW || canvas.height !== neededH) {
    canvas.width = neededW;
    canvas.height = neededH;
  }

  function frame() {
    // Re-read refs each frame (prevents stale refs)
    const canvasNow = waveformCanvasRef.current;
    const analyserNow = analyserRef.current;
    if (!canvasNow || !analyserNow) return;

    const ctxNow = canvasNow.getContext("2d");
    if (!ctxNow) return;

    analyserNow.getByteTimeDomainData(dataArray);

    ctxNow.clearRect(0, 0, canvasNow.width, canvasNow.height);

    // Background
    ctxNow.fillStyle = "rgba(255,255,255,0.03)";
    ctxNow.fillRect(0, 0, canvasNow.width, canvasNow.height);

    // Line
    ctxNow.lineWidth = 2 * dpr;
    ctxNow.strokeStyle = "rgba(34,211,238,0.95)";
    ctxNow.beginPath();

    const sliceWidth = canvasNow.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvasNow.height) / 2;

      if (i === 0) ctxNow.moveTo(x, y);
      else ctxNow.lineTo(x, y);

      x += sliceWidth;
    }

    ctxNow.stroke();

    animationRef.current = requestAnimationFrame(frame);
  }

  stopWaveform();
  frame();
}


function startWaveform(stream: MediaStream) {
  try {
    // close any previous context
    try {
      audioCtxRef.current?.close();
    } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx: AudioContext = new AudioCtx();
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048; // good default
    analyserRef.current = analyser;

    source.connect(analyser);

    drawWaveform();
  } catch {
    // ignore waveform failures
  }
}

function cleanupWaveform() {
  stopWaveform();

  try {
    analyserRef.current?.disconnect();
  } catch {}
  analyserRef.current = null;

  try {
    audioCtxRef.current?.close();
  } catch {}
  audioCtxRef.current = null;
}




async function startRecording() {
    setTimeLeft(answerTimeLimit);
  setTimerRunning(true);
  setMode("answer");
  setVoiceError(null);
  setTranscript("");
  setDurationSeconds(null);

  attemptIdRef.current = crypto.randomUUID();

  const chunks: BlobPart[] = [];

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    startWaveform(stream);


    // Chrome-safe: record as webm/opus
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const mr = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mr.onstop = async () => {
    
      const durationSeconds =
      recordingStartRef.current
    ? (Date.now() - recordingStartRef.current) / 1000
    : 0;

      // stop mic
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      cleanupWaveform();


      try {
        const blob = new Blob(chunks, { type: "audio/webm" });
        // ✅ Save audio for replay
try {
  if (attemptIdRef.current) {
    await idbPutAudio(attemptIdRef.current, blob);
  }
} catch {
  // ignore storage errors (quota/private mode)
}
        // Prosody / monotone analysis (local)
      try {
        const pros = await analyzeProsodyFromBlob(blob);
        setProsody(pros);
      } catch {
        setProsody(null);
      }

        const file = new File([blob], "answer.webm", { type: "audio/webm" });

        const form = new FormData();
      form.append("audio", file);
      form.append("duration", String(durationSeconds));


        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });

        const data = await res.json();

        if (!res.ok) {
          setVoiceError(data?.error ?? "Transcription failed.");
          return;
        }

        const text = data.text ?? "";

setTranscript(text);
setDurationSeconds(typeof data.durationSeconds === "number" ? data.durationSeconds : null);

// mark as spoken
setInputMethod("spoken");
lastTranscribedRef.current = text;

        
      } catch {
        setVoiceError("Upload/transcription failed.");
      }
    };
    recordingStartRef.current = Date.now();
    mr.start();
    setRecording(true);
  } catch {
    setVoiceError("Mic permission denied or unavailable.");
  }
}

function stopRecording() {
  setTimerRunning(false);
  const mr = mediaRecorderRef.current;
  if (!mr) return;

  cleanupWaveform();


  setRecording(false);

  mr.stop();
  mediaRecorderRef.current = null;
}

async function analyzeAnswer() {
  if (capHit) {
  setError("Redirecting to upgrade...");

  try {
    const checkoutRes = await fetch("/api/billing/checkout", { method: "POST" });
    const checkoutData = await checkoutRes.json();

    if (checkoutData?.url) {
      window.location.href = checkoutData.url;
      return;
    }
  } catch {}

  return;
}
  setFeedback(null);
  setError(null);

  if (!transcript.trim()) {
    setError("Record an answer first so we have a transcript to analyze.");
    return;
  }

    if (!selectedQuestion.trim()) {
    setError("Select a question first (open Questions and pick one).");
    return;
  }


  setFeedbackLoading(true);
  // --- progress bar start ---
setProgress(0);

// clear any existing timer
if (progressTimerRef.current) {
  window.clearInterval(progressTimerRef.current);
  progressTimerRef.current = null;
}

// climb toward 90% while waiting
progressTimerRef.current = window.setInterval(() => {
  setProgress((p) => {
    const next = p + Math.max(0.8, (90 - p) * 0.08);
    return Math.min(90, next);
  });
}, 200);
// --- end progress bar start ---


  posthog.capture("attempt_submitted", {
  inputMethod, // spoken or pasted
});

  try {
    const res = await fetch("/api/feedback", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jobDesc,
    question: selectedQuestion,
    transcript,
  }),
});

if (res.status === 402) {
  setUpgradeOpen(true);
  setFeedbackLoading(false);
  return;
}

const data = await res.json();

if (!res.ok) {
  setError(data?.error ?? "Feedback failed.");
  setFeedbackLoading(false);
  return;
}

    setFeedback(data);

    const entry = {
  id: crypto.randomUUID(),
  ts: Date.now(),
  question: selectedQuestion || "",
  transcript,
  wpm: inputMethod === "spoken" ? wpm : null,
  inputMethod,
  audioId: inputMethod === "spoken" ? attemptIdRef.current : null,
  prosody,
  feedback: data,
  score: data.score,
  communication_score: data.communication_score,
  confidence_score: data.confidence_score,
  focusGoal: activeFocus,
  jobDesc,
  questions,
  questionBuckets,

};


    // ✅ Save history FIRST
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 50);
      try {
  const json = JSON.stringify(next);
  localStorage.setItem(HISTORY_FALLBACK_KEY, json);
  if (HISTORY_KEY) localStorage.setItem(HISTORY_KEY, json);
} catch {}
      return next;
    });

   
    // ✅ Save last result for /results page (session + local fallback)
// ✅ Save last result for /results page (session + local fallback)
try {
  const lastResult = {
    ts: entry.ts,
    question: entry.question,
    transcript: entry.transcript,
    wpm: entry.wpm ?? null,
    prosody: entry.prosody ?? null,
    feedback: entry.feedback,

    jobDesc: entry.jobDesc ?? "",
    questions: Array.isArray(entry.questions) ? entry.questions : [],
    questionBuckets: entry.questionBuckets ?? null,
  };

  const json = JSON.stringify(lastResult);

  // ✅ ALWAYS write a fallback key
  sessionStorage.setItem("ipc_last_result", json);
  localStorage.setItem("ipc_last_result", json);

  // ✅ If user-scoped key exists, write it too
  if (LAST_RESULT_KEY) {
    sessionStorage.setItem(LAST_RESULT_KEY, json);
    localStorage.setItem(LAST_RESULT_KEY, json);
  }
} catch {}

// ✅ Save to DB (best-effort)
try {


  const res = await fetch("/api/attempts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ts: entry.ts,
      question: entry.question,
      transcript: entry.transcript,
      inputMethod: entry.inputMethod,
      wpm: entry.wpm,
      prosody: entry.prosody,
      feedback: entry.feedback,
      score: entry.score,
      communication_score: entry.communication_score,
      confidence_score: entry.confidence_score,
      focusGoal: entry.focusGoal ?? null,
      jobDesc: entry.jobDesc ?? null,
      audioId: entry.audioId ?? null,
      durationSeconds: durationSeconds ?? null,
    }),
  });

  const data = await res.json().catch(() => null);

  if (res.status === 429) {
  const ms = typeof data?.retryAfterMs === "number" ? data.retryAfterMs : 30_000;
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  setError(`Too many requests. Please try again in ${seconds}s.`);
}

if (res.status === 413) {
  const msg =
    data?.error === "TRANSCRIPT_TOO_LONG"
      ? "Your response is too long. Please shorten it and try again."
      : data?.error === "JOBDESC_TOO_LONG"
      ? "That job description is too long. Please shorten it and try again."
      : data?.error === "QUESTION_TOO_LONG"
      ? "That question text is too long. Please shorten it and try again."
      : "Request too large. Please shorten your text and try again.";

  setError(msg);
}

  if (res.status === 402 && data?.error === "FREE_LIMIT_REACHED") {
  setError("You’ve used all free attempts. Redirecting to upgrade...");

  try {
    const checkoutRes = await fetch("/api/billing/checkout", { method: "POST" });
    const checkoutData = await checkoutRes.json();

    if (checkoutData?.url) {
      window.location.href = checkoutData.url;
      
    }
  } catch {}

}

if (res.status === 403 || res.status ===402) {
  setError(data?.error ? String(data.error) : "Not allowed.");

}

if (!res.ok) {
  setError(data?.error ? String(data.error) : "Failed to save attempt.");
}

// ✅ Save updated entitlement from the server (keeps counter perfectly in sync)
if (data?.entitlement) {
  // Replace this setter name with whatever you already use in the component
  // Common patterns: setEntitlement(data.entitlement) or setRemainingAttempts(...)
  setEntitlement(data.entitlement);
}

} catch (e) {}

saveHomeState();
persistHomeState();

// Hard redirect on next tick, then STOP running this function
setTimeout(() => {
  // If you have a basePath/locale, this preserves the current origin cleanly
  window.location.href = new URL("/results", window.location.href).toString();
}, 0);

return;




  } catch {
    setError("Network error during feedback.");
  } finally {
  // stop progress timer
  if (progressTimerRef.current) {
    window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = null;
  }

  // finish the bar
  setProgress(100);

  // hide overlay a beat later so they see completion
  window.setTimeout(() => setFeedbackLoading(false), 250);

  // reset for next run
  window.setTimeout(() => setProgress(0), 600);
}
}






return (
  <PremiumShell hideHeader>

    <div style={{ marginTop: 10, marginBottom: 24 }}>
  <div style={{ fontSize: 42, fontWeight: 950, color: "#E5E7EB", letterSpacing: -0.8, lineHeight: 1.05 }}>
    Practice interviews with AI feedback
  </div>

  <div style={{ marginTop: 10, fontSize: 16, color: "#9CA3AF", maxWidth: 760, lineHeight: 1.6 }}>
    Record answers, get scoring on communication, confidence, STAR structure, fillers, pace, and vocal variety —
    then follow a game plan for your next attempt.
  </div>

  <div style={{ marginTop: 14, fontSize: 13, color: "#6B7280" }}>
  Paste a job description to begin generating tailored interview questions.
</div>

</div>

{mode === "answer" ? (
  <div
    style={{
      marginTop: 16,
      padding: "16px 18px",
      borderRadius: 20,
      border: "1px solid rgba(34,211,238,0.35)",
      background:
        "radial-gradient(900px 420px at 15% -10%, rgba(34,211,238,0.16), transparent 60%), rgba(255,255,255,0.02)",
      transform: "translateY(0px)",
      opacity: 1,
      transition: "opacity 200ms ease, transform 200ms ease",
    }}
  >
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#9CA3AF" }}>
          SELECTED QUESTION
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 18,
            lineHeight: 1.55,
            fontWeight: 950,
            color: "#E5E7EB",
            wordBreak: "break-word",
          }}
        >
          {selectedQuestion}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          // Go back to the question list (keep previously generated questions)
          setSelectedQuestion("");
          setMode(questions.length ? "questions" : "setup");
          persistHomeState({ selectedQuestion: "", mode: questions.length ? "questions" : "setup" });
        }}
        style={{
          flex: "0 0 auto",
          padding: "9px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
          color: "#E5E7EB",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 900,
          whiteSpace: "nowrap",
        }}
      >
        Change question
      </button>
    </div>
  </div>
) : null}

  <div
  style={{
    marginTop: 24,
    padding: 18,
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.08)",
    background:
      "radial-gradient(900px 400px at 20% -10%, rgba(99,102,241,0.14), transparent 60%), rgba(255,255,255,0.02)",
  }}
>
  <div
    style={{
      display: "grid",
      gridTemplateColumns: mode === "answer" ? "1fr" : "1fr 1fr",
      gap: 24,
      alignItems: "start",
      width: "100%",
    }}
  >


  <PremiumCard>

    {(mode=== "setup" || mode === "questions") ? (
      <>

{/* ===== SECTION: Job Description ===== */}
<div
  style={{
    marginTop: 24,
    padding: 18,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
  }}
>
  
  {/* Section Label */}
  <div
    style={{
      fontSize: 11,
      fontWeight: 900,
      letterSpacing: 0.8,
      color: "#9CA3AF",
    }}
  >
    SETUP
  </div>

  {/* Title Row */}
  <div
    style={{
      marginTop: 6,
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
    }}
  >
    <h2
      style={{
        margin: 0,
        fontSize: 18,
        fontWeight: 900,
        color: "#E5E7EB",
      }}
    >
      Job Description
    </h2>

    <div style={{ fontSize: 12, color: "#9CA3AF" }}>
      {jobDesc.length.toLocaleString()} chars
    </div>
  </div>

  {/* Helper */}
  <div
    style={{
      marginTop: 4,
      fontSize: 13,
      color: "#9CA3AF",
      lineHeight: 1.5,
    }}
  >
    Paste the role description. We’ll generate tailored interview questions.
  </div>

  {/* Divider */}
  <div
    style={{
      marginTop: 14,
      height: 1,
      background: "rgba(255,255,255,0.06)",
      borderRadius: 999,
    }}
  />

  {/* Textarea */}
  <textarea
  value={jobDesc}
  onChange={(e) => {
    const v = e.target.value;
    setJobDesc(v);
    persistHomeState({ jobDesc: v });
  }}
  placeholder="Paste the job description here…"
  style={{
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box", // ✅ stops bleed
    display: "block",

    height: 220,
    marginTop: 14,
    padding: 14,

    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 0.2,
    lineHeight: 1.5,

    color: "#E5E7EB",
    background: "rgba(17,24,39,0.55)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    outline: "none",
    resize: "vertical",
  }}
/>


  {/* Actions */}
  <div
    style={{
      marginTop: 14,
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}
  >
    <button
      onClick={generateQuestions}
      disabled={jobDesc.trim().length < 30}
      {...hoverLiftHandlers()}
      style={withHoverLift({
        padding: "10px 16px",
        fontSize: 14,
        fontWeight: 900,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          jobDesc.trim().length < 30
            ? "rgba(255,255,255,0.04)"
            : "linear-gradient(90deg, rgba(99,102,241,0.40), rgba(34,211,238,0.28))",
        color: "#E5E7EB",
        cursor: jobDesc.trim().length < 30 ? "not-allowed" : "pointer",
        opacity: jobDesc.trim().length < 30 ? 0.55 : 1,
      })}
    >
      {loading ? "Generating..." : "Generate Questions"}
    </button>

    <button
      type="button"
      onClick={() => {
  setQuestions([]);
  setQuestionBuckets(null);
  setMode("questions");

  // ✅ persist cleared state so refresh/back doesn't resurrect old data
  persistHomeState({ questions: [], questionBuckets: null, selectedQuestion: "" });
  setSelectedQuestion("");
}}

      style={{
        padding: "10px 16px",
        fontSize: 14,
        fontWeight: 800,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
        color: "#E5E7EB",
        cursor: "pointer",
      }}
    >
      Clear
    </button>

    <div style={{ marginLeft: "auto", fontSize: 12, color: "#9CA3AF" }}>
      Minimum 30 characters
    </div>
    <div style={{ marginTop: 10, fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>
  By using this tool, you agree to our{" "}
  <a href="/terms" style={{ color: "#A5F3FC", fontWeight: 900, textDecoration: "none" }}>
    Terms
  </a>{" "}
  and{" "}
  <a href="/privacy" style={{ color: "#A5F3FC", fontWeight: 900, textDecoration: "none" }}>
    Privacy Policy
  </a>
  .
</div>
  </div>

  {error && (
    <div style={{ marginTop: 10, fontSize: 13, color: "#FCA5A5" }}>
      {error}
    </div>
  )}
</div>
</>


     

  
    ) : null}
</PremiumCard>

<PremiumCard>
  <div
  style={{
    marginTop: 30,
    padding: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 12,

    // 🔑 important
    position: "relative",
    overflow: "visible",
  }}
>


  
{mode === "questions" ? (
  <div style={{ display: "grid", gap: 14 }}>
    <div
      style={{
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 0.8,
        color: "#9CA3AF",
      }}
    >
      GENERATED QUESTIONS
    </div>

    {questions.length === 0 ? (
      <div style={{ fontSize: 13, color: "#9CA3AF" }}>
        No questions generated yet.
      </div>
    ) : (
      <div style={{ display: "grid", gap: 10 }}>
        {questions.map((q, idx) => {
          const active = selectedQuestion === q;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedQuestion(q);
                persistHomeState({ selectedQuestion: q });
                setMode("answer");
                persistHomeState({ mode: "answer"});
              }}
              style={{
                textAlign: "left",
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: active
                  ? "1px solid rgba(34,211,238,0.45)"
                  : "1px solid rgba(255,255,255,0.08)",
                background: active
                  ? "rgba(34,211,238,0.08)"
                  : "rgba(255,255,255,0.04)",
                fontSize: 14,
                lineHeight: 1.5,
                color: "#E5E7EB",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ color: "#9CA3AF", fontWeight: 700 }}>{idx + 1}.</span>
                <span>{q}</span>
              </div>
            </button>
          );
        })}
      </div>
    )}
  </div>
) : null}


{mode === "answer" ? (
  <>
  
{/* ===== RIGHT COLUMN HEADER ===== */}


<div
  style={{
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 12,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  }}
>
  <div>
    <div
      style={{
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 0.8,
        color: "#9CA3AF",
      }}
    >
      PRACTICE
    </div>

    <h2
      style={{
        margin: "6px 0 0 0",
        fontSize: 18,
        fontWeight: 900,
        color: "#E5E7EB",
      }}
    >
      Voice Practice
    </h2>

    <div style={{ marginTop: 4, fontSize: 13, color: "#9CA3AF", lineHeight: 1.5 }}>
      Record like a real interview. We’ll transcribe and score your answer.
    </div>
  </div>

  <button
    type="button"
    onClick={() => setShowAdvanced((v) => !v)}
    style={{
      padding: "9px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.10)",
      background: showAdvanced ? "rgba(34,211,238,0.10)" : "rgba(255,255,255,0.04)",
      color: showAdvanced ? "#A5F3FC" : "#E5E7EB",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 900,
      whiteSpace: "nowrap",
    }}
  >
    {showAdvanced ? "Hide insights" : "Advanced insights"}
  
  </button>
</div>

<CollapsibleNoteCard
  title="NEXT ATTEMPT FOCUS"
  summary={`${focusCopy[activeFocus].title}: ${focusCopy[activeFocus].tip}`}
  defaultOpen={false}
>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
    <div style={{ fontSize: 12, color: "#9CA3AF" }}>
      {focusGoal ? "Locked by you" : "Suggested from recent attempts"}
    </div>

    <span
      style={{
        fontSize: 11,
        fontWeight: 900,
        padding: "4px 10px",
        borderRadius: 999,
        border: focusGoal
          ? "1px solid rgba(34,211,238,0.40)"
          : "1px solid rgba(255,255,255,0.10)",
        color: focusGoal ? "#A5F3FC" : "#9CA3AF",
        background: focusGoal ? "rgba(34,211,238,0.10)" : "rgba(255,255,255,0.03)",
        whiteSpace: "nowrap",
      }}
    >
      {focusCopy[activeFocus].title}
    </span>
  </div>

  <div style={{ marginTop: 10, fontSize: 13, color: "#E5E7EB", fontWeight: 900 }}>
  {focusCopy[activeFocus].tip}
</div>

<div style={{ marginTop: 8, fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>
  Next attempt: focus on <span style={{ color: "#A5F3FC", fontWeight: 900 }}>{focusCopy[activeFocus].title}</span>{" "}
  while recording, then hit <span style={{ color: "#E5E7EB", fontWeight: 900 }}>Analyze Answer</span>.
</div>

  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
    {(["clarity", "star_result", "fillers", "pace", "vocal_variety"] as FocusGoal[]).map((k) => {
      const selected = activeFocus === k;
      return (
        <button
          key={k}
          type="button"
          onClick={() => saveFocus(k)}
          style={{
            padding: "7px 10px",
            borderRadius: 999,
            border: selected
              ? "1px solid rgba(34,211,238,0.45)"
              : "1px solid rgba(255,255,255,0.10)",
            background: selected ? "rgba(34,211,238,0.10)" : "rgba(255,255,255,0.04)",
            color: selected ? "#A5F3FC" : "#E5E7EB",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {focusCopy[k].title}
        </button>
      );
    })}

    {focusGoal ? (
      <button
        type="button"
        onClick={() => saveFocus(null)}
        style={{
          padding: "7px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "transparent",
          color: "#9CA3AF",
          fontSize: 12,
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        Reset
      </button>
    ) : null}
  </div>
</CollapsibleNoteCard>

{(() => {
  const mm = Math.floor(timeLeft / 60);
  const ss = timeLeft % 60;
  const label = `${mm}:${ss.toString().padStart(2, "0")}`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>⏱</span>
        <span style={{ fontWeight: 900 }}>Time left:</span>
        <span>{label}</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
        

        <button
          type="button"
          onClick={() => {
            setTimerRunning(false);
            setTimeLeft(answerTimeLimit);
          }}
          style={{
            height: 28,
            padding: "0 10px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "#E5E7EB",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
})()}

{/* Controls */}
<div style={{ padding: 12, paddingTop: 8, display: "flex", gap: 10 }}>
    <button
      type="button"
      onClick={startRecording}
      disabled={recording}
      {...hoverLiftHandlers()}
      style={withHoverLift({
        flex: "1 1 0",
        padding: "10px 12px",
        borderRadius: 12,
        border: recording
          ? "1px solid rgba(255,255,255,0.10)"
          : "1px solid rgba(34,211,238,0.35)",
        background: recording ? "rgba(255,255,255,0.04)" : "rgba(34,211,238,0.10)",
        color: recording ? "#9CA3AF" : "#A5F3FC",
        fontSize: 14,
        fontWeight: 900,
        cursor: recording ? "not-allowed" : "pointer",
        opacity: recording ? 0.7 : 1,
      })}
    >
      {recording ? "Recording…" : "Record"}
    </button>

    <button
      type="button"
      onClick={stopRecording}
      disabled={!recording}
      style={{
        flex: "1 1 0",
        padding: "10px 12px",
        borderRadius: 12,
        border: !recording
          ? "1px solid rgba(255,255,255,0.10)"
          : "1px solid rgba(255,255,255,0.18)",
        background: !recording ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)",
        color: !recording ? "#9CA3AF" : "#E5E7EB",
        fontSize: 14,
        fontWeight: 900,
        cursor: !recording ? "not-allowed" : "pointer",
        opacity: !recording ? 0.7 : 1,
      }}
    >
      Stop
    </button>
  </div>

{/* Analyze CTA (always visible) */}
<div style={{ padding: "1px 12px 12px 12px" }}>
  {!entitlement?.isPro ? (
    <div style={{ marginTop: 10, color: "#9CA3AF", fontSize: 12 }}>
      Free attempts:{" "}
      <span style={{ color: "#A5F3FC", fontWeight: 900 }}>
        {entitlement?.cap == null ? "—" : `${entitlement.used}/${entitlement.cap}`}
      </span>
      {" · "}
      Remaining:{" "}
      <span style={{ color: "#A5F3FC", fontWeight: 900 }}>
        {entitlement?.remaining == null ? "—" : entitlement.remaining}
      </span>
    </div>
  ) : null}

  <button
    type="button"
    onClick={analyzeAnswer}
    disabled={analyzeDisabled}
    {...hoverLiftHandlers()}
    style={withHoverLift({
      width: "100%",
      padding: "12px 14px",
      fontSize: 14,
      fontWeight: 900,
      borderRadius: 12,
      border: analyzeDisabled
        ? "1px solid rgba(255,255,255,0.10)"
        : "1px solid rgba(34,211,238,0.35)",
      background: analyzeDisabled ? "rgba(255,255,255,0.04)" : "rgba(34,211,238,0.10)",
      color: analyzeDisabled ? "#9CA3AF" : "#A5F3FC",
      cursor: analyzeDisabled ? "not-allowed" : "pointer",
      opacity: analyzeDisabled ? 0.75 : 1,
    })}
  >
    {feedbackLoading ? "Analyzing…" : capHit ? "Upgrade to Continue" : "Analyze Answer"}
  </button>

  <div style={{ marginTop: 8, fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>
    {recording
      ? "Finish speaking, then press Stop."
      : !selectedQuestion.trim()
      ? "Pick a question first (open Questions and select one)."
      : !transcript.trim()
      ? "Record or paste a response to enable analysis."
      : capHit
      ? "You’ve reached the free limit. Upgrade to Pro for unlimited attempts."
      : "Ready — analyze your answer for scoring + next steps."}
  </div>
</div>


{/* Live waveform */}
  <div style={{ padding: "0 12px 12px 12px" }}>
    <canvas
      ref={waveformCanvasRef}
      style={{
        width: "100%",
        height: 90,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(17,24,39,0.55)",
        display: recording ? "block" : "none",
      }}
    />
  </div>

 {voiceError ? (
  <div
    style={{
      marginTop: 12,
      padding: 10,
      borderRadius: 12,
      border: "1px solid rgba(252, 165, 165, 0.35)",
      background: "rgba(252, 165, 165, 0.08)",
      color: "#FCA5A5",
      fontSize: 12,
      fontWeight: 800,
    }}
  >
    {voiceError}
  </div>
) : null}

<div
  style={{
    marginTop: 14,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  }}
>
  {/* Header */}

  <div
    style={{
      padding: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.02)",
    }}
  >
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.6, color: "#E5E7EB" }}>
        TRANSCRIPT
      </div>
      <div style={{ fontSize: 12, color: "#9CA3AF" }}>
        {inputMethod === "spoken" ? "Auto-transcribed from your recording" : "Pasted/typed (pace disabled)"}
      </div>
    </div>

    <span
      style={{
        fontSize: 11,
        fontWeight: 900,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        color: "#9CA3AF",
        whiteSpace: "nowrap",
      }}
    >
      {transcript.trim() ? `${transcript.trim().split(/\s+/).filter(Boolean).length} words` : "Empty"}
    </span>
  </div>
 

  {/* Body */}
  <div style={{ padding: 12 }}>
    <textarea
  value={transcript}
  onChange={(e) => {
    const v = e.target.value;
    setTranscript(v);

    // If they changed what we transcribed, it becomes "pasted/typed"
    if (v !== lastTranscribedRef.current) {
      setInputMethod("pasted");
      setDurationSeconds(null); // ✅ prevent WPM/pace feedback for pasted text
    }
  }}
  placeholder="Your transcript will appear here after you stop recording."
  style={{
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box", // ✅ stops bleed
    display: "block",

    height: 140,
    padding: 12,

    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 0.2,
    lineHeight: 1.5,

    color: "#E5E7EB",
    background: "rgba(17,24,39,0.55)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 12,
    outline: "none",
    resize: "vertical",
  }}
/>


  </div>
</div>


  
{mounted && showAdvanced
  ? createPortal(
      <div
        onClick={() => setShowAdvanced(false)}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.55)",
          zIndex: 100000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "min(980px, calc(100vw - 48px))",
            maxHeight: "min(860px, calc(100vh - 48px))",
            overflowY: "auto",

            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(17,24,39,0.92)", // ✅ matches base theme
            boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
            padding: 16,

            animation: "advSlideUp 220ms ease-out",
            transformOrigin: "bottom center",
          }}
        >
          {/* Header */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 2,
              paddingBottom: 12,
              marginBottom: 12,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(17,24,39,0.92)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#E5E7EB" }}>
                  Advanced Insights
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: "#9CA3AF" }}>
                  Detailed metrics, coaching trends, and attempt history
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(false)}
                aria-label="Close advanced"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#E5E7EB",
                  cursor: "pointer",
                  fontSize: 20,
                  fontWeight: 900,
                  lineHeight: "34px",
                  textAlign: "center",
                }}
              >
                ×
              </button>
            </div>
          </div>
          {/* BODY */}
<div style={{ padding: 14, display: "grid", gap: 14 }}>
 
  {/* Coach Insights */}
  {coachingInsights.length > 0 && (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(34,211,238,0.25)",
        background:
          "radial-gradient(900px 420px at 15% -10%, rgba(34,211,238,0.18), transparent 60%), rgba(17,24,39,0.65)",
        color: "#E5E7EB",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 0.3 }}>
          Coach Insights
        </div>
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>
          Based on your last 5 attempts
        </div>
      </div>

      <ul style={{ marginTop: 12, marginBottom: 0, paddingLeft: 18, lineHeight: 1.7 }}>
        {coachingInsights.map((t, i) => (
          <li key={i} style={{ fontSize: 14 }}>
            {t}
          </li>
        ))}
      </ul>
    </div>
  )}

 
  {/* Progress */}
  <div
    style={{
      padding: 14,
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.03)",
      color: "#E5E7EB",
    }}
  >
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
  <button
    type="button"
    onClick={clearHistory}
    disabled={history.length === 0}
    style={{
      padding: "9px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.12)",
      background: history.length === 0 ? "rgba(255,255,255,0.04)" : "rgba(252,165,165,0.10)",
      color: history.length === 0 ? "#9CA3AF" : "#FCA5A5",
      cursor: history.length === 0 ? "not-allowed" : "pointer",
      fontSize: 12,
      fontWeight: 900,
      whiteSpace: "nowrap",
    }}
  >
    Clear history
  </button>

  
</div>

    <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
      {(
        [
          ["overall", "Overall"],
          ["communication", "Communication"],
          ["confidence", "Confidence"],
          ["pace", "Pace"],
          ["fillers", "Fillers"],
          ["star_result", "STAR Result"],
          ["vocal_variety", "Vocal Variety"],
        ] as Array<[TrendMetric, string]>
      ).map(([k, label]) => {
        const active = trendMetric === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => setTrendMetric(k)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: active ? "1px solid rgba(34,211,238,0.45)" : "1px solid rgba(255,255,255,0.10)",
              background: active ? "rgba(34,211,238,0.10)" : "rgba(255,255,255,0.04)",
              color: active ? "#A5F3FC" : "#E5E7EB",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>

    <div style={{ marginTop: 12, display: "flex", gap: 14, alignItems: "center", justifyContent: "space-between" }}>
      <svg
        width={sparkW}
        height={sparkH}
        viewBox={`0 0 ${sparkW} ${sparkH}`}
        style={{
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(900px 420px at 15% -10%, rgba(34,211,238,0.10), transparent 60%), rgba(255,255,255,0.03)",
          flex: "0 0 auto",
        }}
      >
        <path
          d={`M 6 ${(sparkH - 6).toFixed(1)} L ${(sparkW - 6).toFixed(1)} ${(sparkH - 6).toFixed(1)}`}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="1"
          fill="none"
        />
        <path
          d={sparkPath}
          stroke="rgba(34,211,238,0.95)"
          strokeWidth="2.25"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div style={{ flex: "1 1 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>Avg</div>
            <div style={{ marginTop: 4, fontWeight: 900 }}>{avgScore ?? "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>Min</div>
            <div style={{ marginTop: 4, fontWeight: 900 }}>{minScore ?? "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>Max</div>
            <div style={{ marginTop: 4, fontWeight: 900 }}>{maxScore ?? "—"}</div>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#9CA3AF" }}>
          {history.length < 2
            ? "Do a couple attempts to see the trend line."
            : "Trend updates as you practice — newest attempt is on the right."}
        </div>
      </div>
    </div>
  </div>

  {/* Attempts */}
  <div
    style={{
      padding: 14,
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.03)",
      color: "#E5E7EB",
    }}
  >
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0.3 }}>Attempts</div>
      <div style={{ fontSize: 12, color: "#9CA3AF" }}>{history.length} saved</div>
    </div>

    {history.length === 0 ? (
      <div style={{ marginTop: 10, fontSize: 12, color: "#9CA3AF" }}>
        No attempts yet. Record + Analyze to save one.
      </div>
    ) : (
      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        {history.slice(0, 12).map((h) => {
          const dt = new Date(h.ts);
          const when = `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
          const canReplay = h.inputMethod === "spoken" && h.audioId;
          const isPlaying = playingId && h.audioId && playingId === h.audioId;

          return (
            <div
                key={h.id}
                onClick={() => {
  // ✅ save Home state so it doesn't vanish on back
  saveHomeState();
  persistHomeState();

// ✅ When opening a past attempt, store a normalized result shape for /results
try {
  const lastResult = {
    ts: h.ts,
    question: h.question ?? "",
    transcript: h.transcript ?? "",
    wpm: typeof h.wpm === "number" ? h.wpm : null,
    prosody: h.prosody ?? null,
    feedback: h.feedback ?? null,

    jobDesc: typeof h.jobDesc === "string" ? h.jobDesc : "",
    questions: Array.isArray(h.questions) ? h.questions : [],
    questionBuckets: h.questionBuckets ?? null,
  };

  sessionStorage.setItem(LAST_RESULT_KEY, JSON.stringify(lastResult));
  localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(lastResult));
} catch {}


  setTimeout(() => {
  window.location.href = new URL("/results", window.location.href).toString();
}, 0);
}}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "all 120ms ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(34,211,238,0.06)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.03)")
                }
              >

              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>Score: {h.score ?? "—"}/10</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF" }}>{when}</div>
                  {h.inputMethod === "spoken" ? (
                    <span
                      style={{
                        fontSize: 11,
                        color: "#A5F3FC",
                        border: "1px solid rgba(34,211,238,0.35)",
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      spoken
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        color: "#9CA3AF",
                        border: "1px solid rgba(255,255,255,0.10)",
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      pasted
                    </span>
                  )}
                  {typeof h.wpm === "number" ? (
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>· {h.wpm} wpm</span>
                  ) : null}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "#9CA3AF",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={h.question}
                >
                  Q: {h.question || "—"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {canReplay ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!h.audioId) return;
                      if (isPlaying) stopHistoryAudio();
                      else playHistoryAudio(h.audioId);
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: isPlaying ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.04)",
                      color: isPlaying ? "#A5F3FC" : "#E5E7EB",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isPlaying ? "Stop" : "Replay"}
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: "#6B7280" }}>No audio</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>

  

  {/* Feedback */}
  { feedback && (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        color: "#E5E7EB",
      }}
    >
      <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
        Feedback (Score: {feedback?.score}/10)
      </h3>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <GaugeTile title="Overall" value={feedback?.score ?? 0} max={10}>
          <MetricBar label="Overall Score" value={feedback?.score ?? 0} max={10} />
          {wpm !== null && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 13, color: "#9CA3AF" }}>Pace</div>
              <div style={{ marginTop: 6, color: "#E5E7EB", fontWeight: 700 }}>{wpm} wpm</div>
            </div>
          )}
        </GaugeTile>

        <GaugeTile title="Communication" value={feedback?.communication_score ?? 0} max={10}>
          <MetricBar label="Communication" value={feedback?.communication_score ?? 0} max={10} />
          {feedback?.filler && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#9CA3AF" }}>
              Fillers: {feedback?.filler.total} ({feedback?.filler.per100}/100 words)
            </div>
          )}
        </GaugeTile>

        <GaugeTile
          title="Confidence"
          value={feedback?.confidence_score ?? 0}
          max={10}
          subtitle={feedback?.confidence_explanation}
        >
          <MetricBar label="Confidence" value={feedback?.confidence_score ?? 0} max={10} />
        </GaugeTile>

        {feedback?.star && (
          <GaugeTile
            title="STAR"
            value={Math.round(
              ((feedback?.star?.situation ?? 0) +
                (feedback?.star?.task ?? 0) +
                (feedback?.star?.action ?? 0) +
                (feedback?.star?.result ?? 0)) / 4
            )}
            max={10}
          >
            <MetricBar label="Situation" value={feedback?.star?.situation ?? 0} max={10} />
            <MetricBar label="Task" value={feedback?.star?.task ?? 0} max={10} />
            <MetricBar label="Action" value={feedback?.star?.action ?? 0} max={10} />
            <MetricBar label="Result" value={feedback?.star?.result ?? 0} max={10} />
          </GaugeTile>
        )}
      </div>
    </div>
  )}
  
</div>

          
        </div>
      </div>,
      document.body
    )
  : null}
  </>
) : null}

</div>

</PremiumCard>

</div> {/* closes the 2-col grid: the div with gridTemplateColumns */}
</div> {/* closes the outer panel: the div with marginTop/padding/borderRadius */}
  
{feedbackLoading && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.45)",
      display: "grid",
      placeItems: "center",
      zIndex: 9999,
      padding: 20,
      boxSizing: "border-box",
    }}
  >
    <div
      style={{
        width: "min(520px, calc(100vw - 48px))",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(17,24,39,0.92)",
        boxShadow: "0 20px 80px rgba(0,0,0,0.55)",
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: "#E5E7EB" }}>
          Analyzing your answer…
        </div>
        <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 900 }}>
          {Math.round(progress)}%
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          height: 12,
          borderRadius: 999,
          background: "rgba(255,255,255,0.10)",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, rgba(99,102,241,0.95), rgba(34,211,238,0.85))",
            boxShadow: "0 0 18px rgba(34,211,238,0.22)",
            transition: "width 220ms ease",
          }}
        />
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>
        This can take a bit depending on answer length.
      </div>
    </div>
  </div>
)}
<UpgradeModal
  open={upgradeOpen}
  onClose={() => setUpgradeOpen(false)}
  onPrimary={() => {
    setUpgradeOpen(false);
    router.push("/account");
  }}
/>

</PremiumShell>
);
}