"use client";

import React, { useCallback, useEffect, useState } from "react";
import PremiumShell from "@/app/components/PremiumShell";
import NaceScoreCard from "@/app/components/NaceScoreCard";
import InterviewActivityTracker from "@/app/components/InterviewActivityTracker";
import { downloadNacePdf } from "@/app/lib/nace-pdf";
import type { NaceScore } from "@/app/lib/nace";

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId =
  | "overview"
  | "speaking"
  | "resume"
  | "financial"
  | "skills"
  | "instincts"
  | "nace"
  | "pipeline";

interface RecentAttempt {
  id: string;
  ts: string | number;
  question: string;
  score: number | null;
  evaluationFramework: string | null;
}

interface SpeakingSegmentBase {
  count: number;
  avgScore: number | null;
  recentAttempts: RecentAttempt[];
}

interface InterviewSegment extends SpeakingSegmentBase {
  avgComm: number | null;
  avgConf: number | null;
  avgWpm: number | null;
}

interface NetworkingSegment extends SpeakingSegmentBase {
  topPitchStyle: string | null;
}

interface PublicSpeakingSegment extends SpeakingSegmentBase {
  topArchetype: string | null;
}

interface ResumeAnalysis {
  id: string;
  createdAt: string;
  overallScore: number;
  atsScore: number;
  overallLabel: string;
  summary: string;
  topAction: string;
  resumeSnippet?: string | null;
  jobDescSnippet?: string | null;
}

interface StudentSkill {
  id: string;
  skill: string;
  category: string;
  confidence: number;
  source: string;
}

interface ProfilePayload {
  profile: {
    name: string | null;
    email: string | null;
    graduationYear: number | null;
    major: string | null;
    targetRole: string | null;
    targetIndustry: string | null;
    memberSince: string;
  };
  speaking: {
    interview: InterviewSegment;
    networking: NetworkingSegment;
    publicSpeaking: PublicSpeakingSegment;
  };
  aptitude: {
    primary: string;
    secondary: string;
    scores: unknown;
    completedAt: string;
  } | null;
  careerCheckIn: {
    employmentStatus: string;
    jobTitle: string | null;
    company: string | null;
    industry: string | null;
    salaryRange: string | null;
    satisfactionScore: number | null;
    createdAt: string;
  } | null;
  checklist: {
    preCollege: { total: number; done: number };
    duringCollege: { total: number; done: number };
    postCollege: { total: number; done: number };
    financialLiteracy: { total: number; done: number };
  };
  skills: {
    byCategory: Record<string, StudentSkill[]>;
    total: number;
  };
  resumeHistory: ResumeAnalysis[];
  naceScores: NaceScore[];
  signalScore: number | null;
  nextAction: {
    title: string;
    description: string;
    href: string;
    naceKey: string;
    currentScore: number | null;
  } | null;
  completeness: number;
  interviewPipeline: {
    total: number;
    byStage: Record<string, number>;
    offers: number;
    accepted: number;
  };
  faceMetrics?: {
    eyeContact: number;
    expressiveness: number;
    headStability: number;
    sessionsAnalyzed: number;
  } | null;
  instincts?: {
    sessions: Array<{
      id: string;
      createdAt: string;
      dimensions: Record<string, number>;
      xpEarned: number;
      scenariosPlayed: string[];
    }>;
    dimensions: Record<string, number> | null;
    totalXp: number;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return "var(--text-muted)";
  if (score >= 75) return "#10B981";
  if (score >= 55) return "#2563EB";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function scoreLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 85) return "Excellent";
  if (score >= 75) return "Strong";
  if (score >= 65) return "Good";
  if (score >= 55) return "Developing";
  if (score >= 40) return "Needs work";
  return "Beginning";
}

function formatDate(ts: string | number | Date): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function truncate(str: string, maxLen: number): string {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "…";
}

function salaryRangeLabel(range: string | null): string {
  if (!range) return "—";
  const map: Record<string, string> = {
    under_40k: "Under $40K",
    "40_50k": "$40–50K",
    "50_60k": "$50–60K",
    "60_75k": "$60–75K",
    "75_90k": "$75–90K",
    "90_110k": "$90–110K",
    "110_130k": "$110–130K",
    over_130k: "Over $130K",
  };
  return map[range] ?? range;
}

function employmentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    employed: "Employed",
    job_searching: "Job Searching",
    graduate_school: "Graduate School",
    freelance: "Freelance",
    other: "Other",
  };
  return map[status] ?? status;
}

function employmentStatusColor(status: string): string {
  if (status === "employed") return "#10B981";
  if (status === "job_searching") return "#F59E0B";
  if (status === "graduate_school") return "#2563EB";
  if (status === "freelance") return "#8B5CF6";
  return "var(--text-muted)";
}

function pitchStyleColor(style: string): string {
  const s = style.toLowerCase();
  if (s.includes("connector")) return "#10B981";
  if (s.includes("achiever")) return "#0EA5E9";
  if (s.includes("visionary")) return "#8B5CF6";
  if (s.includes("wanderer")) return "#6B7280";
  if (s.includes("bullet")) return "#F59E0B";
  if (s.includes("over")) return "#EF4444";
  return "var(--accent)";
}

function archetypeColor(archetype: string): string {
  const a = archetype.toLowerCase();
  if (a.includes("storytell")) return "#10B981";
  if (a.includes("lecturer")) return "#8B5CF6";
  if (a.includes("motivat")) return "#F59E0B";
  if (a.includes("coach")) return "#0EA5E9";
  return "var(--accent)";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TabButton({
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
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        padding: "20px 24px",
        borderRadius: 16,
        border: "1px solid var(--card-border-soft)",
        background: "var(--card-bg)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: 14,
        border: "1px solid var(--card-border-soft)",
        background: "var(--card-bg)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: color ?? "var(--text-primary)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>{label}</div>
      {sub ? (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>
      ) : null}
    </div>
  );
}

function ProgressBar({
  label,
  done,
  total,
  color,
}: {
  label: string;
  done: number;
  total: number;
  color?: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const c = color ?? "#2563EB";
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: c }}>
          {done}/{total}
        </span>
      </div>
      <div
        style={{
          height: 7,
          borderRadius: 99,
          background: "var(--card-border-soft)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: c,
            borderRadius: 99,
            transition: "width 0.6s ease",
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{pct}% complete</div>
    </div>
  );
}

function ScoreRing({ value, size = 80 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * circ;
  const gap = circ - dash;
  const color =
    pct >= 75 ? "#10B981" : pct >= 55 ? "#2563EB" : pct >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--card-border-soft)"
        strokeWidth={7}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={7}
        strokeDasharray={`${dash} ${gap}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2}
        dy=".35em"
        textAnchor="middle"
        fontSize={size * 0.22}
        fontWeight={900}
        fill="var(--text-primary)"
      >
        {pct}
      </text>
    </svg>
  );
}

function SmallScoreCircle({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * circ;
  const gap = circ - dash;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--card-border-soft)"
        strokeWidth={5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${dash} ${gap}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2}
        dy=".35em"
        textAnchor="middle"
        fontSize={size * 0.24}
        fontWeight={900}
        fill={color}
      >
        {pct}
      </text>
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        color: "var(--text-muted)",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function SkeletonBlock({ width = "100%", height = 18 }: { width?: string | number; height?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 8,
        background: "var(--card-border-soft)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

function SpeakingSection({
  title,
  segment,
  extra,
}: {
  title: string;
  segment: SpeakingSegmentBase;
  extra?: React.ReactNode;
}) {
  const col = scoreColor(segment.avgScore);

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{title}</div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 99,
            background: col + "18",
            border: `1px solid ${col}40`,
            color: col,
          }}
        >
          {segment.count} session{segment.count !== 1 ? "s" : ""}
        </div>
      </div>

      {segment.count === 0 ? (
        <div
          style={{
            padding: "20px 0",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          No {title.toLowerCase()} sessions yet.
        </div>
      ) : (
        <>
          {/* Avg score bar */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
                Avg score
              </span>
              <span style={{ fontSize: 12, fontWeight: 900, color: col }}>
                {segment.avgScore !== null ? segment.avgScore : "—"}
                {segment.avgScore !== null ? " · " + scoreLabel(segment.avgScore) : ""}
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 99,
                background: "var(--card-border-soft)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${segment.avgScore ?? 0}%`,
                  background: col,
                  borderRadius: 99,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </div>

          {extra}

          {/* Mini timeline */}
          {segment.recentAttempts.length > 0 && (
            <div>
              <SectionLabel>Last {segment.recentAttempts.length} sessions</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {segment.recentAttempts.map((a) => {
                  const sc = a.score !== null
                    ? (a.score < 15 ? Math.round(a.score * 10) : Math.round(a.score))
                    : null;
                  const c = scoreColor(sc);
                  return (
                    <div
                      key={a.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "var(--card-bg-strong)",
                        border: "1px solid var(--card-border-soft)",
                      }}
                    >
                      <div
                        style={{
                          minWidth: 34,
                          height: 34,
                          borderRadius: 8,
                          background: sc !== null ? c + "18" : "var(--card-border-soft)",
                          border: `1px solid ${sc !== null ? c + "40" : "var(--card-border-soft)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 900,
                          color: sc !== null ? c : "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      >
                        {sc !== null ? sc : "—"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {truncate(a.question ?? "Untitled session", 60)}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                          {formatDate(a.ts)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <SkeletonBlock key={i} width={80} height={36} />
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              padding: 20,
              borderRadius: 14,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <SkeletonBlock width="50%" height={28} />
            <SkeletonBlock width="80%" height={14} />
          </div>
        ))}
      </div>
      <div
        style={{
          padding: 24,
          borderRadius: 16,
          border: "1px solid var(--card-border-soft)",
          background: "var(--card-bg)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <SkeletonBlock width="40%" height={18} />
        <SkeletonBlock width="100%" height={14} />
        <SkeletonBlock width="90%" height={14} />
        <SkeletonBlock width="70%" height={14} />
      </div>
    </div>
  );
}

// ── Tab panels ────────────────────────────────────────────────────────────────

// ── NACE Radar Chart ──────────────────────────────────────────────────────────
function NaceRadarChart({ scores }: { scores: NaceScore[] }) {
  const scoreable = scores.filter(s => s.key !== "equity_inclusion" && s.score !== null);
  const n = scoreable.length;
  if (n < 3) return null;

  const cx = 160;
  const cy = 160;
  const maxR = 110;
  const rings = [20, 40, 60, 80, 100];

  // Angle for each axis (start from top, go clockwise)
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  // Point on axis for a given score (0-100) and index
  const axisPoint = (i: number, score: number) => {
    const r = (score / 100) * maxR;
    return {
      x: cx + r * Math.cos(angle(i)),
      y: cy + r * Math.sin(angle(i)),
    };
  };

  // Label position (slightly outside maxR)
  const labelPoint = (i: number) => {
    const r = maxR + 24;
    return {
      x: cx + r * Math.cos(angle(i)),
      y: cy + r * Math.sin(angle(i)),
    };
  };

  // Build score polygon path
  const polyPoints = scoreable.map((s, i) => axisPoint(i, s.score!));
  const polyPath = polyPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  // Ring paths
  const ringPath = (pct: number) => {
    const r = (pct / 100) * maxR;
    return Array.from({ length: n }, (_, i) => {
      const x = (cx + r * Math.cos(angle(i))).toFixed(1);
      const y = (cy + r * Math.sin(angle(i))).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    }).join(" ") + " Z";
  };

  return (
    <svg width={320} height={320} viewBox="0 0 320 320" style={{ overflow: "visible" }}>
      {/* Background rings */}
      {rings.map(pct => (
        <path key={pct} d={ringPath(pct)} fill="none" stroke="var(--card-border)" strokeWidth={1} opacity={0.6} />
      ))}

      {/* Axis lines */}
      {scoreable.map((_, i) => {
        const ep = axisPoint(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={ep.x} y2={ep.y} stroke="var(--card-border)" strokeWidth={1} opacity={0.5} />;
      })}

      {/* Score polygon — filled */}
      <path d={polyPath} fill="var(--accent)" fillOpacity={0.15} stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />

      {/* Score dots */}
      {scoreable.map((s, i) => {
        const p = axisPoint(i, s.score!);
        return <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--accent)" />;
      })}

      {/* Labels */}
      {scoreable.map((s, i) => {
        const lp = labelPoint(i);
        const ang = angle(i);
        const isLeft = Math.cos(ang) < -0.1;
        const isRight = Math.cos(ang) > 0.1;
        const textAnchor = isLeft ? "end" : isRight ? "start" : "middle";
        // Shorten labels for the chart
        const shortLabels: Record<string, string> = {
          communication: "Communication",
          critical_thinking: "Critical\nThinking",
          professionalism: "Professionalism",
          leadership: "Leadership",
          teamwork: "Teamwork",
          career_dev: "Career Dev",
          technology: "Technology",
        };
        const label = shortLabels[s.key] ?? s.shortLabel;
        const lines = label.split("\n");
        return (
          <text key={i} x={lp.x} y={lp.y} textAnchor={textAnchor} dominantBaseline="middle" fontSize={10} fontWeight={700} fill="var(--text-muted)">
            {lines.map((line, li) => (
              <tspan key={li} x={lp.x} dy={li === 0 ? 0 : 12}>{line}</tspan>
            ))}
          </text>
        );
      })}

      {/* Ring labels (20, 40, 60, 80) */}
      {[20, 40, 60, 80].map(pct => (
        <text key={pct} x={cx + 3} y={cy - (pct / 100) * maxR - 3} fontSize={8} fill="var(--text-muted)" opacity={0.7}>{pct}</text>
      ))}
    </svg>
  );
}

function OverviewTab({ data, onNavigate }: { data: ProfilePayload; onNavigate: (tab: TabId) => void }) {
  const { profile, speaking, aptitude, completeness, skills, resumeHistory, signalScore, nextAction, naceScores } = data;
  const [expandedNace, setExpandedNace] = useState<string | null>(null);

  const totalSessions = speaking.interview.count + speaking.networking.count + speaking.publicSpeaking.count;

  const signalColor = signalScore === null ? "var(--text-muted)" : signalScore >= 60 ? "#10B981" : signalScore >= 35 ? "#F59E0B" : "#EF4444";
  const signalLabel = signalScore === null ? "—" : signalScore >= 60 ? "Building strong" : signalScore >= 35 ? "In progress" : "Just starting";

  // Section tiles definition
  const tiles: Array<{
    id: TabId;
    icon: string;
    title: string;
    stat: string;
    sub: string;
    color: string;
  }> = [
    {
      id: "speaking",
      icon: "🎙️",
      title: "Speaking",
      stat: `${totalSessions} session${totalSessions !== 1 ? "s" : ""}`,
      sub: speaking.interview.avgScore !== null ? `Avg score: ${speaking.interview.avgScore}` : "No sessions yet",
      color: "#2563EB",
    },
    {
      id: "nace",
      icon: "📊",
      title: "NACE Scores",
      stat: signalScore !== null ? `Signal: ${signalScore}` : "Building…",
      sub: "Career readiness framework",
      color: "var(--accent)",
    },
    {
      id: "resume",
      icon: "📄",
      title: "Resume",
      stat: `${resumeHistory.length} analys${resumeHistory.length !== 1 ? "es" : "is"}`,
      sub: resumeHistory.length > 0 ? `Last score: ${resumeHistory[0].overallScore}` : "No analysis yet",
      color: "#8B5CF6",
    },
    {
      id: "instincts",
      icon: "🧠",
      title: "Career Instincts",
      stat: `${data.instincts?.sessions?.length ?? 0} session${(data.instincts?.sessions?.length ?? 0) !== 1 ? "s" : ""}`,
      sub: data.instincts?.totalXp ? `${data.instincts.totalXp} XP earned` : "Explore your instincts",
      color: "#0EA5E9",
    },
    {
      id: "skills",
      icon: "⚡",
      title: "Skills",
      stat: `${skills.total} skill${skills.total !== 1 ? "s" : ""}`,
      sub: skills.total > 0 ? `${Object.keys(skills.byCategory).length} categories` : "Extract from resume",
      color: "#10B981",
    },
    {
      id: "financial",
      icon: "💰",
      title: "Financial",
      stat: data.careerCheckIn ? "Check-in done" : "No check-in yet",
      sub: data.careerCheckIn?.salaryRange ? salaryRangeLabel(data.careerCheckIn.salaryRange) : "Log your financial snapshot",
      color: "#F59E0B",
    },
    {
      id: "pipeline",
      icon: "🗂️",
      title: "Pipeline",
      stat: `${data.interviewPipeline?.total ?? 0} tracked`,
      sub: data.interviewPipeline?.offers ? `${data.interviewPipeline.offers} offer${data.interviewPipeline.offers !== 1 ? "s" : ""}` : "Track interview activity",
      color: "#EC4899",
    },
  ];

  // NACE footnotes per competency
  const naceFootnotes: Record<string, { short: string; detail: string }> = {
    communication: {
      short: "From oral clarity, WPM, filler rate, and vocal monotone",
      detail: "Scored from speaking session audio signals: communication clarity score (50%), pace in words-per-minute (20%), filler word rate (15%), and vocal monotone (15%). Builds session by session — 30+ sessions needed to reach reliable scores.",
    },
    critical_thinking: {
      short: "From STAR situation/task framing and answer quality",
      detail: "Measured by how well you frame the Situation and Task in STAR-format answers (60%) and overall answer quality (40%). Better context-setting and logical conclusions improve this score over time.",
    },
    professionalism: {
      short: "From confidence, filler rate, and speaking composure",
      detail: "Reflects ownership language, preparation, and composure. Confidence/ownership score (60%), filler rate (25%), and pace (15%). Webcam sessions also contribute head stability as a composure signal.",
    },
    leadership: {
      short: "From STAR action sections — initiative and decision-making",
      detail: "Scored only when your STAR answers contain strong Action sections describing initiative-taking and decision ownership. Speaking about leadership is not the same as demonstrating it — this is a partial signal only.",
    },
    teamwork: {
      short: "From teamwork and collaboration question answers only",
      detail: "Only scored when you answer questions categorized as teamwork, collaboration, or conflict. Other session types don't contribute. Requires deliberate practice with teamwork-category questions to build.",
    },
    career_dev: {
      short: "From sustained engagement: practice volume, check-in, aptitude, checklist",
      detail: "Combines STAR result quality (growth mindset signals), aptitude quiz completion, career check-in, resume analysis, checklist progress, and total practice sessions. This is the slowest-building score — it reflects genuine long-term investment, not one-time actions.",
    },
    technology: {
      short: "From technical question answers and skills extracted from resume",
      detail: "Scored from performance on technical-category questions, plus skills extracted from your resume. Listing skills contributes weakly — demonstrated performance in technical sessions is the stronger signal.",
    },
  };

  const scoreableNace = naceScores.filter(s => s.key !== "equity_inclusion");

  return (
    <div>
      {/* Signal Score hero */}
      <div style={{
        padding: "24px 28px",
        borderRadius: 16,
        border: "1px solid var(--card-border-soft)",
        background: "linear-gradient(135deg, var(--card-bg-strong), var(--card-bg))",
        marginBottom: 20,
        display: "flex",
        alignItems: "center",
        gap: 24,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 90 }}>
          <div style={{ fontSize: 56, fontWeight: 950, color: signalColor, lineHeight: 1 }}>
            {signalScore ?? "—"}
          </div>
          <div style={{ fontSize: 12, fontWeight: 900, color: signalColor }}>{signalLabel}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textAlign: "center" }}>Signal Score</div>
        </div>
        <div style={{ width: 1, height: 60, background: "var(--card-border-soft)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text-primary)", marginBottom: 4 }}>
            {profile.name ? `Hi ${profile.name.split(" ")[0]} —` : "Your career readiness profile"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 520 }}>
            Your Signal Score builds as you practice, complete modules, and log real-world data over time.
            Scores start near zero and grow through sustained engagement — this is a 4–6 year journey.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: completeness >= 75 ? "#10B981" : "#F59E0B" }} />
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>Profile {completeness}% complete</span>
          </div>
          {aptitude && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>
              Aptitude: <span style={{ color: "var(--text-primary)" }}>{aptitude.primary}</span>
            </div>
          )}
        </div>
      </div>

      {/* Section tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        {tiles.map(tile => (
          <div
            key={tile.id}
            onClick={() => onNavigate(tile.id)}
            className="ipc-card-lift"
            style={{
              padding: "18px 20px",
              borderRadius: 14,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 22 }}>{tile.icon}</span>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>→</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 950, color: "var(--text-primary)" }}>{tile.title}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: tile.color }}>{tile.stat}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{tile.sub}</div>
          </div>
        ))}
      </div>

      {/* NACE section: radar + scores side by side */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 24,
        marginBottom: 20,
        alignItems: "start",
      }}>
        {/* Radar chart */}
        <div style={{
          padding: "20px 24px",
          borderRadius: 16,
          border: "1px solid var(--card-border-soft)",
          background: "var(--card-bg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "var(--accent)", letterSpacing: 0.7, textTransform: "uppercase" }}>
            NACE Career Readiness
          </div>
          <NaceRadarChart scores={naceScores} />
          <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", maxWidth: 240, lineHeight: 1.5 }}>
            Polygon expands as you build evidence in each competency. Starts small — grows over time.
          </div>
        </div>

        {/* NACE score list with footnotes */}
        <div style={{
          padding: "20px 24px",
          borderRadius: 16,
          border: "1px solid var(--card-border-soft)",
          background: "var(--card-bg)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "var(--accent)", letterSpacing: 0.7, textTransform: "uppercase", marginBottom: 16 }}>
            Dimension Scores
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {scoreableNace.map(ns => {
              const isOpen = expandedNace === ns.key;
              const note = naceFootnotes[ns.key];
              const scoreNum = ns.score ?? 0;
              const barColor = scoreNum >= 60 ? "#10B981" : scoreNum >= 35 ? "#F59E0B" : "var(--accent)";
              return (
                <div key={ns.key} style={{ borderRadius: 10, overflow: "hidden" }}>
                  <div
                    onClick={() => setExpandedNace(isOpen ? null : ns.key)}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: isOpen ? "var(--accent-soft)" : "transparent",
                      borderRadius: 10,
                      transition: "background 150ms",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{ns.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 950, color: barColor, marginLeft: 12, flexShrink: 0 }}>
                          {ns.score !== null ? ns.score : "—"}
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${scoreNum}%`, background: barColor, borderRadius: 99, transition: "width 0.6s ease" }} />
                      </div>
                      {note && !isOpen && (
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.4 }}>{note.short}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0, transition: "transform 150ms", transform: isOpen ? "rotate(90deg)" : "none" }}>›</div>
                  </div>
                  {isOpen && note && (
                    <div style={{
                      padding: "10px 14px 14px 14px",
                      fontSize: 12,
                      color: "var(--text-muted)",
                      lineHeight: 1.7,
                      background: "var(--accent-soft)",
                      borderTop: "1px solid var(--accent-strong)",
                    }}>
                      {note.detail}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--card-border-soft)" }}>
            <button
              type="button"
              onClick={() => onNavigate("nace")}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                padding: 0,
              }}
            >
              View full NACE breakdown →
            </button>
          </div>
        </div>
      </div>

      {/* Next Action */}
      {nextAction && (
        <a href={nextAction.href} style={{ textDecoration: "none", display: "block", marginBottom: 16 }}>
          <div style={{
            padding: "14px 18px",
            borderRadius: 14,
            border: "1px solid var(--card-border-soft)",
            borderLeft: "3px solid var(--accent)",
            background: "var(--card-bg)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            cursor: "pointer",
          }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>🎯</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 2 }}>Recommended next step</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text-primary)" }}>{nextAction.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{nextAction.description}</div>
            </div>
            <div style={{ color: "var(--accent)", fontSize: 18, flexShrink: 0 }}>→</div>
          </div>
        </a>
      )}
    </div>
  );
}

function SpeakingTab({ data }: { data: ProfilePayload }) {
  const { speaking } = data;

  return (
    <div>
      <SpeakingSection
        title="Interview Prep"
        segment={speaking.interview}
        extra={
          speaking.interview.count > 0 ? (
            <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
              {(["avgComm", "avgConf", "avgWpm"] as const).map((key) => {
                const seg = speaking.interview as InterviewSegment;
                const val = seg[key];
                const labels: Record<string, string> = {
                  avgComm: "Avg comm",
                  avgConf: "Avg confidence",
                  avgWpm: "Avg WPM",
                };
                return (
                  <div key={key}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>
                      {labels[key]}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>
                      {val !== null && val !== undefined ? val : "—"}
                      {key === "avgWpm" && val !== null ? " wpm" : ""}
                      {(key === "avgComm" || key === "avgConf") && val !== null ? "/10" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null
        }
      />

      <SpeakingSection
        title="Networking"
        segment={speaking.networking}
        extra={
          speaking.networking.count > 0 && (speaking.networking as NetworkingSegment).topPitchStyle ? (
            <div style={{ marginBottom: 14 }}>
              <SectionLabel>Top pitch style</SectionLabel>
              {(() => {
                const style = (speaking.networking as NetworkingSegment).topPitchStyle!;
                const c = pitchStyleColor(style);
                return (
                  <span
                    style={{
                      padding: "4px 14px",
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 800,
                      background: c + "18",
                      border: `1px solid ${c}40`,
                      color: c,
                    }}
                  >
                    {style}
                  </span>
                );
              })()}
            </div>
          ) : null
        }
      />

      <SpeakingSection
        title="Public Speaking"
        segment={speaking.publicSpeaking}
        extra={
          speaking.publicSpeaking.count > 0 && (speaking.publicSpeaking as PublicSpeakingSegment).topArchetype ? (
            <div style={{ marginBottom: 14 }}>
              <SectionLabel>Top archetype</SectionLabel>
              {(() => {
                const arch = (speaking.publicSpeaking as PublicSpeakingSegment).topArchetype!;
                const c = archetypeColor(arch);
                return (
                  <span
                    style={{
                      padding: "4px 14px",
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 800,
                      background: c + "18",
                      border: `1px solid ${c}40`,
                      color: c,
                    }}
                  >
                    {arch}
                  </span>
                );
              })()}
            </div>
          ) : null
        }
      />
    </div>
  );
}

function ResumeTab({ data }: { data: ProfilePayload }) {
  const { resumeHistory } = data;

  if (resumeHistory.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>
          No analyses yet. Head to the Resume tab to analyze your resume.
        </div>
      </Card>
    );
  }

  const sorted = [...resumeHistory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Score trend
  let trendNote: string | null = null;
  if (sorted.length > 1) {
    const oldest = sorted[sorted.length - 1].overallScore;
    const newest = sorted[0].overallScore;
    const delta = newest - oldest;
    if (delta > 0) {
      trendNote = `Score improved from ${oldest} → ${newest} over ${sorted.length} analyses`;
    } else if (delta < 0) {
      trendNote = `Score changed from ${oldest} → ${newest} over ${sorted.length} analyses`;
    } else {
      trendNote = `Score held steady at ${newest} over ${sorted.length} analyses`;
    }
  }

  return (
    <div>
      {trendNote && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--card-bg-strong)",
            border: "1px solid var(--card-border-soft)",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-muted)",
            marginBottom: 14,
          }}
        >
          {trendNote}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sorted.map((r) => {
          const labelColor = scoreColor(r.overallScore);
          return (
            <Card key={r.id}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <SmallScoreCircle score={r.overallScore} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
                      {formatDate(r.createdAt)}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 99,
                        fontSize: 10,
                        fontWeight: 800,
                        background: labelColor + "18",
                        border: `1px solid ${labelColor}40`,
                        color: labelColor,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {r.overallLabel}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                      }}
                    >
                      ATS {r.atsScore}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      lineHeight: 1.55,
                      marginBottom: 6,
                    }}
                  >
                    {truncate(r.summary, 180)}
                  </div>
                  {r.topAction && (
                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        background: "var(--card-bg-strong)",
                        border: "1px solid var(--card-border-soft)",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      Top action: {r.topAction}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function FinancialTab({ data }: { data: ProfilePayload }) {
  const { checklist, careerCheckIn } = data;

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }}>
          Checklist Progress
        </div>
        <ProgressBar
          label="Pre-College"
          done={checklist.preCollege.done}
          total={checklist.preCollege.total}
          color="#10B981"
        />
        <ProgressBar
          label="During College"
          done={checklist.duringCollege.done}
          total={checklist.duringCollege.total}
          color="#2563EB"
        />
        <ProgressBar
          label="Post-College"
          done={checklist.postCollege.done}
          total={checklist.postCollege.total}
          color="#8B5CF6"
        />
        <ProgressBar
          label="Financial Literacy Modules"
          done={checklist.financialLiteracy.done}
          total={checklist.financialLiteracy.total}
          color="#F59E0B"
        />
      </Card>

      <Card>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 14 }}>
          Career Check-In
        </div>
        {!careerCheckIn ? (
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Complete a Career Check-In to see your financial profile.{" "}
            <a
              href="/career-checkin"
              style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}
            >
              Go to Career Check-In →
            </a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Employment status */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  padding: "4px 14px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 800,
                  background:
                    employmentStatusColor(careerCheckIn.employmentStatus) + "18",
                  border: `1px solid ${employmentStatusColor(careerCheckIn.employmentStatus)}40`,
                  color: employmentStatusColor(careerCheckIn.employmentStatus),
                }}
              >
                {employmentStatusLabel(careerCheckIn.employmentStatus)}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                as of {formatDate(careerCheckIn.createdAt)}
              </span>
            </div>

            {/* Company / role */}
            {(careerCheckIn.company || careerCheckIn.jobTitle) && (
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  {[careerCheckIn.jobTitle, careerCheckIn.company]
                    .filter(Boolean)
                    .join(" at ")}
                </div>
                {careerCheckIn.industry && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {careerCheckIn.industry}
                  </div>
                )}
              </div>
            )}

            {/* Salary */}
            {careerCheckIn.salaryRange && (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 0.7,
                    color: "var(--text-muted)",
                    marginBottom: 3,
                  }}
                >
                  Salary range
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  {salaryRangeLabel(careerCheckIn.salaryRange)}
                </div>
              </div>
            )}

            {/* Satisfaction */}
            {careerCheckIn.satisfactionScore !== null &&
              careerCheckIn.satisfactionScore !== undefined && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 0.7,
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    Satisfaction
                  </div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        style={{
                          fontSize: 16,
                          color:
                            star <= (careerCheckIn.satisfactionScore ?? 0)
                              ? "#F59E0B"
                              : "var(--card-border-soft)",
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </Card>
    </div>
  );
}

function SkillsTab({
  data,
  onExtract,
  extracting,
}: {
  data: ProfilePayload;
  onExtract: () => void;
  extracting: boolean;
}) {
  const { skills } = data;

  const categoryOrder = [
    "technical",
    "analytical",
    "communication",
    "leadership",
    "interpersonal",
    "domain",
  ];

  const categoryLabels: Record<string, string> = {
    technical: "Technical",
    analytical: "Analytical",
    communication: "Communication",
    leadership: "Leadership",
    interpersonal: "Interpersonal",
    domain: "Domain / Industry",
  };

  const sortedCategories = [
    ...categoryOrder.filter((c) => skills.byCategory[c]?.length > 0),
    ...Object.keys(skills.byCategory).filter(
      (c) => !categoryOrder.includes(c) && skills.byCategory[c]?.length > 0
    ),
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {skills.total} skill{skills.total !== 1 ? "s" : ""} extracted across{" "}
          {sortedCategories.length} categories
        </div>
        <button
          type="button"
          onClick={onExtract}
          disabled={extracting}
          style={{
            padding: "9px 16px",
            borderRadius: 10,
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: extracting ? "not-allowed" : "pointer",
            opacity: extracting ? 0.6 : 1,
            transition: "opacity 140ms",
          }}
        >
          {extracting ? "Extracting…" : "Extract Skills from Sessions"}
        </button>
      </div>

      {sortedCategories.length === 0 ? (
        <Card>
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            Run skill extraction to auto-detect skills from your interview transcripts.
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sortedCategories.map((cat) => {
            const catSkills = skills.byCategory[cat] ?? [];
            return (
              <Card key={cat}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "var(--text-primary)",
                    }}
                  >
                    {categoryLabels[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: "var(--card-bg-strong)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--card-border-soft)",
                    }}
                  >
                    {catSkills.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {catSkills.map((skill) => {
                    const dots = skill.confidence >= 0.8 ? 3 : skill.confidence >= 0.6 ? 2 : 1;
                    return (
                      <div
                        key={skill.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "5px 12px",
                          borderRadius: 99,
                          fontSize: 12,
                          fontWeight: 600,
                          background: "var(--card-bg-strong)",
                          border: "1px solid var(--card-border-soft)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {skill.skill}
                        <span style={{ display: "flex", gap: 2 }}>
                          {[1, 2, 3].map((d) => (
                            <span
                              key={d}
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: d <= dots ? "var(--accent)" : "var(--card-border-soft)",
                                display: "inline-block",
                              }}
                            />
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Instincts Tab ─────────────────────────────────────────────────────────────

const INSTINCT_COLORS: Record<string, string> = {
  teamwork: "#10B981",
  leadership: "#F59E0B",
  communication: "#3B82F6",
  criticalThinking: "#8B5CF6",
  professionalism: "#0EA5E9",
  adaptability: "#EC4899",
  equityInclusion: "#14B8A6",
};

const INSTINCT_ICONS: Record<string, string> = {
  teamwork: "🤝",
  leadership: "⚡",
  communication: "💬",
  criticalThinking: "🧠",
  professionalism: "🏛️",
  adaptability: "🌊",
  equityInclusion: "⚖️",
};

const INSTINCT_LABELS: Record<string, string> = {
  teamwork: "Teamwork",
  leadership: "Leadership",
  communication: "Communication",
  criticalThinking: "Critical Thinking",
  professionalism: "Professionalism",
  adaptability: "Adaptability",
  equityInclusion: "Equity & Inclusion",
};

function InstinctsTab({ data }: { data: ProfilePayload }) {
  const instincts = data.instincts;
  const face = data.faceMetrics;

  if (!instincts || instincts.sessions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
          No instinct data yet
        </div>
        <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
          Play Career Instincts to discover how you naturally navigate workplace situations.
        </p>
        <a
          href="/career-instincts"
          style={{
            display: "inline-block", padding: "12px 28px", borderRadius: 12,
            background: "var(--accent)", color: "#fff", fontWeight: 900, fontSize: 14,
            textDecoration: "none",
          }}
        >
          Play Now →
        </a>
      </div>
    );
  }

  const dims = instincts.dimensions!;
  const sortedDims = Object.keys(dims).sort((a, b) => dims[b] - dims[a]);
  const top2 = sortedDims.slice(0, 2);
  const growth = sortedDims[sortedDims.length - 1];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* XP + sessions header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", borderRadius: 14, padding: "16px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 950, color: "var(--accent)" }}>{instincts.totalXp}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, marginTop: 2 }}>Total XP</div>
        </div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", borderRadius: 14, padding: "16px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 950, color: "var(--text-primary)" }}>{instincts.sessions.length}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, marginTop: 2 }}>Sessions</div>
        </div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", borderRadius: 14, padding: "16px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 950, color: INSTINCT_COLORS[top2[0]] }}>{INSTINCT_ICONS[top2[0]]}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, marginTop: 2 }}>Top Trait</div>
        </div>
      </div>

      {/* Top strengths */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 }}>Your Standout Traits</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {top2.map((d, i) => (
            <div key={d} style={{
              background: INSTINCT_COLORS[d] + "12",
              border: `1px solid ${INSTINCT_COLORS[d]}35`,
              borderRadius: 14, padding: "16px 16px",
            }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{INSTINCT_ICONS[d]}</div>
              <div style={{ fontSize: 10, fontWeight: 900, color: INSTINCT_COLORS[d], letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 }}>
                {i === 0 ? "Strongest" : "Also Strong"}
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text-primary)" }}>
                {INSTINCT_LABELS[d]}
              </div>
              <div style={{ fontSize: 18, fontWeight: 950, color: INSTINCT_COLORS[d], marginTop: 4 }}>
                {Math.round(dims[d] * 100)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All dimensions */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", borderRadius: 16, padding: "20px 22px" }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 16 }}>All Dimensions</div>
        {sortedDims.map((d) => (
          <div key={d} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                {INSTINCT_ICONS[d]} {INSTINCT_LABELS[d]}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: INSTINCT_COLORS[d] }}>{Math.round(dims[d] * 100)}</span>
            </div>
            <div style={{ height: 7, borderRadius: 99, background: "var(--card-bg-strong)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99, background: INSTINCT_COLORS[d], width: `${dims[d] * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Growth area */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 28 }}>🌱</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>Growth Opportunity</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{INSTINCT_LABELS[growth]}</div>
        </div>
        <a href="/career-instincts" style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", fontWeight: 800, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}>
          Play Again
        </a>
      </div>

      {/* Visual Delivery (face metrics) */}
      {face && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 16 }}>
            Visual Delivery · {face.sessionsAnalyzed} session{face.sessionsAnalyzed !== 1 ? "s" : ""} analyzed
          </div>
          {[
            { label: "Eye Contact", value: face.eyeContact, icon: "👁️", description: "Gaze directed toward camera" },
            { label: "Expressiveness", value: face.expressiveness, icon: "😊", description: "Facial movement and engagement" },
            { label: "Head Stability", value: face.headStability, icon: "🎯", description: "Consistent positioning, minimal drift" },
          ].map(({ label, value, icon, description }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{description}</div>
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 900, color: scoreColor(value * 100) }}>
                  {Math.round(value * 100)}%
                </span>
              </div>
              <div style={{ height: 7, borderRadius: 99, background: "var(--card-bg-strong)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, background: scoreColor(value * 100), width: `${value * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent sessions */}
      {instincts.sessions.length > 1 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 }}>Session History</div>
          <div style={{ display: "grid", gap: 10 }}>
            {instincts.sessions.slice(0, 5).map((s, i) => {
              const sd = s.dimensions as Record<string, number>;
              const topDim = Object.keys(sd).sort((a, b) => sd[b] - sd[a])[0];
              return (
                <div key={s.id} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Session {instincts.sessions.length - i}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" · "}
                      {s.scenariosPlayed.length} scenarios
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: INSTINCT_COLORS[topDim] }}>
                      {INSTINCT_ICONS[topDim]} {INSTINCT_LABELS[topDim]}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)", background: "var(--accent-soft)", borderRadius: 99, padding: "3px 10px" }}>
                      +{s.xpEarned} XP
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function NaceTab({ data }: { data: ProfilePayload }) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadNacePdf({
        scores: data.naceScores,
        studentName: data.profile.name ?? undefined,
      });
    } finally {
      setExporting(false);
    }
  }

  const hasScores = data.naceScores.some((s) => s.score !== null);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Based on your speaking sessions and profile data.
        </div>
        {hasScores && (
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            style={{
              padding: "9px 16px",
              borderRadius: 10,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
              color: "var(--text-primary)",
              fontWeight: 700,
              fontSize: 13,
              cursor: exporting ? "not-allowed" : "pointer",
              opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
        )}
      </div>

      {!hasScores ? (
        <Card>
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            Complete practice sessions to generate your NACE competency profile.
          </div>
        </Card>
      ) : (
        <NaceScoreCard scores={data.naceScores} />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MyJourneyPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student-profile");
      if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleExtractSkills() {
    setExtracting(true);
    try {
      await fetch("/api/skills/extract", { method: "POST" });
      await fetchData();
    } catch {
      // silently fail — refresh will show whatever was extracted
    } finally {
      setExtracting(false);
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "speaking", label: "Speaking" },
    { id: "resume", label: "Resume" },
    { id: "financial", label: "Financial" },
    { id: "skills", label: "Skills" },
    { id: "instincts", label: "Instincts" },
    { id: "nace", label: "NACE" },
    { id: "pipeline", label: "Pipeline" },
  ];

  return (
    <PremiumShell
      title="My Journey"
      subtitle="Your complete career readiness profile — speaking, financial health, skills, and real-world pipeline."
    >
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          marginBottom: 20,
          padding: "6px 6px",
          borderRadius: 14,
          background: "var(--card-bg)",
          border: "1px solid var(--card-border-soft)",
          width: "fit-content",
          maxWidth: "100%",
        }}
      >
        {tabs.map((t) => (
          <TabButton
            key={t.id}
            label={t.label}
            active={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
          />
        ))}
      </div>

      {/* Pipeline tab renders InterviewActivityTracker directly, not data-dependent */}
      {activeTab === "pipeline" && (
        <InterviewActivityTracker />
      )}

      {/* All other tabs need data */}
      {activeTab !== "pipeline" && (
        <>
          {loading && <PageSkeleton />}

          {!loading && error && (
            <div
              style={{
                padding: "16px 20px",
                borderRadius: 12,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#EF4444",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {error}{" "}
              <button
                type="button"
                onClick={fetchData}
                style={{
                  background: "none",
                  border: "none",
                  color: "#EF4444",
                  cursor: "pointer",
                  fontWeight: 800,
                  textDecoration: "underline",
                  fontSize: 13,
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {activeTab === "overview" && <OverviewTab data={data} onNavigate={setActiveTab} />}
              {activeTab === "speaking" && <SpeakingTab data={data} />}
              {activeTab === "resume" && <ResumeTab data={data} />}
              {activeTab === "financial" && <FinancialTab data={data} />}
              {activeTab === "skills" && (
                <SkillsTab
                  data={data}
                  onExtract={handleExtractSkills}
                  extracting={extracting}
                />
              )}
              {activeTab === "instincts" && <InstinctsTab data={data} />}
              {activeTab === "nace" && <NaceTab data={data} />}
            </>
          )}
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PremiumShell>
  );
}
