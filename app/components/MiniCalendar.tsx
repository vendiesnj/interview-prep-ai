"use client";

import React, { useState } from "react";

export type ScheduledItem = {
  itemId: string;
  label: string;
  stage: string;
  done: boolean;
  scheduledDate: string | null;
};

type Props = {
  items: ScheduledItem[];
  accentColor?: string;
  stage: string;
  onSchedule: (itemId: string, date: string | null) => void;
};

type CalendarView = "week" | "month" | "year";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const result = new Date(d);
  result.setDate(d.getDate() - day);
  return result;
}

function googleCalendarUrl(label: string, dateKey: string): string {
  const compact = dateKey.replace(/-/g, "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(label)}&dates=${compact}/${compact}&details=${encodeURIComponent("Scheduled via your Career Readiness checklist")}`;
}

export default function MiniCalendar({ items, accentColor = "#10B981", onSchedule }: Props) {
  const today = new Date();
  const [view, setView] = useState<CalendarView>("month");
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  // Build schedule map: dateKey → items
  const scheduleMap = new Map<string, ScheduledItem[]>();
  for (const item of items) {
    if (item.scheduledDate) {
      const key = item.scheduledDate.slice(0, 10);
      if (!scheduleMap.has(key)) scheduleMap.set(key, []);
      scheduleMap.get(key)!.push(item);
    }
  }

  const unscheduled = items.filter(i => !i.scheduledDate && !i.done);

  function handleDrop(e: React.DragEvent, key: string) {
    e.preventDefault();
    setDragOverDay(null);
    const itemId = e.dataTransfer.getData("text/plain");
    if (itemId) { onSchedule(itemId, key); setSelectedDay(key); }
  }

  function dropProps(key: string) {
    return {
      onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOverDay(key); },
      onDragLeave: () => setDragOverDay(null),
      onDrop: (e: React.DragEvent) => handleDrop(e, key),
    };
  }

  function removeSchedule(itemId: string) { onSchedule(itemId, null); }

  const selectedItems = selectedDay ? (scheduleMap.get(selectedDay) ?? []) : [];

  // ── Navigation ────────────────────────────────────────────────────────────
  function navPrev() {
    if (view === "week") setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
    else if (view === "month") { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); }
    else setViewYear(y => y - 1);
  }
  function navNext() {
    if (view === "week") setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
    else if (view === "month") { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); }
    else setViewYear(y => y + 1);
  }
  function navLabel() {
    if (view === "week") {
      const end = new Date(weekStart); end.setDate(end.getDate() + 6);
      if (weekStart.getMonth() === end.getMonth()) return `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getDate()}–${end.getDate()}, ${weekStart.getFullYear()}`;
      return `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}`;
    }
    if (view === "month") return `${MONTHS_LONG[viewMonth]} ${viewYear}`;
    return `${viewYear}`;
  }

  // ── Day cell renderer (shared between week/month) ─────────────────────────
  function DayCell({ dateKey, dayNum, large }: { dateKey: string; dayNum: number; large?: boolean }) {
    const isToday = dateKey === toDateKey(today);
    const isSelected = selectedDay === dateKey;
    const isDragOver = dragOverDay === dateKey;
    const scheduled = scheduleMap.get(dateKey) ?? [];
    const hasTasks = scheduled.length > 0;
    const allDone = hasTasks && scheduled.every(s => s.done);

    const bg = isDragOver ? accentColor + "28"
      : isSelected ? accentColor + "20"
      : isToday ? accentColor + "0c"
      : "transparent";
    const border = isDragOver ? `2px dashed ${accentColor}`
      : isSelected ? `2px solid ${accentColor}`
      : isToday ? `1px solid ${accentColor}55`
      : "1px solid transparent";
    const color = (isDragOver || isSelected || isToday) ? accentColor : "var(--text-primary)";

    return (
      <button
        onClick={() => { setSelectedDay(isSelected ? null : dateKey); setSchedulingOpen(false); }}
        {...dropProps(dateKey)}
        style={{
          width: "100%", borderRadius: large ? 12 : 8, border, background: bg, cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: large ? "flex-start" : "center",
          padding: large ? "8px 4px 6px" : "4px 2px",
          minHeight: large ? 80 : undefined, aspectRatio: large ? undefined : "1",
          color, fontSize: large ? 14 : 12, fontWeight: isToday ? 900 : 500, transition: "all 80ms",
          gap: 2,
        }}
      >
        <span style={{ lineHeight: 1 }}>{dayNum}</span>
        {large && hasTasks && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%", padding: "0 3px", marginTop: 4 }}>
            {scheduled.slice(0, 2).map(s => (
              <div key={s.itemId} style={{
                fontSize: 9, fontWeight: 700, padding: "2px 4px", borderRadius: 4, textAlign: "left",
                background: s.done ? "rgba(16,185,129,0.15)" : accentColor + "20",
                color: s.done ? "#10B981" : accentColor,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {s.label}
              </div>
            ))}
            {scheduled.length > 2 && (
              <div style={{ fontSize: 9, color: "var(--text-muted)", paddingLeft: 4 }}>+{scheduled.length - 2} more</div>
            )}
          </div>
        )}
        {!large && hasTasks && (
          <div style={{ width: 4, height: 4, borderRadius: 99, background: allDone ? "#10B981" : accentColor }} />
        )}
      </button>
    );
  }

  // ── WEEK VIEW ─────────────────────────────────────────────────────────────
  function WeekView() {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {days.map(d => (
            <div key={d.getDay()} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>
              {DAY_LABELS[d.getDay()]}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {days.map(d => <DayCell key={toDateKey(d)} dateKey={toDateKey(d)} dayNum={d.getDate()} large />)}
        </div>
      </div>
    );
  }

  // ── MONTH VIEW ────────────────────────────────────────────────────────────
  function MonthView() {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} style={{ aspectRatio: "1" }} />;
            const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            return <DayCell key={key} dateKey={key} dayNum={day} />;
          })}
        </div>
      </div>
    );
  }

  // ── YEAR VIEW ─────────────────────────────────────────────────────────────
  function YearView() {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {MONTHS_SHORT.map((label, mIdx) => {
          const daysInM = new Date(viewYear, mIdx + 1, 0).getDate();
          const taskCount = Array.from({ length: daysInM }, (_, d) => {
            const key = `${viewYear}-${String(mIdx + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}`;
            return scheduleMap.get(key)?.length ?? 0;
          }).reduce((a, b) => a + b, 0);

          const isCurrentMonth = mIdx === today.getMonth() && viewYear === today.getFullYear();
          const hasActivity = taskCount > 0;

          return (
            <button
              key={label}
              onClick={() => { setViewMonth(mIdx); setView("month"); }}
              style={{
                padding: "10px 6px", borderRadius: 10, cursor: "pointer", textAlign: "center" as const,
                border: isCurrentMonth ? `1.5px solid ${accentColor}` : "1px solid var(--card-border-soft)",
                background: isCurrentMonth ? accentColor + "10" : "var(--card-bg)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: isCurrentMonth ? accentColor : "var(--text-primary)" }}>{label}</div>
              {hasActivity ? (
                <div style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: accentColor }}>
                  {taskCount} task{taskCount !== 1 ? "s" : ""}
                </div>
              ) : (
                <div style={{ marginTop: 4, fontSize: 10, color: "var(--text-muted)" }}>—</div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  const todayKey = toDateKey(today);

  return (
    <div style={{ position: "sticky", top: 24 }}>
      {/* Calendar card */}
      <div style={{ padding: "16px 18px", borderRadius: "var(--radius-lg)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>

        {/* View toggle */}
        <div style={{ display: "flex", gap: 4, marginBottom: 14, justifyContent: "center" }}>
          {(["week", "month", "year"] as CalendarView[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: "pointer",
              border: view === v ? `1px solid ${accentColor}` : "1px solid var(--card-border-soft)",
              background: view === v ? accentColor + "18" : "transparent",
              color: view === v ? accentColor : "var(--text-muted)",
              textTransform: "capitalize" as const,
            }}>
              {v}
            </button>
          ))}
        </div>

        {/* Nav header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={navPrev} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 18, padding: "0 6px", lineHeight: 1 }}>‹</button>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{navLabel()}</div>
          <button onClick={navNext} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 18, padding: "0 6px", lineHeight: 1 }}>›</button>
        </div>

        {/* Drop hint + export */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6 }}>
            Drop tasks onto a day to schedule
          </div>
          {items.some(i => i.scheduledDate) && (
            <a
              href={`/api/checklist/ics?stage=${items[0]?.stage ?? ""}`}
              download="career-checklist.ics"
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 99,
                border: `1px solid ${accentColor}50`, color: accentColor,
                background: accentColor + "10", textDecoration: "none",
              }}
            >
              ↓ Export to Calendar
            </a>
          )}
        </div>

        {view === "week" && <WeekView />}
        {view === "month" && <MonthView />}
        {view === "year" && <YearView />}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div style={{ marginTop: 10, padding: "14px 16px", borderRadius: "var(--radius-lg)", border: `1px solid ${accentColor}30`, background: accentColor + "06" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, letterSpacing: 0.5, marginBottom: 10 }}>
            {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </div>

          {selectedItems.length > 0 ? (
            <div style={{ display: "grid", gap: 6 }}>
              {selectedItems.map(item => (
                <div key={item.itemId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--card-border-soft)" }}>
                  <span style={{ fontSize: 12, flex: 1, color: item.done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: item.done ? "line-through" : "none", lineHeight: 1.4 }}>
                    {item.label}
                  </span>
                  <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center" }}>
                    {!item.done && (
                      <a
                        href={googleCalendarUrl(item.label, selectedDay)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Add to Google Calendar"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99,
                          border: "1px solid rgba(66,133,244,0.4)", color: "#4285F4",
                          background: "rgba(66,133,244,0.08)", textDecoration: "none",
                          whiteSpace: "nowrap" as const,
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#4285F4"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/></svg>
                        Google Cal
                      </a>
                    )}
                    <button onClick={() => removeSchedule(item.itemId)} title="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16, padding: "0 2px", lineHeight: 1 }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Nothing scheduled. Drop a task here or click below.</div>
          )}

          {unscheduled.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {!schedulingOpen ? (
                <button onClick={() => setSchedulingOpen(true)} style={{ fontSize: 11, fontWeight: 700, color: accentColor, background: "none", border: `1px dashed ${accentColor}60`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", width: "100%" }}>
                  + Schedule a task here
                </button>
              ) : (
                <div style={{ display: "grid", gap: 5 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Select a task:</div>
                  {unscheduled.map(item => (
                    <button key={item.itemId} onClick={() => { onSchedule(item.itemId, selectedDay); setSchedulingOpen(false); }} style={{ textAlign: "left" as const, fontSize: 12, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", cursor: "pointer" }}>
                      {item.label}
                    </button>
                  ))}
                  <button onClick={() => setSchedulingOpen(false)} style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const }}>Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upcoming */}
      {(() => {
        const upcoming = items.filter(i => i.scheduledDate && i.scheduledDate.slice(0, 10) >= todayKey && !i.done).sort((a, b) => a.scheduledDate! > b.scheduledDate! ? 1 : -1).slice(0, 4);
        if (!upcoming.length) return null;
        return (
          <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: "var(--radius-lg)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", letterSpacing: 0.5, marginBottom: 8 }}>UPCOMING</div>
            <div style={{ display: "grid", gap: 6 }}>
              {upcoming.map(item => {
                const d = new Date(item.scheduledDate! + "T12:00:00");
                const overdue = item.scheduledDate!.slice(0, 10) < todayKey;
                return (
                  <div key={item.itemId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: overdue ? "#EF4444" : accentColor, minWidth: 40, textAlign: "center" as const, padding: "3px 5px", borderRadius: 6, background: overdue ? "rgba(239,68,68,0.1)" : accentColor + "15" }}>
                      {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text-primary)", flex: 1, lineHeight: 1.4 }}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
