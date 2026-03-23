"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";

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

const DEFAULT_HABITS = [
  { id: "practice", icon: "🎙️", label: "Practice session", category: "Career", streak: 0 },
  { id: "budget_check", icon: "💳", label: "Budget check-in", category: "Finance", streak: 0 },
  { id: "networking", icon: "🤝", label: "Networking practice", category: "Career", streak: 0 },
  { id: "read_guide", icon: "📚", label: "Read a guide or module", category: "Learning", streak: 0 },
  { id: "journal", icon: "✍️", label: "Career journal entry", category: "Mindset", streak: 0 },
  { id: "linkedin", icon: "💼", label: "LinkedIn activity", category: "Career", streak: 0 },
  { id: "savings_check", icon: "💰", label: "Check savings goal", category: "Finance", streak: 0 },
  { id: "apply_job", icon: "📄", label: "Job application or follow-up", category: "Career", streak: 0 },
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
      { id: "sk1", label: "Take career aptitude quiz", done: false },
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

type FocusCard = {
  title: string;
  desc: string;
  time: string;
  href: string;
  color: string;
  label: string;
};

function getFocusCards(day: number): { practice: FocusCard; financial: FocusCard; career: FocusCard } | { weekend: FocusCard[] } {
  // 0=Sun,1=Mon,...,6=Sat
  const weekday = (d: number) => d >= 1 && d <= 5;

  if (day === 1) {
    return {
      practice: { title: "Interview Prep", desc: "Run through a mock behavioral question using the STAR method.", time: "15 min", href: "/practice", color: ACCENT_CAREER, label: "Practice" },
      financial: { title: "Budget Review", desc: "Check last week's spending against your budget categories.", time: "10 min", href: "/career-guide/budget", color: ACCENT_FINANCE, label: "Finance" },
      career: { title: "Career Aptitude", desc: "Explore your strengths and work style with the aptitude quiz.", time: "20 min", href: "/aptitude", color: ACCENT_LEARNING, label: "Career" },
    };
  }
  if (day === 2) {
    return {
      practice: { title: "Public Speaking", desc: "Practice a confident 60-second introduction out loud.", time: "15 min", href: "/public-speaking", color: ACCENT_CAREER, label: "Practice" },
      financial: { title: "Emergency Fund Check", desc: "Log into your savings account and note your current balance.", time: "5 min", href: "/career-guide/budget", color: ACCENT_FINANCE, label: "Finance" },
      career: { title: "LinkedIn Update", desc: "Add a recent experience or skill to your LinkedIn profile.", time: "15 min", href: "/networking", color: ACCENT_LEARNING, label: "Career" },
    };
  }
  if (day === 3) {
    return {
      practice: { title: "Networking Pitch", desc: "Practice your 30-second networking pitch for a career fair scenario.", time: "10 min", href: "/networking", color: ACCENT_CAREER, label: "Practice" },
      financial: { title: "Retirement Projection", desc: "Use the budget tool to review your long-term savings trajectory.", time: "10 min", href: "/career-guide/budget", color: ACCENT_FINANCE, label: "Finance" },
      career: { title: "Future-Proof Reading", desc: "Read one section of the AI & career resilience guide.", time: "20 min", href: "/future-proof", color: ACCENT_LEARNING, label: "Career" },
    };
  }
  if (day === 4) {
    return {
      practice: { title: "Interview Prep", desc: "Practice a technical or situational question for your target role.", time: "20 min", href: "/practice", color: ACCENT_CAREER, label: "Practice" },
      financial: { title: "Budget Review", desc: "Mid-week budget snapshot — how are you tracking against your plan?", time: "10 min", href: "/career-guide/budget", color: ACCENT_FINANCE, label: "Finance" },
      career: { title: "Resume Gap Analysis", desc: "Identify one skill or experience gap and plan how to address it.", time: "15 min", href: "/career-guide", color: ACCENT_LEARNING, label: "Career" },
    };
  }
  if (day === 5) {
    return {
      practice: { title: "Public Speaking or Networking", desc: "Finish the week strong — pick a speaking or pitch scenario to practice.", time: "15 min", href: "/public-speaking", color: ACCENT_CAREER, label: "Practice" },
      financial: { title: "Financial Literacy Module", desc: "Complete one module in the financial literacy track.", time: "20 min", href: "/financial-literacy", color: ACCENT_FINANCE, label: "Finance" },
      career: { title: "Career Check-In", desc: "Review your weekly progress and set intentions for next week.", time: "10 min", href: "/career-checkin", color: ACCENT_LEARNING, label: "Career" },
    };
  }
  // Weekend
  return {
    weekend: [
      { title: "Practice — Your Pick", desc: "Interview, public speaking, or networking — choose what feels right today.", time: "15 min", href: "/practice", color: ACCENT_CAREER, label: "Practice" },
      { title: "Financial Check-In", desc: "Review your budget or savings goal at your own pace.", time: "10 min", href: "/career-guide/budget", color: ACCENT_FINANCE, label: "Finance" },
      { title: "Career Exploration", desc: "Browse job profiles, read a guide, or explore a new skill area.", time: "20 min", href: "/career-guide", color: ACCENT_LEARNING, label: "Career" },
    ],
  };
}

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
  let cursor = new Date(today);
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

function getLast4Weeks(): string[] {
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

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getTodayLong(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TabPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 20px",
        borderRadius: 999,
        border: "none",
        background: active ? "var(--accent)" : "var(--card-bg)",
        color: active ? "#fff" : "var(--text-muted)",
        fontWeight: active ? 800 : 700,
        fontSize: 14,
        cursor: "pointer",
        boxShadow: active ? "0 2px 8px rgba(37,99,235,0.18)" : "none",
        transition: "background 140ms, color 140ms",
        outline: "none",
      }}
    >
      {label}
    </button>
  );
}

function FocusActionCard({ card }: { card: FocusCard }) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flex: "1 1 200px",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: card.color,
            background: card.color + "18",
            padding: "2px 8px",
            borderRadius: 6,
            letterSpacing: 0.3,
            textTransform: "uppercase",
          }}
        >
          {card.label}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{card.time}</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.3 }}>{card.title}</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, flex: 1 }}>{card.desc}</div>
      <Link
        href={card.href}
        style={{
          alignSelf: "flex-start",
          marginTop: 4,
          fontSize: 13,
          fontWeight: 800,
          color: card.color,
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        Start →
      </Link>
    </div>
  );
}

function ScheduleBlock({ title, items }: { title: string; items: ScheduleItem[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>{title}</div>
      {items.length === 0 ? (
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: 12,
            padding: "14px 18px",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          Nothing scheduled — check your checklist to add items.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((item) => (
            <div
              key={item.itemId + item.date}
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: 12,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: item.done ? ACCENT_FINANCE : ACCENT_CAREER,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: item.done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: item.done ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.label}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{formatDateDisplay(item.date)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HeatMapGrid({ completedDates }: { completedDates: string[] }) {
  const days = getLast4Weeks();
  const set = new Set(completedDates);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(28, 1fr)", gap: 2, marginTop: 6 }}>
      {days.map((d) => {
        const done = set.has(d);
        return (
          <div
            key={d}
            title={d}
            style={{
              width: "100%",
              paddingBottom: "100%",
              borderRadius: 3,
              background: done ? ACCENT_CAREER : "var(--card-border)",
              opacity: done ? 1 : 0.4,
              transition: "background 120ms",
            }}
          />
        );
      })}
    </div>
  );
}

type HabitDef = {
  id: string;
  icon: string;
  label: string;
  category: string;
  streak?: number;
};

function HabitCard({
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
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: 16,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{habit.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.3 }}>{habit.label}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: catColor,
                background: catColor + "18",
                padding: "1px 7px",
                borderRadius: 5,
                letterSpacing: 0.3,
                textTransform: "uppercase",
              }}
            >
              {habit.category}
            </span>
            {streak > 1 && (
              <span style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700 }}>
                🔥 {streak} day streak
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggle(habit.id)}
          aria-label={doneToday ? "Mark incomplete" : "Mark complete"}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: `2px solid ${doneToday ? ACCENT_FINANCE : "var(--card-border)"}`,
            background: doneToday ? ACCENT_FINANCE : "transparent",
            color: doneToday ? "#fff" : "var(--text-muted)",
            fontSize: 16,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background 140ms, border-color 140ms",
            outline: "none",
          }}
        >
          {doneToday ? "✓" : ""}
        </button>
      </div>
      <HeatMapGrid completedDates={completedDates} />
    </div>
  );
}

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
        borderRadius: 16,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: category.color,
            flexShrink: 0,
          }}
        />
        <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text-primary)" }}>{category.label}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {category.goals.map((goal) => (
          <label
            key={goal.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              padding: "6px 0",
            }}
          >
            <input
              type="checkbox"
              checked={goal.done}
              onChange={() => onToggleGoal(category.id, goal.id)}
              style={{ accentColor: category.color, width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: goal.done ? ACCENT_FINANCE : "var(--text-primary)",
                textDecoration: goal.done ? "line-through" : "none",
                lineHeight: 1.4,
              }}
            >
              {goal.label}
            </span>
          </label>
        ))}
      </div>

      {adding ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
          <input
            autoFocus
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewLabel(""); } }}
            placeholder="New goal..."
            style={{
              flex: 1,
              padding: "7px 12px",
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
            onClick={handleAdd}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: category.color, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewLabel(""); }}
            style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{
            alignSelf: "flex-start",
            marginTop: 2,
            background: "transparent",
            border: "none",
            color: category.color,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            padding: "2px 0",
          }}
        >
          + Add goal
        </button>
      )}
    </div>
  );
}

// ── Tab: Today ─────────────────────────────────────────────────────────────

function TodayTab() {
  const day = new Date().getDay();
  const focus = getFocusCards(day);
  const isWeekend = "weekend" in focus;

  const [scheduled, setScheduled] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ipc_schedule_v1");
      if (raw) setScheduled(JSON.parse(raw));
    } catch {}
  }, []);

  const today = todayStr();
  const todayItems = scheduled.filter((i) => i.date === today);

  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = toDateStr(weekEnd);
  const weekItems = scheduled.filter((i) => i.date > today && i.date <= weekEndStr);

  const cards: FocusCard[] = isWeekend
    ? (focus as { weekend: FocusCard[] }).weekend
    : [
        (focus as { practice: FocusCard; financial: FocusCard; career: FocusCard }).practice,
        (focus as { practice: FocusCard; financial: FocusCard; career: FocusCard }).financial,
        (focus as { practice: FocusCard; financial: FocusCard; career: FocusCard }).career,
      ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Greeting */}
      <div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", letterSpacing: -0.5 }}>
          {getGreeting()} 👋
        </div>
        <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>{getTodayLong()}</div>
      </div>

      {/* Today's Focus */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text-primary)", marginBottom: 12 }}>
          {isWeekend ? "Pick your focus today" : "Today's Focus"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {cards.map((card) => (
            <FocusActionCard key={card.title} card={card} />
          ))}
        </div>
      </div>

      {/* Scheduled for today */}
      <ScheduleBlock title="Scheduled for Today" items={todayItems} />

      {/* This week */}
      <ScheduleBlock title="This Week" items={weekItems} />
    </div>
  );
}

// ── Tab: Habits ────────────────────────────────────────────────────────────

type HabitEntry = HabitDef & { custom?: boolean };

function HabitsTab() {
  const [habits, setHabits] = useState<HabitEntry[]>(DEFAULT_HABITS);
  const [habitData, setHabitData] = useState<HabitRecord[]>([]);
  const [addingHabit, setAddingHabit] = useState(false);
  const [newHabitLabel, setNewHabitLabel] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ipc_habits_v1");
      if (raw) setHabitData(JSON.parse(raw));
    } catch {}
    try {
      const rawH = localStorage.getItem("ipc_habits_custom_v1");
      if (rawH) {
        const custom: HabitEntry[] = JSON.parse(rawH);
        setHabits([...DEFAULT_HABITS, ...custom]);
      }
    } catch {}
  }, []);

  function saveHabitData(next: HabitRecord[]) {
    setHabitData(next);
    try { localStorage.setItem("ipc_habits_v1", JSON.stringify(next)); } catch {}
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
    const newH: HabitEntry = {
      id: "custom_" + Date.now(),
      icon: "⭐",
      label: trimmed,
      category: "Learning",
      streak: 0,
      custom: true,
    };
    const next = [...habits, newH];
    setHabits(next);
    const customOnly = next.filter((h) => h.custom);
    try { localStorage.setItem("ipc_habits_custom_v1", JSON.stringify(customOnly)); } catch {}
    setNewHabitLabel("");
    setAddingHabit(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text-primary)", marginBottom: 4 }}>Daily Habit Tracker</div>

      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          completedDates={getCompletedDates(habit.id)}
          onToggle={handleToggle}
        />
      ))}

      {addingHabit ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            autoFocus
            type="text"
            value={newHabitLabel}
            onChange={(e) => setNewHabitLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddHabit(); if (e.key === "Escape") { setAddingHabit(false); setNewHabitLabel(""); } }}
            placeholder="New habit name..."
            style={{
              flex: 1,
              padding: "9px 14px",
              borderRadius: 10,
              border: "1px solid var(--card-border)",
              background: "var(--app-bg)",
              color: "var(--text-primary)",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={handleAddHabit}
            style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: ACCENT_CAREER, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setAddingHabit(false); setNewHabitLabel(""); }}
            style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-muted)", fontSize: 14, cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingHabit(true)}
          style={{
            alignSelf: "flex-start",
            background: "var(--card-bg)",
            border: "1px dashed var(--card-border)",
            borderRadius: 12,
            padding: "10px 18px",
            color: ACCENT_CAREER,
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          + Add habit
        </button>
      )}
    </div>
  );
}

// ── Tab: Goals ─────────────────────────────────────────────────────────────

function GoalsTab() {
  const [categories, setCategories] = useState<GoalCategory[]>(DEFAULT_GOAL_CATEGORIES);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ipc_goals_v1");
      if (raw) setCategories(JSON.parse(raw));
    } catch {}
  }, []);

  function save(next: GoalCategory[]) {
    setCategories(next);
    try { localStorage.setItem("ipc_goals_v1", JSON.stringify(next)); } catch {}
  }

  function handleToggleGoal(catId: string, goalId: string) {
    const next = categories.map((cat) => {
      if (cat.id !== catId) return cat;
      return {
        ...cat,
        goals: cat.goals.map((g) => g.id === goalId ? { ...g, done: !g.done } : g),
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
  const pct = totalGoals === 0 ? 0 : Math.round((doneGoals / totalGoals) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text-primary)" }}>Milestone Goals</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          <span style={{ fontWeight: 800, color: ACCENT_FINANCE }}>{doneGoals}</span> / {totalGoals} complete
          <span
            style={{
              marginLeft: 10,
              display: "inline-block",
              width: 80,
              height: 6,
              borderRadius: 3,
              background: "var(--card-border)",
              verticalAlign: "middle",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${pct}%`,
                background: ACCENT_FINANCE,
                borderRadius: 3,
                transition: "width 300ms",
              }}
            />
          </span>
          <span style={{ marginLeft: 6, fontWeight: 800 }}>{pct}%</span>
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

export default function PlannerPage() {
  const [activeTab, setActiveTab] = useState<"today" | "habits" | "goals">("today");

  return (
    <PremiumShell hideHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Page header */}
        <div>
          <div style={{ fontSize: 22, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.5 }}>
            Daily Planner
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Your personal productivity hub — track habits, set goals, and stay on schedule.
          </div>
        </div>

        {/* Tab pills */}
        <div
          style={{
            display: "flex",
            gap: 6,
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: 999,
            padding: 4,
            alignSelf: "flex-start",
          }}
        >
          <TabPill label="Today" active={activeTab === "today"} onClick={() => setActiveTab("today")} />
          <TabPill label="Habits" active={activeTab === "habits"} onClick={() => setActiveTab("habits")} />
          <TabPill label="Goals" active={activeTab === "goals"} onClick={() => setActiveTab("goals")} />
        </div>

        {/* Tab content */}
        {activeTab === "today" && <TodayTab />}
        {activeTab === "habits" && <HabitsTab />}
        {activeTab === "goals" && <GoalsTab />}
      </div>
    </PremiumShell>
  );
}
