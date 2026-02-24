"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import PremiumShell from "../../components/PremiumShell";
import PremiumCard from "../../components/PremiumCard";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";


type Prosody = {
  pitchStdHz: number;
  energyStd: number;
  monotoneScore: number; // 1–10
  feedback: string;
};

type StoredResult = {
  ts: number;
  question: string;
  transcript: string;
  wpm: number | null;
  jobDesc?: string;
  questions?: string[];
  questionBuckets?: {
    behavioral: string[];
    technical: string[];
    culture: string[];
  } | null;
  prosody?: Prosody | null;
  feedback: any;
};

function safeJSONParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5);
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
      hint: "Great pace — clear, steady, and confident.",
    };
  }
  if (wpm <= 165) {
    return {
      label: "Fast",
      hint: "A bit quick — slow down on key points and numbers for clarity.",
    };
  }
  return {
    label: "Very fast",
    hint: "Too fast for most interviews — add intentional pauses after results and metrics.",
  };
}

function gradeFromScore(score: number) {
  if (score >= 9) return { grade: "A+", label: "Excellent" };
  if (score >= 8) return { grade: "A", label: "Strong" };
  if (score >= 7) return { grade: "B", label: "Good" };
  if (score >= 6) return { grade: "C", label: "Needs polish" };
  return { grade: "D", label: "Needs work" };
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
        <div style={{ fontSize: 14, color: "#E5E7EB", fontWeight: 800 }}>
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
            boxShadow: "0 0 18px rgba(99,102,241,0.30)",
            transition: "width 250ms ease",
          }}
        />
      </div>

      {subtext ? <div style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF" }}>{subtext}</div> : null}
    </div>
  );
}


function SectionCard({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
  badgeValue,
  badgeMax = 10,
}: {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  badgeValue?: number | null;
  badgeMax?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!collapsible) {
    return (
      <PremiumCard style={{ marginTop: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 950, color: "#E5E7EB" }}>{title}</div>
        <div style={{ marginTop: 10 }}>{children}</div>
      </PremiumCard>
    );
  }

  return (
    <PremiumCard style={{ marginTop: 14, padding: 0 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: 18,
          cursor: "pointer",
          fontSize: 16,
          fontWeight: 950,
          color: "#E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          userSelect: "none",
        }}
      >
        <span>{title}</span>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
          {typeof badgeValue === "number" && Number.isFinite(badgeValue) ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 92,
                  height: 8,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.10)",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <div
                  style={{
                    width: `${Math.max(0, Math.min(100, (badgeValue / badgeMax) * 100))}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: "linear-gradient(90deg, rgba(99,102,241,0.95), rgba(34,211,238,0.85))",
                    boxShadow: "0 0 14px rgba(99,102,241,0.30)",
                    transition: "width 200ms ease",
                  }}
                />
              </div>

              <div style={{ fontSize: 12, fontWeight: 900, color: "#E5E7EB" }}>
                {badgeValue}/{badgeMax}
              </div>
            </div>
          ) : null}

          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#9CA3AF",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>{open ? "Collapse" : "Expand"}</span>
            <span
              style={{
                display: "inline-block",
                transition: "transform 200ms ease",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ▾
            </span>
          </span>
        </div>
      </div>

      {open ? <div style={{ padding: "0 18px 18px 18px" }}>{children}</div> : null}
    </PremiumCard>
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
        border: isMissing ? "1px solid rgba(248,113,113,0.22)" : "1px solid rgba(34,197,94,0.18)",
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
          fontWeight: 900,
          color: "#E5E7EB",
          background: "rgba(255,255,255,0.10)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        {letter}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ color: "#E5E7EB", fontWeight: 900, fontSize: 13 }}>{label}</div>
        <div
          style={{
            color: isMissing ? "rgba(248,113,113,0.95)" : "rgba(34,197,94,0.95)",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {isMissing ? "Missing" : "Detected"}
        </div>
      </div>
    </div>
  );
}

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

// Heuristic evidence: fast + local (no extra model call).
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
    (s) => /\bi (analyz|audit|built|created|designed|drove|implemented|led|ran|set up|worked|partnered|coordinated)\b/i.test(
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



export default function ResultsPage() {
  const router = useRouter();
  const [stored, setStored] = useState<StoredResult | null>(null);
  const { data: session, status } = useSession();

const LAST_RESULT_KEY = userScopedKey("ipc_last_result", session);
const SELECTED_KEY = userScopedKey("ipc_selected_attempt", session);

useEffect(() => {
  if (status === "loading") return;


  try {
    const selectedRaw =
      sessionStorage.getItem(SELECTED_KEY) ||
      localStorage.getItem(SELECTED_KEY);

    if (selectedRaw) {
      setStored(JSON.parse(selectedRaw));
      return;
    }

    const raw =
      sessionStorage.getItem(LAST_RESULT_KEY) ||
      localStorage.getItem(LAST_RESULT_KEY);

    if (raw) setStored(JSON.parse(raw));
    else setStored(null);
  } catch {
    setStored(null);
  }
}, [status, SELECTED_KEY, LAST_RESULT_KEY]);


  const feedback = stored?.feedback ?? null;

  const starAvg = useMemo(() => {
    if (!feedback?.star) return null;
    const s = feedback.star;
    const avg = (Number(s.situation) + Number(s.task) + Number(s.action) + Number(s.result)) / 4;
    return Math.round(avg * 10) / 10;
  }, [feedback]);

  const starEvidence = useMemo(() => extractStarEvidence(stored?.transcript ?? ""), [stored?.transcript]);

const starMissingList = useMemo(() => {
  const raw = Array.isArray(feedback?.star_missing) ? (feedback.star_missing as any[]) : [];
  return raw.map((s) => String(s).toLowerCase());
}, [feedback]);

  const insightBullets = useMemo(() => {
  if (!stored || !feedback) return null;

  const score = Number(feedback.score ?? 0);
  const seed = Number(stored.ts ?? Date.now()); // deterministic per attempt

  // Score bands
  const band =
    score >= 9 ? "elite" :
    score >= 8 ? "strong" :
    score >= 7 ? "good" :
    score >= 6 ? "polish" : "work";

  // Compute lever here (same logic as gamePlan)
  const comm = Number(feedback.communication_score ?? 0);
  const conf = Number(feedback.confidence_score ?? 0);

  const fillerPer100 = Number(feedback.filler?.per100 ?? 0);
  const hasFillers = Number.isFinite(fillerPer100) && fillerPer100 > 0;

  const star = feedback.star ?? null;
  const starMissing: string[] = Array.isArray(feedback.star_missing) ? feedback.star_missing : [];
  const starResult = star ? Number(star.result ?? 0) : null;

  const hasProsody = !!stored.prosody && typeof stored.prosody?.monotoneScore === "number";
  const vocal = hasProsody ? Number(stored.prosody!.monotoneScore) : null;

  let lever:
    | "STAR Result"
    | "Fillers"
    | "Confidence"
    | "Communication"
    | "Vocal variety"
    | "Polish" = "Polish";

  if (star && (starMissing.includes("result") || (starResult !== null && starResult <= 6))) lever = "STAR Result";
  else if (hasFillers && fillerPer100 >= 3) lever = "Fillers";
  else if (conf > 0 && conf <= 6) lever = "Confidence";
  else if (comm > 0 && comm <= 6) lever = "Communication";
  else if (vocal !== null && vocal <= 4) lever = "Vocal variety";
  else lever = "Polish";

  const snapshotPools: Record<string, string[]> = {
    elite: [
      "Interview-ready: clear ownership and tight structure.",
      "Strong answer with crisp logic and confident delivery.",
      "High-quality response; minimal improvements needed.",
    ],
    strong: [
      "Strong overall—structure is solid and easy to follow.",
      "Good answer with clear ownership; a bit more punch would elevate it.",
      "Strong performance; small refinements will make it stand out.",
    ],
    good: [
      "Solid foundation—clarity is there, impact can be sharper.",
      "Decent structure; needs more specificity to feel compelling.",
      "Good baseline answer; tighten and add concrete outcomes.",
    ],
    polish: [
      "Promising, but needs a clearer result and tighter phrasing.",
      "Some solid parts—improve clarity and measurable impact.",
      "Needs polish: simplify the story and land the outcome.",
    ],
    work: [
      "Needs work: the story isn’t landing clearly yet.",
      "Focus on structure first, then add outcomes.",
      "Right now it reads unclear—tighten and add specifics.",
    ],
  };

  const leverPools: Record<string, string[]> = {
    "STAR Result": [
      "Biggest lever: strengthen the RESULT with a metric and business impact.",
      "Biggest lever: end with a concrete outcome (%, $, time, SLA).",
      "Biggest lever: make the result measurable and unmistakable.",
    ],
    Fillers: [
      "Biggest lever: reduce fillers by using intentional pauses.",
      "Biggest lever: shorter sentences → fewer fillers.",
      "Biggest lever: tighten delivery to sound more confident.",
    ],
    Confidence: [
      "Biggest lever: lead with a decisive claim early.",
      "Biggest lever: use stronger verbs and fewer qualifiers.",
      "Biggest lever: sound more certain—claim → proof → result.",
    ],
    Communication: [
      "Biggest lever: simplify structure (Context → Action → Result).",
      "Biggest lever: cut setup and keep only decision-driving details.",
      "Biggest lever: make the narrative more linear and scannable.",
    ],
    "Vocal variety": [
      "Biggest lever: add vocal emphasis on metrics + outcomes.",
      "Biggest lever: vary cadence—short line, detail, short result.",
      "Biggest lever: pause after numbers and outcomes.",
    ],
    Polish: [
      "Biggest lever: small polish—tighten and add one stronger metric.",
      "Biggest lever: pick one improvement and execute it cleanly.",
      "Biggest lever: end earlier after the metric to sound crisp.",
    ],
  };

  const readinessPools: Record<string, string[]> = {
    elite: [
      "Ready for high-stakes interviews as-is.",
      "This would score well in a final-round setting.",
      "Strong interview-ready answer.",
    ],
    strong: [
      "One iteration away from a standout answer.",
      "With one stronger metric, this becomes final-round quality.",
      "Very close—tighten the result line and you’re there.",
    ],
    good: [
      "A couple iterations away from being interview-ready.",
      "Add specificity + a metric and it improves fast.",
      "Good base—refine and you’ll gain points quickly.",
    ],
    polish: [
      "Not quite interview-ready yet—needs a clearer impact line.",
      "Fix the main lever first, then re-run.",
      "One focused revision will noticeably improve this.",
    ],
    work: [
      "Rebuild with STAR structure first, then add metrics.",
      "Focus on clarity and outcome before style.",
      "Get the skeleton right—results will follow.",
    ],
  };

  const snapshot = pickVariant(snapshotPools[band] ?? [], seed + 1);
  const leverLine = pickVariant(leverPools[lever] ?? [], seed + 2);
  const readiness = pickVariant(readinessPools[band] ?? [], seed + 3);

  return [snapshot, leverLine, readiness].filter(Boolean);
}, [stored?.ts, stored?.prosody, stored?.wpm, feedback]);


  const gamePlan = useMemo(() => {
  if (!stored || !feedback) return null;



  const tips: string[] = [];

  const comm = Number(feedback.communication_score ?? 0);
  const conf = Number(feedback.confidence_score ?? 0);
  const overall = Number(feedback.score ?? 0);

  const fillerPer100 = Number(feedback.filler?.per100 ?? 0);
  const hasFillers = Number.isFinite(fillerPer100) && fillerPer100 > 0;

  const star = feedback.star ?? null;
  const starMissing: string[] = Array.isArray(feedback.star_missing) ? feedback.star_missing : [];
  const starResult = star ? Number(star.result ?? 0) : null;

  const hasProsody = !!stored.prosody && typeof stored.prosody?.monotoneScore === "number";
  const vocal = hasProsody ? Number(stored.prosody!.monotoneScore) : null;

  // Pick ONE main lever (priority order)
  let lever:
    | "STAR Result"
    | "Fillers"
    | "Confidence"
    | "Communication"
    | "Vocal variety"
    | "Polish" = "Polish";

  if (star && (starMissing.includes("result") || (starResult !== null && starResult <= 6))) lever = "STAR Result";
  else if (hasFillers && fillerPer100 >= 3) lever = "Fillers";
  else if (conf > 0 && conf <= 6) lever = "Confidence";
  else if (comm > 0 && comm <= 6) lever = "Communication";
  else if (vocal !== null && vocal <= 4) lever = "Vocal variety";
  else lever = "Polish";

  // Build tips based on lever
  if (lever === "STAR Result") {
    tips.push("End with one crisp RESULT line: impact + metric (%, $, time, SLA).");
    tips.push("Use this sentence starter: “The outcome was ___, measured by ___, which improved ___ by ___.”");
    tips.push("If you can’t quantify, use scope + speed: “shipped in X days / reduced rework / improved visibility.”");
  } else if (lever === "Fillers") {
    tips.push("Replace “um/like” with a one-beat pause. Shorter sentences = fewer fillers.");
    tips.push("Use 2-sentence structure: claim → proof. Don’t add a 3rd sentence unless it’s a metric.");
    tips.push("Try this: “I did X. It led to Y (metric).” Then stop.");
  } else if (lever === "Confidence") {
    tips.push("Start with your claim in the first 5 seconds (no warm-up).");
    tips.push("Use decisive verbs: “I led / built / drove / fixed” + 1 metric.");
    tips.push("End sentences downward (avoid trailing upward tone).");
  } else if (lever === "Communication") {
    tips.push("Use a 3-beat answer: Context → What I did → Result.");
    tips.push("Name your tools/process: “I used X to do Y” (SAP, metrics, stakeholder cadence, etc.).");
    tips.push("Cut setup details; keep only what explains your decision.");
  } else if (lever === "Vocal variety") {
    tips.push("Emphasize numbers + outcomes with a pitch lift, then pause.");
    tips.push("Vary sentence length: short statement → longer detail → short result.");
    tips.push("Smile slightly on the result line — it changes tone instantly.");
  } else {
    tips.push("Pick one lever for the next attempt and optimize only that.");
    tips.push("Aim for 1 metric + 1 decision + 1 result (then stop).");
    tips.push("Keep it 45–75 seconds unless asked for more.");
  }

  // Add pace tip ONLY if spoken (wpm exists)
  if (typeof stored.wpm === "number") {
    if (stored.wpm < 100) tips.unshift("Pace is slow: tighten pauses and get to the point earlier.");
    else if (stored.wpm > 165) tips.unshift("Pace is fast: pause after results and numbers for clarity.");
  }

  // One-line summary label
  const summary =
    lever === "Polish"
      ? `Next attempt: small polish (overall ${overall}/10).`
      : `Biggest lever: ${lever}.`;

  return { lever, summary, tips: tips.slice(0, 4) };
}, [stored, feedback, starAvg]);

return (
  <PremiumShell title="Results" subtitle="Review performance and iterate.">
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
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "#E5E7EB",
            fontWeight: 800,
          }}
        >
          ← Back
        </button>

        <div style={{ color: "#9CA3AF", fontSize: 12 }}>
          {stored?.ts ? `Saved ${new Date(stored.ts).toLocaleString()}` : ""}
        </div>
      </div>

      {/* keep the rest of your existing Results JSX exactly the same below this line */}


      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 32, fontWeight: 950, letterSpacing: -0.5 }}>Results</div>
        <div style={{ marginTop: 6, color: "#9CA3AF" }}>
          {stored?.ts ? `Saved ${new Date(stored.ts).toLocaleString()}` : "No saved result yet."}
        </div>
      </div>

      {!stored || !feedback ? (
        <SectionCard title="No results found">
          <div style={{ color: "#9CA3AF", lineHeight: 1.6 }}>
            Go back, record an answer, then click <strong>Analyze My Answer</strong>.
          </div>
        </SectionCard>
      ) : (
        <>
         

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
  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
    <div
      style={{
        fontSize: 34,
        fontWeight: 950,
        letterSpacing: -0.5,
      }}
    >
      {gradeFromScore(Number(feedback.score ?? 0)).grade}
    </div>
    <div style={{ color: "#9CA3AF", fontSize: 13 }}>
      {gradeFromScore(Number(feedback.score ?? 0)).label}
    </div>
  </div>

{insightBullets ? (
  <ul
    style={{
      marginTop: 16,
      marginBottom: 0,
      paddingLeft: 18,
      lineHeight: 1.6,
    }}
  >
    {insightBullets.map((t, i) => (
      <li
        key={i}
        style={{
          marginTop: i === 0 ? 0 : 6,
          color: "#9CA3AF",
          fontSize: 13,
        }}
      >
        {t}
      </li>
    ))}
  </ul>
) : null}



 <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
  {/* Pace pill */}
  <div
    style={{
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      color: "#E5E7EB",
      fontSize: 12,
      fontWeight: 800,
      display: "flex",
      gap: 8,
      alignItems: "center",
    }}
  >
    <span style={{ color: "#9CA3AF", fontWeight: 900 }}>Pace</span>
    <span>{typeof stored?.wpm === "number" ? `${stored.wpm} wpm` : "—"}</span>
    {typeof stored?.wpm === "number" ? (
      <span style={{ color: "#9CA3AF", fontWeight: 800 }}>· {paceContext(stored.wpm).label}</span>
    ) : null}
  </div>
</div>

</div>

{/* Question */}
{stored?.question ? (
  <div
    style={{
      marginTop: 16,
      marginBottom: 18, // ✅ this is the spacing you want
      padding: 16,
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.08)",
      background:
        "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      minWidth: 0,
    }}
  >
    <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 800, letterSpacing: 0.5 }}>
      Question
    </div>
    <div
      style={{
        marginTop: 8,
        fontSize: 14,
        lineHeight: 1.6,
        color: "#E5E7EB",
      }}
    >
      {stored.question}
    </div>
  </div>
) : null}
{/* Top tiles: Overall as main, then Comm/Conf/STAR underneath in one row */}
<div style={{ marginTop: 10 }}>
  {/* Main Overall tile */}
  <div
    style={{
      padding: 22,
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.10)",
      background:
        "radial-gradient(900px 420px at 15% -10%, rgba(99,102,241,0.18), transparent 60%), rgba(17,24,39,0.92)",
      boxShadow: "0 14px 50px rgba(0,0,0,0.35)",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 800, letterSpacing: 0.5 }}>
          Overall
        </div>
        <div style={{ marginTop: 8, fontSize: 44, fontWeight: 950, letterSpacing: -0.8, color: "#E5E7EB" }}>
          {Number(feedback.score ?? 0)}/10
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: "#9CA3AF" }}>
          {gradeFromScore(Number(feedback.score ?? 0)).label}
        </div>
      </div>

      
    </div>

    {/* Overall progress bar */}
    <div
      style={{
        marginTop: 14,
        height: 8,
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, (Number(feedback.score ?? 0) / 10) * 100))}%`,
          height: "100%",
          background:
            "linear-gradient(90deg, rgba(99,102,241,0.95), rgba(34,211,238,0.85))",
          transition: "width 300ms ease",
        }}
      />
    </div>
  </div>

  {/* Secondary tiles row */}
  <div
    style={{
      marginTop: 16,
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: 16,
    }}
  >
    {[
      { label: "Communication", value: Number(feedback.communication_score ?? 0), sub: "Clarity + structure" },
      { label: "Confidence", value: Number(feedback.confidence_score ?? 0), sub: "Tone + decisiveness" },
      { label: "STAR Avg", value: typeof starAvg === "number" ? starAvg : null, sub: "Situation/Task/Action/Result" },
    ].map((m) => (
      <div
        key={m.label}
        style={{
          padding: 18,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          minWidth: 0,
        }}
      >
        <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 800, letterSpacing: 0.5 }}>
          {m.label}
        </div>

        <div style={{ marginTop: 8, fontSize: 28, fontWeight: 950, color: "#E5E7EB" }}>
          {typeof m.value === "number" ? `${m.value}/10` : "—"}
        </div>

        <div style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF", lineHeight: 1.4 }}>
          {m.sub}
        </div>

        <div
          style={{
            marginTop: 10,
            height: 6,
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.max(0, Math.min(100, (Number(m.value ?? 0) / 10) * 100))}%`,
              height: "100%",
              background:
                "linear-gradient(90deg, rgba(99,102,241,0.95), rgba(34,211,238,0.85))",
              transition: "width 300ms ease",
            }}
          />
        </div>
      </div>
    ))}
  </div>
</div>



</SectionCard>

<SectionCard title="Delivery Analysis" collapsible={false}>
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: 14,
    }}
  >
    {[
      {
        label: "Pace",
        value: typeof stored?.wpm === "number" ? stored.wpm : null,
        sub:
          typeof stored?.wpm === "number"
            ? paceContext(stored.wpm).label
            : "Not detected",
        format: (v: number) => `${v} wpm`,
        max: 200,
      },
      {
        label: "Fillers",
        value: typeof feedback.filler?.per100 === "number" ? feedback.filler.per100 : null,
        sub: "per 100 words",
        format: (v: number) => `${v}`,
        max: 15,
      },
      {
        label: "Vocal Variety",
        value:
          typeof stored?.prosody?.monotoneScore === "number"
            ? 10 - stored.prosody.monotoneScore
            : null,
        sub: "Pitch + energy variation",
        format: (v: number) => `${v}/10`,
        max: 10,
      },
      {
        label: "Confidence",
        value: typeof feedback.confidence_score === "number" ? feedback.confidence_score : null,
        sub: "Tone + decisiveness",
        format: (v: number) => `${v}/10`,
        max: 10,
      },
    ].map((m) => (
      <div
        key={m.label}
        style={{
          padding: 16,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          minWidth: 0,
        }}
      >
        <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 800, letterSpacing: 0.5 }}>
          {m.label}
        </div>

        <div style={{ marginTop: 8, fontSize: 22, fontWeight: 900, color: "#E5E7EB" }}>
          {typeof m.value === "number" ? m.format(m.value) : "—"}
        </div>

        <div style={{ marginTop: 4, fontSize: 12, color: "#9CA3AF" }}>{m.sub}</div>

        {typeof m.value === "number" ? (
          <div
            style={{
              marginTop: 10,
              height: 6,
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(100, (m.value / m.max) * 100))}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, rgba(99,102,241,0.95), rgba(34,211,238,0.85))",
                transition: "width 300ms ease",
              }}
            />
          </div>
        ) : null}
      </div>
    ))}
  </div>
</SectionCard>

{gamePlan ? (
  <SectionCard title="Next Attempt Game Plan">
    <div style={{ color: "#9CA3AF", fontSize: 13, lineHeight: 1.6 }}>
      <strong style={{ color: "#E5E7EB" }}>{gamePlan.summary}</strong>
    </div>

    <ul style={{ marginTop: 12, marginBottom: 0, paddingLeft: 18, lineHeight: 1.7, color: "#E5E7EB" }}>
      {gamePlan.tips.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  </SectionCard>
) : null}


<div style={{ marginTop: 32, borderTop: "1px solid rgba(255,255,255,0.06)" }} />


          {feedback.star ? (
  <SectionCard
    title={`STAR Breakdown${starAvg !== null ? ` (avg ${starAvg}/10)` : ""}`}
    collapsible={false}
  >
    {/* Detection checklist (explicit STAR) */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 10,
        marginBottom: 14,
      }}
    >
      <StarChip
        letter="S"
        label="Situation"
        status={starMissingList.includes("situation") ? "missing" : "detected"}
      />
      <StarChip
        letter="T"
        label="Task"
        status={starMissingList.includes("task") ? "missing" : "detected"}
      />
      <StarChip
        letter="A"
        label="Action"
        status={starMissingList.includes("action") ? "missing" : "detected"}
      />
      <StarChip
        letter="R"
        label="Result"
        status={starMissingList.includes("result") ? "missing" : "detected"}
      />
    </div>

    {/* Evidence: what we actually heard */}
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        padding: 14,
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <div style={{ color: "#E5E7EB", fontWeight: 900, fontSize: 13, letterSpacing: 0.4 }}>
          Evidence excerpts
        </div>
        <div style={{ color: "#9CA3AF", fontSize: 12 }}>Based on your transcript (auto-selected)</div>
      </div>

      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {([
          { key: "situation", label: "Situation", q: starEvidence.situation },
          { key: "task", label: "Task", q: starEvidence.task },
          { key: "action", label: "Action", q: starEvidence.action },
          { key: "result", label: "Result", q: starEvidence.result },
        ] as const).map((row) => {
          const missing = starMissingList.includes(row.key);
          const advice = feedback.star_advice?.[row.key];

          return (
            <div
              key={row.key}
              style={{
                borderRadius: 14,
                padding: 12,
                border: missing ? "1px solid rgba(248,113,113,0.18)" : "1px solid rgba(255,255,255,0.08)",
                background: missing ? "rgba(248,113,113,0.06)" : "rgba(255,255,255,0.02)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div style={{ color: "#E5E7EB", fontWeight: 900, fontSize: 13 }}>{row.label}</div>
                <div
                  style={{
                    color: missing ? "rgba(248,113,113,0.95)" : "#9CA3AF",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {missing ? "Missing" : "Detected"}
                </div>
              </div>

              <div style={{ marginTop: 8, color: "#E5E7EB", fontSize: 13, lineHeight: 1.6 }}>
                {row.q ? (
                  <div style={{ fontStyle: "italic", opacity: 0.95 }}>&ldquo;{row.q}&rdquo;</div>
                ) : (
                  <div style={{ color: "#9CA3AF" }}>
                    No clear excerpt detected. Add 1 sentence that explicitly states your {row.label.toLowerCase()}.
                  </div>
                )}
              </div>

              {advice ? (
                <div style={{ marginTop: 10, color: "#9CA3AF", fontSize: 12, lineHeight: 1.6 }}>
                  <span style={{ color: "#E5E7EB", fontWeight: 900 }}>Fix:</span> {advice}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>

    {/* Scores (secondary) */}
    <MetricBar label="Situation" value={feedback.star.situation} max={10} />
    <MetricBar label="Task" value={feedback.star.task} max={10} />
    <MetricBar label="Action" value={feedback.star.action} max={10} />
    <MetricBar label="Result" value={feedback.star.result} max={10} />

    {Array.isArray(feedback.star_missing) ? (
      <div style={{ marginTop: 12, color: "#9CA3AF", fontSize: 13 }}>
        <strong style={{ color: "#9CA3AF" }}>Missing:</strong>{" "}
        {feedback.star_missing.length ? feedback.star_missing.join(", ") : "None"}
      </div>
    ) : null}
  </SectionCard>
) : null}


          <SectionCard title="Strengths" collapsible defaultOpen={false}>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: "#E5E7EB" }}>
              {(feedback.strengths ?? []).map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Improvements" collapsible defaultOpen={false}>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: "#E5E7EB" }}>
              {(feedback.improvements ?? []).map((s: string, i: number) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </SectionCard>

          {feedback.better_answer ? (
            <SectionCard title="Stronger version" collapsible defaultOpen={false}>

              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75, color: "#E5E7EB" }}>
                {feedback.better_answer}
              </div>
            </SectionCard>
          ) : null}

         {(Array.isArray(feedback.keywords_used) || Array.isArray(feedback.keywords_missing)) ? (
  <SectionCard title="Keywords" collapsible defaultOpen={false}>
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {Array.isArray(feedback.keywords_used) && feedback.keywords_used.length > 0 ? (
        <div>
          <div style={{ color: "#9CA3AF", fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>
            Used effectively
          </div>

          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {feedback.keywords_used.map((k: string) => (
              <div
                key={k}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
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
          <div style={{ color: "#9CA3AF", fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>
            Missing from your answer
          </div>

          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {feedback.keywords_missing.map((k: string) => (
              <div
                key={k}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
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

      {/* Optional: show a friendly line when no used keywords were detected */}
      {Array.isArray(feedback.keywords_used) && feedback.keywords_used.length === 0 ? (
        <div style={{ color: "#9CA3AF", fontSize: 13, lineHeight: 1.6 }}>
          No strong job-specific keywords detected yet. Try naming the system/tool/process you used (ERP/MRP, schedule adherence, KPIs).
        </div>
      ) : null}
    </div>
  </SectionCard>
) : null}

          <SectionCard title="Transcript" collapsible defaultOpen={false}>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75, color: "#E5E7EB" }}>
              {stored.transcript}
            </div>
          </SectionCard>
        </>
      )}
      </div>
      </PremiumShell>
);
    
}
