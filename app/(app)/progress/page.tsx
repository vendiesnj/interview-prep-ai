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

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: React.ReactNode;
  subtext: string;
}) {
  return (
    <PremiumCard>
      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)" }}>
        {label}
      </div>
      <div style={{ marginTop: 10, fontSize: 28, fontWeight: 950, color: "var(--text-primary)" }}>
        {value}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
        {subtext}
      </div>
    </PremiumCard>
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
    <PremiumCard>
      <div style={{ fontSize: 16, fontWeight: 950, color: "var(--text-primary)" }}>{title}</div>
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
            lineHeight: 1.7,
            color: "var(--text-primary)",
          }}
        >
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </PremiumCard>
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
          {avgScore === null ? "—" : `${avgScore}/10`}
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

export default function ProgressPage() {
  const [history, setHistory] = useState<Attempt[]>([]);
  const { data: session } = useSession();
  const HISTORY_KEY = userScopedKey("ipc_history", session);

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

  const strengths = useMemo(() => {
    const items: string[] = [];

    if (categoryStats.length > 0 && categoryStats[0].avgScore !== null) {
      items.push(
        `${categoryStats[0].label} questions are your strongest category (${categoryStats[0].avgScore}/10 average).`
      );
    }

    if (profileStats.length > 0 && profileStats[0].avgScore !== null) {
      items.push(
        `${profileStats[0].label} is your strongest job profile (${profileStats[0].avgScore}/10 average).`
      );
    }

    if (overview.avgPace !== null && overview.avgPace >= 115 && overview.avgPace <= 145) {
      items.push(`Your speaking pace is in a strong range (${Math.round(overview.avgPace)} WPM average).`);
    }

    if (overview.avgFillers !== null && overview.avgFillers <= 1.5) {
      items.push(`You keep filler usage low (${overview.avgFillers}/100 words average).`);
    }

    if (trendSummary.confDelta !== null && trendSummary.confDelta > 0.4) {
      items.push(`Your confidence is trending up over your last 5 attempts (+${trendSummary.confDelta}).`);
    }

    return items.slice(0, 4);
  }, [categoryStats, profileStats, overview, trendSummary]);

  const improvements = useMemo(() => {
    const items: string[] = [];

    const weakestCategory = [...categoryStats]
      .filter((x) => x.avgScore !== null)
      .sort((a, b) => (a.avgScore ?? 99) - (b.avgScore ?? 99))[0];

    const weakestProfile = [...profileStats]
      .filter((x) => x.avgScore !== null)
      .sort((a, b) => (a.avgScore ?? 99) - (b.avgScore ?? 99))[0];

    if (weakestCategory?.avgScore !== null && weakestCategory?.label) {
  items.push(
    `${weakestCategory.label} questions need the most work (${weakestCategory.avgScore}/10 average).`
  );
}

    if (weakestProfile?.avgScore !== null && weakestProfile?.label && profileStats.length > 1) {
  items.push(
    `${weakestProfile.label} is your weakest tracked job profile (${weakestProfile.avgScore}/10 average).`
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

    return items.slice(0, 4);
  }, [categoryStats, profileStats, overview]);

  const recentInsights = useMemo(() => {
    const items: string[] = [];

    if (trendSummary.overallDelta !== null) {
      if (trendSummary.overallDelta > 0.4) {
        items.push(`Overall performance is improving (+${trendSummary.overallDelta} over your last 5 attempts).`);
      } else if (trendSummary.overallDelta < -0.4) {
        items.push(`Overall performance dipped (${trendSummary.overallDelta}). Simplify your answer structure next attempt.`);
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

  return (
    <PremiumShell
      title="Insights"
      subtitle="See performance patterns across question types, job profiles, and speech delivery."
    >
      <div style={{ display: "grid", gap: 16 }}>
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
              Complete a few interview attempts to unlock trends, strengths, weaknesses, category analysis,
              and role-based performance.
            </div>
          </PremiumCard>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              <StatCard
                label="AVG OVERALL"
                value={
                  overview.avgOverall === null ? "—" : (
                    <>
                      {overview.avgOverall}
                      <span style={{ fontSize: 14, color: "var(--text-muted)", marginLeft: 6 }}>/10</span>
                    </>
                  )
                }
                subtext={scoreLabel(overview.avgOverall)}
              />

              <StatCard
                label="COMMUNICATION"
                value={overview.avgComm === null ? "—" : `${overview.avgComm}/10`}
                subtext="Average communication score"
              />

              <StatCard
                label="CONFIDENCE"
                value={overview.avgConf === null ? "—" : `${overview.avgConf}/10`}
                subtext="Average confidence score"
              />

              <StatCard
                label="TOTAL ATTEMPTS"
                value={overview.totalAttempts}
                subtext="All saved sessions"
              />

              <StatCard
                label="TOP CATEGORY"
                value={overview.topCategory ? titleCaseLabel(overview.topCategory) : "—"}
                subtext="Most-practiced question type"
              />

              <StatCard
                label="TOP PROFILE"
                value={overview.topProfile ?? "—"}
                subtext="Most-practiced job profile"
              />
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

            <PremiumCard>
              <div style={{ fontSize: 18, fontWeight: 950, color: "var(--text-primary)" }}>
                Performance by question category
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                Average score and attempt count by question type.
              </div>

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
                          ? `Comm ${row.avgComm}/10 · Conf ${row.avgConf}/10`
                          : undefined
                      }
                    />
                  ))
                )}
              </div>
            </PremiumCard>

            <PremiumCard>
              <div style={{ fontSize: 18, fontWeight: 950, color: "var(--text-primary)" }}>
                Performance by job profile
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                Compare how you perform across the roles you are targeting.
              </div>

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
                      subtitle={
                        [row.company, row.roleType].filter(Boolean).join(" · ") || undefined
                      }
                    />
                  ))
                )}
              </div>
            </PremiumCard>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              <StatCard
                label="PACE"
                value={overview.avgPace === null ? "—" : `${Math.round(overview.avgPace)} WPM`}
                subtext="Average spoken pace"
              />

              <StatCard
                label="FILLERS"
                value={overview.avgFillers === null ? "—" : `${overview.avgFillers}/100`}
                subtext="Average filler rate"
              />

              <StatCard
                label="MONOTONE RISK"
                value={overview.avgMonotone === null ? "—" : `${overview.avgMonotone}/10`}
                subtext="Lower is generally better"
              />

              <StatCard
                label="RECENT TREND"
                value={
                  trendSummary.overallDelta === null
                    ? "—"
                    : trendSummary.overallDelta > 0
                    ? `+${trendSummary.overallDelta}`
                    : `${trendSummary.overallDelta}`
                }
                subtext="Overall change across last 5 attempts"
              />
            </div>

            <PremiumCard>
              <div style={{ fontSize: 18, fontWeight: 950, color: "var(--text-primary)" }}>
                Recent insight summary
              </div>
              <ul
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                  paddingLeft: 18,
                  lineHeight: 1.7,
                  color: "var(--text-primary)",
                }}
              >
                {recentInsights.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </PremiumCard>
          </>
        )}
      </div>
    </PremiumShell>
  );
}