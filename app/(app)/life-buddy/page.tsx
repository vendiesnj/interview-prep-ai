"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import PremiumShell from "@/app/components/PremiumShell";
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar, DollarSign,
  TrendingUp, Trash2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type CalEvent = {
  id: string;
  title: string;
  date: string;           // YYYY-MM-DD (current scheduled date)
  startHour: number;      // 0–23
  startMin: number;       // 0 | 30
  durationMins: number;
  color: string;
  allDay?: boolean;
  completed?: boolean;
  completedAt?: string;   // YYYY-MM-DD when marked complete
  originalDate?: string;  // first scheduled date — never changes
  pushCount?: number;     // times moved to a later date
};

type BudgetLine = { id: string; label: string; category: "needs" | "wants" | "savings"; amount: number; placeholder: number };
type OneTimeExpense = { id: string; monthKey: string; label: string; amount: number };

// ── Constants ─────────────────────────────────────────────────────────────────

const CAL_KEY    = "lb_calendar_v1";
const BUDGET_KEY = "lb_budget_v1";
const RETIRE_KEY = "lb_retire_v1";
const PROJ_KEY   = "lb_projections_v1";

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am–10pm
const HOUR_H = 64; // px per hour slot

const COLORS = [
  { label: "Blue",   value: "#2563EB" },
  { label: "Green",  value: "#10B981" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Orange", value: "#F59E0B" },
  { label: "Red",    value: "#EF4444" },
  { label: "Pink",   value: "#EC4899" },
];

const DEFAULT_BUDGET: BudgetLine[] = [
  { id: "rent",       label: "Rent / Mortgage",      category: "needs",   amount: 0, placeholder: 1400 },
  { id: "utilities",  label: "Utilities & Internet", category: "needs",   amount: 0, placeholder: 120  },
  { id: "groceries",  label: "Groceries",            category: "needs",   amount: 0, placeholder: 300  },
  { id: "transport",  label: "Transportation",       category: "needs",   amount: 0, placeholder: 200  },
  { id: "insurance",  label: "Health Insurance",     category: "needs",   amount: 0, placeholder: 180  },
  { id: "loans",      label: "Loan Minimums",        category: "needs",   amount: 0, placeholder: 250  },
  { id: "dining",     label: "Dining Out",           category: "wants",   amount: 0, placeholder: 150  },
  { id: "entertain",  label: "Entertainment",        category: "wants",   amount: 0, placeholder: 80   },
  { id: "subs",       label: "Subscriptions",        category: "wants",   amount: 0, placeholder: 60   },
  { id: "shopping",   label: "Shopping",             category: "wants",   amount: 0, placeholder: 100  },
  { id: "emergency",  label: "Emergency Fund",       category: "savings", amount: 0, placeholder: 150  },
  { id: "k401",       label: "401(k) Contribution",  category: "savings", amount: 0, placeholder: 300  },
  { id: "roth",       label: "Roth IRA",             category: "savings", amount: 0, placeholder: 100  },
];

const CAT_CFG = {
  needs:   { label: "Needs",   color: "#2563EB", ideal: 50, desc: "Rent, food, transport, insurance" },
  wants:   { label: "Wants",   color: "#F59E0B", ideal: 30, desc: "Dining, entertainment, shopping"  },
  savings: { label: "Savings", color: "#10B981", ideal: 20, desc: "Emergency fund, 401k, Roth IRA"   },
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }
function todayStr()         { return toDateStr(new Date()); }
function uid()              { return Math.random().toString(36).slice(2); }

function fmtHour(h: number) {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function fmtTime(h: number, m: number) {
  const s = h >= 12 ? "pm" : "am";
  const d = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${d}${s}` : `${d}:${m.toString().padStart(2, "0")}${s}`;
}

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return { date: d, key: toDateStr(d) };
  });
}

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtCurrency(n: number) {
  return n < 0
    ? `-$${Math.abs(Math.round(n)).toLocaleString()}`
    : `$${Math.round(n).toLocaleString()}`;
}

function futureValue(pv: number, pmt: number, r: number, n: number): number {
  if (r === 0) return pv + pmt * n;
  return pv * Math.pow(1 + r, n) + pmt * ((Math.pow(1 + r, n) - 1) / r);
}

// ── Add/Edit Event Modal ──────────────────────────────────────────────────────

type ModalState = {
  mode: "add" | "edit";
  event?: CalEvent;
  date: string;
  hour: number;
  min: number;
};

function EventModal({
  state, onSave, onDelete, onClose,
}: {
  state: ModalState;
  onSave: (e: CalEvent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const isEdit = state.mode === "edit";
  const [title, setTitle]           = useState(isEdit ? state.event!.title : "");
  const [color, setColor]           = useState(isEdit ? state.event!.color : "#2563EB");
  const [startH, setStartH]         = useState(isEdit ? state.event!.startHour : state.hour);
  const [startM, setStartM]         = useState(isEdit ? state.event!.startMin : state.min);
  const [duration, setDuration]     = useState(isEdit ? state.event!.durationMins : 60);
  const [date, setDate]             = useState(isEdit ? state.event!.date : state.date);
  const [allDay, setAllDay]         = useState(isEdit ? !!state.event!.allDay : false);
  const [completed, setCompleted]   = useState(isEdit ? !!state.event!.completed : false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  function handleSave() {
    if (!title.trim()) return;
    const originalDate = isEdit ? (state.event!.originalDate ?? state.event!.date) : date;
    const prevDate     = isEdit ? state.event!.date : date;
    const pushed       = isEdit && date > prevDate;
    onSave({
      id:           isEdit ? state.event!.id : uid(),
      title:        title.trim(),
      date,
      startHour:    startH,
      startMin:     startM,
      durationMins: duration,
      color,
      allDay,
      completed,
      completedAt:  completed ? (isEdit && state.event!.completedAt ? state.event!.completedAt : todayStr()) : undefined,
      originalDate,
      pushCount:    pushed ? ((state.event!.pushCount ?? 0) + 1) : (state.event?.pushCount ?? 0),
    });
    onClose();
  }

  const hourOptions = Array.from({ length: 24 }, (_, h) => (
    <option key={h} value={h}>{fmtHour(h)}</option>
  ));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--card-bg)", borderRadius: 18, padding: 28, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", border: "1px solid var(--card-border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{isEdit ? "Edit event" : "New event"}</span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={18} /></button>
        </div>

        <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSave()}
          placeholder="Event title"
          style={{ width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 14, fontWeight: 600, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ display: "block", marginTop: 4, width: "100%", padding: "8px 12px", borderRadius: 9, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box" }} />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} style={{ accentColor: "#2563EB" }} />
          All-day event
        </label>

        {!allDay && (
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Start</label>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <select value={startH} onChange={e => setStartH(Number(e.target.value))}
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 9, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 13 }}>
                  {hourOptions}
                </select>
                <select value={startM} onChange={e => setStartM(Number(e.target.value))}
                  style={{ width: 64, padding: "8px 10px", borderRadius: 9, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 13 }}>
                  <option value={0}>:00</option>
                  <option value={30}>:30</option>
                </select>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Duration</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))}
                style={{ display: "block", marginTop: 4, width: "100%", padding: "8px 10px", borderRadius: 9, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 13 }}>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
              </select>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Color</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {COLORS.map(c => (
              <button key={c.value} type="button" onClick={() => setColor(c.value)}
                style={{ width: 24, height: 24, borderRadius: "50%", background: c.value, border: color === c.value ? "3px solid var(--text-primary)" : "3px solid transparent", cursor: "pointer", transition: "transform 120ms", transform: color === c.value ? "scale(1.2)" : "scale(1)" }} />
            ))}
          </div>
        </div>

        {/* Complete toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--radius-md)", marginBottom: 14, cursor: "pointer", background: completed ? "rgba(16,185,129,0.08)" : "var(--card-bg)", border: `1px solid ${completed ? "rgba(16,185,129,0.3)" : "var(--card-border)"}`, transition: "all 150ms" }}>
          <input type="checkbox" checked={completed} onChange={e => setCompleted(e.target.checked)} style={{ accentColor: "#10B981", width: 15, height: 15 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: completed ? "#10B981" : "var(--text-muted)" }}>
            {completed ? "Marked complete ✓" : "Mark as complete"}
          </span>
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          {isEdit && (
            <button type="button" onClick={() => { onDelete(state.event!.id); onClose(); }}
              style={{ padding: "10px 16px", borderRadius: "var(--radius-md)", border: "1px solid #EF444430", background: "#EF444410", color: "#EF4444", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: "10px 0", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave}
            style={{ flex: 1, padding: "10px 0", borderRadius: "var(--radius-md)", border: "none", background: color, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {isEdit ? "Save" : "Add event"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Productivity Stats ────────────────────────────────────────────────────────

function ProductivityStats({ events }: { events: CalEvent[] }) {
  const today = todayStr();

  // Last 30 days window for streaks/history; last 7 for rolling stats
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    return toDateStr(d);
  });
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 29 + i);
    return toDateStr(d);
  });

  const pastEvents      = events.filter(e => e.date <= today && !e.allDay);
  const last7Events     = pastEvents.filter(e => last7.includes(e.date));
  const completedLast7  = last7Events.filter(e => e.completed);
  const completionRate  = last7Events.length ? completedLast7.length / last7Events.length : 0;

  // On-time: completed on or before scheduled date
  const onTime     = completedLast7.filter(e => !e.completedAt || e.completedAt <= e.date).length;
  const onTimeRate = completedLast7.length ? onTime / completedLast7.length : 0;

  // Push rate: % of scheduled events that were moved at least once
  const pushed     = last7Events.filter(e => (e.pushCount ?? 0) > 0).length;
  const pushRate   = last7Events.length ? pushed / last7Events.length : 0;

  // Tasks today
  const todayTotal     = events.filter(e => e.date === today && !e.allDay).length;
  const todayDone      = events.filter(e => e.date === today && e.completed).length;

  // Completion streak (consecutive days ending today with ≥1 completed task)
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = toDateStr(d);
    if (events.some(e => e.completedAt === key || (e.completed && e.date === key))) {
      streak++;
    } else if (i > 0) break;
  }

  // Daily completed count for last 7 days (sparkline)
  const dailyCounts = last7.map(day =>
    events.filter(e => e.completedAt === day || (e.completed && e.date === day)).length
  );
  const maxDaily = Math.max(...dailyCounts, 1);

  function StatCard({ label, value, sub, color = "var(--accent)", bar }: {
    label: string; value: string; sub?: string; color?: string; bar?: number;
  }) {
    return (
      <div style={{ background: "var(--card-bg-strong)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-lg)", padding: "16px 18px", boxShadow: "var(--shadow-card-soft)" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>{sub}</div>}
        {bar !== undefined && (
          <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: "var(--card-border)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, background: color, width: `${Math.min(100, bar * 100)}%`, transition: "width 600ms cubic-bezier(.4,0,.2,1)" }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12, letterSpacing: -0.1 }}>Productivity — last 7 days</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        <StatCard
          label="Today"
          value={todayTotal === 0 ? "0 tasks" : `${todayDone}/${todayTotal}`}
          sub={todayTotal === 0 ? "Nothing scheduled" : todayDone === todayTotal ? "All done ✓" : `${todayTotal - todayDone} remaining`}
          color={todayDone === todayTotal && todayTotal > 0 ? "#10B981" : "var(--accent)"}
          bar={todayTotal ? todayDone / todayTotal : 0}
        />
        <StatCard
          label="Completion rate"
          value={last7Events.length ? `${Math.round(completionRate * 100)}%` : "—"}
          sub={`${completedLast7.length} of ${last7Events.length} tasks done`}
          color={completionRate >= 0.8 ? "#10B981" : completionRate >= 0.5 ? "#F59E0B" : "#EF4444"}
          bar={completionRate}
        />
        <StatCard
          label="On-time rate"
          value={completedLast7.length ? `${Math.round(onTimeRate * 100)}%` : "—"}
          sub={`${onTime} completed on schedule`}
          color={onTimeRate >= 0.8 ? "#10B981" : onTimeRate >= 0.5 ? "#F59E0B" : "#EF4444"}
          bar={onTimeRate}
        />
        <StatCard
          label="Push frequency"
          value={last7Events.length ? `${Math.round(pushRate * 100)}%` : "—"}
          sub={`${pushed} task${pushed !== 1 ? "s" : ""} rescheduled`}
          color={pushRate <= 0.1 ? "#10B981" : pushRate <= 0.3 ? "#F59E0B" : "#EF4444"}
          bar={pushRate}
        />
        <StatCard
          label="Streak"
          value={streak === 0 ? "0 days" : `${streak} day${streak !== 1 ? "s" : ""}`}
          sub={streak > 0 ? "Consecutive days with completions" : "Complete a task to start"}
          color={streak >= 7 ? "#10B981" : streak >= 3 ? "#F59E0B" : "var(--accent)"}
        />
      </div>

      {/* 7-day sparkline */}
      {last7Events.length > 0 && (
        <div style={{ marginTop: 14, background: "var(--card-bg-strong)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-lg)", padding: "14px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Completions per day</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 48 }}>
            {last7.map((day, i) => {
              const isToday = day === today;
              const count = dailyCounts[i];
              const h = count === 0 ? 4 : Math.max(8, (count / maxDaily) * 48);
              return (
                <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
                  <div style={{ width: "100%", borderRadius: 3, background: count > 0 ? "#10B981" : "var(--card-border)", height: h, transition: "height 500ms", opacity: isToday ? 1 : 0.75 }} />
                  <span style={{ fontSize: 9, color: isToday ? "var(--accent)" : "var(--text-muted)", fontWeight: isToday ? 700 : 400 }}>
                    {DAY_SHORT[new Date(day + "T12:00:00").getDay()]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Week Planner ──────────────────────────────────────────────────────────────

function WeekPlanner({ events, onSave, onDelete }: {
  events: CalEvent[];
  onSave: (e: CalEvent) => void;
  onDelete: (id: string) => void;
}) {
  const today = new Date();
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay());
    return d;
  });
  const [modal, setModal] = useState<ModalState | null>(null);
  const [nowLine, setNowLine] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayKey  = toDateStr(today);
  const weekDays  = getWeekDays(weekStart);

  // Current time line
  useEffect(() => {
    function update() {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const offsetMins = mins - 6 * 60; // 6am start
      if (offsetMins >= 0 && offsetMins <= 17 * 60) {
        setNowLine((offsetMins / 60) * HOUR_H);
      } else {
        setNowLine(null);
      }
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll to current time
  useEffect(() => {
    if (scrollRef.current && nowLine !== null) {
      scrollRef.current.scrollTop = Math.max(0, nowLine - 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function navWeek(dir: -1 | 1) {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  }

  function goToday() {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay());
    setWeekStart(d);
  }

  const startLabel = weekDays[0].date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel   = weekDays[6].date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const yearLabel  = weekDays[0].date.getFullYear();

  function getEventsAt(dateKey: string, hour: number): CalEvent[] {
    return events.filter(e => {
      if (e.allDay || e.date !== dateKey) return false;
      return e.startHour === hour;
    });
  }

  function getAllDayEvents(dateKey: string): CalEvent[] {
    return events.filter(e => e.date === dateKey && e.allDay);
  }

  function getTopOffset(e: CalEvent): number {
    return (e.startMin / 60) * HOUR_H;
  }

  function getHeight(e: CalEvent): number {
    return Math.max(20, (e.durationMins / 60) * HOUR_H - 2);
  }

  const timeColW = 52;
  const colStyle = (key: string): React.CSSProperties => ({
    flex: 1,
    minWidth: 0,
    borderLeft: "1px solid var(--card-border)",
    background: key === todayKey ? "#2563EB06" : "transparent",
    position: "relative",
  });

  return (
    <>
      {modal && (
        <EventModal state={modal} onSave={onSave} onDelete={onDelete} onClose={() => setModal(null)} />
      )}

      <div style={{ background: "var(--card-bg-strong)", border: "1px solid var(--card-border)", borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-card)" }}>
        {/* Header bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid var(--card-border)", flexShrink: 0 }}>
          <button type="button" onClick={() => navWeek(-1)} style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text-muted)", padding: "6px 9px", display: "flex", alignItems: "center", transition: "background 120ms" }}>
            <ChevronLeft size={15} />
          </button>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
            {startLabel} – {endLabel}, {yearLabel}
          </div>
          <button type="button" onClick={goToday}
            style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", background: "#2563EB12", border: "1px solid #2563EB30", borderRadius: 7, padding: "6px 14px", cursor: "pointer" }}>
            Today
          </button>
          <button type="button" onClick={() => navWeek(1)} style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text-muted)", padding: "6px 9px", display: "flex", alignItems: "center", transition: "background 120ms" }}>
            <ChevronRight size={15} />
          </button>
          <button type="button"
            onClick={() => setModal({ mode: "add", date: todayKey, hour: new Date().getHours(), min: 0 })}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: "var(--radius-sm)", border: "none", background: "#2563EB", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            <Plus size={13} /> Add
          </button>
        </div>

        {/* Day column headers */}
        <div style={{ display: "flex", flexShrink: 0, borderBottom: "1px solid var(--card-border)" }}>
          <div style={{ width: timeColW, flexShrink: 0 }} />
          {weekDays.map(({ date, key }) => {
            const isToday = key === todayKey;
            return (
              <div key={key} style={{ flex: 1, textAlign: "center", padding: "10px 4px", borderLeft: "1px solid var(--card-border)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: isToday ? "#2563EB" : "var(--text-muted)" }}>
                  {DAY_SHORT[date.getDay()]}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: isToday ? "#fff" : "var(--text-primary)", background: isToday ? "#2563EB" : "transparent", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", margin: "2px auto 0", transition: "background 200ms" }}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* All-day row */}
        <div style={{ display: "flex", flexShrink: 0, borderBottom: "1px solid var(--card-border)", minHeight: 28 }}>
          <div style={{ width: timeColW, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 8px" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>All day</span>
          </div>
          {weekDays.map(({ key }) => {
            const evts = getAllDayEvents(key);
            return (
              <div key={key} style={{ ...colStyle(key), padding: "3px 4px", minHeight: 28, overflow: "hidden" }}>
                {evts.map(e => (
                  <div key={e.id} onClick={() => setModal({ mode: "edit", event: e, date: e.date, hour: e.startHour, min: e.startMin })}
                    style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: e.color, padding: "2px 6px", borderRadius: 4, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", opacity: 0.92 }}>
                    {e.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div ref={scrollRef} style={{ overflowY: "auto", flex: 1, maxHeight: 560 }}>
          <div style={{ display: "flex", position: "relative" }}>
            {/* Time labels */}
            <div style={{ width: timeColW, flexShrink: 0 }}>
              {HOURS.map(h => (
                <div key={h} style={{ height: HOUR_H, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", padding: "4px 8px 0", boxSizing: "border-box" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>{fmtHour(h)}</span>
                </div>
              ))}
            </div>

            {/* Columns */}
            {weekDays.map(({ key }) => (
              <div key={key} style={{ ...colStyle(key), overflow: "hidden" }}>
                {/* Hour cells */}
                {HOURS.map(hour => {
                  const evts = getEventsAt(key, hour);
                  return (
                    <div key={hour}
                      onClick={() => setModal({ mode: "add", date: key, hour, min: 0 })}
                      style={{ height: HOUR_H, borderBottom: "1px solid var(--card-border)", position: "relative", cursor: "pointer", boxSizing: "border-box" }}>
                      {/* 30-min divider */}
                      <div style={{ position: "absolute", left: 0, right: 0, top: HOUR_H / 2, borderBottom: "1px dashed var(--card-border)", opacity: 0.5, pointerEvents: "none" }} />
                      {/* Events */}
                      {evts.map(e => (
                        <div key={e.id}
                          onClick={ev => { ev.stopPropagation(); setModal({ mode: "edit", event: e, date: e.date, hour: e.startHour, min: e.startMin }); }}
                          style={{
                            position: "absolute",
                            top: getTopOffset(e),
                            left: 2, right: 2,
                            height: getHeight(e),
                            background: e.color,
                            borderRadius: "var(--radius-xs)",
                            padding: "4px 6px",
                            boxSizing: "border-box",
                            overflow: "hidden",
                            cursor: "pointer",
                            zIndex: 1,
                            boxShadow: `0 1px 4px ${e.color}50`,
                            transition: "opacity 120ms, box-shadow 120ms",
                          }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: e.completed ? 0.65 : 1, textDecoration: e.completed ? "line-through" : "none" }}>
                            {e.completed ? "✓ " : ""}{e.title}
                          </div>
                          {e.durationMins >= 45 && (
                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.8)", marginTop: 1 }}>
                              {fmtTime(e.startHour, e.startMin)} · {e.durationMins}m
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Now line */}
                {key === todayKey && nowLine !== null && (
                  <div style={{ position: "absolute", left: 0, right: 0, top: nowLine, zIndex: 2, pointerEvents: "none" }}>
                    <div style={{ position: "relative", height: 2, background: "#EF4444" }}>
                      <div style={{ position: "absolute", left: -5, top: -4, width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Budget Calculator ─────────────────────────────────────────────────────────

function BudgetCalc({ income, setIncome, lines, setLines, oneTime, setOneTime }: {
  income: number; setIncome: (v: number) => void;
  lines: BudgetLine[]; setLines: React.Dispatch<React.SetStateAction<BudgetLine[]>>;
  oneTime: OneTimeExpense[]; setOneTime: React.Dispatch<React.SetStateAction<OneTimeExpense[]>>;
}) {
  const [addLabel, setAddLabel]   = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addMonth, setAddMonth]   = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [showAddForm, setShowAddForm] = useState(false);

  function setAmount(id: string, val: number) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, amount: val } : l));
  }

  const totalByCategory = (cat: BudgetLine["category"]) =>
    lines.filter(l => l.category === cat).reduce((s, l) => s + (l.amount || 0), 0);
  const totalSpend = lines.reduce((s, l) => s + (l.amount || 0), 0);
  const surplus    = income - totalSpend;

  function pct(cat: BudgetLine["category"]) {
    if (!income) return 0;
    return Math.round((totalByCategory(cat) / income) * 100);
  }

  function addExpense() {
    if (!addLabel.trim() || !Number(addAmount)) return;
    setOneTime(prev => [...prev, { id: uid(), monthKey: addMonth, label: addLabel.trim(), amount: Number(addAmount) }]);
    setAddLabel(""); setAddAmount(""); setShowAddForm(false);
  }

  function removeExpense(id: string) {
    setOneTime(prev => prev.filter(e => e.id !== id));
  }

  // Build 12-month projection
  const projMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + i);
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const expenses      = oneTime.filter(e => e.monthKey === key);
    const oneTimeTotal  = expenses.reduce((s, e) => s + e.amount, 0);
    const net           = surplus - oneTimeTotal;
    return { key, label, expenses, oneTimeTotal, net };
  });
  let running = 0;
  const proj = projMonths.map(m => { running += m.net; return { ...m, cumulative: running }; });
  const maxCumulative = Math.max(...proj.map(p => Math.abs(p.cumulative)), 1);

  // Month options for the add-expense form
  const monthOptions = proj.map(p => ({ key: p.key, label: p.label }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
      {/* Left: inputs */}
      <div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Monthly take-home income</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-muted)" }}>$</span>
            <input type="number" min={0} value={income || ""} onChange={e => setIncome(Number(e.target.value))} placeholder="4,500"
              style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", background: "none", border: "none", outline: "none", width: "100%" }} />
          </div>
        </div>

        {(["needs", "wants", "savings"] as const).map(cat => {
          const cfg = CAT_CFG[cat];
          const catLines = lines.filter(l => l.category === cat);
          const total = totalByCategory(cat);
          return (
            <div key={cat} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "16px 20px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{cfg.label}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)" }}>{cfg.desc}</span>
                </div>
                <div style={{ textAlign: "right" as const }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: cfg.color }}>{fmtCurrency(total)}</span>
                  {income > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--text-muted)" }}>({pct(cat)}% / ideal {cfg.ideal}%)</span>}
                </div>
              </div>
              {income > 0 && (
                <div style={{ height: 5, borderRadius: 3, background: "var(--card-border)", marginBottom: 12, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: cfg.color, width: `${Math.min(100, pct(cat))}%`, transition: "width 400ms cubic-bezier(.4,0,.2,1)" }} />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                {catLines.map(l => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 12, color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{l.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>$</span>
                      <input type="number" min={0} value={l.amount || ""} onChange={e => setAmount(l.id, Number(e.target.value))}
                        placeholder={l.placeholder.toString()}
                        style={{ width: 70, padding: "4px 6px", borderRadius: 7, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 12, fontWeight: 600, outline: "none", textAlign: "right" as const }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: 12-month projection sidebar */}
      <div style={{ position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 12 }}>

        {/* 50/30/20 summary — compact */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 12 }}>50/30/20 Summary</div>
          {(["needs", "wants", "savings"] as const).map(cat => {
            const cfg = CAT_CFG[cat]; const p = income ? pct(cat) : 0;
            return (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", width: 52 }}>{cfg.label}</span>
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--card-border)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: cfg.color, width: `${Math.min(100, p)}%`, transition: "width 400ms" }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color, width: 36, textAlign: "right" as const }}>{p}%</span>
              </div>
            );
          })}
          <div style={{ borderTop: "1px solid var(--card-border)", marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{surplus >= 0 ? "Monthly surplus" : "Monthly deficit"}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: surplus >= 0 ? "#10B981" : "#EF4444" }}>{fmtCurrency(Math.abs(surplus))}</span>
          </div>
        </div>

        {/* 12-month projection */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>12-Month Projection</div>
              {income > 0 && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                  Base: <span style={{ color: surplus >= 0 ? "#10B981" : "#EF4444", fontWeight: 600 }}>{fmtCurrency(surplus)}/mo</span>
                </div>
              )}
            </div>
            <button type="button" onClick={() => setShowAddForm(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, border: "1px solid var(--card-border)", background: showAddForm ? "var(--accent)" : "var(--card-bg-strong)", color: showAddForm ? "#fff" : "var(--text-muted)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              <Plus size={11} /> Add expense
            </button>
          </div>

          {/* Add one-time expense form */}
          {showAddForm && (
            <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--card-border)", background: "rgba(37,99,235,0.06)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>One-time expense</div>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                <select value={addMonth} onChange={e => setAddMonth(e.target.value)}
                  style={{ padding: "6px 8px", borderRadius: 7, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 12 }}>
                  {monthOptions.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
                <input placeholder="Label (e.g. Car repair)" value={addLabel} onChange={e => setAddLabel(e.target.value)}
                  style={{ padding: "6px 8px", borderRadius: 7, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 12, outline: "none" }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", flex: 1, border: "1px solid var(--card-border)", borderRadius: 7, background: "var(--card-bg)", padding: "0 8px" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>$</span>
                    <input type="number" min={0} placeholder="Amount" value={addAmount} onChange={e => setAddAmount(e.target.value)}
                      style={{ flex: 1, border: "none", background: "none", color: "var(--text-primary)", fontSize: 12, padding: "6px 4px", outline: "none" }} />
                  </div>
                  <button type="button" onClick={addExpense}
                    style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Month rows */}
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {proj.map((m, i) => (
              <div key={m.key} style={{ padding: "9px 18px", borderBottom: i < 11 ? "1px solid var(--card-border)" : "none", background: i === 0 ? "rgba(37,99,235,0.05)" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: m.expenses.length ? 5 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? "var(--accent)" : "var(--text-primary)", minWidth: 52 }}>{m.label}</span>
                    {m.oneTimeTotal > 0 && (
                      <span style={{ fontSize: 10, color: "#EF4444", fontWeight: 600 }}>-{fmtCurrency(m.oneTimeTotal)}</span>
                    )}
                  </div>
                  <div style={{ textAlign: "right" as const }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: m.net >= 0 ? "#10B981" : "#EF4444" }}>{fmtCurrency(m.net)}</div>
                    <div style={{ fontSize: 10, color: m.cumulative >= 0 ? "var(--text-muted)" : "#EF4444" }}>
                      {m.cumulative >= 0 ? "+" : ""}{fmtCurrency(m.cumulative)} total
                    </div>
                  </div>
                </div>
                {/* Cumulative bar */}
                {income > 0 && (
                  <div style={{ height: 3, borderRadius: 2, background: "var(--card-border)", overflow: "hidden", marginTop: 4 }}>
                    <div style={{ height: "100%", borderRadius: 2, background: m.cumulative >= 0 ? "#10B981" : "#EF4444", width: `${Math.min(100, (Math.abs(m.cumulative) / maxCumulative) * 100)}%`, transition: "width 400ms" }} />
                  </div>
                )}
                {/* One-time expense chips */}
                {m.expenses.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4, marginTop: 5 }}>
                    {m.expenses.map(e => (
                      <span key={e.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 4, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 10, fontWeight: 500, color: "#EF4444" }}>
                        {e.label} {fmtCurrency(e.amount)}
                        <button type="button" onClick={() => removeExpense(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 0, lineHeight: 1, fontSize: 11 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary footer */}
          <div style={{ padding: "12px 18px", borderTop: "1px solid var(--card-border)", background: "rgba(16,185,129,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Saved after 12 months</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: proj[11]?.cumulative >= 0 ? "#10B981" : "#EF4444" }}>
              {income > 0 ? fmtCurrency(proj[11]?.cumulative ?? 0) : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Retirement Calculator ─────────────────────────────────────────────────────

type RetireState = {
  age: number;
  salary: number;
  contribPct: number;
  currentSavings: number;
  retireAge: number;
};

const DEFAULT_RETIRE: RetireState = { age: 25, salary: 60000, contribPct: 6, currentSavings: 0, retireAge: 65 };

function RetireCalc({ state, setState }: {
  state: RetireState;
  setState: React.Dispatch<React.SetStateAction<RetireState>>;
}) {
  function set(k: keyof RetireState, v: number) { setState(prev => ({ ...prev, [k]: v })); }

  const yearsToRetire = Math.max(0, state.retireAge - state.age);
  const annualContrib = state.salary * (state.contribPct / 100);
  const monthlyContrib = annualContrib / 12;

  // Conservative (5%), moderate (7%), aggressive (9%)
  const conservative = futureValue(state.currentSavings, monthlyContrib, 0.05 / 12, yearsToRetire * 12);
  const moderate     = futureValue(state.currentSavings, monthlyContrib, 0.07 / 12, yearsToRetire * 12);
  const aggressive   = futureValue(state.currentSavings, monthlyContrib, 0.09 / 12, yearsToRetire * 12);

  // Monthly income in retirement (4% rule / 12)
  const monthly4pct = moderate * 0.04 / 12;

  function fmtM(v: number) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1000) return `$${Math.round(v / 1000)}K`;
    return `$${Math.round(v).toLocaleString()}`;
  }

  const bars = [
    { label: "Conservative (5%)", value: conservative, color: "#2563EB" },
    { label: "Moderate (7%)",     value: moderate,     color: "#10B981" },
    { label: "Aggressive (9%)",   value: aggressive,   color: "#8B5CF6" },
  ];
  const maxVal = Math.max(...bars.map(b => b.value), 1);

  const fields: { key: keyof RetireState; label: string; min: number; max: number; step: number; suffix?: string; prefix?: string }[] = [
    { key: "age",           label: "Current age",             min: 16, max: 70,  step: 1,  suffix: " yrs" },
    { key: "salary",        label: "Annual salary",           min: 0,  max: 500000, step: 5000, prefix: "$" },
    { key: "contribPct",    label: "401(k) contribution",     min: 0,  max: 50,  step: 1,  suffix: "%" },
    { key: "currentSavings",label: "Current retirement savings", min: 0, max: 2000000, step: 1000, prefix: "$" },
    { key: "retireAge",     label: "Target retirement age",   min: state.age + 1, max: 80, step: 1, suffix: " yrs" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
      {/* Left: inputs */}
      <div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "20px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }}>Your details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{f.label}</label>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  {f.prefix && <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>{f.prefix}</span>}
                  <input type="number" min={f.min} max={f.max} step={f.step} value={state[f.key] || ""}
                    onChange={e => set(f.key, Number(e.target.value))}
                    style={{ flex: 1, padding: "8px 10px", borderRadius: 9, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 14, fontWeight: 700, outline: "none" }} />
                  {f.suffix && <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{f.suffix}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "20px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
            Monthly contribution: <strong style={{ color: "#10B981" }}>{fmtM(monthlyContrib)}/mo</strong>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Years to retirement: <strong style={{ color: "var(--text-primary)" }}>{yearsToRetire}</strong>
          </div>
        </div>
      </div>

      {/* Right: projections */}
      <div style={{ position: "sticky", top: 80 }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "20px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 20 }}>
            Projected at {state.retireAge}
          </div>

          {bars.map(b => (
            <div key={b.label} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{b.label}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: b.color }}>{fmtM(b.value)}</span>
              </div>
              <div style={{ height: 8, borderRadius: 5, background: "var(--card-border)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 5, background: b.color, width: `${(b.value / maxVal) * 100}%`, transition: "width 500ms cubic-bezier(.4,0,.2,1)" }} />
              </div>
            </div>
          ))}

          <div style={{ borderTop: "1px solid var(--card-border)", paddingTop: 14, marginTop: 4 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Estimated monthly income (4% rule)</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#10B981" }}>{fmtM(monthly4pct)}<span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>/mo</span></div>
          </div>

          {state.contribPct < 6 && (
            <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 9, background: "#F59E0B12", border: "1px solid #F59E0B30" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#F59E0B" }}>Tip: Most employers match up to 6%. Contribute at least that much to capture free money.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared DB sync hook ───────────────────────────────────────────────────────

function useLifeBuddySync() {
  const [dbLoaded, setDbLoaded] = useState(false);

  // Debounced save — returns a stable function that delays 1.5s before posting
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveToDb = useCallback((payload: Record<string, unknown>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetch("/api/life-buddy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }, 1500);
  }, []);

  return { dbLoaded, setDbLoaded, saveToDb };
}

// ── Life Buddy Page ───────────────────────────────────────────────────────────

type Tab = "planner" | "budget" | "retirement";

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "planner",    label: "Planner",    Icon: Calendar   },
  { id: "budget",     label: "Budget",     Icon: DollarSign },
  { id: "retirement", label: "Retirement", Icon: TrendingUp },
];

export default function LifeBuddyPage() {
  const [tab, setTab] = useState<Tab>("planner");
  const { saveToDb } = useLifeBuddySync();

  // ── Calendar state ──
  const [events, setEvents] = useState<CalEvent[]>(() => {
    try { const raw = localStorage.getItem(CAL_KEY); return raw ? JSON.parse(raw) : []; }
    catch { return []; }
  });

  // ── Budget state ──
  const [income, setIncome] = useState<number>(() => {
    try { const raw = localStorage.getItem(BUDGET_KEY + "_income"); return raw ? Number(raw) : 0; }
    catch { return 0; }
  });
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>(() => {
    try { const raw = localStorage.getItem(BUDGET_KEY); return raw ? JSON.parse(raw) : DEFAULT_BUDGET; }
    catch { return DEFAULT_BUDGET; }
  });
  const [oneTime, setOneTime] = useState<OneTimeExpense[]>(() => {
    try { const raw = localStorage.getItem(PROJ_KEY); return raw ? JSON.parse(raw) : []; }
    catch { return []; }
  });

  // ── Retirement state ──
  const [retireState, setRetireState] = useState<RetireState>(() => {
    try { const raw = localStorage.getItem(RETIRE_KEY); return raw ? JSON.parse(raw) : DEFAULT_RETIRE; }
    catch { return DEFAULT_RETIRE; }
  });

  // ── Load from DB on mount (overrides localStorage if DB has data) ──
  useEffect(() => {
    fetch("/api/life-buddy")
      .then(r => r.json())
      .then(d => {
        if (!d.exists) return;
        if (Array.isArray(d.calendarEvents)  && d.calendarEvents.length)  setEvents(d.calendarEvents);
        if (Array.isArray(d.budgetLines)     && d.budgetLines.length)     setBudgetLines(d.budgetLines);
        if (d.budgetIncome)                                                setIncome(d.budgetIncome);
        if (Array.isArray(d.oneTimeExpenses))                              setOneTime(d.oneTimeExpenses);
        if (d.retireState && typeof d.retireState === "object")            setRetireState(d.retireState as RetireState);
      })
      .catch(() => {});
  }, []);

  // ── Persist to localStorage + DB on every change ──
  useEffect(() => {
    localStorage.setItem(CAL_KEY, JSON.stringify(events));
    saveToDb({ calendarEvents: events });
  }, [events, saveToDb]);

  useEffect(() => {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgetLines));
    localStorage.setItem(BUDGET_KEY + "_income", String(income));
    saveToDb({ budgetLines, budgetIncome: income });
  }, [budgetLines, income, saveToDb]);

  useEffect(() => {
    localStorage.setItem(PROJ_KEY, JSON.stringify(oneTime));
    saveToDb({ oneTimeExpenses: oneTime });
  }, [oneTime, saveToDb]);

  useEffect(() => {
    localStorage.setItem(RETIRE_KEY, JSON.stringify(retireState));
    saveToDb({ retireState });
  }, [retireState, saveToDb]);

  function saveEvent(e: CalEvent) {
    setEvents(prev => {
      const idx = prev.findIndex(x => x.id === e.id);
      return idx >= 0 ? prev.map(x => x.id === e.id ? e : x) : [...prev, e];
    });
  }

  function deleteEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id));
  }

  return (
    <PremiumShell hideHeader>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: -0.2 }}>Life Buddy</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "3px 0 0" }}>Plan your schedule, track your budget, and project your savings.</p>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-lg)", padding: 4, width: "fit-content" }}>
          {TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: tab === t.id ? "var(--accent)" : "transparent",
                color: tab === t.id ? "#fff" : "var(--text-muted)",
                transition: "background 150ms, color 150ms" }}>
              <t.Icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "planner" && (
          <>
            <ProductivityStats events={events} />
            <div style={{ marginTop: 20 }}>
              <WeekPlanner events={events} onSave={saveEvent} onDelete={deleteEvent} />
            </div>
          </>
        )}
        {tab === "budget" && (
          <BudgetCalc
            income={income} setIncome={setIncome}
            lines={budgetLines} setLines={setBudgetLines}
            oneTime={oneTime} setOneTime={setOneTime}
          />
        )}
        {tab === "retirement" && (
          <RetireCalc state={retireState} setState={setRetireState} />
        )}
      </div>
    </PremiumShell>
  );
}
