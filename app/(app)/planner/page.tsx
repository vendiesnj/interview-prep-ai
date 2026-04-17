"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Target, Flame, Star, Zap, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import PremiumShell from "@/app/components/PremiumShell";
import { userScopedKey } from "@/app/lib/userStorage";

// ── Types ─────────────────────────────────────────────────────────────────────

type StreakData = { current: number; longest: number; totalActiveDays: number };

type Attempt = {
  ts?: number;
  evaluationFramework?: string | null;
  score?: number;
  communication_score?: number | null;
};

type WeeklyGoalConfig = {
  sessionsPerWeek: number;
  updatedAt: number;
};

// ── Milestones ────────────────────────────────────────────────────────────────

type Milestone = {
  id: string;
  label: string;
  description: string;
  icon: string;
  check: (args: { totalSessions: number; streak: number; longest: number; moduleCount: number; mockCount: number; psCount: number }) => boolean;
};

const MILESTONES: Milestone[] = [
  { id: "first_session",    label: "First Step",          description: "Complete your first practice session",          icon: "🎯", check: ({ totalSessions }) => totalSessions >= 1 },
  { id: "5_sessions",       label: "Getting Momentum",    description: "Complete 5 sessions",                           icon: "🚀", check: ({ totalSessions }) => totalSessions >= 5 },
  { id: "10_sessions",      label: "Consistent Practicer",description: "Complete 10 sessions",                          icon: "💪", check: ({ totalSessions }) => totalSessions >= 10 },
  { id: "25_sessions",      label: "Dedicated",           description: "Complete 25 sessions",                          icon: "🏆", check: ({ totalSessions }) => totalSessions >= 25 },
  { id: "3_streak",         label: "On a Roll",           description: "3-day practice streak",                         icon: "🔥", check: ({ streak }) => streak >= 3 },
  { id: "7_streak",         label: "Week Strong",         description: "7-day practice streak",                         icon: "⚡", check: ({ streak }) => streak >= 7 },
  { id: "14_streak",        label: "Habit Builder",       description: "14-day practice streak",                        icon: "🌟", check: ({ streak }) => streak >= 14 },
  { id: "multi_module",     label: "Well-Rounded",        description: "Practice 3 different module types",             icon: "🎭", check: ({ moduleCount }) => moduleCount >= 3 },
  { id: "mock_first",       label: "Mock Interview Done", description: "Complete your first mock interview",            icon: "🤝", check: ({ mockCount }) => mockCount >= 1 },
  { id: "public_speaking",  label: "Public Speaker",      description: "Complete a public speaking session",            icon: "🎤", check: ({ psCount }) => psCount >= 1 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeJSONParse<T>(raw: string | null, fallback: T): T {
  try { return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}

function startOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d;
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

// Get the 7 days of this week (Sun–Sat)
function thisWeekDays(): Date[] {
  const sunday = startOfWeek();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function moduleLabel(fw: string | null | undefined): string {
  switch (fw) {
    case "interview":        return "Interview";
    case "mock_interview":   return "Mock Interview";
    case "public_speaking":  return "Public Speaking";
    case "networking":       return "Networking";
    case "clarity_drill":    return "Clarity Drill";
    default:                 return "Practice";
  }
}

const MODULE_COLORS: Record<string, string> = {
  interview:       "#4F46E5",
  mock_interview:  "#7C3AED",
  public_speaking: "#D97706",
  networking:      "#10B981",
  clarity_drill:   "#DC2626",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function PlannerPage() {
  const { data: session, status } = useSession();
  const email = session?.user?.email ?? null;

  const [streak, setStreak] = useState<StreakData | null>(null);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [goalConfig, setGoalConfig] = useState<WeeklyGoalConfig>({ sessionsPerWeek: 3, updatedAt: 0 });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(3);

  const GOAL_KEY = email ? `signal_weekly_goal::${email}` : "signal_weekly_goal";

  useEffect(() => {
    fetch("/api/streak").then(r => r.json()).then(d => { if (!d.error) setStreak(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!email) return;
    const key = userScopedKey("ipc_history", email);
    const raw = localStorage.getItem(key) ?? localStorage.getItem("ipc_history");
    setHistory(safeJSONParse<Attempt[]>(raw, []));
    const gRaw = localStorage.getItem(GOAL_KEY);
    if (gRaw) setGoalConfig(safeJSONParse(gRaw, { sessionsPerWeek: 3, updatedAt: 0 }));
  }, [email, GOAL_KEY]);

  // This week's sessions
  const weekDays = useMemo(() => thisWeekDays(), []);
  const sessionsThisWeek = useMemo(() => {
    const weekStart = startOfWeek().getTime();
    return history.filter(a => (a.ts ?? 0) >= weekStart);
  }, [history]);

  const sessionsByDay = useMemo(() => {
    return weekDays.map(day => ({
      day,
      sessions: sessionsThisWeek.filter(a => isSameDay(new Date(a.ts ?? 0), day)),
    }));
  }, [weekDays, sessionsThisWeek]);

  const weekProgress = Math.min(sessionsThisWeek.length / goalConfig.sessionsPerWeek, 1);
  const weekDone = sessionsThisWeek.length >= goalConfig.sessionsPerWeek;

  // Milestone computation
  const milestoneArgs = useMemo(() => {
    const totalSessions = history.length;
    const frameworks = new Set(history.map(a => a.evaluationFramework ?? "interview"));
    const moduleCount = frameworks.size;
    const mockCount = history.filter(a => a.evaluationFramework === "mock_interview").length;
    const psCount = history.filter(a => a.evaluationFramework === "public_speaking").length;
    return { totalSessions, streak: streak?.current ?? 0, longest: streak?.longest ?? 0, moduleCount, mockCount, psCount };
  }, [history, streak]);

  const milestoneStatus = useMemo(() => MILESTONES.map(m => ({ ...m, earned: m.check(milestoneArgs) })), [milestoneArgs]);
  const earnedCount = milestoneStatus.filter(m => m.earned).length;

  // Suggested practice mix
  const practiceGaps = useMemo(() => {
    const weekSessions = sessionsThisWeek.length;
    const fwCounts: Record<string, number> = {};
    for (const a of sessionsThisWeek) {
      const fw = a.evaluationFramework ?? "interview";
      fwCounts[fw] = (fwCounts[fw] ?? 0) + 1;
    }

    const suggestions: { label: string; href: string; color: string; reason: string }[] = [];
    const needed = Math.max(0, goalConfig.sessionsPerWeek - weekSessions);

    if (needed <= 0) return suggestions;

    const modules = [
      { fw: "interview", label: "Interview Practice", href: "/practice", color: MODULE_COLORS.interview },
      { fw: "mock_interview", label: "Mock Interview", href: "/mock-interview", color: MODULE_COLORS.mock_interview },
      { fw: "public_speaking", label: "Public Speaking", href: "/public-speaking", color: MODULE_COLORS.public_speaking },
      { fw: "clarity_drill", label: "Clarity Drill", href: "/clarity", color: MODULE_COLORS.clarity_drill },
    ];

    // Prioritize modules not yet done this week
    const notDoneThisWeek = modules.filter(m => !fwCounts[m.fw]);
    for (const m of notDoneThisWeek.slice(0, needed)) {
      suggestions.push({ ...m, reason: "Not practiced this week" });
    }

    // Fill with most useful if still short
    if (suggestions.length < needed) {
      const interviewDone = fwCounts["interview"] ?? 0;
      if (interviewDone === 0) {
        suggestions.push({ label: "Interview Practice", href: "/practice", color: MODULE_COLORS.interview, reason: "Core skill — do one each week" });
      }
    }

    return suggestions.slice(0, 3);
  }, [sessionsThisWeek, goalConfig]);

  function saveGoal() {
    const config: WeeklyGoalConfig = { sessionsPerWeek: goalDraft, updatedAt: Date.now() };
    setGoalConfig(config);
    try { localStorage.setItem(GOAL_KEY, JSON.stringify(config)); } catch {}
    setEditingGoal(false);
  }

  if (status === "loading") return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <PremiumShell title="My Plan">
      <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--text-primary)", margin: 0, lineHeight: 1.2 }}>
            My Plan
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "6px 0 0", fontWeight: 500 }}>
            Track your weekly practice goals, streaks, and milestones.
          </p>
        </div>

        {/* ── Top row: streak + weekly goal ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>

          {/* Streak card */}
          <div style={{ padding: "20px 22px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg-strong)", boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Flame size={16} color="#D97706" />
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>Practice Streak</span>
            </div>
            <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 40, fontWeight: 900, color: (streak?.current ?? 0) > 0 ? "#D97706" : "var(--text-muted)", lineHeight: 1 }}>
                  {streak?.current ?? 0}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginTop: 3 }}>current days</div>
              </div>
              <div style={{ paddingBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{streak?.longest ?? 0}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>best</div>
              </div>
              <div style={{ paddingBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{streak?.totalActiveDays ?? 0}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>total days</div>
              </div>
            </div>
            {(streak?.current ?? 0) === 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Complete any session today to start your streak.
              </div>
            )}
            {(streak?.current ?? 0) > 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: "#D97706", fontWeight: 600 }}>
                Keep going — practice today to extend it!
              </div>
            )}
          </div>

          {/* Weekly goal card */}
          <div style={{ padding: "20px 22px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg-strong)", boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Target size={16} color="#4F46E5" />
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>Weekly Goal</span>
              </div>
              {!editingGoal && (
                <button onClick={() => { setGoalDraft(goalConfig.sessionsPerWeek); setEditingGoal(true); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                  Edit
                </button>
              )}
            </div>

            {editingGoal ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="number"
                  min={1} max={14}
                  value={goalDraft}
                  onChange={e => setGoalDraft(Math.max(1, Math.min(14, parseInt(e.target.value) || 1)))}
                  style={{ width: 60, padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 14, fontWeight: 700, textAlign: "center" }}
                />
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>sessions/week</span>
                <button onClick={saveGoal} style={{ padding: "6px 14px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditingGoal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>Cancel</button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: weekDone ? "#16A34A" : "var(--text-primary)" }}>
                    {sessionsThisWeek.length}
                  </span>
                  <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>/ {goalConfig.sessionsPerWeek}</span>
                  {weekDone && <span style={{ fontSize: 12, fontWeight: 800, color: "#16A34A" }}>Goal met! 🎉</span>}
                </div>
                <div style={{ height: 7, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round(weekProgress * 100)}%`, background: weekDone ? "#16A34A" : "var(--accent)", borderRadius: 99, transition: "width 400ms ease" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                  {goalConfig.sessionsPerWeek - sessionsThisWeek.length > 0
                    ? `${goalConfig.sessionsPerWeek - sessionsThisWeek.length} more to hit your goal`
                    : "Weekly goal reached"
                  }
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Week calendar ── */}
        <div style={{ padding: "18px 20px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)", marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", marginBottom: 14 }}>This Week</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {sessionsByDay.map(({ day, sessions }) => {
              const isToday = isSameDay(day, today);
              const hasSessions = sessions.length > 0;
              const isFuture = day > today;
              return (
                <div key={day.toISOString()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? "var(--accent)" : "var(--text-muted)", textTransform: "uppercase" }}>
                    {dayLabel(day)}
                  </div>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    display: "grid", placeItems: "center",
                    background: hasSessions ? "var(--accent)" : isToday ? "var(--accent-soft)" : "var(--card-border-soft)",
                    border: isToday ? "2px solid var(--accent)" : "2px solid transparent",
                    opacity: isFuture ? 0.4 : 1,
                    fontSize: 12, fontWeight: 800,
                    color: hasSessions ? "#fff" : isToday ? "var(--accent)" : "var(--text-muted)",
                  }}>
                    {hasSessions ? sessions.length : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Suggested practice mix ── */}
        {practiceGaps.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", marginBottom: 10 }}>
              Suggested for This Week
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {practiceGaps.map((s, i) => (
                <Link key={i} href={s.href} style={{ textDecoration: "none" }}>
                  <div style={{
                    padding: "14px 16px", borderRadius: "var(--radius-lg)",
                    border: `1px solid ${s.color}33`,
                    background: `${s.color}09`,
                    display: "flex", alignItems: "center", gap: 12,
                    cursor: "pointer",
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginTop: 1 }}>{s.reason}</div>
                    </div>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Milestones ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>Milestones</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
              {earnedCount} / {MILESTONES.length} earned
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {milestoneStatus.map(m => (
              <div
                key={m.id}
                style={{
                  padding: "14px 16px", borderRadius: "var(--radius-lg)",
                  border: `1px solid ${m.earned ? "rgba(79,70,229,0.25)" : "var(--card-border-soft)"}`,
                  background: m.earned ? "rgba(79,70,229,0.06)" : "var(--card-bg)",
                  display: "flex", alignItems: "center", gap: 12,
                  opacity: m.earned ? 1 : 0.65,
                }}
              >
                <div style={{ fontSize: 22, flexShrink: 0 }}>{m.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: m.earned ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginTop: 1, lineHeight: 1.4 }}>
                    {m.description}
                  </div>
                </div>
                {m.earned
                  ? <CheckCircle2 size={16} color="#16A34A" style={{ flexShrink: 0 }} />
                  : <Circle size={16} color="var(--card-border)" style={{ flexShrink: 0 }} />
                }
              </div>
            ))}
          </div>
        </div>
      </div>
    </PremiumShell>
  );
}
