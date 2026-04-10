"use client";

import UpgradeModal from "@/app/components/UpgradeModal";
import WebcamOverlay, { type WebcamOverlayHandle } from "@/app/components/WebcamOverlay";
import { computeRewards, type RewardUnlock } from "@/app/lib/feedback/rewards";
import { ARCHETYPE_COLOR } from "@/app/lib/feedback/archetypes";
import type { FaceMetrics } from "@/app/hooks/useFaceAnalysis";
import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import PremiumShell from "../../components/PremiumShell";
import PremiumCard from "../../components/PremiumCard";
import AssignmentProgress from "@/app/components/AssignmentProgress";
import { getProfile } from "../../lib/profileStore";
import {
  getActiveJobProfileId,
  setActiveJobProfileId,
  type JobProfile,
} from "@/app/lib/jobProfiles";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";
import type { AttemptEntitlement } from "@/app/lib/entitlements";
import { posthog } from "@/app/lib/posthog-client";
import { classifyEvaluationFramework } from "@/app/lib/questionFramework";
import {
  asOverall100,
  asTenPoint,
  displayOverall100,
  displayTenPointAs100,
  avgOverall100,
  avgTenPoint,
} from "@/app/lib/scoreScale";

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
        <div style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: 0.2 }}>{label}</div>
        <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 700 }}>{value}</div>
      </div>
      {subtext ? (
        <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>{subtext}</div>
      ) : null}
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
        border: "1px solid var(--card-border-soft)",
        background: "var(--card-bg)",
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
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background: `conic-gradient(var(--accent) ${deg}deg, var(--card-border) 0deg)`,
              display: "grid",
              placeItems: "center",
              boxShadow: "var(--shadow-glow)",
              flex: "0 0 auto",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                background: "var(--card-bg-strong)",
                display: "grid",
                placeItems: "center",
                border: "1px solid var(--card-border-soft)",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {value}/{max}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: 0.2 }}>
              {title}
            </div>
            {subtitle ? (
              <div style={{ marginTop: 3, fontSize: 12, color: "var(--text-muted)" }}>{subtitle}</div>
            ) : null}
          </div>
        </div>

        <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Details ▾</div>
      </summary>

      {children ? <div style={{ marginTop: 12 }}>{children}</div> : null}
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
        <div style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: 0.2 }}>{label}</div>
        <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 700 }}>
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
        marginTop: 16,
        borderRadius: 16,
        border: "1px solid var(--card-border-soft)",
        background: "var(--card-bg)",
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
          color: "var(--text-primary)",
          textAlign: "left",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, letterSpacing: 0.5 }}>
            {title}
          </div>

          {summary ? (
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "var(--text-secondary)",
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
            fontWeight: 600,
            color: "var(--text-muted)",
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
              marginTop: 4,
              color: "var(--text-primary)",
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
  const SELECTED_KEY = userScopedKey("ipc_selected_attempt", session);
  const HOME_STATE_KEY = userScopedKey("ipc_home_state", session);
  const HISTORY_FALLBACK_KEY = "ipc_history";
const HOME_STATE_FALLBACK_KEY = "ipc_home_state";
  const FOCUS_KEY = userScopedKey("ipc_focus_goal", session);
  const [jobDesc, setJobDesc] = useState("");
const [activeJobProfile, setActiveJobProfile] = useState<JobProfile | null>(null);
const [allProfiles, setAllProfiles] = useState<JobProfile[]>([]);
const [showProfilePicker, setShowProfilePicker] = useState(false);
const [questions, setQuestions] = useState<string[]>([]);
type QuestionBuckets = {
  behavioral: string[];
  technical: string[];
  role_specific: string[];
  custom?: string[];
};
const [questionFilter, setQuestionFilter] = useState<
  "all" | "behavioral" | "technical" | "role_specific" | "custom"
>("all");
const [questionBuckets, setQuestionBuckets] = useState<QuestionBuckets | null>(null);
const [customQuestion, setCustomQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const hydratedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  type Entitlement = {
  isPro: boolean;
  remaining: number;
};

const [postRecordLoading, setPostRecordLoading] = useState(false);
const [postRecordStage, setPostRecordStage] = useState<string>("Preparing…");

  const [entitlement, setEntitlement] = useState<AttemptEntitlement | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const voiceMetricsRef = useRef<any>(null);
  const voiceMetricsPromiseRef = useRef<Promise<any> | null>(null);
  const audioUploadPromiseRef = useRef<Promise<void> | null>(null);

  const wavBlobRef = useRef<Blob | null>(null);
const wavUrlRef = useRef<string | null>(null);
  // --- Live waveform ---
const analyserRef = useRef<AnalyserNode | null>(null);
const audioCtxRef = useRef<AudioContext | null>(null);
const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const webcamRef = useRef<WebcamOverlayHandle>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const faceMetricsRef = useRef<FaceMetrics | null>(null);
  const attemptIdRef = useRef<string | null>(null);
  const audioPathRef = useRef<string | null>(null); // ✅ Supabase Storage path for replay across devices
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
async function refreshActiveJobProfile() {
  try {
    const activeId = getActiveJobProfileId();
    const res = await fetch("/api/job-profiles", { cache: "no-store" });
    const json = await res.json();
    const profiles: JobProfile[] = Array.isArray(json?.profiles) ? json.profiles : [];
    setAllProfiles(profiles);

    if (!activeId) {
      setActiveJobProfile(null);
      return;
    }

    const profile = profiles.find((p) => p.id === activeId) ?? null;
    setActiveJobProfile(profile);

    if (profile?.jobDescription) {
      setJobDesc(profile.jobDescription);
    }
  } catch {
    setActiveJobProfile(null);
  }
}
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



useEffect(() => {
  setMounted(true);
  void refreshActiveJobProfile();
  // Stop webcam and audio stream when navigating away
  return () => {
    webcamRef.current?.stop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };
}, []);

useEffect(() => {
  function handleFocus() {
    void refreshActiveJobProfile();
  }

  window.addEventListener("focus", handleFocus);
  return () => window.removeEventListener("focus", handleFocus);
}, []);
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
  const [analysisStage, setAnalysisStage] = useState<string>("Preparing analysis…");
  const progressTimerRef = useRef<number | null>(null);
  const [feedback, setFeedback] = useState<any>(null);
  const [rewardUnlocks, setRewardUnlocks] = useState<RewardUnlock[]>([]);
  const [rewardDismissed, setRewardDismissed] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const lastTranscribedRef = useRef<string>("");
const [inputMethod, setInputMethod] = useState<"spoken" | "pasted">("pasted");
type FocusGoal = "pace" | "fillers" | "star_result" | "vocal_variety" | "clarity";

const [focusGoal, setFocusGoal] = useState<FocusGoal | null>(null);
const ESL_KEY = userScopedKey("ipc_esl_mode", session);
const [eslMode, setEslMode] = useState(false);

useEffect(() => {
  try {
    const raw = localStorage.getItem(FOCUS_KEY);
    if (raw) setFocusGoal(raw as FocusGoal);
    else setFocusGoal(null);
  } catch {}
}, [email, FOCUS_KEY]);

useEffect(() => {
  try {
    setEslMode(localStorage.getItem(ESL_KEY) === "1");
  } catch {}
}, [ESL_KEY]);

function toggleEslMode() {
  const next = !eslMode;
  setEslMode(next);
  try { next ? localStorage.setItem(ESL_KEY, "1") : localStorage.removeItem(ESL_KEY); } catch {}
}

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
    title: "Closing Impact",
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
  postRecordLoading ||
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
    if (trendMetric === "communication") {
      return asTenPoint(h.communication_score ?? h.feedback?.communication_score);
    }

    if (trendMetric === "confidence") {
      return asTenPoint(h.confidence_score ?? h.feedback?.confidence_score);
    }

    if (trendMetric === "pace") {
      return typeof h.wpm === "number" ? Number(h.wpm) : NaN;
    }

    if (trendMetric === "fillers") {
      return Number(h.feedback?.filler?.per100 ?? NaN);
    }

    if (trendMetric === "star_result") {
      return asTenPoint(h.feedback?.star?.result);
    }

    if (trendMetric === "vocal_variety") {
      return asTenPoint(h.prosody?.monotoneScore);
    }

    return asOverall100(h.score);
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
      return { label: "Pace (WPM)", max: 220 };
    case "fillers":
      return { label: "Fillers (per 100 words)", max: 20 };
    case "star_result":
      return { label: "Closing Impact (rubric score)", max: 10 };
    case "vocal_variety":
      return { label: "Vocal variety (0–10)", max: 10 };
    default:
      return { label: "Overall (0–100)", max: 100 };
  }
}


const lastScore = scores.length ? scores[scores.length - 1] : null;
const prevScore = scores.length > 1 ? scores[scores.length - 2] : null;
const delta = lastScore !== null && prevScore !== null ? lastScore - prevScore : null;

const numericScores = scores.filter(
  (n): n is number => typeof n === "number" && Number.isFinite(n)
);

const avgScore = numericScores.length
  ? Math.round((numericScores.reduce((a, b) => a + b, 0) / numericScores.length) * 10) / 10
  : null;

const minScore = numericScores.length ? Math.min(...numericScores) : null;
const maxScore = numericScores.length ? Math.max(...numericScores) : null;

const sparkW = 100;
const sparkH = 90;
const { max: yMax } = trendMeta(trendMetric);
const sparkPath = buildSparkPath(numericScores, sparkW, sparkH, 6, yMax);
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
 const overall = last5
  .map((h) => asOverall100(h.score))
  .filter((x) => typeof x === "number" && Number.isFinite(x)) as number[];

  
const comm = last5
  .map((h) => asTenPoint(h.communication_score ?? h.feedback?.communication_score))
  .filter((x) => typeof x === "number" && Number.isFinite(x)) as number[];

const conf = last5
  .map((h) => asTenPoint(h.confidence_score ?? h.feedback?.confidence_score))
  .filter((x) => typeof x === "number" && Number.isFinite(x)) as number[];
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
  if (d >= 5) tips.push(`Up ${Math.round(d)} points overall in your last ${overall.length} attempts - keep the same structure and tighten the close.`);
  else if (d <= -5) tips.push(`Down ${Math.round(Math.abs(d))} points overall recently - simplify: 1 clear claim → 2 support points → 1 strong close.`);
  else tips.push(`Stable overall lately - pick ONE lever next attempt (STAR result, fillers, pace, or vocal variety).`);
}

  // 2) Biggest lever (lowest average dimension)
const aOverall = avgOverall100(overall);
const aComm = avgTenPoint(comm);
const aConf = avgTenPoint(conf);

  if (aOverall !== null && aComm !== null && aConf !== null) {
    const entries = [
      { k: "overall", v: aOverall },
      { k: "communication", v: aComm },
      { k: "confidence", v: aConf },
    ].sort((x, y) => x.v - y.v);

    const weakest = entries[0];
    if (weakest.k === "communication") tips.push(`Biggest lever: Communication (avg ${aComm.toFixed(1)}/10). Shorten sentences + remove softeners (“kind of”, “maybe”).`);
    if (weakest.k === "confidence") tips.push(`Biggest lever: Confidence (avg ${aConf.toFixed(1)}/10). Start with a strong claim, then deliver 1 metric earlier.`);
   if (weakest.k === "overall") tips.push(`Biggest lever: Overall (avg ${Math.round(aOverall)}/100). Add a crisp “Result” sentence with a measurable outcome.`);
  }

   // 3) Behavioral closing weakness (only if it’s truly showing up)
  const aStarR = avg(starResultSeries);
  if (aStarR !== null && aStarR <= 6) {
    const lastFramework = last?.evaluationFramework ?? "star";
    if (lastFramework === "star") {
      tips.push(`Behavioral closing impact is weak (avg ${aStarR.toFixed(1)}/10). End with a measurable outcome or business impact.`);
    }
  }

  // 4) Fillers pattern
  const aFill = avg(fillerSeries);
  if (aFill !== null && aFill >= 3) {
    tips.push(`Fillers are hurting clarity (~${aFill.toFixed(1)}/100 words). Replace “um/like” with a one-beat pause + continue.`);
  }

  // 5) Pace (spoken only)
  const aWpm = avg(wpmSeries);
  if (aWpm !== null) {
    if (aWpm < 100) tips.push(`Spoken pace trends slow (avg ${Math.round(aWpm)} wpm). Tighten pauses- aim 115–145.`);
    if (aWpm > 165) tips.push(`Spoken pace trends fast (avg ${Math.round(aWpm)} wpm). Add micro-pauses after metrics.`);
  }

  // 6) Vocal variety (spoken only)
  const aMono = avg(monoSeries);
  if (aMono !== null && aMono <= 4) {
    tips.push(`Vocal variety is low (avg ${aMono.toFixed(1)}/10). Lift pitch on outcomes + emphasize numbers.`);
  }

    if (
    last?.evaluationFramework === "star" &&
    last?.feedback?.star &&
    isNum(last.feedback?.star.result) &&
    last.feedback?.star.result <= 6
  ) {
    tips.push(`Next attempt: end with one clear impact statement, even if the metric is a rough estimate.`);
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

const overallScore100 = asOverall100(feedback?.score) ?? 0;

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
  if (monotoneScore <= 3) feedback = "You sound a bit monotone - lift pitch on key points and land sentences confidently.";
  else if (monotoneScore <= 6) feedback = "Moderate vocal variety - emphasize outcomes and pause after metrics.";
  else feedback = "Nice vocal variety - your tone sounds engaging and confident.";

  try { await audioCtx.close(); } catch {}

  return {
    pitchStdHz: Number(pitchStdHz.toFixed(1)),
    energyStd: Number(energyStd.toFixed(3)),
    monotoneScore,
    feedback,
  };
}

function encodeWavMono16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numFrames = samples.length;
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample * 1;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * bytesPerSample;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  let offset = 0;
  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    offset += s.length;
  };

  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true); offset += 4;
  writeString("WAVE");

  writeString("fmt ");
  view.setUint32(offset, 16, true); offset += 4;          // PCM header size
  view.setUint16(offset, 1, true); offset += 2;           // format = PCM
  view.setUint16(offset, 1, true); offset += 2;           // channels = 1
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;          // bits/sample

  writeString("data");
  view.setUint32(offset, dataSize, true); offset += 4;

  // Float32 [-1..1] -> Int16
  let p = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    p += 2;
  }

  return buffer;
}

async function blobToWavFile(blob: Blob, filename = "answer.wav"): Promise<File> {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuf = await blob.arrayBuffer();
  const audioBuf = await audioCtx.decodeAudioData(arrayBuf);

  // mono
  const channel = audioBuf.getChannelData(0);
  const wav = encodeWavMono16(channel, audioBuf.sampleRate);

  try { await audioCtx.close(); } catch {}

  return new File([wav], filename, { type: "audio/wav" });
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

function applyActiveProfileToJobDesc() {
  if (!activeJobProfile?.jobDescription) return;

  setJobDesc(activeJobProfile.jobDescription);
  persistHomeState({ jobDesc: activeJobProfile.jobDescription });
}

function clearJobDescAndQuestions() {
  setJobDesc("");
  setQuestions([]);
  setQuestionBuckets(null);
  setQuestionFilter("all");
  setSelectedQuestion("");
  setMode("setup");

  persistHomeState({
    jobDesc: "",
    questions: [],
    questionBuckets: null,
    selectedQuestion: "",
    mode: "setup",
  });
}

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
          ...(Array.isArray(b.role_specific) ? b.role_specific : []),
          ...(Array.isArray(b.custom) ? b.custom : []),
        ].map(String)
      : [];

  setQuestions(qs);
  setQuestionFilter("all");

setQuestionBuckets(
  b &&
    typeof b === "object" &&
    Array.isArray(b.behavioral) &&
    Array.isArray(b.technical) &&
    Array.isArray(b.role_specific)
    ? {
        behavioral: b.behavioral.map(String),
        technical: b.technical.map(String),
        role_specific: b.role_specific.map(String),
        custom: Array.isArray(b.custom) ? b.custom.map(String) : [],
      }
    : null
);

persistHomeState({
  questions: qs,
  questionBuckets: b
    ? {
        behavioral: (Array.isArray(b.behavioral) ? b.behavioral : []).map(String),
        technical: (Array.isArray(b.technical) ? b.technical : []).map(String),
        role_specific: (Array.isArray(b.role_specific) ? b.role_specific : []).map(String),
        custom: (Array.isArray(b.custom) ? b.custom : []).map(String),
      }
    : null,
});

setMode("questions");


if (qs.length) setShowQuestions(true);


  } catch {
    setError("Network error. Check your server is running.");
    setQuestions([]);
  } finally {
    setLoading(false);
  }
}

const visibleQuestionSections = [
  {
    key: "behavioral" as const,
    title: "Behavioral",
    items: questionBuckets?.behavioral ?? [],
  },
  {
    key: "technical" as const,
    title: "Technical",
    items: questionBuckets?.technical ?? [],
  },
  {
    key: "role_specific" as const,
    title: "Role-Specific",
    items: questionBuckets?.role_specific ?? [],
  },
  {
    key: "custom" as const,
    title: "Custom",
    items: questionBuckets?.custom ?? [],
  },
].filter((section) => {
  if (questionFilter === "all") return section.items.length > 0;
  return section.key === questionFilter && section.items.length > 0;
});


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
    ctxNow.fillStyle = "var(--card-bg)";
    ctxNow.fillRect(0, 0, canvasNow.width, canvasNow.height);

    // Line
    ctxNow.lineWidth = 2 * dpr;
    ctxNow.strokeStyle = "rgba(34,211,238,0.95)"; // canvas - uses theme --accent
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

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  // Mix down to mono (your acoustics pipeline expects mono anyway)
  const length = buffer.length;
  const mono = new Float32Array(length);

  if (numChannels === 1) {
    buffer.copyFromChannel(mono, 0);
  } else {
    const ch0 = new Float32Array(length);
    const ch1 = new Float32Array(length);
    buffer.copyFromChannel(ch0, 0);
    buffer.copyFromChannel(ch1, 1);
    for (let i = 0; i < length; i++) mono[i] = 0.5 * (ch0[i] + ch1[i]);
  }

  // 16-bit PCM encode
  const bytesPerSample = bitDepth / 8;
  const blockAlign = 1 * bytesPerSample; // mono
  const byteRate = sampleRate * blockAlign;
  const dataSize = mono.length * bytesPerSample;

  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  let offset = 0;
  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    offset += s.length;
  };

  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true); offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true); offset += 4;              // fmt chunk size
  view.setUint16(offset, format, true); offset += 2;          // PCM = 1
  view.setUint16(offset, 1, true); offset += 2;               // mono
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, bitDepth, true); offset += 2;

  writeString("data");
  view.setUint32(offset, dataSize, true); offset += 4;

  // PCM samples
  for (let i = 0; i < mono.length; i++) {
    const s = Math.max(-1, Math.min(1, mono[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

async function blobToWav(blob: Blob): Promise<Blob> {
  const arrayBuf = await blob.arrayBuffer();
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
    return audioBufferToWav(audioBuffer);
  } finally {
    // don't leak audio contexts
    try { await ctx.close(); } catch {}
  }
}




async function startRecording() {
    setTimeLeft(answerTimeLimit);
  setTimerRunning(true);
  setMode("answer");
  setVoiceError(null);
  setTranscript("");
  setDurationSeconds(null);

  attemptIdRef.current = crypto.randomUUID();
audioPathRef.current = null; // reset each attempt
  const chunks: BlobPart[] = [];

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    // Start webcam face analysis only if user opted in
    faceMetricsRef.current = null;
    if (webcamEnabled) {
      webcamRef.current?.start().catch(() => {});
    }

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
      setPostRecordLoading(true);
setPostRecordStage("Preparing audio…");
    
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
audioBlobRef.current = blob;

// Keep webm for AssemblyAI/transcribe (small + reliable)
const webmFile = new File([blob], "answer.webm", { type: "audio/webm" });

// ✅ Upload recording to Supabase Storage (real replay across devices)
// Store the upload as a Promise so analyzeAnswer() can wait for it
audioUploadPromiseRef.current = (async () => {
  try {
    const fd = new FormData();
    fd.append("audio", webmFile);

    // Use the attempt UUID you already generated
    fd.append("attemptId", attemptIdRef.current ?? `attempt_${Date.now()}`);

    const up = await fetch("/api/audio/upload", {
      method: "POST",
      body: fd,
    });

    const uj = await up.json().catch(() => ({}));

    if (up.ok && typeof uj?.audioPath === "string") {
      audioPathRef.current = uj.audioPath;
    } else {
      console.warn("[audio/upload] failed:", uj);
    }
  } catch (e) {
    console.warn("[audio/upload] error:", e);
  }
})();

// Convert to WAV for Python acoustics (avoids ffmpeg/webm decode issues on Render)
let wavFile: File | null = null;
try {
  const wavBlob = await blobToWav(blob);
  wavFile = new File([wavBlob], "answer.wav", { type: "audio/wav" });
} catch (e) {
  console.error("WAV CONVERSION FAILED:", e);
  wavFile = null;
}

// Choose per-vendor files
const fileForTranscribe = webmFile;
const fileForAcoustics = wavFile ?? webmFile;

// ✅ Save audio for replay (object URL + IndexedDB)
if (wavUrlRef.current) {
  URL.revokeObjectURL(wavUrlRef.current);
  wavUrlRef.current = null;
}

let replayBlob: Blob | null = null;

// Prefer WAV for replay if available, else fall back to the original webm blob
if (wavFile) {
  const wavBlobForReplay = new Blob([await wavFile.arrayBuffer()], { type: "audio/wav" });
  replayBlob = wavBlobForReplay;

  wavBlobRef.current = wavBlobForReplay;
  wavUrlRef.current = URL.createObjectURL(wavBlobForReplay);
} else {
  replayBlob = blob;

  wavBlobRef.current = null;
  wavUrlRef.current = null;
}

// ✅ Persist replay audio for Sessions/Results (keyed by audioId)
const audioId = attemptIdRef.current;
if (audioId && replayBlob) {
  // don't block the UI if IDB is slow/blocked
  idbPutAudio(audioId, replayBlob).catch(() => {});
}

// --- Kick off voice metrics in parallel (DON'T await here) ---
setPostRecordStage("Computing voice metrics…");

voiceMetricsRef.current = null;
voiceMetricsPromiseRef.current = (async () => {
  try {
    const vmForm = new FormData();
    vmForm.append("audio", fileForAcoustics);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    const vmRes = await fetch("/api/voice-metrics", {
      method: "POST",
      body: vmForm,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

      const vmJson = await vmRes.json().catch(() => null);

    const metrics = vmJson?.metrics ?? null;

    voiceMetricsRef.current = metrics;
    return vmJson;
  } catch (e) {
    console.warn("voice-metrics failed", e);
    voiceMetricsRef.current = null;
    return null;
  }
})();

// ---- any later transcription form code must use fileForTranscribe ----
const startedAt = recordingStartRef.current;
const durSeconds =
  typeof startedAt === "number" ? Math.max(0.1, (Date.now() - startedAt) / 1000) : null;

setDurationSeconds(durSeconds);
setPostRecordStage("Transcribing…");

const form = new FormData();
form.append("audio", fileForTranscribe);
if (typeof durSeconds === "number" && Number.isFinite(durSeconds)) {
  form.append("duration", String(durSeconds));
}
const res = await fetch("/api/transcribe", {
  method: "POST",
  body: form,
});
        

        const data = await res.json();

        if (!res.ok) {
  setVoiceError(data?.error ?? "Transcription failed.");
  setPostRecordLoading(false);
  return;
}

        const text = data.text ?? "";

setTranscript(text);
setPostRecordLoading(false);
setDurationSeconds(typeof data.durationSeconds === "number" ? data.durationSeconds : null);

// mark as spoken
setInputMethod("spoken");
lastTranscribedRef.current = text;
setPostRecordLoading(false);

        
      } catch (e) {
  console.error("onstop pipeline failed:", e);
  setVoiceError("Upload/transcription failed.");
  setPostRecordLoading(false);
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

  // Collect face analysis metrics before stopping
  const faceResult = webcamRef.current?.stop();
  if (faceResult) faceMetricsRef.current = faceResult;

  cleanupWaveform();


  setRecording(false);

  // ✅ ensure last chunk is flushed before stop
try {
  mr.requestData();
} catch {}

mr.stop();
mediaRecorderRef.current = null;
}

function setAnalysisProgress(stage: string) {
  setAnalysisStage(stage);

  switch (stage) {
    case "Preparing analysis…":
      setProgress(8);
      break;
    case "Finalizing voice metrics…":
      setProgress(22);
      break;
    case "Generating AI feedback…":
      setProgress(55);
      break;
    case "Saving results…":
      setProgress(78);
      break;
    case "Opening results…":
      setProgress(95);
      break;
    default:
      break;
  }
}

function inferQuestionCategory(
  question: string,
  buckets: {
    behavioral?: string[];
    technical?: string[];
    role_specific?: string[];
    custom?: string[];
  } | null
): "behavioral" | "technical" | "role_specific" | "custom" | "other" {
  const q = question.trim();

  if (!q) return "other";
  if (!buckets) return "other";

  if ((buckets.behavioral ?? []).includes(q)) return "behavioral";
  if ((buckets.technical ?? []).includes(q)) return "technical";
  if ((buckets.role_specific ?? []).includes(q)) return "role_specific";
  if ((buckets.custom ?? []).includes(q)) return "custom";

  return "other";
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

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 15) {
    setError(`Response too short (${wordCount} word${wordCount === 1 ? "" : "s"}). Make sure you're speaking into the mic and aim for at least 30 seconds.`);
    return;
  }

  if (!selectedQuestion.trim()) {
    setError("Select a question first (open Questions and pick one).");
    return;
  }

setFeedbackLoading(true);
setProgress(0);
setAnalysisProgress("Preparing analysis…");

if (progressTimerRef.current) {
  window.clearInterval(progressTimerRef.current);
  progressTimerRef.current = null;
}

  posthog.capture("attempt_submitted", {
  inputMethod, // spoken or pasted
});


const audioBlob = audioBlobRef.current;

setAnalysisProgress("Finalizing voice metrics…");
// Wait for the in-flight voice metrics job started in mr.onstop
if (voiceMetricsPromiseRef.current) {
  try {
    await voiceMetricsPromiseRef.current;
  } catch {
    // ignore and fall through
  }
}

// Fallback: if metrics still are not ready, try one direct request
if (!voiceMetricsRef.current && audioBlob && audioBlob.size > 0) {
  try {
    const fd = new FormData();

    // Prefer WAV if available, since your acoustics pipeline is more reliable on WAV
    if (wavBlobRef.current) {
      fd.append("audio", wavBlobRef.current, "answer.wav");
    } else {
      fd.append("audio", audioBlob, "answer.webm");
    }

    const vmRes = await fetch("/api/voice-metrics", {
      method: "POST",
      body: fd,
    });

    const vmJson = await vmRes.json().catch(() => null);
    voiceMetricsRef.current = vmJson?.metrics ?? null;
  } catch {
    voiceMetricsRef.current = null;
  }
}


  try {
    const freshestVoiceMetrics = voiceMetricsRef.current ?? null;

console.log("[voice-metrics] result:", freshestVoiceMetrics
  ? { acousticsKeys: freshestVoiceMetrics ? Object.keys((freshestVoiceMetrics as any).acoustics ?? {}) : null, hasAcoustics: !!(freshestVoiceMetrics as any).acoustics }
  : "null - voice-metrics failed or not yet complete");

const normalizedAcoustics = (() => {
  const m = freshestVoiceMetrics as any;
  if (!m) return null;

  if (m.acoustics && typeof m.acoustics === "object") {
    return m.acoustics;
  }

  if (m.prosody && typeof m.prosody === "object") {
    return m.prosody;
  }

  const hasFlatAcoustics =
    typeof m.pitchStdHz === "number" ||
    typeof m.pitchStd === "number" ||
    typeof m.energyStd === "number" ||
    typeof m.monotoneScore === "number" ||
    typeof m.pitchMean === "number" ||
    typeof m.pitchRange === "number" ||
    typeof m.energyMean === "number" ||
    typeof m.energyVariation === "number" ||
    typeof m.tempo === "number" ||
    typeof m.tempoDynamics === "number" ||
    !!m.series;

  if (!hasFlatAcoustics) return null;

  return {
    pitchStdHz:
      typeof m.pitchStdHz === "number"
        ? m.pitchStdHz
        : typeof m.pitchStd === "number"
        ? m.pitchStd
        : null,
    pitchStd:
      typeof m.pitchStd === "number"
        ? m.pitchStd
        : typeof m.pitchStdHz === "number"
        ? m.pitchStdHz
        : null,
    energyStd: typeof m.energyStd === "number" ? m.energyStd : null,
    monotoneScore: typeof m.monotoneScore === "number" ? m.monotoneScore : null,
    feedback: typeof m.feedback === "string" ? m.feedback : null,

    pitchMean: typeof m.pitchMean === "number" ? m.pitchMean : null,
    pitchRange: typeof m.pitchRange === "number" ? m.pitchRange : null,
    energyMean: typeof m.energyMean === "number" ? m.energyMean : null,
    energyVariation: typeof m.energyVariation === "number" ? m.energyVariation : null,
    tempo: typeof m.tempo === "number" ? m.tempo : null,
    tempoDynamics: typeof m.tempoDynamics === "number" ? m.tempoDynamics : null,
    durationSec: typeof m.durationSec === "number" ? m.durationSec : null,
    sampleRate: typeof m.sampleRate === "number" ? m.sampleRate : null,
    series: m.series ?? null,
  };
})();

const normalizedVoiceMetrics = freshestVoiceMetrics
  ? {
      ...(freshestVoiceMetrics as any),
      acoustics: normalizedAcoustics,
    }
  : null;

  setAnalysisProgress("Generating AI feedback…");

const questionCategory = inferQuestionCategory(
  selectedQuestion,
  questionBuckets
);

const evaluationFramework =
  questionCategory === "behavioral"
    ? "star"
    : questionCategory === "technical"
    ? "technical_explanation"
    : classifyEvaluationFramework(selectedQuestion);

const res = await fetch("/api/feedback", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jobDesc,
    question: selectedQuestion,
    questionCategory,
    evaluationFramework,
    transcript,
    deliveryMetrics: voiceMetricsRef.current,
    faceMetrics: faceMetricsRef.current ?? null,
    prevScore: history[0]?.score ?? null,
    prevAttemptCount: history.length,
    eslMode,
  }),
});

if (res.status === 402) {
  setUpgradeOpen(true);
  setFeedbackLoading(false);
  return;
}

const data = await res.json();

if (!res.ok) {
  const msg =
    data?.error === "NOT_AN_ANSWER"
      ? (data.message ?? "This recording doesn't appear to be a response to the question. Make sure you're speaking into the mic and answering the question shown.")
      : data?.error === "RESPONSE_TOO_SHORT"
      ? (data.message ?? "Response too short to score. Record a full answer - aim for at least 30 seconds.")
      : data?.error === "TRANSCRIPT_TOO_LONG"
      ? "Response is too long to analyze. Try a shorter answer."
      : data?.error ?? "Feedback failed.";
  setError(msg);
  setFeedbackLoading(false);
  return;
}

setFeedback(data);
// Compute rewards by comparing to the most recent history entry
{
  const prevEntry = history[0] ?? null;
  const currFillersPer100 = data?.filler?.per100 ?? 0;
  const currWpmForReward = inputMethod === "spoken" ? (typeof wpm === "number" ? wpm : null) : null;
  setRewardUnlocks(computeRewards(prevEntry, data, currFillersPer100, currWpmForReward));
  setRewardDismissed(false);
}
const activeProfileId = activeJobProfile?.id ?? null;
const activeProfileTitle = activeJobProfile?.title ?? null;
const activeProfileCompany = activeJobProfile?.company ?? null;
const activeProfileRoleType = activeJobProfile?.roleType ?? null;



  const entry = {
  id: crypto.randomUUID(),
  ts: Date.now(),
  question: selectedQuestion || "",
  questionCategory,
  questionSource: questionCategory === "custom" ? "custom" : "generated",
  evaluationFramework,
  transcript,
  wpm: inputMethod === "spoken" ? wpm : null,
  inputMethod,

  // ✅ local replay id (IndexedDB) - keep if you still want same-device replay
  audioId: inputMethod === "spoken" ? attemptIdRef.current : null,

  // ✅ cross-device replay (Supabase Storage)
  audioPath: inputMethod === "spoken" ? audioPathRef.current : null,

  prosody: normalizedAcoustics,
  feedback: data,
  score: data.score,
  communication_score: data.communication_score,
  confidence_score: data.confidence_score,
  focusGoal: activeFocus,
jobDesc,

jobProfileId: activeProfileId,
jobProfileTitle: activeProfileTitle,
jobProfileCompany: activeProfileCompany,
jobProfileRoleType: activeProfileRoleType,

questions,
questionBuckets,
deliveryMetrics: {
  ...(normalizedVoiceMetrics ?? {}),
  ...(faceMetricsRef.current ? { face: faceMetricsRef.current } : {}),
},
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

   // ✅ ensure suggestedQs exists in this scope
const suggestedQs: string[] =
  Array.isArray((data as any)?.suggestedQuestions)
    ? (data as any).suggestedQuestions.map((q: any) => String(q))
    : Array.isArray((data as any)?.suggested_qs)
    ? (data as any).suggested_qs.map((q: any) => String(q))
    : Array.isArray((data as any)?.questions)
    ? (data as any).questions.map((q: any) => String(q))
    : [];
// ✅ Save last result for /results page (session + local fallback)
try {
  const freshestDeliveryMetrics =
  entry.deliveryMetrics ??
  (data as any)?.deliveryMetrics ??
  normalizedVoiceMetrics ??
  null;

const freshestProsody =
  entry.prosody ??
  (freshestDeliveryMetrics as any)?.acoustics ??
  normalizedAcoustics ??
  (data as any)?.prosody ??
  null;


const lastResult = {
  ts: entry.ts,
  question: entry.question,
  questionCategory: entry.questionCategory ?? "other",
  questionSource: entry.questionSource ?? "generated",
  evaluationFramework: entry.evaluationFramework ?? "star",
  transcript: entry.transcript ?? "",
  wpm: typeof entry.wpm === "number" ? entry.wpm : null,
  // ✅ make acoustics explicit for Results
  prosody: freshestProsody,

  // ✅ preserve full delivery object too
  deliveryMetrics: freshestDeliveryMetrics,

  feedback: data ?? null,
  jobDesc: entry.jobDesc ?? "",

  jobProfileId: entry.jobProfileId ?? null,
  jobProfileTitle: entry.jobProfileTitle ?? null,
  jobProfileCompany: entry.jobProfileCompany ?? null,
  jobProfileRoleType: entry.jobProfileRoleType ?? null,

  questions: Array.isArray(suggestedQs) ? suggestedQs : [],
  questionBuckets: data?.questionBuckets ?? null,

  audioId: entry.audioId ?? null,
  audioPath: entry.audioPath ?? null,
  inputMethod: entry.inputMethod ?? "pasted",
};

  const json = JSON.stringify(lastResult);

    // ✅ User-scoped last result
  sessionStorage.setItem(LAST_RESULT_KEY, json);
  localStorage.setItem(LAST_RESULT_KEY, json);

  // ✅ Always write a fallback key
  sessionStorage.setItem("ipc_last_result", json);
  localStorage.setItem("ipc_last_result", json);



  // ✅ IMPORTANT: override any old selected attempt so Results shows THIS run
  sessionStorage.setItem(SELECTED_KEY, json);
  localStorage.setItem(SELECTED_KEY, json);

  sessionStorage.setItem("ipc_selected_attempt", json);
localStorage.setItem("ipc_selected_attempt", json);
  // ✅ Tell /results to ignore any stale "selected attempt" and show this run
sessionStorage.setItem("ipc_from_practice", "1");
} catch {}



setAnalysisProgress("Saving results…");

saveHomeState();
persistHomeState();

setAnalysisProgress("Opening results…");

// Navigate immediately so the user sees Results fast
router.push("/results");

// Save to DB in the background (best-effort)
void (async () => {
    try {
    if (audioUploadPromiseRef.current) {
      await audioUploadPromiseRef.current;
    }

    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  ts: entry.ts,
  question: entry.question,
  questionCategory: entry.questionCategory ?? "other",
  questionSource: entry.questionSource ?? "generated",
  evaluationFramework: entry.evaluationFramework ?? "star",
  transcript: entry.transcript,
        inputMethod: entry.inputMethod,
        wpm: entry.wpm,
        prosody: entry.prosody ?? null,
        deliveryMetrics: entry.deliveryMetrics ?? null,
        feedback: entry.feedback,
        score: entry.score,
        communication_score: entry.communication_score,
        confidence_score: entry.confidence_score,
        focusGoal: entry.focusGoal ?? null,
        jobDesc: entry.jobDesc ?? null,

        jobProfileId: entry.jobProfileId ?? null,
        jobProfileTitle: entry.jobProfileTitle ?? null,
        jobProfileCompany: entry.jobProfileCompany ?? null,
        jobProfileRoleType: entry.jobProfileRoleType ?? null,

        audioId: entry.audioId ?? null,
        audioPath: entry.audioPath ?? null,
        durationSeconds: durationSeconds ?? null,
      }),
    });

    const data = await res.json().catch(() => null);

    if (data?.entitlement) {
      setEntitlement(data.entitlement);
    }
  } catch (e) {
    console.warn("Background attempt save failed", e);
  }
})();

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
<div style={{
  marginTop: 6, marginBottom: 28,
  padding: "28px 32px",
  borderRadius: "var(--radius-lg, 12px)",
  background: "linear-gradient(135deg, rgba(37,99,235,0.14) 0%, rgba(14,165,233,0.07) 100%)",
  border: "1px solid rgba(37,99,235,0.22)",
  borderLeft: "3px solid var(--accent)",
  position: "relative" as const,
  overflow: "hidden" as const,
}}>
  {/* Decorative orb */}
  <div style={{
    position: "absolute", top: -40, right: -40,
    width: 180, height: 180,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(37,99,235,0.18), transparent 70%)",
    pointerEvents: "none" as const,
  }} />

  <div style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "3px 10px", borderRadius: 6,
    background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.3)",
    fontSize: 11, fontWeight: 600, color: "#93C5FD", letterSpacing: 0.4,
    marginBottom: 14,
  }}>
    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#3B82F6", display: "inline-block" }} />
    AI-Powered Analysis
  </div>

  <div style={{
    fontSize: 32, fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: -0.6, lineHeight: 1.1,
    marginBottom: 10,
  }}>
    Practice interviews with AI feedback
  </div>

  <div style={{
    fontSize: 15, color: "var(--text-muted)", maxWidth: 680, lineHeight: 1.6, marginBottom: 18,
  }}>
    Record your answers, get scored across seven communication dimensions, and follow a targeted coaching plan for your next attempt.
  </div>

  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
    {[
      "7 communication dimensions",
      "15 coaching archetypes",
      "Vocal & pace analysis",
      "Eye contact tracking",
    ].map(chip => (
      <span key={chip} style={{
        padding: "4px 12px", borderRadius: 6,
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
        fontSize: 12, fontWeight: 500, color: "var(--text-muted)",
      }}>
        {chip}
      </span>
    ))}
  </div>
</div>
    
{mode === "answer" ? (
  <div
  style={{
    marginTop: 16,
    padding: "16px 18px",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--accent-strong)",
    background: "var(--card-bg)",
    boxShadow: "inset 0 1px 0 var(--card-bg)",
    transform: "translateY(0px)",
    opacity: 1,
    transition: "opacity 200ms ease, transform 200ms ease",
  }}
>

    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <div style={{ minWidth: 0 }}>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    }}
  >
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.7,
        color: "var(--text-muted)",
      }}
    >
      Selected Question
    </div>

    {activeJobProfile ? (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid var(--accent-strong)",
          background: "var(--accent-soft)",
          color: "var(--accent)",
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
        title={
          activeJobProfile.company
            ? `${activeJobProfile.title} • ${activeJobProfile.company}`
            : activeJobProfile.title
        }
      >
        <span>Profile</span>
        <span style={{ opacity: 0.9 }}>
          {activeJobProfile.title}
        </span>
      </span>
    ) : null}
  </div>

  <div
    style={{
      marginTop: 8,
      fontSize: 17,
      lineHeight: 1.55,
      fontWeight: 600,
      color: "var(--text-primary)",
      wordBreak: "break-word",
      maxWidth: 820,
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
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
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
    padding: 0,
    borderRadius: 20,
    border: "none",
    background: "transparent",
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
    <AssignmentProgress />

    {(mode=== "setup" || mode === "questions") ? (
      <>


{/* ===== SECTION: Job Description ===== */}
<div
  style={{
    marginTop: 24,
    padding: 0,
    borderRadius: 0,
    border: "none",
    background: "transparent",
  }}
>
  
  {/* Section Label */}
 <div
  style={{
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.8,
    color: "var(--text-muted)",
  }}
>
  Setup
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
    fontWeight: 700,
    color: "var(--text-primary)",
  }}
>
  Job Description
</h2>

    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
  {jobDesc.length.toLocaleString()} chars
</div>
  </div>

  {/* Helper */}
<div
  style={{
    marginTop: 4,
    fontSize: 13,
    color: "var(--text-muted)",
    lineHeight: 1.5,
  }}
>
  Paste the role description manually, or load your active job profile to generate tailored interview questions.
</div>

{activeJobProfile ? (
  <div
    style={{
      marginTop: 14,
      padding: 14,
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
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.8,
            color: "var(--accent)",
          }}
        >
          Active Profile
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {activeJobProfile.title}
        </div>

        <div
          style={{
            marginTop: 6,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          {activeJobProfile.company ? (
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                border: "none",
                background: "var(--card-bg)",
              }}
            >
              {activeJobProfile.company}
            </span>
          ) : null}

          {activeJobProfile.roleType ? (
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                border: "none",
                background: "var(--card-bg)",
              }}
            >
              {activeJobProfile.roleType}
            </span>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={applyActiveProfileToJobDesc}
          style={{
            padding: "9px 12px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--accent-strong)",
            background: "linear-gradient(135deg, var(--accent-2), var(--accent))",
            color: "var(--text-primary)",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          Load into setup
        </button>

        <button
          type="button"
          onClick={refreshActiveJobProfile}
          style={{
            padding: "9px 12px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: "transparent",
            color: "var(--text-muted)",
            fontWeight: 500,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>

        {allProfiles.length > 1 && (
          <button
            type="button"
            onClick={() => setShowProfilePicker((v) => !v)}
            style={{
              padding: "9px 12px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: "transparent",
              color: "var(--text-muted)",
              fontWeight: 500,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Switch profile
          </button>
        )}
      </div>
    </div>

    {showProfilePicker && allProfiles.length > 1 && (
      <div style={{ display: "grid", gap: 6, marginTop: 2 }}>
        {allProfiles.filter((p) => p.id !== activeJobProfile?.id).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setActiveJobProfileId(p.id);
              setActiveJobProfile(p);
              setJobDesc(p.jobDescription ?? "");
              setShowProfilePicker(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg-strong)",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            <div style={{ fontSize: 18, flexShrink: 0 }}>💼</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.title}
              </div>
              {p.company && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{p.company}</div>
              )}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>
              Switch →
            </div>
          </button>
        ))}
      </div>
    )}

    <div
      style={{
        fontSize: 12,
        lineHeight: 1.6,
        color: "var(--text-muted)",
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical" as const,
        overflow: "hidden",
      }}
    >
      {activeJobProfile.jobDescription}
    </div>
  </div>
) : (
  <div
    style={{
      marginTop: 14,
      padding: 14,
      borderRadius: "var(--radius-lg)",
      border: "1px dashed var(--card-border)",
      background: "var(--card-bg)",
    }}
  >
    <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: allProfiles.length > 0 ? 12 : 0 }}>
      No active job profile selected. You can still paste a job description manually, or set one below.
    </div>
    {allProfiles.length > 0 && (
      <div style={{ display: "grid", gap: 6 }}>
        {allProfiles.slice(0, 4).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setActiveJobProfileId(p.id);
              setActiveJobProfile(p);
              setJobDesc(p.jobDescription ?? "");
              setShowProfilePicker(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg-strong)",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            <div style={{ fontSize: 20, flexShrink: 0 }}>💼</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.title}
              </div>
              {p.company && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{p.company}</div>
              )}
            </div>
            <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>
              Use this →
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
)}

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
  boxSizing: "border-box",
  display: "block",
  height: 220,
  marginTop: 14,
  padding: 14,
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: 0.15,
  lineHeight: 1.6,
  color: "var(--text-primary)",
  background: "var(--card-bg-strong)",
  border: "1px solid var(--card-border-soft)",
  borderRadius: "var(--radius-sm)",
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
    padding: "11px 18px",
    fontSize: 14,
    fontWeight: 700,
    borderRadius: "var(--radius-sm)",
    border: jobDesc.trim().length < 30
      ? "1px solid var(--card-border)"
      : "1px solid var(--accent-strong)",
    background:
      jobDesc.trim().length < 30
        ? "var(--card-bg)"
        : "linear-gradient(135deg, var(--accent-2), var(--accent))",
    boxShadow:
      jobDesc.trim().length < 30
        ? "none"
        : "var(--shadow-glow)",
    color: "var(--text-primary)",
    cursor: jobDesc.trim().length < 30 ? "not-allowed" : "pointer",
    opacity: jobDesc.trim().length < 30 ? 0.55 : 1,
  })}
>
  {loading ? "Generating..." : "Generate Questions"}
</button>

<button
  type="button"
  onClick={clearJobDescAndQuestions}
  style={{
    padding: "11px 16px",
    fontSize: 14,
    fontWeight: 500,
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
  }}
>
  Clear
</button>


    <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
  Minimum 30 characters
</div>
    <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
  By using this tool, you agree to our{" "}
  <a href="/terms" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
    Terms
  </a>{" "}
  and{" "}
  <a href="/privacy" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
    Privacy Policy
  </a>
  .
</div>
  </div>

  {error && (
    <div style={{ marginTop: 10, fontSize: 13, color: "var(--danger)" }}>
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
    marginTop: 24,
    padding: 18,
    border: "none",
    borderRadius: "var(--radius-lg)",
    background: "transparent",
    position: "relative",
    overflow: "visible",
  }}
>


  {mode === "questions" ? (
  <div style={{ display: "grid", gap: 16 }}>
  <div style={{ display: "grid", gap: 6 }}>
  <div
  style={{
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.8,
    color: "var(--text-muted)",
  }}
>
  Question Selection
</div>

  <div
  style={{
    fontSize: 18,
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: -0.2,
  }}
>
  Choose a question to practice
</div>

  <div
  style={{
    fontSize: 13,
    color: "var(--text-muted)",
    lineHeight: 1.5,
    maxWidth: 620,
  }}
>
  Generate tailored questions, filter by type, or paste your own custom question.
</div>
</div>

<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
  {[
    { key: "all", label: "All" },
    { key: "behavioral", label: "Behavioral" },
    { key: "technical", label: "Technical" },
    { key: "role_specific", label: "Role-Specific" },
    { key: "custom", label: "Custom" },
  ].map((tab) => {
    const active = questionFilter === tab.key;

    return (
      <button
        key={tab.key}
        type="button"
        onClick={() =>
          setQuestionFilter(
            tab.key as "all" | "behavioral" | "technical" | "role_specific" | "custom"
          )
        }
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = "rgba(255,255,255,0.055)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = "transparent";
          }
        }}
        style={{
  padding: "7px 11px",
  borderRadius: 999,
  border: "none",
  background: active
    ? "var(--accent-soft)"
    : "transparent",
  color: active ? "var(--accent)" : "var(--text-muted)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 140ms ease, color 140ms ease",
}}
      >
        {tab.label}
      </button>
    );
  })}
</div>



    {questions.length === 0 && !questionBuckets ? (
      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
  No questions generated yet.
</div>
    ) : (
     <div style={{ display: "grid", gap: 18 }}>
  {visibleQuestionSections.map((section) => (
  <div
    key={section.key}
    style={{
      paddingTop: 6,
      paddingBottom: 2,
    }}
  >
     <div
  style={{
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
    letterSpacing: 0,
    marginBottom: 10,
  }}
>
  {section.title}
</div>

              <div style={{ display: "grid", gap: 8 }}>
                {section.items.map((q, idx) => {
                  const active = selectedQuestion === q;

                  return (
                   <button
  key={`${section.key}-${idx}-${q}`}
  type="button"
  onClick={() => {
    setSelectedQuestion(q);
    persistHomeState({ selectedQuestion: q });
    setMode("answer");
    persistHomeState({ mode: "answer" });
  }}
  onMouseEnter={(e) => {
    if (!active) {
      e.currentTarget.style.background = "rgba(255,255,255,0.055)";
e.currentTarget.style.borderColor = "var(--card-border)";
      e.currentTarget.style.transform = "translateY(-1px)";
    }
  }}
  onMouseLeave={(e) => {
  if (!active) {
    e.currentTarget.style.background = "var(--card-bg)";
    e.currentTarget.style.borderColor = "var(--card-border-soft)";
    e.currentTarget.style.transform = "translateY(0px)";
  }
}}
  style={{
  textAlign: "left",
  width: "100%",
  padding: "12px 14px",
  borderRadius: "var(--radius-sm)",
  border: active
    ? "1px solid var(--accent-strong)"
    : "1px solid var(--card-border-soft)",
  background: active
    ? "var(--accent-soft)"
    : "var(--card-bg)",
  boxShadow: active ? "0 0 0 1px var(--accent-soft) inset" : "none",
  fontSize: 14,
  lineHeight: 1.55,
  color: "var(--text-primary)",
  cursor: "pointer",
  transition: "background 140ms ease, border-color 140ms ease, transform 140ms ease",
}}
>
  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
    <span
  style={{
    color: active ? "var(--accent)" : "var(--text-muted)",
    fontWeight: 600,
    minWidth: 18,
    flex: "0 0 auto",
  }}
>
  {idx + 1}.
</span>

    <span style={{ flex: 1, fontWeight: active ? 700 : 600, color: "var(--text-primary)" }}>
  {q}
</span>
  </div>
</button> 
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    )}

 <div
  style={{
    marginTop: 14,
    padding: 0,
    borderRadius: "var(--radius-md)",
    border: "none",
    background: "transparent",
  }}
>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
  Use your own question
</div>

    <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
  If the generated options are not right, paste or write your own interview question.
</div>

      <textarea
        value={customQuestion}
        onChange={(e) => setCustomQuestion(e.target.value)}
        placeholder="e.g. Tell me about a time you had to manage multiple competing priorities."
        style={{
  width: "100%",
  boxSizing: "border-box",
  display: "block",
  marginTop: 10,
  minHeight: 88,
  padding: 12,
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--card-border-soft)",
  background: "var(--card-bg-strong)",
  color: "var(--text-primary)",
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: 0.15,
  lineHeight: 1.6,
  resize: "vertical",
  outline: "none",
}}
      />

      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
        <button
  type="button"
  disabled={!customQuestion.trim()}
  onClick={() => {
    const q = customQuestion.trim();
    if (!q) return;

    setSelectedQuestion(q);
    persistHomeState({ selectedQuestion: q });
    setMode("answer");
    persistHomeState({ mode: "answer" });

    setQuestionBuckets((prev) => {
      const next = {
        behavioral: prev?.behavioral ?? [],
        technical: prev?.technical ?? [],
        role_specific: prev?.role_specific ?? [],
        custom: [...(prev?.custom ?? []), q],
      };

      persistHomeState({
        questionBuckets: next,
        questions: [
          ...(next.behavioral ?? []),
          ...(next.technical ?? []),
          ...(next.role_specific ?? []),
          ...(next.custom ?? []),
        ],
      });

      return next;
    });
  }}
  style={{
    padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
    border: customQuestion.trim()
      ? "1px solid var(--accent-strong)"
      : "none",
    background: customQuestion.trim()
      ? "var(--accent-soft)"
      : "transparent",
    color: customQuestion.trim() ? "var(--accent)" : "var(--text-muted)",
    fontWeight: 600,
    cursor: customQuestion.trim() ? "pointer" : "not-allowed",
    fontSize: 13,
  }}
>
  Use custom question
</button>
      </div>
    </div>
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
    gap: 14,
    paddingBottom: 14,
    marginBottom: 2,
  }}
>
  <div>
    <div
  style={{
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.7,
    color: "var(--text-muted)",
  }}
>
  Practice
</div>

    <h2
  style={{
    margin: "6px 0 0 0",
    fontSize: 19,
    fontWeight: 700,
    letterSpacing: -0.2,
    color: "var(--text-primary)",
  }}
>
  Voice Practice
</h2>

<div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>
  Record like a real interview. We’ll transcribe and score your answer.
</div>
  </div>

  <button
  type="button"
  onClick={() => setShowAdvanced((v) => !v)}
  style={{
    padding: "8px 12px",
    borderRadius: "var(--radius-sm)",
    border: showAdvanced ? "1px solid var(--accent-strong)" : "none",
    background: showAdvanced ? "var(--accent-soft)" : "transparent",
    color: showAdvanced ? "var(--accent)" : "var(--text-muted)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: "nowrap",
  }}
>
    {showAdvanced ? "Hide insights" : "Advanced insights"}
  
  </button>
</div>

<CollapsibleNoteCard
  title="Next Attempt Focus"
  summary={`${focusCopy[activeFocus].title}: ${focusCopy[activeFocus].tip}`}
  defaultOpen={false}
>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
      {focusGoal ? "Locked by you" : "Suggested from recent attempts"}
    </div>

    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "4px 10px",
        borderRadius: 999,
        border: focusGoal
          ? "1px solid var(--accent-strong)"
          : "none",
        color: focusGoal ? "var(--accent)" : "var(--text-muted)",
        background: focusGoal ? "var(--accent-soft)" : "transparent",
        whiteSpace: "nowrap",
      }}
    >
      {focusCopy[activeFocus].title}
    </span>
  </div>

  <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>
  {focusCopy[activeFocus].tip}
</div>

<div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
  Next attempt: focus on <span style={{ color: "var(--accent)", fontWeight: 600 }}>{focusCopy[activeFocus].title}</span>{" "}
  while recording, then hit <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>Analyze Answer</span>.
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
              ? "1px solid var(--accent-strong)"
              : "none",
            background: selected ? "var(--accent-soft)" : "transparent",
            color: selected ? "var(--accent)" : "var(--text-muted)",
            fontSize: 12,
            fontWeight: 600,
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
          border: "none",
          background: "transparent",
          color: "var(--text-muted)",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Reset
      </button>
    ) : null}
  </div>

  {/* ESL / International Mode Toggle */}
  <div
    style={{
      marginTop: 14,
      paddingTop: 12,
      borderTop: "1px solid var(--card-border-soft)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    }}
  >
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
        International / ESL Mode
      </div>
      <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
        Adjusts filler & pace thresholds for non-native English speakers.
      </div>
    </div>
    <button
      type="button"
      onClick={toggleEslMode}
      style={{
        padding: "6px 14px",
        borderRadius: 999,
        border: eslMode ? "1px solid var(--accent-strong)" : "1px solid var(--card-border)",
        background: eslMode ? "var(--accent-soft)" : "transparent",
        color: eslMode ? "var(--accent)" : "var(--text-muted)",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        flex: "0 0 auto",
      }}
    >
      {eslMode ? "On" : "Off"}
    </button>
  </div>
</CollapsibleNoteCard>

{wavUrlRef.current && (
  <div style={{ marginTop: 16 }}>
    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Replay (WAV)</div>
    <audio controls src={wavUrlRef.current} />
  </div>
)}

{(() => {
  const mm = Math.floor(timeLeft / 60);
  const ss = timeLeft % 60;
  const label = `${mm}:${ss.toString().padStart(2, "0")}`;
  return (
   <div
  style={{
    marginTop: 14,
    padding: "10px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  }}
>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <span style={{ opacity: 0.85 }}>⏱</span>
  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.3 }}>
  Time Left
</span>
<span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{label}</span>
</div>

      <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
        

  <button
  type="button"
  onClick={() => {
    setTimerRunning(false);
    setTimeLeft(answerTimeLimit);
  }}
  style={{
    height: 30,
    padding: "0 10px",
    borderRadius: 10,
    border: "none",
    background: "transparent",
    color: "var(--text-muted)",
    fontWeight: 500,
    cursor: "pointer",
  }}
>
  Reset
</button>
      </div>
    </div>
  );
})()}

{/* Webcam opt-in toggle */}
{!recording && (
  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: "var(--radius-sm)", border: `1px solid ${webcamEnabled ? "rgba(16,185,129,0.4)" : "var(--card-border-soft)"}`, background: webcamEnabled ? "rgba(16,185,129,0.06)" : "var(--card-bg)" }}>
    <button
      type="button"
      onClick={() => setWebcamEnabled((v) => !v)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        border: "none",
        background: webcamEnabled ? "#10B981" : "var(--card-border)",
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 150ms",
      }}
    >
      <span style={{
        position: "absolute",
        top: 2,
        left: webcamEnabled ? 18 : 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        background: "#fff",
        transition: "left 150ms",
      }} />
    </button>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: webcamEnabled ? "#10B981" : "var(--text-muted)" }}>
        {webcamEnabled ? "📷 Webcam Analysis On" : "📷 Enable Webcam Analysis"}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
        {webcamEnabled
          ? "Eye contact, expressiveness & head stability will be added to your results."
          : "Adds visual delivery metrics - eye contact, expressiveness, head stability - to your results."}
      </div>
    </div>
  </div>
)}

{/* Controls */}
<div style={{ marginTop: 12, display: "flex", gap: 10 }}>
    <button
      type="button"
      onClick={startRecording}
      disabled={recording}
      {...hoverLiftHandlers()}
      style={withHoverLift({
  flex: "1 1 0",
  padding: "10px 12px",
  borderRadius: "var(--radius-sm)",
  border: recording
    ? "1px solid var(--card-border-soft)"
    : "1px solid var(--accent-strong)",
  background: recording ? "var(--card-bg)" : "var(--accent-soft)",
  color: recording ? "var(--text-muted)" : "var(--accent)",
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
  padding: "12px 14px",
  borderRadius: "var(--radius-sm)",
  border: !recording
    ? "1px solid var(--card-border-soft)"
    : "1px solid var(--card-border-soft)",
  background: !recording ? "transparent" : "var(--card-bg-strong)",
  color: !recording ? "var(--text-muted)" : "var(--text-primary)",
  fontSize: 14,
  fontWeight: 800,
  cursor: !recording ? "not-allowed" : "pointer",
  opacity: !recording ? 0.75 : 1,
}}
    >
      Stop
    </button>
  </div>

{/* Analyze CTA (always visible) */}
<div
  style={{
    marginTop: 14,
    padding: "14px 0",
  }}
>
 {!entitlement?.isPro ? (
  <div
  style={{
    marginBottom: 12,
    color: "var(--text-muted)",
    fontSize: 12,
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  }}
>
  <span style={{ color: "var(--text-muted)" }}>Free attempts:</span>
  <span style={{ color: "var(--accent)", fontWeight: 600 }}>
    {entitlement?.cap == null ? " - " : `${entitlement.used}/${entitlement.cap}`}
  </span>
  <span style={{ color: "var(--text-muted)" }}>•</span>
  <span style={{ color: "var(--text-muted)" }}>Remaining:</span>
  <span style={{ color: "var(--accent)", fontWeight: 600 }}>
    {entitlement?.remaining == null ? " - " : entitlement.remaining}
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
  padding: "13px 16px",
  fontSize: 14,
  fontWeight: 900,
  borderRadius: "var(--radius-sm)",
  border: analyzeDisabled
    ? "1px solid var(--card-border)"
    : "1px solid var(--accent-strong)",
  background: analyzeDisabled
    ? "var(--card-bg)"
    : "linear-gradient(135deg, var(--accent-2), var(--accent))",
  boxShadow: analyzeDisabled ? "none" : "var(--shadow-glow)",
  color: analyzeDisabled ? "var(--text-muted)" : "var(--text-primary)",
  cursor: analyzeDisabled ? "not-allowed" : "pointer",
  opacity: analyzeDisabled ? 0.75 : 1,
})}
>
  {feedbackLoading ? "Analyzing…" : capHit ? "Upgrade to Continue" : "Analyze Answer"}
</button>

  <div style={{ marginTop: 9, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
  {recording
    ? "Finish speaking, then press Stop."
    : !selectedQuestion.trim()
    ? "Pick a question first to continue."
    : !transcript.trim()
    ? "Record or paste a response to enable analysis."
    : capHit
    ? "You’ve reached the free limit. Upgrade to Pro for unlimited attempts."
    : "Ready to score this answer and get next-step coaching."}
</div>
</div>


{/* Live waveform + webcam */}
  <div style={{ marginTop: 12, position: "relative" }}>
    {webcamEnabled && <WebcamOverlay ref={webcamRef} isRecording={recording} position="bottom-right" />}
    <canvas
  ref={waveformCanvasRef}
  style={{
    width: "100%",
    height: 90,
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--card-border-soft)",
    background: "var(--card-bg-strong)",
    display: recording ? "block" : "none",
  }}
/>
  </div>

 {voiceError ? (
  <div
  style={{
    marginTop: 14,
    padding: 10,
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--danger-soft)",
    background: "var(--danger-soft)",
    color: "var(--danger)",
    fontSize: 12,
    fontWeight: 500,
  }}
>
  {voiceError}
</div>
) : null}

<div
  style={{
    marginTop: 16,
  }}
>
  {/* Header */}

  <div
  style={{
    padding: "8px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  }}
>
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.7, color: "var(--text-muted)" }}>
  Transcript
</div>
<div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
  {inputMethod === "spoken" ? "Auto-transcribed from your recording" : "Pasted/typed (pace disabled)"}
</div>
    </div>

    <span
  style={{
    fontSize: 11,
    fontWeight: 500,
    padding: "4px 10px",
    borderRadius: 999,
    border: "none",
    background: "var(--card-bg-strong)",
    color: "var(--text-muted)",
    whiteSpace: "nowrap",
  }}
>
      {transcript.trim() ? `${transcript.trim().split(/\s+/).filter(Boolean).length} words` : "Empty"}
    </span>
  </div>
 

  {/* Body */}
  <div style={{ paddingTop: 8 }}>
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
  boxSizing: "border-box",
  display: "block",
  height: 148,
  padding: 13,
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: 0.15,
  lineHeight: 1.6,
  color: "var(--text-primary)",
  background: "var(--card-bg-strong)",
  border: "1px solid var(--card-border-soft)",
  borderRadius: "var(--radius-sm)",
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

    borderRadius: "var(--radius-xl)",
    border: "1px solid var(--card-border)",
    background: "var(--app-bg)",
    boxShadow: "var(--shadow-card)",
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
    background: "var(--app-bg)",
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
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
  Advanced Insights
</div>
<div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
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
    border: "1px solid var(--card-border-soft)",
    background: "var(--card-bg-strong)",
    color: "var(--text-primary)",
    cursor: "pointer",
    fontSize: 20,
    fontWeight: 400,
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
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--accent-strong)",
    background:
      "radial-gradient(900px 420px at 15% -10%, var(--accent-soft), transparent 60%), var(--card-bg)",
    color: "var(--text-primary)",
  }}
>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.3, color: "var(--text-primary)" }}>
  Coach Insights
</div>
<div style={{ fontSize: 12, color: "var(--text-muted)" }}>
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
    padding: "14px 0",
    color: "var(--text-primary)",
  }}
>
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
  <button
  type="button"
  onClick={clearHistory}
  disabled={history.length === 0}
  style={{
    padding: "9px 12px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    background: history.length === 0 ? "transparent" : "var(--danger-soft)",
    color: history.length === 0 ? "var(--text-muted)" : "var(--danger)",
    cursor: history.length === 0 ? "not-allowed" : "pointer",
    fontSize: 12,
    fontWeight: 500,
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
          ["star_result", "Closing Impact"],
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
              border: active ? "1px solid var(--accent-strong)" : "none",
              background: active ? "var(--accent-soft)" : "transparent",
              color: active ? "var(--accent)" : "var(--text-muted)",
              fontSize: 12,
              fontWeight: 600,
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
          border: "1px solid var(--card-border-soft)",
          background:
            "radial-gradient(900px 420px at 15% -10%, var(--accent-soft), transparent 60%), var(--card-bg)",
          flex: "0 0 auto",
        }}
      >
        <path
          d={`M 6 ${(sparkH - 6).toFixed(1)} L ${(sparkW - 6).toFixed(1)} ${(sparkH - 6).toFixed(1)}`}
          stroke="var(--card-border)"
          strokeWidth="1"
          fill="none"
        />
        <path
          d={sparkPath}
          stroke="var(--accent)"
          strokeWidth="2.25"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div style={{ flex: "1 1 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Avg</div>
            <div style={{ marginTop: 4, fontWeight: 700 }}>{avgScore ?? " - "}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Min</div>
            <div style={{ marginTop: 4, fontWeight: 700 }}>{minScore ?? " - "}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Max</div>
            <div style={{ marginTop: 4, fontWeight: 700 }}>{maxScore ?? " - "}</div>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
          {history.length < 2
            ? "Do a couple attempts to see the trend line."
            : "Trend updates as you practice - newest attempt is on the right."}
        </div>
      </div>
    </div>
  </div>

  {/* Attempts */}
  <div
  style={{
    padding: "14px 0",
    color: "var(--text-primary)",
  }}
>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.3, color: "var(--text-primary)" }}>Attempts</div>
<div style={{ fontSize: 12, color: "var(--text-muted)" }}>{history.length} saved</div>
    </div>

    {history.length === 0 ? (
      <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
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

  // ✅ ADD THIS
  deliveryMetrics: (h as any).deliveryMetrics ?? null,

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
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--card-border-soft)",
  background: "var(--card-bg)",
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 12,
  alignItems: "center",
  cursor: "pointer",
  transition: "all 120ms ease",
}}
                onMouseEnter={(e) =>
  (e.currentTarget.style.background = "var(--card-bg-strong)")
}
onMouseLeave={(e) =>
  (e.currentTarget.style.background = "var(--card-bg)")
}
              >

              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
  <div style={{ fontWeight: 700 }}>Score: {displayOverall100(h.score)}</div>
  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{when}</div>
                  {h.inputMethod === "spoken" ? (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--accent)",
                        border: "1px solid var(--accent-strong)",
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
                        color: "var(--text-muted)",
                        border: "none",
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      pasted
                    </span>
                  )}
                  {typeof h.wpm === "number" ? (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>· {h.wpm} wpm</span>
                  ) : null}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "var(--text-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={h.question}
                >
                  Q: {h.question || " - "}
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
                      border: isPlaying ? "1px solid var(--accent-strong)" : "none",
                      background: isPlaying ? "var(--accent-soft)" : "transparent",
                      color: isPlaying ? "var(--accent)" : "var(--text-muted)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isPlaying ? "Stop" : "Replay"}
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--text-soft)" }}>No audio</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>

  

  {/* Feedback */}
  {feedback && (
    <div style={{ padding: "14px 0", color: "var(--text-primary)" }}>

      {/* ── Archetype Hero Block ─────────────────────────────────── */}
      {(() => {
        const archetype = feedback?.delivery_archetype as string | undefined;
        const archetypeColor = archetype ? (ARCHETYPE_COLOR[archetype as keyof typeof ARCHETYPE_COLOR] ?? "var(--accent)") : "var(--accent)";
        const pct = Math.max(0, Math.min(1, overallScore100 / 100));
        const deg = Math.round(pct * 360);
        return (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
              padding: "14px 16px",
              borderRadius: 16,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
              marginBottom: 14,
            }}
          >
            {/* Score Ring */}
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 999,
                background: `conic-gradient(${archetypeColor} ${deg}deg, var(--card-border) 0deg)`,
                display: "grid",
                placeItems: "center",
                flex: "0 0 auto",
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  background: "var(--card-bg-strong)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {overallScore100}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {archetype ?? "Analysis Complete"}
                </span>
                {archetype && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: `${archetypeColor}22`,
                      color: archetypeColor,
                      border: `1px solid ${archetypeColor}44`,
                    }}
                  >
                    Archetype
                  </span>
                )}
                {feedback?.esl_mode_active && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "#7C3AED18",
                      color: "#7C3AED",
                      border: "1px solid #7C3AED33",
                    }}
                  >
                    ESL calibrated
                  </span>
                )}
              </div>
              {feedback?.archetype_description && (
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {feedback.archetype_description}
                </div>
              )}
              {feedback?.archetype_coaching && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "var(--text-primary)",
                    fontWeight: 500,
                    lineHeight: 1.5,
                    borderLeft: `2px solid ${archetypeColor}`,
                    paddingLeft: 8,
                  }}
                >
                  {feedback.archetype_coaching}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Reward Unlocks Banner ─────────────────────────────────── */}
      {rewardUnlocks.length > 0 && !rewardDismissed && (
        <div
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid #10B98144",
            background: "#10B98110",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#10B981" }}>
              Improvement unlocked
            </span>
            <button
              type="button"
              onClick={() => setRewardDismissed(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 12,
                padding: "2px 6px",
              }}
            >
              Dismiss
            </button>
          </div>
          {rewardUnlocks.map((r) => (
            <div
              key={r.metricKey}
              style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.6 }}
            >
              • {r.celebrationLine}
            </div>
          ))}
        </div>
      )}

      {/* ── ESL Cultural Note ────────────────────────────────────── */}
      {feedback?.esl_cultural_note && (
        <div
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid #7C3AED33",
            background: "#7C3AED08",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", marginBottom: 5 }}>
            US interview context
          </div>
          <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.6 }}>
            {feedback.esl_cultural_note}
          </div>
        </div>
      )}

      {/* ── Gauge Grid ───────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {/* Delivery tile - comm + conf merged */}
        <GaugeTile
          title="Delivery"
          value={Math.round(((feedback?.communication_score ?? 0) + (feedback?.confidence_score ?? 0)) / 2 * 10)}
          max={100}
          subtitle="Communication · Confidence"
        >
          <MetricBar label="Communication" value={feedback?.communication_score ?? 0} max={10} />
          <MetricBar label="Confidence" value={feedback?.confidence_score ?? 0} max={10} />
          {feedback?.filler && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
              Fillers: {feedback.filler.total} ({feedback.filler.per100}/100 words)
            </div>
          )}
          {wpm !== null && (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
              Pace: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{wpm} wpm</span>
            </div>
          )}
          {feedback?.confidence_explanation && (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
              {feedback.confidence_explanation}
            </div>
          )}
        </GaugeTile>

        {/* Content Quality tile */}
        {feedback?.star ? (
          <GaugeTile
            title="Content Quality"
            value={Math.round(
              ((feedback.star.situation ?? 0) +
                (feedback.star.task ?? 0) +
                (feedback.star.action ?? 0) +
                (feedback.star.result ?? 0)) / 4 * 10
            )}
            max={100}
            subtitle="STAR Framework"
          >
            <MetricBar label="Situation" value={feedback.star.situation ?? 0} max={10} />
            <MetricBar label="Task" value={feedback.star.task ?? 0} max={10} />
            <MetricBar label="Action" value={feedback.star.action ?? 0} max={10} />
            <MetricBar label="Result" value={feedback.star.result ?? 0} max={10} />
          </GaugeTile>
        ) : (
          <GaugeTile
            title="Content Quality"
            value={overallScore100}
            max={100}
            subtitle="Overall answer quality"
          >
            <MetricBar label="Overall Score" value={overallScore100} max={100} />
          </GaugeTile>
        )}
      </div>

      {/* ── What Worked ──────────────────────────────────────────── */}
      {Array.isArray(feedback?.strengths) && feedback.strengths.length > 0 && (
        <details
          style={{
            marginTop: 12,
            borderRadius: 14,
            border: "1px solid var(--card-border-soft)",
            background: "var(--card-bg)",
            padding: 12,
          }}
        >
          <summary
            style={{
              listStyle: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            What Worked ▾
          </summary>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {(feedback.strengths as string[]).map((s, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.5 }}>
                <span style={{ color: "#10B981", fontWeight: 700, marginRight: 6 }}>✓</span>{s}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ── Where to Improve ─────────────────────────────────────── */}
      {Array.isArray(feedback?.improvements) && feedback.improvements.length > 0 && (
        <details
          style={{
            marginTop: 8,
            borderRadius: 14,
            border: "1px solid var(--card-border-soft)",
            background: "var(--card-bg)",
            padding: 12,
          }}
        >
          <summary
            style={{
              listStyle: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Where to Improve ▾
          </summary>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {(feedback.improvements as string[]).map((s, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.5 }}>
                <span style={{ color: "var(--accent)", fontWeight: 700, marginRight: 6 }}>→</span>{s}
              </div>
            ))}
          </div>
        </details>
      )}

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
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--card-border)",
    background: "var(--app-bg)",
    boxShadow: "var(--shadow-card)",
    padding: 16,
  }}
>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
  Analyzing your answer…
</div>
<div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
  {Math.round(progress)}%
</div>
      </div>

      <div
        style={{
          marginTop: 12,
          height: 12,
          borderRadius: 999,
          background: "var(--card-border)",
          overflow: "hidden",
          border: "1px solid var(--card-border)",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, var(--accent-2), var(--accent))",
boxShadow: "var(--shadow-glow)",
            transition: "width 420ms ease",
          }}
        />
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
  {analysisStage}
</div>
    </div>
  </div>
)}
<UpgradeModal
  open={upgradeOpen}
  onClose={() => setUpgradeOpen(false)}
  onPrimary={async () => {
    setUpgradeOpen(false);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "subscription" }) });
      const data = await res.json();
      if (data?.url) { window.location.href = data.url; }
    } catch {}
  }}
/>

</PremiumShell>
);
}