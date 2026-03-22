"use client";

import React, { useState } from "react";

export type ScheduledItem = {
  itemId: string;
  label: string;
  stage: string;
  done: boolean;
  scheduledDate: string | null; // ISO date string
};

type Props = {
  items: ScheduledItem[];
  accentColor?: string;
  stage: string;
  onSchedule: (itemId: string, date: string | null) => void;
};

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function googleCalendarUrl(label: string, dateKey: string): string {
  const compact = dateKey.replace(/-/g, "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(label)}&dates=${compact}/${compact}&details=${encodeURIComponent("Scheduled via your Career Readiness checklist")}`;
}

export default function MiniCalendar({ items, accentColor = "#10B981", stage, onSchedule }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [schedulingItemId, setSchedulingItemId] = useState<string | null>(null);

  // Build map: dateKey → items scheduled that day
  const scheduleMap = new Map<string, ScheduledItem[]>();
  for (const item of items) {
    if (item.scheduledDate) {
      const key = item.scheduledDate.slice(0, 10);
      if (!scheduleMap.has(key)) scheduleMap.set(key, []);
      scheduleMap.get(key)!.push(item);
    }
  }

  const unscheduled = items.filter((i) => !i.scheduledDate && !i.done);

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function handleDayClick(day: number) {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDay(selectedDay === key ? null : key);
    setSchedulingItemId(null);
  }

  function assignToDay(itemId: string, dateKey: string) {
    onSchedule(itemId, dateKey);
    setSchedulingItemId(null);
  }

  function removeSchedule(itemId: string) {
    onSchedule(itemId, null);
  }

  const selectedItems = selectedDay ? (scheduleMap.get(selectedDay) ?? []) : [];

  return (
    <div style={{ position: "sticky", top: 24 }}>
      {/* Calendar card */}
      <div style={{ padding: "16px 18px", borderRadius: "var(--radius-lg)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16, padding: "2px 6px" }}>‹</button>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
            {MONTHS[viewMonth]} {viewYear}
          </div>
          <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16, padding: "2px 6px" }}>›</button>
        </div>

        {/* Day labels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", padding: "2px 0" }}>{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = key === toDateKey(today);
            const isSelected = selectedDay === key;
            const scheduled = scheduleMap.get(key) ?? [];
            const hasDot = scheduled.length > 0;
            const allDone = hasDot && scheduled.every(s => s.done);

            return (
              <button
                key={key}
                onClick={() => handleDayClick(day)}
                style={{
                  position: "relative",
                  width: "100%", aspectRatio: "1",
                  borderRadius: 8,
                  border: isSelected ? `2px solid ${accentColor}` : isToday ? `1px solid ${accentColor}66` : "1px solid transparent",
                  background: isSelected ? accentColor + "18" : isToday ? accentColor + "08" : "transparent",
                  cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                  fontSize: 12, fontWeight: isToday ? 900 : 500,
                  color: isSelected ? accentColor : isToday ? accentColor : "var(--text-primary)",
                  transition: "all 100ms",
                }}
              >
                {day}
                {hasDot && (
                  <div style={{
                    width: 4, height: 4, borderRadius: 99,
                    background: allDone ? "#10B981" : accentColor,
                    flexShrink: 0,
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div style={{ marginTop: 10, padding: "14px 16px", borderRadius: "var(--radius-lg)", border: `1px solid ${accentColor}30`, background: accentColor + "06" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, letterSpacing: 0.5, marginBottom: 10 }}>
            {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </div>

          {selectedItems.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {selectedItems.map(item => (
                <div key={item.itemId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--card-border-soft)" }}>
                  <span style={{ fontSize: 12, flex: 1, color: item.done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: item.done ? "line-through" : "none", lineHeight: 1.4 }}>
                    {item.label}
                  </span>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {!item.done && (
                      <a
                        href={googleCalendarUrl(item.label, selectedDay)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Add to Google Calendar"
                        style={{ fontSize: 14, textDecoration: "none", opacity: 0.7 }}
                      >📅</a>
                    )}
                    <button
                      onClick={() => removeSchedule(item.itemId)}
                      title="Remove from this date"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, padding: "0 2px" }}
                    >×</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Nothing scheduled yet.</div>
          )}

          {/* Assign an unscheduled item to this day */}
          {unscheduled.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {schedulingItemId === null ? (
                <button
                  onClick={() => setSchedulingItemId("__pick__")}
                  style={{ fontSize: 11, fontWeight: 700, color: accentColor, background: "none", border: `1px dashed ${accentColor}60`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", width: "100%" }}
                >
                  + Schedule a task for this day
                </button>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Pick a task:</div>
                  {unscheduled.map(item => (
                    <button
                      key={item.itemId}
                      onClick={() => assignToDay(item.itemId, selectedDay)}
                      style={{
                        textAlign: "left", fontSize: 12, padding: "7px 10px", borderRadius: 8,
                        border: "1px solid var(--card-border)", background: "var(--card-bg)",
                        color: "var(--text-primary)", cursor: "pointer",
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                  <button onClick={() => setSchedulingItemId(null)} style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upcoming scheduled */}
      {(() => {
        const todayKey = toDateKey(today);
        const upcoming = items
          .filter(i => i.scheduledDate && i.scheduledDate.slice(0, 10) >= todayKey && !i.done)
          .sort((a, b) => (a.scheduledDate! > b.scheduledDate! ? 1 : -1))
          .slice(0, 4);
        if (upcoming.length === 0) return null;
        return (
          <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: "var(--radius-lg)", border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", letterSpacing: 0.5, marginBottom: 8 }}>UPCOMING</div>
            <div style={{ display: "grid", gap: 6 }}>
              {upcoming.map(item => {
                const d = new Date(item.scheduledDate! + "T12:00:00");
                const isOverdue = item.scheduledDate!.slice(0, 10) < todayKey;
                return (
                  <div key={item.itemId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: isOverdue ? "#EF4444" : accentColor, minWidth: 36, textAlign: "center", padding: "3px 6px", borderRadius: 6, background: isOverdue ? "rgba(239,68,68,0.1)" : accentColor + "15" }}>
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
