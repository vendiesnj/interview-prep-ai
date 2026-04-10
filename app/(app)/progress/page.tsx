"use client";

import React, { useEffect, useMemo, useState } from "react";
import PremiumShell from "../../components/PremiumShell";
import PremiumCard from "../../components/PremiumCard";
import NaceScoreCard from "../../components/NaceScoreCard";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useIsUniversity } from "@/app/hooks/usePlan";
import { userScopedKey } from "@/app/lib/userStorage";
import { computeNaceProfile } from "@/app/lib/nace";
import { buildUserCoachingProfile } from "@/app/lib/feedback/coachingProfile";
import { downloadNacePdf } from "@/app/lib/nace-pdf";
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
] as const;

const DIM_LABELS: Record<string, string> = {
  narrative_clarity:    "Narrative Clarity",
  evidence_quality:     "Evidence Quality",
  ownership_agency:     "Ownership & Agency",
  vocal_engagement:     "Vocal Engagement",
  response_control:     "Response Control",
  cognitive_depth:      "Cognitive Depth",
  presence_confidence:  "Presence & Confidence",
};

const DIM_COACHING: Record<string, { strength: string; gap: string }> = {
  narrative_clarity:   { strength: "Your answers are well-structured. Keep anchoring each response with a clear headline first.", gap: "Answers lack a clear through-line. Start with the headline, then support it." },
  evidence_quality:    { strength: "You back claims with specifics and metrics. Keep quantifying outcomes.", gap: "Answers are too general. Add one measurable result to every response." },
  ownership_agency:    { strength: "You use strong I-language. Interviewers see you as the driver, not a bystander.", gap: "Use 'I' instead of 'we' when describing your own actions and decisions." },
  vocal_engagement:    { strength: "Your delivery has good energy and pace variation.", gap: "Delivery sounds flat or rushed. Vary your pace and lift slightly on the result." },
  response_control:    { strength: "Answers stay focused and controlled — no tangents.", gap: "Answers drift. Cut to the core point earlier and resist adding unrelated context." },
  cognitive_depth:     { strength: "You engage with tradeoffs and complexity well.", gap: "Answers stay surface-level. Add one sentence about a tradeoff, risk, or second-order effect." },
  presence_confidence: { strength: "You sound credible and assertive. Minimal hedging.", gap: "Hedging language softens your credibility. Cut 'I think' and 'I feel like' from answers." },
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
  return asTenPoint(n(a.prosody?.monotoneScore));
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
          borderRadius: 999,
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
          borderRadius: 12,
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
        borderRadius: 12,
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
        borderRadius: 10,
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

export default function ProgressPage() {
  const [history, setHistory] = useState<Attempt[]>([]);
  const [loadState, setLoadState] = useState<"hydrating" | "ready">("hydrating");
  const [resumeHistory, setResumeHistory] = useState<any[]>([]);
  const { data: session, status } = useSession();
  const HISTORY_KEY = userScopedKey("ipc_history", session);
  const [activeTab, setActiveTab] = useState<InsightsTab>("overview");
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
          }
          if (profRes.ok) {
            const prof = await profRes.json();
            if (!cancelled) setResumeHistory(prof?.resumeHistory ?? []);
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

  const attemptsNewestFirst = history;
  const attemptsOldestFirst = useMemo(() => [...history].reverse(), [history]);

  const overview = useMemo(() => {
    const overallVals = attemptsNewestFirst.map(getAttemptScore).filter((v): v is number => v !== null);
    const commVals = attemptsNewestFirst.map(getAttemptComm).filter((v): v is number => v !== null);
    const confVals = attemptsNewestFirst.map(getAttemptConf).filter((v): v is number => v !== null);
    const fillerVals = attemptsNewestFirst.map(getAttemptFillers).filter((v): v is number => v !== null);
    const paceVals = attemptsNewestFirst.map((a) => n(a.wpm)).filter((v): v is number => v !== null);
    const monotoneVals = attemptsNewestFirst.map(getAttemptMonotone).filter((v): v is number => v !== null);
    const resultVals = attemptsNewestFirst.map(getAttemptStarResult).filter((v): v is number => v !== null);

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

  const interviewNotes = useMemo(() => {
    const leanInto: string[] = [];
    const watchouts: string[] = [];
    const reminders: string[] = [];

    if (strongestDimension?.label === "Communication") {
      leanInto.push("Lead with the headline of your answer - clear framing is already one of your strengths.");
    }
    if (strongestDimension?.label === "Confidence") {
      leanInto.push("Use direct language and strong ownership - your tone carries authority when you trust your first sentence.");
    }
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
    if (biggestGap?.label === "Communication") {
      watchouts.push("Do not spend too long setting context. Get to your point earlier.");
    }
    if (biggestGap?.label === "Confidence") {
      watchouts.push("Do not soften strong examples with hedging language. Lead with more ownership.");
    }
    if (overview.avgMonotone !== null && overview.avgMonotone >= 6) {
      watchouts.push("Do not deliver key outcomes in the same flat tone as background detail.");
    }
    if (overview.avgPace !== null && overview.avgPace > 165) {
      watchouts.push("Do not rush your best points. Fast delivery can make strong content feel less controlled.");
    }
    if (overview.avgPace !== null && overview.avgPace < 100) {
      watchouts.push("Do not overbuild the setup. Slower pacing works best when your first sentence is concise.");
    }

    const primaryPriority = getPrimaryDeliveryPriority({
      avgPace: overview.avgPace,
      avgFillers: overview.avgFillers,
      avgMonotone: overview.avgMonotone,
    });

    if (primaryPriority === "fillers") {
      reminders.push("Your main focus is polish: pause briefly instead of filling silence.");
    }
    if (primaryPriority === "pace") {
      reminders.push("Your main focus is tempo: slow down slightly after metrics, decisions, and outcomes.");
    }
    if (primaryPriority === "monotone") {
      reminders.push("Your main focus is emphasis: lift your voice when you reach the result or takeaway.");
    }

    reminders.push("Open with the answer first, then support it with 2–3 details.");
    reminders.push("Make the final line sound finished - result, takeaway, or impact.");
    reminders.push("If you start rambling, shorten the sentence instead of adding more explanation.");

    if (watchouts.length === 0) {
      if (biggestGap?.label === "Closing Impact") {
        watchouts.push("Do not let solid answers fade at the end - your final sentence should clearly state the result.");
      } else if (biggestGap?.label === "Communication") {
        watchouts.push("Do not bury your best point in too much setup - get to the answer faster.");
      } else if (biggestGap?.label === "Confidence") {
        watchouts.push("Do not undersell good examples - stronger ownership will improve how credible you sound.");
      } else {
        watchouts.push("Do not try to improve everything at once - one focused adjustment will help more than five vague ones.");
      }
    }

    return {
      leanInto: leanInto.slice(0, 3),
      watchouts: watchouts.slice(0, 3),
      reminders: reminders.slice(0, 4),
    };
  }, [strongestDimension, strongestCategory, overview, biggestGap]);

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

  // ── Coaching Profile (full-history, all-signal) ───────────────────────────────
  const coachingProfile = useMemo(() => {
    if (history.length < 2) return null;
    return buildUserCoachingProfile(history);
  }, [history]);

  return (
    <PremiumShell title="Insights">
      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 6 }}>
        {loadState === "hydrating" ? (
          <PremiumCard>
            <div style={{ display: "grid", gap: 10 }}>
              {[28, 52, 100].map((w, i) => (
                <div key={i} style={{ height: i === 2 ? 96 : 14, width: `${w}%`, borderRadius: i === 2 ? "var(--radius-md)" : 999, background: "var(--card-border-soft)" }} />
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
                  <div style={{ fontSize: 54, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1 }}>
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
            <PremiumCard>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                {coachingProfile && coachingProfile.topPriorities.length > 0 ? "What to Work On" : "Next Focus"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                {coachingProfile && coachingProfile.topPriorities.length > 0
                  ? `Patterns identified across all ${coachingProfile.totalAttempts} sessions, ranked by how much fixing them will move your score.`
                  : "Your single highest-leverage improvement for the next session."}
              </div>

              {coachingProfile && coachingProfile.topPriorities.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {coachingProfile.topPriorities.map((p, i) => {
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
                      "Apply this focus deliberately in your next practice session.";
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
              ) : (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{nextFocusCard.title}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 12 }}>{nextFocusCard.body}</div>
                  <div style={{ padding: "11px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--accent-strong)", background: "var(--accent-soft)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-muted)", marginBottom: 4 }}>FOR YOUR NEXT ATTEMPT</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.6 }}>{nextFocusCard.action}</div>
                  </div>
                </>
              )}
            </PremiumCard>

            {/* ── FULL COMMUNICATION SCORECARD ────────────────────────────────────── */}
            <PremiumCard>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Communication Scorecard</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                Content, delivery, and presence — every signal in one view.
              </div>
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
                    <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                      Dimension scores unlock after your first few sessions.
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
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                        Delivery signals appear after spoken attempts.
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
                          padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700,
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
            <InterviewNotesCard
              strengths={interviewNotes.leanInto}
              watchouts={interviewNotes.watchouts}
              reminders={interviewNotes.reminders}
            />

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
                        style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--accent)", background: "transparent", color: "var(--accent)", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" as const }}
                      >
                        Export PDF
                      </button>
                    )}
                  </div>
                  {scored.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
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
      </div>
    </PremiumShell>
  );
}
