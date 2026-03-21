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
  completeness: number;
  interviewPipeline: {
    total: number;
    byStage: Record<string, number>;
    offers: number;
    accepted: number;
  };
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
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        style={{ fontSize: size * 0.22, fontWeight: 900, fill: "var(--text-primary)" }}
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
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        style={{ fontSize: size * 0.24, fontWeight: 900, fill: color }}
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

function OverviewTab({ data }: { data: ProfilePayload }) {
  const { profile, speaking, aptitude, completeness, skills, resumeHistory } = data;

  const totalSessions =
    speaking.interview.count +
    speaking.networking.count +
    speaking.publicSpeaking.count;

  const profileFields = [
    profile.graduationYear,
    profile.major,
    profile.targetRole,
    profile.targetIndustry,
  ];
  const missingProfileFields = profileFields.filter((v) => !v).length;

  return (
    <div>
      {/* Top grid: ring + stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 20,
          marginBottom: 20,
          alignItems: "start",
        }}
      >
        {/* Completion ring */}
        <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minWidth: 140 }}>
          <ScoreRing value={completeness} size={100} />
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textAlign: "center" }}>
            Profile completeness
          </div>
          {completeness < 100 && (
            <a
              href="/settings"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--accent)",
                textDecoration: "none",
              }}
            >
              Complete your profile →
            </a>
          )}
        </Card>

        {/* Stat cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: 10,
          }}
        >
          <StatCard label="Total sessions" value={totalSessions} sub="interview + networking + speaking" />
          <StatCard label="Skills extracted" value={skills.total} />
          <StatCard label="Resume analyses" value={resumeHistory.length} />
          <StatCard
            label="Pipeline entries"
            value={data.interviewPipeline?.total ?? 0}
            sub="interview activities tracked"
          />
        </div>
      </div>

      {/* Career profile summary */}
      <Card style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
            Career Profile
          </div>
          {missingProfileFields > 0 && (
            <a
              href="/settings"
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--accent)",
                textDecoration: "none",
              }}
            >
              Complete your profile →
            </a>
          )}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {[
            { label: "Graduation Year", value: profile.graduationYear?.toString() },
            { label: "Major", value: profile.major },
            { label: "Target Role", value: profile.targetRole },
            { label: "Target Industry", value: profile.targetIndustry },
          ].map(({ label, value }) => (
            <div key={label}>
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
                {label}
              </div>
              {value ? (
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  {value}
                </div>
              ) : (
                <a
                  href="/settings"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textDecoration: "none",
                    fontStyle: "italic",
                  }}
                >
                  Not set →
                </a>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Aptitude + member since */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 0 }}>
        {aptitude ? (
          <Card>
            <SectionLabel>Aptitude type</SectionLabel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 800,
                  background: "var(--accent-soft)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--card-border-soft)",
                }}
              >
                {aptitude.primary}
              </span>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 700,
                  background: "var(--card-bg-strong)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--card-border-soft)",
                }}
              >
                {aptitude.secondary}
              </span>
            </div>
          </Card>
        ) : (
          <Card>
            <SectionLabel>Aptitude type</SectionLabel>
            <a
              href="/aptitude"
              style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}
            >
              Take aptitude quiz →
            </a>
          </Card>
        )}

        <Card>
          <SectionLabel>Member since</SectionLabel>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            {formatDate(profile.memberSince)}
          </div>
        </Card>
      </div>
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
              {activeTab === "overview" && <OverviewTab data={data} />}
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
      `}</style>
    </PremiumShell>
  );
}
