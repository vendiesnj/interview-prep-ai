"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";
import {
  Mic,
  TrendingUp,
  DollarSign,
  BookOpen,
  Brain,
  Target,
  CheckCircle2,
  Circle,
  Flame,
  Calendar,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type ScheduleItem = {
  itemId: string;
  label: string;
  date: string; // ISO date string YYYY-MM-DD
  done: boolean;
};

type HabitRecord = {
  habitId: string;
  dates: string[]; // ISO date strings when completed
};

type GoalItem = {
  id: string;
  label: string;
  done: boolean;
  custom?: boolean;
};

type GoalCategory = {
  id: string;
  label: string;
  color: string;
  goals: GoalItem[];
};

// icon field removed — derived from category at render time
type HabitDef = {
  id: string;
  label: string;
  category: string;
  streak?: number;
  custom?: boolean;
};

// ── Constants ──────────────────────────────────────────────────────────────

const ACCENT_CAREER = "#2563EB";
const ACCENT_FINANCE = "#10B981";
const ACCENT_LEARNING = "#8B5CF6";
const ACCENT_MINDSET = "#F59E0B";

const CATEGORY_COLORS: Record<string, string> = {
  Career: ACCENT_CAREER,
  Finance: ACCENT_FINANCE,
  Learning: ACCENT_LEARNING,
  Mindset: ACCENT_MINDSET,
};

function CategoryIcon({ category, size = 14 }: { category: string; size?: number }) {
  const color = CATEGORY_COLORS[category] ?? ACCENT_CAREER;
  const props = { size, color, strokeWidth: 2.2 };
  if (category === "Career") return <TrendingUp {...props} />;
  if (category === "Finance") return <DollarSign {...props} />;
  if (category === "Learning") return <BookOpen {...props} />;
  if (category === "Mindset") return <Brain {...props} />;
  return <Target {...props} />;
}

const DEFAULT_HABITS: HabitDef[] = [
  { id: "practice", label: "Practice session", category: "Career" },
  { id: "budget_check", label: "Budget check-in", category: "Finance" },
  { id: "networking", label: "Networking practice", category: "Career" },
  { id: "read_guide", label: "Read a guide or module", category: "Learning" },
  { id: "journal", label: "Career journal entry", category: "Mindset" },
  { id: "linkedin", label: "LinkedIn activity", category: "Career" },
  { id: "savings_check", label: "Check savings goal", category: "Finance" },
  { id: "apply_job", label: "Job application or follow-up", category: "Career" },
];

const DEFAULT_GOAL_CATEGORIES: GoalCategory[] = [
  {
    id: "career",
    label: "Career Goals",
    color: ACCENT_CAREER,
    goals: [
      { id: "cg1", label: "Complete 10 practice sessions", done: false },
      { id: "cg2", label: "Land an internship", done: false },
      { id: "cg3", label: "Update resume", done: false },
    ],
  },
  {
    id: "financial",
    label: "Financial Goals",
    color: ACCENT_FINANCE,
    goals: [
      { id: "fg1", label: "Build $500 emergency fund", done: false },
      { id: "fg2", label: "Set up budget tracker", done: false },
      { id: "fg3", label: "Enroll in 401(k)", done: false },
    ],
  },
  {
    id: "skills",
    label: "Skills",
    color: ACCENT_LEARNING,
    goals: [
      { id: "sk1", label: "Take Career Assessment", done: false },
      { id: "sk2", label: "Complete financial literacy module", done: false },
    ],
  },
  {
    id: "future_proof",
    label: "Future-Proof",
    color: ACCENT_MINDSET,
    goals: [
      { id: "fp1", label: "Read AI resilience guide", done: false },
      { id: "fp2", label: "Identify side hustle match", done: false },
    ],
  },
];

type FocusTask = {
  title: string;
  desc: string;
  time: string;
  href: string;
  color: string;
  label: string;
  priority: 1 | 2 | 3;
};

function getFocusTasks(day: number): FocusTask[] {
  if (day === 1) {
    return [
      { priority: 1, title: "Interview Prep", desc: "Run through a mock behavioral question using the STAR method.", time: "15 min", href: "/practice", color: ACCENT_CAREER, label: "Practice" },
      { priority: 2, title: "Budget Review", desc: "Check last week's spending against your budget categories.", time: "10 min", href: "/career-guide/budget", color: ACCENT_FINANCE, label: "Finance" },
      { priority: 3, title: "Career Assessment", desc: "Explore your strengths and work style.", time: "20 min", href: "/aptitude", color: ACCENT_LEARNING, label: "Career" },
    ];
  }
  if (day === 2) {
    return [
      { priority: 1, title: "Public Speaking", desc: "Practice a confident 60-second introduction out loud.", time: "15 min", href: "/public-speaking", color: ACCENT_CAREER, label: "Practice" },
      { priority: 2, title: "Emergency Fund Check", desc: "Log into your savings account and note your current balance.", time: "5 min", href: "/career-guide/budget", color: ACCENT_FINANCE, label: "Finance" },
      { priority: 3, title: "LinkedIn Update", desc: "Add a recent experience or skill to your LinkedIn profile.", time: "15 min", href: "/networking", color: ACCENT_LEARNING, label: "Career" },
    ];
  }
  if (day === 3) {
    return [
      { priority: 1, title: "Networking Pitch", desc: "Practice your 30-second networking pitch for a career fair.", time: "10 min", href: "/networking", color: ACCENT_CAREER, label: "Practice" },
      { priority: 2, title: "Retirement Projection", desc: "Review your long-term savings trajectory.", time: "10 min", href: "/career-guide/budget", color: ACCENT_FINANCE, label: "Finance" },
      { priority: 3, title: "Future-Proof Reading", desc: "Read one section of the AI & career resilience guide.", time: "20 min", href: "/future-proof", color: ACCENT_LEARNING, label: "Career" },
    ];
  }
  if (day === 4) {
    return [
      { priority: 1, title: "Interview Prep", desc: "Practice a technical or situational question for your target role.", time: "20 min", href: "/practice", color: ACCENT_CAREER, label: "Practice" },
      { priority: 2, title: "Budget Snapshot", desc: "Mid-week budget check — how are you tracking against your plan?", time: "10 min", href: "/career-guide/budget", color: ACCENT_FINANCE, label: "Finance" },
      { priority: 3, title: "Resume Gap Analysis", desc: "Identify one skill or experience gap and plan how to address it.", time: "15 min", href: "/career-guide", color: ACCENT_LEARNING, label: "Career" },
    ];
  }
  if (day === 5) {
    return [
      { priority: 1, title: "Speaking or Networking", desc: "Finish the week strong — pick a speaking or pitch scenario.", time: "15 min", href: "/public-speaking", color: ACCENT_CAREER, label: "Practice" },
      { priority: 2, title: "Financial Literacy Module", desc: "Complete one module in the financial literacy track.", time: "20 min", href: "/financial-literacy", color: ACCENT_FINANCE, label: "Finance" },
      { priority: 3, title: "Weekly Career Check-In", desc: "Review your weekly progress and set intentions for next week.", time: "10 min", href: "/career-checkin", color: ACCENT_LEARNING, label: "Career" },
    ];
  }
  // Weekend
  return [
    { priority: 1, title: "Practice — Your Pick", desc: "Interview, public speaking, or networking — choose what feels right.", time: "15 min", href: "/practice", color: ACCENT_CAREER, label: "Practice" },
    { priority: 2, title: "Financial Check-In", desc: "Review your budget or savings goal at your own pace.", time: "10 min", href: "/career-guide/budget", color: ACCENT_FINANCE, label: "Finance" },
    { priority: 3, title: "Career Exploration", desc: "Browse job profiles, read a guide, or explore a new skill area.", time: "20 min", href: "/career-guide", color: ACCENT_LEARNING, label: "Career" },
  ];
}

// ── Utilities ──────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function todayStr(): string {
  return toDateStr(new Date());
}

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const today = todayStr();
  let streak = 0;
  const cursor = new Date(today);
  for (const d of sorted) {
    const cursorStr = toDateStr(cursor);
    if (d === cursorStr) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (d < cursorStr) {
      break;
    }
  }
  return streak;
}

function getLast28Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(toDateStr(d));
  }
  return days;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getTodayLong(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const PRIORITY_LABELS: Record<number, string> = { 1: "P1", 2: "P2", 3: "P3" };
const PRIORITY_COLORS: Record<number, string> = { 1: "#EF4444", 2: "#F59E0B", 3: "#6B7280" };

// ── Segmented Tab Control ──────────────────────────────────────────────────

function SegmentedControl({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: 10,
        padding: 3,
        gap: 2,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            style={{
              padding: "6px 18px",
              borderRadius: 8,
              border: "none",
              background: isActive ? "var(--accent, #2563EB)" : "transparent",
              color: isActive ? "#fff" : "var(--text-muted)",
              fontWeight: isActive ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              transition: "background 120ms, color 120ms",
              outline: "none",
              letterSpacing: 0.1,
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Today: Focus Task Row ──────────────────────────────────────────────────

function FocusTaskRow({ task }: { task: FocusTask }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        borderRadius: 12,
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        transition: "border-color 120ms",
      }}
    >
      {/* Priority indicator */}
      <div
        style={{
          width: 3,
          height: 36,
          borderRadius: 2,
          background: PRIORITY_COLORS[task.priority],
          flexShrink: 0,
        }}
      />

      {/* Category icon */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: task.color + "15",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <CategoryIcon category={task.label === "Practice" ? "Career" : task.label === "Finance" ? "Finance" : "Learning"} size={15} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
            {task.title}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: PRIORITY_COLORS[task.priority],
              background: PRIORITY_COLORS[task.priority] + "15",
              padding: "1px 6px",
              borderRadius: 4,
              letterSpacing: 0.4,
            }}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {task.desc}
        </div>
      </div>

      {/* Time badge + link */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted)",
            background: "var(--app-bg, #F9FAFB)",
            border: "1px solid var(--card-border)",
            padding: "3px 8px",
            borderRadius: 6,
          }}
        >
          {task.time}
        </span>
        <Link
          href={task.href}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            fontSize: 12,
            fontWeight: 700,
            color: task.color,
            textDecoration: "none",
            padding: "4px 10px",
            borderRadius: 7,
            background: task.color + "12",
            border: `1px solid ${task.color}25`,
            transition: "background 120ms",
          }}
        >
          Start
          <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}

// ── Today: Scheduled Item Row ──────────────────────────────────────────────

function ScheduledItemRow({ item }: { item: ScheduleItem }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        borderRadius: 10,
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        opacity: item.done ? 0.65 : 1,
      }}
    >
      {item.done ? (
        <CheckCircle2 size={16} color={ACCENT_FINANCE} strokeWidth={2.2} />
      ) : (
        <Circle size={16} color="var(--text-muted)" strokeWidth={2} />
      )}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 600,
          color: item.done ? "var(--text-muted)" : "var(--text-primary)",
          textDecoration: item.done ? "line-through" : "none",
          lineHeight: 1.4,
        }}
      >
        {item.label}
      </span>
      <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
        <Calendar size={11} />
        {formatDateDisplay(item.date)}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 6,
        marginTop: 4,
      }}
    >
      {children}
    </div>
  );
}

// ── Tab: Today ─────────────────────────────────────────────────────────────

function TodayTab() {
  const day = new Date().getDay();
  const tasks = getFocusTasks(day);

  const [scheduled, setScheduled] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ipc_schedule_v1");
      if (raw) setScheduled(JSON.parse(raw) as ScheduleItem[]);
    } catch {
      // ignore
    }
  }, []);

  const today = todayStr();
  const todayItems = scheduled.filter((i) => i.date === today);

  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = toDateStr(weekEnd);
  const weekItems = scheduled.filter((i) => i.date > today && i.date <= weekEndStr);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Date header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          borderRadius: 12,
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.3 }}>
            {getGreeting()}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
            <Calendar size={11} />
            {getTodayLong()}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: ACCENT_CAREER,
            background: ACCENT_CAREER + "12",
            padding: "5px 12px",
            borderRadius: 8,
            border: `1px solid ${ACCENT_CAREER}20`,
          }}
        >
          <Target size={13} color={ACCENT_CAREER} />
          {tasks.length} tasks today
        </div>
      </div>

      {/* Today's Focus */}
      <div>
        <SectionLabel>Today's Focus</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.map((task) => (
            <FocusTaskRow key={task.title} task={task} />
          ))}
        </div>
      </div>

      {/* Scheduled for today */}
      <div>
        <SectionLabel>Scheduled for Today</SectionLabel>
        {todayItems.length === 0 ? (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "var(--card-bg)",
              border: "1px dashed var(--card-border)",
              fontSize: 13,
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Calendar size={14} />
            Nothing scheduled — add items via the checklist in Practice or Networking.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {todayItems.map((item) => (
              <ScheduledItemRow key={item.itemId + item.date} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* This week */}
      {weekItems.length > 0 && (
        <div>
          <SectionLabel>Upcoming This Week</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {weekItems.map((item) => (
              <ScheduledItemRow key={item.itemId + item.date} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Habits: Mini Grid ──────────────────────────────────────────────────────

function MiniHabitGrid({ completedDates, color }: { completedDates: string[]; color: string }) {
  const days = getLast28Days();
  const set = new Set(completedDates);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(28, 1fr)", gap: 2, flex: 1 }}>
      {days.map((d) => {
        const done = set.has(d);
        return (
          <div
            key={d}
            title={d}
            style={{
              height: 10,
              borderRadius: 2,
              background: done ? color : "var(--card-border)",
              opacity: done ? 1 : 0.35,
              transition: "background 100ms",
            }}
          />
        );
      })}
    </div>
  );
}

// ── Habits: Compact Row ────────────────────────────────────────────────────

function HabitRow({
  habit,
  completedDates,
  onToggle,
}: {
  habit: HabitDef;
  completedDates: string[];
  onToggle: (id: string) => void;
}) {
  const today = todayStr();
  const doneToday = completedDates.includes(today);
  const streak = computeStreak(completedDates);
  const catColor = CATEGORY_COLORS[habit.category] ?? ACCENT_CAREER;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 52,
        padding: "0 14px 0 0",
        borderRadius: 12,
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        overflow: "hidden",
        transition: "border-color 120ms",
      }}
    >
      {/* Color border accent */}
      <div style={{ width: 3, height: "100%", background: catColor, flexShrink: 0, borderRadius: "12px 0 0 12px" }} />

      {/* Category icon */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: catColor + "15",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <CategoryIcon category={habit.category} size={13} />
      </div>

      {/* Label + category pill */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: "0 0 auto", maxWidth: 220 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {habit.label}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: catColor,
            background: catColor + "15",
            padding: "1px 6px",
            borderRadius: 4,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          {habit.category}
        </span>
      </div>

      {/* Streak badge */}
      {streak > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            padding: "2px 7px",
            borderRadius: 5,
            background: "#F59E0B18",
            border: "1px solid #F59E0B25",
            flexShrink: 0,
          }}
        >
          <Flame size={11} color="#F59E0B" strokeWidth={2.2} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#F59E0B" }}>{streak}</span>
        </div>
      )}

      {/* 28-day mini grid */}
      <div style={{ flex: 1, minWidth: 0, padding: "0 4px" }}>
        <MiniHabitGrid completedDates={completedDates} color={catColor} />
      </div>

      {/* Check button */}
      <button
        type="button"
        onClick={() => onToggle(habit.id)}
        aria-label={doneToday ? "Mark incomplete" : "Mark complete"}
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          border: "none",
          background: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          outline: "none",
          transition: "transform 100ms",
          padding: 0,
        }}
      >
        {doneToday ? (
          <CheckCircle2 size={22} color={ACCENT_FINANCE} strokeWidth={2.2} />
        ) : (
          <Circle size={22} color="var(--text-muted)" strokeWidth={1.8} />
        )}
      </button>
    </div>
  );
}

// ── Tab: Habits ────────────────────────────────────────────────────────────

function HabitsTab() {
  const [habits, setHabits] = useState<HabitDef[]>(DEFAULT_HABITS);
  const [habitData, setHabitData] = useState<HabitRecord[]>([]);
  const [addingHabit, setAddingHabit] = useState(false);
  const [newHabitLabel, setNewHabitLabel] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ipc_habits_v1");
      if (raw) setHabitData(JSON.parse(raw) as HabitRecord[]);
    } catch {
      // ignore
    }
    try {
      const rawH = localStorage.getItem("ipc_habits_custom_v1");
      if (rawH) {
        const custom = JSON.parse(rawH) as HabitDef[];
        setHabits([...DEFAULT_HABITS, ...custom]);
      }
    } catch {
      // ignore
    }
  }, []);

  function saveHabitData(next: HabitRecord[]) {
    setHabitData(next);
    try {
      localStorage.setItem("ipc_habits_v1", JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function handleToggle(habitId: string) {
    const today = todayStr();
    const next = [...habitData];
    const idx = next.findIndex((r) => r.habitId === habitId);
    if (idx === -1) {
      next.push({ habitId, dates: [today] });
    } else {
      const record = { ...next[idx] };
      if (record.dates.includes(today)) {
        record.dates = record.dates.filter((d) => d !== today);
      } else {
        record.dates = [...record.dates, today];
      }
      next[idx] = record;
    }
    saveHabitData(next);
  }

  function getCompletedDates(habitId: string): string[] {
    return habitData.find((r) => r.habitId === habitId)?.dates ?? [];
  }

  function handleAddHabit() {
    const trimmed = newHabitLabel.trim();
    if (!trimmed) return;
    const newH: HabitDef = {
      id: "custom_" + Date.now(),
      label: trimmed,
      category: "Learning",
      streak: 0,
      custom: true,
    };
    const next = [...habits, newH];
    setHabits(next);
    const customOnly = next.filter((h) => h.custom);
    try {
      localStorage.setItem("ipc_habits_custom_v1", JSON.stringify(customOnly));
    } catch {
      // ignore
    }
    setNewHabitLabel("");
    setAddingHabit(false);
  }

  const today = todayStr();
  const doneCount = habits.filter((h) => getCompletedDates(h.id).includes(today)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Summary header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderRadius: 12,
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Daily Habits</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            {doneCount} of {habits.length} completed today
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 100,
              height: 6,
              borderRadius: 3,
              background: "var(--card-border)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${habits.length === 0 ? 0 : Math.round((doneCount / habits.length) * 100)}%`,
                background: ACCENT_FINANCE,
                borderRadius: 3,
                transition: "width 300ms",
              }}
            />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT_FINANCE }}>
            {habits.length === 0 ? 0 : Math.round((doneCount / habits.length) * 100)}%
          </span>
        </div>
      </div>

      {/* Column labels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "3px 28px 1fr auto 1fr 30px",
          gap: 12,
          padding: "0 14px 0 0",
          alignItems: "center",
        }}
      >
        <div />
        <div />
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>Habit</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>Streak</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>28-day activity</div>
        <div />
      </div>

      {/* Habit rows */}
      {habits.map((habit) => (
        <HabitRow
          key={habit.id}
          habit={habit}
          completedDates={getCompletedDates(habit.id)}
          onToggle={handleToggle}
        />
      ))}

      {/* Add habit */}
      {addingHabit ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "10px 14px",
            borderRadius: 12,
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
          }}
        >
          <input
            autoFocus
            type="text"
            value={newHabitLabel}
            onChange={(e) => setNewHabitLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddHabit();
              if (e.key === "Escape") {
                setAddingHabit(false);
                setNewHabitLabel("");
              }
            }}
            placeholder="New habit name..."
            style={{
              flex: 1,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--card-border)",
              background: "var(--app-bg)",
              color: "var(--text-primary)",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={handleAddHabit}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              background: ACCENT_CAREER,
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setAddingHabit(false);
              setNewHabitLabel("");
            }}
            style={{
              padding: "6px",
              borderRadius: 8,
              border: "1px solid var(--card-border)",
              background: "transparent",
              color: "var(--text-muted)",
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingHabit(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            background: "var(--card-bg)",
            border: "1px dashed var(--card-border)",
            borderRadius: 10,
            padding: "8px 14px",
            color: ACCENT_CAREER,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <Plus size={14} />
          Add habit
        </button>
      )}
    </div>
  );
}

// ── Goals: Category Block ──────────────────────────────────────────────────

function GoalCategoryBlock({
  category,
  onToggleGoal,
  onAddGoal,
}: {
  category: GoalCategory;
  onToggleGoal: (catId: string, goalId: string) => void;
  onAddGoal: (catId: string, label: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const doneCount = category.goals.filter((g) => g.done).length;
  const total = category.goals.length;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  function handleAdd() {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    onAddGoal(category.id, trimmed);
    setNewLabel("");
    setAdding(false);
  }

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Category header with progress */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--card-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ width: 3, height: 20, borderRadius: 2, background: category.color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", flex: 1 }}>{category.label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
            {doneCount}/{total}
          </span>
          <div
            style={{
              width: 72,
              height: 5,
              borderRadius: 3,
              background: "var(--card-border)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${pct}%`,
                background: category.color,
                borderRadius: 3,
                transition: "width 300ms",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: category.color,
              minWidth: 28,
              textAlign: "right",
            }}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Goal items */}
      <div style={{ padding: "6px 0" }}>
        {category.goals.map((goal, idx) => (
          <label
            key={goal.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 16px",
              cursor: "pointer",
              borderBottom: idx < category.goals.length - 1 ? "1px solid var(--card-border)" : "none",
              transition: "background 80ms",
            }}
          >
            <input
              type="checkbox"
              checked={goal.done}
              onChange={() => onToggleGoal(category.id, goal.id)}
              style={{ accentColor: category.color, width: 15, height: 15, cursor: "pointer", flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: goal.done ? "var(--text-muted)" : "var(--text-primary)",
                textDecoration: goal.done ? "line-through" : "none",
                lineHeight: 1.4,
                flex: 1,
              }}
            >
              {goal.label}
            </span>
            {goal.done && <CheckCircle2 size={14} color={ACCENT_FINANCE} strokeWidth={2} />}
          </label>
        ))}
      </div>

      {/* Add goal row */}
      <div style={{ padding: "8px 16px", borderTop: "1px solid var(--card-border)" }}>
        {adding ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              autoFocus
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewLabel("");
                }
              }}
              placeholder="New goal..."
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 7,
                border: "1px solid var(--card-border)",
                background: "var(--app-bg)",
                color: "var(--text-primary)",
                fontSize: 12,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={handleAdd}
              style={{
                padding: "6px 12px",
                borderRadius: 7,
                border: "none",
                background: category.color,
                color: "#fff",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewLabel("");
              }}
              style={{
                padding: "6px",
                borderRadius: 7,
                border: "1px solid var(--card-border)",
                background: "transparent",
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "transparent",
              border: "none",
              color: category.color,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              padding: "2px 0",
            }}
          >
            <Plus size={13} />
            Add goal
          </button>
        )}
      </div>
    </div>
  );
}

// ── Tab: Goals ─────────────────────────────────────────────────────────────

function GoalsTab() {
  const [categories, setCategories] = useState<GoalCategory[]>(DEFAULT_GOAL_CATEGORIES);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ipc_goals_v1");
      if (raw) setCategories(JSON.parse(raw) as GoalCategory[]);
    } catch {
      // ignore
    }
  }, []);

  function save(next: GoalCategory[]) {
    setCategories(next);
    try {
      localStorage.setItem("ipc_goals_v1", JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function handleToggleGoal(catId: string, goalId: string) {
    const next = categories.map((cat) => {
      if (cat.id !== catId) return cat;
      return {
        ...cat,
        goals: cat.goals.map((g) => (g.id === goalId ? { ...g, done: !g.done } : g)),
      };
    });
    save(next);
  }

  function handleAddGoal(catId: string, label: string) {
    const next = categories.map((cat) => {
      if (cat.id !== catId) return cat;
      const newGoal: GoalItem = { id: "g_" + Date.now(), label, done: false, custom: true };
      return { ...cat, goals: [...cat.goals, newGoal] };
    });
    save(next);
  }

  const totalGoals = categories.reduce((s, c) => s + c.goals.length, 0);
  const doneGoals = categories.reduce((s, c) => s + c.goals.filter((g) => g.done).length, 0);
  const overallPct = totalGoals === 0 ? 0 : Math.round((doneGoals / totalGoals) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Overall summary */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderRadius: 12,
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Milestone Goals</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            {doneGoals} of {totalGoals} goals complete
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 110,
              height: 6,
              borderRadius: 3,
              background: "var(--card-border)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${overallPct}%`,
                background: ACCENT_FINANCE,
                borderRadius: 3,
                transition: "width 300ms",
              }}
            />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT_FINANCE, minWidth: 32, textAlign: "right" }}>
            {overallPct}%
          </span>
        </div>
      </div>

      {categories.map((cat) => (
        <GoalCategoryBlock
          key={cat.id}
          category={cat}
          onToggleGoal={handleToggleGoal}
          onAddGoal={handleAddGoal}
        />
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: "today", label: "Today" },
  { key: "habits", label: "Habits" },
  { key: "goals", label: "Goals" },
];

export default function PlannerPage() {
  const [activeTab, setActiveTab] = useState<"today" | "habits" | "goals">("today");

  return (
    <PremiumShell hideHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "var(--text-primary)",
                letterSpacing: -0.4,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Target size={20} color={ACCENT_CAREER} strokeWidth={2.2} />
              Planner
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
              Habits, goals, and daily focus — all in one place.
            </div>
          </div>
          <SegmentedControl
            tabs={TABS}
            active={activeTab}
            onChange={(k) => setActiveTab(k as "today" | "habits" | "goals")}
          />
        </div>

        {/* Tab content */}
        {activeTab === "today" && <TodayTab />}
        {activeTab === "habits" && <HabitsTab />}
        {activeTab === "goals" && <GoalsTab />}
      </div>
    </PremiumShell>
  );
}
