"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PremiumShell from "../../components/PremiumShell";
import { ToastContainer, useToast } from "@/app/components/Toast";
import {
  type ExperienceEntry,
  loadExperiences,
  saveExperiences,
  addExperience,
  updateExperience,
  deleteExperience,
  starCompleteness,
} from "@/app/lib/experienceLog";

// ── helpers ────────────────────────────────────────────────────────────────────

function formatDate(ts: number | null) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function scoreLabel(score: number | null): string {
  if (score === null) return "–";
  return `${Math.round(score)}`;
}

const STAR_LABELS = ["S", "T", "A", "R"] as const;
const STAR_FIELDS = ["situation", "task", "action", "result"] as const;
const STAR_FULL = ["Situation", "Task", "Action", "Result"] as const;

// ── empty-form factory ─────────────────────────────────────────────────────────
function emptyForm(): Omit<ExperienceEntry, "id" | "createdAt" | "updatedAt" | "practiceCount" | "bestScore" | "lastPracticed" | "linkedAttemptIds"> {
  return {
    title: "",
    company: "",
    roleAtTime: "",
    timeframe: "",
    skills: [],
    situation: "",
    task: "",
    action: "",
    result: "",
    notes: "",
  };
}

// ── sub-components ─────────────────────────────────────────────────────────────

function StarBadges({ count }: { count: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {STAR_LABELS.map((l, i) => (
        <div
          key={l}
          style={{
            width: 20, height: 20,
            borderRadius: 5,
            fontSize: 10,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: i < count ? "var(--accent-soft)" : "var(--card-border-soft)",
            color: i < count ? "var(--accent)" : "var(--text-muted)",
            border: `1px solid ${i < count ? "var(--accent-strong)" : "transparent"}`,
          }}
        >
          {l}
        </div>
      ))}
    </div>
  );
}

function SkillTag({ label }: { label: string }) {
  return (
    <span style={{
      padding: "3px 8px",
      borderRadius: "var(--radius-sm)",
      fontSize: 11,
      fontWeight: 600,
      background: "var(--card-bg-strong)",
      border: "1px solid var(--card-border)",
      color: "var(--text-muted)",
    }}>
      {label}
    </span>
  );
}

function ExperienceCard({
  entry,
  onEdit,
  onDelete,
  onPractice,
}: {
  entry: ExperienceEntry;
  onEdit: () => void;
  onDelete: () => void;
  onPractice: () => void;
}) {
  const completion = starCompleteness(entry);
  const hasScore = entry.bestScore !== null;

  return (
    <div style={{
      padding: "18px 20px",
      borderRadius: 14,
      border: "1px solid var(--card-border)",
      background: "var(--card-bg)",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      {/* Title + meta row */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.4 }}>
          {entry.title}
        </div>
        <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {entry.company && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{entry.company}</span>
          )}
          {entry.roleAtTime && entry.company && (
            <span style={{ color: "var(--card-border)", fontSize: 11 }}>·</span>
          )}
          {entry.roleAtTime && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{entry.roleAtTime}</span>
          )}
          {entry.timeframe && (
            <>
              <span style={{ color: "var(--card-border)", fontSize: 11 }}>·</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{entry.timeframe}</span>
            </>
          )}
        </div>
      </div>

      {/* Skills */}
      {entry.skills.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {entry.skills.map(s => <SkillTag key={s} label={s} />)}
        </div>
      )}

      {/* STAR completeness + stats row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <StarBadges count={completion} />
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {entry.practiceCount > 0 && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {entry.practiceCount} practice{entry.practiceCount !== 1 ? "s" : ""}
            </span>
          )}
          {hasScore && (
            <span style={{
              fontSize: 13, fontWeight: 800,
              color: entry.bestScore! >= 75 ? "var(--success)" : entry.bestScore! >= 55 ? "#F59E0B" : "var(--danger)",
            }}>
              Best {scoreLabel(entry.bestScore)}
            </span>
          )}
        </div>
      </div>

      {/* Result preview if filled */}
      {entry.result && (
        <div style={{
          padding: "10px 12px",
          borderRadius: 9,
          background: "var(--accent-soft)",
          border: "1px solid var(--accent-strong)",
          fontSize: 12,
          color: "var(--text-primary)",
          lineHeight: 1.6,
        }}>
          <span style={{ fontWeight: 700, color: "var(--accent)", marginRight: 6 }}>Result:</span>
          {entry.result.length > 160 ? entry.result.slice(0, 157) + "…" : entry.result}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button
          onClick={onPractice}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 9,
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Practice
        </button>
        <button
          onClick={onEdit}
          style={{
            padding: "8px 14px",
            borderRadius: 9,
            border: "1px solid var(--card-border)",
            background: "var(--card-bg-strong)",
            color: "var(--text-primary)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          style={{
            padding: "8px 12px",
            borderRadius: 9,
            border: "1px solid var(--danger-soft)",
            background: "var(--danger-soft)",
            color: "var(--danger)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

type FormState = ReturnType<typeof emptyForm>;

function ExperienceModal({
  initial,
  onSave,
  onClose,
}: {
  initial: FormState;
  onSave: (data: FormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [skillInput, setSkillInput] = useState("");
  const [activeSection, setActiveSection] = useState<"basics" | "star" | "notes">("basics");

  function set(field: keyof FormState, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function addSkill() {
    const trimmed = skillInput.trim();
    if (!trimmed || form.skills.includes(trimmed)) { setSkillInput(""); return; }
    set("skills", [...form.skills, trimmed]);
    setSkillInput("");
  }

  function removeSkill(s: string) {
    set("skills", form.skills.filter(x => x !== s));
  }

  const isValid = form.title.trim().length > 0;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 11px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--card-border)",
    background: "var(--card-bg-strong)",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: "vertical" as const,
    minHeight: 80,
    lineHeight: 1.6,
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    color: "var(--text-muted)",
    marginBottom: 5,
    display: "block",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", maxWidth: 560,
        maxHeight: "90vh",
        overflowY: "auto",
        borderRadius: "var(--radius-xl)",
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid var(--card-border-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
            {initial.title ? "Edit experience" : "Add experience"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Section tabs */}
        <div style={{ padding: "12px 20px 0", display: "flex", gap: 4, flexShrink: 0 }}>
          {(["basics", "star", "notes"] as const).map(s => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              style={{
                padding: "6px 14px",
                borderRadius: 7,
                border: "none",
                background: activeSection === s ? "var(--accent)" : "var(--card-bg-strong)",
                color: activeSection === s ? "#fff" : "var(--text-muted)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {s === "star" ? "STAR Story" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {activeSection === "basics" && (
            <>
              <div>
                <label style={labelStyle}>Story Title *</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Led migration from legacy ERP to SAP"
                  value={form.title}
                  onChange={e => set("title", e.target.value)}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Company</label>
                  <input style={inputStyle} placeholder="Google, Startup Inc…" value={form.company ?? ""} onChange={e => set("company", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Your Role</label>
                  <input style={inputStyle} placeholder="Product Manager, Analyst…" value={form.roleAtTime ?? ""} onChange={e => set("roleAtTime", e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Timeframe</label>
                <input style={inputStyle} placeholder="Q3 2023, Summer 2022…" value={form.timeframe ?? ""} onChange={e => set("timeframe", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Skills / Tags</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="stakeholder mgmt, SQL, change mgmt…"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  />
                  <button
                    onClick={addSkill}
                    style={{ padding: "9px 14px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    Add
                  </button>
                </div>
                {form.skills.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {form.skills.map(s => (
                      <span
                        key={s}
                        onClick={() => removeSkill(s)}
                        style={{ padding: "3px 8px", borderRadius: "var(--radius-sm)", fontSize: 11, fontWeight: 600, background: "var(--accent-soft)", border: "1px solid var(--accent-strong)", color: "var(--accent)", cursor: "pointer" }}
                      >
                        {s} ×
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeSection === "star" && (
            <>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                Fill in as much or as little as you know. You can return and refine anytime. Strong results need a specific metric.
              </div>
              {STAR_FIELDS.map((field, i) => (
                <div key={field}>
                  <label style={labelStyle}>
                    <span style={{ color: "var(--accent)", marginRight: 4 }}>[{STAR_LABELS[i]}]</span>
                    {STAR_FULL[i]}
                  </label>
                  <textarea
                    style={textareaStyle}
                    placeholder={
                      field === "situation" ? "What was the context or challenge?" :
                      field === "task" ? "What were you specifically responsible for?" :
                      field === "action" ? "What did you do? (use I, not we)" :
                      "What was the measurable outcome? Include a number if possible."
                    }
                    value={(form as any)[field] ?? ""}
                    onChange={e => set(field, e.target.value)}
                  />
                </div>
              ))}
            </>
          )}

          {activeSection === "notes" && (
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                style={{ ...textareaStyle, minHeight: 120 }}
                placeholder="What questions is this story most useful for? Any coaching notes to yourself…"
                value={form.notes ?? ""}
                onChange={e => set("notes", e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px 18px",
          borderTop: "1px solid var(--card-border-soft)",
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid var(--card-border)", background: "var(--card-bg-strong)", color: "var(--text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            disabled={!isValid}
            onClick={() => onSave(form)}
            style={{
              padding: "9px 20px",
              borderRadius: 9,
              border: "none",
              background: isValid ? "var(--accent)" : "var(--card-border-soft)",
              color: isValid ? "#fff" : "var(--text-muted)",
              fontSize: 13,
              fontWeight: 700,
              cursor: isValid ? "pointer" : "not-allowed",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ExperienceLogPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toasts, show: showToast, dismiss } = useToast();
  const [entries, setEntries] = useState<ExperienceEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (session) setEntries(loadExperiences(session));
  }, [session]);

  function persist(updated: ExperienceEntry[]) {
    setEntries(updated);
    if (session) saveExperiences(session, updated);
  }

  function handleSave(data: FormState) {
    if (editingId) {
      const updated = entries.map(e =>
        e.id === editingId ? { ...e, ...data, updatedAt: Date.now() } : e
      );
      persist(updated);
      showToast("Story updated");
    } else {
      if (!session) return;
      addExperience(session, data);
      setEntries(loadExperiences(session));
      showToast("Story added");
    }
    setShowModal(false);
    setEditingId(null);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setShowModal(true);
  }

  function openAdd() {
    setEditingId(null);
    setShowModal(true);
  }

  function handleDelete(id: string) {
    if (session) deleteExperience(session, id);
    setEntries(entries.filter(e => e.id !== id));
    setConfirmDeleteId(null);
    showToast("Story deleted", "info");
  }

  function handlePractice(entry: ExperienceEntry) {
    // Pass the experience context to the practice page via sessionStorage
    try {
      sessionStorage.setItem("ipc_practice_context", JSON.stringify({
        experienceId: entry.id,
        experienceTitle: entry.title,
        prefillContext: [
          entry.situation ? `Context: ${entry.situation}` : null,
          entry.task ? `Task: ${entry.task}` : null,
        ].filter(Boolean).join("\n"),
      }));
    } catch {}
    router.push("/practice");
  }

  const editingEntry = editingId ? entries.find(e => e.id === editingId) : null;
  const modalInitial: FormState = editingEntry
    ? {
        title: editingEntry.title,
        company: editingEntry.company,
        roleAtTime: editingEntry.roleAtTime,
        timeframe: editingEntry.timeframe,
        skills: editingEntry.skills,
        situation: editingEntry.situation,
        task: editingEntry.task,
        action: editingEntry.action,
        result: editingEntry.result,
        notes: editingEntry.notes,
      }
    : emptyForm();

  const sortedEntries = [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
  const totalPractices = entries.reduce((acc, e) => acc + e.practiceCount, 0);

  return (
    <>
    <PremiumShell title="Experience Log" subtitle="Organize and practice your career stories.">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{
          marginTop: 24,
          padding: "20px 22px",
          borderRadius: 14,
          border: "1px solid var(--card-border-soft)",
          background: "var(--card-bg)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
              Experience Log
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 520 }}>
              Most interviews draw on the same 5–6 stories. Log yours here, refine the STAR structure, and practice until they're fluent. Useful for interviews, performance reviews, and career planning.
            </div>
            {entries.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", gap: 16 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  <strong style={{ color: "var(--text-primary)" }}>{entries.length}</strong> {entries.length === 1 ? "story" : "stories"}
                </span>
                {totalPractices > 0 && (
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    <strong style={{ color: "var(--text-primary)" }}>{totalPractices}</strong> total practices
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={openAdd}
            style={{
              padding: "10px 18px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            + Add story
          </button>
        </div>

        {/* Empty state */}
        {entries.length === 0 && (
          <div style={{
            marginTop: 24,
            padding: 32,
            borderRadius: 14,
            border: "1px dashed var(--card-border)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📖</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
              No stories yet
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>
              Add your first experience — a project you led, a problem you solved, or a win you're proud of. You'll build a library of stories ready for any interview.
            </div>
            <button
              onClick={openAdd}
              style={{
                marginTop: 18,
                padding: "10px 22px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "var(--accent)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Add your first story
            </button>
          </div>
        )}

        {/* Cards grid */}
        {sortedEntries.length > 0 && (
          <div style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}>
            {sortedEntries.map(entry => (
              <ExperienceCard
                key={entry.id}
                entry={entry}
                onEdit={() => openEdit(entry.id)}
                onDelete={() => setConfirmDeleteId(entry.id)}
                onPractice={() => handlePractice(entry)}
              />
            ))}
          </div>
        )}

        {/* Tip strip (shown when user has ≥1 entry but not fully practiced) */}
        {entries.length > 0 && entries.some(e => e.practiceCount === 0) && (
          <div style={{
            marginTop: 20,
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--card-border-soft)",
            background: "var(--card-bg)",
            fontSize: 12,
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}>
            <strong style={{ color: "var(--text-primary)" }}>Tip:</strong> Practice each story at least twice — once to get it out, once to sharpen it. Aim for 90–120 seconds per answer with a clear, quantified result.
          </div>
        )}

      </div>

      {/* Add/Edit modal */}
      {showModal && (
        <ExperienceModal
          initial={modalInitial}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingId(null); }}
        />
      )}

      {/* Delete confirm */}
      {confirmDeleteId && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteId(null); }}
        >
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 24, maxWidth: 360, width: "100%" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Remove this story?</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 20 }}>
              This will delete the story and its practice history. This cannot be undone.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--card-border)", background: "var(--card-bg-strong)", color: "var(--text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "none", background: "var(--danger)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </PremiumShell>
    <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
