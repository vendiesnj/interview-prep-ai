"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Mic, Video, Presentation, Network, Volume2, ArrowRight, BookOpen, History, BarChart2, Star, Clock, ChevronRight } from "lucide-react";
import PremiumShell from "@/app/components/PremiumShell";
import { userScopedKey } from "@/app/lib/userStorage";
import {
  asOverall100,
  displayOverall100,
  avgOverall100,
} from "@/app/lib/scoreScale";

// ── Types ─────────────────────────────────────────────────────────────────────

type Attempt = {
  id?: string;
  ts?: number;
  question?: string;
  evaluationFramework?: string | null;
  score?: number;
  communication_score?: number | null;
  inputMethod?: "spoken" | "pasted";
};

// ── Module definitions ────────────────────────────────────────────────────────

const MODULES = [
  {
    id: "interview",
    label: "Interview Practice",
    description: "Answer behavioral and situational questions with real-time AI feedback on structure, delivery, and impact.",
    href: "/practice",
    icon: Mic,
    accentColor: "#4F46E5",
    accentSoft: "rgba(79,70,229,0.09)",
    framework: "interview",
    badge: null,
  },
  {
    id: "mock",
    label: "Mock Interview",
    description: "Full role-specific interview simulation across 3–5 questions with a scored debrief at the end.",
    href: "/mock-interview",
    icon: Video,
    accentColor: "#7C3AED",
    accentSoft: "rgba(124,58,237,0.09)",
    framework: "mock_interview",
    badge: null,
  },
  {
    id: "public-speaking",
    label: "Public Speaking",
    description: "Practice pitches, presentations, and persuasive speaking with vocal variety and audience awareness coaching.",
    href: "/public-speaking",
    icon: Presentation,
    accentColor: "#D97706",
    accentSoft: "rgba(217,119,6,0.09)",
    framework: "public_speaking",
    badge: null,
  },
  {
    id: "networking",
    label: "Networking Pitch",
    description: "Sharpen your professional introduction and conversational networking skills for real-world situations.",
    href: "/networking",
    icon: Network,
    accentColor: "#10B981",
    accentSoft: "rgba(16,185,129,0.09)",
    framework: "networking",
    badge: "Beta",
  },
  {
    id: "clarity",
    label: "Clarity & Articulation",
    description: "Targeted drills for filler reduction, word precision, pronunciation, and pacing — powered by Azure pronunciation scoring.",
    href: "/clarity",
    icon: Volume2,
    accentColor: "#DC2626",
    accentSoft: "rgba(220,38,38,0.09)",
    framework: "clarity_drill",
    badge: null,
  },
] as const;

// ── Quick links ───────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { label: "Question Bank",  href: "/question-bank", icon: BookOpen },
  { label: "Sessions",       href: "/sessions",      icon: History  },
  { label: "Results",        href: "/results",       icon: Star     },
  { label: "My Coach",       href: "/progress",      icon: BarChart2 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeJSONParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function frameworkLabel(fw: string | null | undefined): string {
  switch (fw) {
    case "interview":        return "Interview";
    case "mock_interview":   return "Mock";
    case "public_speaking":  return "Public Speaking";
    case "networking":       return "Networking";
    default:                 return "Practice";
  }
}

function relativeTime(ts?: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HubPage() {
  const { data: session, status } = useSession();
  const email = session?.user?.email ?? null;

  const [history, setHistory] = useState<Attempt[]>([]);

  // Load local history
  useEffect(() => {
    if (!email) return;
    const key = userScopedKey("ipc_history", email);
    const raw = localStorage.getItem(key) ?? localStorage.getItem("ipc_history");
    const parsed = safeJSONParse<Attempt[]>(raw, []);
    setHistory(parsed.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0)));
  }, [email]);

  // Per-module stats
  const moduleStats = useMemo(() => {
    const map: Record<string, { count: number; avgScore: number | null; lastTs: number | null }> = {};
    for (const m of MODULES) {
      const relevant = history.filter(a => a.evaluationFramework === m.framework);
      const scores = relevant
        .map(a => asOverall100(a.score ?? a.communication_score ?? null))
        .filter((s): s is number => s !== null);
      const avg = scores.length ? avgOverall100(scores) : null;
      map[m.id] = {
        count: relevant.length,
        avgScore: avg !== null ? Math.round(avg) : null,
        lastTs: relevant[0]?.ts ?? null,
      };
    }
    return map;
  }, [history]);

  // Recent sessions (last 5, any module)
  const recentSessions = useMemo(() => history.slice(0, 5), [history]);

  const totalSessions = history.length;
  const allScores = history
    .map(a => asOverall100(a.score ?? a.communication_score ?? null))
    .filter((s): s is number => s !== null);
  const _overallAvgRaw = allScores.length ? avgOverall100(allScores) : null;
  const overallAvg = _overallAvgRaw !== null ? Math.round(_overallAvgRaw) : null;

  if (status === "loading") return null;

  return (
    <PremiumShell title="Practice">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text-primary)", margin: 0, lineHeight: 1.2 }}>
            Practice Library
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "6px 0 0", fontWeight: 500 }}>
            Choose a module to practice, or pick up where you left off.
          </p>

          {/* Summary badges */}
          {totalSessions > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 12, fontWeight: 700, color: "var(--text-muted)",
                background: "var(--card-bg)", border: "1px solid var(--card-border-soft)",
                padding: "4px 10px", borderRadius: 20,
              }}>
                {totalSessions} session{totalSessions !== 1 ? "s" : ""}
              </span>
              {overallAvg !== null && (
                <span style={{
                  fontSize: 12, fontWeight: 700, color: "var(--accent)",
                  background: "var(--accent-soft)", border: "1px solid rgba(79,70,229,0.15)",
                  padding: "4px 10px", borderRadius: 20,
                }}>
                  Avg score: {overallAvg}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Module cards ─────────────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}>
          {MODULES.map((mod) => {
            const stats = moduleStats[mod.id];
            const Icon = mod.icon;

            return (
              <Link
                key={mod.id}
                href={mod.href}
                style={{ textDecoration: "none" }}
              >
                <div style={{
                  background: "var(--card-bg-strong)",
                  border: "1px solid var(--card-border-soft)",
                  borderRadius: "var(--radius-xl)",
                  padding: "20px 22px",
                  boxShadow: "var(--shadow-card)",
                  transition: "box-shadow 150ms, border-color 150ms",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  height: "100%",
                  boxSizing: "border-box",
                  position: "relative",
                  overflow: "hidden",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-glow)";
                    (e.currentTarget as HTMLDivElement).style.borderColor = mod.accentColor + "44";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-card)";
                    (e.currentTarget as HTMLDivElement).style.borderColor = "var(--card-border-soft)";
                  }}
                >
                  {/* Top row: icon + label + badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "var(--radius-md)",
                      background: mod.accentSoft,
                      display: "grid", placeItems: "center", flexShrink: 0,
                    }}>
                      <Icon size={18} color={mod.accentColor} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
                          {mod.label}
                        </span>
                        {mod.badge && (
                          <span style={{
                            fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                            color: mod.accentColor,
                            background: mod.accentSoft,
                            border: `1px solid ${mod.accentColor}33`,
                            padding: "2px 7px", borderRadius: 10,
                            textTransform: "uppercase",
                          }}>
                            {mod.badge}
                          </span>
                        )}
                      </div>
                      {stats.count > 0 && (
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginTop: 2 }}>
                          {stats.count} session{stats.count !== 1 ? "s" : ""}
                          {stats.avgScore !== null && ` · avg ${stats.avgScore}`}
                          {stats.lastTs && ` · ${relativeTime(stats.lastTs)}`}
                        </div>
                      )}
                    </div>
                    <ArrowRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
                    {mod.description}
                  </p>

                  {/* CTA */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 13, fontWeight: 800, color: mod.accentColor,
                    marginTop: "auto",
                  }}>
                    {stats.count > 0 ? "Continue practicing" : "Start practicing"}
                    <ChevronRight size={14} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── Quick links row ───────────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 32,
        }}>
          {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              style={{ textDecoration: "none" }}
            >
              <div style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border-soft)",
                borderRadius: "var(--radius-lg)",
                padding: "12px 16px",
                display: "flex", alignItems: "center", gap: 9,
                fontSize: 13, fontWeight: 700, color: "var(--text-muted)",
                transition: "background 120ms, color 120ms",
                cursor: "pointer",
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = "var(--accent-soft)";
                  el.style.color = "var(--accent)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.background = "var(--card-bg)";
                  el.style.color = "var(--text-muted)";
                }}
              >
                <Icon size={15} />
                {label}
              </div>
            </Link>
          ))}
        </div>

        {/* ── Recent sessions ───────────────────────────────────────────── */}
        {recentSessions.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                Recent Sessions
              </h2>
              <Link href="/sessions" style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
                View all →
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentSessions.map((attempt, i) => {
                const score = asOverall100(attempt.score ?? attempt.communication_score ?? null);
                const scoreColor = score === null ? "var(--text-muted)"
                  : score >= 75 ? "#16A34A"
                  : score >= 55 ? "#D97706"
                  : "#DC2626";

                return (
                  <div
                    key={attempt.id ?? i}
                    style={{
                      background: "var(--card-bg)",
                      border: "1px solid var(--card-border-soft)",
                      borderRadius: "var(--radius-lg)",
                      padding: "12px 16px",
                      display: "flex", alignItems: "center", gap: 12,
                    }}
                  >
                    <Clock size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {attempt.question ?? "Practice session"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginTop: 2 }}>
                        {frameworkLabel(attempt.evaluationFramework)} · {relativeTime(attempt.ts)}
                      </div>
                    </div>
                    {score !== null && (
                      <span style={{ fontSize: 14, fontWeight: 900, color: scoreColor, flexShrink: 0 }}>
                        {score}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {history.length === 0 && (
          <div style={{
            textAlign: "center", padding: "40px 20px",
            background: "var(--card-bg)",
            border: "1px solid var(--card-border-soft)",
            borderRadius: "var(--radius-xl)",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
              Ready to start?
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, maxWidth: 340, margin: "0 auto 20px" }}>
              Pick any module above to complete your first session. Your scores and progress will appear here.
            </div>
            <Link href="/practice" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "var(--accent)", color: "#fff",
              fontSize: 14, fontWeight: 800,
              padding: "10px 22px", borderRadius: "var(--radius-md)",
              textDecoration: "none",
            }}>
              <Mic size={15} />
              Start Interview Practice
            </Link>
          </div>
        )}
      </div>
    </PremiumShell>
  );
}
