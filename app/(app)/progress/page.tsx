"use client";

import React, { useEffect, useMemo, useState } from "react";
import PremiumCard from "../../components/PremiumCard";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";

type Attempt = {
  id?: string;
  ts?: number;

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

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function buildSparkPath(values: number[], w: number, h: number, pad = 8, fixedMax?: number) {
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

        // If DB is empty (common in local dev / DB not configured),
        // fall back to localStorage so Progress doesn't look blank.
        if (attempts.length > 0) {
          setHistory(attempts);
          return;
        }
      }
    } catch {
      // ignore and fall back
    }

    // Fallback: old localStorage history (if present)
    const saved = safeJSONParse<Attempt[]>(localStorage.getItem(HISTORY_KEY), []);
    setHistory(Array.isArray(saved) ? saved : []);
  })();
}, [session?.user, HISTORY_KEY]);
  // last 20 attempts (old -> new)
  const slice = useMemo(() => history.slice(0, 20).reverse(), [history]);

  const seriesOverall = useMemo(
    () =>
      slice
        .map((h) => n(h.score ?? h.feedback?.score))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v)),
    [slice]
  );

  const seriesComm = useMemo(
    () =>
      slice
        .map((h) => n(h.communication_score ?? h.feedback?.communication_score))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v)),
    [slice]
  );

  const seriesConf = useMemo(
    () =>
      slice
        .map((h) => n(h.confidence_score ?? h.feedback?.confidence_score))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v)),
    [slice]
  );

  const seriesFillers = useMemo(
    () =>
      slice
        .map((h) => n(h.feedback?.filler?.per100))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v)),
    [slice]
  );

  const seriesPace = useMemo(
    () =>
      slice
        .map((h) => n(h.wpm))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v)),
    [slice]
  );

  const seriesStarR = useMemo(
    () =>
      slice
        .map((h) => n(h.feedback?.star?.result))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v)),
    [slice]
  );

  const seriesVocal = useMemo(
    () =>
      slice
        .map((h) => n(h.prosody?.monotoneScore))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v)),
    [slice]
  );

  const totals = useMemo(() => {
    const total = history.length;

    const spoken = history.filter((h) => h.inputMethod === "spoken").length;
    const pasted = history.filter((h) => h.inputMethod === "pasted").length;

    const last7 = history
      .filter((h) => typeof h.ts === "number")
      .filter((h) => (Date.now() - (h.ts as number)) / (1000 * 60 * 60 * 24) <= 7).length;

    const overallVals = history
      .slice(0, 10)
      .map((h) => n(h.score ?? h.feedback?.score))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    const a10 = avg(overallVals);
    const avg10 = a10 === null ? null : Math.round(a10 * 10) / 10;

    return { total, spoken, pasted, last7, avg10 };
  }, [history]);

  const sparkW = 620;
  const sparkH = 140;

  const pathOverall = buildSparkPath(seriesOverall, sparkW, sparkH, 10, 10);
  const pathComm = buildSparkPath(seriesComm, sparkW, sparkH, 10, 10);
  const pathConf = buildSparkPath(seriesConf, sparkW, sparkH, 10, 10);
  const pathStarR = buildSparkPath(seriesStarR, sparkW, sparkH, 10, 10);
  const pathVocal = buildSparkPath(seriesVocal, sparkW, sparkH, 10, 10);

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ fontSize: 34, fontWeight: 950, color: "#E5E7EB" }}>Progress</div>
      <div style={{ marginTop: 8, color: "#9CA3AF", lineHeight: 1.6 }}>
        Trend tiles from your saved attempts (<code style={{ color: "#E5E7EB" }}>{HISTORY_KEY}</code>).
      </div>

      {/* Top tiles */}
      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
        <PremiumCard>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#9CA3AF" }}>TOTAL</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 950, color: "#E5E7EB" }}>{totals.total}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF" }}>Saved attempts</div>
        </PremiumCard>

        <PremiumCard>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#9CA3AF" }}>LAST 7 DAYS</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 950, color: "#E5E7EB" }}>{totals.last7}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF" }}>Attempts recorded</div>
        </PremiumCard>

        <PremiumCard>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#9CA3AF" }}>AVG (LAST 10)</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 950, color: "#E5E7EB" }}>
            {totals.avg10 ?? "—"}
            <span style={{ fontSize: 14, color: "#9CA3AF", marginLeft: 6 }}>/10</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF" }}>Overall score</div>
        </PremiumCard>

        <PremiumCard>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#9CA3AF" }}>INPUT MIX</div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "baseline" }}>
            <div style={{ fontSize: 18, fontWeight: 950, color: "#E5E7EB" }}>{totals.spoken}</div>
            <div style={{ fontSize: 12, color: "#9CA3AF" }}>spoken</div>
            <div style={{ marginLeft: 10, fontSize: 18, fontWeight: 950, color: "#E5E7EB" }}>{totals.pasted}</div>
            <div style={{ fontSize: 12, color: "#9CA3AF" }}>pasted</div>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF" }}>Helps interpret pace/vocal variety</div>
        </PremiumCard>
      </div>

      {/* Trend cards */}
      <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
        <PremiumCard>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#9CA3AF" }}>TREND</div>
              <div style={{ marginTop: 6, fontSize: 16, fontWeight: 950, color: "#E5E7EB" }}>Overall score</div>
            </div>
            <div style={{ fontSize: 12, color: "#9CA3AF" }}>Last {Math.min(history.length, 20)} attempts</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <svg
              width="100%"
              viewBox={`0 0 ${sparkW} ${sparkH}`}
              style={{
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.10)",
                background:
                  "radial-gradient(900px 420px at 15% -10%, rgba(34,211,238,0.10), transparent 60%), rgba(17,24,39,0.55)",
              }}
            >
              <path
                d={`M 10 ${(sparkH - 10).toFixed(1)} L ${(sparkW - 10).toFixed(1)} ${(sparkH - 10).toFixed(1)}`}
                stroke="rgba(255,255,255,0.10)"
                strokeWidth="1"
                fill="none"
              />
              {seriesOverall.length ? (
                <path
                  d={pathOverall}
                  stroke="rgba(34,211,238,0.95)"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <text x="18" y="44" fill="rgba(156,163,175,0.9)" style={{ fontSize: 14, fontWeight: 800 }}>
                  No data yet — record + analyze to generate history.
                </text>
              )}
            </svg>
            <div style={{ marginTop: 8, fontSize: 12, color: "#9CA3AF" }}>
              Newest attempt is on the right
            </div>
          </div>
        </PremiumCard>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
          <PremiumCard>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#9CA3AF" }}>TREND</div>
            <div style={{ marginTop: 6, fontSize: 16, fontWeight: 950, color: "#E5E7EB" }}>Communication</div>
            <div style={{ marginTop: 12 }}>
              <svg
                width="100%"
                viewBox={`0 0 ${sparkW} ${sparkH}`}
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(17,24,39,0.55)",
                }}
              >
                <path
                  d={`M 10 ${(sparkH - 10).toFixed(1)} L ${(sparkW - 10).toFixed(1)} ${(sparkH - 10).toFixed(1)}`}
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth="1"
                  fill="none"
                />
                {seriesComm.length ? (
                  <path d={pathComm} stroke="rgba(34,211,238,0.95)" strokeWidth="3" fill="none" strokeLinecap="round" />
                ) : null}
              </svg>
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>Avg</div>
                <div style={{ marginTop: 4, fontWeight: 950 }}>{avg(seriesComm)?.toFixed(1) ?? "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>Fillers</div>
                <div style={{ marginTop: 4, fontWeight: 950 }}>
                  {avg(seriesFillers) === null ? "—" : `${(Math.round((avg(seriesFillers) as number) * 10) / 10).toFixed(1)}/100`}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>Pace</div>
                <div style={{ marginTop: 4, fontWeight: 950 }}>
                  {avg(seriesPace) === null ? "—" : `${Math.round(avg(seriesPace) as number)} wpm`}
                </div>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#9CA3AF" }}>TREND</div>
            <div style={{ marginTop: 6, fontSize: 16, fontWeight: 950, color: "#E5E7EB" }}>Confidence + STAR Result</div>
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 900 }}>Confidence</div>
                <svg
                  width="100%"
                  viewBox={`0 0 ${sparkW} ${sparkH}`}
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(17,24,39,0.55)",
                    marginTop: 8,
                  }}
                >
                  <path
                    d={`M 10 ${(sparkH - 10).toFixed(1)} L ${(sparkW - 10).toFixed(1)} ${(sparkH - 10).toFixed(1)}`}
                    stroke="rgba(255,255,255,0.10)"
                    strokeWidth="1"
                    fill="none"
                  />
                  {seriesConf.length ? (
                    <path d={pathConf} stroke="rgba(34,211,238,0.95)" strokeWidth="3" fill="none" strokeLinecap="round" />
                  ) : null}
                </svg>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 900 }}>STAR — Result</div>
                <svg
                  width="100%"
                  viewBox={`0 0 ${sparkW} ${sparkH}`}
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(17,24,39,0.55)",
                    marginTop: 8,
                  }}
                >
                  <path
                    d={`M 10 ${(sparkH - 10).toFixed(1)} L ${(sparkW - 10).toFixed(1)} ${(sparkH - 10).toFixed(1)}`}
                    stroke="rgba(255,255,255,0.10)"
                    strokeWidth="1"
                    fill="none"
                  />
                  {seriesStarR.length ? (
                    <path d={pathStarR} stroke="rgba(34,211,238,0.95)" strokeWidth="3" fill="none" strokeLinecap="round" />
                  ) : null}
                </svg>
              </div>

              <div style={{ marginTop: 2, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>Conf avg</div>
                  <div style={{ marginTop: 4, fontWeight: 950 }}>{avg(seriesConf)?.toFixed(1) ?? "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>STAR-R avg</div>
                  <div style={{ marginTop: 4, fontWeight: 950 }}>{avg(seriesStarR)?.toFixed(1) ?? "—"}</div>
                </div>
                <div>
                </div>
              </div>
            </div>
          </PremiumCard>
                  <PremiumCard>
  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#9CA3AF" }}>TREND</div>
  <div style={{ marginTop: 6, fontSize: 16, fontWeight: 950, color: "#E5E7EB" }}>Vocal variety</div>

  <div style={{ marginTop: 12 }}>
    <svg
      width="100%"
      viewBox={`0 0 ${sparkW} ${sparkH}`}
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(17,24,39,0.55)",
      }}
    >
      <path
        d={`M 10 ${(sparkH - 10).toFixed(1)} L ${(sparkW - 10).toFixed(1)} ${(sparkH - 10).toFixed(1)}`}
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1"
        fill="none"
      />
      {seriesVocal.length ? (
        <path d={pathVocal} stroke="rgba(34,211,238,0.95)" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : null}
    </svg>
  </div>

  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
    <div>
      <div style={{ fontSize: 11, color: "#9CA3AF" }}>Avg</div>
      <div style={{ marginTop: 4, fontWeight: 950 }}>{avg(seriesVocal)?.toFixed(1) ?? "—"}</div>
    </div>
    <div>
      <div style={{ fontSize: 11, color: "#9CA3AF" }}>Min</div>
      <div style={{ marginTop: 4, fontWeight: 950 }}>
        {seriesVocal.length ? Math.min(...seriesVocal).toFixed(1) : "—"}
      </div>
    </div>
    <div>
      <div style={{ fontSize: 11, color: "#9CA3AF" }}>Max</div>
      <div style={{ marginTop: 4, fontWeight: 950 }}>
        {seriesVocal.length ? Math.max(...seriesVocal).toFixed(1) : "—"}
      </div>
    </div>
  </div>
</PremiumCard>

        </div>
      </div>
    </div>
  );
}