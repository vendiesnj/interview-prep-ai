"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type ChecklistItemDef = {
  id: string;
  label: string;
  desc: string; // default description (fallback)
  linkHref?: string;   // default external/internal link
  linkLabel?: string;  // default link label
};

type ContentOverride = {
  itemId: string;
  body: string;
  linkHref?: string | null;
  linkLabel?: string | null;
};

export type ChecklistProgressEntry = {
  itemId: string;
  done: boolean;
  scheduledDate: string | null;
};

type Props = {
  stage: string;
  items: ChecklistItemDef[];
  accentColor?: string;
  /** If true, show inline edit controls (admin mode) */
  adminMode?: boolean;
  /** Called when progress loads or changes — lets parent wire calendar */
  onProgressChange?: (entries: ChecklistProgressEntry[]) => void;
};

export default function ChecklistSection({
  stage,
  items,
  accentColor = "#2563EB",
  adminMode = false,
  onProgressChange,
}: Props) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [scheduled, setScheduled] = useState<Map<string, string | null>>(new Map());
  const [overrides, setOverrides] = useState<Map<string, ContentOverride>>(new Map());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ body: "", linkHref: "", linkLabel: "" });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [justChecked, setJustChecked] = useState<string | null>(null);
  const pendingRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Load progress + content overrides from DB
  useEffect(() => {
    fetch(`/api/checklist?stage=${stage}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.progress) {
          setDone(new Set(data.progress.filter((p: any) => p.done).map((p: any) => p.itemId)));
          const schedMap = new Map<string, string | null>();
          for (const p of data.progress) {
            schedMap.set(p.itemId, p.scheduledDate ?? null);
          }
          setScheduled(schedMap);
          onProgressChange?.(data.progress.map((p: any) => ({
            itemId: p.itemId,
            done: p.done,
            scheduledDate: p.scheduledDate ?? null,
          })));
        }
        if (data.content) {
          const map = new Map<string, ContentOverride>();
          for (const c of data.content) map.set(c.itemId, c);
          setOverrides(map);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Notify parent when progress changes
  useEffect(() => {
    if (!loaded) return;
    const entries: ChecklistProgressEntry[] = items.map(i => ({
      itemId: i.id,
      done: done.has(i.id),
      scheduledDate: scheduled.get(i.id) ?? null,
    }));
    onProgressChange?.(entries);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, scheduled, loaded]);

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      const nowDone = !next.has(id);
      if (nowDone) {
        next.add(id);
        setJustChecked(id);
        setTimeout(() => setJustChecked(null), 700);
      } else {
        next.delete(id);
      }

      // Debounce DB write
      const existing = pendingRef.current.get(id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        fetch("/api/checklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage, itemId: id, done: nowDone }),
        }).catch(() => {});
        pendingRef.current.delete(id);
      }, 600);
      pendingRef.current.set(id, timer);

      return next;
    });
  }

  function scheduleItem(itemId: string, dateStr: string | null) {
    setScheduled(prev => {
      const next = new Map(prev);
      next.set(itemId, dateStr);
      return next;
    });
    fetch("/api/checklist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, itemId, scheduledDate: dateStr }),
    }).catch(() => {});
  }

  async function saveEdit(itemId: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/checklist-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, itemId, ...editDraft }),
      });
      if (res.ok) {
        const saved = await res.json();
        setOverrides((prev) => {
          const next = new Map(prev);
          next.set(itemId, saved);
          return next;
        });
        setEditingId(null);
      }
    } finally {
      setSaving(false);
    }
  }

  const doneCount = items.filter((i) => done.has(i.id)).length;

  return (
    <div>
      <style>{`
        @keyframes checkPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.35); }
          70%  { transform: scale(0.92); }
          100% { transform: scale(1); }
        }
        @keyframes checkGlow {
          0%   { box-shadow: 0 0 0 0 var(--check-glow, rgba(16,185,129,0.5)); }
          60%  { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
      `}</style>

      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: accentColor, textTransform: "uppercase" }}>
          Your Checklist
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", opacity: 0.7 }}>drag items → calendar</div>
          <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)" }}>
            {doneCount} / {items.length}
          </div>
        </div>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden", marginBottom: 16 }}>
        <div style={{
          height: "100%",
          width: `${Math.round((doneCount / items.length) * 100)}%`,
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}aa)`,
          borderRadius: 99,
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Items */}
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((item) => {
          const checked = done.has(item.id);
          const isOpen = expanded === item.id;
          const override = overrides.get(item.id);
          const bodyText = override?.body || item.desc;
          const isEditing = editingId === item.id;
          const isJustChecked = justChecked === item.id;
          const itemScheduled = scheduled.get(item.id) ?? null;

          return (
            <div
              key={item.id}
              draggable={!checked}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", JSON.stringify({ type: "checklist", id: item.id, label: item.label }));
                e.dataTransfer.effectAllowed = "link";
                // Small pill ghost so calendar days stay visible while dragging
                const ghost = document.createElement("div");
                ghost.textContent = "📅 " + item.label;
                Object.assign(ghost.style, {
                  position: "fixed", top: "-120px", left: "-120px",
                  padding: "6px 14px", borderRadius: "99px",
                  background: accentColor, color: "#fff",
                  fontSize: "12px", fontWeight: "700",
                  whiteSpace: "nowrap", maxWidth: "220px",
                  overflow: "hidden", textOverflow: "ellipsis",
                  pointerEvents: "none",
                });
                document.body.appendChild(ghost);
                e.dataTransfer.setDragImage(ghost, 14, 14);
                setTimeout(() => document.body.removeChild(ghost), 0);
              }}
              style={{
                borderRadius: 14,
                border: `1px solid ${checked ? accentColor + "35" : "var(--card-border)"}`,
                background: checked ? accentColor + "06" : "var(--card-bg)",
                overflow: "hidden",
                transition: "border-color 150ms, background 150ms",
                cursor: checked ? "default" : "grab",
              }}
            >
              {/* Main row */}
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px" }}>
                {/* Checkbox */}
                <div
                  onClick={() => { if (!loaded) return; toggle(item.id); }}
                  style={{
                    width: 22, height: 22, borderRadius: 6,
                    border: `2px solid ${checked ? accentColor : "var(--card-border)"}`,
                    background: checked ? accentColor : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 1, fontSize: 13, color: "#fff",
                    cursor: "pointer",
                    transition: "all 150ms",
                    animation: isJustChecked ? "checkPop 0.4s ease, checkGlow 0.6s ease" : "none",
                    ["--check-glow" as any]: accentColor + "80",
                  }}
                >
                  {checked ? "✓" : ""}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <div style={{
                      fontSize: 13, fontWeight: 900,
                      color: checked ? "var(--text-muted)" : "var(--text-primary)",
                      textDecoration: checked ? "line-through" : "none",
                    }}>
                      {item.label}
                    </div>
                    {itemScheduled && !checked && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                        background: accentColor + "18", color: accentColor,
                      }}>
                        📅 {new Date(itemScheduled + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                  {!isOpen && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.5 }}>
                      {item.desc}
                    </div>
                  )}
                </div>

                {/* Expand + admin edit buttons */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  {adminMode && (
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setEditDraft({
                          body: override?.body || item.desc,
                          linkHref: override?.linkHref || "",
                          linkLabel: override?.linkLabel || "",
                        });
                        setExpanded(item.id);
                      }}
                      style={{
                        padding: "4px 10px", borderRadius: 6, border: "1px solid var(--card-border)",
                        background: "transparent", color: "var(--text-muted)", fontSize: 11,
                        fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--text-muted)", fontSize: 14, padding: "2px 4px",
                      transform: isOpen ? "rotate(180deg)" : "none",
                      transition: "transform 200ms",
                    }}
                  >
                    ▾
                  </button>
                </div>
              </div>

              {/* Expanded panel */}
              {isOpen && (
                <div style={{
                  borderTop: "1px solid var(--card-border-soft)",
                  padding: "14px 16px 16px 50px",
                  background: "var(--card-bg-strong)",
                }}>
                  {isEditing ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Description</div>
                        <textarea
                          value={editDraft.body}
                          onChange={(e) => setEditDraft((d) => ({ ...d, body: e.target.value }))}
                          rows={3}
                          style={{
                            width: "100%", boxSizing: "border-box", padding: "8px 10px",
                            borderRadius: 8, border: "1px solid var(--card-border)",
                            background: "var(--card-bg)", color: "var(--text-primary)",
                            fontSize: 13, resize: "vertical",
                          }}
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Link URL (optional)</div>
                          <input
                            value={editDraft.linkHref}
                            onChange={(e) => setEditDraft((d) => ({ ...d, linkHref: e.target.value }))}
                            placeholder="https://..."
                            style={{
                              width: "100%", boxSizing: "border-box", padding: "7px 10px",
                              borderRadius: 8, border: "1px solid var(--card-border)",
                              background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 13,
                            }}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Link Label (optional)</div>
                          <input
                            value={editDraft.linkLabel}
                            onChange={(e) => setEditDraft((d) => ({ ...d, linkLabel: e.target.value }))}
                            placeholder="Learn more →"
                            style={{
                              width: "100%", boxSizing: "border-box", padding: "7px 10px",
                              borderRadius: 8, border: "1px solid var(--card-border)",
                              background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 13,
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => saveEdit(item.id)}
                          disabled={saving}
                          style={{
                            padding: "7px 16px", borderRadius: 8, border: "none",
                            background: accentColor, color: "#fff", fontWeight: 800,
                            fontSize: 13, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                          }}
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{
                            padding: "7px 14px", borderRadius: 8,
                            border: "1px solid var(--card-border)",
                            background: "transparent", color: "var(--text-muted)",
                            fontWeight: 700, fontSize: 13, cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-primary)", lineHeight: 1.65 }}>
                        {bodyText}
                      </p>
                      {(override?.linkHref || item.linkHref) && (
                        <a
                          href={override?.linkHref || item.linkHref}
                          target={override?.linkHref?.startsWith("http") || item.linkHref?.startsWith("http") ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            fontSize: 12, fontWeight: 700, color: accentColor,
                            textDecoration: "none",
                          }}
                        >
                          {override?.linkLabel || item.linkLabel || "Learn more"} →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
