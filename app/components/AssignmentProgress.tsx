"use client";

import { useEffect, useState } from "react";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  questionCategories: string[];
  minAttempts: number;
};

type AssignmentWithProgress = Assignment & {
  completedAttempts: number;
  isComplete: boolean;
  isOverdue: boolean;
};

export default function AssignmentProgress() {
  const [items, setItems] = useState<AssignmentWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [assignRes, sessRes] = await Promise.all([
          fetch("/api/admin/assignments"),
          fetch("/api/sessions"),
        ]);
        if (!assignRes.ok) return;
        const { assignments }: { assignments: Assignment[] } = await assignRes.json();
        if (!assignments?.length) return;

        let attempts: { questionCategory?: string | null; ts: string }[] = [];
        if (sessRes.ok) {
          const sessData = await sessRes.json();
          attempts = sessData.attempts ?? sessData.sessions ?? [];
        }

        const now = new Date();
        const enriched: AssignmentWithProgress[] = assignments.map((a) => {
          const since = new Date(a.dueDate ?? 0);
          const cats = a.questionCategories;
          const completedAttempts = attempts.filter((att) => {
            if (cats.length > 0 && !cats.includes(att.questionCategory ?? "")) return false;
            return true;
          }).length;
          const isComplete = completedAttempts >= a.minAttempts;
          const isOverdue = !!a.dueDate && new Date(a.dueDate) < now && !isComplete;
          return { ...a, completedAttempts, isComplete, isOverdue };
        });

        setItems(enriched);
      } catch {
        // silently fail - assignments are supplementary
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || items.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: 18,
        padding: 16,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--card-border-soft)",
        background: "linear-gradient(145deg, var(--card-bg-strong), var(--card-bg))",
        boxShadow: "var(--shadow-card-soft)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        Your Assignments
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((a) => {
          const pct = Math.min(100, Math.round((a.completedAttempts / a.minAttempts) * 100));
          const dueDateDisplay = a.dueDate
            ? new Date(a.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : null;

          return (
            <div key={a.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                  {a.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: a.isComplete
                      ? "var(--success)"
                      : a.isOverdue
                      ? "var(--danger)"
                      : "var(--text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.isComplete
                    ? "✓ Complete"
                    : a.isOverdue
                    ? `Overdue · ${dueDateDisplay}`
                    : dueDateDisplay
                    ? `Due ${dueDateDisplay}`
                    : `${a.completedAttempts}/${a.minAttempts} attempts`}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: "var(--radius-sm)",
                    background: "var(--card-border-soft)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: a.isComplete
                        ? "var(--success)"
                        : a.isOverdue
                        ? "var(--danger)"
                        : "linear-gradient(90deg, var(--accent-2), var(--accent))",
                      transition: "width 400ms ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--text-muted)",
                    minWidth: 36,
                    textAlign: "right",
                  }}
                >
                  {pct}%
                </div>
              </div>

              {a.questionCategories.length > 0 && !a.isComplete && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: "var(--text-muted)",
                    fontWeight: 700,
                  }}
                >
                  {a.questionCategories.join(", ")} questions · {a.minAttempts} required
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
