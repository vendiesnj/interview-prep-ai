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
  } | null;

  inputMethod?: "spoken" | "pasted";
};

type InsightsTab = "overview" | "performance" | "delivery" | "notes" | "nace" | "visual" | "resume";
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
  avgStarResult: number | null;
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
    {
      key: "closing",
      score:
        input.avgStarResult === null
          ? -1
          : input.avgStarResult <= 6
          ? 9
          : input.avgStarResult <= 7
          ? 5
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

  const strongestDimension = useMemo(() => {
    const candidates = [
      { label: "Communication", value: overview.avgComm },
      { label: "Confidence", value: overview.avgConf },
      { label: "Closing Impact", value: overview.avgStarResult },
    ].filter((x) => x.value !== null) as Array<{ label: string; value: number }>;

    return candidates.sort((a, b) => b.value - a.value)[0] ?? null;
  }, [overview]);

  const recentScoreSeries = useMemo(() => {
    return attemptsOldestFirst
      .map(getAttemptScore)
      .filter((v): v is number => v !== null)
      .slice(-10);
  }, [attemptsOldestFirst]);

  const biggestGap = useMemo(() => {
    const candidates = [
      { label: "Communication", value: overview.avgComm },
      { label: "Confidence", value: overview.avgConf },
      { label: "Closing Impact", value: overview.avgStarResult },
    ].filter((x) => x.value !== null) as Array<{ label: string; value: number }>;

    return candidates.sort((a, b) => a.value - b.value)[0] ?? null;
  }, [overview]);

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
      avgStarResult: overview.avgStarResult,
    });

    if (primaryPriority === "closing") {
      reminders.push("Your main focus is ending stronger: decide your final result sentence before you start speaking.");
    }
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

  return (
    <PremiumShell
      title="Insights"
      subtitle="See performance patterns across question types, job profiles, and speaking delivery."
    >
      <div style={{ display: "grid", gap: 18 }}>
        {loadState === "hydrating" ? (
          <PremiumCard>
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  height: 14,
                  width: "28%",
                  borderRadius: 999,
                  background: "var(--card-border-soft)",
                }}
              />
              <div
                style={{
                  height: 18,
                  width: "52%",
                  borderRadius: 999,
                  background: "var(--card-border-soft)",
                }}
              />
              <div
                style={{
                  height: 96,
                  width: "100%",
                  borderRadius: "var(--radius-md)",
                  background: "var(--card-border-soft)",
                }}
              />
            </div>
          </PremiumCard>
        ) : history.length === 0 ? (
          <PremiumCard>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
              No insights yet
            </div>
            <div
              style={{
                marginTop: 10,
                color: "var(--text-muted)",
                lineHeight: 1.7,
                fontSize: 14,
              }}
            >
              Complete a few interview attempts to unlock trends, strengths, weaknesses, role-based performance, and pre-interview notes.
            </div>
          </PremiumCard>
        ) : (
          <>
            <PremiumCard>
              <SectionTitle
                eyebrow="Executive Summary"
                title="Your interview performance at a glance"
                subtitle="A quick read on where you are strong, where you are leaking points, and how your recent attempts are moving."
              />

              <div
                style={{
                  marginTop: 18,
                  padding: 16,
                  borderRadius: "var(--radius-lg)",
                  background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 14,
                    alignItems: "stretch",
                  }}
                >
                  <BigMetricCard
                    label="Avg Overall"
                    value={overview.avgOverall === null ? " - " : displayOverall100(overview.avgOverall)}
                    subtext={
                      percentiles.overall !== null
                        ? `Top ${100 - percentiles.overall}% of candidates`
                        : scoreLabel(overview.avgOverall)
                    }
                  />

                  <BigMetricCard
                    label="Total Attempts"
                    value={overview.totalAttempts}
                    subtext="All saved sessions"
                  />

                  <BigMetricCard
                    label="Top Strength"
                    value={strongestDimension?.label ?? " - "}
                    subtext={
                      strongestDimension?.value !== null && strongestDimension?.value !== undefined
                        ? `${displayTenPointAs100(strongestDimension.value)} average`
                        : "Build more attempt history"
                    }
                  />

                  <BigMetricCard
                    label="Biggest Gap"
                    value={biggestGap?.label ?? " - "}
                    subtext={
                      biggestGap?.value !== null && biggestGap?.value !== undefined
                        ? `${displayTenPointAs100(biggestGap.value)} average`
                        : "Build more attempt history"
                    }
                  />

                  <BigMetricCard
                    label="Top Category"
                    value={overview.topCategory ? titleCaseLabel(overview.topCategory) : " - "}
                    subtext="Most-practiced question type"
                  />

                  <BigMetricCard
                    label="Recent Trend"
                    value={
                      <span style={{ color: trendColor(trendSummary.overallDelta) }}>
                        {formatDelta(trendSummary.overallDelta)}
                      </span>
                    }
                    subtext="Overall change across last 5 attempts"
                  />
                </div>
              </div>
            </PremiumCard>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: -2,
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
              <InsightsTabButton
                label="Overview"
                active={activeTab === "overview"}
                onClick={() => setActiveTab("overview")}
              />
              <InsightsTabButton
                label="Performance"
                active={activeTab === "performance"}
                onClick={() => setActiveTab("performance")}
              />
              <InsightsTabButton
                label="Delivery"
                active={activeTab === "delivery"}
                onClick={() => setActiveTab("delivery")}
              />
              <InsightsTabButton
                label="Visual"
                active={activeTab === "visual"}
                onClick={() => setActiveTab("visual")}
              />
              <InsightsTabButton
                label="Resume"
                active={activeTab === "resume"}
                onClick={() => setActiveTab("resume")}
              />
              <InsightsTabButton
                label="Interview Notes"
                active={activeTab === "notes"}
                onClick={() => setActiveTab("notes")}
              />
              {isUniversity && (
                <InsightsTabButton
                  label="NACE Competencies"
                  active={activeTab === "nace"}
                  onClick={() => setActiveTab("nace")}
                />
              )}
            </div>

            {activeTab === "overview" && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 14,
                    alignItems: "stretch",
                  }}
                >
                  <PremiumCard>
                    <SectionTitle
                      eyebrow="Score Story"
                      title="What’s helping your score"
                      subtitle="The strongest patterns showing up across your recent attempts."
                    />

                    <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                      <div
                        style={{
                          padding: 16,
                          borderRadius: "var(--radius-md)",
                          background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-muted)" }}>
                          Strongest category
                        </div>
                        <div style={{ marginTop: 10, fontSize: 15, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.6 }}>
                          {strongestCategory?.label
                            ? `${strongestCategory.label} is currently your best-performing question type (${displayOverall100(strongestCategory.avgScore)} average).`
                            : "Your strongest category will appear once more attempt variety is saved."}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 16,
                          borderRadius: "var(--radius-md)",
                          background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-muted)" }}>
                          Strongest dimension
                        </div>
                        <div style={{ marginTop: 10, fontSize: 15, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.6 }}>
                          {strongestDimension?.label && strongestDimension?.value !== null
                            ? `${strongestDimension.label} is your strongest scoring dimension (${displayTenPointAs100(strongestDimension.value)} average).`
                            : "Your strongest dimension will appear as more scored attempts are saved."}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 16,
                          borderRadius: "var(--radius-md)",
                          background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-muted)" }}>
                          Interview presence
                        </div>
                        <div style={{ marginTop: 10, fontSize: 15, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.6 }}>
                          {overview.avgPace !== null && overview.avgPace >= 115 && overview.avgPace <= 145
                            ? `Your pacing is in a strong interview range (${Math.round(overview.avgPace)} WPM), which helps answers sound controlled.`
                            : overview.avgFillers !== null && overview.avgFillers <= 1.5
                            ? `Your filler usage is controlled (${overview.avgFillers}/100 words), which helps you sound more polished.`
                            : "Your strongest delivery pattern will become clearer with more spoken attempts."}
                        </div>
                      </div>
                    </div>
                  </PremiumCard>

                  <PremiumCard>
                    <SectionTitle
                      eyebrow="Next Lever"
                      title="What to fix next"
                      subtitle="The one adjustment most likely to move your score."
                    />

                    <div
                      style={{
                        marginTop: 16,
                        padding: 18,
                        borderRadius: "var(--radius-lg)",
                        background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
                        display: "grid",
                        gap: 14,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-muted)" }}>
                          Priority
                        </div>
                        <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.35 }}>
                          {nextFocusCard.title}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 14,
                          color: "var(--text-primary)",
                          lineHeight: 1.75,
                        }}
                      >
                        {nextFocusCard.body}
                      </div>

                      <div
                        style={{
                          padding: 14,
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--accent-strong)",
                          background: "rgba(99,102,241,0.08)",
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, color: "var(--text-muted)" }}>
                          Next Attempt
                        </div>
                        <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.65 }}>
                          {nextFocusCard.action}
                        </div>
                      </div>
                    </div>
                  </PremiumCard>
                </div>

                <PremiumCard>
                  <SectionTitle
                    eyebrow="Momentum"
                    title="Recent momentum"
                    subtitle="How your recent attempts are moving, and what you practice most."
                  />

                  <div
                    style={{
                      marginTop: 16,
                      display: "grid",
                      gridTemplateColumns: "0.95fr 1.05fr",
                      gap: 18,
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <MiniSparkline values={recentScoreSeries} />
                    </div>

                    <div
                      style={{
                        padding: 16,
                        borderRadius: "var(--radius-md)",
                        background: "var(--card-bg)",
                      }}
                    >
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 18,
                          lineHeight: 1.8,
                          color: "var(--text-primary)",
                        }}
                      >
                        {recentInsights.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                        {improvements.slice(0, 1).map((item, i) => (
                          <li key={`improvement-${i}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </PremiumCard>
              </>
            )}

            {activeTab === "performance" && (
              <>
                <PremiumCard>
                  <SectionTitle
                    eyebrow="Role Aptitude"
                    title="How your strengths fit your target roles"
                    subtitle="This compares your current interview patterns to the kinds of strengths each role tends to reward."
                  />

                  <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                    {roleAptitudeStats.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        Role-fit insights will appear after attempts are saved with a selected job profile.
                      </div>
                    ) : (
                      roleAptitudeStats.map((row) => (
                        <div
                          key={row.key}
                          style={{
                            padding: 16,
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--card-border-soft)",
                            background: "var(--card-bg)",
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
                            <div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                                {row.label}
                              </div>
                              <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
                                {[row.company, row.roleType].filter(Boolean).join(" · ") || "Target role"}
                              </div>
                            </div>

                            <div
                              style={{
                                padding: "6px 10px",
                                borderRadius: 999,
                                border: "none",
                                background: "var(--card-bg-strong)",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text-primary)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.fitLabel} · {row.fitScore === null ? " - " : displayTenPointAs100(row.fitScore)}
                            </div>
                          </div>

                          <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7 }}>
                            {row.narrative}
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                border: "1px solid var(--card-border-soft)",
                                background: "var(--card-bg-strong)",
                              }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-muted)" }}>
                                Overall
                              </div>
                              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                                {row.avgScore === null ? " - " : displayOverall100(row.avgScore)}
                              </div>
                            </div>

                            <div
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                border: "1px solid var(--card-border-soft)",
                                background: "var(--card-bg-strong)",
                              }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-muted)" }}>
                                Best Match
                              </div>
                              <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.5 }}>
                                {row.matched[0] ?? "Still emerging"}
                              </div>
                            </div>

                            <div
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                border: "1px solid var(--card-border-soft)",
                                background: "var(--card-bg-strong)",
                              }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: "var(--text-muted)" }}>
                                Main Gap
                              </div>
                              <div style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.5 }}>
                                {row.gaps[0] ?? "No major gap flagged"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </PremiumCard>

                <PremiumCard>
                  <SectionTitle
                    eyebrow="Question Types"
                    title="Performance by question category"
                    subtitle="See where you score best across behavioral, technical, role-specific, and custom questions."
                  />

                  <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                    {categoryStats.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        Category data will appear after new categorized attempts are saved.
                      </div>
                    ) : (
                      categoryStats.map((row) => (
                        <div
                          key={row.key}
                          style={{
                            padding: 14,
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--card-border)",
                            background: "var(--card-bg)",
                            display: "grid",
                            gap: 10,
                          }}
                        >
                          <ScoreBarRow
                            label={row.label}
                            count={row.count}
                            avgScore={row.avgScore}
                            subtitle={
                              row.avgComm !== null && row.avgConf !== null
                                ? `Comm ${displayTenPointAs100(row.avgComm)} · Conf ${displayTenPointAs100(row.avgConf)}`
                                : undefined
                            }
                          />

                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--text-muted)",
                              lineHeight: 1.6,
                              paddingLeft: 2,
                            }}
                          >
                            {interpretCategoryRow(row)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </PremiumCard>

                <PremiumCard>
                  <SectionTitle
                    eyebrow="Frameworks"
                    title="Performance by evaluation framework"
                    subtitle="Understand whether you perform best in behavioral stories, technical explanations, or experience-depth questions."
                  />

                  <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                    {frameworkStats.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        Framework data will appear after new attempts are saved.
                      </div>
                    ) : (
                      frameworkStats.map((row) => (
                        <div
                          key={row.key}
                          style={{
                            padding: 14,
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--card-border)",
                            background: "var(--card-bg)",
                            display: "grid",
                            gap: 10,
                          }}
                        >
                          <ScoreBarRow
                            label={row.label}
                            count={row.count}
                            avgScore={row.avgScore}
                            subtitle={
                              row.avgComm !== null && row.avgConf !== null
                                ? `Comm ${displayTenPointAs100(row.avgComm)} · Conf ${displayTenPointAs100(row.avgConf)}`
                                : undefined
                            }
                          />

                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--text-muted)",
                              lineHeight: 1.6,
                              paddingLeft: 2,
                            }}
                          >
                            {interpretFrameworkRow(row)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </PremiumCard>

                <PremiumCard>
                  <SectionTitle
                    eyebrow="Target Roles"
                    title="Performance by job profile"
                    subtitle="Compare how you interview across the roles you are actively targeting."
                  />

                  <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                    {profileStats.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        Job-profile insights will appear after attempts are saved with a selected profile.
                      </div>
                    ) : (
                      roleAptitudeStats.map((row) => (
                        <div
                          key={row.key}
                          style={{
                            padding: 14,
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--card-border)",
                            background: "var(--card-bg)",
                            display: "grid",
                            gap: 10,
                          }}
                        >
                          <ScoreBarRow
                            label={row.label}
                            count={row.count}
                            avgScore={row.avgScore}
                            subtitle={[row.company, row.roleType].filter(Boolean).join(" · ") || undefined}
                          />

                          <div
                            style={{
                              fontSize: 13,
                              color: "var(--text-muted)",
                              lineHeight: 1.6,
                              paddingLeft: 2,
                            }}
                          >
                            {row.narrative}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </PremiumCard>
              </>
            )}

            {activeTab === "delivery" && (
              <PremiumCard>
                <SectionTitle
                  eyebrow="Delivery"
                  title="Speaking delivery intelligence"
                  subtitle="This turns your acoustic signals into practical coaching themes you can actually use."
                />

                <div
                  style={{
                    marginTop: 18,
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 14,
                  }}
                >
                  <BigMetricCard
                    label="Pace"
                    value={overview.avgPace === null ? " - " : `${Math.round(overview.avgPace)} WPM`}
                    subtext={overview.avgPace === null ? "Average spoken pace" : `${paceLabel(overview.avgPace)} pace`}
                  />

                  <BigMetricCard
                    label="Fillers"
                    value={overview.avgFillers === null ? " - " : `${overview.avgFillers}/100`}
                    subtext="Average filler rate"
                  />

                  <BigMetricCard
                    label="Monotone Risk"
                    value={overview.avgMonotone === null ? " - " : `${overview.avgMonotone.toFixed(1)}/10`}
                    subtext="Lower is generally better"
                  />

                  <BigMetricCard
                    label="Closing Impact"
                    value={overview.avgStarResult === null ? " - " : displayTenPointAs100(overview.avgStarResult)}
                    subtext="Average STAR result quality"
                  />
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: "grid",
                    gridTemplateColumns: "1.2fr 0.9fr 0.9fr",
                    gap: 14,
                  }}
                >
                  <InsightListCard
                    title="What your delivery says"
                    items={[
                      paceCoaching(overview.avgPace),
                      fillerCoaching(overview.avgFillers),
                      monotoneCoaching(overview.avgMonotone),
                      resultCoaching(overview.avgStarResult),
                    ]}
                  />

                  <InsightListCard
                    title="Most important next fix"
                    items={[
                      getPrimaryDeliveryPriority({
                        avgPace: overview.avgPace,
                        avgFillers: overview.avgFillers,
                        avgMonotone: overview.avgMonotone,
                        avgStarResult: overview.avgStarResult,
                      }) === "closing"
                        ? "For the next few attempts, focus on ending with one explicit outcome sentence."
                        : getPrimaryDeliveryPriority({
                            avgPace: overview.avgPace,
                            avgFillers: overview.avgFillers,
                            avgMonotone: overview.avgMonotone,
                            avgStarResult: overview.avgStarResult,
                          }) === "fillers"
                        ? "Your biggest delivery win is reducing filler words. Let short silence do the work."
                        : getPrimaryDeliveryPriority({
                            avgPace: overview.avgPace,
                            avgFillers: overview.avgFillers,
                            avgMonotone: overview.avgMonotone,
                            avgStarResult: overview.avgStarResult,
                          }) === "pace"
                        ? "Your biggest delivery win is controlling tempo. Slow slightly after important points."
                        : getPrimaryDeliveryPriority({
                            avgPace: overview.avgPace,
                            avgFillers: overview.avgFillers,
                            avgMonotone: overview.avgMonotone,
                            avgStarResult: overview.avgStarResult,
                          }) === "monotone"
                        ? "Your biggest delivery win is emphasis. Make the result sound different from the setup."
                        : "Keep building spoken reps so the system can identify a stronger delivery priority.",
                      "Do not try to fix everything at once - one clear adjustment is enough for the next attempt.",
                    ]}
                  />

                  <InsightListCard
                    title="Before the interview"
                    items={[
                      "Say your first sentence out loud before you start so you enter with confidence.",
                      "Pause after metrics, numbers, and outcomes so the result lands.",
                      "Do one spoken rep right before the interview using your strongest question type.",
                    ]}
                  />
                </div>
              </PremiumCard>
            )}

            {activeTab === "notes" && (
              <InterviewNotesCard
                strengths={interviewNotes.leanInto}
                watchouts={interviewNotes.watchouts}
                reminders={interviewNotes.reminders}
              />
            )}

            {activeTab === "visual" && (() => {
              const facialSessions = history.filter((a: any) => a.deliveryMetrics?.face && typeof a.deliveryMetrics.face.eyeContact === "number");
              const vocalSessions  = history.filter((a: any) => a.deliveryMetrics && typeof a.deliveryMetrics.wpm === "number");
              const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null;
              const avgEye   = avg(facialSessions.map((a: any) => a.deliveryMetrics.face.eyeContact * 100));
              const avgExpr  = avg(facialSessions.map((a: any) => (a.deliveryMetrics.face.expressiveness ?? 0) * 100));
              const avgHead  = avg(facialSessions.map((a: any) => (a.deliveryMetrics.face.headStability ?? 0) * 100));
              const avgWpm   = avg(vocalSessions.map((a: any) => a.deliveryMetrics.wpm));
              const avgEnergy = avg(vocalSessions.map((a: any) => a.deliveryMetrics.energyVariation ?? 0));
              const avgPitch  = avg(vocalSessions.map((a: any) => a.deliveryMetrics.pitchStd ?? 0));
              const avgFiller = avg(vocalSessions.map((a: any) => a.deliveryMetrics.fillerCount ?? a.feedback?.filler?.total ?? 0));
              const scoreColor = (v: number | null, good: number) => v === null ? "var(--text-muted)" : v >= good ? "#10B981" : "#F59E0B";
              function MiniBar({ value, max, color }: { value: number | null; max: number; color: string }) {
                const pct = value !== null ? Math.min(100, Math.round((value / max) * 100)) : 0;
                return <div style={{ height: 5, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden", flex: 1 }}><div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.5s" }} /></div>;
              }
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {/* Vocal */}
                  <PremiumCard><div style={{ marginBottom: 14 }}><div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Vocal Delivery</div>{vocalSessions.length > 0 && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Averaged across {vocalSessions.length} sessions</div>}</div>
                    {vocalSessions.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "12px 0" }}>Complete a session to see vocal metrics.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {[
                          { label: "Speaking Pace", value: avgWpm !== null ? `${avgWpm} wpm` : "—", bar: avgWpm, max: 200, color: scoreColor(avgWpm, 120), hint: avgWpm && avgWpm >= 120 && avgWpm <= 160 ? "Ideal range" : avgWpm && avgWpm < 120 ? "A bit slow" : "A bit fast" },
                          { label: "Energy Variation", value: avgEnergy !== null ? `${avgEnergy}/10` : "—", bar: avgEnergy, max: 10, color: scoreColor(avgEnergy, 4), hint: avgEnergy && avgEnergy >= 4 ? "Good variety" : "Try varying your tone" },
                          { label: "Pitch Range", value: avgPitch !== null ? `${avgPitch} Hz` : "—", bar: avgPitch, max: 60, color: scoreColor(avgPitch, 20), hint: avgPitch && avgPitch >= 20 ? "Expressive range" : "Sounds flat" },
                          { label: "Filler Words", value: avgFiller !== null ? `${avgFiller}/session` : "—", bar: avgFiller !== null ? Math.max(0, 10 - avgFiller) : null, max: 10, color: avgFiller !== null && avgFiller <= 3 ? "#10B981" : "#EF4444", hint: avgFiller !== null && avgFiller <= 3 ? "Very clean" : "Work on fillers" },
                        ].map(row => (
                          <div key={row.label}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{row.label}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{row.hint}</span>
                                <span style={{ fontSize: 13, fontWeight: 900, color: row.color, minWidth: 56, textAlign: "right" }}>{row.value}</span>
                              </div>
                            </div>
                            <MiniBar value={row.bar} max={row.max} color={row.color} />
                          </div>
                        ))}
                      </div>
                    )}
                  </PremiumCard>
                  {/* Webcam */}
                  <PremiumCard><div style={{ marginBottom: 14 }}><div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Visual Delivery</div>{facialSessions.length > 0 && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Averaged across {facialSessions.length} webcam sessions</div>}</div>
                    {facialSessions.length === 0 ? (
                      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, padding: "8px 0" }}>
                        No webcam data yet. Enable your camera before recording to unlock eye contact, expressiveness, and head stability scores.
                        <br /><br />
                        <Link href="/practice" style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>Start a session →</Link>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {[
                          { label: "Eye Contact", value: avgEye !== null ? `${Math.round(avgEye)}%` : "—", bar: avgEye, max: 100, color: scoreColor(avgEye, 65), hint: avgEye && avgEye >= 65 ? "Strong" : "Look toward camera more" },
                          { label: "Expressiveness", value: avgExpr !== null ? `${Math.round(avgExpr)}%` : "—", bar: avgExpr, max: 100, color: scoreColor(avgExpr, 55), hint: avgExpr && avgExpr >= 55 ? "Engaging" : "Show more expression" },
                          { label: "Head Stability", value: avgHead !== null ? `${Math.round(avgHead)}%` : "—", bar: avgHead, max: 100, color: scoreColor(avgHead, 60), hint: avgHead && avgHead >= 60 ? "Steady" : "Reduce movement" },
                        ].map(row => (
                          <div key={row.label}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{row.label}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{row.hint}</span>
                                <span style={{ fontSize: 13, fontWeight: 900, color: row.color, minWidth: 42, textAlign: "right" }}>{row.value}</span>
                              </div>
                            </div>
                            <MiniBar value={row.bar} max={row.max} color={row.color} />
                          </div>
                        ))}
                      </div>
                    )}
                  </PremiumCard>
                </div>
              );
            })()}

            {activeTab === "resume" && (() => {
              const scoreColor = (s: number | null) => s === null ? "var(--text-muted)" : s >= 70 ? "#10B981" : s >= 45 ? "#F59E0B" : "#EF4444";
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                      Upload your resume to get an ATS score, keyword gap analysis, and prioritized action items.
                    </div>
                    <Link href="/resume-gap" style={{ padding: "8px 18px", borderRadius: 9, background: "var(--accent)", color: "#fff", fontWeight: 800, fontSize: 13, textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}>
                      {resumeHistory.length > 0 ? "Analyze again →" : "Analyze my resume →"}
                    </Link>
                  </div>
                  {resumeHistory.length === 0 ? (
                    <div style={{ padding: "32px 20px", textAlign: "center", borderRadius: 12, border: "1px dashed var(--card-border)", color: "var(--text-muted)", fontSize: 13 }}>
                      No resume analyses yet. Upload your resume to get started.
                    </div>
                  ) : (
                    resumeHistory.map((r: any, i: number) => {
                      const sc = scoreColor(r.overallScore);
                      return (
                        <Link key={r.id} href="/resume-gap" style={{ textDecoration: "none" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", borderRadius: 12, border: "1px solid var(--card-border)", background: i === 0 ? "var(--card-bg-strong)" : "var(--card-bg)", transition: "border-color 120ms" }}>
                            <div style={{ fontSize: 28, fontWeight: 900, color: sc, minWidth: 44, textAlign: "center", lineHeight: 1 }}>{r.overallScore ?? "—"}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>{r.overallLabel ?? "Resume Analysis"}</span>
                                {i === 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", padding: "1px 7px", borderRadius: 99 }}>Latest</span>}
                                {r.atsScore !== null && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>ATS: <strong>{r.atsScore}</strong></span>}
                              </div>
                              {r.topAction && <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Top action: {r.topAction}</div>}
                              {r.summary && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.summary}</div>}
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              );
            })()}

            {activeTab === "nace" && (() => {
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
              const scored = naceScores.filter((s) => s.score !== null);
              return (
                <div style={{ display: "grid", gap: 18 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
                        NACE Career Readiness Competencies
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 560 }}>
                        The National Association of Colleges and Employers (NACE) defines 8 competencies employers look for in new graduates.
                        Your scores are computed from your practice session data. Click any competency to see what data contributed.
                      </div>
                    </div>
                    {scored.length > 0 && (
                      <button
                        onClick={() =>
                          downloadNacePdf({
                            scores: naceScores,
                            studentName: session?.user?.name ?? session?.user?.email ?? "Student",
                          })
                        }
                        style={{
                          flexShrink: 0,
                          padding: "8px 16px",
                          borderRadius: 9,
                          border: "1px solid var(--accent)",
                          background: "transparent",
                          color: "var(--accent)",
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        ⬇ Export PDF
                      </button>
                    )}
                  </div>

                  {history.length === 0 ? (
                    <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                      Complete practice sessions to generate your NACE competency profile.
                    </div>
                  ) : (
                    <>
                      {scored.length > 0 && (
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(4, 1fr)",
                          gap: 10,
                        }}>
                          {naceScores.filter((s) => s.score !== null).map((s) => (
                            <div key={s.key} style={{
                              padding: "14px 16px",
                              borderRadius: 12,
                              border: "1px solid var(--card-border-soft)",
                              background: "var(--card-bg)",
                              textAlign: "center",
                            }}>
                              <div style={{ fontSize: 22, fontWeight: 900, color: s.score !== null && s.score >= 65 ? "#10B981" : "#F59E0B" }}>
                                {s.score}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginTop: 2 }}>{s.shortLabel}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <NaceScoreCard scores={naceScores} />
                    </>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </PremiumShell>
  );
}