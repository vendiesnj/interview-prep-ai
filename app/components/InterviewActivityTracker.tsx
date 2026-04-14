"use client";

import React, { useEffect, useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage =
  | "applied"
  | "phone_screen"
  | "technical"
  | "on_site"
  | "final_round"
  | "offer"
  | "rejected"
  | "accepted"
  | "declined";

type Outcome =
  | "pending"
  | "rejected"
  | "offer_received"
  | "accepted"
  | "declined";

interface Activity {
  id: string;
  company: string;
  role: string;
  industry?: string | null;
  appliedDate?: string | null;
  interviewDate?: string | null;
  stage: Stage;
  outcome?: Outcome | null;
  salaryOffered?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STAGE_OPTIONS: { value: Stage; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "phone_screen", label: "Phone Screen" },
  { value: "technical", label: "Technical" },
  { value: "on_site", label: "On-Site" },
  { value: "final_round", label: "Final Round" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

const OUTCOME_OPTIONS: { value: Outcome; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "offer_received", label: "Offer Received" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

const INDUSTRY_OPTIONS = [
  "Technology",
  "Finance & Banking",
  "Consulting",
  "Healthcare & Life Sciences",
  "Marketing & Advertising",
  "Education",
  "Government & Nonprofit",
  "Retail & Consumer",
  "Manufacturing & Engineering",
  "Media & Entertainment",
  "Real Estate",
  "Legal",
  "Other",
];

const STAGE_COLORS: Record<Stage, string> = {
  applied: "#6B7280",
  phone_screen: "#2563EB",
  technical: "#8B5CF6",
  on_site: "#F59E0B",
  final_round: "#EC4899",
  offer: "#10B981",
  rejected: "#EF4444",
  accepted: "#10B981",
  declined: "#6B7280",
};

const OUTCOME_COLORS: Record<Outcome, string> = {
  pending: "var(--text-muted)",
  rejected: "#EF4444",
  offer_received: "#10B981",
  accepted: "#10B981",
  declined: "#6B7280",
};

// ── Blank form state ──────────────────────────────────────────────────────────

const BLANK_FORM = {
  company: "",
  role: "",
  industry: "",
  stage: "applied" as Stage,
  outcome: "" as Outcome | "",
  interviewDate: "",
  salaryOffered: "",
  notes: "",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function InterviewActivityTracker() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ ...BLANK_FORM });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit state: keyed by activity id
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...BLANK_FORM });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Deleting state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview-activity");
      if (!res.ok) throw new Error("Failed to load activities");
      const data = await res.json();
      setActivities(data.activities ?? []);
    } catch {
      setError("Could not load your interview pipeline. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // ── Add ─────────────────────────────────────────────────────────────────────

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.company.trim() || !addForm.role.trim()) {
      setAddError("Company and role are required.");
      return;
    }
    setAddSubmitting(true);
    setAddError(null);
    try {
      const res = await fetch("/api/interview-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: addForm.company.trim(),
          role: addForm.role.trim(),
          industry: addForm.industry || undefined,
          stage: addForm.stage,
          outcome: addForm.outcome || undefined,
          interviewDate: addForm.interviewDate || undefined,
          salaryOffered: addForm.salaryOffered ? Number(addForm.salaryOffered) : undefined,
          notes: addForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to add");
      setShowAddForm(false);
      setAddForm({ ...BLANK_FORM });
      await fetchActivities();
    } catch {
      setAddError("Something went wrong. Please try again.");
    } finally {
      setAddSubmitting(false);
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────

  const startEdit = (activity: Activity) => {
    setEditingId(activity.id);
    setEditForm({
      company: activity.company,
      role: activity.role,
      industry: activity.industry ?? "",
      stage: activity.stage,
      outcome: activity.outcome ?? "",
      interviewDate: activity.interviewDate
        ? activity.interviewDate.slice(0, 10)
        : "",
      salaryOffered: activity.salaryOffered != null ? String(activity.salaryOffered) : "",
      notes: activity.notes ?? "",
    });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleEdit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!editForm.company.trim() || !editForm.role.trim()) {
      setEditError("Company and role are required.");
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/interview-activity/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: editForm.company.trim(),
          role: editForm.role.trim(),
          industry: editForm.industry || null,
          stage: editForm.stage,
          outcome: editForm.outcome || null,
          interviewDate: editForm.interviewDate || null,
          salaryOffered: editForm.salaryOffered ? Number(editForm.salaryOffered) : null,
          notes: editForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingId(null);
      await fetchActivities();
    } catch {
      setEditError("Something went wrong. Please try again.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this activity? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/interview-activity?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchActivities();
    } catch {
      alert("Could not delete. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: -0.2,
            }}
          >
            Interview Pipeline
          </div>
          {!loading && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
              {activities.length === 0
                ? "No entries yet"
                : `${activities.length} ${activities.length === 1 ? "entry" : "entries"}`}
            </div>
          )}
        </div>
        {!showAddForm && (
          <button
            onClick={() => {
              setShowAddForm(true);
              setAddForm({ ...BLANK_FORM });
              setAddError(null);
            }}
            style={{
              padding: "9px 18px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + Add Activity
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div
          style={{
            marginBottom: 20,
            padding: 20,
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--accent)",
            background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "var(--text-primary)",
              marginBottom: 16,
            }}
          >
            Log New Activity
          </div>
          <form onSubmit={handleAdd}>
            <ActivityFormFields
              form={addForm}
              onChange={(key, val) => setAddForm((f) => ({ ...f, [key]: val }))}
            />
            {addError && (
              <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>
                {addError}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                type="submit"
                disabled={addSubmitting}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: addSubmitting ? "var(--card-border)" : "var(--accent)",
                  color: addSubmitting ? "var(--text-muted)" : "#fff",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: addSubmitting ? "not-allowed" : "pointer",
                  opacity: addSubmitting ? 0.7 : 1,
                }}
              >
                {addSubmitting ? "Saving..." : "Save Activity"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setAddError(null);
                }}
                style={{
                  padding: "11px 18px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--card-border)",
                  background: "var(--card-bg)",
                  color: "var(--text-primary)",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div
          style={{
            padding: "32px 0",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          Loading...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--card-border)",
            background: "var(--card-bg)",
            color: "#EF4444",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && activities.length === 0 && (
        <div
          style={{
            padding: "40px 24px",
            textAlign: "center",
            borderRadius: "var(--radius-xl)",
            border: "1px dashed var(--card-border-soft)",
            background: "var(--card-bg)",
          }}
        >
          <div
            style={{
              fontSize: 32,
              marginBottom: 12,
              opacity: 0.5,
            }}
          >
            📋
          </div>
          <div
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.7,
              maxWidth: 420,
              margin: "0 auto",
            }}
          >
            No interviews logged yet. Add your first one to start tracking your pipeline.
          </div>
        </div>
      )}

      {/* Activity cards */}
      {!loading && !error && activities.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {activities.map((activity) => (
            <div key={activity.id}>
              {editingId === activity.id ? (
                // Edit form inline
                <div
                  style={{
                    padding: 20,
                    borderRadius: "var(--radius-xl)",
                    border: "1px solid var(--accent)",
                    background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      marginBottom: 14,
                    }}
                  >
                    Editing: {activity.company}
                  </div>
                  <form onSubmit={(e) => handleEdit(e, activity.id)}>
                    <ActivityFormFields
                      form={editForm}
                      onChange={(key, val) => setEditForm((f) => ({ ...f, [key]: val }))}
                    />
                    {editError && (
                      <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>
                        {editError}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                      <button
                        type="submit"
                        disabled={editSubmitting}
                        style={{
                          flex: 1,
                          padding: "11px",
                          borderRadius: "var(--radius-md)",
                          border: "none",
                          background: editSubmitting ? "var(--card-border)" : "var(--accent)",
                          color: editSubmitting ? "var(--text-muted)" : "#fff",
                          fontWeight: 800,
                          fontSize: 14,
                          cursor: editSubmitting ? "not-allowed" : "pointer",
                          opacity: editSubmitting ? 0.7 : 1,
                        }}
                      >
                        {editSubmitting ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        style={{
                          padding: "11px 18px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--card-border)",
                          background: "var(--card-bg)",
                          color: "var(--text-primary)",
                          fontWeight: 900,
                          fontSize: 14,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // Card view
                <ActivityCard
                  activity={activity}
                  onEdit={() => startEdit(activity)}
                  onDelete={() => handleDelete(activity.id)}
                  deleting={deletingId === activity.id}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ActivityCard ──────────────────────────────────────────────────────────────

function ActivityCard({
  activity,
  onEdit,
  onDelete,
  deleting,
}: {
  activity: Activity;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const stageColor = STAGE_COLORS[activity.stage] ?? "#6B7280";
  const stageLabel =
    STAGE_OPTIONS.find((s) => s.value === activity.stage)?.label ?? activity.stage;
  const outcomeColor = activity.outcome
    ? OUTCOME_COLORS[activity.outcome] ?? "var(--text-muted)"
    : null;
  const outcomeLabel = activity.outcome
    ? OUTCOME_OPTIONS.find((o) => o.value === activity.outcome)?.label ?? activity.outcome
    : null;

  const displayDate = activity.interviewDate
    ? new Date(activity.interviewDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : activity.appliedDate
    ? `Applied ${new Date(activity.appliedDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`
    : null;

  return (
    <div
      style={{
        padding: "16px 20px",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--card-border-soft)",
        background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))",
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      {/* Stage color bar */}
      <div
        style={{
          width: 4,
          alignSelf: "stretch",
          borderRadius: 99,
          background: stageColor,
          flexShrink: 0,
          minHeight: 40,
        }}
      />

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 4,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {activity.company}
          </div>
          {/* Stage badge */}
          <span
            style={{
              display: "inline-block",
              padding: "2px 9px",
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 900,
              background: stageColor + "22",
              color: stageColor,
              border: `1px solid ${stageColor}55`,
              whiteSpace: "nowrap",
            }}
          >
            {stageLabel}
          </span>
          {/* Outcome badge */}
          {outcomeLabel && outcomeColor && (
            <span
              style={{
                display: "inline-block",
                padding: "2px 9px",
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 900,
                background: outcomeColor + "22",
                color: outcomeColor,
                border: `1px solid ${outcomeColor}55`,
                whiteSpace: "nowrap",
              }}
            >
              {outcomeLabel}
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            marginBottom: activity.notes || displayDate || activity.salaryOffered ? 8 : 0,
          }}
        >
          {activity.role}
          {activity.industry ? (
            <span style={{ marginLeft: 8, opacity: 0.7 }}>· {activity.industry}</span>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          {displayDate && <span>{displayDate}</span>}
          {activity.salaryOffered != null && (
            <span style={{ color: "#10B981", fontWeight: 900 }}>
              ${activity.salaryOffered.toLocaleString()}/yr
            </span>
          )}
        </div>

        {activity.notes && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "var(--text-soft)",
              lineHeight: 1.6,
              borderTop: "1px solid var(--card-border-soft)",
              paddingTop: 8,
            }}
          >
            {activity.notes}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexShrink: 0,
          alignItems: "flex-start",
        }}
      >
        <button
          onClick={onEdit}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--card-border)",
            background: "var(--card-bg)",
            color: "var(--text-primary)",
            fontWeight: 900,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid #EF444430",
            background: "#EF444410",
            color: "#EF4444",
            fontWeight: 900,
            fontSize: 12,
            cursor: deleting ? "not-allowed" : "pointer",
            opacity: deleting ? 0.5 : 1,
          }}
        >
          {deleting ? "..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

// ── ActivityFormFields ────────────────────────────────────────────────────────

type FormState = {
  company: string;
  role: string;
  industry: string;
  stage: Stage;
  outcome: Outcome | "";
  interviewDate: string;
  salaryOffered: string;
  notes: string;
};

function ActivityFormFields({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (key: keyof FormState, value: string) => void;
}) {
  const fieldLabel: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 900,
    color: "var(--text-primary)",
    marginBottom: 5,
    letterSpacing: 0.3,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--card-border)",
    background: "var(--input-bg)",
    color: "var(--text-primary)",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Company + Role */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={fieldLabel}>Company *</div>
          <input
            type="text"
            placeholder="e.g. Google"
            value={form.company}
            onChange={(e) => onChange("company", e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        <div>
          <div style={fieldLabel}>Role *</div>
          <input
            type="text"
            placeholder="e.g. Software Engineer"
            value={form.role}
            onChange={(e) => onChange("role", e.target.value)}
            required
            style={inputStyle}
          />
        </div>
      </div>

      {/* Industry */}
      <div>
        <div style={fieldLabel}>Industry</div>
        <select
          value={form.industry}
          onChange={(e) => onChange("industry", e.target.value)}
          style={selectStyle}
        >
          <option value="">Select industry (optional)</option>
          {INDUSTRY_OPTIONS.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
      </div>

      {/* Stage + Outcome */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={fieldLabel}>Stage</div>
          <select
            value={form.stage}
            onChange={(e) => onChange("stage", e.target.value as Stage)}
            style={selectStyle}
          >
            {STAGE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={fieldLabel}>Outcome</div>
          <select
            value={form.outcome}
            onChange={(e) => onChange("outcome", e.target.value as Outcome | "")}
            style={selectStyle}
          >
            <option value="">Select outcome (optional)</option>
            {OUTCOME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Interview Date + Salary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={fieldLabel}>Interview Date</div>
          <input
            type="date"
            value={form.interviewDate}
            onChange={(e) => onChange("interviewDate", e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <div style={fieldLabel}>Salary Offered (annual, $)</div>
          <input
            type="number"
            placeholder="e.g. 95000"
            value={form.salaryOffered}
            onChange={(e) => onChange("salaryOffered", e.target.value)}
            min={0}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <div style={fieldLabel}>Notes</div>
        <textarea
          placeholder="Any notes about this application or interview..."
          value={form.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          rows={3}
          style={{
            ...inputStyle,
            resize: "vertical",
            lineHeight: 1.5,
          }}
        />
      </div>
    </div>
  );
}
