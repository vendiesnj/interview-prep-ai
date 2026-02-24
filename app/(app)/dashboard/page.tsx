"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {useSession} from "next-auth/react";
import {userScopedKey} from "@/app/lib/userStorage";

type Attempt = {
  id?: string;
  ts?: number;

  // saved at top-level in your practice page entry
  score?: number;
  communication_score?: number;
  confidence_score?: number;
  wpm?: number | null;

  prosody?: {
    monotoneScore?: number; // 1-10
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
      return { label: "Communication (0–10)", max: 10 };
    case "confidence":
      return { label: "Confidence (0–10)", max: 10 };
    case "pace":
      return { label: "Pace (WPM)", max: 220 };
    case "fillers":
      return { label: "Fillers (per 100 words)", max: 20 };
    case "star_result":
      return { label: "STAR Result (0–10)", max: 10 };
    case "vocal_variety":
      return { label: "Vocal Variety (0–10)", max: 10 };
    default:
      return { label: "Overall (0–10)", max: 10 };
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

export default function DashboardPage() {
  const [history, setHistory] = useState<Attempt[]>([]);
  const [metric, setMetric] = useState<MetricKey>("overall");
  const { data: session } = useSession();
const userKey =
  (session?.user as any)?.id ||
  session?.user?.email ||
  "anon";

const HISTORY_KEY = userScopedKey("ipc_history", session);


useEffect(() => {
  if (!session?.user) return;

  (async () => {
    try {
      const res = await fetch("/api/attempts?limit=200", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const attempts = Array.isArray(data?.attempts) ? (data.attempts as Attempt[]) : [];

        // If DB is empty (common in local dev, auth mismatch, or DB not configured),
        // fall back to localStorage history so Dashboard doesn't look broken.
        if (attempts.length > 0) {
          setHistory(attempts);
          return;
        }
      }
    } catch {
      // ignore and fall back
    }

    // Fallback: localStorage history (scoped)
    const saved = safeJSONParse<Attempt[]>(localStorage.getItem(HISTORY_KEY), []);
    setHistory(Array.isArray(saved) ? saved : []);
  })();
}, [session?.user, HISTORY_KEY]);
  const last5 = useMemo(() => history.slice(0, 5), [history]);

  const series = useMemo(() => {
    // last 20 attempts (old -> new for chart)
    const slice = history.slice(0, 20).reverse();
    const vals = slice
      .map((h) => getMetricValue(h, metric))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    return vals;
  }, [history, metric]);

  const stats = useMemo(() => {
    const vals = series;
    if (!vals.length) return { avg: null as number | null, min: null as number | null, max: null as number | null, last: null as number | null };
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

  // Biggest issues (simple: lowest avg among key dims over last 5)
  const biggestIssues = useMemo(() => {
    if (!last5.length) return [];

    const keys: MetricKey[] = ["communication", "confidence", "star_result", "fillers", "pace", "vocal_variety"];
    const scored = keys
      .map((k) => {
        const vals = last5
          .map((h) => getMetricValue(h, k))
          .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
        const a = avg(vals);
        return { k, avg: a };
      })
      .filter((x) => x.avg !== null) as Array<{ k: MetricKey; avg: number }>;

    // For fillers, higher is worse; for pace, distance from 115–145 is worse; others lower is worse
    function badness(item: { k: MetricKey; avg: number }) {
      if (item.k === "fillers") return item.avg; // higher = worse
      if (item.k === "pace") {
        const targetLo = 115;
        const targetHi = 145;
        if (item.avg < targetLo) return targetLo - item.avg;
        if (item.avg > targetHi) return item.avg - targetHi;
        return 0;
      }
      return 10 - item.avg; // lower scores => higher badness
    }

    scored.sort((a, b) => badness(b) - badness(a));
    return scored.slice(0, 2).map((x) => x.k);
  }, [last5]);

  const issueCopy: Record<MetricKey, { title: string; tip: string }> = {
    overall: { title: "Overall", tip: "Tighten structure: 1 claim → 2 supports → 1 result line." },
    communication: { title: "Communication", tip: "Shorter sentences. Cut softeners (“kind of”, “maybe”)." },
    confidence: { title: "Confidence", tip: "Lead with a clear claim. Put one metric earlier." },
    pace: { title: "Pace", tip: "Aim 115–145 WPM. Add micro-pauses after numbers." },
    fillers: { title: "Fillers", tip: "Replace “um/like” with a one-beat pause." },
    star_result: { title: "STAR Result", tip: "End with: “Result: improved X by Y% / saved $Z / reduced time by N days.”" },
    vocal_variety: { title: "Vocal Variety", tip: "Emphasize outcomes + vary pitch at sentence ends." },
  };

  const sparkW = 520;
  const sparkH = 110;
  const { label, max: yMax } = metricMeta(metric);
  const sparkPath = buildSparkPath(series, sparkW, sparkH, 8, yMax);

  const formatValue = (k: MetricKey, v: number | null) => {
    if (v === null) return "—";
    if (k === "pace") return `${Math.round(v)} wpm`;
    if (k === "fillers") return `${Math.round(v * 10) / 10}/100`;
    return `${Math.round(v * 10) / 10}/10`;
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ fontSize: 34, fontWeight: 950, color: "#E5E7EB" }}>Dashboard</div>
      <div style={{ marginTop: 8, color: "#9CA3AF", lineHeight: 1.5 }}>
        Your interview performance at a glance.
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
        {/* Overall Summary (NO last score shown) */}
        <div
          style={{
            padding: 18,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background:
              "radial-gradient(900px 400px at 15% -10%, rgba(99,102,241,0.18), transparent 60%), rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 900, letterSpacing: 0.6 }}>
            OVERALL PERFORMANCE
          </div>

          <div style={{ marginTop: 10, fontSize: 14, color: "#9CA3AF" }}>
            {history.length ? `Saved attempts: ${history.length}` : "No attempts saved yet."}
          </div>

          <div style={{ marginTop: 8, fontSize: 14, color: "#9CA3AF" }}>
            {history.length
              ? `Last ${Math.min(history.length, 5)} attempts avg: ${avgOverallLast5 ?? "—"}/10`
              : "Record + analyze to start building trends."}
          </div>
        </div>

        {/* Trends */}
        <div
          style={{
            padding: 18,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 900, letterSpacing: 0.6 }}>
                TRENDS
              </div>
              <div style={{ marginTop: 6, fontSize: 15, fontWeight: 900, color: "#E5E7EB" }}>{label}</div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>Avg</div>
                <div style={{ marginTop: 3, fontWeight: 900, color: "#E5E7EB" }}>
                  {formatValue(metric, stats.avg === null ? null : Math.round(stats.avg * 10) / 10)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>Min</div>
                <div style={{ marginTop: 3, fontWeight: 900, color: "#E5E7EB" }}>
                  {formatValue(metric, stats.min)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>Max</div>
                <div style={{ marginTop: 3, fontWeight: 900, color: "#E5E7EB" }}>
                  {formatValue(metric, stats.max)}
                </div>
              </div>
            </div>
          </div>

          {/* Metric pills */}
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
              ] as Array<[MetricKey, string]>
            ).map(([k, txt]) => {
              const active = metric === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setMetric(k)}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 999,
                    border: active
                      ? "1px solid rgba(34,211,238,0.45)"
                      : "1px solid rgba(255,255,255,0.10)",
                    background: active ? "rgba(34,211,238,0.10)" : "rgba(255,255,255,0.04)",
                    color: active ? "#A5F3FC" : "#E5E7EB",
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {txt}
                </button>
              );
            })}
          </div>

          {/* Chart */}
          <div style={{ marginTop: 12 }}>
            <svg
              width="100%"
              viewBox={`0 0 ${sparkW} ${sparkH}`}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background:
                  "radial-gradient(900px 420px at 15% -10%, rgba(34,211,238,0.10), transparent 60%), rgba(17,24,39,0.55)",
              }}
            >
              {/* baseline */}
              <path
                d={`M 8 ${(sparkH - 8).toFixed(1)} L ${(sparkW - 8).toFixed(1)} ${(sparkH - 8).toFixed(1)}`}
                stroke="rgba(255,255,255,0.10)"
                strokeWidth="1"
                fill="none"
              />

              {/* line */}
              {series.length ? (
                <path
                  d={sparkPath}
                  stroke="rgba(34,211,238,0.95)"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <text x="16" y="38" fill="rgba(156,163,175,0.9)" style={{ fontSize: 14, fontWeight: 800 }}>
                  No data yet for this metric.
                </text>
              )}
            </svg>

            <div style={{ marginTop: 8, fontSize: 12, color: "#9CA3AF" }}>
              Showing last {Math.min(history.length, 20)} attempts · newest is on the right
            </div>
          </div>
        </div>

        {/* Biggest issues */}
        <div
          style={{
            padding: 18,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 900, letterSpacing: 0.6 }}>
            BIGGEST ISSUES
          </div>

          {biggestIssues.length ? (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {biggestIssues.map((k) => (
                <div
                  key={k}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(17,24,39,0.45)",
                  }}
                >
                  <div style={{ fontWeight: 950, color: "#E5E7EB" }}>{issueCopy[k].title}</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#9CA3AF", lineHeight: 1.5 }}>
                    {issueCopy[k].tip}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 10, fontSize: 13, color: "#9CA3AF" }}>
              Generate a few attempts to surface your biggest issues.
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href="/practice"
          style={{
            textDecoration: "none",
            padding: 16,
            borderRadius: 16,
            border: "1px solid rgba(34,211,238,0.35)",
            background: "rgba(34,211,238,0.10)",
            color: "#A5F3FC",
            fontWeight: 950,
            textAlign: "center",
            fontSize: 14,
          }}
        >
          Start Practice →
        </Link>
      </div>
    </div>
  );
}
