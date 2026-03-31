"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, ChevronDown, ChevronRight, X, Calendar, Flag, Check } from "lucide-react";

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  priority: "high" | "medium" | "low";
  category: string | null;
  dueDate: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

type Props = {
  tasks: Task[];
  onRefresh: () => void;
  defaultDate?: string; // YYYY-MM-DD, set when adding from calendar
};

const PRIORITY_COLOR = { high: "#EF4444", medium: "#F59E0B", low: "#94A3B8" };
const PRIORITY_BG    = { high: "#FEF2F2", medium: "#FFFBEB", low: "#F8FAFC" };

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(dueDate: string | null, completedAt: string | null) {
  if (!dueDate || completedAt) return false;
  return dueDate < todayStr();
}

async function apiPatch(id: string, data: Partial<Task>) {
  await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function apiDelete(id: string) {
  await fetch(`/api/tasks/${id}`, { method: "DELETE" });
}

async function apiCreate(data: Partial<Task>): Promise<Task> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ── Priority Indicator ────────────────────────────────────────────────────────

function PriorityDot({ priority, done, onClick }: {
  priority: "high" | "medium" | "low";
  done: boolean;
  onClick?: () => void;
}) {
  const color = done ? "#16A34A" : PRIORITY_COLOR[priority];
  return (
    <button
      type="button"
      onClick={onClick}
      title={done ? "Mark incomplete" : "Mark complete"}
      style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${color}`,
        background: done ? color : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", padding: 0, transition: "all 120ms",
      }}
    >
      {done && <Check size={11} color="#fff" strokeWidth={3} />}
    </button>
  );
}

// ── Task Row ──────────────────────────────────────────────────────────────────

function TaskRow({ task, onRefresh }: { task: Task; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle]       = useState(task.title);
  const [notes, setNotes]       = useState(task.notes ?? "");
  const [priority, setPriority] = useState<"high" | "medium" | "low">(task.priority as "high" | "medium" | "low");
  const [dueDate, setDueDate]   = useState(task.dueDate ? task.dueDate.split("T")[0] : "");
  const [saving, setSaving]     = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const rowRef   = useRef<HTMLDivElement>(null);

  const done        = !!task.completedAt;
  const overdue     = isOverdue(task.dueDate, task.completedAt);
  const isScheduled = !!task.scheduledAt && !done;

  useEffect(() => {
    if (expanded && titleRef.current) titleRef.current.focus();
  }, [expanded]);

  async function toggleDone() {
    await apiPatch(task.id, {
      completedAt: done ? null : new Date().toISOString(),
    } as any);
    onRefresh();
  }

  async function saveEdit() {
    if (!title.trim()) return;
    setSaving(true);
    await apiPatch(task.id, {
      title: title.trim(),
      notes: notes || null,
      priority,
      dueDate: dueDate || null,
    } as any);
    setSaving(false);
    setExpanded(false);
    onRefresh();
  }

  async function handleDelete() {
    await apiDelete(task.id);
    onRefresh();
  }

  const prioColor = PRIORITY_COLOR[priority];

  const rowBg     = done ? "rgba(134,239,172,0.12)" : isScheduled ? "rgba(254,243,199,0.7)" : "var(--card-bg)";
  const rowBorder = done ? "rgba(34,197,94,0.3)"    : isScheduled ? "rgba(234,179,8,0.4)"    : "var(--card-border)";

  return (
    <div
      ref={rowRef}
      onDragStart={e => {
        e.dataTransfer.setData("text/plain", task.id);
        const ghost = document.createElement("div");
        ghost.textContent = "📌 " + task.title;
        Object.assign(ghost.style, {
          position: "fixed", top: "-120px", left: "-120px",
          padding: "6px 14px", borderRadius: "99px",
          background: PRIORITY_COLOR[task.priority as "high" | "medium" | "low"] ?? "#2563EB",
          color: "#fff", fontSize: "12px", fontWeight: "700",
          whiteSpace: "nowrap", maxWidth: "240px",
          overflow: "hidden", textOverflow: "ellipsis",
          pointerEvents: "none",
        });
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 14, 14);
        setTimeout(() => document.body.removeChild(ghost), 0);
      }}
      onDragEnd={() => { if (rowRef.current) rowRef.current.draggable = false; }}
      style={{
        borderRadius: 8,
        border: `1px solid ${rowBorder}`,
        background: rowBg,
        transition: "border-color 120ms, background 120ms",
      }}
    >
      {/* Main row */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 12px",
          borderLeft: done ? "3px solid #16A34A" : `3px solid ${prioColor}`,
        }}
      >
        {!done && (
          <div
            onMouseDown={() => { if (rowRef.current) rowRef.current.draggable = true; }}
            onMouseUp={() => { if (rowRef.current) rowRef.current.draggable = false; }}
            style={{
              cursor: "grab", flexShrink: 0, padding: "2px 4px",
              display: "flex", flexDirection: "column", gap: "2px",
              userSelect: "none",
            }}
            title="Drag to calendar"
          >
            <span style={{ display: "block", width: 12, height: 2, borderRadius: 1, background: "var(--text-muted)", opacity: 0.4 }} />
            <span style={{ display: "block", width: 12, height: 2, borderRadius: 1, background: "var(--text-muted)", opacity: 0.4 }} />
            <span style={{ display: "block", width: 12, height: 2, borderRadius: 1, background: "var(--text-muted)", opacity: 0.4 }} />
          </div>
        )}
        <PriorityDot priority={task.priority as "high" | "medium" | "low"} done={done} onClick={toggleDone} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            onClick={() => !done && setExpanded(e => !e)}
            style={{
              fontSize: 13, fontWeight: 500,
              color: done ? "var(--text-muted)" : "var(--text-primary)",
              textDecoration: done ? "line-through" : "none",
              userSelect: "none", cursor: done ? "default" : "pointer",
            }}
          >
            {task.title}
          </span>
          {isScheduled && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Calendar size={9} color="#92400E" />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#92400E" }}>
                Scheduled {new Date(task.scheduledAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {task.scheduledAt!.split("T")[1]?.slice(0,5) !== "00:00"
                  ? ` at ${new Date(task.scheduledAt!).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                  : ""}
              </span>
            </div>
          )}
        </div>
        {task.dueDate && !done && (
          <span style={{ fontSize: 11, fontWeight: 600, flexShrink: 0, color: overdue ? "#EF4444" : "var(--text-muted)" }}>
            {fmtDate(task.dueDate.split("T")[0])}
          </span>
        )}
        {done && task.completedAt && (
          <span style={{ fontSize: 10, color: "#16A34A", fontWeight: 600, flexShrink: 0 }}>
            ✓ {new Date(task.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
        {!done && (
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--text-muted)", display: "flex", flexShrink: 0 }}
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        )}
      </div>

      {/* Expanded edit panel */}
      {expanded && !done && (
        <div style={{
          borderTop: "1px solid var(--card-border)",
          padding: "12px 14px 14px",
          background: "var(--card-bg-strong)",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setExpanded(false); }}
            style={{
              width: "100%", padding: "7px 10px", borderRadius: 7,
              border: "1px solid var(--card-border)", background: "var(--card-bg)",
              color: "var(--text-primary)", fontSize: 13, fontWeight: 500,
              outline: "none", boxSizing: "border-box",
            }}
          />
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes..."
            rows={2}
            style={{
              width: "100%", padding: "7px 10px", borderRadius: 7,
              border: "1px solid var(--card-border)", background: "var(--card-bg)",
              color: "var(--text-primary)", fontSize: 12, resize: "none",
              outline: "none", boxSizing: "border-box", fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Priority selector */}
            <div style={{ display: "flex", gap: 4 }}>
              {(["high", "medium", "low"] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "4px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                    border: `1px solid ${priority === p ? PRIORITY_COLOR[p] : "var(--card-border)"}`,
                    background: priority === p ? PRIORITY_BG[p] : "transparent",
                    color: priority === p ? PRIORITY_COLOR[p] : "var(--text-muted)",
                  }}
                >
                  <Flag size={10} />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            {/* Due date */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto" }}>
              <Calendar size={12} color="var(--text-muted)" />
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{
                  padding: "3px 8px", borderRadius: 6, border: "1px solid var(--card-border)",
                  background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 12,
                  outline: "none", cursor: "pointer",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleDelete}
              style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #FEE2E2", background: "transparent", color: "#EF4444", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving}
              style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ label, tasks, onRefresh, defaultOpen = true }: {
  label: string;
  tasks: Task[];
  onRefresh: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (tasks.length === 0) return null;
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6, width: "100%",
          background: "none", border: "none", cursor: "pointer", padding: "6px 2px",
          textAlign: "left",
        }}
      >
        {open ? <ChevronDown size={13} color="var(--text-muted)" /> : <ChevronRight size={13} color="var(--text-muted)" />}
        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginLeft: 2 }}>
          {tasks.length}
        </span>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 2 }}>
          {tasks.map(t => <TaskRow key={t.id} task={t} onRefresh={onRefresh} />)}
        </div>
      )}
    </div>
  );
}

// ── Inline Add ────────────────────────────────────────────────────────────────

function InlineAdd({ defaultDate, onAdd }: { defaultDate?: string; onAdd: (task: Task) => void }) {
  const [open, setOpen]         = useState(false);
  const [title, setTitle]       = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [dueDate, setDueDate]   = useState(defaultDate ?? "");
  const [saving, setSaving]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    const task = await apiCreate({ title: title.trim(), priority, dueDate: dueDate || null } as any);
    onAdd(task);
    setTitle("");
    setPriority("medium");
    setDueDate(defaultDate ?? "");
    setSaving(false);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          width: "100%", padding: "8px 10px", borderRadius: 8,
          border: "1px dashed var(--card-border)", background: "transparent",
          color: "var(--text-muted)", fontSize: 13, fontWeight: 500,
          cursor: "pointer", textAlign: "left",
        }}
      >
        <Plus size={14} /> Add task
      </button>
    );
  }

  return (
    <div style={{ borderRadius: 8, border: "1px solid var(--accent)", background: "var(--card-bg)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }}
        placeholder="Task name"
        style={{ width: "100%", padding: "6px 0", border: "none", background: "transparent", color: "var(--text-primary)", fontSize: 13, fontWeight: 500, outline: "none", boxSizing: "border-box" }}
      />
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {(["high", "medium", "low"] as const).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setPriority(p)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${priority === p ? PRIORITY_COLOR[p] : "var(--card-border)"}`,
              background: priority === p ? PRIORITY_BG[p] : "transparent",
              color: priority === p ? PRIORITY_COLOR[p] : "var(--text-muted)",
            }}
          >
            <Flag size={9} />
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
          <Calendar size={11} color="var(--text-muted)" />
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            style={{ padding: "2px 6px", borderRadius: 6, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 11, outline: "none" }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button type="button" onClick={() => setOpen(false)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
          Cancel
        </button>
        <button type="button" onClick={submit} disabled={!title.trim() || saving} style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: !title.trim() ? "var(--card-border)" : "var(--accent)", color: !title.trim() ? "var(--text-muted)" : "#fff", fontWeight: 700, fontSize: 12, cursor: title.trim() ? "pointer" : "not-allowed" }}>
          {saving ? "Adding…" : "Add task"}
        </button>
      </div>
    </div>
  );
}

// ── TasksPanel (main export) ──────────────────────────────────────────────────

export default function TasksPanel({ tasks, onRefresh, defaultDate }: Props) {
  const today    = todayStr();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const active    = tasks.filter(t => !t.completedAt);
  const completed = tasks.filter(t => !!t.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  function dueKey(t: Task) {
    return t.dueDate ? t.dueDate.split("T")[0] : null;
  }

  const overdue  = active.filter(t => { const d = dueKey(t); return d && d < today; });
  const todayTasks = active.filter(t => { const d = dueKey(t); return d === today; });
  const upcoming = active.filter(t => { const d = dueKey(t); return d && d > today && d <= nextWeek; });
  const later    = active.filter(t => { const d = dueKey(t); return d && d > nextWeek; });
  const noDate   = active.filter(t => !t.dueDate);

  // Combined "Today" includes overdue (shown with red date) + today due date
  const todayCombined = [...overdue, ...todayTasks];

  function handleAdd(task: Task) {
    onRefresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Section label="Today"    tasks={todayCombined} onRefresh={onRefresh} />
      <Section label="Upcoming" tasks={upcoming}      onRefresh={onRefresh} />
      <Section label="Later"    tasks={later}         onRefresh={onRefresh} defaultOpen={false} />
      <Section label="No Date"  tasks={noDate}        onRefresh={onRefresh} defaultOpen={false} />
      <div style={{ marginTop: 8 }}>
        <InlineAdd defaultDate={defaultDate} onAdd={handleAdd} />
      </div>
      {completed.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Section label="Completed" tasks={completed} onRefresh={onRefresh} defaultOpen={false} />
        </div>
      )}
    </div>
  );
}
