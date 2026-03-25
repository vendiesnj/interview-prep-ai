"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";
import {
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
  ChevronLeft,
  Plus,
  X,
  BarChart2,
  Clock,
  Flag,
  Heart,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

type ScheduleItem = {
  itemId: string;
  label: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  category?: string;
  timeEstimate?: string;
  notes?: string;
  custom?: boolean;
  stage?: string;
};

type HabitRecord = {
  habitId: string;
  dates: string[];
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

type HabitDef = {
  id: string;
  label: string;
  category: string;
  streak?: number;
  custom?: boolean;
};

type FocusTask = {
  title: string;
  desc: string;
  time: string;
  href: string;
  color: string;
  label: string;
  priority: 1 | 2 | 3;
};

// ── Storage Keys ────────────────────────────────────────────────────────────

const SCHED_KEY = "ipc_schedule_v1";
const HABITS_KEY = "ipc_habits_v1";
const HABITS_CUSTOM_KEY = "ipc_habits_custom_v1";
const GOALS_KEY = "ipc_goals_v1";

// ── Constants ────────────────────────────────────────────────────────────────

const ACCENT_CAREER = "#2563EB";
const ACCENT_FINANCE = "#10B981";
const ACCENT_LEARNING = "#8B5CF6";
const ACCENT_MINDSET = "#F59E0B";
const ACCENT_PERSONAL = "#EC4899";

const CATEGORY_COLORS: Record<string, string> = {
  Career: ACCENT_CAREER,
  Finance: ACCENT_FINANCE,
  Learning: ACCENT_LEARNING,
  Mindset: ACCENT_MINDSET,
  Personal: ACCENT_PERSONAL,
};

const CATEGORIES = ["Career", "Finance", "Learning", "Mindset", "Personal"] as const;
type CategoryName = typeof CATEGORIES[number];

const TIME_OPTIONS = ["5min", "15min", "30min", "60min"];

const DAY_LABELS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function CategoryIcon({ category, size = 14 }: { category: string; size?: number }) {
  const color = CATEGORY_COLORS[category] ?? ACCENT_CAREER;
  const props = { size, color, strokeWidth: 2.2 };
  if (category === "Career") return <TrendingUp {...props} />;
  if (category === "Finance") return <DollarSign {...props} />;
  if (category === "Learning") return <BookOpen {...props} />;
  if (category === "Mindset") return <Brain {...props} />;
  if (category === "Personal") return <Heart {...props} />;
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

const PRIORITY_LABELS: Record<number, string> = { 1: "P1", 2: "P2", 3: "P3" };
const PRIORITY_COLORS: Record<number, string> = { 1: "#EF4444", 2: "#F59E0B", 3: "#6B7280" };

// ── Utilities ────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function todayStr(): string {
  return toDateStr(new Date());
}

function startOfWeekDate(d: Date): Date {
  const result = new Date(d);
  result.setDate(d.getDate() - d.getDay());
  return result;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getTodayLong(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
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

function getLast7Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(toDateStr(d));
  }
  return days;
}

function readSchedule(): ScheduleItem[] {
  try {
    const raw = localStorage.getItem(SCHED_KEY);
    return raw ? (JSON.parse(raw) as ScheduleItem[]) : [];
  } catch {
    return [];
  }
}

function writeSchedule(items: ScheduleItem[]) {
  try {
    localStorage.setItem(SCHED_KEY, JSON.stringify(items));
  } catch {}
}

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
  return [
    { priority: 1, title: "Practice — Your Pick", desc: "Interview, public speaking, or networking — choose what feels right.", time: "15 min", href: "/practice", color: ACCENT_CAREER, label: "Practice" },
    { priority: 2, title: "Financial Check-In", desc: "Review your budget or savings goal at your own pace.", time: "10 min", href: "/career-guide/budget", color: ACCENT_FINANCE, label: "Finance" },
    { priority: 3, title: "Career Exploration", desc: "Browse job profiles, read a guide, or explore a new skill area.", time: "20 min", href: "/career-guide", color: ACCENT_LEARNING, label: "Career" },
  ];
}

// ── Shared UI ────────────────────────────────────────────────────────────────

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
        flexWrap: "wrap",
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
              padding: "6px 16px",
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

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--card-border)", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 300ms" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 28, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

// ── Context Menu Type ─────────────────────────────────────────────────────────

type ContextMenuState = {
  x: number;
  y: number;
  taskId: string;
  taskLabel: string;
} | null;

// ── Full-Width Month Calendar ─────────────────────────────────────────────────

function FullMonthCalendar({
  scheduled,
  onDropTask,
}: {
  scheduled: ScheduleItem[];
  onDropTask: (taskIdOrTitle: string, date: string) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [highlightDay, setHighlightDay] = useState<string | null>(null);

  const todayKey = toDateStr(today);

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const lastOfMonth = new Date(viewYear, viewMonth + 1, 0);
  const startPad = firstOfMonth.getDay();
  const totalCells = Math.ceil((startPad + lastOfMonth.getDate()) / 7) * 7;

  const cells: { dateKey: string; inMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(viewYear, viewMonth, 1 - startPad + i);
    cells.push({ dateKey: toDateStr(d), inMonth: d.getMonth() === viewMonth });
  }

  function navMonth(dir: -1 | 1) {
    setViewMonth((prev) => {
      const m = prev + dir;
      if (m < 0) { setViewYear((y) => y - 1); return 11; }
      if (m > 11) { setViewYear((y) => y + 1); return 0; }
      return m;
    });
  }

  function jumpToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  function getItemsForDay(dateKey: string): ScheduleItem[] {
    return scheduled.filter((i) => i.date === dateKey);
  }

  function handleDrop(e: React.DragEvent, dateKey: string) {
    e.preventDefault();
    setDragOverDay(null);
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    onDropTask(raw, dateKey);
    setHighlightDay(dateKey);
    setTimeout(() => setHighlightDay(null), 800);
  }

  const numRows = totalCells / 7;

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "var(--shadow-card)",
        width: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 20px",
          borderBottom: "1px solid var(--card-border)",
        }}
      >
        <button
          type="button"
          onClick={() => navMonth(-1)}
          style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: 8, cursor: "pointer", color: "var(--text-muted)", padding: "5px 8px", display: "flex", alignItems: "center" }}
        >
          <ChevronLeft size={16} />
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.3 }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
        </div>
        <button
          type="button"
          onClick={jumpToday}
          style={{ fontSize: 12, fontWeight: 700, color: ACCENT_CAREER, background: ACCENT_CAREER + "12", border: `1px solid ${ACCENT_CAREER}30`, borderRadius: 7, padding: "5px 12px", cursor: "pointer" }}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => navMonth(1)}
          style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: 8, cursor: "pointer", color: "var(--text-muted)", padding: "5px 8px", display: "flex", alignItems: "center" }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day-of-week labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--card-border)" }}>
        {DAY_LABELS_SHORT.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              padding: "8px 0",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map(({ dateKey, inMonth }, idx) => {
          const isToday = dateKey === todayKey;
          const isDragOver = dragOverDay === dateKey;
          const isHighlight = highlightDay === dateKey;
          const dayItems = getItemsForDay(dateKey);
          const dayNum = parseInt(dateKey.split("-")[2], 10);
          const isLastRow = idx >= cells.length - 7;
          const isLastCol = idx % 7 === 6;

          return (
            <div
              key={dateKey}
              onDragOver={(e) => { e.preventDefault(); setDragOverDay(dateKey); }}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={(e) => handleDrop(e, dateKey)}
              style={{
                minHeight: 100,
                padding: "8px 6px 6px",
                borderRight: !isLastCol ? "1px solid var(--card-border)" : "none",
                borderBottom: !isLastRow ? "1px solid var(--card-border)" : "none",
                background: isHighlight
                  ? ACCENT_CAREER + "20"
                  : isDragOver
                  ? ACCENT_CAREER + "10"
                  : isToday
                  ? ACCENT_CAREER + "06"
                  : "transparent",
                transition: "background 150ms",
                position: "relative",
              }}
            >
              {/* Day number */}
              <div style={{ textAlign: "right", marginBottom: 4 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    fontSize: 12,
                    fontWeight: isToday ? 900 : inMonth ? 600 : 400,
                    color: isToday ? "#fff" : inMonth ? "var(--text-primary)" : "var(--text-muted)",
                    background: isToday ? ACCENT_CAREER : "transparent",
                    opacity: inMonth ? 1 : 0.3,
                  }}
                >
                  {dayNum}
                </span>
              </div>

              {/* Events */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {dayItems.slice(0, 3).map((item) => {
                  const catColor = item.category ? (CATEGORY_COLORS[item.category] ?? ACCENT_CAREER) : ACCENT_CAREER;
                  return (
                    <div
                      key={item.itemId}
                      title={item.label}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: item.done ? "var(--text-muted)" : catColor,
                        background: catColor + "15",
                        borderLeft: `2px solid ${catColor}`,
                        padding: "1px 5px",
                        borderRadius: "0 3px 3px 0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        textDecoration: item.done ? "line-through" : "none",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.label}
                    </div>
                  );
                })}
                {dayItems.length > 3 && (
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, paddingLeft: 5 }}>
                    +{dayItems.length - 3} more
                  </div>
                )}
              </div>

              {isDragOver && (
                <div
                  style={{
                    position: "absolute",
                    inset: 2,
                    border: `2px dashed ${ACCENT_CAREER}60`,
                    borderRadius: 6,
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Today Tab ─────────────────────────────────────────────────────────────────

function TodayTab() {
  const day = new Date().getDay();
  const focusTasks = getFocusTasks(day);
  const [scheduled, setScheduled] = useState<ScheduleItem[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [assignDateValue, setAssignDateValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setScheduled(readSchedule());
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu]);

  function handleDropTask(taskIdOrTitle: string, date: string) {
    const existing = scheduled.find((i) => i.itemId === taskIdOrTitle);
    if (existing) {
      const next = scheduled.map((i) =>
        i.itemId === taskIdOrTitle ? { ...i, date } : i
      );
      setScheduled(next);
      writeSchedule(next);
      return;
    }
    // Focus task being dropped onto calendar
    const ft = focusTasks.find((t) => t.title === taskIdOrTitle);
    if (ft) {
      const newItem: ScheduleItem = {
        itemId: "focus_" + Date.now() + "_" + Math.random().toString(36).slice(2),
        label: ft.title,
        date,
        done: false,
        category: ft.label === "Finance" ? "Finance" : "Career",
        timeEstimate: ft.time,
        custom: false,
      };
      const next = [...scheduled, newItem];
      setScheduled(next);
      writeSchedule(next);
    }
  }

  function openContextMenu(e: React.MouseEvent, taskId: string, taskLabel: string) {
    e.preventDefault();
    setAssignDateValue("");
    setContextMenu({ x: e.clientX, y: e.clientY, taskId, taskLabel });
  }

  function handleContextAssign() {
    if (!contextMenu || !assignDateValue) return;
    handleDropTask(contextMenu.taskId, assignDateValue);
    setContextMenu(null);
  }

  function handleFocusDragStart(e: React.DragEvent, title: string) {
    e.dataTransfer.setData("text/plain", title);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleScheduledDragStart(e: React.DragEvent, itemId: string) {
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.effectAllowed = "move";
  }

  function toggleDone(itemId: string) {
    const next = scheduled.map((i) =>
      i.itemId === itemId ? { ...i, done: !i.done } : i
    );
    setScheduled(next);
    writeSchedule(next);
  }

  const today = todayStr();
  const todayItems = scheduled.filter((i) => i.date === today);

  // Unified task list: focus tasks + today's scheduled items
  const allTasks = [
    ...focusTasks.map((ft) => ({
      id: ft.title,
      label: ft.title,
      time: ft.time,
      href: ft.href,
      color: ft.color,
      category: ft.label === "Finance" ? "Finance" : "Career",
      priority: ft.priority,
      isFocus: true as const,
      done: false,
    })),
    ...todayItems.map((si) => ({
      id: si.itemId,
      label: si.label,
      time: si.timeEstimate ?? "",
      href: "",
      color: si.category ? (CATEGORY_COLORS[si.category] ?? ACCENT_CAREER) : ACCENT_CAREER,
      category: si.category ?? "Career",
      priority: 3 as 1 | 2 | 3,
      isFocus: false as const,
      done: si.done,
    })),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Full-width month calendar */}
      <FullMonthCalendar scheduled={scheduled} onDropTask={handleDropTask} />

      {/* Compact scrollable task list */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--card-border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Target size={14} color={ACCENT_CAREER} strokeWidth={2.2} />
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>Tasks</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 2 }}>
            Drag to calendar · Right-click to assign date
          </span>
        </div>

        {/* Scrollable rows */}
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {allTasks.length === 0 && (
            <div style={{ padding: "20px 16px", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
              No tasks today.
            </div>
          )}
          {allTasks.map((task) => {
            const catColor = CATEGORY_COLORS[task.category] ?? ACCENT_CAREER;
            return (
              <div
                key={task.id}
                draggable
                onDragStart={(e) =>
                  task.isFocus
                    ? handleFocusDragStart(e, task.id)
                    : handleScheduledDragStart(e, task.id)
                }
                onContextMenu={(e) => openContextMenu(e, task.id, task.label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  height: 44,
                  padding: "0 14px",
                  borderBottom: "1px solid var(--card-border)",
                  background: "var(--card-bg)",
                  cursor: "grab",
                  opacity: task.done ? 0.55 : 1,
                  userSelect: "none",
                }}
              >
                {/* Priority stripe */}
                <div
                  style={{
                    width: 3,
                    height: 26,
                    borderRadius: 2,
                    background: PRIORITY_COLORS[task.priority],
                    flexShrink: 0,
                  }}
                />

                {/* Category dot */}
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: catColor,
                    flexShrink: 0,
                  }}
                />

                {/* Task name */}
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 700,
                    color: task.done ? "var(--text-muted)" : "var(--text-primary)",
                    textDecoration: task.done ? "line-through" : "none",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {task.label}
                </span>

                {/* Category label */}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: catColor,
                    background: catColor + "15",
                    padding: "1px 7px",
                    borderRadius: 4,
                    letterSpacing: 0.3,
                    flexShrink: 0,
                  }}
                >
                  {task.category}
                </span>

                {/* Time estimate */}
                {task.time && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      flexShrink: 0,
                    }}
                  >
                    <Clock size={10} />
                    {task.time}
                  </span>
                )}

                {/* Checkbox for scheduled items */}
                {!task.isFocus && (
                  <button
                    type="button"
                    onClick={() => toggleDone(task.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", flexShrink: 0 }}
                  >
                    {task.done
                      ? <CheckCircle2 size={16} color={ACCENT_FINANCE} strokeWidth={2.2} />
                      : <Circle size={16} color="var(--text-muted)" strokeWidth={2} />}
                  </button>
                )}

                {/* Start link for focus tasks */}
                {task.isFocus && task.href && (
                  <Link
                    href={task.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 11,
                      fontWeight: 700,
                      color: task.color,
                      textDecoration: "none",
                      padding: "3px 9px",
                      borderRadius: 6,
                      background: task.color + "12",
                      border: `1px solid ${task.color}25`,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Start <ChevronRight size={11} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: 10,
            boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
            padding: 10,
            minWidth: 230,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-muted)",
              padding: "2px 4px 8px",
              borderBottom: "1px solid var(--card-border)",
              marginBottom: 8,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {contextMenu.taskLabel}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", padding: "0 4px 6px" }}>
            Schedule for...
          </div>
          <div style={{ display: "flex", gap: 6, padding: "0 2px" }}>
            <input
              type="date"
              autoFocus
              value={assignDateValue}
              onChange={(e) => setAssignDateValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleContextAssign();
                if (e.key === "Escape") setContextMenu(null);
              }}
              style={{
                flex: 1,
                padding: "5px 8px",
                borderRadius: 7,
                border: "1px solid var(--card-border)",
                background: "var(--app-bg, #F9FAFB)",
                color: "var(--text-primary)",
                fontSize: 12,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={handleContextAssign}
              disabled={!assignDateValue}
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                border: "none",
                background: assignDateValue ? ACCENT_CAREER : "var(--card-border)",
                color: assignDateValue ? "#fff" : "var(--text-muted)",
                fontWeight: 700,
                fontSize: 12,
                cursor: assignDateValue ? "pointer" : "not-allowed",
                transition: "background 120ms",
              }}
            >
              Assign
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Week Tab ─────────────────────────────────────────────────────────────────

type AddPanelState = {
  dateKey: string;
  label: string;
  category: CategoryName;
  timeEstimate: string;
  notes: string;
  showNotes: boolean;
};

function WeekTab() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekDate(new Date()));
  const [scheduled, setScheduled] = useState<ScheduleItem[]>([]);
  const [addPanel, setAddPanel] = useState<AddPanelState | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  useEffect(() => { setScheduled(readSchedule()); }, []);

  const today = todayStr();

  const weekDays: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const weekDayKeys = weekDays.map((d) => toDateStr(d));
  const weekItems = scheduled.filter((i) => weekDayKeys.includes(i.date));
  const weekDone = weekItems.filter((i) => i.done).length;

  function navWeek(dir: -1 | 1) {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  }

  function jumpToday() {
    setWeekStart(startOfWeekDate(new Date()));
  }

  function weekLabel(): string {
    const end = weekDays[6];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (weekStart.getMonth() === end.getMonth()) {
      return `${months[weekStart.getMonth()]} ${weekStart.getDate()}–${end.getDate()}, ${weekStart.getFullYear()}`;
    }
    return `${months[weekStart.getMonth()]} ${weekStart.getDate()} – ${months[end.getMonth()]} ${end.getDate()}`;
  }

  function getItemsForDay(dateKey: string): ScheduleItem[] {
    return scheduled.filter((i) => i.date === dateKey);
  }

  function toggleDone(itemId: string) {
    const next = scheduled.map((i) => i.itemId === itemId ? { ...i, done: !i.done } : i);
    setScheduled(next);
    writeSchedule(next);
  }

  function deleteItem(itemId: string) {
    const next = scheduled.filter((i) => i.itemId !== itemId);
    setScheduled(next);
    writeSchedule(next);
  }

  function openAdd(dateKey: string) {
    setAddPanel({ dateKey, label: "", category: "Career", timeEstimate: "", notes: "", showNotes: false });
  }

  function saveAdd() {
    if (!addPanel || !addPanel.label.trim()) return;
    const newItem: ScheduleItem = {
      itemId: "custom_" + Date.now(),
      label: addPanel.label.trim(),
      category: addPanel.category,
      timeEstimate: addPanel.timeEstimate || undefined,
      notes: addPanel.notes || undefined,
      date: addPanel.dateKey,
      done: false,
      custom: true,
    };
    const next = [...scheduled, newItem];
    setScheduled(next);
    writeSchedule(next);
    setAddPanel(null);
  }

  function handleDragStart(e: React.DragEvent, itemId: string) {
    e.dataTransfer.setData("text/plain", itemId);
  }

  function handleDrop(e: React.DragEvent, dateKey: string) {
    e.preventDefault();
    setDragOverDay(null);
    const itemId = e.dataTransfer.getData("text/plain");
    if (!itemId) return;
    const next = scheduled.map((i) => i.itemId === itemId ? { ...i, date: dateKey } : i);
    setScheduled(next);
    writeSchedule(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <button type="button" onClick={() => navWeek(-1)} style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: 8, cursor: "pointer", color: "var(--text-muted)", padding: "5px 8px", display: "flex", alignItems: "center" }}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{weekLabel()}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {weekDone} / {weekItems.length} tasks done this week
          </div>
        </div>
        <button type="button" onClick={jumpToday} style={{ fontSize: 11, fontWeight: 700, color: ACCENT_CAREER, background: ACCENT_CAREER + "12", border: `1px solid ${ACCENT_CAREER}30`, borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>
          Today
        </button>
        <button type="button" onClick={() => navWeek(1)} style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: 8, cursor: "pointer", color: "var(--text-muted)", padding: "5px 8px", display: "flex", alignItems: "center" }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {weekItems.length > 0 && (
        <div style={{ padding: "0 2px" }}>
          <ProgressBar value={weekDone} total={weekItems.length} color={ACCENT_CAREER} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {weekDays.map((d) => {
          const dateKey = toDateStr(d);
          const isToday = dateKey === today;
          const dayItems = getItemsForDay(dateKey);
          const isAddingHere = addPanel?.dateKey === dateKey;
          const isDragOver = dragOverDay === dateKey;

          return (
            <div
              key={dateKey}
              onDragOver={(e) => { e.preventDefault(); setDragOverDay(dateKey); }}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={(e) => handleDrop(e, dateKey)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                minHeight: 160,
                borderRadius: 12,
                border: isToday ? `2px solid ${ACCENT_CAREER}` : isDragOver ? `2px dashed ${ACCENT_CAREER}60` : "1px solid var(--card-border)",
                background: isToday ? ACCENT_CAREER + "06" : isDragOver ? ACCENT_CAREER + "08" : "var(--card-bg)",
                padding: "10px 8px 8px",
                transition: "border-color 100ms, background 100ms",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 2 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? ACCENT_CAREER : "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {DAY_LABELS_SHORT[d.getDay()]}
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 900,
                  color: isToday ? "#fff" : "var(--text-primary)",
                  background: isToday ? ACCENT_CAREER : "transparent",
                  borderRadius: isToday ? "50%" : 0,
                  width: isToday ? 30 : "auto",
                  height: isToday ? 30 : "auto",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto",
                  lineHeight: 1,
                }}>
                  {d.getDate()}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                {dayItems.map((item) => {
                  const catColor = item.category ? (CATEGORY_COLORS[item.category] ?? ACCENT_CAREER) : ACCENT_CAREER;
                  return (
                    <div
                      key={item.itemId}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.itemId)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 5,
                        padding: "5px 6px",
                        borderRadius: 8,
                        background: item.done ? "var(--app-bg, #F9FAFB)" : catColor + "10",
                        border: `1px solid ${catColor}25`,
                        cursor: "grab",
                        opacity: item.done ? 0.6 : 1,
                      }}
                    >
                      <div style={{ width: 3, borderRadius: 2, background: catColor, flexShrink: 0, alignSelf: "stretch", minHeight: 12 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: item.done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: item.done ? "line-through" : "none", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.label}
                        </div>
                        {item.timeEstimate && (
                          <div style={{ fontSize: 9, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 2, marginTop: 1 }}>
                            <Clock size={8} />
                            {item.timeEstimate}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                        <button type="button" onClick={() => toggleDone(item.itemId)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", lineHeight: 1 }}>
                          {item.done ? <CheckCircle2 size={12} color={ACCENT_FINANCE} strokeWidth={2.2} /> : <Circle size={12} color="var(--text-muted)" strokeWidth={2} />}
                        </button>
                        <button type="button" onClick={() => deleteItem(item.itemId)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", lineHeight: 1, opacity: 0.5 }}>
                          <X size={10} color="var(--text-muted)" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {isAddingHere ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px", borderRadius: 8, background: "var(--app-bg, #F9FAFB)", border: "1px solid var(--card-border)" }}>
                  <input
                    autoFocus
                    type="text"
                    value={addPanel.label}
                    onChange={(e) => setAddPanel((p) => p ? { ...p, label: e.target.value } : p)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveAdd(); if (e.key === "Escape") setAddPanel(null); }}
                    placeholder="Activity title..."
                    style={{ width: "100%", padding: "5px 7px", borderRadius: 6, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 11, outline: "none", boxSizing: "border-box" }}
                  />
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {CATEGORIES.map((cat) => {
                      const color = CATEGORY_COLORS[cat];
                      const isSelected = addPanel.category === cat;
                      return (
                        <button key={cat} type="button" onClick={() => setAddPanel((p) => p ? { ...p, category: cat } : p)} style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, border: `1px solid ${color}${isSelected ? "99" : "40"}`, background: isSelected ? color + "25" : "transparent", color: isSelected ? color : "var(--text-muted)", cursor: "pointer" }}>
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {TIME_OPTIONS.map((t) => {
                      const isSelected = addPanel.timeEstimate === t;
                      return (
                        <button key={t} type="button" onClick={() => setAddPanel((p) => p ? { ...p, timeEstimate: isSelected ? "" : t } : p)} style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, border: `1px solid ${isSelected ? ACCENT_CAREER + "99" : "var(--card-border)"}`, background: isSelected ? ACCENT_CAREER + "15" : "transparent", color: isSelected ? ACCENT_CAREER : "var(--text-muted)", cursor: "pointer" }}>
                          {t}
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" onClick={() => setAddPanel((p) => p ? { ...p, showNotes: !p.showNotes } : p)} style={{ fontSize: 9, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                    {addPanel.showNotes ? "▾ Hide notes" : "▸ Add notes"}
                  </button>
                  {addPanel.showNotes && (
                    <textarea
                      value={addPanel.notes}
                      onChange={(e) => setAddPanel((p) => p ? { ...p, notes: e.target.value } : p)}
                      placeholder="Optional notes..."
                      rows={2}
                      style={{ width: "100%", padding: "5px 7px", borderRadius: 6, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 10, outline: "none", resize: "none", boxSizing: "border-box" }}
                    />
                  )}
                  <div style={{ display: "flex", gap: 4 }}>
                    <button type="button" onClick={saveAdd} style={{ flex: 1, padding: "5px", borderRadius: 6, border: "none", background: ACCENT_CAREER, color: "#fff", fontWeight: 700, fontSize: 10, cursor: "pointer" }}>Save</button>
                    <button type="button" onClick={() => setAddPanel(null)} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-muted)", fontSize: 10, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAdd(dateKey)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: "5px 4px", borderRadius: 7, border: "1px dashed var(--card-border)", background: "transparent", color: "var(--text-muted)", fontSize: 10, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: "auto" }}
                >
                  <Plus size={10} />
                  Add
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: "8px 12px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, alignSelf: "center" }}>Categories:</span>
        {CATEGORIES.map((cat) => (
          <div key={cat} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: CATEGORY_COLORS[cat] }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{cat}</span>
          </div>
        ))}
        <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: "auto", alignSelf: "center" }}>Drag items to reschedule</span>
      </div>
    </div>
  );
}

// ── Habits Tab ────────────────────────────────────────────────────────────────

function MiniHabitGrid({ completedDates, color }: { completedDates: string[]; color: string }) {
  const days = getLast28Days();
  const set = new Set(completedDates);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(28, 1fr)", gap: 2, flex: 1 }}>
      {days.map((d) => {
        const done = set.has(d);
        return <div key={d} title={d} style={{ height: 10, borderRadius: 2, background: done ? color : "var(--card-border)", opacity: done ? 1 : 0.35, transition: "background 100ms" }} />;
      })}
    </div>
  );
}

function HabitRow({ habit, completedDates, onToggle }: { habit: HabitDef; completedDates: string[]; onToggle: (id: string) => void }) {
  const today = todayStr();
  const doneToday = completedDates.includes(today);
  const streak = computeStreak(completedDates);
  const catColor = CATEGORY_COLORS[habit.category] ?? ACCENT_CAREER;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, height: 52, padding: "0 14px 0 0", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--card-border)", overflow: "hidden" }}>
      <div style={{ width: 3, height: "100%", background: catColor, flexShrink: 0, borderRadius: "12px 0 0 12px" }} />
      <div style={{ width: 28, height: 28, borderRadius: 7, background: catColor + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <CategoryIcon category={habit.category} size={13} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: "0 0 auto", maxWidth: 220 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{habit.label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: catColor, background: catColor + "15", padding: "1px 6px", borderRadius: 4, letterSpacing: 0.3, textTransform: "uppercase", flexShrink: 0 }}>{habit.category}</span>
      </div>
      {streak > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 5, background: "#F59E0B18", border: "1px solid #F59E0B25", flexShrink: 0 }}>
          <Flame size={11} color="#F59E0B" strokeWidth={2.2} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#F59E0B" }}>{streak}</span>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, padding: "0 4px" }}>
        <MiniHabitGrid completedDates={completedDates} color={catColor} />
      </div>
      <button type="button" onClick={() => onToggle(habit.id)} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}>
        {doneToday ? <CheckCircle2 size={22} color={ACCENT_FINANCE} strokeWidth={2.2} /> : <Circle size={22} color="var(--text-muted)" strokeWidth={1.8} />}
      </button>
    </div>
  );
}

function HabitsTab() {
  const [habits, setHabits] = useState<HabitDef[]>(DEFAULT_HABITS);
  const [habitData, setHabitData] = useState<HabitRecord[]>([]);
  const [addingHabit, setAddingHabit] = useState(false);
  const [newHabitLabel, setNewHabitLabel] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HABITS_KEY);
      if (raw) setHabitData(JSON.parse(raw) as HabitRecord[]);
    } catch {}
    try {
      const rawH = localStorage.getItem(HABITS_CUSTOM_KEY);
      if (rawH) {
        const custom = JSON.parse(rawH) as HabitDef[];
        setHabits([...DEFAULT_HABITS, ...custom]);
      }
    } catch {}
  }, []);

  function saveHabitData(next: HabitRecord[]) {
    setHabitData(next);
    try { localStorage.setItem(HABITS_KEY, JSON.stringify(next)); } catch {}
  }

  function handleToggle(habitId: string) {
    const today = todayStr();
    const next = [...habitData];
    const idx = next.findIndex((r) => r.habitId === habitId);
    if (idx === -1) {
      next.push({ habitId, dates: [today] });
    } else {
      const record = { ...next[idx] };
      if (record.dates.includes(today)) record.dates = record.dates.filter((d) => d !== today);
      else record.dates = [...record.dates, today];
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
    const newH: HabitDef = { id: "custom_" + Date.now(), label: trimmed, category: "Learning", streak: 0, custom: true };
    const next = [...habits, newH];
    setHabits(next);
    try { localStorage.setItem(HABITS_CUSTOM_KEY, JSON.stringify(next.filter((h) => h.custom))); } catch {}
    setNewHabitLabel("");
    setAddingHabit(false);
  }

  const today = todayStr();
  const doneCount = habits.filter((h) => getCompletedDates(h.id).includes(today)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Daily Habits</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{doneCount} of {habits.length} completed today</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 100, height: 6, borderRadius: 3, background: "var(--card-border)", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${habits.length === 0 ? 0 : Math.round((doneCount / habits.length) * 100)}%`, background: ACCENT_FINANCE, borderRadius: 3, transition: "width 300ms" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT_FINANCE }}>{habits.length === 0 ? 0 : Math.round((doneCount / habits.length) * 100)}%</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3px 28px 1fr auto 1fr 30px", gap: 12, padding: "0 14px 0 0", alignItems: "center" }}>
        <div /><div />
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>Habit</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>Streak</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>28-day activity</div>
        <div />
      </div>

      {habits.map((habit) => <HabitRow key={habit.id} habit={habit} completedDates={getCompletedDates(habit.id)} onToggle={handleToggle} />)}

      {addingHabit ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <input autoFocus type="text" value={newHabitLabel} onChange={(e) => setNewHabitLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddHabit(); if (e.key === "Escape") { setAddingHabit(false); setNewHabitLabel(""); } }} placeholder="New habit name..." style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--app-bg)", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
          <button type="button" onClick={handleAddHabit} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: ACCENT_CAREER, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Add</button>
          <button type="button" onClick={() => { setAddingHabit(false); setNewHabitLabel(""); }} style={{ padding: "6px", borderRadius: 8, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center" }}><X size={14} /></button>
        </div>
      ) : (
        <button type="button" onClick={() => setAddingHabit(true)} style={{ display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start", background: "var(--card-bg)", border: "1px dashed var(--card-border)", borderRadius: 10, padding: "8px 14px", color: ACCENT_CAREER, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          <Plus size={14} />Add habit
        </button>
      )}
    </div>
  );
}

// ── Goals Tab ────────────────────────────────────────────────────────────────

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
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 3, height: 20, borderRadius: 2, background: category.color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", flex: 1 }}>{category.label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{doneCount}/{total}</span>
          <div style={{ width: 72, height: 5, borderRadius: 3, background: "var(--card-border)", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: category.color, borderRadius: 3, transition: "width 300ms" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: category.color, minWidth: 28, textAlign: "right" }}>{pct}%</span>
        </div>
      </div>
      <div style={{ padding: "6px 0" }}>
        {category.goals.map((goal, idx) => (
          <label key={goal.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", cursor: "pointer", borderBottom: idx < category.goals.length - 1 ? "1px solid var(--card-border)" : "none" }}>
            <input type="checkbox" checked={goal.done} onChange={() => onToggleGoal(category.id, goal.id)} style={{ accentColor: category.color, width: 15, height: 15, cursor: "pointer", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: goal.done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: goal.done ? "line-through" : "none", lineHeight: 1.4, flex: 1 }}>{goal.label}</span>
            {goal.done && <CheckCircle2 size={14} color={ACCENT_FINANCE} strokeWidth={2} />}
          </label>
        ))}
      </div>
      <div style={{ padding: "8px 16px", borderTop: "1px solid var(--card-border)" }}>
        {adding ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input autoFocus type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewLabel(""); } }} placeholder="New goal..." style={{ flex: 1, padding: "6px 10px", borderRadius: 7, border: "1px solid var(--card-border)", background: "var(--app-bg)", color: "var(--text-primary)", fontSize: 12, outline: "none" }} />
            <button type="button" onClick={handleAdd} style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: category.color, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Add</button>
            <button type="button" onClick={() => { setAdding(false); setNewLabel(""); }} style={{ padding: "6px", borderRadius: 7, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}><X size={13} /></button>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", color: category.color, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "2px 0" }}><Plus size={13} />Add goal</button>
        )}
      </div>
    </div>
  );
}

function GoalsTab() {
  const [categories, setCategories] = useState<GoalCategory[]>(DEFAULT_GOAL_CATEGORIES);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GOALS_KEY);
      if (raw) setCategories(JSON.parse(raw) as GoalCategory[]);
    } catch {}
  }, []);

  function save(next: GoalCategory[]) {
    setCategories(next);
    try { localStorage.setItem(GOALS_KEY, JSON.stringify(next)); } catch {}
  }

  function handleToggleGoal(catId: string, goalId: string) {
    save(categories.map((cat) => cat.id !== catId ? cat : { ...cat, goals: cat.goals.map((g) => g.id === goalId ? { ...g, done: !g.done } : g) }));
  }

  function handleAddGoal(catId: string, label: string) {
    save(categories.map((cat) => cat.id !== catId ? cat : { ...cat, goals: [...cat.goals, { id: "g_" + Date.now(), label, done: false, custom: true }] }));
  }

  const totalGoals = categories.reduce((s, c) => s + c.goals.length, 0);
  const doneGoals = categories.reduce((s, c) => s + c.goals.filter((g) => g.done).length, 0);
  const overallPct = totalGoals === 0 ? 0 : Math.round((doneGoals / totalGoals) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Milestone Goals</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{doneGoals} of {totalGoals} goals complete</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 110, height: 6, borderRadius: 3, background: "var(--card-border)", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${overallPct}%`, background: ACCENT_FINANCE, borderRadius: 3, transition: "width 300ms" }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT_FINANCE, minWidth: 32, textAlign: "right" }}>{overallPct}%</span>
        </div>
      </div>
      {categories.map((cat) => <GoalCategoryBlock key={cat.id} category={cat} onToggleGoal={handleToggleGoal} onAddGoal={handleAddGoal} />)}
    </div>
  );
}

// ── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab() {
  const [scheduled, setScheduled] = useState<ScheduleItem[]>([]);
  const [habitData, setHabitData] = useState<HabitRecord[]>([]);
  const [habits, setHabits] = useState<HabitDef[]>(DEFAULT_HABITS);
  const [categories, setCategories] = useState<GoalCategory[]>(DEFAULT_GOAL_CATEGORIES);

  useEffect(() => {
    setScheduled(readSchedule());
    try {
      const raw = localStorage.getItem(HABITS_KEY);
      if (raw) setHabitData(JSON.parse(raw) as HabitRecord[]);
    } catch {}
    try {
      const rawH = localStorage.getItem(HABITS_CUSTOM_KEY);
      if (rawH) setHabits([...DEFAULT_HABITS, ...(JSON.parse(rawH) as HabitDef[])]);
    } catch {}
    try {
      const rawG = localStorage.getItem(GOALS_KEY);
      if (rawG) setCategories(JSON.parse(rawG) as GoalCategory[]);
    } catch {}
  }, []);

  const today = todayStr();
  const weekStartDate = startOfWeekDate(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + i);
    return toDateStr(d);
  });
  const weekScheduled = scheduled.filter((i) => weekDays.includes(i.date));
  const weekDone = weekScheduled.filter((i) => i.done).length;
  const weekTotal = weekScheduled.length;
  const allDone = scheduled.filter((i) => i.done).length;
  const allTotal = scheduled.length;

  const habitStreaks = habits.map((h) => {
    const dates = habitData.find((r) => r.habitId === h.id)?.dates ?? [];
    return { habit: h, streak: computeStreak(dates), dates };
  }).sort((a, b) => b.streak - a.streak).slice(0, 3);

  const goalStats = categories.map((cat) => ({
    label: cat.label,
    color: cat.color,
    done: cat.goals.filter((g) => g.done).length,
    total: cat.goals.length,
  }));

  const heatmapDays: string[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    heatmapDays.push(toDateStr(d));
  }
  const doneDayMap = new Map<string, number>();
  for (const item of scheduled) {
    if (item.done) doneDayMap.set(item.date, (doneDayMap.get(item.date) ?? 0) + 1);
  }
  const maxDoneInDay = Math.max(1, ...Array.from(doneDayMap.values()));

  function heatColor(count: number): string {
    if (count === 0) return "var(--card-border)";
    const intensity = Math.min(count / maxDoneInDay, 1);
    const alpha = Math.round(intensity * 200 + 40);
    return `rgba(37, 99, 235, ${(alpha / 255).toFixed(2)})`;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ padding: "16px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <BarChart2 size={15} color={ACCENT_CAREER} />
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>This Week</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>{weekDone} / {weekTotal} tasks</span>
        </div>
        <ProgressBar value={weekDone} total={weekTotal} color={ACCENT_CAREER} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginTop: 12 }}>
          {weekDays.map((d) => {
            const dayItems = scheduled.filter((i) => i.date === d);
            const dayDone = dayItems.filter((i) => i.done).length;
            const isToday = d === today;
            return (
              <div key={d} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: isToday ? ACCENT_CAREER : "var(--text-muted)", fontWeight: isToday ? 800 : 500, marginBottom: 3 }}>
                  {DAY_LABELS_SHORT[new Date(d + "T12:00:00").getDay()]}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: isToday ? ACCENT_CAREER : "var(--text-primary)" }}>
                  {dayItems.length === 0 ? "—" : `${dayDone}/${dayItems.length}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "16px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Flame size={15} color="#F59E0B" />
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>Top Habit Streaks</span>
        </div>
        {habitStreaks.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No habits tracked yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {habitStreaks.map(({ habit, streak, dates }) => {
              const catColor = CATEGORY_COLORS[habit.category] ?? ACCENT_CAREER;
              const last7 = getLast7Days();
              const doneSet = new Set(dates);
              return (
                <div key={habit.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 3, height: 32, borderRadius: 2, background: catColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{habit.label}</div>
                    <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                      {last7.map((d) => (
                        <div key={d} title={d} style={{ width: 14, height: 14, borderRadius: 3, background: doneSet.has(d) ? catColor : "var(--card-border)", opacity: doneSet.has(d) ? 1 : 0.35 }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <Flame size={13} color="#F59E0B" />
                    <span style={{ fontSize: 15, fontWeight: 900, color: streak > 0 ? "#F59E0B" : "var(--text-muted)" }}>{streak}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>day{streak !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: "16px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Flag size={15} color={ACCENT_LEARNING} />
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>Goals Progress</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {goalStats.map((cat) => (
            <div key={cat.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{cat.label}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{cat.done}/{cat.total}</span>
              </div>
              <ProgressBar value={cat.done} total={cat.total} color={cat.color} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Target size={15} color={ACCENT_CAREER} />
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>All-Time</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ padding: "12px", borderRadius: 10, background: ACCENT_CAREER + "08", border: `1px solid ${ACCENT_CAREER}20`, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: ACCENT_CAREER }}>{allTotal}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Sessions Scheduled</div>
          </div>
          <div style={{ padding: "12px", borderRadius: 10, background: ACCENT_FINANCE + "08", border: `1px solid ${ACCENT_FINANCE}20`, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: ACCENT_FINANCE }}>{allDone}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Sessions Completed</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", borderRadius: 12, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Calendar size={15} color={ACCENT_CAREER} />
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>Activity (12 weeks)</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 6 }}>
          {Array.from({ length: 12 }, (_, weekIdx) => (
            <div key={weekIdx} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {Array.from({ length: 7 }, (_, dayIdx) => {
                const heatIdx = weekIdx * 7 + dayIdx;
                const dateKey = heatmapDays[heatIdx] ?? "";
                const count = doneDayMap.get(dateKey) ?? 0;
                const isTodayCell = dateKey === today;
                return (
                  <div
                    key={dayIdx}
                    title={dateKey ? `${dateKey}: ${count} done` : ""}
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      borderRadius: 2,
                      background: heatColor(count),
                      outline: isTodayCell ? `1.5px solid ${ACCENT_CAREER}` : "none",
                      outlineOffset: 1,
                      transition: "background 100ms",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, justifyContent: "flex-end" }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <div key={v} style={{ width: 10, height: 10, borderRadius: 2, background: v === 0 ? "var(--card-border)" : `rgba(37, 99, 235, ${(v * 0.78 + 0.16).toFixed(2)})` }} />
          ))}
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>More</span>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type TabKey = "today" | "week" | "habits" | "goals" | "stats";

const TABS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "habits", label: "Habits" },
  { key: "goals", label: "Goals" },
  { key: "stats", label: "Stats" },
];

export default function PlannerPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("today");

  return (
    <PremiumShell hideHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.4, display: "flex", alignItems: "center", gap: 8 }}>
              <Target size={20} color={ACCENT_CAREER} strokeWidth={2.2} />
              Planner
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
              Habits, goals, and daily focus — all in one place.
            </div>
          </div>
          <SegmentedControl tabs={TABS} active={activeTab} onChange={(k) => setActiveTab(k as TabKey)} />
        </div>

        {activeTab === "today" && <TodayTab />}
        {activeTab === "week" && <WeekTab />}
        {activeTab === "habits" && <HabitsTab />}
        {activeTab === "goals" && <GoalsTab />}
        {activeTab === "stats" && <StatsTab />}
      </div>
    </PremiumShell>
  );
}
