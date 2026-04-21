"use client";

import React, { useEffect, useMemo, useState } from "react";
import PremiumShell from "../../components/PremiumShell";
import PremiumCard from "../../components/PremiumCard";
import NaceScoreCard from "../../components/NaceScoreCard";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useIsUniversity } from "@/app/hooks/usePlan";
import { useIsMobile } from "@/app/hooks/useIsMobile";
import { userScopedKey } from "@/app/lib/userStorage";
import { computeNaceProfile } from "@/app/lib/nace";
import { buildUserCoachingProfile } from "@/app/lib/feedback/coachingProfile";
import { downloadNacePdf } from "@/app/lib/nace-pdf";
import { generateFindings, type Finding } from "@/app/lib/insightFindings";
import {
  asOverall100,
  asTenPoint,
  displayOverall100,
  displayTenPointAs100,
  avgOverall100,
  avgTenPoint,
} from "@/app/lib/scoreScale";

type Attempt = {
  id?: string;
  ts?: number;

  question?: string;
  questionCategory?: string | null;
  questionSource?: string | null;
  evaluationFramework?: "star" | "technical_explanation" | "experience_depth" | string | null;

  jobProfileId?: string | null;
  jobProfileTitle?: string | null;
  jobProfileCompany?: string | null;
  jobProfileRoleType?: string | null;

  score?: number | null;
  communication_score?: number | null;
  confidence_score?: number | null;
  wpm?: number | null;

  prosody?: {
    monotoneScore?: number;
    pitchStd?: number;
    pitchRange?: number;
    pitchMean?: number;
    energyVariation?: number;
    tempoDynamics?: number;
    energyMean?: number;
  } | null;

  deliveryMetrics?: {
    fillersPer100?: number;
    acoustics?: {
      monotoneScore?: number;
      pitchStd?: number;
      pitchRange?: number;
      energyVariation?: number;
      tempoDynamics?: number;
    } | null;
    face?: {
      eyeContact?: number;
      expressiveness?: number;
      headStability?: number;
      smileRate?: number;
      blinkRate?: number;
      browEngagement?: number;
      lookAwayRate?: number;
      framesAnalyzed?: number;
    } | null;
  } | null;

  feedback?: {
    score?: number | null;
    communication_score?: number | null;
    confidence_score?: number | null;
    filler?: {
      per100?: number;
      total?: number;
    };
    star?: {
      situation?: number;
      task?: number;
      action?: number;
      result?: number;
    };
    dimension_scores?: Record<string, { label: string; score: number; coaching: string; isStrength: boolean; isGap: boolean }> | null;
    ibm_metrics?: {
      lexicalRichnessScore?: number;
      cognitiveComplexityScore?: number;
      behavioralIndicatorScore?: number;
      hedgingPenaltyScore?: number;
      fragmentationScore?: number;
      answerLengthScore?: number;
    } | null;
    archetype?: string | null;
    archetype_tagline?: string | null;
    secondary_archetype?: string | null;
  } | null;

  inputMethod?: "spoken" | "pasted";
};

type InsightsTab = "overview" | "performance" | "delivery" | "dimensions" | "notes" | "nace" | "visual" | "resume";

const DIM_ORDER = [
  "narrative_clarity",
  "evidence_quality",
  "ownership_agency",
  "vocal_engagement",
  "response_control",
  "cognitive_depth",
  "presence_confidence",
  "audience_awareness",
] as const;

const DIM_LABELS: Record<string, string> = {
  narrative_clarity:   "Narrative Clarity",
  evidence_quality:    "Evidence Quality",
  ownership_agency:    "Ownership & Agency",
  vocal_engagement:    "Vocal Engagement",
  response_control:    "Response Control",
  cognitive_depth:     "Cognitive Depth",
  presence_confidence: "Presence & Confidence",
  audience_awareness:  "Audience Awareness",
};

const DIM_COACHING: Record<string, { strength: string; gap: string }> = {
  narrative_clarity:   { strength: "Your answers are well-structured. Keep anchoring each response with a clear headline first.", gap: "Answers lack a clear through-line. Start with the headline, then support it." },
  evidence_quality:    { strength: "You back claims with specifics and metrics. Keep quantifying outcomes.", gap: "Answers are too general. Add one measurable result to every response." },
  ownership_agency:    { strength: "You use strong I-language. Interviewers see you as the driver, not a bystander.", gap: "Use 'I' instead of 'we' when describing your own actions and decisions." },
  vocal_engagement:    { strength: "Your delivery has good energy and pace variation.", gap: "Delivery sounds flat or rushed. Vary your pace and lift slightly on the result." },
  response_control:    { strength: "Answers stay focused and controlled — no tangents.", gap: "Answers drift. Cut to the core point earlier and resist adding unrelated context." },
  cognitive_depth:     { strength: "You engage with tradeoffs and complexity well.", gap: "Answers stay surface-level. Add one sentence about a tradeoff, risk, or second-order effect." },
  presence_confidence: { strength: "You sound credible and assertive. Minimal hedging.", gap: "Hedging language softens your credibility. Cut 'I think' and 'I feel like' from answers." },
  audience_awareness:  { strength: "Your delivery is calibrated for your listener — energy, variety, and timing all signal audience awareness.", gap: "Delivery reads as self-directed. Vary your energy and pace to signal what matters to the listener." },
};
type RoleFamily = "finance" | "operations" | "research" | "consulting" | "general";

function safeJSONParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function n(x: any): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function avg(nums: number[]) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round1(x: number | null) {
  return x === null ? null : Math.round(x * 10) / 10;
}

function percentileRank(value: number | null, population: number[]) {
  if (value === null || population.length === 0) return null;
  const below = population.filter((v) => v <= value).length;
  return Math.round((below / population.length) * 100);
}

function titleCaseLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getAttemptScore(a: Attempt) {
  return asOverall100(n(a.score ?? a.feedback?.score));
}

function getAttemptComm(a: Attempt) {
  return asTenPoint(n(a.communication_score ?? a.feedback?.communication_score));
}

function getAttemptConf(a: Attempt) {
  return asTenPoint(n(a.confidence_score ?? a.feedback?.confidence_score));
}

function getAttemptFillers(a: Attempt) {
  return n(a.feedback?.filler?.per100);
}

function getAttemptMonotone(a: Attempt) {
  return asTenPoint(n(a.prosody?.monotoneScore ?? a.deliveryMetrics?.acoustics?.monotoneScore));
}

function getEnergyVariation(a: Attempt) {
  const v = n(a.prosody?.energyVariation ?? a.deliveryMetrics?.acoustics?.energyVariation);
  return asTenPoint(v);
}

function getTempoDynamics(a: Attempt) {
  const v = n(a.prosody?.tempoDynamics ?? a.deliveryMetrics?.acoustics?.tempoDynamics);
  return asTenPoint(v);
}

function getEyeContact(a: Attempt): number | null {
  const v = n(a.deliveryMetrics?.face?.eyeContact);
  return v === null ? null : Math.round(v * 100);
}

function getExpressiveness(a: Attempt): number | null {
  const v = n(a.deliveryMetrics?.face?.expressiveness);
  return v === null ? null : Math.round(v * 100);
}

function getHeadStability(a: Attempt): number | null {
  const v = n(a.deliveryMetrics?.face?.headStability);
  return v === null ? null : Math.round(v * 100);
}

function getSmileRate(a: Attempt): number | null {
  const v = n(a.deliveryMetrics?.face?.smileRate);
  return v === null ? null : Math.round(v * 100);
}

function getBlinkRate(a: Attempt): number | null {
  return n(a.deliveryMetrics?.face?.blinkRate);
}

function getBrowEngagement(a: Attempt): number | null {
  const v = n(a.deliveryMetrics?.face?.browEngagement);
  return v === null ? null : Math.round(v * 100);
}

function getLookAwayRate(a: Attempt): number | null {
  const v = n(a.deliveryMetrics?.face?.lookAwayRate);
  return v === null ? null : Math.round(v * 100);
}

function getAttemptStarResult(a: Attempt) {
  return asTenPoint(n(a.feedback?.star?.result));
}

function getAttemptDimensions(a: Attempt): Record<string, number> | null {
  const ds = a.feedback?.dimension_scores;
  if (!ds || typeof ds !== "object") return null;
  const out: Record<string, number> = {};
  for (const key of DIM_ORDER) {
    const val = ds[key]?.score;
    if (typeof val === "number") out[key] = val;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function getAttemptArchetype(a: Attempt): string | null {
  return a.feedback?.archetype ?? (a.feedback as any)?.delivery_archetype ?? null;
}

function trendDirection(values: number[]) {
  if (values.length < 2) return 0;
  return values[values.length - 1] - values[0];
}

function scoreLabel(score100: number | null) {
  if (score100 === null) return " - ";
  if (score100 >= 85) return "Excellent";
  if (score100 >= 75) return "Strong";
  if (score100 >= 65) return "Good";
  if (score100 >= 55) return "Needs polish";
  return "Needs work";
}

function formatDelta(v: number | null, suffix = "") {
  if (v === null) return " - ";
  if (v > 0) return `+${v}${suffix}`;
  return `${v}${suffix}`;
}

function paceLabel(wpm: number | null) {
  if (wpm === null) return " - ";
  if (wpm < 100) return "Slow";
  if (wpm <= 145) return "Strong";
  if (wpm <= 165) return "Fast";
  return "Very fast";
}

function paceCoaching(wpm: number | null) {
  if (wpm === null) return "No spoken pace data yet.";
  if (wpm < 100) return `You are averaging ${Math.round(wpm)} WPM, which can make answers sound hesitant. Cut long setup sentences and get to your main point faster.`;
  if (wpm <= 145) return `You are averaging ${Math.round(wpm)} WPM, which is a strong interview pace. Keep this tempo and pause after important outcomes.`;
  if (wpm <= 165) return `You are averaging ${Math.round(wpm)} WPM, which is slightly fast. Slow down after numbers, decisions, and results so they land.`;
  return `You are averaging ${Math.round(wpm)} WPM, which is too fast for high-stakes answers. Add one short pause after each major point.`;
}

function fillerCoaching(fillers: number | null) {
  if (fillers === null) return "No filler data yet.";
  if (fillers <= 1.5) return `Your filler rate is ${fillers}/100 words, which is controlled. Keep using short pauses instead of filling space.`;
  if (fillers < 3) return `Your filler rate is ${fillers}/100 words. This is manageable, but tightening transitions will make you sound sharper.`;
  return `Your filler rate is ${fillers}/100 words, which is high enough to weaken polish. Replace “um” and “like” with a one-beat pause.`;
}

function monotoneCoaching(monotone: number | null) {
  if (monotone === null) return "No vocal variety data yet.";
  if (monotone <= 4) return `Your vocal variety looks solid (${monotone.toFixed(1)}/10 monotone risk). Keep emphasizing outcomes and numbers.`;
  if (monotone <= 6) return `Your tone is acceptable but can flatten on key points (${monotone.toFixed(1)}/10 monotone risk). Add more lift when you state the result.`;
  return `Your vocal delivery is trending flat (${monotone.toFixed(1)}/10 monotone risk). Stress the action and result parts of your answer more clearly.`;
}

function energyVarCoaching(v: number | null) {
  if (v === null) return "No vocal energy data yet.";
  if (v >= 6.5) return `Strong vocal energy variation (${v.toFixed(1)}/10). Your delivery naturally emphasizes key moments.`;
  if (v >= 4.5) return `Moderate energy variation (${v.toFixed(1)}/10). Try lifting your voice more noticeably on results and outcomes.`;
  return `Low vocal energy variation (${v.toFixed(1)}/10). A flat energy delivery makes answers harder to follow — emphasize the result moment.`;
}

function tempoDynCoaching(v: number | null) {
  if (v === null) return "No tempo dynamics data yet.";
  if (v >= 6.5) return `Good tempo dynamics (${v.toFixed(1)}/10). Your pacing shifts naturally around key points.`;
  if (v >= 4.5) return `Moderate tempo variation (${v.toFixed(1)}/10). Try slowing slightly before your main result or decision.`;
  return `Flat tempo (${v.toFixed(1)}/10). A brief pause before your most important sentence will sharpen impact.`;
}

function eyeContactCoaching(v: number | null) {
  if (v === null) return "Enable webcam in practice to track eye contact.";
  if (v >= 70) return `Strong eye contact (${v}%). You come across as engaged and confident on camera.`;
  if (v >= 50) return `Moderate eye contact (${v}%). Focus on the camera lens more when delivering key points.`;
  return `Low eye contact (${v}%). Practice speaking directly to the camera — it signals confidence and builds connection.`;
}

function expressivenessCoaching(v: number | null) {
  if (v === null) return "Enable webcam in practice to track expressiveness.";
  if (v >= 65) return `Natural expressiveness (${v}%). Your facial cues match your answer content well.`;
  if (v >= 45) return `Developing expressiveness (${v}%). Let your face reflect key moments — genuine reactions read well.`;
  return `Flat expression (${v}%). Interviewers read your face for enthusiasm. Let positive outcomes show.`;
}

function headStabilityCoaching(v: number | null) {
  if (v === null) return "Enable webcam in practice to track presence.";
  if (v >= 75) return `Steady on-camera presence (${v}%). Stable positioning reads as grounded and confident.`;
  if (v >= 55) return `Moderate head stability (${v}%). Reduce movement when working through complex points.`;
  return `High movement detected (${v}%). Grounding your position signals calm under pressure.`;
}

function smileRateCoaching(v: number | null) {
  if (v === null) return "Enable webcam in practice to track warmth signals.";
  if (v >= 30) return `Natural warmth (${v}% smile rate). Your approachability reads well on camera.`;
  if (v >= 12) return `Some warmth present (${v}% smile rate). A brief natural smile when starting your answer builds rapport.`;
  return `Very flat affect (${v}% smile rate). Interviewers read enthusiasm through your face — let genuine reactions show, especially on outcomes.`;
}

function blinkRateCoaching(v: number | null) {
  if (v === null) return "Enable webcam in practice to track nervous signals.";
  if (v >= 12 && v <= 20) return `Blink rate is in the ideal range (${v}/min). This reads as calm and focused.`;
  if (v > 20 && v <= 28) return `Slightly elevated blink rate (${v}/min) may suggest mild tension. Slow your breathing before answering.`;
  if (v > 28) return `High blink rate (${v}/min) signals nervousness. Try a slow breath before you start speaking.`;
  return `Very low blink rate (${v}/min) — you may be staring. Blink naturally and let your gaze soften.`;
}

function browEngagementCoaching(v: number | null) {
  if (v === null) return "Enable webcam in practice to track facial engagement.";
  if (v >= 40) return `Active brow engagement (${v}%). Your face shows genuine investment in what you are saying.`;
  if (v >= 22) return `Moderate brow activity (${v}%). More natural brow movement will make you seem more engaged.`;
  return `Frozen brow (${v}%). A flat upper face makes answers feel rehearsed — let natural reactions through.`;
}

function lookAwayCoaching(v: number | null) {
  if (v === null) return "Enable webcam in practice to track note-checking.";
  if (v <= 8) return `Minimal look-aways (${v}%). You are staying present and camera-focused throughout.`;
  if (v <= 18) return `Occasional look-aways (${v}%). Checking notes briefly is acceptable, but try to reduce it on key points.`;
  return `Frequent look-aways (${v}%). Practice with notes face-down — you know more than you think.`;
}

function resultCoaching(starResult: number | null) {
  if (starResult === null) return "No closing-impact data yet.";
  if (starResult >= 8) return `Your answer endings are strong (${displayTenPointAs100(starResult)}). Keep closing with a clear business outcome.`;
  if (starResult >= 6.5) return `Your closing impact is decent (${displayTenPointAs100(starResult)}), but it can be sharper. End with the result in one crisp sentence.`;
  return `Your weakest pattern is closing impact (${displayTenPointAs100(starResult)}). Too many answers stop after the action instead of clearly stating the result.`;
}

function getPrimaryDeliveryPriority(input: {
  avgPace: number | null;
  avgFillers: number | null;
  avgMonotone: number | null;
}) {
  const candidates = [
    {
      key: "pace",
      score:
        input.avgPace === null
          ? -1
          : input.avgPace < 100
          ? 8
          : input.avgPace > 165
          ? 8
          : input.avgPace > 145
          ? 5
          : 1,
    },
    {
      key: "fillers",
      score:
        input.avgFillers === null
          ? -1
          : input.avgFillers >= 3
          ? 9
          : input.avgFillers >= 1.6
          ? 5
          : 1,
    },
    {
      key: "monotone",
      score:
        input.avgMonotone === null
          ? -1
          : input.avgMonotone >= 6
          ? 8
          : input.avgMonotone >= 4.5
          ? 4
          : 1,
    },
  ];

  return candidates.sort((a, b) => b.score - a.score)[0]?.key ?? null;
}

function buildGroupedStats<T extends string>(
  attempts: Attempt[],
  keyFn: (a: Attempt) => T | null | undefined
) {
  const map = new Map<
    string,
    {
      key: string;
      label: string;
      count: number;
      avgScore: number | null;
      avgComm: number | null;
      avgConf: number | null;
    }
  >();

  for (const a of attempts) {
    const raw = keyFn(a);
    const key = raw ? String(raw) : "";
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, {
        key,
        label: key,
        count: 0,
        avgScore: null,
        avgComm: null,
        avgConf: null,
      });
    }
  }

  for (const [key, entry] of map.entries()) {
    const group = attempts.filter((a) => String(keyFn(a) ?? "") === key);

    entry.count = group.length;
    entry.avgScore = round1(avgOverall100(group.map(getAttemptScore)));
    entry.avgComm = round1(avgTenPoint(group.map(getAttemptComm)));
    entry.avgConf = round1(avgTenPoint(group.map(getAttemptConf)));
  }

  return Array.from(map.values()).sort((a, b) => {
    const aScore = a.avgScore ?? -1;
    const bScore = b.avgScore ?? -1;
    if (bScore !== aScore) return bScore - aScore;
    return b.count - a.count;
  });
}

function trendColor(v: number | null) {
  if (v === null) return "var(--text-muted)";
  if (v > 4) return "var(--chart-positive)";
  if (v < -4) return "var(--chart-negative)";
  return "var(--text-muted)";
}

function BigMetricCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: React.ReactNode;
  subtext: string;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        height: "100%",
        padding: 20,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--card-border-soft)",
        background: "var(--card-bg)",
        boxShadow: "var(--shadow-card-soft)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 0.8,
            color: "var(--text-muted)",
            lineHeight: 1.2,
          }}
        >
          {label}
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: "clamp(22px, 2vw, 26px)",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: -0.3,
            lineHeight: 1.05,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          lineHeight: 1.4,
        }}
      >
        {subtext}
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      {eyebrow ? (
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, color: "var(--text-muted)" }}>
          {eyebrow}
        </div>
      ) : null}
      <div
        style={{
          marginTop: eyebrow ? 6 : 0,
          fontSize: 22,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: -0.35,
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            color: "var(--text-muted)",
            lineHeight: 1.6,
            maxWidth: 860,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function InsightListCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div
      style={{
        minWidth: 0,
        height: "100%",
        padding: 18,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--card-border-soft)",
        background: "var(--card-bg)",
        boxShadow: "var(--shadow-card-soft)",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "var(--text-primary)",
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>

      {items.length === 0 ? (
        <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Keep practicing to unlock more personalized insights.
        </div>
      ) : (
        <ul
          style={{
            marginTop: 12,
            marginBottom: 0,
            paddingLeft: 18,
            lineHeight: 1.75,
            color: "var(--text-primary)",
          }}
        >
          {items.map((item, i) => (
            <li
              key={i}
              style={{
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScoreBarRow({
  label,
  count,
  avgScore,
  subtitle,
}: {
  label: string;
  count: number;
  avgScore: number | null;
  subtitle?: string;
}) {
  const pct = avgScore === null ? 0 : Math.max(0, Math.min(100, avgScore));

  return (
    <div
      style={{
        padding: 14,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--card-border)",
        background: "var(--card-bg)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
            {count} {count === 1 ? "attempt" : "attempts"}
            {subtitle ? ` · ${subtitle}` : ""}
          </div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          {avgScore === null ? " - " : `${Math.round(avgScore)}/100`}
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          height: 8,
          borderRadius: "var(--radius-sm)",
          background: "var(--card-border-soft)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "linear-gradient(90deg, var(--accent-2), var(--accent))",
            transition: "width 300ms ease",
          }}
        />
      </div>
    </div>
  );
}

function MiniSparkline({
  values,
  height = 64,
}: {
  values: number[];
  height?: number;
}) {
  if (values.length < 2) {
    return (
      <div
        style={{
          height,
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--card-border-soft)",
          background: "var(--card-bg)",
          display: "grid",
          placeItems: "center",
          color: "var(--text-muted)",
          fontSize: 12,
        }}
      >
        More attempts needed
      </div>
    );
  }

  const width = 320;
  const pad = 8;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.001);

  const points = values.map((v, i) => {
    const x = pad + (i * (width - pad * 2)) / Math.max(values.length - 1, 1);
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return [x, y];
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const last = points[points.length - 1];
  const delta = values[values.length - 1] - values[0];

  return (
    <div
      style={{
        marginTop: 12,
        padding: 10,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--card-border-soft)",
        background: "var(--card-bg)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
          Recent score trend
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Last {values.length} attempts
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        style={{ display: "block" }}
      >
        <path
          d={path}
          fill="none"
          stroke={
            delta > 0
              ? "var(--chart-positive)"
              : delta < 0
              ? "var(--chart-negative)"
              : "var(--accent)"
          }
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={last[0]}
          cy={last[1]}
          r="4"
          fill={
            delta > 0
              ? "var(--chart-positive)"
              : delta < 0
              ? "var(--chart-negative)"
              : "var(--accent)"
          }
        />
      </svg>
    </div>
  );
}

function InterviewNotesCard({
  strengths,
  watchouts,
  reminders,
}: {
  strengths: string[];
  watchouts: string[];
  reminders: string[];
}) {
  return (
    <PremiumCard>
      <SectionTitle
        eyebrow="Pre-Interview Brief"
        title="Interview Notes"
        subtitle="A concise reminder sheet you can review before your next interview."
      />

      <div
        className="ipc-grid-3"
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr 1fr",
          gap: 14,
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(34,197,94,0.18)",
            background: "rgba(34,197,94,0.08)",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-primary)" }}>
            Lean into this
          </div>
          <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--text-primary)" }}>
            {strengths.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(248,113,113,0.20)",
            background: "rgba(248,113,113,0.08)",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-primary)" }}>
            Watchouts
          </div>
          <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--text-primary)" }}>
            {watchouts.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--card-border-soft)",
            background: "var(--card-bg)",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-primary)" }}>
            Keep in mind
          </div>
          <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--text-primary)" }}>
            {reminders.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </PremiumCard>
  );
}

function InsightsTabButton({
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
        padding: "9px 14px",
        borderRadius: "var(--radius-md)",
        border: "none",
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
        transition: "all 140ms ease",
      }}
    >
      {label}
    </button>
  );
}

function inferRoleFamily(input: {
  label?: string | null;
  roleType?: string | null;
}): RoleFamily {
  const text = `${input.label ?? ""} ${input.roleType ?? ""}`.toLowerCase();

  if (
    text.includes("finance") ||
    text.includes("financial") ||
    text.includes("fp&a") ||
    text.includes("accounting") ||
    text.includes("investment")
  ) {
    return "finance";
  }

  if (
    text.includes("operations") ||
    text.includes("supply chain") ||
    text.includes("logistics") ||
    text.includes("procurement") ||
    text.includes("planning")
  ) {
    return "operations";
  }

  if (
    text.includes("research") ||
    text.includes("science") ||
    text.includes("laboratory") ||
    text.includes("associate")
  ) {
    return "research";
  }

  if (text.includes("consulting") || text.includes("strategy")) {
    return "consulting";
  }

  return "general";
}

function normalizePaceScore(wpm: number | null) {
  if (wpm === null) return null;
  if (wpm < 100) return 5.8;
  if (wpm <= 145) return 8.4;
  if (wpm <= 165) return 7.1;
  return 5.9;
}

function normalizeFillerScore(fillers: number | null) {
  if (fillers === null) return null;
  if (fillers <= 1.5) return 8.5;
  if (fillers < 3) return 7.2;
  if (fillers < 4.5) return 6.1;
  return 5.2;
}

function normalizeMonotoneScore(monotone: number | null) {
  if (monotone === null) return null;
  if (monotone <= 4) return 8.2;
  if (monotone <= 6) return 7.0;
  return 5.8;
}

function getRoleWeights(roleFamily: RoleFamily) {
  switch (roleFamily) {
    case "finance":
      return {
        communication: 0.26,
        confidence: 0.18,
        closingImpact: 0.24,
        paceControl: 0.12,
        polish: 0.10,
        vocalDelivery: 0.10,
      };
    case "operations":
      return {
        communication: 0.22,
        confidence: 0.20,
        closingImpact: 0.18,
        paceControl: 0.15,
        polish: 0.10,
        vocalDelivery: 0.15,
      };
    case "research":
      return {
        communication: 0.20,
        confidence: 0.14,
        closingImpact: 0.16,
        paceControl: 0.12,
        polish: 0.14,
        vocalDelivery: 0.08,
      };
    case "consulting":
      return {
        communication: 0.28,
        confidence: 0.22,
        closingImpact: 0.20,
        paceControl: 0.12,
        polish: 0.10,
        vocalDelivery: 0.08,
      };
    default:
      return {
        communication: 0.24,
        confidence: 0.18,
        closingImpact: 0.20,
        paceControl: 0.14,
        polish: 0.12,
        vocalDelivery: 0.12,
      };
  }
}

function getRoleExpectations(roleFamily: RoleFamily) {
  switch (roleFamily) {
    case "finance":
      return {
        communication: 7.6,
        confidence: 7.2,
        closingImpact: 7.8,
        paceControl: 7.0,
        polish: 7.0,
        vocalDelivery: 6.8,
      };
    case "operations":
      return {
        communication: 7.3,
        confidence: 7.2,
        closingImpact: 7.2,
        paceControl: 7.2,
        polish: 6.8,
        vocalDelivery: 7.0,
      };
    case "research":
      return {
        communication: 7.0,
        confidence: 6.8,
        closingImpact: 6.8,
        paceControl: 6.8,
        polish: 7.0,
        vocalDelivery: 6.4,
      };
    case "consulting":
      return {
        communication: 7.8,
        confidence: 7.6,
        closingImpact: 7.4,
        paceControl: 7.2,
        polish: 7.2,
        vocalDelivery: 7.0,
      };
    default:
      return {
        communication: 7.2,
        confidence: 7.0,
        closingImpact: 7.1,
        paceControl: 7.0,
        polish: 6.9,
        vocalDelivery: 6.8,
      };
  }
}

function buildRoleNarrative(input: {
  roleFamily: RoleFamily;
  fitLabel: string;
  matched: string[];
  gaps: string[];
}) {
  const roleText =
    input.roleFamily === "finance"
      ? "finance-oriented roles"
      : input.roleFamily === "operations"
      ? "operations-oriented roles"
      : input.roleFamily === "research"
      ? "research-oriented roles"
      : input.roleFamily === "consulting"
      ? "consulting-style roles"
      : "general business roles";

  const strengths =
    input.matched.length > 0
      ? `You currently align best on ${input.matched.join(" and ")}.`
      : "Your strongest role-aligned signals are still emerging.";

  const gap =
    input.gaps.length > 0
      ? ` The biggest gap for ${roleText} is ${input.gaps[0]}.`
      : ` There is no single major weakness dominating your fit for ${roleText}.`;

  return `${input.fitLabel} for ${roleText}. ${strengths}${gap}`;
}

function interpretCategoryRow(row: {
  label: string;
  avgScore: number | null;
  avgComm: number | null;
  avgConf: number | null;
}) {
  if (row.avgScore === null) return "More attempts needed.";

  if (row.label === "Behavioral") {
    if ((row.avgScore ?? 0) >= 75) return "Your strongest category overall, especially when your answer structure stays clean.";
    return "This category is workable, but your endings are likely leaving points on the table.";
  }

  if (row.label === "Technical") {
    if ((row.avgConf ?? 0) >= 7.2) return "You explain technical ideas best when you sound decisive and sequential.";
    return "Technical answers likely need cleaner sequencing and stronger confidence.";
  }

  if (row.label === "Role Specific") {
    if ((row.avgComm ?? 0) >= 7.2) return "You do well here when answers stay concrete and tied to the role.";
    return "Role-specific answers likely need more specificity and clearer relevance to the job.";
  }

  if (row.label === "Custom") {
    return "Custom questions are a good stress test for adaptability and answer control.";
  }

  return "This category will become more interpretable with more attempts.";
}

function interpretFrameworkRow(row: {
  label: string;
  avgScore: number | null;
  avgComm: number | null;
  avgConf: number | null;
}) {
  if (row.avgScore === null) return "More attempts needed.";

  if (row.label === "Behavioral (STAR)") {
    return (row.avgScore ?? 0) >= 75
      ? "Your behavioral answers are solid overall, but sharper results would still raise scores."
      : "Your STAR answers are likely strongest in the middle and weakest at the end result.";
  }

  if (row.label === "Technical Explanation") {
    return (row.avgConf ?? 0) >= 7
      ? "Technical explanations improve when you sound direct and move step-by-step."
      : "Technical explanations likely need clearer sequencing and more confident delivery.";
  }

  if (row.label === "Experience Depth") {
    return (row.avgComm ?? 0) >= 7
      ? "Experience-depth answers are strongest when you stay specific instead of broad."
      : "These answers likely need more specificity and less high-level summary.";
  }

  return "This framework will become more interpretable with more attempts.";
}

// ── Signal Insights UI components ────────────────────────────────────────────

function MiniBar({ data }: { data: { label: string; value: number; highlight?: boolean }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 52, marginTop: 14 }}>
      {data.map((d, i) => {
        const pct = Math.max(6, Math.round((d.value / max) * 100));
        const color = d.highlight ? "var(--accent)" : "var(--card-border)";
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: d.highlight ? "var(--accent)" : "var(--text-muted)" }}>{d.value}</div>
            <div style={{ width: "100%", height: `${pct}%`, background: color, borderRadius: "3px 3px 0 0", minHeight: 4 }} />
            <div style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center" as const, lineHeight: 1.2 }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

const FINDING_TYPE_META: Record<string, { label: string; color: string }> = {
  cross_signal: { label: "Cross-signal",  color: "#8B5CF6" },
  inverse:      { label: "Unexpected",    color: "#EF4444" },
  pattern:      { label: "Pattern",       color: "#10B981" },
  threshold:    { label: "Threshold",     color: "#F59E0B" },
  dimension:    { label: "Dimension",     color: "#0EA5E9" },
};

function FindingCard({ f }: { f: Finding }) {
  const meta = FINDING_TYPE_META[f.type] ?? { label: f.type, color: "var(--accent)" };
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-lg)", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}33`, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
            {meta.label}
          </span>
          {f.r != null && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", padding: "2px 6px", borderRadius: 99, background: "var(--card-bg-strong)" }}>
              r={f.r.toFixed(2)}
            </span>
          )}
          <span style={{ fontSize: 10, color: "var(--text-muted)", padding: "2px 6px" }}>n={f.n}</span>
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.5 }}>{f.headline}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>{f.detail}</div>
      {f.chartData && <MiniBar data={f.chartData} />}
    </div>
  );
}

export default function ProgressPage() {
  const isMobile = useIsMobile();
  const [history, setHistory] = useState<Attempt[]>([]);
  const [loadState, setLoadState] = useState<"hydrating" | "ready">("hydrating");
  const [resumeHistory, setResumeHistory] = useState<any[]>([]);
  const [studentProfile, setStudentProfile] = useState<{ targetRole?: string | null; targetIndustry?: string | null; major?: string | null } | null>(null);
  const [isPro, setIsPro] = useState<boolean>(true); // optimistic until entitlement loads
  const { data: session, status } = useSession();
  const HISTORY_KEY = userScopedKey("ipc_history", session);
  const [activeTab, setActiveTab] = useState<InsightsTab>("overview");
  const [sessionFilter, setSessionFilter] = useState<"all" | "mock_interview">("all");
  const [pageView, setPageView] = useState<"coaching" | "data">("coaching");
  const isUniversity = useIsUniversity();

  useEffect(() => {
    if (status === "loading") return;

    let cancelled = false;
    setLoadState("hydrating");

    (async () => {
      try {
        if (session?.user) {
          const [attRes, profRes] = await Promise.all([
            fetch("/api/attempts?limit=200", { cache: "no-store" }),
            fetch("/api/student-profile", { cache: "no-store" }),
          ]);
          if (attRes.ok) {
            const data = await attRes.json();
            const attempts = Array.isArray(data?.attempts) ? (data.attempts as Attempt[]) : [];
            if (!cancelled && attempts.length > 0) setHistory(attempts);
            if (!cancelled && data?.entitlement) {
              setIsPro(data.entitlement.isPro === true);
            }
          }
          if (profRes.ok) {
            const prof = await profRes.json();
            if (!cancelled) {
              setResumeHistory(prof?.resumeHistory ?? []);
              setStudentProfile({
                targetRole: prof?.targetRole ?? null,
                targetIndustry: prof?.targetIndustry ?? null,
                major: prof?.major ?? null,
              });
            }
          }
          if (!cancelled) { setLoadState("ready"); return; }
        }

        const saved = safeJSONParse<Attempt[]>(localStorage.getItem(HISTORY_KEY), []);
        if (!cancelled) {
          setHistory(Array.isArray(saved) ? saved : []);
        }
      } catch {
        const saved = safeJSONParse<Attempt[]>(localStorage.getItem(HISTORY_KEY), []);
        if (!cancelled) {
          setHistory(Array.isArray(saved) ? saved : []);
        }
      } finally {
        if (!cancelled) setLoadState("ready");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session?.user, HISTORY_KEY]);

  const attemptsNewestFirst = useMemo(
    () => sessionFilter === "mock_interview" ? history.filter(a => a.evaluationFramework === "mock_interview") : history,
    [history, sessionFilter],
  );
  const attemptsOldestFirst = useMemo(() => [...attemptsNewestFirst].reverse(), [attemptsNewestFirst]);

  const overview = useMemo(() => {
    const overallVals = attemptsNewestFirst.map(getAttemptScore).filter((v): v is number => v !== null);
    const commVals = attemptsNewestFirst.map(getAttemptComm).filter((v): v is number => v !== null);
    const confVals = attemptsNewestFirst.map(getAttemptConf).filter((v): v is number => v !== null);
    const fillerVals = attemptsNewestFirst.map(getAttemptFillers).filter((v): v is number => v !== null);
    const paceVals = attemptsNewestFirst.map((a) => n(a.wpm)).filter((v): v is number => v !== null);
    const monotoneVals = attemptsNewestFirst.map(getAttemptMonotone).filter((v): v is number => v !== null);
    const resultVals = attemptsNewestFirst.map(getAttemptStarResult).filter((v): v is number => v !== null);
    const energyVarVals = attemptsNewestFirst.map(getEnergyVariation).filter((v): v is number => v !== null);
    const tempoDynVals = attemptsNewestFirst.map(getTempoDynamics).filter((v): v is number => v !== null);
    const eyeVals = attemptsNewestFirst.map(getEyeContact).filter((v): v is number => v !== null);
    const expressVals = attemptsNewestFirst.map(getExpressiveness).filter((v): v is number => v !== null);
    const headVals = attemptsNewestFirst.map(getHeadStability).filter((v): v is number => v !== null);
    const smileVals = attemptsNewestFirst.map(getSmileRate).filter((v): v is number => v !== null);
    const blinkVals = attemptsNewestFirst.map(getBlinkRate).filter((v): v is number => v !== null);
    const browVals = attemptsNewestFirst.map(getBrowEngagement).filter((v): v is number => v !== null);
    const lookAwayVals = attemptsNewestFirst.map(getLookAwayRate).filter((v): v is number => v !== null);

    const categoryCounts = new Map<string, number>();
    const profileCounts = new Map<string, number>();

    for (const a of attemptsNewestFirst) {
      const cat = a.questionCategory ?? "other";
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);

      const profile = a.jobProfileTitle ?? "";
      if (profile) profileCounts.set(profile, (profileCounts.get(profile) ?? 0) + 1);
    }

    const topCategory =
      Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const topProfile =
      Array.from(profileCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      totalAttempts: attemptsNewestFirst.length,
      avgOverall: round1(avgOverall100(overallVals)),
      avgComm: round1(avgTenPoint(commVals)),
      avgConf: round1(avgTenPoint(confVals)),
      avgFillers: round1(avg(fillerVals)),
      avgPace: round1(avg(paceVals)),
      avgMonotone: round1(avgTenPoint(monotoneVals)),
      avgStarResult: round1(avgTenPoint(resultVals)),
      avgEnergyVar: round1(avg(energyVarVals)),
      avgTempoDyn: round1(avg(tempoDynVals)),
      avgEyeContact: eyeVals.length > 0 ? round1(avg(eyeVals)) : null,
      avgExpressiveness: expressVals.length > 0 ? round1(avg(expressVals)) : null,
      avgHeadStability: headVals.length > 0 ? round1(avg(headVals)) : null,
      avgSmileRate: smileVals.length > 0 ? round1(avg(smileVals)) : null,
      avgBlinkRate: blinkVals.length > 0 ? Math.round(avg(blinkVals)!) : null,
      avgBrowEngagement: browVals.length > 0 ? round1(avg(browVals)) : null,
      avgLookAwayRate: lookAwayVals.length > 0 ? round1(avg(lookAwayVals)) : null,
      hasWebcamData: eyeVals.length > 0,
      topCategory,
      topProfile,
    };
  }, [attemptsNewestFirst]);

  const metricPopulations = useMemo(() => {
    const metrics = {
      overall: [] as number[],
      communication: [] as number[],
      confidence: [] as number[],
      star_result: [] as number[],
      filler_rate: [] as number[],
      pace: [] as number[],
      monotone: [] as number[],
    };

    for (const a of attemptsNewestFirst) {
      const s = getAttemptScore(a);
      const c = getAttemptComm(a);
      const f = getAttemptConf(a);
      const r = getAttemptStarResult(a);
      const fill = getAttemptFillers(a);
      const wpm = n(a.wpm);
      const mono = getAttemptMonotone(a);

      if (s !== null) metrics.overall.push(s);
      if (c !== null) metrics.communication.push(c);
      if (f !== null) metrics.confidence.push(f);
      if (r !== null) metrics.star_result.push(r);
      if (fill !== null) metrics.filler_rate.push(fill);
      if (wpm !== null) metrics.pace.push(wpm);
      if (mono !== null) metrics.monotone.push(mono);
    }

    return metrics;
  }, [attemptsNewestFirst]);

  const percentiles = useMemo(() => {
    return {
      overall: percentileRank(overview.avgOverall, metricPopulations.overall),
      communication: percentileRank(overview.avgComm, metricPopulations.communication),
      confidence: percentileRank(overview.avgConf, metricPopulations.confidence),
      star_result: percentileRank(overview.avgStarResult, metricPopulations.star_result),
      filler_rate: percentileRank(overview.avgFillers, metricPopulations.filler_rate),
      pace: percentileRank(overview.avgPace, metricPopulations.pace),
      monotone: percentileRank(overview.avgMonotone, metricPopulations.monotone),
    };
  }, [overview, metricPopulations]);

  const categoryStats = useMemo(() => {
    return buildGroupedStats(attemptsNewestFirst, (a) => a.questionCategory ?? "other").map((row) => ({
      ...row,
      label: titleCaseLabel(row.label),
    }));
  }, [attemptsNewestFirst]);

  const frameworkStats = useMemo(() => {
    return buildGroupedStats(attemptsNewestFirst, (a) => (a.evaluationFramework as string) ?? "star").map((row) => ({
      ...row,
      label:
        row.label === "star"
          ? "Behavioral (STAR)"
          : row.label === "technical_explanation"
          ? "Technical Explanation"
          : row.label === "experience_depth"
          ? "Experience Depth"
          : titleCaseLabel(row.label),
    }));
  }, [attemptsNewestFirst]);

  const profileStats = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        label: string;
        company?: string | null;
        roleType?: string | null;
        count: number;
        avgScore: number | null;
      }
    >();

    for (const a of attemptsNewestFirst) {
      const key = a.jobProfileId || a.jobProfileTitle || "";
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, {
          key,
          label: a.jobProfileTitle || "Untitled profile",
          company: a.jobProfileCompany ?? null,
          roleType: a.jobProfileRoleType ?? null,
          count: 0,
          avgScore: null,
        });
      }
    }

    for (const [key, entry] of map.entries()) {
      const group = attemptsNewestFirst.filter(
        (a) => (a.jobProfileId || a.jobProfileTitle || "") === key
      );
      entry.count = group.length;
      entry.avgScore = round1(avgOverall100(group.map(getAttemptScore)));
    }

    return Array.from(map.values()).sort((a, b) => {
      const aScore = a.avgScore ?? -1;
      const bScore = b.avgScore ?? -1;
      if (bScore !== aScore) return bScore - aScore;
      return b.count - a.count;
    });
  }, [attemptsNewestFirst]);

  const roleAptitudeStats = useMemo(() => {
    const rows = profileStats.map((row) => {
      const attempts = attemptsNewestFirst.filter(
        (a) => (a.jobProfileId || a.jobProfileTitle || "") === row.key
      );

      const commVals = attempts.map(getAttemptComm).filter((v): v is number => v !== null);
      const confVals = attempts.map(getAttemptConf).filter((v): v is number => v !== null);
      const resultVals = attempts.map(getAttemptStarResult).filter((v): v is number => v !== null);
      const fillerVals = attempts.map(getAttemptFillers).filter((v): v is number => v !== null);
      const paceVals = attempts.map((a) => n(a.wpm)).filter((v): v is number => v !== null);
      const monotoneVals = attempts.map(getAttemptMonotone).filter((v): v is number => v !== null);

      const avgComm = round1(avgTenPoint(commVals));
      const avgConf = round1(avgTenPoint(confVals));
      const avgResult = round1(avgTenPoint(resultVals));
      const avgFillers = round1(avg(fillerVals));
      const avgPace = round1(avg(paceVals));
      const avgMonotone = round1(avgTenPoint(monotoneVals));

      const roleFamily = inferRoleFamily({
        label: row.label,
        roleType: row.roleType,
      });

      const weights = getRoleWeights(roleFamily);
      const expectations = getRoleExpectations(roleFamily);

      const fallback10 = row.avgScore !== null ? row.avgScore / 10 : 0;

      const candidateScores = {
        communication: avgComm ?? fallback10,
        confidence: avgConf ?? fallback10,
        closingImpact: avgResult ?? fallback10,
        paceControl: normalizePaceScore(avgPace) ?? fallback10,
        polish: normalizeFillerScore(avgFillers) ?? fallback10,
        vocalDelivery: normalizeMonotoneScore(avgMonotone) ?? fallback10,
      };

      const weightedFit =
        candidateScores.communication * weights.communication +
        candidateScores.confidence * weights.confidence +
        candidateScores.closingImpact * weights.closingImpact +
        candidateScores.paceControl * weights.paceControl +
        candidateScores.polish * weights.polish +
        candidateScores.vocalDelivery * weights.vocalDelivery;

      const fitScore = round1(weightedFit);

      let fitLabel = "Developing fit";
      if ((fitScore ?? 0) >= 8) fitLabel = "Strong fit";
      else if ((fitScore ?? 0) >= 7) fitLabel = "Moderate fit";
      else if ((fitScore ?? 0) >= 6) fitLabel = "Emerging fit";

      const competencyMap = [
        {
          key: "communication",
          label: "clear communication",
          actual: candidateScores.communication,
          expected: expectations.communication,
        },
        {
          key: "confidence",
          label: "credible tone",
          actual: candidateScores.confidence,
          expected: expectations.confidence,
        },
        {
          key: "closingImpact",
          label: "strong result statements",
          actual: candidateScores.closingImpact,
          expected: expectations.closingImpact,
        },
        {
          key: "paceControl",
          label: "controlled pace",
          actual: candidateScores.paceControl,
          expected: expectations.paceControl,
        },
        {
          key: "polish",
          label: "polished delivery",
          actual: candidateScores.polish,
          expected: expectations.polish,
        },
        {
          key: "vocalDelivery",
          label: "vocal emphasis",
          actual: candidateScores.vocalDelivery,
          expected: expectations.vocalDelivery,
        },
      ];

      const matched = competencyMap
        .filter((c) => c.actual >= c.expected)
        .sort((a, b) => b.actual - a.actual)
        .map((c) => c.label)
        .slice(0, 2);

      const gaps = competencyMap
        .map((c) => ({
          ...c,
          gap: c.expected - c.actual,
        }))
        .filter((c) => c.gap > 0.35)
        .sort((a, b) => b.gap - a.gap)
        .map((c) => {
          if (c.key === "closingImpact") return "sharper measurable outcomes";
          if (c.key === "communication") return "cleaner structure";
          if (c.key === "confidence") return "stronger ownership";
          if (c.key === "paceControl") return "better pace control";
          if (c.key === "polish") return "fewer filler words";
          if (c.key === "vocalDelivery") return "more vocal emphasis";
          return c.label;
        })
        .slice(0, 2);

      const narrative = buildRoleNarrative({
        roleFamily,
        fitLabel,
        matched,
        gaps,
      });

      return {
        ...row,
        roleFamily,
        avgComm,
        avgConf,
        avgResult,
        avgFillers,
        avgPace,
        avgMonotone,
        fitScore,
        fitLabel,
        matched,
        gaps,
        narrative,
      };
    });

    return rows.sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1));
  }, [profileStats, attemptsNewestFirst]);

  const trendSummary = useMemo(() => {
    const recent = attemptsOldestFirst.slice(-5);
    const overallVals = recent.map(getAttemptScore).filter((v): v is number => v !== null);
    const confVals = recent.map(getAttemptConf).filter((v): v is number => v !== null);
    const commVals = recent.map(getAttemptComm).filter((v): v is number => v !== null);

    return {
      overallDelta: round1(trendDirection(overallVals)),
      confDelta: round1(trendDirection(confVals)),
      commDelta: round1(trendDirection(commVals)),
    };
  }, [attemptsOldestFirst]);

  const weakestCategory = useMemo(() => {
    const valid = [...categoryStats].filter((x) => x.avgScore !== null);
    if (valid.length < 2) return null;

    const sorted = valid.sort((a, b) => (a.avgScore ?? 999) - (b.avgScore ?? 999));
    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];

    if (!weakest || !strongest) return null;
    if ((strongest.avgScore ?? 0) - (weakest.avgScore ?? 0) < 5) return null;

    return weakest;
  }, [categoryStats]);

  const strongestCategory = useMemo(() => {
    return [...categoryStats]
      .filter((x) => x.avgScore !== null)
      .sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1))[0] ?? null;
  }, [categoryStats]);

  const recentScoreSeries = useMemo(() => {
    return attemptsOldestFirst
      .map(getAttemptScore)
      .filter((v): v is number => v !== null)
      .slice(-10);
  }, [attemptsOldestFirst]);

  // ── Dimension aggregation (new 7-dimension engine) ──────────────────────────

  const dimensionStats = useMemo(() => {
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};

    for (const a of attemptsNewestFirst) {
      const dims = getAttemptDimensions(a);
      if (!dims) continue;
      for (const key of DIM_ORDER) {
        if (typeof dims[key] === "number") {
          sums[key] = (sums[key] ?? 0) + dims[key];
          counts[key] = (counts[key] ?? 0) + 1;
        }
      }
    }

    const result: Array<{ key: string; label: string; avg: number; coaching: { strength: string; gap: string } }> = [];
    for (const key of DIM_ORDER) {
      if (counts[key] > 0) {
        result.push({
          key,
          label: DIM_LABELS[key],
          avg: Math.round((sums[key] / counts[key]) * 10) / 10,
          coaching: DIM_COACHING[key],
        });
      }
    }

    return result;
  }, [attemptsNewestFirst]);

  const archetypeStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of attemptsNewestFirst) {
      const arch = getAttemptArchetype(a);
      if (arch) counts.set(arch, (counts.get(arch) ?? 0) + 1);
    }
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return {
      dominant: sorted[0]?.[0] ?? null,
      dominantCount: sorted[0]?.[1] ?? 0,
      all: sorted.map(([name, count]) => ({ name, count })),
      totalWithArchetype: Array.from(counts.values()).reduce((a, b) => a + b, 0),
    };
  }, [attemptsNewestFirst]);

  const strongestDimension = useMemo(() => {
    if (dimensionStats.length >= 3) {
      const sorted = [...dimensionStats].sort((a, b) => b.avg - a.avg);
      const best = sorted[0];
      return best ? { label: best.label, value: best.avg } : null;
    }
    const candidates = [
      { label: "Communication", value: overview.avgComm },
      { label: "Confidence", value: overview.avgConf },
      { label: "Closing Impact", value: overview.avgStarResult },
    ].filter((x) => x.value !== null) as Array<{ label: string; value: number }>;

    return candidates.sort((a, b) => b.value - a.value)[0] ?? null;
  }, [overview, dimensionStats]);

  const biggestGap = useMemo(() => {
    // Prefer 7-dimension data when available
    if (dimensionStats.length >= 3) {
      const sorted = [...dimensionStats].sort((a, b) => a.avg - b.avg);
      const weakest = sorted[0];
      return weakest ? { label: weakest.label, value: weakest.avg } : null;
    }
    const candidates = [
      { label: "Communication", value: overview.avgComm },
      { label: "Confidence", value: overview.avgConf },
      { label: "Closing Impact", value: overview.avgStarResult },
    ].filter((x) => x.value !== null) as Array<{ label: string; value: number }>;

    return candidates.sort((a, b) => a.value - b.value)[0] ?? null;
  }, [overview, dimensionStats]);

  const strengths = useMemo(() => {
    const items: string[] = [];

    if (strongestCategory?.avgScore !== null && strongestCategory?.label) {
      items.push(
        `${strongestCategory.label} questions are your strongest category (${displayOverall100(strongestCategory.avgScore)} average).`
      );
    }

    if (overview.avgPace !== null && overview.avgPace >= 115 && overview.avgPace <= 145) {
      items.push(`Your pace is in a strong interview range (${Math.round(overview.avgPace)} WPM average).`);
    }

    if (overview.avgFillers !== null && overview.avgFillers <= 1.5) {
      items.push(`You keep filler usage under control (${overview.avgFillers}/100 words average).`);
    }

    if (trendSummary.confDelta !== null && trendSummary.confDelta > 0.4) {
      items.push(`Confidence is trending up over your last 5 attempts (+${trendSummary.confDelta}).`);
    }

    return items.slice(0, 4);
  }, [strongestCategory, overview, trendSummary]);

  const improvements = useMemo(() => {
    const items: string[] = [];

    if (weakestCategory?.avgScore !== null && weakestCategory?.label) {
      items.push(
        `${weakestCategory.label} questions are your least consistent category right now (${displayOverall100(weakestCategory.avgScore)} average).`
      );
    }

    if (overview.avgPace !== null && overview.avgPace < 100) {
      items.push(`Your pace trends slow (${Math.round(overview.avgPace)} WPM). Cut long setup sentences and get to your point faster.`);
    }

    if (overview.avgPace !== null && overview.avgPace > 165) {
      items.push(`Your pace trends fast (${Math.round(overview.avgPace)} WPM). Slow slightly after decisions, numbers, and outcomes.`);
    }

    if (overview.avgFillers !== null && overview.avgFillers >= 3) {
      items.push(`Filler usage is costing polish (${overview.avgFillers}/100 words average). Replace filler words with a short pause.`);
    }

    if (overview.avgMonotone !== null && overview.avgMonotone >= 6) {
      items.push(`Your tone flattens on important points (${overview.avgMonotone}/10 monotone risk). Add more emphasis when stating the result.`);
    }

    if (overview.avgStarResult !== null && overview.avgStarResult <= 6.5) {
      items.push(`Your weakest recurring pattern is closing impact. Too many answers stop after the action instead of ending with a clear result.`);
    }

    if (items.length === 0 && biggestGap?.label) {
      items.push(
        `${biggestGap.label} is the cleanest next place to improve. A small gain there will likely raise your overall score fastest.`
      );
    }

    return items.slice(0, 4);
  }, [weakestCategory, overview, biggestGap]);

  const recentInsights = useMemo(() => {
    const items: string[] = [];

    if (trendSummary.overallDelta !== null) {
      if (trendSummary.overallDelta > 4) {
        items.push(`Overall performance is improving (+${trendSummary.overallDelta} across your last 5 attempts).`);
      } else if (trendSummary.overallDelta < -4) {
        items.push(`Overall performance dipped (${trendSummary.overallDelta}). Simplify structure next attempt.`);
      } else {
        items.push(`Overall performance is stable across your last 5 attempts.`);
      }
    }

    if (overview.topCategory) {
      items.push(`You practice ${titleCaseLabel(overview.topCategory)} questions most often.`);
    }

    if (overview.topProfile) {
      items.push(`Your most-practiced role is ${overview.topProfile}.`);
    }

    return items.slice(0, 3);
  }, [trendSummary, overview]);

  // ── Coaching Profile (full-history, all-signal) ───────────────────────────────
  const coachingProfile = useMemo(() => {
    if (history.length < 2) return null;
    return buildUserCoachingProfile(history);
  }, [history]);

  // ── Communication Signature (3 data-derived traits, min 3 sessions) ──────────
  const communicationSignature = useMemo((): string[] | null => {
    if (history.length < 3 || !coachingProfile) return null;

    const dimMap: Record<string, number> = {};
    for (const d of coachingProfile.dimensionProfile) dimMap[d.key] = d.allTimeAvg;

    const get = (k: string) => dimMap[k] ?? null;
    const topPriorityKey = coachingProfile.topPriorities[0]?.key ?? null;

    // Slot 1 — Structure & content pattern
    const nc = get("narrative_clarity"), eq = get("evidence_quality"), rc = get("response_control"), cd = get("cognitive_depth");
    let s1 = "Building toward clearer structure";
    if (nc !== null && nc >= 7.5)       s1 = "Structured, clear communicator";
    else if (nc !== null && nc < 4.5)   s1 = "Gets lost before landing the point";
    else if (eq !== null && eq >= 7.5)  s1 = "Backs every claim with specifics";
    else if (eq !== null && eq < 4.5)   s1 = "Makes claims without evidence";
    else if (rc !== null && rc >= 7.5)  s1 = "Tight, focused answers";
    else if (rc !== null && rc < 4.5)   s1 = "Wanders before landing";
    else if (cd !== null && cd >= 7.5)  s1 = "Thinks in tradeoffs and depth";

    // Slot 2 — Delivery pattern
    const ve = get("vocal_engagement"), pc = get("presence_confidence"), aa = get("audience_awareness");
    let s2 = "Measured, steady delivery";
    if (overview.avgFillers !== null && overview.avgFillers >= 5)  s2 = "Filler word habit under pressure";
    else if (overview.avgPace !== null && overview.avgPace > 168)  s2 = "Rushes through key moments";
    else if (overview.avgPace !== null && overview.avgPace < 95)   s2 = "Over-deliberate pacing";
    else if (overview.avgMonotone !== null && overview.avgMonotone >= 7) s2 = "Flat delivery — limited vocal range";
    else if (ve !== null && ve >= 7.5)                             s2 = "Dynamic, engaging vocal presence";
    else if (pc !== null && pc >= 7.5)                             s2 = "High-authority, confident delivery";
    else if (aa !== null && aa >= 7.5)                             s2 = "Strong audience calibration";
    else if (pc !== null && pc < 4.5)                              s2 = "Hedges under pressure";

    // Slot 3 — Impact & outcome pattern
    const oa = get("ownership_agency");
    let s3 = "Working toward consistent impact";
    if (topPriorityKey === "outcome_strength" || (overview.avgStarResult !== null && overview.avgStarResult < 5)) s3 = "Skips the result — stops at the action";
    else if (oa !== null && oa >= 7.5)                              s3 = "Takes clear, unambiguous ownership";
    else if (oa !== null && oa < 4.5)                               s3 = "Shares credit when it should be claimed";
    else if (aa !== null && aa >= 7.5)                              s3 = "Lands results with audience in mind";
    else if (coachingProfile.resolvedWeaknesses.length > 0)         s3 = "Actively improving — patterns are shifting";
    else if (archetypeStats.dominant?.toLowerCase().includes("polished")) s3 = "Consistently strong across contexts";

    return [s1, s2, s3];
  }, [history, coachingProfile, overview, archetypeStats]);

  // ── Coaching Writeup (narrative prose from data, no LLM) ────────────────────
  const coachingWriteup = useMemo((): { p1: string; p2: string; p3: string; p4: string } | null => {
    if (history.length < 3 || !coachingProfile) return null;

    const arch = (archetypeStats.dominant ?? "").toLowerCase();
    const secondArch = (archetypeStats.all[1]?.name ?? "").toLowerCase();
    const count = history.length;
    const sortedDims = [...coachingProfile.dimensionProfile].sort((a, b) => b.allTimeAvg - a.allTimeAvg);
    const topDims = sortedDims.filter(d => d.attemptCount >= 2);
    const bottomDims = [...sortedDims].reverse().filter(d => d.attemptCount >= 2);
    const topPriority = coachingProfile.topPriorities[0];
    const secondPriority = coachingProfile.topPriorities[1];
    const recentArch = (coachingProfile.archetypeEvolution.recentArchetype ?? "").toLowerCase();
    const evolving = recentArch && recentArch !== arch && arch;
    const dp = coachingProfile.deliveryProfile;
    const traj = coachingProfile.overallTrajectory;
    const sp = coachingProfile.starPattern;
    const lp = coachingProfile.linguisticProfile;
    const catPerf = coachingProfile.categoryPerformance;

    // Role/industry context (optional — used when available)
    const roleContext = studentProfile?.targetRole || overview.topProfile || null;
    const industryContext = studentProfile?.targetIndustry || null;
    const fieldPhrase = roleContext
      ? `in ${roleContext.toLowerCase().replace(/^(a |an )/i, "").replace(/ role$| position$/i, "")}`
      : industryContext
      ? `in ${industryContext.toLowerCase()}`
      : null;

    // ── Archetype → personality description ──────────────────────────────────
    const archetypePersonality: Record<string, { style: string; strength: string; tension: string }> = {
      "storyteller":        { style: "You're a natural storyteller. You lead with narrative and bring real energy to your answers.", strength: "That instinct works — when the story is tight. Answers with a clear structure underneath the narrative are genuinely memorable.", tension: "The risk is that the story sometimes takes a scenic route to its point. By the time you land the conclusion, you've lost the listener." },
      "circling the point": { style: "You tend to build toward your point rather than opening with it.", strength: "The ideas are usually there once you get to them.", tension: "The habit of circling before landing means your strongest point often arrives late, after the listener's attention has moved on. The answer needs to open with what it's about." },
      "polished performer": { style: "You're a clean, composed communicator. Structure is natural, delivery is controlled, and ownership language is consistent.", strength: "That structural discipline means interviewers can follow and evaluate your answers without working for it — which is more uncommon than it sounds.", tension: "The next level isn't about doing more. It's about one specific, verifiable detail per answer that makes the story stick after the interview ends." },
      "anxious achiever":   { style: "Your content is there. The examples are real, the thinking is evident, and the structure is mostly in place.", strength: "When the hedging drops out, the answer underneath is solid.", tension: "The habit costing you the most is qualifying before you've said anything worth qualifying. Phrases like 'I think' and 'kind of' are doing damage before the interviewer even hears the substance." },
      "vague narrator":     { style: "You're a fluent speaker with a natural storytelling rhythm. Answers flow and you're easy to follow.", strength: "That conversational quality means the listener stays with you.", tension: "The problem is that fluency is masking a lack of specifics. An answer can sound plausible without actually saying anything measurable. Right now yours is landing as the former." },
      "fading closer":      { style: "You build answers well. The setup is clear, the context lands, and the middle section is usually strong.", strength: "That structural instinct means interviewers are with you through most of the answer.", tension: "The habit to break is closing too softly. The result section is where the score is earned, and yours tends to trail off rather than land." },
      "monotone expert":    { style: "You're a knowledgeable communicator. The depth is clearly there and your claims stay within what you can back up.", strength: "That measured quality reads as credible, which is valuable in technical and analytical roles.", tension: "The delivery is working against the content. Acoustically flat answers make even strong ideas sound routine. The voice needs to reflect the quality of the thinking." },
      "scattered thinker":  { style: "You bring strong ideas and clearly think fast. There's real substance in your answers.", strength: "The raw material is solid. The challenge is purely structural.", tension: "The sequencing is breaking down before the ideas can land. You're starting threads that don't connect back, and the listener ends up reconstructing the story themselves." },
      "quiet achiever":     { style: "You're a composed, understated communicator. Delivery is controlled and mostly on structure.", strength: "The calm, unhurried quality doesn't read as nervous — which is real.", tension: "The problem is that the delivery energy is lagging behind the quality of what you're describing. A flat voice on a good answer leaves points on the table." },
      "fragmented expert":  { style: "You clearly know your material deeply. The expertise is real and comes through.", strength: "That depth of knowledge is an asset that most candidates don't have.", tension: "The habit of starting sentences before finishing them is fragmenting the signal. The intelligence is there, and the delivery is breaking it into pieces before it can land." },
      "phantom expert":     { style: "You're a sophisticated communicator. Language is precise, framing is strong, and you sound substantive.", strength: "That vocabulary and structural sophistication stands out.", tension: "The sophistication is covering for missing evidence. When you reach for the concrete proof point, it tends to be thin. One real number changes everything." },
      "process narrator":   { style: "You describe work clearly. The process, the steps, and the context are all well-communicated.", strength: "That clarity is genuinely useful and means interviewers understand what you did.", tension: "The answer is reading like a project log rather than a personal story. The 'I decided' moment, the one that shows your judgment, is what's missing." },
      "the creditor":       { style: "You tell strong stories and the structure is usually clear. Setup, problem, action, and result all tend to appear.", strength: "That structural discipline means answers are easy to follow and complete.", tension: "The habit of sharing credit too broadly is diffusing your contribution. 'We built' and 'the team decided' obscures what interviewers need to evaluate. Describe what you specifically did." },
    };

    const matched = Object.entries(archetypePersonality).find(([key]) => arch.includes(key));
    const personality = matched?.[1] ?? {
      style: `Across ${count} sessions, a communication pattern is starting to take shape.`,
      strength: "The raw material is there.",
      tension: "The work is making it more deliberate. Tighter structure and more specific evidence are the two levers that will move the scores.",
    };

    // ── Secondary archetype modifiers ─────────────────────────────────────────
    const secondaryModifiers: Record<string, string> = {
      "storyteller":        "a narrative instinct that makes your answers feel lived-in and real",
      "circling the point": "a tendency to spiral toward the answer rather than open with it",
      "polished performer": "a composed, controlled quality that shows up especially in structured questions",
      "anxious achiever":   "a habit of qualifying and hedging that surfaces when the stakes feel higher",
      "vague narrator":     "a fluency that can make answers sound more specific than the details support",
      "fading closer":      "a tendency to lose steam in the final stretch, where the close needs as much care as the setup",
      "monotone expert":    "a delivery that can flatten out when the content gets technical or detailed",
      "scattered thinker":  "a pattern of branching mid-thought before the current thread is finished",
      "quiet achiever":     "an understated quality that occasionally undersells the strength of the work",
      "fragmented expert":  "a habit of leaving thoughts slightly incomplete before moving to the next point",
      "phantom expert":     "a linguistic sophistication that can paper over missing specifics",
      "process narrator":   "a tendency to narrate what happened without centering your own judgment in the story",
      "the creditor":       "a habit of distributing credit that can obscure your personal contribution",
    };

    const secMatched = Object.entries(secondaryModifiers).find(([key]) => secondArch.includes(key));
    const secondaryNote = secMatched && secondArch && secondArch !== arch
      ? `A secondary pattern also runs through your sessions: ${secMatched[1]}.`
      : null;

    // ── Dimension qualitative translations ───────────────────────────────────
    const dimQuality = (key: string, avg: number): string => {
      const high = avg >= 7.0;
      const low  = avg < 5.5;
      const map: Record<string, [string, string]> = {
        narrative_clarity:   ["Your answers are well-organized and easy to follow", "Your answers sometimes meander before reaching the main point"],
        evidence_quality:    ["You consistently back claims with specific examples", "Your answers tell the story but often lack the concrete proof that makes them stick"],
        ownership_agency:    ["You take clear, direct ownership of your decisions and outcomes", "You sometimes share credit too broadly, diluting your individual contribution"],
        vocal_engagement:    ["Your delivery is varied and engaging, with the voice reflecting the content", "Your delivery can be flat, which undersells the quality of your content"],
        response_control:    ["You stay on point and manage the shape of your answers well", "You sometimes lose control of where the answer is going"],
        cognitive_depth:     ["You show genuine depth of thinking, with answers that go beyond the obvious", "Your answers tend to stay at the surface, with more thinking behind them than you're showing"],
        presence_confidence: ["You come across as confident and self-assured", "Your answers sometimes lack the confidence that the work you're describing deserves"],
        audience_awareness:  ["You pitch answers well for who's listening", "You could calibrate better for the context you're in"],
      };
      const [highDesc, lowDesc] = map[key] ?? ["This dimension is a strength", "This is an area for development"];
      return high ? highDesc : low ? lowDesc : "";
    };

    // ── Overall trajectory ────────────────────────────────────────────────────
    const trajectoryNote = (() => {
      const { trend, trendStrength } = traj;
      if (trend === "improving" && trendStrength === "strong")    return "Your scores have been improving significantly. The practice is visibly compounding.";
      if (trend === "improving" && trendStrength === "moderate")  return "Your trajectory is trending upward. Recent sessions are tracking higher than your overall average.";
      if (trend === "improving" && trendStrength === "slight")    return "There's a slight upward lean in recent sessions. It's gradual, and the trajectory is positive.";
      if (trend === "plateau")                                    return "Your performance has leveled off. You're getting consistent results, and breaking through will take a new deliberate challenge.";
      if (trend === "declining" && trendStrength === "strong")    return "Recent sessions are tracking notably lower than your historical average. Worth examining whether question difficulty has increased or a new habit has crept in.";
      if (trend === "declining")                                  return "Recent sessions are dipping slightly. Worth staying aware of what's shifting.";
      return null;
    })();

    // ── Consistent strength pattern ───────────────────────────────────────────
    const topStrengthPattern = coachingProfile.strengthPatterns
      .filter(s => s.consistent && s.allTimeFrequency >= 0.5)
      .sort((a, b) => b.allTimeFrequency - a.allTimeFrequency)[0] ?? null;

    // ── Category performance ──────────────────────────────────────────────────
    const catNote = (() => {
      if (!catPerf || catPerf.length < 2) return null;
      const sorted = [...catPerf].filter(c => c.attempts >= 2).sort((a, b) => b.avgScore - a.avgScore);
      if (sorted.length < 2) return null;
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      if (best.category === worst.category) return null;
      const fmtCat = (c: string) => c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      if (best.avgScore - worst.avgScore >= 8) {
        return `Your strongest question category is ${fmtCat(best.category)}. ${fmtCat(worst.category)} is where the biggest performance gap sits, and it's worth dedicating focused sessions there.`;
      } else if (best.avgScore - worst.avgScore >= 4) {
        return `${fmtCat(best.category)} questions are where you consistently show up best.`;
      }
      return null;
    })();

    // ── Paragraph 1: Who you are as a communicator ───────────────────────────
    let p1 = personality.style;
    if (secondaryNote) p1 += ` ${secondaryNote}`;
    if (topDims[0]) {
      const strengthDesc = dimQuality(topDims[0].key, topDims[0].allTimeAvg);
      if (strengthDesc) {
        p1 += ` ${strengthDesc}.`;
        if (topDims[1]) {
          const strength2 = dimQuality(topDims[1].key, topDims[1].allTimeAvg);
          if (strength2 && topDims[1].allTimeAvg >= 6.5) p1 += ` ${strength2} as well.`;
        }
      }
    }
    if (topStrengthPattern) {
      const label = topStrengthPattern.key.replace(/_/g, " ");
      p1 += ` One of your most consistent patterns is ${label}. It shows up reliably across sessions.`;
    }
    p1 += ` ${personality.strength}`;
    if (fieldPhrase && traj.recentAvg !== null && traj.recentAvg >= 70) p1 += ` That matters ${fieldPhrase}.`;
    if (trajectoryNote) p1 += ` ${trajectoryNote}`;

    // ── Paragraph 2: The tension / gap ───────────────────────────────────────
    let p2 = personality.tension;
    if (bottomDims[0] && bottomDims[0].allTimeAvg < 6.5) {
      const gapDesc = dimQuality(bottomDims[0].key, bottomDims[0].allTimeAvg);
      if (gapDesc) {
        p2 += ` Specifically: ${gapDesc.toLowerCase()}.`;
        if (bottomDims[1] && bottomDims[1].key !== bottomDims[0].key && bottomDims[1].allTimeAvg < 6.5) {
          const gap2 = dimQuality(bottomDims[1].key, bottomDims[1].allTimeAvg);
          if (gap2) p2 += ` ${gap2}. That's the second gap to close.`;
        }
      }
    }
    if (lp.avgHedgingScore !== null && lp.avgHedgingScore >= 6) {
      p2 += ` Your language carries a higher-than-ideal amount of hedging. Softening phrases are diffusing answers that benefit from directness.`;
    } else if (lp.avgCognitiveComplexity !== null && lp.avgCognitiveComplexity >= 7.5) {
      p2 += ` Analytically, your language is a real strength. The cognitive depth in how you frame ideas is above average.`;
    }
    if (sp.weakestComponent && sp.behavioralAttemptCount >= 3) {
      const starMap: Record<string, string> = {
        situation: "the setup and context section of your STAR answers tends to be the thinnest. Interviewers need more grounding before the action lands",
        task: "defining your specific responsibility and goal is the STAR component most often left vague. Make your assignment explicit early",
        action: "the action section (what you specifically did) is the weakest STAR component, which is the most critical gap since it's where your judgment gets evaluated",
        result: "the result section is where your STAR answers tend to fade. It's the highest-value real estate in any behavioral answer",
      };
      const starNote = starMap[sp.weakestComponent];
      if (starNote) p2 += ` On structure: ${starNote}.`;
    }
    if (catNote) p2 += ` ${catNote}`;
    if (coachingProfile.resolvedWeaknesses.length > 0) {
      const resolved = coachingProfile.resolvedWeaknesses[0].replace(/_/g, " ");
      p2 += ` Worth noting: ${resolved} has cleared from your recent sessions. That pattern has shifted.`;
    }
    if (evolving && recentArch) {
      const recentLabel = archetypeStats.all.find(a => a.name.toLowerCase() === recentArch)?.name ?? recentArch;
      p2 += ` Your most recent sessions are trending toward a ${recentLabel} pattern, which suggests you're adapting. Keep watching that shift.`;
    }

    // ── Paragraph 3: Delivery & Presence ─────────────────────────────────────
    let p3 = "";

    // Voice layer: pace + fillers + monotone (categorical — no raw numbers)
    const voiceSentences: string[] = [];
    if (dp.wpmCategory === "very_fast")  voiceSentences.push("your pace is notably fast. Slowing down for results and key claims will change how they land");
    else if (dp.wpmCategory === "fast")  voiceSentences.push("you're speaking faster than ideal in key moments. The listener needs a beat to absorb results before you move on");
    else if (dp.wpmCategory === "slow")  voiceSentences.push("your pace lingers in the setup. A slightly brisker tempo will keep the listener more engaged");
    else if (dp.wpmCategory === "good")  voiceSentences.push("your pace is comfortable and conversational");

    if (dp.fillerCategory === "high")        voiceSentences.push("filler words are a consistent habit. Replacing each one with a deliberate pause is the fastest fix");
    else if (dp.fillerCategory === "good")   voiceSentences.push("filler words are mostly under control. An occasional one slips in at a level that's manageable");
    else if (dp.fillerCategory === "excellent") voiceSentences.push("filler word control is clean. That reinforces your composure signal");

    if (dp.monotoneCategory === "flat")        voiceSentences.push("the delivery is acoustically flat. The ideas are stronger than what the voice is currently carrying");
    else if (dp.monotoneCategory === "moderate") voiceSentences.push("vocal variety is serviceable. There's more range available to add energy to your answers");
    else if (dp.monotoneCategory === "engaging") voiceSentences.push("vocal dynamics are engaging. The voice is reflecting the content well");

    // Vocal dynamics layer: energy variation + tempo (only add nuance if not covered by monotoneCategory)
    const dynamicsSentences: string[] = [];
    if (overview.avgEnergyVar !== null && dp.monotoneCategory !== "engaging") {
      if (overview.avgEnergyVar >= 7)     dynamicsSentences.push("energy variation is a genuine asset. The voice carries different weight in different parts of the answer");
      else if (overview.avgEnergyVar < 3) dynamicsSentences.push("energy variation is low. The delivery stays at a consistent level when stronger moments call for a lift");
    }
    if (overview.avgTempoDyn !== null) {
      if (overview.avgTempoDyn >= 7)     dynamicsSentences.push("tempo dynamics are strong. You vary your pace deliberately, which keeps the listener oriented");
      else if (overview.avgTempoDyn < 3) dynamicsSentences.push("tempo is relatively static. Varying the pace around key moments would add dimension to the delivery");
    }

    // Camera layer: eye contact, expressiveness, stability, warmth, engagement, look-away
    const webcamSentences: string[] = [];
    if (overview.avgEyeContact !== null) {
      if (overview.avgEyeContact < 50)      webcamSentences.push("eye contact is below where it should be. Looking directly at the camera consistently projects more authority");
      else if (overview.avgEyeContact >= 75) webcamSentences.push("eye contact is strong, which reinforces the confidence your voice is building");
    }
    if (overview.avgExpressiveness !== null) {
      if (overview.avgExpressiveness >= 70) webcamSentences.push("facial expressiveness is working in your favor. You read as visually engaged and present on camera");
      else if (overview.avgExpressiveness < 30) webcamSentences.push("facial expression tends toward neutral on camera. More animation in key moments would reinforce what you're saying verbally");
    }
    if (overview.avgHeadStability !== null) {
      if (overview.avgHeadStability >= 75)   webcamSentences.push("physical composure is strong. That steadiness on camera projects authority");
      else if (overview.avgHeadStability < 40) webcamSentences.push("head movement is creating a slightly restless appearance. A steadier posture adds authority and focus");
    }
    if (overview.avgSmileRate !== null && overview.avgSmileRate >= 35) {
      webcamSentences.push("natural warmth shows up in your expression. That's a social asset, especially in culture-fit conversations");
    }
    if (overview.avgBrowEngagement !== null && overview.avgBrowEngagement >= 55) {
      webcamSentences.push("brow engagement is active. You're visually communicating emphasis and interest to the camera");
    }
    if (overview.avgLookAwayRate !== null && overview.avgLookAwayRate >= 45) {
      webcamSentences.push("you look away from the camera more frequently than ideal. A more consistent direct look forward will significantly strengthen your on-camera presence");
    }

    // STAR result quality
    const starResultNote =
      overview.avgStarResult !== null && overview.avgStarResult < 5.5
        ? "The pattern costing you the most is weak result statements. Answers are building well but closing before a measurable outcome lands."
        : overview.avgStarResult !== null && overview.avgStarResult >= 7.0
        ? "Your answers close well. Result statements are landing with impact, which is one of the most valued signals in behavioral interviews."
        : null;

    const hasAnyDelivery = voiceSentences.length > 0 || dynamicsSentences.length > 0 || webcamSentences.length > 0 || starResultNote !== null;
    if (!hasAnyDelivery) {
      p3 = `Complete a few spoken sessions to unlock delivery analysis. Pace, filler rate, and vocal variety add a significant layer to this coaching picture.`;
    } else {
      const p3Parts: string[] = [];
      if (voiceSentences.length > 0) {
        const joined = voiceSentences.length === 1
          ? voiceSentences[0]
          : voiceSentences.slice(0, -1).join(", ") + ", and " + voiceSentences[voiceSentences.length - 1];
        p3Parts.push(`On voice: ${joined}.`);
      }
      if (dynamicsSentences.length > 0) {
        const joined = dynamicsSentences.length === 1
          ? dynamicsSentences[0]
          : dynamicsSentences.slice(0, -1).join(", ") + ", and " + dynamicsSentences[dynamicsSentences.length - 1];
        p3Parts.push(`Vocally, ${joined}.`);
      }
      if (webcamSentences.length > 0) {
        const joined = webcamSentences.length === 1
          ? webcamSentences[0]
          : webcamSentences.slice(0, -1).join(", ") + ", and " + webcamSentences[webcamSentences.length - 1];
        p3Parts.push(`On camera: ${joined}.`);
      }
      if (starResultNote) p3Parts.push(starResultNote);
      p3 = p3Parts.join(" ");
    }

    // ── Paragraph 4: Coaching priority + practice context ────────────────────
    const priorityMap: Record<string, string> = {
      outcome_strength:    "Every answer needs to end with a result that an interviewer can measure: a number, a timeline, or a named outcome. The setup is consistently stronger than the close.",
      evidence_specificity:"The pattern to break is making claims without proof. Before your next session, find one specific number, a percentage, a dollar amount, or a timeframe, for each story you're planning to tell.",
      hedging_language:    "The language habit to target is hedging. 'I think', 'kind of', and 'we' are softening answers that benefit from directness. Try leading your next three answers with 'I decided' or 'I drove' and notice the difference.",
      directness:          "You're building up to your point when leading with it would be stronger. Try opening your next answer with the outcome: 'I drove X result by doing Y,' and then work backwards into the story.",
      ownership:           "The word to watch is 'we'. When describing your own decisions, it diffuses the contribution the interviewer is trying to evaluate. Name what you specifically did.",
      structural_clarity:  "Before your next answer, say the core of it in one sentence: 'I did X and the outcome was Y.' That sentence is your anchor. Build the story around it.",
      filler_words:        "The filler word habit is the most actionable thing to target right now. Replace every 'um' or 'like' with a deliberate one-second pause. It sounds better and it signals composure.",
      pace_fast:           "Slow down after your result statement. That's the moment where the answer lands or gets lost, and rushing through it means the credit doesn't follow the effort.",
      pace_slow:           "Get to your action faster. The setup is longer than it needs to be. Try cutting the first third and opening with what you actually did.",
    };

    let p4 = "";
    if (topPriority) {
      p4 = priorityMap[topPriority.area] ?? priorityMap[topPriority.key] ?? `${topPriority.area}: ${topPriority.evidence}.`;
      if (secondPriority) {
        const secondMsg = priorityMap[secondPriority.area] ?? priorityMap[secondPriority.key] ?? "";
        if (secondMsg) p4 += ` Once that's consistent, the next focus: ${secondMsg.split(".")[0].toLowerCase()}.`;
      }
    } else if (bottomDims[0] && bottomDims[0].allTimeAvg < 6.0) {
      const gapDesc = dimQuality(bottomDims[0].key, bottomDims[0].allTimeAvg);
      p4 = `The clearest thing to work on is ${bottomDims[0].label.toLowerCase()}. ${gapDesc || "Focus your next few sessions on building this dimension up."} The score will follow the habit.`;
    } else {
      p4 = `No single dominant gap has emerged yet. The opportunity is in execution. Focus your next sessions on one thing: end every answer with a specific, named result that someone could verify.`;
    }
    if (overview.topCategory) {
      const catLabel = overview.topCategory.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      p4 += ` You've spent most of your sessions on ${catLabel} questions — that focus is showing.`;
    }

    return { p1, p2, p3, p4 };
  }, [history, coachingProfile, archetypeStats, overview, studentProfile]);

  // ── Cross-context profile (dimension avgs grouped by practice type) ──────────
  const crossContextProfile = useMemo(() => {
    const groups: Record<string, { label: string; dims: Record<string, number[]> }> = {};
    const LABELS: Record<string, string> = {
      interview: "Interview Practice",
      mock_interview: "Mock Interview",
      public_speaking: "Public Speaking",
      networking: "Networking",
    };

    for (const a of history) {
      const fw = (a.evaluationFramework === "networking_pitch") ? "networking"
        : (a.evaluationFramework === "public_speaking") ? "public_speaking"
        : (a.evaluationFramework === "mock_interview") ? "mock_interview"
        : "interview";

      if (!groups[fw]) groups[fw] = { label: LABELS[fw] ?? fw, dims: {} };
      const dims = getAttemptDimensions(a);
      if (!dims) continue;
      for (const key of DIM_ORDER) {
        const v = typeof dims[key] === "number" ? dims[key] : null;
        if (v !== null) {
          if (!groups[fw].dims[key]) groups[fw].dims[key] = [];
          groups[fw].dims[key].push(v);
        }
      }
    }

    // Only include groups with >= 2 attempts that have dimension data
    return Object.entries(groups)
      .filter(([, g]) => Object.values(g.dims).some(arr => arr.length >= 2))
      .map(([type, g]) => ({
        type,
        label: g.label,
        dims: DIM_ORDER.map(key => ({
          key,
          label: DIM_LABELS[key],
          avg: g.dims[key]?.length
            ? Math.round((g.dims[key].reduce((a, b) => a + b, 0) / g.dims[key].length) * 10) / 10
            : null,
          count: g.dims[key]?.length ?? 0,
        })).filter(d => d.avg !== null),
      }))
      .sort((a, b) => b.dims.length - a.dims.length);
  }, [history]);

  const interviewNotes = useMemo(() => {
    const leanInto: string[] = [];
    const watchouts: string[] = [];
    const reminders: string[] = [];

    if (coachingProfile) {
      // Lean into: consistent strengths from full profile
      for (const s of coachingProfile.strengthPatterns.filter(p => p.consistent && p.allTimeFrequency >= 0.4).slice(0, 2)) {
        const label = s.key.replace(/_/g, " ");
        leanInto.push(`${label.charAt(0).toUpperCase() + label.slice(1)} is a consistent strength (${Math.round(s.allTimeFrequency * 100)}% of sessions) — lean on this in every answer.`);
      }
      // Lean into: strong delivery
      if (overview.avgPace !== null && overview.avgPace >= 115 && overview.avgPace <= 145) {
        leanInto.push("Your pacing is already in a strong interview range - keep that same tempo under pressure.");
      }
      if (overview.avgEyeContact !== null && overview.avgEyeContact >= 70) {
        leanInto.push(`Strong on-camera eye contact (${overview.avgEyeContact}%) — your presence reads as confident and engaged.`);
      }
      // Lean into: strong dimensions
      const strongDim = coachingProfile.dimensionProfile
        .filter(d => d.classification === "persistent_strength" || (d.allTimeAvg >= 7.5 && d.attemptCount >= 3))
        .sort((a, b) => b.allTimeAvg - a.allTimeAvg)[0];
      if (strongDim && leanInto.length < 3) {
        leanInto.push(`${strongDim.label} is one of your strongest dimensions (avg ${strongDim.allTimeAvg.toFixed(1)}/10) — model your weaker answers on this structure.`);
      }

      // Watchouts: top priorities from full profile
      for (const p of coachingProfile.topPriorities.slice(0, 2)) {
        const watchoutMap: Record<string, string> = {
          outcome_strength: "Do not stop after the action — every behavioral answer needs an explicit result statement.",
          hedging_language: "Do not soften strong examples with 'I think' or 'kind of' — direct ownership scores better.",
          evidence_specificity: "Do not make claims without a number or concrete metric to back them up.",
          directness: "Do not build slowly to your point — lead with the answer, then support it.",
          ownership: "Do not use 'we' when describing your own decisions — use 'I' to claim your contribution.",
          structural_clarity: "Do not ramble to your answer — state your headline first, then support with 2-3 points.",
          filler_words: "Do not fill silence with filler words — replace 'um' and 'like' with a clean pause.",
          pace_fast: "Do not rush through key outcomes — slow down after results and metrics so they land.",
          pace_slow: "Do not overbuild your setup — get to your point faster.",
        };
        const msg = watchoutMap[p.key] ?? `Do not underestimate ${p.area.toLowerCase()} — it has shown up in ${p.evidence}.`;
        watchouts.push(msg);
      }
      // Watchouts: delivery issues not in topPriorities
      if (overview.avgMonotone !== null && overview.avgMonotone >= 6 && watchouts.length < 2) {
        watchouts.push("Do not deliver key outcomes in the same flat tone as background detail — add more vocal lift on results.");
      }
      // Fallback: if topPriorities yielded nothing, pull from weakest dimension
      if (watchouts.length === 0) {
        const weakDim = coachingProfile.dimensionProfile
          .filter(d => d.attemptCount >= 2)
          .sort((a, b) => a.allTimeAvg - b.allTimeAvg)[0];
        if (weakDim) {
          watchouts.push(`Do not neglect ${weakDim.label.toLowerCase()} — at ${weakDim.allTimeAvg.toFixed(1)}/10 it is your lowest-scoring dimension across sessions.`);
        } else {
          watchouts.push("Do not try to improve everything at once — pick one dimension per session and focus there.");
        }
      }

      // Reminders: role-specific focus + universal
      const topDimGap = coachingProfile.dimensionProfile
        .filter(d => d.classification === "persistent_gap" || (d.allTimeAvg < 5.5 && d.attemptCount >= 3))
        .sort((a, b) => a.allTimeAvg - b.allTimeAvg)[0];
      if (topDimGap) {
        reminders.push(`Your main focus area: ${topDimGap.label.toLowerCase()} (avg ${topDimGap.allTimeAvg.toFixed(1)}/10 across ${topDimGap.attemptCount} sessions).`);
      }
      reminders.push("Open with the answer first, then support it with 2–3 details.");
      reminders.push("Make the final line sound finished - result, takeaway, or impact.");
      if (coachingProfile.resolvedWeaknesses.length > 0) {
        const resolved = coachingProfile.resolvedWeaknesses[0].replace(/_/g, " ");
        reminders.push(`Maintain your progress on ${resolved} — confirm it is still holding in this session.`);
      } else {
        reminders.push("If you start rambling, shorten the sentence instead of adding more explanation.");
      }
    } else {
      // Fallback for new users (no coachingProfile)
      if (strongestCategory?.label) {
        leanInto.push(`You are most natural in ${strongestCategory.label.toLowerCase()} questions, so borrow that same structure in weaker categories.`);
      }
      if (overview.avgPace !== null && overview.avgPace >= 115 && overview.avgPace <= 145) {
        leanInto.push("Your pacing is already in a strong interview range - keep that same tempo under pressure.");
      }
      if (overview.avgFillers !== null && overview.avgFillers >= 3) {
        watchouts.push("Do not rush to fill silence. Your first fix is replacing filler words with a clean pause.");
      }
      if (overview.avgStarResult !== null && overview.avgStarResult <= 6.5) {
        watchouts.push("Do not stop after explaining the action. Your answers need a clearer final result or business impact.");
      }
      if (watchouts.length === 0 && overview.avgOverall !== null) {
        watchouts.push("Do not try to improve everything at once - one focused adjustment per session will move the score faster.");
      }
    }

    return {
      leanInto: leanInto.slice(0, 3),
      watchouts: watchouts.slice(0, 3),
      reminders: reminders.slice(0, 4),
    };
  }, [coachingProfile, overview, strongestCategory]);

  const nextFocusCard = useMemo(() => {
    if (overview.avgStarResult !== null && overview.avgStarResult <= 6.5) {
      return {
        title: "End with the result, not just the action",
        body: "Your biggest scoring leak is closing impact. Too many answers explain what you did but stop before clearly stating the result or business outcome.",
        action: "For your next attempt, end with one sentence that answers: what changed, what improved, or what result came from your work?",
      };
    }

    if (overview.avgFillers !== null && overview.avgFillers >= 3) {
      return {
        title: "Reduce filler words to sound more polished",
        body: "Your content is often good enough, but filler words are softening delivery and making answers feel less controlled.",
        action: "For your next attempt, replace filler words with one short pause.",
      };
    }

    if (overview.avgPace !== null && overview.avgPace > 165) {
      return {
        title: "Slow down after important points",
        body: "Your pace is fast enough to make strong ideas land less clearly, especially after metrics, outcomes, or decisions.",
        action: "For your next attempt, add one pause after every number, metric, or result.",
      };
    }

    if (overview.avgPace !== null && overview.avgPace < 100) {
      return {
        title: "Tighten your first 1–2 sentences",
        body: "Your pacing trends slow, which can make answers sound hesitant or overbuilt before the main point arrives.",
        action: "For your next attempt, answer headline-first and shorten the setup.",
      };
    }

    if (overview.avgMonotone !== null && overview.avgMonotone >= 6) {
      return {
        title: "Add more emphasis to the result",
        body: "Your delivery can flatten on key points, which makes the most important part of the answer sound less memorable.",
        action: "For your next attempt, lift your tone slightly when you state the result or takeaway.",
      };
    }

    return {
      title: "Build sharper endings",
      body: "Your scores are fairly stable, so the next improvement will likely come from making answers feel more finished and intentional.",
      action: "For your next attempt, close with one sentence that clearly states the result, metric, or business impact.",
    };
  }, [overview]);

  // ── Visual/vocal data helpers ────────────────────────────────────────────────
  const facialSessions = history.filter((a: any) => a.deliveryMetrics?.face && typeof a.deliveryMetrics.face.eyeContact === "number");
  const vocalSessionsV = history.filter((a: any) => a.deliveryMetrics && typeof a.deliveryMetrics.wpm === "number");
  const avgArr = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null;
  const avgEye  = avgArr(facialSessions.map((a: any) => a.deliveryMetrics.face.eyeContact * 100));
  const avgWpmV = avgArr(vocalSessionsV.map((a: any) => a.deliveryMetrics.wpm));

  // ── NACE ─────────────────────────────────────────────────────────────────────
  const naceScores = computeNaceProfile({
    attempts: history.map((a) => ({
      score: n(a.score ?? a.feedback?.score),
      communicationScore: n(a.communication_score ?? a.feedback?.communication_score),
      confidenceScore: n(a.confidence_score ?? a.feedback?.confidence_score),
      wpm: n(a.wpm),
      feedback: a.feedback,
      prosody: a.prosody,
      questionCategory: a.questionCategory,
    })),
  });

  const mockInterviewAttempts = useMemo(
    () => history.filter(a => a.evaluationFramework === "mock_interview"),
    [history],
  );

  const findings = useMemo(() => generateFindings(history), [history]);

  return (
    <PremiumShell title="My Coach">
      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 6 }}>

        {/* ── Page-level tab bar ──────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: "var(--radius-lg)", background: "var(--card-bg)", border: "1px solid var(--card-border)", alignSelf: "flex-start" }}>
          {(["coaching", "data"] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setPageView(v)}
              style={{
                padding: "7px 18px", borderRadius: 9, border: "none",
                background: pageView === v ? "var(--accent)" : "transparent",
                color: pageView === v ? "#fff" : "var(--text-muted)",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              {v === "coaching" ? "My Coach" : "Signal Insights"}
            </button>
          ))}
        </div>

        {/* ── Signal Insights tab ─────────────────────────────────────────── */}
        {pageView === "data" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {loadState === "hydrating" ? (
              <div style={{ color: "var(--text-muted)", fontSize: 14, padding: 24 }}>Loading data…</div>
            ) : findings.length === 0 ? (
              <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-xl)", padding: "32px 28px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Not enough data yet</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  Signal Insights need at least 4 practice sessions with consistent data (face, acoustic, or dimension scores) before patterns become meaningful. Keep practicing and check back.
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 680 }}>
                  Cross-signal patterns found in your {history.length} sessions. These correlate signals from different measurement domains — body language vs. language quality, acoustics vs. cognitive score — so they surface non-obvious relationships.
                </div>
                <div style={{ display: "grid", gap: 14 }}>
                  {findings.map(f => (
                    <FindingCard key={f.id} f={f} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Coaching content ────────────────────────────────────────────── */}
        {pageView === "coaching" && (<>

        {/* ── My Coach Profile Header ─────────────────────────────────────── */}
        {history.length >= 3 && coachingProfile && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            {/* Left: Profile identity */}
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-xl)", padding: "26px 28px", boxShadow: "var(--shadow-card-soft)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 16 }}>
                Your Communication Profile
              </div>

              {/* Archetype */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent)", letterSpacing: -0.6, lineHeight: 1.1, marginBottom: 4 }}>
                  {archetypeStats.dominant ?? "Profile building…"}
                </div>
                {archetypeStats.dominant && coachingProfile.archetypeEvolution.recentArchetype !== archetypeStats.dominant && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Recently shifting → {coachingProfile.archetypeEvolution.recentArchetype}
                  </div>
                )}
              </div>

              {/* Communication Signature */}
              {communicationSignature && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Communication Signature
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {communicationSignature.map((trait, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 12, fontWeight: 600,
                          color: i === 0 ? "var(--success)" : i === 1 ? "var(--text-muted)" : "var(--accent)",
                          background: i === 0 ? "var(--success-soft)" : i === 1 ? "rgba(28,25,23,0.05)" : "var(--accent-soft)",
                          border: `1px solid ${i === 0 ? "rgba(22,163,74,0.15)" : i === 1 ? "rgba(28,25,23,0.08)" : "rgba(79,70,229,0.15)"}`,
                          padding: "4px 10px", borderRadius: 7, lineHeight: 1.3,
                        }}
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Top priority */}
              {coachingProfile.topPriorities[0] && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: coachingProfile.topPriorities[0].urgency === "critical" ? "rgba(220,38,38,0.06)" : "rgba(217,119,6,0.06)",
                  border: `1px solid ${coachingProfile.topPriorities[0].urgency === "critical" ? "rgba(220,38,38,0.18)" : "rgba(217,119,6,0.18)"}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: coachingProfile.topPriorities[0].urgency === "critical" ? "#DC2626" : "#D97706", marginBottom: 4 }}>
                    Top Focus
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                    {coachingProfile.topPriorities[0].area}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {coachingProfile.topPriorities[0].evidence}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Coaching writeup */}
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-xl)", padding: "26px 28px", boxShadow: "var(--shadow-card-soft)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 16 }}>
                Coaching Notes
              </div>

              {coachingWriteup && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* P1: always visible */}
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.75 }}>
                    {coachingWriteup.p1}
                  </p>

                  {/* P2–P4: blurred + gated for free users */}
                  {isPro ? (
                    <>
                      <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.75 }}>
                        {coachingWriteup.p2}
                      </p>
                      {coachingWriteup.p3 && (
                        <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.75 }}>
                          {coachingWriteup.p3}
                        </p>
                      )}
                      <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.75, borderTop: "1px solid var(--card-border-soft)", paddingTop: 14 }}>
                        {coachingWriteup.p4}
                      </p>
                    </>
                  ) : (
                    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden" }}>
                      {/* Blurred preview */}
                      <div style={{ filter: "blur(5px)", userSelect: "none", pointerEvents: "none" }} aria-hidden="true">
                        <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.75 }}>
                          {coachingWriteup.p2}
                        </p>
                        {coachingWriteup.p3 && (
                          <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.75 }}>
                            {coachingWriteup.p3}
                          </p>
                        )}
                        <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.75 }}>
                          {coachingWriteup.p4}
                        </p>
                      </div>
                      {/* Upgrade overlay */}
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(to bottom, transparent 0%, var(--card-bg) 35%)",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                        paddingBottom: 16, gap: 8,
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>
                          Unlock full coaching analysis
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", maxWidth: 280, lineHeight: 1.5 }}>
                          Pro includes your gap analysis, delivery breakdown, and personalized action plan.
                        </div>
                        <Link href="/settings" style={{ textDecoration: "none" }}>
                          <button style={{
                            padding: "9px 20px", borderRadius: 8,
                            background: "linear-gradient(135deg, var(--accent-2-soft), var(--accent-soft))",
                            border: "1px solid var(--accent-strong)",
                            color: "var(--text-primary)", fontWeight: 700, fontSize: 13,
                            cursor: "pointer", boxShadow: "var(--shadow-glow)",
                          }}>
                            Upgrade to Pro
                          </button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Dimension Summary */}
              {coachingProfile.dimensionProfile.length >= 3 && (
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                    Dimension Summary
                  </div>
                  {coachingProfile.dimensionProfile
                    .sort((a, b) => b.allTimeAvg - a.allTimeAvg)
                    .slice(0, isPro ? 8 : 2)
                    .map(d => {
                      const pct = Math.round((d.allTimeAvg / 10) * 100);
                      const color = d.allTimeAvg >= 7.5 ? "var(--success)" : d.allTimeAvg >= 5.5 ? "var(--accent)" : "#DC2626";
                      return (
                        <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ flex: 1, fontSize: 12, color: "var(--text-primary)", fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {d.label}
                          </div>
                          <div style={{ width: 80, height: 4, borderRadius: 4, background: "rgba(28,25,23,0.07)", overflow: "hidden", flexShrink: 0 }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 400ms" }} />
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color, width: 28, textAlign: "right", flexShrink: 0 }}>
                            {d.allTimeAvg.toFixed(1)}
                          </div>
                        </div>
                      );
                    })}
                  {!isPro && coachingProfile.dimensionProfile.length > 2 && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      +{coachingProfile.dimensionProfile.length - 2} more dimensions unlocked with Pro
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Cross-Context Profile (Pro only) ────────────────────────────── */}
        {isPro && crossContextProfile.length >= 2 && (
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-xl)", padding: "22px 24px", boxShadow: "var(--shadow-card-soft)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 16 }}>
              Cross-Context Profile
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${crossContextProfile.length}, 1fr)`, gap: 14 }}>
              {crossContextProfile.map(ctx => (
                <div key={ctx.type}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 10 }}>{ctx.label}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {ctx.dims.slice(0, 5).map(d => {
                      const pct = Math.round(((d.avg ?? 0) / 10) * 100);
                      const color = (d.avg ?? 0) >= 7.5 ? "var(--success)" : (d.avg ?? 0) >= 5.5 ? "var(--accent)" : "#DC2626";
                      return (
                        <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {d.label}
                          </div>
                          <div style={{ width: 50, height: 3, borderRadius: 3, background: "rgba(28,25,23,0.07)", overflow: "hidden", flexShrink: 0 }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3 }} />
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, color, width: 24, textAlign: "right", flexShrink: 0 }}>
                            {d.avg}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Session Filter ──────────────────────────────────────────────── */}
        {history.length > 0 && (
          <div style={{ display: "flex", gap: 6, padding: "4px", borderRadius: "var(--radius-lg)", background: "var(--card-bg)", border: "1px solid var(--card-border)", alignSelf: "flex-start" }}>
            {(["all", "mock_interview"] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setSessionFilter(f)}
                style={{
                  padding: "7px 16px", borderRadius: 9, border: "none",
                  background: sessionFilter === f ? "var(--accent)" : "transparent",
                  color: sessionFilter === f ? "#fff" : "var(--text-muted)",
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                {f === "all" ? `All Sessions (${history.length})` : `Mock Interviews (${mockInterviewAttempts.length})`}
              </button>
            ))}
          </div>
        )}

        {/* ── Mock Interview session list (only in mock filter) ──────────── */}
        {sessionFilter === "mock_interview" && mockInterviewAttempts.length > 0 && (
          <PremiumCard>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Mock Interview Sessions</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Full conversational sessions, scored across 7 dimensions with per-question breakdowns.</div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
              {mockInterviewAttempts.map((a, idx) => {
                const fb = a.feedback as any;
                const score = Math.round((n(a.score ?? fb?.score) ?? 0) * 10);
                const readiness: string = fb?.readiness_level ?? "developing";
                const rColor: Record<string, string> = { strong: "#10B981", ready: "#10B981", developing: "#F59E0B", not_ready: "#EF4444" };
                const rLabel: Record<string, string> = { strong: "Strong", ready: "Ready", developing: "Developing", not_ready: "Not Ready" };
                const c = rColor[readiness] ?? "#F59E0B";
                const role = a.question?.replace("Mock Interview — ", "") ?? "Mock Interview";
                const dateStr = a.ts ? new Date(a.ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
                const qBreakdowns: Array<any> = fb?.question_breakdowns ?? [];
                const dimScores = fb?.dimension_scores as Record<string, { score: number; label: string }> | null;

                return (
                  <div key={idx} style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--card-border)", overflow: "hidden" }}>
                    {/* Header */}
                    <div style={{ padding: "14px 18px", background: "var(--card-bg-strong)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ textAlign: "center" as const }}>
                          <div style={{ fontSize: 28, fontWeight: 700, color: c, lineHeight: 1 }}>{score}</div>
                          <div style={{ fontSize: 9, color: "var(--text-muted)" }}>/100</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{role}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${c}18`, color: c }}>{rLabel[readiness]}</span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{dateStr}</span>
                            {fb?.conversation_turns && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{Math.floor(fb.conversation_turns / 2)} questions</span>}
                          </div>
                        </div>
                      </div>
                      {dimScores && (
                        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "4px 16px" }}>
                          {Object.entries(dimScores).slice(0, 4).map(([key, dim]) => (
                            <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <div style={{ width: 32, height: 3, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
                                <div style={{ height: "100%", background: "var(--accent)", width: `${(dim.score / 10) * 100}%` }} />
                              </div>
                              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{dim.label.split(" ")[0]}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)" }}>{dim.score}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Coaching summary */}
                    {fb?.coaching_summary && (
                      <div style={{ padding: "10px 18px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65, borderBottom: qBreakdowns.length > 0 ? "1px solid var(--card-border)" : "none", background: "var(--card-bg)" }}>
                        {fb.coaching_summary}
                      </div>
                    )}

                    {/* Interview arc sparklines */}
                    {fb?.interview_arc?.qualityArc?.length > 0 && (() => {
                      const arc = fb.interview_arc;
                      const qs = arc.qualityArc as number[];
                      const cs = arc.confidenceArc as number[] | undefined;
                      const ws = arc.wordCountArc as number[] | undefined;
                      const h = 40, w = 100;
                      const makePts = (vals: number[], max: number) =>
                        vals.map((v, i) => `${(i / Math.max(vals.length - 1, 1)) * w},${h - (v / max) * h}`).join(" ");
                      return (
                        <div style={{ padding: "12px 18px", background: "var(--card-bg)", borderBottom: "1px solid var(--card-border)" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 10 }}>Interview Arc</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 10 }}>
                            {([
                              { label: "Quality", vals: qs, max: 100 },
                              { label: "Confidence", vals: cs ?? [], max: 10 },
                              { label: "Word Count", vals: ws ?? [], max: Math.max(...(ws ?? [1])) },
                            ] as const).filter(s => s.vals.length > 0).map(({ label, vals, max }) => (
                              <div key={label}>
                                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>{label}</div>
                                <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, overflow: "visible" }}>
                                  <polyline points={makePts(vals, max)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                                  {vals.map((v, i) => (
                                    <circle key={i} cx={(i / Math.max(vals.length - 1, 1)) * w} cy={h - (v / max) * h} r="2.5" fill="var(--accent)" />
                                  ))}
                                </svg>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                            {arc.warmupEffect && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(245,158,11,0.1)", color: "#D97706" }}>Warm-up Effect</span>}
                            {arc.fatigueSigns && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>Late Fatigue</span>}
                            {arc.consistencyScore != null && <span style={{ fontSize: 10, color: "var(--text-muted)", padding: "2px 8px", borderRadius: 99, background: "var(--card-bg-strong)" }}>Consistency {arc.consistencyScore}/100</span>}
                            {arc.pitchDrift && <span style={{ fontSize: 10, color: "var(--text-muted)", padding: "2px 8px", borderRadius: 99, background: "var(--card-bg-strong)", textTransform: "capitalize" as const }}>Arc: {arc.pitchDrift}</span>}
                          </div>
                          {(arc.openingNote || arc.closingNote) && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                              {arc.openingNote && <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "7px 10px", borderRadius: "var(--radius-sm)", background: "var(--card-bg-strong)", borderLeft: "2px solid #10B981" }}><strong style={{ color: "#10B981" }}>Opening:</strong> {arc.openingNote}</div>}
                              {arc.closingNote && <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "7px 10px", borderRadius: "var(--radius-sm)", background: "var(--card-bg-strong)", borderLeft: "2px solid var(--accent)" }}><strong style={{ color: "var(--accent)" }}>Closing:</strong> {arc.closingNote}</div>}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Question breakdowns */}
                    {qBreakdowns.length > 0 && (
                      <div style={{ padding: "12px 18px", background: "var(--card-bg)" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 10 }}>Questions</div>
                        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                          {qBreakdowns.map((qb, qi) => {
                            const qc = qb.score >= 70 ? "#10B981" : qb.score >= 50 ? "#F59E0B" : "#EF4444";
                            const hasSigs = qb.confidenceSignal != null || qb.ownershipScore != null || qb.wordCount != null;
                            return (
                              <div key={qi} style={{ paddingBottom: qi < qBreakdowns.length - 1 ? 8 : 0, borderBottom: qi < qBreakdowns.length - 1 ? "1px solid var(--card-border-soft)" : "none" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 10, alignItems: "start", marginBottom: hasSigs ? 5 : 0 }}>
                                  <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: `${qc}15`, border: `1px solid ${qc}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: qc }}>{qb.score}</span>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>{qb.question}</div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.5 }}>{qb.note}</div>
                                  </div>
                                </div>
                                {hasSigs && (
                                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, marginLeft: 46 }}>
                                    {qb.confidenceSignal != null && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Confidence <strong style={{ color: "var(--text-primary)" }}>{qb.confidenceSignal}/10</strong></span>}
                                    {qb.ownershipScore != null && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Ownership <strong style={{ color: "var(--text-primary)" }}>{qb.ownershipScore}/10</strong></span>}
                                    {qb.wordCount != null && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{qb.wordCount}w</span>}
                                    {qb.fillerEstimate != null && qb.fillerEstimate > 0 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{qb.fillerEstimate} fillers</span>}
                                    {qb.starComplete === false && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: "rgba(245,158,11,0.1)", color: "#D97706" }}>Missing STAR</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </PremiumCard>
        )}

        {sessionFilter === "mock_interview" && mockInterviewAttempts.length === 0 && loadState === "ready" && (
          <PremiumCard>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>No mock interviews yet</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
              Complete a full mock interview session to see per-session scores, question breakdowns, and coaching summaries here.
            </div>
          </PremiumCard>
        )}

        {loadState === "hydrating" ? (
          <PremiumCard>
            <div style={{ display: "grid", gap: 10 }}>
              {[28, 52, 100].map((w, i) => (
                <div key={i} className="skeleton" style={{ height: i === 2 ? 96 : 14, width: `${w}%`, borderRadius: i === 2 ? "var(--radius-md)" : 999 }} />
              ))}
            </div>
          </PremiumCard>
        ) : history.length === 0 ? (
          <PremiumCard>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>No insights yet</div>
            <div style={{ marginTop: 10, color: "var(--text-muted)", lineHeight: 1.7, fontSize: 14 }}>
              Complete a few interview attempts to unlock trends, strengths, weaknesses, role fit, and a personalized coaching profile.
            </div>
          </PremiumCard>
        ) : (
          <>
            {/* ── THE BRIEF ──────────────────────────────────────────────────────── */}
            <div style={{
              padding: "26px 30px",
              borderRadius: "var(--radius-lg)",
              background: "linear-gradient(135deg, rgba(37,99,235,0.10) 0%, rgba(14,165,233,0.04) 100%)",
              border: "1px solid rgba(37,99,235,0.18)",
              borderLeft: "4px solid var(--accent)",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 28, alignItems: "start" }}>
                {/* Score column */}
                <div style={{ textAlign: "center" as const }}>
                  <div style={{ fontSize: 54, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                    {overview.avgOverall === null ? "—" : Math.round(overview.avgOverall)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>/100 avg</div>
                  <div style={{ marginTop: 10 }}>
                    {(() => {
                      const delta = trendSummary.overallDelta ?? 0;
                      return (
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: delta > 2 ? "#10B981" : delta < -2 ? "#EF4444" : "var(--text-muted)",
                    }}>
                      {delta > 2 ? "↑" : delta < -2 ? "↓" : "→"}{" "}
                      {Math.abs(delta) > 0.5
                        ? `${delta > 0 ? "+" : ""}${delta} recent`
                        : "Stable"}
                    </div>
                      );
                    })()}
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {overview.totalAttempts} session{overview.totalAttempts !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* Identity + top priority */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: "var(--accent)", textTransform: "uppercase" as const, marginBottom: 5 }}>
                    Communication Profile
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2, marginBottom: 8 }}>
                    {archetypeStats.dominant ?? "Building your profile..."}
                  </div>
                  {archetypeStats.dominant && (
                    <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 10, maxWidth: 500 }}>
                      {archetypeStats.dominant?.toLowerCase().includes("polished") ? "You're performing across all dimensions. The next level is consistency under pressure and in less familiar question types." :
                       archetypeStats.dominant?.toLowerCase().includes("hedger") ? "Your main pattern: strong ideas softened by qualifying language. Every 'I think' costs credibility. Replace with direct ownership." :
                       archetypeStats.dominant?.toLowerCase().includes("rusher") ? "Your main pattern: pace outstrips content. Slowing down after metrics and results lets your strongest points actually land." :
                       archetypeStats.dominant?.toLowerCase().includes("storyteller") ? "You lead with narrative and that's a real asset. Channel it: make the Result the emotional peak of every story." :
                       archetypeStats.dominant?.toLowerCase().includes("pauser") ? "Your measured delivery reads as confident and controlled. Protect it — avoid filling your natural silences with filler words." :
                       archetypeStats.dominant?.toLowerCase().includes("lecturer") ? "You structure answers well but can sound flat. One personal moment or concrete number per answer changes how interviewers remember you." :
                       archetypeStats.dominant?.toLowerCase().includes("rambler") ? "You bring energy and enthusiasm. The work now is structure: open with your headline and build outward from there." :
                       "Your communication pattern is emerging. More sessions will reveal your dominant style and specific levers."}
                    </div>
                  )}
                  {coachingProfile?.archetypeEvolution.evolutionNote && (
                    <div style={{ fontSize: 12, color: "#10B981", fontWeight: 600, marginBottom: 10 }}>
                      {coachingProfile.archetypeEvolution.evolutionNote}
                    </div>
                  )}
                  {coachingProfile && coachingProfile.topPriorities[0] && (
                    <div style={{
                      marginTop: 4, padding: "10px 14px", borderRadius: "var(--radius-md)",
                      background: coachingProfile.topPriorities[0].urgency === "critical" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.07)",
                      border: `1px solid ${coachingProfile.topPriorities[0].urgency === "critical" ? "rgba(239,68,68,0.22)" : "rgba(245,158,11,0.22)"}`,
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <div style={{ width: 7, height: 7, borderRadius: 99, background: coachingProfile.topPriorities[0].urgency === "critical" ? "#EF4444" : "#F59E0B", flexShrink: 0 }} />
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" as const }}>
                          {coachingProfile.topPriorities[0].area}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
                          {coachingProfile.topPriorities[0].evidence}
                        </span>
                      </div>
                      <div style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: coachingProfile.topPriorities[0].urgency === "critical" ? "#EF4444" : "#F59E0B", textTransform: "uppercase" as const }}>
                        {coachingProfile.topPriorities[0].urgency}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── WHAT TO WORK ON ────────────────────────────────────────────────── */}
            {history.length > 0 && coachingProfile && coachingProfile.topPriorities.length > 0 && <PremiumCard>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>What to Work On</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                {`Patterns identified across all ${coachingProfile!.totalAttempts} sessions, ranked by how much fixing them will move your score.`}
              </div>

              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {coachingProfile!.topPriorities.map((p, i) => {
                  const urgColor = p.urgency === "critical" ? "#EF4444" : p.urgency === "high" ? "#F59E0B" : "var(--accent)";
                  const urgBg = p.urgency === "critical" ? "rgba(239,68,68,0.05)" : p.urgency === "high" ? "rgba(245,158,11,0.05)" : "rgba(37,99,235,0.04)";
                  const action =
                    p.key === "outcome_strength" ? "End every behavioral answer with one explicit result sentence: what changed, improved, or was measured." :
                    p.key === "hedging_language" ? "Replace 'I think' / 'kind of' / 'basically' with direct ownership: 'I decided', 'I led', 'I drove'." :
                    p.key === "evidence_specificity" ? "Attach one number or concrete metric to every claim you make." :
                    p.key === "directness" ? "Lead with your answer, then support it. Do not build to your point — start with it." :
                    p.key === "ownership" ? "Use 'I' language throughout. Identify your specific contribution, not just the team effort." :
                    p.key === "structural_clarity" ? "State your headline first, then use two or three supporting points. Do not ramble to the answer." :
                    p.type === "delivery" && p.area.toLowerCase().includes("filler") ? "Replace every filler word with a one-beat pause. Silence sounds more confident than 'um'." :
                    p.type === "delivery" && p.area.toLowerCase().includes("fast") ? "Slow down after every metric, result, or decision so the important part actually lands." :
                    p.type === "delivery" && p.area.toLowerCase().includes("slow") ? "Cut the setup by two sentences. Get to your main point faster." :
                    p.type === "star" ? "Do not stop after describing the action. Add one sentence: what changed, what improved, what result came from your work." :
                    p.type === "dimension" ? `Target ${p.area.toLowerCase()} specifically in your next session — pick questions where this dimension matters most.` :
                    p.evidence;
                  return (
                    <div key={i} style={{
                      padding: "14px 16px", borderRadius: "var(--radius-md)",
                      background: urgBg, border: `1px solid ${urgColor}22`,
                      display: "grid", gridTemplateColumns: "8px 1fr auto", gap: 14, alignItems: "start",
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: 99, background: urgColor, marginTop: 5, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" as const, marginBottom: 3 }}>{p.area}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 7 }}>{p.evidence}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.5 }}>{action}</div>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: urgColor, textTransform: "uppercase" as const, whiteSpace: "nowrap" as const, paddingTop: 2 }}>
                        {p.urgency}
                      </div>
                    </div>
                  );
                })}
              </div>
            </PremiumCard>}

            {/* ── FULL COMMUNICATION SCORECARD ────────────────────────────────────── */}
            <PremiumCard>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Communication Scorecard</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: biggestGap ? 12 : 20 }}>
                Content, delivery, and presence — every signal in one view.
              </div>
              {biggestGap && (
                <div style={{ marginBottom: 20, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", textTransform: "uppercase" as const, letterSpacing: 0.4, whiteSpace: "nowrap" as const }}>Top Priority</span>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>{biggestGap.label}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto", whiteSpace: "nowrap" as const }}>{biggestGap.value.toFixed(1)}/10</span>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                {/* Left: 7 communication dimensions */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 14 }}>
                    Communication Dimensions
                  </div>
                  {dimensionStats.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
                      {[...dimensionStats].sort((a, b) => a.avg - b.avg).map((dim) => {
                        const cp = coachingProfile?.dimensionProfile.find(d => d.key === dim.key);
                        const isGap = dim.avg < 5.5;
                        const isStrength = dim.avg >= 7.5;
                        const isPersistentGap = cp?.classification === "persistent_gap";
                        const isPersistentStrength = cp?.classification === "persistent_strength";
                        const trend = cp?.trend;
                        const color = isPersistentGap ? "#EF4444" : isStrength ? "#10B981" : isGap ? "#F59E0B" : "var(--accent)";
                        return (
                          <div key={dim.key}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{dim.label}</span>
                                {trend === "improving" && <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>↑</span>}
                                {trend === "declining" && <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 700 }}>↓</span>}
                                {isPersistentGap && (
                                  <span style={{ fontSize: 9, fontWeight: 700, color: "#EF4444", letterSpacing: 0.3, background: "rgba(239,68,68,0.10)", padding: "1px 5px", borderRadius: 3 }}>
                                    PERSISTENT
                                  </span>
                                )}
                                {isPersistentStrength && (
                                  <span style={{ fontSize: 9, fontWeight: 700, color: "#10B981", letterSpacing: 0.3, background: "rgba(16,185,129,0.10)", padding: "1px 5px", borderRadius: 3 }}>
                                    CONSISTENT
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 700, color, marginLeft: 8 }}>{dim.avg.toFixed(1)}</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden", marginBottom: 4 }}>
                              <div style={{ width: `${Math.min(100, Math.round(dim.avg * 10))}%`, height: "100%", background: color, borderRadius: 99, transition: "width 400ms ease" }} />
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                              {isStrength ? dim.coaching.strength : dim.coaching.gap}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                        Dimension scores appear after your first few practice sessions.
                      </div>
                      <a href="/practice" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-sm)", background: "var(--accent-soft)", color: "var(--accent)", fontWeight: 600, fontSize: 12, textDecoration: "none", width: "fit-content" }}>
                        Record your first answer →
                      </a>
                    </div>
                  )}
                </div>

                {/* Right: delivery + STAR */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 14 }}>
                    Delivery Signals
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
                    {[
                      {
                        label: "Speaking Pace",
                        value: overview.avgPace === null ? null : `${Math.round(overview.avgPace)} wpm`,
                        coaching: paceCoaching(overview.avgPace),
                        score: overview.avgPace !== null ? (overview.avgPace >= 115 && overview.avgPace <= 145 ? 9 : overview.avgPace > 165 || overview.avgPace < 100 ? 4 : 6) : null,
                        trend: coachingProfile?.deliveryProfile.wpmTrend,
                      },
                      {
                        label: "Filler Words",
                        value: overview.avgFillers === null ? null : `${overview.avgFillers}/100w`,
                        coaching: fillerCoaching(overview.avgFillers),
                        score: overview.avgFillers !== null ? (overview.avgFillers <= 1.5 ? 9 : overview.avgFillers < 3 ? 6 : 4) : null,
                        trend: coachingProfile?.deliveryProfile.fillerTrend,
                      },
                      {
                        label: "Vocal Variety",
                        value: overview.avgMonotone === null ? null : `${overview.avgMonotone?.toFixed(1)}/10 risk`,
                        coaching: monotoneCoaching(overview.avgMonotone),
                        score: overview.avgMonotone !== null ? (overview.avgMonotone <= 4 ? 9 : overview.avgMonotone <= 6 ? 6 : 4) : null,
                        trend: null,
                      },
                      {
                        label: "Vocal Energy",
                        value: overview.avgEnergyVar === null ? null : `${overview.avgEnergyVar?.toFixed(1)}/10`,
                        coaching: energyVarCoaching(overview.avgEnergyVar),
                        score: overview.avgEnergyVar !== null ? (overview.avgEnergyVar >= 6.5 ? 9 : overview.avgEnergyVar >= 4.5 ? 6 : 4) : null,
                        trend: null,
                      },
                      {
                        label: "Tempo Dynamics",
                        value: overview.avgTempoDyn === null ? null : `${overview.avgTempoDyn?.toFixed(1)}/10`,
                        coaching: tempoDynCoaching(overview.avgTempoDyn),
                        score: overview.avgTempoDyn !== null ? (overview.avgTempoDyn >= 6.5 ? 9 : overview.avgTempoDyn >= 4.5 ? 6 : 4) : null,
                        trend: null,
                      },
                    ].map(({ label, value, coaching, score, trend }) => {
                      if (value === null) return null;
                      const color = score === null ? "var(--text-muted)" : score >= 8 ? "#10B981" : score >= 6 ? "var(--accent)" : "#EF4444";
                      return (
                        <div key={label}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
                              {trend === "improving" && <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>↑</span>}
                              {trend === "declining" && <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 700 }}>↓</span>}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{coaching}</div>
                        </div>
                      );
                    })}
                    {overview.avgPace === null && overview.avgFillers === null && (
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                          Delivery signals appear after spoken attempts — pace, filler rate, and vocal variety.
                        </div>
                        <a href="/practice" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: "var(--radius-sm)", background: "var(--accent-soft)", color: "var(--accent)", fontWeight: 600, fontSize: 12, textDecoration: "none", width: "fit-content" }}>
                          Record a spoken answer →
                        </a>
                      </div>
                    )}

                    {/* Webcam / facial signals */}
                    {overview.hasWebcamData && (
                      <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--card-border-soft)" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 14 }}>
                          On-Camera Presence
                        </div>
                        {[
                          {
                            label: "Eye Contact",
                            value: overview.avgEyeContact === null ? null : `${overview.avgEyeContact}%`,
                            coaching: eyeContactCoaching(overview.avgEyeContact),
                            score: overview.avgEyeContact !== null ? (overview.avgEyeContact >= 70 ? 9 : overview.avgEyeContact >= 50 ? 6 : 4) : null,
                          },
                          {
                            label: "Look-Away Rate",
                            value: overview.avgLookAwayRate === null ? null : `${overview.avgLookAwayRate}%`,
                            coaching: lookAwayCoaching(overview.avgLookAwayRate),
                            score: overview.avgLookAwayRate !== null ? (overview.avgLookAwayRate <= 8 ? 9 : overview.avgLookAwayRate <= 18 ? 6 : 4) : null,
                          },
                          {
                            label: "Expressiveness",
                            value: overview.avgExpressiveness === null ? null : `${overview.avgExpressiveness}%`,
                            coaching: expressivenessCoaching(overview.avgExpressiveness),
                            score: overview.avgExpressiveness !== null ? (overview.avgExpressiveness >= 65 ? 9 : overview.avgExpressiveness >= 45 ? 6 : 4) : null,
                          },
                          {
                            label: "Smile Rate",
                            value: overview.avgSmileRate === null ? null : `${overview.avgSmileRate}%`,
                            coaching: smileRateCoaching(overview.avgSmileRate),
                            score: overview.avgSmileRate !== null ? (overview.avgSmileRate >= 30 ? 9 : overview.avgSmileRate >= 12 ? 6 : 4) : null,
                          },
                          {
                            label: "Brow Engagement",
                            value: overview.avgBrowEngagement === null ? null : `${overview.avgBrowEngagement}%`,
                            coaching: browEngagementCoaching(overview.avgBrowEngagement),
                            score: overview.avgBrowEngagement !== null ? (overview.avgBrowEngagement >= 40 ? 9 : overview.avgBrowEngagement >= 22 ? 6 : 4) : null,
                          },
                          {
                            label: "Blink Rate",
                            value: overview.avgBlinkRate === null ? null : `${overview.avgBlinkRate}/min`,
                            coaching: blinkRateCoaching(overview.avgBlinkRate),
                            score: overview.avgBlinkRate !== null ? (overview.avgBlinkRate >= 12 && overview.avgBlinkRate <= 20 ? 9 : overview.avgBlinkRate <= 28 ? 6 : 4) : null,
                          },
                          {
                            label: "Head Stability",
                            value: overview.avgHeadStability === null ? null : `${overview.avgHeadStability}%`,
                            coaching: headStabilityCoaching(overview.avgHeadStability),
                            score: overview.avgHeadStability !== null ? (overview.avgHeadStability >= 75 ? 9 : overview.avgHeadStability >= 55 ? 6 : 4) : null,
                          },
                        ].map(({ label, value, coaching, score }) => {
                          if (value === null) return null;
                          const color = score === null ? "var(--text-muted)" : score >= 8 ? "#10B981" : score >= 6 ? "var(--accent)" : "#EF4444";
                          return (
                            <div key={label} style={{ marginBottom: 14 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{coaching}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* STAR component breakdown */}
                  {coachingProfile && coachingProfile.starPattern.behavioralAttemptCount >= 3 && (
                    <div style={{ marginTop: 24 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 14 }}>
                        STAR Components ({coachingProfile.starPattern.behavioralAttemptCount} behavioral)
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                        {([
                          { label: "Situation", value: coachingProfile.starPattern.avgSituation },
                          { label: "Task", value: coachingProfile.starPattern.avgTask },
                          { label: "Action", value: coachingProfile.starPattern.avgAction },
                          { label: "Result", value: coachingProfile.starPattern.avgResult },
                        ] as Array<{ label: string; value: number | null }>).filter(c => c.value !== null).map(({ label, value }) => {
                          const v = value as number;
                          const isWeakest = label.toLowerCase() === coachingProfile.starPattern.weakestComponent;
                          const barColor = isWeakest ? "#EF4444" : v >= 7.5 ? "#10B981" : "var(--accent)";
                          return (
                            <div key={label}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                                <span style={{ fontSize: 12, fontWeight: isWeakest ? 700 : 500, color: isWeakest ? "#EF4444" : "var(--text-primary)" }}>
                                  {label}{isWeakest ? " — weakest" : ""}
                                </span>
                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{v.toFixed(1)}/10</span>
                              </div>
                              <div style={{ height: 5, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                                <div style={{ width: `${Math.round(v * 10)}%`, height: "100%", background: barColor, borderRadius: 99 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </PremiumCard>

            {/* ── WHAT YOU DO WELL + RESOLVED ────────────────────────────────────── */}
            {coachingProfile && (
              coachingProfile.strengthPatterns.filter(p => p.consistent && p.allTimeFrequency >= 0.3).length > 0 ||
              coachingProfile.resolvedWeaknesses.length > 0
            ) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <PremiumCard>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>What You Do Consistently</div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                    {coachingProfile!.strengthPatterns
                      .filter(p => p.consistent && p.allTimeFrequency >= 0.3)
                      .slice(0, 5)
                      .map((p) => {
                        const pct = Math.round(p.allTimeFrequency * 100);
                        return (
                          <div key={p.key}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", textTransform: "capitalize" as const }}>
                                {p.key.replace(/_/g, " ")}
                              </span>
                              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{pct}% of sessions</span>
                            </div>
                            <div style={{ height: 5, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: "#10B981", borderRadius: 99 }} />
                            </div>
                          </div>
                        );
                      })}
                    {coachingProfile!.strengthPatterns.filter(p => p.consistent && p.allTimeFrequency >= 0.3).length === 0 && (
                      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                        Consistent strengths appear after 5+ sessions.
                      </div>
                    )}
                  </div>
                </PremiumCard>
                <PremiumCard>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#10B981", marginBottom: 6 }}>Progress Made</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.6 }}>
                    Issues that were flagged repeatedly and are no longer appearing in recent sessions.
                  </div>
                  {coachingProfile!.resolvedWeaknesses.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                      {coachingProfile!.resolvedWeaknesses.map((key) => (
                        <div key={key} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 12px", borderRadius: "var(--radius-sm)",
                          background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.20)",
                        }}>
                          <span style={{ color: "#10B981", fontWeight: 700, fontSize: 14 }}>✓</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#10B981", textTransform: "capitalize" as const }}>
                            {key.replace(/_/g, " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                      Resolved issues appear once you clear a pattern that was previously flagged in multiple sessions.
                    </div>
                  )}
                </PremiumCard>
              </div>
            )}

            {/* ── PROGRESS ARC ─────────────────────────────────────────────────────── */}
            {recentScoreSeries.length >= 2 && (
              <PremiumCard>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "start" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Score Trajectory</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12, maxWidth: 380 }}>
                      {coachingProfile?.overallTrajectory.trend === "improving"
                        ? `Trending up. Your recent average is ${(coachingProfile.overallTrajectory.recentAvg ?? 0).toFixed(0)} vs. your all-time average of ${(coachingProfile.overallTrajectory.allTimeAvg ?? 0).toFixed(0)}.`
                        : coachingProfile?.overallTrajectory.trend === "declining"
                        ? "Recent scores are trending down. Review your priorities above and focus on one thing per session."
                        : "Your performance is stable. Pick the top priority above and target it specifically to break the plateau."}
                    </div>
                    <MiniSparkline values={recentScoreSeries} height={56} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 14, minWidth: 100 }}>
                    {[
                      { label: "All-time avg", value: overview.avgOverall === null ? "—" : displayOverall100(overview.avgOverall) },
                      { label: "Recent avg", value: coachingProfile?.overallTrajectory.recentAvg == null ? "—" : displayOverall100(coachingProfile.overallTrajectory.recentAvg) },
                      { label: "Peak", value: coachingProfile?.overallTrajectory.peakScore == null ? "—" : displayOverall100(coachingProfile.overallTrajectory.peakScore) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-muted)", textTransform: "uppercase" as const }}>{label}</div>
                        <div style={{ fontSize: 19, fontWeight: 800, color: "var(--text-primary)", marginTop: 1 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </PremiumCard>
            )}

            {/* ── ROLE READINESS ─────────────────────────────────────────────────── */}
            {roleAptitudeStats.length > 0 && (
              <PremiumCard>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Role Readiness</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                  Your interview performance benchmarked against each target role.
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {roleAptitudeStats.slice(0, 4).map((row) => (
                    <div key={row.key} style={{
                      padding: "14px 16px", borderRadius: "var(--radius-md)",
                      border: "1px solid var(--card-border-soft)", background: "var(--card-bg)",
                      display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{row.label}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                          {[row.company, row.roleType].filter(Boolean).join(" · ") || "Target role"} · {row.count} session{row.count !== 1 ? "s" : ""}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>{row.narrative}</div>
                      </div>
                      <div style={{ textAlign: "center" as const, minWidth: 82 }}>
                        <div style={{
                          padding: "6px 14px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 700,
                          background: (row.fitScore ?? 0) >= 7 ? "rgba(16,185,129,0.12)" : (row.fitScore ?? 0) >= 6 ? "rgba(37,99,235,0.10)" : "rgba(239,68,68,0.08)",
                          color: (row.fitScore ?? 0) >= 7 ? "#10B981" : (row.fitScore ?? 0) >= 6 ? "var(--accent)" : "#EF4444",
                          border: `1px solid ${(row.fitScore ?? 0) >= 7 ? "rgba(16,185,129,0.25)" : (row.fitScore ?? 0) >= 6 ? "rgba(37,99,235,0.20)" : "rgba(239,68,68,0.20)"}`,
                          marginBottom: 4, whiteSpace: "nowrap" as const,
                        }}>
                          {row.fitLabel}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{row.fitScore === null ? "—" : displayTenPointAs100(row.fitScore)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </PremiumCard>
            )}

            {/* ── PRE-INTERVIEW BRIEF ──────────────────────────────────────────────── */}
            {history.length > 0 && (
              <InterviewNotesCard
                strengths={interviewNotes.leanInto}
                watchouts={interviewNotes.watchouts}
                reminders={interviewNotes.reminders}
              />
            )}

            {/* ── NACE (university only) ─────────────────────────────────────────── */}
            {isUniversity && (() => {
              const scored = naceScores.filter((s) => s.score !== null);
              return (
                <PremiumCard>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>NACE Career Readiness</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, maxWidth: 500, lineHeight: 1.6 }}>
                        The 8 competencies employers look for in new graduates, scored from your practice sessions.
                      </div>
                    </div>
                    {scored.length > 0 && (
                      <button
                        onClick={() => downloadNacePdf({ scores: naceScores, studentName: session?.user?.name ?? session?.user?.email ?? "Student" })}
                        style={{ padding: "7px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--accent)", background: "transparent", color: "var(--accent)", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" as const }}
                      >
                        Export PDF
                      </button>
                    )}
                  </div>
                  {scored.length > 0 && (
                    <div className="ipc-grid-4" style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                      {scored.map((s) => (
                        <div key={s.key} style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)", textAlign: "center" as const }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: s.score !== null && s.score >= 65 ? "#10B981" : "#F59E0B" }}>{s.score}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginTop: 3 }}>{s.shortLabel}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <NaceScoreCard scores={naceScores} />
                </PremiumCard>
              );
            })()}
          </>
        )}

        </>)}
      </div>
    </PremiumShell>
  );
}
