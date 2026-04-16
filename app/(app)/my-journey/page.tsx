"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";
import { buildUserCoachingProfile } from "@/app/lib/feedback/coachingProfile";
import { ARCHETYPE_COLOR } from "@/app/lib/feedback/archetypes";
import PremiumShell from "@/app/components/PremiumShell";
import NaceScoreCard from "@/app/components/NaceScoreCard";
import InterviewActivityTracker from "@/app/components/InterviewActivityTracker";
import { downloadNacePdf } from "@/app/lib/nace-pdf";
import type { NaceScore } from "@/app/lib/nace";
import {
  Mic,
  Radio,
  Users,
  TrendingUp,
  BookOpen,
  Shield,
  Award,
  BarChart2,
  FileText,
  Zap,
  ChevronRight,
  ChevronDown,
  ArrowRight,
} from "lucide-react";

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
  if (score === null) return "-";
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
  if (!range) return "-";
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

function safeJSONParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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

function SegmentedTabBar({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: { id: TabId; label: string }[];
  activeTab: TabId;
  onSelect: (id: TabId) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        flexWrap: "wrap",
        marginBottom: 20,
        padding: "4px",
        borderRadius: "var(--radius-lg)",
        background: "var(--card-bg-strong)",
        border: "1px solid var(--card-border-soft)",
        width: "fit-content",
        maxWidth: "100%",
      }}
    >
      {tabs.map((t) => {
        const active = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            style={{
              padding: "7px 14px",
              borderRadius: 9,
              border: "none",
              background: active ? "var(--card-bg)" : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: active ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 120ms ease",
              whiteSpace: "nowrap",
              boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function Card({
  children,
  style,
  accentColor,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  accentColor?: string;
}) {
  return (
    <div
      style={{
        padding: "18px 22px",
        borderRadius: 14,
        border: "1px solid var(--card-border-soft)",
        background: "var(--card-bg)",
        borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function MiniBar({
  pct,
  color,
  height = 5,
}: {
  pct: number;
  color: string;
  height?: number;
}) {
  return (
    <div
      style={{
        height,
        borderRadius: "var(--radius-sm)",
        background: "var(--card-border-soft)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: color,
          borderRadius: "var(--radius-sm)",
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

function ProgressMiniRow({
  label,
  done,
  total,
  color,
}: {
  label: string;
  done: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>
          {done}/{total}
        </span>
      </div>
      <MiniBar pct={pct} color={color} height={5} />
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
        fontWeight={700}
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
        fontWeight={700}
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
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.5,
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
        borderRadius: "var(--radius-sm)",
        background: "var(--card-border-soft)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

function EmptyState({
  icon,
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "40px 24px",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "var(--card-bg-strong)",
          border: "1px solid var(--card-border-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          marginBottom: 4,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 340 }}>{body}</div>
      {ctaLabel && ctaHref && (
        <a
          href={ctaHref}
          style={{
            marginTop: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            borderRadius: "var(--radius-md)",
            background: "var(--accent)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          {ctaLabel}
          <ArrowRight size={14} />
        </a>
      )}
    </div>
  );
}

// ── Speaking section card ─────────────────────────────────────────────────────

function SpeakingCard({
  title,
  icon,
  accentColor,
  segment,
  extra,
  emptyHref,
}: {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  segment: SpeakingSegmentBase;
  extra?: React.ReactNode;
  emptyHref?: string;
}) {
  const col = scoreColor(segment.avgScore);

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid var(--card-border-soft)",
        borderLeft: `3px solid ${accentColor}`,
        background: "var(--card-bg)",
        overflow: "hidden",
        marginBottom: 14,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px 20px 14px",
          borderBottom: segment.count > 0 ? "1px solid var(--card-border-soft)" : undefined,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-md)",
            background: accentColor + "18",
            border: `1px solid ${accentColor}35`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: accentColor,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{title}</div>
          {segment.count > 0 && segment.avgScore !== null && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
              Avg score:{" "}
              <span style={{ fontWeight: 700, color: col }}>{segment.avgScore}</span>
              {" · "}
              <span style={{ color: col }}>{scoreLabel(segment.avgScore)}</span>
            </div>
          )}
        </div>
        <div
          style={{
            padding: "3px 10px",
            borderRadius: "var(--radius-sm)",
            fontSize: 11,
            fontWeight: 700,
            background: accentColor + "15",
            border: `1px solid ${accentColor}30`,
            color: accentColor,
            flexShrink: 0,
          }}
        >
          {segment.count} session{segment.count !== 1 ? "s" : ""}
        </div>
      </div>

      {segment.count === 0 ? (
        <EmptyState
          icon={icon}
          title={`No ${title} sessions yet`}
          body={`Complete your first ${title.toLowerCase()} session to start tracking your progress and building your profile.`}
          ctaLabel={`Start ${title}`}
          ctaHref={emptyHref ?? "#"}
        />
      ) : (
        <div style={{ padding: "14px 20px 18px" }}>
          {/* Mini score bar */}
          {segment.avgScore !== null && (
            <div style={{ marginBottom: 14 }}>
              <MiniBar pct={segment.avgScore} color={col} height={6} />
            </div>
          )}

          {extra}

          {/* Recent attempts */}
          {segment.recentAttempts.length > 0 && (
            <div>
              <SectionLabel>Last {segment.recentAttempts.length} sessions</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {segment.recentAttempts.map((a) => {
                  const sc =
                    a.score !== null
                      ? a.score < 15
                        ? Math.round(a.score * 10)
                        : Math.round(a.score)
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
                        borderRadius: 9,
                        background: "var(--card-bg-strong)",
                        border: "1px solid var(--card-border-soft)",
                      }}
                    >
                      <div
                        style={{
                          minWidth: 34,
                          height: 34,
                          borderRadius: "var(--radius-sm)",
                          background: sc !== null ? c + "18" : "var(--card-border-soft)",
                          border: `1px solid ${sc !== null ? c + "40" : "var(--card-border-soft)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          color: sc !== null ? c : "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      >
                        {sc !== null ? sc : "-"}
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
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                          {formatDate(a.ts)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <SkeletonBlock key={i} width={72} height={32} />
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
          borderRadius: 14,
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

// ── NACE Radar Chart ──────────────────────────────────────────────────────────

function NaceRadarChart({ scores }: { scores: NaceScore[] }) {
  const scoreable = scores.filter((s) => s.key !== "equity_inclusion" && s.score !== null);
  const n = scoreable.length;
  if (n < 3) return null;

  const cx = 160;
  const cy = 160;
  const maxR = 110;
  const rings = [20, 40, 60, 80, 100];

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const axisPoint = (i: number, score: number) => {
    const r = (score / 100) * maxR;
    return {
      x: cx + r * Math.cos(angle(i)),
      y: cy + r * Math.sin(angle(i)),
    };
  };

  const labelPoint = (i: number) => {
    const r = maxR + 24;
    return {
      x: cx + r * Math.cos(angle(i)),
      y: cy + r * Math.sin(angle(i)),
    };
  };

  const polyPoints = scoreable.map((s, i) => axisPoint(i, s.score!));
  const polyPath =
    polyPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  const ringPath = (pct: number) => {
    const r = (pct / 100) * maxR;
    return (
      Array.from({ length: n }, (_, i) => {
        const x = (cx + r * Math.cos(angle(i))).toFixed(1);
        const y = (cy + r * Math.sin(angle(i))).toFixed(1);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      }).join(" ") + " Z"
    );
  };

  return (
    <svg width={320} height={320} viewBox="0 0 320 320" style={{ overflow: "visible" }}>
      {rings.map((pct) => (
        <path key={pct} d={ringPath(pct)} fill="none" stroke="var(--card-border)" strokeWidth={1} opacity={0.6} />
      ))}
      {scoreable.map((_, i) => {
        const ep = axisPoint(i, 100);
        return (
          <line key={i} x1={cx} y1={cy} x2={ep.x} y2={ep.y} stroke="var(--card-border)" strokeWidth={1} opacity={0.5} />
        );
      })}
      <path d={polyPath} fill="var(--accent)" fillOpacity={0.15} stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
      {scoreable.map((s, i) => {
        const p = axisPoint(i, s.score!);
        return <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--accent)" />;
      })}
      {scoreable.map((s, i) => {
        const lp = labelPoint(i);
        const ang = angle(i);
        const isLeft = Math.cos(ang) < -0.1;
        const isRight = Math.cos(ang) > 0.1;
        const textAnchor = isLeft ? "end" : isRight ? "start" : "middle";
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
              <tspan key={li} x={lp.x} dy={li === 0 ? 0 : 12}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}
      {[20, 40, 60, 80].map((pct) => (
        <text key={pct} x={cx + 3} y={cy - (pct / 100) * maxR - 3} fontSize={8} fill="var(--text-muted)" opacity={0.7}>
          {pct}
        </text>
      ))}
    </svg>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ data, onNavigate }: { data: ProfilePayload; onNavigate: (tab: TabId) => void }) {
  const { profile, speaking, aptitude, completeness, skills, resumeHistory, signalScore, nextAction, naceScores, checklist, careerCheckIn } = data;
  const [expandedNace, setExpandedNace] = useState<string | null>(null);

  const totalSessions = speaking.interview.count + speaking.networking.count + speaking.publicSpeaking.count;

  const signalColor =
    signalScore === null
      ? "var(--text-muted)"
      : signalScore >= 60
      ? "#10B981"
      : signalScore >= 35
      ? "#F59E0B"
      : "#EF4444";
  const signalLabel =
    signalScore === null
      ? "No score yet"
      : signalScore >= 60
      ? "Building strong"
      : signalScore >= 35
      ? "In progress"
      : "Just starting";

  const checklistTotal =
    checklist.preCollege.total +
    checklist.duringCollege.total +
    checklist.postCollege.total;
  const checklistDone =
    checklist.preCollege.done + checklist.duringCollege.done + checklist.postCollege.done;

  const tiles: Array<{
    id: TabId;
    icon: React.ReactNode;
    title: string;
    stat: string;
    sub: string;
    color: string;
  }> = [
    {
      id: "speaking",
      icon: <Mic size={16} />,
      title: "Speaking",
      stat: `${totalSessions} session${totalSessions !== 1 ? "s" : ""}`,
      sub: speaking.interview.avgScore !== null ? `Avg score: ${speaking.interview.avgScore}` : "No sessions yet",
      color: "#2563EB",
    },
    {
      id: "skills",
      icon: <BarChart2 size={16} />,
      title: "NACE Scores",
      stat: signalScore !== null ? `Score: ${signalScore}` : "Building…",
      sub: "Career readiness framework",
      color: "var(--accent)",
    },
    {
      id: "resume",
      icon: <FileText size={16} />,
      title: "Resume",
      stat: `${resumeHistory.length} analys${resumeHistory.length !== 1 ? "es" : "is"}`,
      sub: resumeHistory.length > 0 ? `Last score: ${resumeHistory[0].overallScore}` : "No analysis yet",
      color: "#8B5CF6",
    },
    {
      id: "skills",
      icon: <Zap size={16} />,
      title: "Career Instincts",
      stat: `${data.instincts?.sessions?.length ?? 0} session${(data.instincts?.sessions?.length ?? 0) !== 1 ? "s" : ""}`,
      sub: data.instincts?.totalXp ? `${data.instincts.totalXp} XP earned` : "Explore your instincts",
      color: "#0EA5E9",
    },
    {
      id: "skills",
      icon: <BookOpen size={16} />,
      title: "Skills",
      stat: `${skills.total} skill${skills.total !== 1 ? "s" : ""}`,
      sub: skills.total > 0 ? `${Object.keys(skills.byCategory).length} categories` : "Extract from resume",
      color: "#10B981",
    },
    {
      id: "financial",
      icon: <TrendingUp size={16} />,
      title: "Financial",
      stat: data.careerCheckIn ? "Check-in done" : "No check-in yet",
      sub: data.careerCheckIn?.salaryRange ? salaryRangeLabel(data.careerCheckIn.salaryRange) : "Log your financial snapshot",
      color: "#F59E0B",
    },
    {
      id: "pipeline",
      icon: <Shield size={16} />,
      title: "Pipeline",
      stat: `${data.interviewPipeline?.total ?? 0} tracked`,
      sub: data.interviewPipeline?.offers ? `${data.interviewPipeline.offers} offer${data.interviewPipeline.offers !== 1 ? "s" : ""}` : "Track interview activity",
      color: "#EC4899",
    },
  ];

  const naceFootnotes: Record<string, { short: string; detail: string }> = {
    communication: {
      short: "From oral clarity, WPM, filler rate, and vocal monotone",
      detail: "Scored from speaking session audio signals: communication clarity score (50%), pace in words-per-minute (20%), filler word rate (15%), and vocal monotone (15%). Builds session by session - 30+ sessions needed to reach reliable scores.",
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
      short: "From STAR action sections - initiative and decision-making",
      detail: "Scored only when your STAR answers contain strong Action sections describing initiative-taking and decision ownership. Speaking about leadership is not the same as demonstrating it - this is a partial signal only.",
    },
    teamwork: {
      short: "From teamwork and collaboration question answers only",
      detail: "Only scored when you answer questions categorized as teamwork, collaboration, or conflict. Other session types don't contribute. Requires deliberate practice with teamwork-category questions to build.",
    },
    career_dev: {
      short: "From sustained engagement: practice volume, check-in, Career Assessment, checklist",
      detail: "Combines STAR result quality (growth mindset signals), Career Assessment completion, career check-in, resume analysis, checklist progress, and total practice sessions. This is the slowest-building score - it reflects genuine long-term investment, not one-time actions.",
    },
    technology: {
      short: "From technical question answers and skills extracted from resume",
      detail: "Scored from performance on technical-category questions, plus skills extracted from your resume. Listing skills contributes weakly - demonstrated performance in technical sessions is the stronger signal.",
    },
  };

  const scoreableNace = naceScores.filter((s) => s.key !== "equity_inclusion");

  return (
    <div>
      {/* ── Hero row: Readiness Index + stat tiles ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr 1fr 1fr",
          gap: 12,
          marginBottom: 16,
          alignItems: "stretch",
        }}
      >
        {/* Readiness Index hero tile */}
        <div
          style={{
            padding: "20px 24px",
            borderRadius: 14,
            border: "1px solid var(--card-border-soft)",
            borderLeft: `3px solid ${signalColor}`,
            background: "var(--card-bg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            minWidth: 120,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Award size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--text-muted)" }}>
              Readiness Index
            </span>
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, color: signalColor, lineHeight: 1 }}>
            {signalScore ?? "-"}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: signalColor }}>{signalLabel}</div>
          {aptitude && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              Aptitude:{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{aptitude.primary}</span>
            </div>
          )}
        </div>

        {/* Stat tile: Sessions */}
        <div
          style={{
            padding: "18px 20px",
            borderRadius: 14,
            border: "1px solid var(--card-border-soft)",
            background: "var(--card-bg)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <SectionLabel>Total Sessions</SectionLabel>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
            {totalSessions}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {speaking.interview.count} interview · {speaking.networking.count} networking · {speaking.publicSpeaking.count} speaking
          </div>
        </div>

        {/* Stat tile: Profile completeness */}
        <div
          style={{
            padding: "18px 20px",
            borderRadius: 14,
            border: "1px solid var(--card-border-soft)",
            background: "var(--card-bg)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <SectionLabel>Profile Complete</SectionLabel>
          <div style={{ fontSize: 32, fontWeight: 700, color: completeness >= 75 ? "#10B981" : "#F59E0B", lineHeight: 1 }}>
            {completeness}%
          </div>
          <MiniBar pct={completeness} color={completeness >= 75 ? "#10B981" : "#F59E0B"} />
        </div>

        {/* Stat tile: Checklist */}
        <div
          style={{
            padding: "18px 20px",
            borderRadius: 14,
            border: "1px solid var(--card-border-soft)",
            background: "var(--card-bg)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <SectionLabel>Checklist</SectionLabel>
          <div style={{ fontSize: 32, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
            {checklistDone}
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-muted)" }}>/{checklistTotal}</span>
          </div>
          <MiniBar pct={checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0} color="#8B5CF6" />
        </div>
      </div>

      {/* ── Next action card ── */}
      {nextAction && (
        <a href={nextAction.href} style={{ textDecoration: "none", display: "block", marginBottom: 16 }}>
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 14,
              border: "1px solid var(--card-border-soft)",
              borderLeft: "3px solid var(--accent)",
              background: "var(--card-bg)",
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
              transition: "background 120ms",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-md)",
                background: "var(--accent-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: "var(--accent)",
              }}
            >
              <Zap size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>
                Recommended next step
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{nextAction.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{nextAction.description}</div>
            </div>
            <ArrowRight size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
          </div>
        </a>
      )}

      {/* ── Section tiles ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, marginBottom: 20 }}>
        {tiles.map((tile) => (
          <div
            key={tile.id}
            onClick={() => onNavigate(tile.id)}
            className="ipc-card-lift"
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid var(--card-border-soft)",
              borderLeft: `3px solid ${tile.color}`,
              background: "var(--card-bg)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: tile.color + "18",
                  border: `1px solid ${tile.color}35`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: tile.color,
                }}
              >
                {tile.icon}
              </div>
              <ChevronRight size={13} color="var(--text-muted)" />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{tile.title}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: tile.color }}>{tile.stat}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{tile.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Career check-in summary ── */}
      {careerCheckIn && (
        <div
          style={{
            padding: "16px 20px",
            borderRadius: 14,
            border: "1px solid var(--card-border-soft)",
            borderLeft: "3px solid #F59E0B",
            background: "var(--card-bg)",
            marginBottom: 16,
          }}
        >
          <SectionLabel>Career Check-In</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--text-muted)", marginBottom: 4 }}>Status</div>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                  fontWeight: 700,
                  background: employmentStatusColor(careerCheckIn.employmentStatus) + "18",
                  border: `1px solid ${employmentStatusColor(careerCheckIn.employmentStatus)}40`,
                  color: employmentStatusColor(careerCheckIn.employmentStatus),
                }}
              >
                {employmentStatusLabel(careerCheckIn.employmentStatus)}
              </span>
            </div>
            {careerCheckIn.salaryRange && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--text-muted)", marginBottom: 4 }}>Salary Range</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{salaryRangeLabel(careerCheckIn.salaryRange)}</div>
              </div>
            )}
            {careerCheckIn.satisfactionScore !== null && careerCheckIn.satisfactionScore !== undefined && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--text-muted)", marginBottom: 4 }}>Satisfaction</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: careerCheckIn.satisfactionScore >= 4 ? "#10B981" : careerCheckIn.satisfactionScore >= 3 ? "#F59E0B" : "#EF4444" }}>
                  {careerCheckIn.satisfactionScore}/5
                </div>
              </div>
            )}
            {(careerCheckIn.jobTitle || careerCheckIn.company) && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--text-muted)", marginBottom: 4 }}>Role</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  {[careerCheckIn.jobTitle, careerCheckIn.company].filter(Boolean).join(" at ")}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Checklist progress card ── */}
      <div
        style={{
          padding: "16px 20px",
          borderRadius: 14,
          border: "1px solid var(--card-border-soft)",
          borderLeft: "3px solid #8B5CF6",
          background: "var(--card-bg)",
          marginBottom: 16,
        }}
      >
        <SectionLabel>Checklist Progress</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <ProgressMiniRow label="Pre-College" done={checklist.preCollege.done} total={checklist.preCollege.total} color="#10B981" />
          <ProgressMiniRow label="During College" done={checklist.duringCollege.done} total={checklist.duringCollege.total} color="#2563EB" />
          <ProgressMiniRow label="Post-College" done={checklist.postCollege.done} total={checklist.postCollege.total} color="#8B5CF6" />
        </div>
      </div>

      {/* ── NACE section: radar + scores ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 16,
          marginBottom: 20,
          alignItems: "start",
        }}
      >
        {/* Radar chart */}
        <div
          style={{
            padding: "18px 22px",
            borderRadius: 14,
            border: "1px solid var(--card-border-soft)",
            background: "var(--card-bg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: 0.4, textTransform: "uppercase" }}>
            NACE Career Readiness
          </div>
          <NaceRadarChart scores={naceScores} />
          <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", maxWidth: 240, lineHeight: 1.5 }}>
            Polygon expands as you build evidence in each competency.
          </div>
        </div>

        {/* NACE score list */}
        <div
          style={{
            padding: "18px 22px",
            borderRadius: 14,
            border: "1px solid var(--card-border-soft)",
            background: "var(--card-bg)",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 14 }}>
            Dimension Scores
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {scoreableNace.map((ns) => {
              const isOpen = expandedNace === ns.key;
              const note = naceFootnotes[ns.key];
              const scoreNum = ns.score ?? 0;
              const barColor = scoreNum >= 60 ? "#10B981" : scoreNum >= 35 ? "#F59E0B" : "var(--accent)";
              return (
                <div key={ns.key} style={{ borderRadius: 9, overflow: "hidden" }}>
                  <div
                    onClick={() => setExpandedNace(isOpen ? null : ns.key)}
                    style={{
                      padding: "9px 11px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: isOpen ? "var(--accent-soft)" : "transparent",
                      borderRadius: 9,
                      transition: "background 150ms",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{ns.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: barColor, marginLeft: 12, flexShrink: 0 }}>
                          {ns.score !== null ? ns.score : "-"}
                        </span>
                      </div>
                      <MiniBar pct={scoreNum} color={barColor} height={4} />
                      {note && !isOpen && (
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.4 }}>{note.short}</div>
                      )}
                    </div>
                    <ChevronDown
                      size={12}
                      color="var(--text-muted)"
                      style={{ flexShrink: 0, transition: "transform 150ms", transform: isOpen ? "rotate(180deg)" : "none" }}
                    />
                  </div>
                  {isOpen && note && (
                    <div
                      style={{
                        padding: "10px 14px 14px 14px",
                        fontSize: 12,
                        color: "var(--text-muted)",
                        lineHeight: 1.7,
                        background: "var(--accent-soft)",
                        borderTop: "1px solid var(--accent-strong)",
                      }}
                    >
                      {note.detail}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--card-border-soft)" }}>
            <button
              type="button"
              onClick={() => onNavigate("nace")}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              View full NACE breakdown
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Coaching Insights Card (tasks 6, 7, 8) ───────────────────────────────────

const DIM_LABELS: Record<string, string> = {
  structure: "Structure",
  evidence: "Evidence",
  ownership: "Ownership",
  communication: "Communication",
  confidence: "Confidence",
  role_alignment: "Role Alignment",
  delivery: "Delivery",
};
const DIM_ORDER = ["structure", "evidence", "ownership", "communication", "confidence", "role_alignment", "delivery"];

function CoachingInsightsCard({ history }: { history: any[] }) {
  const coachingProfile = useMemo(() => {
    if (history.length < 2) return null;
    return buildUserCoachingProfile(history);
  }, [history]);

  // Dimension trends: last 5 sessions that have dimension_scores
  const dimTrendSessions = useMemo(() => {
    return history
      .filter(h => h.feedback?.dimension_scores && typeof h.feedback.dimension_scores === "object")
      .slice(0, 5)
      .reverse(); // oldest → newest
  }, [history]);

  // Archetype evolution: last 8 sessions with an archetype
  const archetypeHistory = useMemo(() => {
    return history
      .filter(h => h.feedback?.delivery_archetype)
      .slice(0, 8)
      .map(h => ({
        archetype: h.feedback.delivery_archetype as string,
        ts: h.ts as number,
        score: typeof h.score === "number" ? h.score : null,
      }));
  }, [history]);

  if (!coachingProfile && dimTrendSessions.length === 0 && archetypeHistory.length === 0) return null;

  const { categoryPerformance, resolvedWeaknesses } = coachingProfile ?? { categoryPerformance: [], resolvedWeaknesses: [] };

  return (
    <div style={{ marginTop: 16 }}>
      <Card accentColor="#2563EB">
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 16 }}>
          Interview Coaching Insights
        </div>

        {/* Category Performance */}
        {categoryPerformance.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 10 }}>
              By Question Category
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
              {categoryPerformance.map(cat => {
                const pct = Math.min(100, Math.max(0, cat.avgScore));
                const color = pct >= 75 ? "#10B981" : pct >= 55 ? "#F59E0B" : "#EF4444";
                return (
                  <div key={cat.category}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "capitalize" as const }}>
                        {cat.category.replace(/_/g, " ")}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color }}>
                        {Math.round(pct)}
                        <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)" }}> / {cat.attempts} sessions</span>
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "var(--card-border-soft)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Resolved Weaknesses */}
        {resolvedWeaknesses.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 8 }}>
              Resolved Issues
            </div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
              {resolvedWeaknesses.map(key => (
                <span key={key} style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 11,
                  fontWeight: 600,
                  background: "#10B98118",
                  border: "1px solid #10B98140",
                  color: "#10B981",
                }}>
                  ✓ {key.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Dimension Trend Chart */}
        {dimTrendSessions.length >= 2 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 10 }}>
              Dimension Trends (last {dimTrendSessions.length} sessions)
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 7 }}>
              {DIM_ORDER.map(key => {
                const scores = dimTrendSessions.map(s => {
                  const d = s.feedback.dimension_scores?.[key];
                  return typeof d?.score === "number" ? d.score : null;
                }).filter((v): v is number => v !== null);
                if (scores.length < 2) return null;
                const latest = scores[scores.length - 1];
                const first = scores[0];
                const delta = latest - first;
                const arrowColor = delta > 0.3 ? "#10B981" : delta < -0.3 ? "#EF4444" : "var(--text-muted)";
                const arrow = delta > 0.3 ? "↑" : delta < -0.3 ? "↓" : "→";
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 88, fontSize: 11, color: "var(--text-secondary)", flexShrink: 0 }}>
                      {DIM_LABELS[key] ?? key}
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 2 }}>
                      {scores.map((s, i) => (
                        <div key={i} style={{
                          flex: 1,
                          height: 20,
                          borderRadius: 3,
                          background: `rgba(37,99,235,${Math.min(1, s / 10 * 0.85 + 0.1)})`,
                          position: "relative" as const,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", opacity: 0.9 }}>
                            {s.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ width: 16, fontSize: 13, color: arrowColor, fontWeight: 700, flexShrink: 0, textAlign: "center" as const }}>
                      {arrow}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Archetype Evolution Timeline */}
        {archetypeHistory.length >= 2 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-muted)", textTransform: "uppercase" as const, marginBottom: 10 }}>
              Delivery Pattern History
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
              {archetypeHistory.map((item, i) => {
                const c = (ARCHETYPE_COLOR as Record<string, string>)[item.archetype] ?? "var(--accent)";
                const date = new Date(item.ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                const isLatest = i === archetypeHistory.length - 1;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0, opacity: isLatest ? 1 : 0.5 }} />
                    <span style={{
                      fontSize: 12, fontWeight: isLatest ? 700 : 500,
                      color: isLatest ? "var(--text-primary)" : "var(--text-secondary)",
                      flex: 1,
                    }}>
                      {item.archetype}
                    </span>
                    {item.score !== null && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {Math.round(item.score * 10)}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Speaking Tab ──────────────────────────────────────────────────────────────

function SpeakingTab({ data, history }: { data: ProfilePayload; history: any[] }) {
  const { speaking } = data;

  return (
    <div>
      <SpeakingCard
        title="Interview Prep"
        icon={<Mic size={16} />}
        accentColor="#2563EB"
        segment={speaking.interview}
        emptyHref="/practice"
        extra={
          speaking.interview.count > 0 ? (
            <div style={{ display: "flex", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
              {speaking.interview.avgWpm !== null && speaking.interview.avgWpm !== undefined && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 0.4, marginBottom: 2 }}>
                    Avg WPM
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                    {(speaking.interview as InterviewSegment).avgWpm}
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}> wpm</span>
                  </div>
                </div>
              )}
            </div>
          ) : null
        }
      />

      <SpeakingCard
        title="Networking"
        icon={<Users size={16} />}
        accentColor="#10B981"
        segment={speaking.networking}
        emptyHref="/networking"
        extra={
          speaking.networking.count > 0 && (speaking.networking as NetworkingSegment).topPitchStyle ? (
            <div style={{ marginBottom: 14 }}>
              <SectionLabel>Top Pitch Style</SectionLabel>
              {(() => {
                const style = (speaking.networking as NetworkingSegment).topPitchStyle!;
                const c = pitchStyleColor(style);
                return (
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                      fontWeight: 700,
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

      <SpeakingCard
        title="Public Speaking"
        icon={<Radio size={16} />}
        accentColor="#8B5CF6"
        segment={speaking.publicSpeaking}
        emptyHref="/public-speaking"
        extra={
          speaking.publicSpeaking.count > 0 && (speaking.publicSpeaking as PublicSpeakingSegment).topArchetype ? (
            <div style={{ marginBottom: 14 }}>
              <SectionLabel>Top Archetype</SectionLabel>
              {(() => {
                const arch = (speaking.publicSpeaking as PublicSpeakingSegment).topArchetype!;
                const c = archetypeColor(arch);
                return (
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                      fontWeight: 700,
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

      <CoachingInsightsCard history={history} />
    </div>
  );
}

// ── Resume Tab ────────────────────────────────────────────────────────────────

function ResumeTab({ data }: { data: ProfilePayload }) {
  const { resumeHistory } = data;

  if (resumeHistory.length === 0) {
    return (
      <Card accentColor="#8B5CF6">
        <EmptyState
          icon={<FileText size={20} />}
          title="No resume analyses yet"
          body="Upload your resume to get an ATS score, strength breakdown, and personalized action items."
          ctaLabel="Analyze Resume"
          ctaHref="/resume"
        />
      </Card>
    );
  }

  const sorted = [...resumeHistory].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  let trendNote: string | null = null;
  if (sorted.length > 1) {
    const oldest = sorted[sorted.length - 1].overallScore;
    const newest = sorted[0].overallScore;
    const delta = newest - oldest;
    if (delta > 0) {
      trendNote = `Score improved from ${oldest} to ${newest} over ${sorted.length} analyses`;
    } else if (delta < 0) {
      trendNote = `Score changed from ${oldest} to ${newest} over ${sorted.length} analyses`;
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
            borderRadius: 9,
            background: "var(--card-bg-strong)",
            border: "1px solid var(--card-border-soft)",
            borderLeft: "3px solid #8B5CF6",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-muted)",
            marginBottom: 14,
          }}
        >
          {trendNote}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((r) => {
          const labelColor = scoreColor(r.overallScore);
          return (
            <div
              key={r.id}
              style={{
                padding: "16px 20px",
                borderRadius: 14,
                border: "1px solid var(--card-border-soft)",
                borderLeft: `3px solid ${labelColor}`,
                background: "var(--card-bg)",
              }}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <SmallScoreCircle score={r.overallScore} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 5,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
                      {formatDate(r.createdAt)}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 10,
                        fontWeight: 700,
                        background: labelColor + "18",
                        border: `1px solid ${labelColor}40`,
                        color: labelColor,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {r.overallLabel}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>
                      ATS {r.atsScore}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 6 }}>
                    {truncate(r.summary, 180)}
                  </div>
                  {r.topAction && (
                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: "var(--radius-sm)",
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Financial Tab ─────────────────────────────────────────────────────────────

function FinancialTab({ data }: { data: ProfilePayload }) {
  const { checklist, careerCheckIn } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Checklist card */}
      <Card accentColor="#F59E0B">
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
          Checklist Progress
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ProgressMiniRow label="Pre-College" done={checklist.preCollege.done} total={checklist.preCollege.total} color="#10B981" />
          <ProgressMiniRow label="During College" done={checklist.duringCollege.done} total={checklist.duringCollege.total} color="#2563EB" />
          <ProgressMiniRow label="Post-College" done={checklist.postCollege.done} total={checklist.postCollege.total} color="#8B5CF6" />
          <ProgressMiniRow label="Financial Literacy Modules" done={checklist.financialLiteracy.done} total={checklist.financialLiteracy.total} color="#F59E0B" />
        </div>
      </Card>

      {/* Career check-in card */}
      <Card accentColor="#10B981">
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>
          Career Check-In
        </div>
        {!careerCheckIn ? (
          <EmptyState
            icon={<TrendingUp size={20} />}
            title="No check-in yet"
            body="Log your employment status, salary range, and satisfaction to track your financial health over time."
            ctaLabel="Complete Check-In"
            ctaHref="/career-checkin"
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Employment status */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                  fontWeight: 700,
                  background: employmentStatusColor(careerCheckIn.employmentStatus) + "18",
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

            {(careerCheckIn.company || careerCheckIn.jobTitle) && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                  {[careerCheckIn.jobTitle, careerCheckIn.company].filter(Boolean).join(" at ")}
                </div>
                {careerCheckIn.industry && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{careerCheckIn.industry}</div>
                )}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {careerCheckIn.salaryRange && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--text-muted)", marginBottom: 4 }}>
                    Salary Range
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                    {salaryRangeLabel(careerCheckIn.salaryRange)}
                  </div>
                </div>
              )}

              {careerCheckIn.satisfactionScore !== null && careerCheckIn.satisfactionScore !== undefined && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--text-muted)", marginBottom: 4 }}>
                    Satisfaction
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          background: n <= (careerCheckIn.satisfactionScore ?? 0) ? "#F59E0B" : "var(--card-border-soft)",
                        }}
                      />
                    ))}
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B", marginLeft: 4 }}>
                      {careerCheckIn.satisfactionScore}/5
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Skills Tab ────────────────────────────────────────────────────────────────

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

  const categoryOrder = ["technical", "analytical", "communication", "leadership", "interpersonal", "domain"];

  const categoryLabels: Record<string, string> = {
    technical: "Technical",
    analytical: "Analytical",
    communication: "Communication",
    leadership: "Leadership",
    interpersonal: "Interpersonal",
    domain: "Domain / Industry",
  };

  const categoryColors: Record<string, string> = {
    technical: "#2563EB",
    analytical: "#8B5CF6",
    communication: "#10B981",
    leadership: "#F59E0B",
    interpersonal: "#0EA5E9",
    domain: "#EC4899",
  };

  const sortedCategories = [
    ...categoryOrder.filter((c) => skills.byCategory[c]?.length > 0),
    ...Object.keys(skills.byCategory).filter((c) => !categoryOrder.includes(c) && skills.byCategory[c]?.length > 0),
  ];

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
          {skills.total} skill{skills.total !== 1 ? "s" : ""} across {sortedCategories.length} categories
        </div>
        <button
          type="button"
          onClick={onExtract}
          disabled={extracting}
          style={{
            padding: "9px 16px",
            borderRadius: "var(--radius-md)",
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
        <Card accentColor="#10B981">
          <EmptyState
            icon={<BookOpen size={20} />}
            title="No skills extracted yet"
            body="Run skill extraction to automatically detect skills from your interview transcripts and resume."
            ctaLabel="Extract Skills"
            ctaHref="#"
          />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sortedCategories.map((cat) => {
            const catSkills = skills.byCategory[cat] ?? [];
            const catColor = categoryColors[cat] ?? "var(--accent)";
            return (
              <div
                key={cat}
                style={{
                  padding: "16px 20px",
                  borderRadius: 14,
                  border: "1px solid var(--card-border-soft)",
                  borderLeft: `3px solid ${catColor}`,
                  background: "var(--card-bg)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                    {categoryLabels[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      background: catColor + "15",
                      color: catColor,
                      border: `1px solid ${catColor}30`,
                    }}
                  >
                    {catSkills.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {catSkills.map((skill) => {
                    const dots = skill.confidence >= 0.8 ? 3 : skill.confidence >= 0.6 ? 2 : 1;
                    return (
                      <div
                        key={skill.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "4px 10px",
                          borderRadius: "var(--radius-sm)",
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
                                background: d <= dots ? catColor : "var(--card-border-soft)",
                                display: "inline-block",
                              }}
                            />
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
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
      <Card accentColor="#0EA5E9">
        <EmptyState
          icon={<Zap size={20} />}
          title="No instinct data yet"
          body="Play Career Instincts to discover how you naturally navigate workplace situations. Each session reveals your behavioral tendencies."
          ctaLabel="Play Career Instincts"
          ctaHref="/career-instincts"
        />
      </Card>
    );
  }

  const dims = instincts.dimensions!;
  const sortedDims = Object.keys(dims).sort((a, b) => dims[b] - dims[a]);
  const top2 = sortedDims.slice(0, 2);
  const growth = sortedDims[sortedDims.length - 1];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* XP + sessions header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border-soft)",
            borderLeft: "3px solid var(--accent)",
            borderRadius: 14,
            padding: "14px 18px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>{instincts.totalXp}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.4 }}>Total XP</div>
        </div>
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border-soft)",
            borderRadius: 14,
            padding: "14px 18px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{instincts.sessions.length}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.4 }}>Sessions</div>
        </div>
        <div
          style={{
            background: INSTINCT_COLORS[top2[0]] + "12",
            border: `1px solid ${INSTINCT_COLORS[top2[0]]}30`,
            borderRadius: 14,
            padding: "14px 18px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: INSTINCT_COLORS[top2[0]] }}>{INSTINCT_LABELS[top2[0]]}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.4 }}>Top Trait</div>
        </div>
      </div>

      {/* Top strengths */}
      <div>
        <SectionLabel>Standout Traits</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {top2.map((d, i) => (
            <div
              key={d}
              style={{
                background: INSTINCT_COLORS[d] + "12",
                border: `1px solid ${INSTINCT_COLORS[d]}35`,
                borderLeft: `3px solid ${INSTINCT_COLORS[d]}`,
                borderRadius: 14,
                padding: "16px 18px",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: INSTINCT_COLORS[d], letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 }}>
                {i === 0 ? "Strongest" : "Also Strong"}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                {INSTINCT_LABELS[d]}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: INSTINCT_COLORS[d], marginTop: 4 }}>
                {Math.round(dims[d] * 100)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All dimensions */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border-soft)",
          borderRadius: 14,
          padding: "18px 20px",
        }}
      >
        <SectionLabel>All Dimensions</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sortedDims.map((d) => (
            <div key={d}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  {INSTINCT_LABELS[d]}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: INSTINCT_COLORS[d] }}>{Math.round(dims[d] * 100)}</span>
              </div>
              <MiniBar pct={dims[d] * 100} color={INSTINCT_COLORS[d]} height={6} />
            </div>
          ))}
        </div>
      </div>

      {/* Growth area */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border-soft)",
          borderLeft: "3px solid #10B981",
          borderRadius: 14,
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "var(--radius-md)",
            background: "#10B98118",
            border: "1px solid #10B98135",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#10B981",
            flexShrink: 0,
          }}
        >
          <TrendingUp size={17} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 2 }}>
            Growth Opportunity
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{INSTINCT_LABELS[growth]}</div>
        </div>
        <a
          href="/career-instincts"
          style={{
            padding: "8px 14px",
            borderRadius: 9,
            background: "var(--accent-soft)",
            color: "var(--accent)",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Play Again
        </a>
      </div>

      {/* Visual Delivery (face metrics) */}
      {face && (
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border-soft)",
            borderLeft: "3px solid #3B82F6",
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <SectionLabel>
            Visual Delivery · {face.sessionsAnalyzed} session{face.sessionsAnalyzed !== 1 ? "s" : ""} analyzed
          </SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Eye Contact", value: face.eyeContact, description: "Gaze directed toward camera" },
              { label: "Expressiveness", value: face.expressiveness, description: "Facial movement and engagement" },
              { label: "Head Stability", value: face.headStability, description: "Consistent positioning, minimal drift" },
            ].map(({ label, value, description }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{description}</div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(value * 100) }}>
                    {Math.round(value * 100)}%
                  </span>
                </div>
                <MiniBar pct={value * 100} color={scoreColor(value * 100)} height={6} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {instincts.sessions.length > 1 && (
        <div>
          <SectionLabel>Session History</SectionLabel>
          <div style={{ display: "grid", gap: 8 }}>
            {instincts.sessions.slice(0, 5).map((s, i) => {
              const sd = s.dimensions as Record<string, number>;
              const topDim = Object.keys(sd).sort((a, b) => sd[b] - sd[a])[0];
              return (
                <div
                  key={s.id}
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border-soft)",
                    borderRadius: 11,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                      Session {instincts.sessions.length - i}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" · "}
                      {s.scenariosPlayed.length} scenarios
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: INSTINCT_COLORS[topDim] }}>
                      {INSTINCT_LABELS[topDim]}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--accent)",
                        background: "var(--accent-soft)",
                        borderRadius: "var(--radius-sm)",
                        padding: "3px 10px",
                      }}
                    >
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

// ── NACE Tab ──────────────────────────────────────────────────────────────────

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
  const signalColor =
    data.signalScore === null
      ? "var(--text-muted)"
      : data.signalScore >= 60
      ? "#10B981"
      : data.signalScore >= 35
      ? "#F59E0B"
      : "#EF4444";

  return (
    <div>
      {/* NACE explanation header */}
      <div
        style={{
          padding: "16px 20px",
          borderRadius: 14,
          border: "1px solid var(--card-border-soft)",
          borderLeft: "3px solid var(--accent)",
          background: "var(--card-bg)",
          marginBottom: 16,
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--accent)", marginBottom: 6 }}>
            About NACE Career Competencies
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>
            The National Association of Colleges and Employers (NACE) defines 8 career readiness competencies that employers consistently rank as most critical for new graduates. Your scores are calculated from your speaking sessions, resume data, and profile activity - they build up over time as you practice.
          </p>
        </div>
        {data.signalScore !== null && (
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--text-muted)", marginBottom: 6 }}>
              Readiness Index
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: signalColor, lineHeight: 1 }}>
              {data.signalScore}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
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
              padding: "8px 16px",
              borderRadius: "var(--radius-md)",
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
        <Card accentColor="var(--accent)">
          <EmptyState
            icon={<BarChart2 size={20} />}
            title="No NACE scores yet"
            body="Complete practice sessions to generate your NACE career competency profile. Scores build up over multiple sessions."
            ctaLabel="Start Practicing"
            ctaHref="/practice"
          />
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
  const [history, setHistory] = useState<any[]>([]);
  const { data: session, status } = useSession();
  const historyKey = useMemo(() => userScopedKey("ipc_history", session), [session]);

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

  // Load practice history for coaching insights (API-first, localStorage fallback)
  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    (async () => {
      try {
        if (session?.user) {
          const res = await fetch("/api/attempts?limit=200", { cache: "no-store" });
          if (res.ok) {
            const d = await res.json();
            const attempts = Array.isArray(d?.attempts) ? d.attempts : [];
            if (!cancelled && attempts.length > 0) { setHistory(attempts); return; }
          }
        }
        const saved = safeJSONParse<any[]>(localStorage.getItem(historyKey), []);
        if (!cancelled) setHistory(Array.isArray(saved) ? saved : []);
      } catch {
        const saved = safeJSONParse<any[]>(localStorage.getItem(historyKey), []);
        if (!cancelled) setHistory(Array.isArray(saved) ? saved : []);
      }
    })();
    return () => { cancelled = true; };
  }, [status, session, historyKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleExtractSkills() {
    setExtracting(true);
    try {
      await fetch("/api/skills/extract", { method: "POST" });
      await fetchData();
    } catch {
      // silently fail - refresh will show whatever was extracted
    } finally {
      setExtracting(false);
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "speaking", label: "Speaking" },
    { id: "resume", label: "Resume" },
    { id: "financial", label: "Financial" },
    { id: "skills", label: "Skills & Competencies" },
    { id: "pipeline", label: "Pipeline" },
  ];

  return (
    <PremiumShell
      title="My Journey"
      subtitle="Your complete career readiness profile - speaking, financial health, skills, and real-world pipeline."
    >
      {/* Tab bar */}
      <SegmentedTabBar tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />

      {/* Pipeline tab renders InterviewActivityTracker directly, not data-dependent */}
      {activeTab === "pipeline" && <InterviewActivityTracker />}

      {/* All other tabs need data */}
      {activeTab !== "pipeline" && (
        <>
          {loading && <PageSkeleton />}

          {!loading && error && (
            <div
              style={{
                padding: "14px 18px",
                borderRadius: "var(--radius-lg)",
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
                  fontWeight: 700,
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
              {activeTab === "speaking" && <SpeakingTab data={data} history={history} />}
              {activeTab === "resume" && <ResumeTab data={data} />}
              {activeTab === "financial" && <FinancialTab data={data} />}
              {activeTab === "skills" && (
                <>
                  <SkillsTab data={data} onExtract={handleExtractSkills} extracting={extracting} />
                  <NaceTab data={data} />
                  <InstinctsTab data={data} />
                </>
              )}
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
