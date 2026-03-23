"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PremiumShell from "@/app/components/PremiumShell";
import StreakBanner from "@/app/components/StreakBanner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SignalData {
  signalScore: number | null;
  naceScores: Array<{ key: string; shortLabel: string; score: number | null }>;
  profile: { name?: string; graduationYear?: string; stage?: string };
  speaking: { interview: { count: number; avgScore: number | null }; networking: { count: number }; publicSpeaking: { count: number } };
  completeness: number;
  nextAction: { label: string; href: string; reason: string } | null;
  aptitude: { primary: string } | null;
  careerCheckIn: { salaryRange?: string } | null;
}

// ── Three pillars definition ───────────────────────────────────────────────────

const PILLARS = [
  {
    id: "career",
    icon: "🎙️",
    title: "Career Readiness",
    color: "#2563EB",
    bg: "rgba(37,99,235,0.08)",
    actions: [
      { label: "Interview Prep", href: "/practice", time: "~15 min" },
      { label: "Networking Pitch", href: "/networking", time: "~10 min" },
      { label: "Public Speaking", href: "/public-speaking", time: "~10 min" },
    ],
    guideHref: "/career-guide",
    guideLabel: "Career Guide",
  },
  {
    id: "financial",
    icon: "💰",
    title: "Financial Literacy",
    color: "#10B981",
    bg: "rgba(16,185,129,0.08)",
    actions: [
      { label: "Budget Builder", href: "/career-guide/budget", time: "~5 min" },
      { label: "Retirement Projection", href: "/career-guide/retirement", time: "~3 min" },
      { label: "Financial Literacy", href: "/financial-literacy", time: "~10 min" },
    ],
    guideHref: "/career-guide",
    guideLabel: "Financial Guide",
  },
  {
    id: "futureproof",
    icon: "🛡️",
    title: "AI Resilience",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.08)",
    actions: [
      { label: "Future-Proof Guide", href: "/future-proof", time: "~10 min" },
      { label: "Career Aptitude", href: "/aptitude", time: "~15 min" },
      { label: "Career Paths", href: "/career-guide/career-paths", time: "~5 min" },
    ],
    guideHref: "/future-proof",
    guideLabel: "AI Guide",
  },
];

// ── Quick tools ───────────────────────────────────────────────────────────────

const QUICK_TOOLS = [
  { icon: "🗂️", label: "Planner", href: "/planner", color: "#8B5CF6" },
  { icon: "📊", label: "My Journey", href: "/my-journey", color: "#2563EB" },
  { icon: "✅", label: "Check-In", href: "/career-checkin", color: "#10B981" },
  { icon: "📄", label: "Resume Gap", href: "/resume-gap", color: "#F59E0B" },
  { icon: "🏠", label: "Housing Guide", href: "/career-guide/housing", color: "#0EA5E9" },
  { icon: "📈", label: "Benchmarks", href: "/career-guide/benchmarks", color: "#EC4899" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student-profile")
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const firstName = data?.profile?.name?.split(" ")[0] || "there";
  const totalSessions = data
    ? data.speaking.interview.count + data.speaking.networking.count + data.speaking.publicSpeaking.count
    : null;

  const signalScore = data?.signalScore ?? null;
  const signalColor = signalScore === null ? "var(--text-muted)"
    : signalScore >= 60 ? "#10B981"
    : signalScore >= 35 ? "#F59E0B"
    : "#EF4444";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <PremiumShell hideHeader>
      <div style={{ maxWidth: 1080, margin: "0 auto", paddingBottom: 80 }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.5 }}>
            {greeting}, {firstName}.
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        <StreakBanner />

        {/* ── Signal Score + Stats ── */}
        {loading ? (
          <div style={{ height: 100, borderRadius: 16, background: "var(--card-bg)", border: "1px solid var(--card-border)", marginBottom: 24, animation: "pulse 1.5s ease-in-out infinite" }} />
        ) : (
          <div style={{
            padding: "20px 24px",
            borderRadius: 16,
            border: "1px solid var(--card-border-soft)",
            background: "linear-gradient(135deg, var(--card-bg-strong), var(--card-bg))",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}>
            {/* Score */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 80 }}>
              <div style={{ fontSize: 48, fontWeight: 950, color: signalColor, lineHeight: 1 }}>
                {signalScore ?? "—"}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textAlign: "center" }}>Signal Score</div>
            </div>

            <div style={{ width: 1, height: 56, background: "var(--card-border-soft)", flexShrink: 0 }} />

            {/* Mini stats */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <MiniStat label="Sessions" value={totalSessions?.toString() ?? "0"} />
              <MiniStat label="Profile" value={`${data?.completeness ?? 0}%`} />
              {data?.aptitude && <MiniStat label="Aptitude" value={data.aptitude.primary} />}
              {data?.careerCheckIn && <MiniStat label="Check-In" value="Done ✓" color="#10B981" />}
            </div>

            {/* Next action */}
            {data?.nextAction && (
              <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Recommended next step</div>
                <Link href={data.nextAction.href} style={{
                  display: "inline-block",
                  padding: "8px 16px",
                  borderRadius: 10,
                  background: "var(--accent)",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 13,
                  textDecoration: "none",
                }}>
                  {data.nextAction.label} →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Three Pillars ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
          {PILLARS.map(pillar => (
            <div key={pillar.id} style={{
              padding: "20px 22px",
              borderRadius: 16,
              border: "1px solid var(--card-border)",
              background: pillar.bg,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 22 }}>{pillar.icon}</span>
                <div style={{ fontSize: 14, fontWeight: 950, color: "var(--text-primary)" }}>{pillar.title}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pillar.actions.map(action => (
                  <Link key={action.href} href={action.href} style={{ textDecoration: "none" }}>
                    <div style={{
                      padding: "9px 12px",
                      borderRadius: 10,
                      background: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{action.label}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{action.time}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <Link href={pillar.guideHref} style={{
                display: "block",
                marginTop: 12,
                textAlign: "center",
                fontSize: 12,
                fontWeight: 900,
                color: pillar.color,
                textDecoration: "none",
              }}>
                {pillar.guideLabel} →
              </Link>
            </div>
          ))}
        </div>

        {/* ── NACE mini bars (if data loaded and has scores) ── */}
        {data && data.naceScores.some(n => n.score !== null) && (
          <div style={{
            padding: "18px 22px",
            borderRadius: 16,
            border: "1px solid var(--card-border)",
            background: "var(--card-bg)",
            marginBottom: 24,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase" }}>
                NACE Career Readiness
              </div>
              <Link href="/my-journey?tab=nace" style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
                Full breakdown →
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px 20px" }}>
              {data.naceScores.filter(n => n.key !== "equity_inclusion" && n.score !== null).map(ns => (
                <div key={ns.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>{ns.shortLabel}</span>
                    <span style={{ fontSize: 11, fontWeight: 900, color: ns.score! >= 50 ? "#10B981" : "var(--text-muted)" }}>{ns.score}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${ns.score}%`, borderRadius: 99, background: ns.score! >= 50 ? "#10B981" : "#F59E0B", transition: "width 0.6s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick Tools ── */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>
            Quick Access
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {QUICK_TOOLS.map(tool => (
              <Link key={tool.href} href={tool.href} style={{ textDecoration: "none" }}>
                <div className="ipc-card-lift" style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid var(--card-border)",
                  background: "var(--card-bg)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: tool.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    {tool.icon}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)" }}>{tool.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </PremiumShell>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 950, color: color ?? "var(--text-primary)" }}>{value}</div>
    </div>
  );
}
