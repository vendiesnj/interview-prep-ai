"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const QUESTION_CATEGORIES = [
  { value: "behavioral", label: "Behavioral" },
  { value: "technical", label: "Technical" },
  { value: "role_specific", label: "Role Specific" },
];

export default function CreateAssignmentForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minAttempts, setMinAttempts] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleCategory(value: string) {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          dueDate: dueDate || null,
          questionCategories: selectedCategories,
          minAttempts,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create assignment");
      }

      // Reset form
      setTitle("");
      setDescription("");
      setDueDate("");
      setSelectedCategories([]);
      setMinAttempts(5);
      setOpen(false);

      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid var(--card-border-soft)",
        background: "var(--card-bg)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-primary)",
          fontSize: 13,
          fontWeight: 900,
          letterSpacing: 0.1,
        }}
      >
        <span>+ Create New Assignment</span>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            fontWeight: 700,
          }}
        >
          {open ? "Collapse ▲" : "Expand ▼"}
        </span>
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          style={{
            padding: "0 18px 18px",
            display: "grid",
            gap: 14,
          }}
        >
          {/* Title */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.55,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Behavioral Interview Practice — Week 3"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.55,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what students should focus on..."
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Due Date */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.55,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Due Date (optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          {/* Question Categories */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.55,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Question Categories (optional — leave blank for any)
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {QUESTION_CATEGORIES.map((cat) => {
                const checked = selectedCategories.includes(cat.value);
                return (
                  <label
                    key={cat.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: checked
                        ? "1px solid var(--accent-strong)"
                        : "1px solid var(--card-border-soft)",
                      background: checked ? "var(--accent-soft)" : "var(--card-bg)",
                      color: checked ? "var(--accent)" : "var(--text-primary)",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(cat.value)}
                      style={{ display: "none" }}
                    />
                    {cat.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Min Attempts */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.55,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Minimum Attempts Required
            </label>
            <input
              type="number"
              value={minAttempts}
              min={1}
              max={50}
              onChange={(e) => setMinAttempts(Number(e.target.value))}
              style={{
                width: 80,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "var(--danger-soft, var(--accent-soft))",
                color: "var(--danger, var(--accent))",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "11px 22px",
                borderRadius: 12,
                border: "1px solid var(--accent-strong)",
                background: "var(--accent-soft)",
                color: "var(--accent)",
                fontSize: 13,
                fontWeight: 900,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Creating…" : "Create Assignment"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
