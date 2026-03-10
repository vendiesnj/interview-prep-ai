"use client";

import React, { useEffect, useMemo, useState } from "react";
import PremiumShell from "../../components/PremiumShell";
import PremiumCard from "../../components/PremiumCard";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";

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

  score?: number;
  communication_score?: number;
  confidence_score?: number;
  wpm?: number | null;

  prosody?: {
    monotoneScore?: number;
  } | null;

  feedback?: {
    score?: number;
    communication_score?: number;
    confidence_score?: number;
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

type InsightsTab = "overview" | "performance" | "delivery" | "notes";

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

function toPercentScore(score: number | null | undefined) {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  return Math.round(score * 10);
}

function titleCaseLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getAttemptScore(a: Attempt) {
  return n(a.score ?? a.feedback?.score);
}

function getAttemptComm(a: Attempt) {
  return n(a.communication_score ?? a.feedback?.communication_score);
}

function getAttemptConf(a: Attempt) {
  return n(a.confidence_score ?? a.feedback?.confidence_score);
}

function getAttemptFillers(a: Attempt) {
  return n(a.feedback?.filler?.per100);
}

function getAttemptMonotone(a: Attempt) {
  return n(a.prosody?.monotoneScore);
}

function getAttemptStarResult(a: Attempt) {
  return n(a.feedback?.star?.result);
}

function trendDirection(values: number[]) {
  if (values.length < 2) return 0;
  return values[values.length - 1] - values[0];
}

function scoreLabel(score: number | null) {
  if (score === null) return "—";
  if (score >= 8.5) return "Excellent";
  if (score >= 7.5) return "Strong";
  if (score >= 6.5) return "Good";
  if (score >= 5.5) return "Needs polish";
  return "Needs work";
}

function formatDelta(v: number | null) {
  if (v === null) return "—";
  if (v > 0) return `+${v}`;
  return `${v}`;
}

function paceLabel(wpm: number | null) {
  if (wpm === null) return "—";
  if (wpm < 100) return "Slow";
  if (wpm <= 145) return "Strong";
  if (wpm <= 165) return "Fast";
  return "Very fast";
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
    const scoreVals = group.map(getAttemptScore).filter((v): v is number => v !== null);
    const commVals = group.map(getAttemptComm).filter((v): v is number => v !== null);
    const confVals = group.map(getAttemptConf).filter((v): v is number => v !== null);

    entry.count = group.length;
    entry.avgScore = round1(avg(scoreVals));
    entry.avgComm = round1(avg(commVals));
    entry.avgConf = round1(avg(confVals));
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
  if (v > 0.4) return "#22C55E"; // green
  if (v < -0.4) return "#F87171"; // red
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
            fontWeight: 900,
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
            fontWeight: 900,
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
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)" }}>
          {eyebrow}
        </div>
      ) : null}
      <div
        style={{
          marginTop: eyebrow ? 6 : 0,
          fontSize: 22,
          fontWeight: 950,
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
          fontWeight: 950,
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
  const pct = avgScore === null ? 0 : Math.max(0, Math.min(100, (avgScore / 10) * 100));

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
          <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text-primary)" }}>{label}</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
            {count} {count === 1 ? "attempt" : "attempts"}
            {subtitle ? ` · ${subtitle}` : ""}
          </div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text-primary)" }}>
          {avgScore === null ? "—" : `${toPercentScore(avgScore)}/100`}
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
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)" }}>
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
          fill={
  values[values.length - 1] - values[0] > 0
    ? "#22C55E"
    : values[values.length - 1] - values[0] < 0
    ? "#F87171"
    : "var(--accent)"
}
          stroke={
  values[values.length - 1] - values[0] > 0
    ? "#22C55E"
    : values[values.length - 1] - values[0] < 0
    ? "#F87171"
    : "var(--accent)"
}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={last[0]} cy={last[1]} r="4" fill="var(--accent)" />
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
        eyebrow="PRE-INTERVIEW BRIEF"
        title="Interview Notes"
        subtitle="A concise reminder sheet you can review before your next interview."
      />

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr 1fr",
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
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.5, color: "var(--text-primary)" }}>
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
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.5, color: "var(--text-primary)" }}>
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
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.5, color: "var(--text-primary)" }}>
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
        border: active ? "1px solid var(--accent)" : "1px solid var(--card-border-soft)",
        background: active ? "rgba(99,102,241,0.12)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
        transition: "all 140ms ease",
      }}
    >
      {label}
    </button>
  );
}

export default function ProgressPage() {
  const [history, setHistory] = useState<Attempt[]>([]);
  const { data: session } = useSession();
  const HISTORY_KEY = userScopedKey("ipc_history", session);
  const [activeTab, setActiveTab] = useState<InsightsTab>("overview");

  useEffect(() => {
    if (!session?.user) return;

    (async () => {
      try {
        const res = await fetch("/api/attempts?limit=200", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const attempts = Array.isArray(data?.attempts) ? (data.attempts as Attempt[]) : [];
          if (attempts.length > 0) {
            setHistory(attempts);
            return;
          }
        }
      } catch {
        // ignore and fall back
      }

      const saved = safeJSONParse<Attempt[]>(localStorage.getItem(HISTORY_KEY), []);
      setHistory(Array.isArray(saved) ? saved : []);
    })();
  }, [session?.user, HISTORY_KEY]);

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
      avgOverall: round1(avg(overallVals)),
      avgComm: round1(avg(commVals)),
      avgConf: round1(avg(confVals)),
      avgFillers: round1(avg(fillerVals)),
      avgPace: round1(avg(paceVals)),
      avgMonotone: round1(avg(monotoneVals)),
      avgStarResult: round1(avg(resultVals)),
      topCategory,
      topProfile,
    };
  }, [attemptsNewestFirst]);

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
      const scores = group.map(getAttemptScore).filter((v): v is number => v !== null);
      entry.count = group.length;
      entry.avgScore = round1(avg(scores));
    }

    return Array.from(map.values()).sort((a, b) => {
      const aScore = a.avgScore ?? -1;
      const bScore = b.avgScore ?? -1;
      if (bScore !== aScore) return bScore - aScore;
      return b.count - a.count;
    });
  }, [attemptsNewestFirst]);

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
    return [...categoryStats]
      .filter((x) => x.avgScore !== null)
      .sort((a, b) => (a.avgScore ?? 99) - (b.avgScore ?? 99))[0] ?? null;
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
        `${strongestCategory.label} questions are your strongest category (${toPercentScore(strongestCategory.avgScore)}/100 average).`
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
        `${weakestCategory.label} questions need the most work (${toPercentScore(weakestCategory.avgScore)}/100 average).`
      );
    }

    if (overview.avgPace !== null && overview.avgPace < 100) {
      items.push(`Your pace trends slow (${Math.round(overview.avgPace)} WPM). Tighten pauses and shorten setup.`);
    }

    if (overview.avgPace !== null && overview.avgPace > 165) {
      items.push(`Your pace trends fast (${Math.round(overview.avgPace)} WPM). Pause after outcomes and metrics.`);
    }

    if (overview.avgFillers !== null && overview.avgFillers >= 3) {
      items.push(`Fillers are hurting clarity (${overview.avgFillers}/100 words average).`);
    }

    if (overview.avgMonotone !== null && overview.avgMonotone >= 6) {
      items.push(`Monotone risk is elevated (${overview.avgMonotone}/10 average). Add more vocal emphasis.`);
    }

    if (overview.avgStarResult !== null && overview.avgStarResult <= 6) {
      items.push(`Your weakest STAR area is usually closing impact. End with a clearer measurable result.`);
    }

    return items.slice(0, 4);
  }, [weakestCategory, overview]);

  const recentInsights = useMemo(() => {
    const items: string[] = [];

    if (trendSummary.overallDelta !== null) {
      if (trendSummary.overallDelta > 0.4) {
        items.push(`Overall performance is improving (+${trendSummary.overallDelta} across your last 5 attempts).`);
      } else if (trendSummary.overallDelta < -0.4) {
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
      leanInto.push("You tend to explain ideas clearly when your answer has a clean structure.");
    }
    if (strongestDimension?.label === "Confidence") {
      leanInto.push("Your tone is one of your better assets — trust it and lead with conviction.");
    }
    if (strongestCategory?.label) {
      leanInto.push(`You perform best on ${strongestCategory.label.toLowerCase()} questions.`);
    }
    if (overview.avgPace !== null && overview.avgPace >= 115 && overview.avgPace <= 145) {
      leanInto.push("Your pacing is usually interview-friendly — keep that same tempo.");
    }

    if (overview.avgFillers !== null && overview.avgFillers >= 3) {
      watchouts.push("Do not rush into filler words. Pause instead of saying “um” or “like.”");
    }
    if (overview.avgStarResult !== null && overview.avgStarResult <= 6) {
      watchouts.push("Do not end behavioral answers without a clear business result or outcome.");
    }
    if (biggestGap?.label === "Communication") {
      watchouts.push("Do not over-explain the setup. Get to your main point faster.");
    }
    if (biggestGap?.label === "Confidence") {
      watchouts.push("Avoid hedging language. Lead with ownership and certainty.");
    }

    reminders.push("Start answers with the headline first, then support it with 2–3 details.");
    reminders.push("After metrics or outcomes, pause briefly so the point lands.");
    reminders.push("If asked a behavioral question, close with impact.");
    reminders.push("Keep answers crisp — strong answers often end earlier than you think.");

    return {
      leanInto: leanInto.slice(0, 3),
      watchouts: watchouts.slice(0, 3),
      reminders: reminders.slice(0, 4),
    };
  }, [strongestDimension, strongestCategory, overview, biggestGap]);

  return (
    <PremiumShell
      title="Insights"
      subtitle="See performance patterns across question types, job profiles, and speaking delivery."
    >
      <div style={{ display: "grid", gap: 18 }}>
        {history.length === 0 ? (
          <PremiumCard>
            <div style={{ fontSize: 18, fontWeight: 950, color: "var(--text-primary)" }}>
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
                eyebrow="EXECUTIVE SUMMARY"
                title="Your interview performance at a glance"
                subtitle="A quick read on where you are strong, where you are leaking points, and how your recent attempts are moving."
              />

              <div
                style={{
                  marginTop: 18,
                  padding: 16,
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--card-border-soft)",
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
                    label="AVG OVERALL"
                    value={
                      overview.avgOverall === null ? "—" : (
                        <>
                          {toPercentScore(overview.avgOverall)}
                          <span style={{ fontSize: 14, color: "var(--text-muted)", marginLeft: 6 }}>/100</span>
                        </>
                      )
                    }
                    subtext={scoreLabel(overview.avgOverall)}
                  />

                  <BigMetricCard
                    label="TOTAL ATTEMPTS"
                    value={overview.totalAttempts}
                    subtext="All saved sessions"
                  />

                  <BigMetricCard
                    label="TOP STRENGTH"
                    value={strongestDimension?.label ?? "—"}
                    subtext={
                      strongestDimension?.value !== null && strongestDimension?.value !== undefined
                        ? `${toPercentScore(strongestDimension.value)}/100 average`
                        : "Build more attempt history"
                    }
                  />

                  <BigMetricCard
                    label="BIGGEST GAP"
                    value={biggestGap?.label ?? "—"}
                    subtext={
                      biggestGap?.value !== null && biggestGap?.value !== undefined
                        ? `${toPercentScore(biggestGap.value)}/100 average`
                        : "Build more attempt history"
                    }
                  />

                  <BigMetricCard
                    label="TOP CATEGORY"
                    value={overview.topCategory ? titleCaseLabel(overview.topCategory) : "—"}
                    subtext="Most-practiced question type"
                  />

                  <BigMetricCard
  label="RECENT TREND"
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
                marginBottom: 2,
                borderBottom: "1px solid var(--card-border-soft)",
                paddingBottom: 10,
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
                label="Interview Notes"
                active={activeTab === "notes"}
                onClick={() => setActiveTab("notes")}
              />
            </div>

            {activeTab === "overview" && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.15fr 0.85fr",
                    gap: 14,
                    alignItems: "stretch",
                  }}
                >
                  <PremiumCard>
                    <SectionTitle
                      eyebrow="SNAPSHOT"
                      title="Performance snapshot"
                      subtitle="The most important story in your current data."
                    />

                    <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                      <div
                        style={{
                          padding: 16,
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--card-border-soft)",
                          background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.5, color: "var(--text-muted)" }}>
                          You interview best when…
                        </div>
                        <div style={{ marginTop: 10, fontSize: 15, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.6 }}>
                          {strongestCategory?.label
                            ? `you answer ${strongestCategory.label.toLowerCase()} questions and keep your structure clean.`
                            : "you keep your answers concise, structured, and confident."}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 16,
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--card-border-soft)",
                          background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.5, color: "var(--text-muted)" }}>
                          You lose points when…
                        </div>
                        <div style={{ marginTop: 10, fontSize: 15, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.6 }}>
                          {overview.avgFillers !== null && overview.avgFillers >= 3
                            ? "filler words dilute otherwise solid answers."
                            : overview.avgStarResult !== null && overview.avgStarResult <= 6
                            ? "you do not close with a strong business result."
                            : biggestGap?.label === "Communication"
                            ? "your setup gets too long before your main point."
                            : biggestGap?.label === "Confidence"
                            ? "your tone softens strong ideas."
                            : "you do not make the impact clear enough at the end."}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 16,
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--card-border-soft)",
                          background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.5, color: "var(--text-muted)" }}>
                          Right now…
                        </div>
                        <div style={{ marginTop: 10, fontSize: 15, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.6 }}>
                          {trendSummary.overallDelta !== null && trendSummary.overallDelta > 0.4
                            ? "your recent attempts are trending in the right direction."
                            : trendSummary.overallDelta !== null && trendSummary.overallDelta < -0.4
                            ? "you should simplify and stabilize before adding more detail."
                            : "your performance is stable, so a focused improvement should move the needle fast."}
                        </div>
                      </div>
                    </div>
                  </PremiumCard>

                  <PremiumCard>
  <SectionTitle
    eyebrow="MOMENTUM"
    title="Recent insight summary"
    subtitle="A quick read on how your performance is moving."
  />

  <MiniSparkline values={recentScoreSeries} />

  <ul
    style={{
      marginTop: 14,
      marginBottom: 0,
      paddingLeft: 18,
      lineHeight: 1.75,
      color: "var(--text-primary)",
    }}
  >
    {recentInsights.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
</PremiumCard>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 14,
                  }}
                >
                  <InsightListCard title="Strengths" items={strengths} />
                  <InsightListCard title="Needs improvement" items={improvements} />
                </div>
              </>
            )}

            {activeTab === "performance" && (
              <>
                <PremiumCard>
                  <SectionTitle
                    eyebrow="QUESTION TYPES"
                    title="Performance by question category"
                    subtitle="See where you score best across behavioral, technical, role-specific, and custom questions."
                  />

                  <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                    {categoryStats.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        Category data will appear after new categorized attempts are saved.
                      </div>
                    ) : (
                      categoryStats.map((row) => (
                        <ScoreBarRow
                          key={row.key}
                          label={row.label}
                          count={row.count}
                          avgScore={row.avgScore}
                          subtitle={
                            row.avgComm !== null && row.avgConf !== null
                              ? `Comm ${toPercentScore(row.avgComm)}/100 · Conf ${toPercentScore(row.avgConf)}/100`
                              : undefined
                          }
                        />
                      ))
                    )}
                  </div>
                </PremiumCard>

                <PremiumCard>
                  <SectionTitle
                    eyebrow="FRAMEWORKS"
                    title="Performance by evaluation framework"
                    subtitle="Understand whether you perform best in behavioral stories, technical explanations, or experience-depth questions."
                  />

                  <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                    {frameworkStats.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        Framework data will appear after new attempts are saved.
                      </div>
                    ) : (
                      frameworkStats.map((row) => (
                        <ScoreBarRow
                          key={row.key}
                          label={row.label}
                          count={row.count}
                          avgScore={row.avgScore}
                          subtitle={
                            row.avgComm !== null && row.avgConf !== null
                              ? `Comm ${toPercentScore(row.avgComm)}/100 · Conf ${toPercentScore(row.avgConf)}/100`
                              : undefined
                          }
                        />
                      ))
                    )}
                  </div>
                </PremiumCard>

                <PremiumCard>
                  <SectionTitle
                    eyebrow="TARGET ROLES"
                    title="Performance by job profile"
                    subtitle="Compare how you interview across the roles you are actively targeting."
                  />

                  <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                    {profileStats.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        Job-profile insights will appear after attempts are saved with a selected profile.
                      </div>
                    ) : (
                      profileStats.map((row) => (
                        <ScoreBarRow
                          key={row.key}
                          label={row.label}
                          count={row.count}
                          avgScore={row.avgScore}
                          subtitle={[row.company, row.roleType].filter(Boolean).join(" · ") || undefined}
                        />
                      ))
                    )}
                  </div>
                </PremiumCard>
              </>
            )}

            {activeTab === "delivery" && (
              <PremiumCard>
                <SectionTitle
                  eyebrow="DELIVERY"
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
                    label="PACE"
                    value={overview.avgPace === null ? "—" : `${Math.round(overview.avgPace)} WPM`}
                    subtext={overview.avgPace === null ? "Average spoken pace" : `${paceLabel(overview.avgPace)} pace`}
                  />

                  <BigMetricCard
                    label="FILLERS"
                    value={overview.avgFillers === null ? "—" : `${overview.avgFillers}/100`}
                    subtext="Average filler rate"
                  />

                  <BigMetricCard
                    label="MONOTONE RISK"
                    value={overview.avgMonotone === null ? "—" : `${overview.avgMonotone.toFixed(1)}/10`}
                    subtext="Lower is generally better"
                  />

                  <BigMetricCard
                    label="CLOSING IMPACT"
                    value={overview.avgStarResult === null ? "—" : `${toPercentScore(overview.avgStarResult)}/100`}
                    subtext="Average STAR result quality"
                  />
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 14,
                  }}
                >
                  <InsightListCard
                    title="What your delivery says"
                    items={[
                      overview.avgPace !== null && overview.avgPace < 100
                        ? "You often sound slower and more hesitant than ideal."
                        : overview.avgPace !== null && overview.avgPace > 165
                        ? "You may be rushing through important points."
                        : "Your pace is generally in a strong interview range.",
                      overview.avgFillers !== null && overview.avgFillers >= 3
                        ? "Filler usage is likely making answers feel less polished."
                        : "Your filler usage is not a major issue right now.",
                      overview.avgMonotone !== null && overview.avgMonotone >= 6
                        ? "Your tone may sound too flat on key outcomes."
                        : "Your vocal delivery is not showing a major monotone issue.",
                    ]}
                  />

                  <InsightListCard
                    title="Immediate speaking fixes"
                    items={[
                      "Pause after numbers, metrics, and outcomes.",
                      "Use shorter sentences when you feel yourself rambling.",
                      "Replace filler words with one clean beat of silence.",
                    ]}
                  />

                  <InsightListCard
                    title="Before the interview"
                    items={[
                      "Start stronger: answer the question headline-first.",
                      "End stronger: always include impact, result, or takeaway.",
                      "Do one spoken rep right before the interview to settle your pace.",
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
          </>
        )}
      </div>
    </PremiumShell>
  );
}