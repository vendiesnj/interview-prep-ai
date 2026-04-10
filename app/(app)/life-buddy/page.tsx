"use client";

import React, { useState, useEffect, useRef } from "react";
import PremiumShell from "@/app/components/PremiumShell";
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar, DollarSign,
  TrendingUp, Trash2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type CalEvent = {
  id: string;
  title: string;
  date: string;       // YYYY-MM-DD
  startHour: number;  // 0–23
  startMin: number;   // 0 | 30
  durationMins: number; // default 60
  color: string;
  allDay?: boolean;
};

type BudgetLine = { id: string; label: string; category: "needs" | "wants" | "savings"; amount: number; placeholder: number };

// ── Constants ─────────────────────────────────────────────────────────────────

const CAL_KEY    = "lb_calendar_v1";
const BUDGET_KEY = "lb_budget_v1";
const RETIRE_KEY = "lb_retire_v1";

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      id:           isEdit ? state.event!.id : uid(),
      title:        title.trim(),
      date,
      startHour:    startH,
      startMin:     startM,
      durationMins: duration,
      color,
      allDay,
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
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 14, fontWeight: 600, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />

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

        <div style={{ display: "flex", gap: 10 }}>
          {isEdit && (
            <button type="button" onClick={() => { onDelete(state.event!.id); onClose(); }}
              style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #EF444430", background: "#EF444410", color: "#EF4444", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: color, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
            {isEdit ? "Save" : "Add event"}
          </button>
        </div>
      </div>
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

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Header bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid var(--card-border)", flexShrink: 0 }}>
          <button type="button" onClick={() => navWeek(-1)} style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: 8, cursor: "pointer", color: "var(--text-muted)", padding: "6px 9px", display: "flex", alignItems: "center", transition: "background 120ms" }}>
            <ChevronLeft size={15} />
          </button>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
            {startLabel} – {endLabel}, {yearLabel}
          </div>
          <button type="button" onClick={goToday}
            style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", background: "#2563EB12", border: "1px solid #2563EB30", borderRadius: 7, padding: "6px 14px", cursor: "pointer" }}>
            Today
          </button>
          <button type="button" onClick={() => navWeek(1)} style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: 8, cursor: "pointer", color: "var(--text-muted)", padding: "6px 9px", display: "flex", alignItems: "center", transition: "background 120ms" }}>
            <ChevronRight size={15} />
          </button>
          <button type="button"
            onClick={() => setModal({ mode: "add", date: todayKey, hour: new Date().getHours(), min: 0 })}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
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
                <div style={{ fontSize: 22, fontWeight: 900, color: isToday ? "#fff" : "var(--text-primary)", background: isToday ? "#2563EB" : "transparent", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", margin: "2px auto 0", transition: "background 200ms" }}>
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
                            borderRadius: 6,
                            padding: "4px 6px",
                            boxSizing: "border-box",
                            overflow: "hidden",
                            cursor: "pointer",
                            zIndex: 1,
                            boxShadow: `0 1px 4px ${e.color}50`,
                            transition: "opacity 120ms, box-shadow 120ms",
                          }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div>
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

function BudgetCalc() {
  const [income, setIncome] = useState(0);
  const [lines, setLines] = useState<BudgetLine[]>(() => {
    try {
      const raw = localStorage.getItem(BUDGET_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_BUDGET;
    } catch { return DEFAULT_BUDGET; }
  });

  useEffect(() => {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(lines));
  }, [lines]);

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

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "start" }}>
      {/* Left: inputs */}
      <div>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "18px 20px", marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Monthly take-home income</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-muted)" }}>$</span>
            <input type="number" min={0} value={income || ""} onChange={e => setIncome(Number(e.target.value))} placeholder="4,500"
              style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", background: "none", border: "none", outline: "none", width: "100%" }} />
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
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{cfg.label}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)" }}>{cfg.desc}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: cfg.color }}>{fmtCurrency(total)}</span>
                  {income > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--text-muted)" }}>({pct(cat)}% / ideal {cfg.ideal}%)</span>}
                </div>
              </div>
              {/* Progress bar */}
              {income > 0 && (
                <div style={{ height: 5, borderRadius: 3, background: "var(--card-border)", marginBottom: 12, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: cfg.color, width: `${Math.min(100, pct(cat))}%`, transition: "width 400ms cubic-bezier(.4,0,.2,1)" }} />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                {catLines.map(l => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 12, color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>$</span>
                      <input type="number" min={0} value={l.amount || ""} onChange={e => setAmount(l.id, Number(e.target.value))}
                        placeholder={l.placeholder.toString()}
                        style={{ width: 70, padding: "4px 6px", borderRadius: 7, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 12, fontWeight: 600, outline: "none", textAlign: "right" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: summary */}
      <div style={{ position: "sticky", top: 80 }}>
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "20px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>50/30/20 Summary</div>

          {(["needs", "wants", "savings"] as const).map(cat => {
            const cfg   = CAT_CFG[cat];
            const total = totalByCategory(cat);
            const p     = income ? pct(cat) : 0;
            const onTrack = p <= cfg.ideal + 2;
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{cfg.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: cfg.color }}>{p}%</span>
                    <span style={{ fontSize: 10, color: onTrack ? "#10B981" : "#EF4444", fontWeight: 700 }}>{onTrack ? "✓" : "↑"} {cfg.ideal}%</span>
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 4, background: "var(--card-border)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, background: cfg.color, width: `${Math.min(100, p)}%`, transition: "width 400ms" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, textAlign: "right" }}>{fmtCurrency(total)}</div>
              </div>
            );
          })}

          <div style={{ borderTop: "1px solid var(--card-border)", paddingTop: 14, marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Total spend</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{fmtCurrency(totalSpend)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>{surplus >= 0 ? "Surplus" : "Deficit"}</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: surplus >= 0 ? "#10B981" : "#EF4444" }}>{fmtCurrency(Math.abs(surplus))}</span>
            </div>
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

function RetireCalc() {
  const [state, setState] = useState<RetireState>(() => {
    try { const raw = localStorage.getItem(RETIRE_KEY); return raw ? JSON.parse(raw) : DEFAULT_RETIRE; }
    catch { return DEFAULT_RETIRE; }
  });

  useEffect(() => { localStorage.setItem(RETIRE_KEY, JSON.stringify(state)); }, [state]);

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
                <span style={{ fontSize: 15, fontWeight: 900, color: b.color }}>{fmtM(b.value)}</span>
              </div>
              <div style={{ height: 8, borderRadius: 5, background: "var(--card-border)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 5, background: b.color, width: `${(b.value / maxVal) * 100}%`, transition: "width 500ms cubic-bezier(.4,0,.2,1)" }} />
              </div>
            </div>
          ))}

          <div style={{ borderTop: "1px solid var(--card-border)", paddingTop: 14, marginTop: 4 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Estimated monthly income (4% rule)</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#10B981" }}>{fmtM(monthly4pct)}<span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>/mo</span></div>
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

// ── Life Buddy Page ───────────────────────────────────────────────────────────

type Tab = "planner" | "budget" | "retirement";

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "planner",    label: "Planner",    Icon: Calendar   },
  { id: "budget",     label: "Budget",     Icon: DollarSign },
  { id: "retirement", label: "Retirement", Icon: TrendingUp },
];

export default function LifeBuddyPage() {
  const [tab, setTab] = useState<Tab>("planner");
  const [events, setEvents] = useState<CalEvent[]>(() => {
    try { const raw = localStorage.getItem(CAL_KEY); return raw ? JSON.parse(raw) : []; }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(CAL_KEY, JSON.stringify(events));
  }, [events]);

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
    <PremiumShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text-primary)", margin: 0 }}>Life Buddy</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "4px 0 0" }}>Plan your schedule, track your budget, and project your retirement.</p>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800,
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
          <WeekPlanner events={events} onSave={saveEvent} onDelete={deleteEvent} />
        )}
        {tab === "budget" && <BudgetCalc />}
        {tab === "retirement" && <RetireCalc />}
      </div>
    </PremiumShell>
  );
}
