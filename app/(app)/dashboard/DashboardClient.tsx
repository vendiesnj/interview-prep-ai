"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";
import PremiumShell from "../../components/PremiumShell";
import PremiumCard from "../../components/PremiumCard";

type Attempt = {
  id?: string;
  ts?: number;
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
};

function safeJSONParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type MetricKey =
  | "overall"
  | "communication"
  | "confidence"
  | "pace"
  | "fillers"
  | "star_result"
  | "vocal_variety";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function buildSparkPath(values: number[], w: number, h: number, pad = 6, fixedMax?: number) {
  if (!values.length) return "";
  const min = 0;
  const max = typeof fixedMax === "number" ? fixedMax : Math.max(...values);
  const range = Math.max(1e-6, max - min);

  const xs = values.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1));
  const ys = values.map((v) => {
    const t = (v - min) / range;
    return pad + (1 - clamp01(t)) * (h - pad * 2);
  });

  return xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(" ");
}

function metricMeta(metric: MetricKey) {
  switch (metric) {
    case "communication":
      return { label: "Communication (rubric score)", max: 10 };
    case "confidence":
      return { label: "Confidence (rubric score)", max: 10 };
    case "pace":
      return { label: "Pace (WPM)", max: 220 };
    case "fillers":
      return { label: "Fillers (per 100 words)", max: 20 };
    case "star_result":
       return { label: "Closing Impact (rubric score)", max: 10 };
    case "vocal_variety":
      return { label: "Vocal Variety (rubric score)", max: 10 };
    default:
      return { label: "Overall (internal score)", max: 10 };
  }
}

function getMetricValue(h: Attempt, metric: MetricKey): number | null {
  const n = (x: any) => (typeof x === "number" && Number.isFinite(x) ? x : null);

  if (metric === "overall") return n(h.score ?? h.feedback?.score);
  if (metric === "communication") return n(h.communication_score ?? h.feedback?.communication_score);
  if (metric === "confidence") return n(h.confidence_score ?? h.feedback?.confidence_score);
  if (metric === "pace") return n(h.wpm ?? null);
  if (metric === "fillers") return n(h.feedback?.filler?.per100);
  if (metric === "star_result") return n(h.feedback?.star?.result);
  if (metric === "vocal_variety") return n(h.prosody?.monotoneScore);

  return null;
}

function avg(nums: number[]) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: "var(--text-muted)",
        fontWeight: 900,
        letterSpacing: 0.7,
      }}
    >
      {children}
    </div>
  );
}

function MetricChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 10px",
        borderRadius: 999,
        border: active
          ? "1px solid var(--accent-strong)"
          : "1px solid var(--card-border-soft)",
        background: active ? "var(--accent-soft)" : "var(--card-bg)",
        color: active ? "var(--accent)" : "var(--text-primary)",
        fontSize: 12,
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function DashboardPage() {
 const [history, setHistory] = useState<Attempt[]>([]);
const [metric, setMetric] = useState<MetricKey>("overall");
const [loadState, setLoadState] = useState<"hydrating" | "ready">("hydrating");
const { data: session, status } = useSession();

const HISTORY_KEY = userScopedKey("ipc_history", session);

useEffect(() => {
  if (status === "loading") return;

  let cancelled = false;
  setLoadState("hydrating");

  (async () => {
    try {
      if (session?.user) {
        const res = await fetch("/api/attempts?limit=200", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const attempts = Array.isArray(data?.attempts) ? (data.attempts as Attempt[]) : [];

          if (!cancelled && attempts.length > 0) {
            setHistory(attempts);
            return;
          }
        }
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

  const last5 = useMemo(() => history.slice(0, 5), [history]);

  const series = useMemo(() => {
    const slice = history.slice(0, 20).reverse();
    return slice
      .map((h) => getMetricValue(h, metric))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  }, [history, metric]);

  const stats = useMemo(() => {
    const vals = series;
    if (!vals.length) {
      return {
        avg: null as number | null,
        min: null as number | null,
        max: null as number | null,
        last: null as number | null,
      };
    }
    return {
      avg: avg(vals),
      min: Math.min(...vals),
      max: Math.max(...vals),
      last: vals[vals.length - 1],
    };
  }, [series]);

  const avgOverallLast5 = useMemo(() => {
    const vals = last5
      .map((h) => getMetricValue(h, "overall"))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const a = avg(vals);
    return a === null ? null : Math.round(a * 10) / 10;
  }, [last5]);

  const biggestIssues = useMemo(() => {
    if (!last5.length) return [];

    const keys: MetricKey[] = [
      "communication",
      "confidence",
      "star_result",
      "fillers",
      "pace",
      "vocal_variety",
    ];

    const scored = keys
      .map((k) => {
        const vals = last5
          .map((h) => getMetricValue(h, k))
          .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
        const a = avg(vals);
        return { k, avg: a };
      })
      .filter((x) => x.avg !== null) as Array<{ k: MetricKey; avg: number }>;

    function badness(item: { k: MetricKey; avg: number }) {
      if (item.k === "fillers") return item.avg;
      if (item.k === "pace") {
        const targetLo = 115;
        const targetHi = 145;
        if (item.avg < targetLo) return targetLo - item.avg;
        if (item.avg > targetHi) return item.avg - targetHi;
        return 0;
      }
      return 10 - item.avg;
    }

    scored.sort((a, b) => badness(b) - badness(a));
    return scored.slice(0, 2).map((x) => x.k);
  }, [last5]);

  const issueCopy: Record<MetricKey, { title: string; tip: string }> = {
    overall: {
      title: "Overall",
            tip: "Tighten structure: 1 clear claim → 2 supports → 1 strong close.",
    },
    communication: {
      title: "Communication",
      tip: "Shorter sentences. Cut softeners (“kind of”, “maybe”).",
    },
    confidence: {
      title: "Confidence",
      tip: "Lead with a clear claim. Put one metric earlier.",
    },
    pace: {
      title: "Pace",
      tip: "Aim 115–145 WPM. Add micro-pauses after numbers.",
    },
    fillers: {
      title: "Fillers",
      tip: "Replace “um/like” with a one-beat pause.",
    },
    star_result: {
            title: "Closing Impact",
      tip: "End with: “Result: improved X by Y% / saved $Z / reduced time by N days.”",
    },
    vocal_variety: {
      title: "Vocal Variety",
      tip: "Emphasize outcomes + vary pitch at sentence ends.",
    },
  };

  const sparkW = 520;
  const sparkH = 110;
  const { label, max: yMax } = metricMeta(metric);
  const sparkPath = buildSparkPath(series, sparkW, sparkH, 8, yMax);

    if (loadState === "hydrating") {
    return (
      <PremiumShell
        title="Dashboard"
        subtitle="Your interview performance at a glance."
      >
        <div style={{ maxWidth: 1100 }}>
          <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
            <PremiumCard
              style={{
                padding: 18,
                borderRadius: "var(--radius-lg)",
              }}
            >
              <SectionEyebrow>LOADING</SectionEyebrow>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div
                  style={{
                    height: 14,
                    width: "38%",
                    borderRadius: 999,
                    background: "var(--card-border-soft)",
                  }}
                />
                <div
                  style={{
                    height: 14,
                    width: "54%",
                    borderRadius: 999,
                    background: "var(--card-border-soft)",
                  }}
                />
              </div>
            </PremiumCard>

            <PremiumCard
              style={{
                padding: 18,
                borderRadius: "var(--radius-lg)",
              }}
            >
              <SectionEyebrow>TRENDS</SectionEyebrow>

              <div
                style={{
                  marginTop: 12,
                  height: 120,
                  borderRadius: "var(--radius-md)",
                  background: "var(--card-border-soft)",
                }}
              />
            </PremiumCard>
          </div>
        </div>
      </PremiumShell>
    );
  }

  const formatValue = (k: MetricKey, v: number | null) => {
    if (v === null) return "—";
    if (k === "pace") return `${Math.round(v)} wpm`;
    if (k === "fillers") return `${Math.round(v * 10) / 10}/100`;
        return `${Math.round(v * 10)}/100`;
  };

  return (
    <PremiumShell
      title="Dashboard"
      subtitle="Your interview performance at a glance."
    >
      <div style={{ maxWidth: 1100 }}>
        <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
          <PremiumCard
            style={{
              padding: 18,
              borderRadius: "var(--radius-lg)",
            }}
          >
            <SectionEyebrow>OVERALL PERFORMANCE</SectionEyebrow>

            <div
              style={{
                marginTop: 10,
                fontSize: 14,
                color: "var(--text-muted)",
                lineHeight: 1.55,
              }}
            >
              {history.length ? `Saved attempts: ${history.length}` : "No attempts saved yet."}
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 14,
                color: "var(--text-muted)",
                lineHeight: 1.55,
              }}
            >
              {history.length
                ? `Last ${Math.min(history.length, 5)} attempts avg: ${typeof avgOverallLast5 === "number" ? Math.round(avgOverallLast5 * 10) : "—"}/100`
                : "Record + analyze to start building trends."}
            </div>
          </PremiumCard>

          <PremiumCard
            style={{
              padding: 18,
              borderRadius: "var(--radius-lg)",
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
                <SectionEyebrow>TRENDS</SectionEyebrow>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 15,
                    fontWeight: 900,
                    color: "var(--text-primary)",
                  }}
                >
                  {label}
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Avg</div>
                  <div style={{ marginTop: 3, fontWeight: 900, color: "var(--text-primary)" }}>
                    {formatValue(metric, stats.avg === null ? null : Math.round(stats.avg * 10) / 10)}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Min</div>
                  <div style={{ marginTop: 3, fontWeight: 900, color: "var(--text-primary)" }}>
                    {formatValue(metric, stats.min)}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Max</div>
                  <div style={{ marginTop: 3, fontWeight: 900, color: "var(--text-primary)" }}>
                    {formatValue(metric, stats.max)}
                  </div>
                </div>
              </div>
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
                ] as Array<[MetricKey, string]>
              ).map(([k, txt]) => (
                <MetricChip key={k} active={metric === k} onClick={() => setMetric(k)}>
                  {txt}
                </MetricChip>
              ))}
            </div>

            <div style={{ marginTop: 12 }}>
              <svg
                width="100%"
                viewBox={`0 0 ${sparkW} ${sparkH}`}
                style={{
                  borderRadius: 14,
                  border: "1px solid var(--card-border)",
                  background: `
                    radial-gradient(900px 420px at 15% -10%, var(--accent-soft), transparent 60%),
                    var(--input-bg)
                  `,
                }}
              >
                <path
                  d={`M 8 ${(sparkH - 8).toFixed(1)} L ${(sparkW - 8).toFixed(1)} ${(sparkH - 8).toFixed(1)}`}
                  stroke="var(--card-border)"
                  strokeWidth="1"
                  fill="none"
                />

                {series.length ? (
                  <path
                    d={sparkPath}
                    stroke="var(--accent)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <text
                    x="16"
                    y="38"
                    fill="var(--text-muted)"
                    style={{ fontSize: 14, fontWeight: 800 }}
                  >
                    No data yet for this metric.
                  </text>
                )}
              </svg>

              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                Showing last {Math.min(history.length, 20)} attempts · newest is on the right
              </div>
            </div>
          </PremiumCard>

          <PremiumCard
            style={{
              padding: 18,
              borderRadius: "var(--radius-lg)",
            }}
          >
            <SectionEyebrow>BIGGEST ISSUES</SectionEyebrow>

            {biggestIssues.length ? (
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {biggestIssues.map((k) => (
                  <div
                    key={k}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      border: "1px solid var(--card-border)",
                      background: "var(--input-bg)",
                    }}
                  >
                    <div style={{ fontWeight: 950, color: "var(--text-primary)" }}>
                      {issueCopy[k].title}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 13,
                        color: "var(--text-muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      {issueCopy[k].tip}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
                Generate a few attempts to surface your biggest issues.
              </div>
            )}
          </PremiumCard>

          <Link
            href="/practice"
            style={{
              textDecoration: "none",
              padding: 16,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--accent-strong)",
              background: "linear-gradient(135deg, var(--accent-2-soft), var(--accent-soft))",
              color: "var(--text-primary)",
              fontWeight: 950,
              textAlign: "center",
              fontSize: 14,
              boxShadow: "var(--shadow-glow)",
            }}
          >
            Start Practice →
          </Link>
        </div>
      </div>
    </PremiumShell>
  );
}