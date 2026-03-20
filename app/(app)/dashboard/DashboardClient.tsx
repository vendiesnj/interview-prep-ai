"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";
import PremiumShell from "../../components/PremiumShell";
import PremiumCard from "../../components/PremiumCard";
import {
  asOverall100,
  asTenPoint,
  displayOverall100,
  avgOverall100,
} from "@/app/lib/scoreScale";

type Attempt = {
  id?: string;
  ts?: number;
  score?: number | null;
  communication_score?: number | null;
  confidence_score?: number | null;
  wpm?: number | null;
  prosody?: { monotoneScore?: number } | null;
  feedback?: {
    score?: number | null;
    communication_score?: number | null;
    confidence_score?: number | null;
    filler?: { per100?: number; total?: number };
    star?: { situation?: number; task?: number; action?: number; result?: number };
  } | null;
};

type MetricKey = "overall" | "communication" | "confidence" | "pace" | "fillers" | "star_result" | "vocal_variety";

function safeJSONParse<T>(raw: string | null, fallback: T): T {
  try { if (!raw) return fallback; return JSON.parse(raw) as T; } catch { return fallback; }
}
function n(x: any): number | null { return typeof x === "number" && Number.isFinite(x) ? x : null; }
function avg(nums: number[]) { if (!nums.length) return null; return nums.reduce((a, b) => a + b, 0) / nums.length; }
function round1(x: number | null) { return x === null ? null : Math.round(x * 10) / 10; }
function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }

function buildSparkPath(values: number[], w: number, h: number, pad = 6, fixedMax?: number) {
  if (!values.length) return "";
  const min = 0;
  const max = typeof fixedMax === "number" ? fixedMax : Math.max(...values);
  const range = Math.max(1e-6, max - min);
  const xs = values.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1));
  const ys = values.map((v) => { const t = (v - min) / range; return pad + (1 - clamp01(t)) * (h - pad * 2); });
  return xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
}

function metricMeta(metric: MetricKey) {
  switch (metric) {
    case "communication": return { label: "Communication", max: 100 };
    case "confidence": return { label: "Confidence", max: 100 };
    case "pace": return { label: "Pace (WPM)", max: 220 };
    case "fillers": return { label: "Fillers (per 100 words)", max: 20 };
    case "star_result": return { label: "Closing Impact", max: 100 };
    case "vocal_variety": return { label: "Vocal Variety", max: 100 };
    default: return { label: "Overall", max: 100 };
  }
}

function getMetricValue(h: Attempt, metric: MetricKey): number | null {
  if (metric === "overall") return asOverall100(n(h.score ?? h.feedback?.score));
  if (metric === "communication") { const v = asTenPoint(n(h.communication_score ?? h.feedback?.communication_score)); return v === null ? null : v * 10; }
  if (metric === "confidence") { const v = asTenPoint(n(h.confidence_score ?? h.feedback?.confidence_score)); return v === null ? null : v * 10; }
  if (metric === "pace") return n(h.wpm ?? null);
  if (metric === "fillers") return n(h.feedback?.filler?.per100);
  if (metric === "star_result") { const v = asTenPoint(n(h.feedback?.star?.result)); return v === null ? null : v * 10; }
  if (metric === "vocal_variety") { const m = asTenPoint(n(h.prosody?.monotoneScore)); return m === null ? null : Math.max(0, Math.min(100, (10 - m) * 10)); }
  return null;
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 900, letterSpacing: 0.8, textTransform: "uppercase" as const }}>{children}</div>;
}

function MetricChip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ padding: "7px 10px", borderRadius: 999, border: active ? "1px solid var(--accent-strong)" : "1px solid var(--card-border-soft)", background: active ? "var(--accent-soft)" : "var(--card-bg)", color: active ? "var(--accent)" : "var(--text-primary)", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>
      {children}
    </button>
  );
}

// ── Module card ───────────────────────────────────────────────────────────────
function ModuleCard({
  icon, label, eyebrow, stat, statLabel, href, comingSoon, color,
}: {
  icon: string; label: string; eyebrow: string; stat?: string; statLabel?: string;
  href: string; comingSoon?: boolean; color: string;
}) {
  const inner = (
    <div
      className={comingSoon ? undefined : "ipc-card-lift"}
      style={{
        padding: "20px 22px",
        borderRadius: "var(--radius-xl)",
        border: `1px solid ${comingSoon ? "var(--card-border-soft)" : "var(--card-border)"}`,
        background: comingSoon
          ? "var(--card-bg)"
          : "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))",
        boxShadow: comingSoon ? "none" : "var(--shadow-card-soft)",
        opacity: comingSoon ? 0.55 : 1,
        height: "100%",
        boxSizing: "border-box" as const,
        display: "flex",
        flexDirection: "column" as const,
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 26 }}>{icon}</span>
        {comingSoon && (
          <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.5, color: "var(--text-muted)", background: "var(--card-border-soft)", padding: "3px 8px", borderRadius: 6, textTransform: "uppercase" as const }}>
            Coming soon
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.7, color, textTransform: "uppercase" as const, marginBottom: 3 }}>{eyebrow}</div>
        <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text-primary)" }}>{label}</div>
      </div>
      {stat && (
        <div style={{ marginTop: "auto" }}>
          <div style={{ fontSize: 22, fontWeight: 950, color: "var(--text-primary)", lineHeight: 1 }}>{stat}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{statLabel}</div>
        </div>
      )}
      {!comingSoon && !stat && (
        <div style={{ marginTop: "auto", fontSize: 13, fontWeight: 900, color }}>Start →</div>
      )}
    </div>
  );

  if (comingSoon) return <div>{inner}</div>;
  return <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link>;
}

// ── Career quick-link ─────────────────────────────────────────────────────────
function CareerQuickLink({ href, icon, label, sub }: { href: string; icon: string; label: string; sub: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div className="ipc-card-lift" style={{ padding: "16px 18px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", display: "flex", alignItems: "center", gap: 14, boxShadow: "var(--shadow-card-soft)" }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 950, color: "var(--text-primary)" }}>{label}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{sub}</div>
        </div>
        <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 14 }}>→</span>
      </div>
    </Link>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [history, setHistory] = useState<Attempt[]>([]);
  const [metric, setMetric] = useState<MetricKey>("overall");
  const [loadState, setLoadState] = useState<"hydrating" | "ready">("hydrating");
  const { data: session, status } = useSession();

  const HISTORY_KEY = userScopedKey("ipc_history", session);
  const firstName = (session?.user?.name ?? "").split(" ")[0] || "there";
  const persona: string = (session?.user as any)?.demoPersona ?? "during_college";

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
            if (!cancelled && attempts.length > 0) { setHistory(attempts); return; }
          }
        }
        const saved = safeJSONParse<Attempt[]>(localStorage.getItem(HISTORY_KEY), []);
        if (!cancelled) setHistory(Array.isArray(saved) ? saved : []);
      } catch {
        const saved = safeJSONParse<Attempt[]>(localStorage.getItem(HISTORY_KEY), []);
        if (!cancelled) setHistory(Array.isArray(saved) ? saved : []);
      } finally {
        if (!cancelled) setLoadState("ready");
      }
    })();

    return () => { cancelled = true; };
  }, [status, session?.user, HISTORY_KEY]);

  const last5 = useMemo(() => history.slice(0, 5), [history]);

  const series = useMemo(() => {
    return history.slice(0, 20).reverse()
      .map((h) => getMetricValue(h, metric))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  }, [history, metric]);

  const stats = useMemo(() => {
    if (!series.length) return { avg: null as number | null, min: null as number | null, max: null as number | null };
    return { avg: avg(series), min: Math.min(...series), max: Math.max(...series) };
  }, [series]);

  const avgOverallLast5 = useMemo(() => round1(avgOverall100(last5.map((h) => n(h.score ?? h.feedback?.score)))), [last5]);

  const biggestIssues = useMemo(() => {
    if (!last5.length) return [];
    const keys: MetricKey[] = ["communication", "confidence", "star_result", "fillers", "pace", "vocal_variety"];
    const scored = keys.map((k) => {
      const vals = last5.map((h) => getMetricValue(h, k)).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      return { k, avg: avg(vals) };
    }).filter((x) => x.avg !== null) as Array<{ k: MetricKey; avg: number }>;

    function badness(item: { k: MetricKey; avg: number }) {
      if (item.k === "fillers") return item.avg;
      if (item.k === "pace") { const lo = 115, hi = 145; if (item.avg < lo) return lo - item.avg; if (item.avg > hi) return item.avg - hi; return 0; }
      return 100 - item.avg;
    }
    scored.sort((a, b) => badness(b) - badness(a));
    return scored.slice(0, 2).map((x) => x.k);
  }, [last5]);

  const issueCopy: Record<MetricKey, { title: string; tip: string }> = {
    overall: { title: "Overall", tip: "Tighten structure: 1 clear claim -> 2 supports -> 1 strong close." },
    communication: { title: "Communication", tip: 'Shorter sentences. Cut softeners like "kind of" and "maybe".' },
    confidence: { title: "Confidence", tip: "Lead with a clear claim. Put one metric earlier." },
    pace: { title: "Pace", tip: "Aim 115-145 WPM. Add micro-pauses after numbers." },
    fillers: { title: "Fillers", tip: 'Replace um/like with a one-beat pause.' },
    star_result: { title: "Closing Impact", tip: 'End with a result: "Improved X by Y% / saved $Z / reduced time by N days."' },
    vocal_variety: { title: "Vocal Variety", tip: "Emphasize outcomes + vary pitch at sentence ends." },
  };

  const sparkW = 520, sparkH = 110;
  const { label, max: yMax } = metricMeta(metric);
  const sparkPath = buildSparkPath(series, sparkW, sparkH, 8, yMax);

  const formatValue = (k: MetricKey, v: number | null) => {
    if (v === null) return "—";
    if (k === "pace") return `${Math.round(v)} wpm`;
    if (k === "fillers") return `${Math.round(v * 10) / 10}/100`;
    return `${Math.round(v)}/100`;
  };

  const avgScore = typeof avgOverallLast5 === "number" ? displayOverall100(avgOverallLast5) : null;

  return (
    <PremiumShell title="Signal" subtitle="Your communication & career platform">
      <div style={{ maxWidth: 1100, paddingBottom: 48 }}>

        {/* ── Greeting ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.5 }}>
            Good morning, {firstName} 👋
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
            {persona === "pre_college"
              ? "Let's get you ready for college and beyond."
              : persona === "post_college"
              ? "Keep growing — your career and finances, all in one place."
              : "Your platform for interviews, speaking, and career growth."}
          </p>
        </div>

        {/* ── Module cards ── */}
        <div style={{ marginBottom: 10 }}>
          <SectionEyebrow>Modules</SectionEyebrow>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 32 }}>
          {persona === "pre_college" ? (
            <>
              <ModuleCard icon="🎓" eyebrow="Pre-College" label="College Ready" href="/college-ready" comingSoon color="#10B981" />
              <ModuleCard icon="🎤" eyebrow="Speaking" label="Public Speaking" href="/public-speaking" color="#8B5CF6" />
              <ModuleCard icon="🎙️" eyebrow="Interview" label="Interview Prep" stat={history.length ? `${history.length}` : undefined} statLabel={history.length ? `session${history.length !== 1 ? "s" : ""} · avg ${avgScore ?? "—"}` : undefined} href="/practice" color="var(--accent)" />
              <ModuleCard icon="🤝" eyebrow="Networking" label="Networking Pitch" href="/networking" color="#0EA5E9" />
            </>
          ) : persona === "post_college" ? (
            <>
              <ModuleCard icon="🎙️" eyebrow="Interview" label="Interview Prep" stat={history.length ? `${history.length}` : undefined} statLabel={history.length ? `session${history.length !== 1 ? "s" : ""} · avg ${avgScore ?? "—"}` : undefined} href="/practice" color="var(--accent)" />
              <ModuleCard icon="🤝" eyebrow="Networking" label="Networking Pitch" href="/networking" color="#0EA5E9" />
              <ModuleCard icon="🎤" eyebrow="Speaking" label="Public Speaking" href="/public-speaking" color="#8B5CF6" />
              <ModuleCard icon="🎓" eyebrow="Pre-College" label="College Ready" href="/college-ready" comingSoon color="#10B981" />
            </>
          ) : (
            <>
              <ModuleCard icon="🎙️" eyebrow="Interview" label="Interview Prep" stat={history.length ? `${history.length}` : undefined} statLabel={history.length ? `session${history.length !== 1 ? "s" : ""} · avg ${avgScore ?? "—"}` : undefined} href="/practice" color="var(--accent)" />
              <ModuleCard icon="🎤" eyebrow="Speaking" label="Public Speaking" href="/public-speaking" color="#8B5CF6" />
              <ModuleCard icon="🤝" eyebrow="Networking" label="Networking Pitch" href="/networking" color="#0EA5E9" />
              <ModuleCard icon="🎓" eyebrow="Pre-College" label="College Ready" href="/college-ready" comingSoon color="#10B981" />
            </>
          )}
        </div>

        {/* ── Interview Prep performance ── */}
        {loadState === "ready" && (
          <>
            <div style={{ marginBottom: 10 }}>
              <SectionEyebrow>Interview Prep · Performance</SectionEyebrow>
            </div>
            <div style={{ display: "grid", gap: 14, marginBottom: 32 }}>

              {/* Trend chart */}
              <PremiumCard style={{ padding: 20, borderRadius: "var(--radius-lg)" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text-primary)" }}>{label} trend</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                      {history.length ? `${history.length} sessions total` : "No sessions yet"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                    {[["Avg", stats.avg], ["Min", stats.min], ["Max", stats.max]].map(([lbl, val]) => (
                      <div key={lbl as string} style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{lbl}</div>
                        <div style={{ marginTop: 3, fontWeight: 900, color: "var(--text-primary)" }}>
                          {formatValue(metric, val === null ? null : Math.round((val as number) * 10) / 10)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {([ ["overall", "Overall"], ["communication", "Communication"], ["confidence", "Confidence"], ["pace", "Pace"], ["fillers", "Fillers"], ["star_result", "Closing"], ["vocal_variety", "Vocal Variety"] ] as Array<[MetricKey, string]>).map(([k, txt]) => (
                    <MetricChip key={k} active={metric === k} onClick={() => setMetric(k)}>{txt}</MetricChip>
                  ))}
                </div>

                <div style={{ marginTop: 12 }}>
                  <svg width="100%" viewBox={`0 0 ${sparkW} ${sparkH}`} style={{ borderRadius: 14, border: "1px solid var(--card-border)", background: `radial-gradient(900px 420px at 15% -10%, var(--accent-soft), transparent 60%), var(--input-bg)` }}>
                    <path d={`M 8 ${(sparkH - 8).toFixed(1)} L ${(sparkW - 8).toFixed(1)} ${(sparkH - 8).toFixed(1)}`} stroke="var(--card-border)" strokeWidth="1" fill="none" />
                    {series.length ? (
                      <path d={sparkPath} stroke="var(--accent)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <text x="16" y="38" fill="var(--text-muted)" style={{ fontSize: 14, fontWeight: 800 }}>No data yet — start a practice session.</text>
                    )}
                  </svg>
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>Showing last {Math.min(history.length, 20)} sessions · newest on the right</div>
                </div>
              </PremiumCard>

              {/* Biggest issues */}
              {biggestIssues.length > 0 && (
                <PremiumCard style={{ padding: 20, borderRadius: "var(--radius-lg)" }}>
                  <div style={{ fontSize: 13, fontWeight: 950, color: "var(--text-primary)", marginBottom: 12 }}>Focus areas</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {biggestIssues.map((k) => (
                      <div key={k} style={{ padding: 14, borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--input-bg)" }}>
                        <div style={{ fontWeight: 950, color: "var(--text-primary)" }}>{issueCopy[k].title}</div>
                        <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{issueCopy[k].tip}</div>
                      </div>
                    ))}
                  </div>
                </PremiumCard>
              )}
            </div>
          </>
        )}

        {/* ── Career Center ── */}
        <div style={{ marginBottom: 10 }}>
          <SectionEyebrow>Career Center</SectionEyebrow>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 32 }}>
          <CareerQuickLink href="/career-guide" icon="📚" label="Career Guide" sub="First year, finances, housing, paths" />
          <CareerQuickLink href="/career-checkin" icon="✅" label="Career Check-In" sub="Log your progress & financial snapshot" />
          <CareerQuickLink href="/career-guide/benchmarks" icon="📊" label="Peer Benchmarks" sub="How your cohort is doing" />
          <CareerQuickLink href="/career-guide/retirement" icon="📈" label="Retirement Projection" sub="When could you retire?" />
        </div>

        {/* ── CTA ── */}
        <Link
          href={persona === "pre_college" ? "/public-speaking" : "/practice"}
          style={{ textDecoration: "none", display: "block", padding: 18, borderRadius: "var(--radius-md)", border: "1px solid var(--accent-strong)", background: "linear-gradient(135deg, var(--accent-2-soft), var(--accent-soft))", color: "var(--text-primary)", fontWeight: 950, textAlign: "center", fontSize: 14, boxShadow: "var(--shadow-glow)" }}
        >
          {persona === "pre_college" ? "Start a Public Speaking Session →" : "Start Interview Practice →"}
        </Link>

      </div>
    </PremiumShell>
  );
}
