"use client";

import React, { useEffect, useMemo, useState } from "react";

type BankItem = {
  id: string;
  question: string;
  bucket?: "behavioral" | "technical" | "culture" | "other";
  role?: string; // optional tag
  favorite?: boolean;
  createdAt: number;
};

type HomeState = {
  jobDesc?: string;
  questions?: string[];
  questionBuckets?: {
    behavioral: string[];
    technical: string[];
    culture: string[];
  } | null;
};

function safeJSONParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uid() {
  // crypto.randomUUID is best, but fall back if needed
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

const LS_BANK_KEY = "ipc_question_bank";
const LS_HOME_KEY = "ipc_home_state";

export default function QuestionBankPage() {
  const [items, setItems] = useState<BankItem[]>([]);
  const [newQ, setNewQ] = useState("");
  const [roleTag, setRoleTag] = useState("");
  const [filter, setFilter] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);
  const [bucketFilter, setBucketFilter] = useState<"all" | BankItem["bucket"]>("all");

  const [homePreview, setHomePreview] = useState<{
    hasGenerated: boolean;
    total: number;
  }>({ hasGenerated: false, total: 0 });

  // Load bank + home preview
  useEffect(() => {
    const bank = safeJSONParse<BankItem[]>(localStorage.getItem(LS_BANK_KEY), []);
    setItems(bank);

    const home = safeJSONParse<HomeState>(localStorage.getItem(LS_HOME_KEY), {});
    const qs = Array.isArray(home.questions) ? home.questions : [];
    const total = qs.length;
    setHomePreview({ hasGenerated: total > 0, total });
  }, []);

  function save(next: BankItem[]) {
    setItems(next);
    try {
      localStorage.setItem(LS_BANK_KEY, JSON.stringify(next));
    } catch {}
  }

  function addManual() {
    const q = newQ.trim();
    if (!q) return;

    const next: BankItem[] = [
      {
        id: uid(),
        question: q,
        bucket: "other",
        role: roleTag.trim() || undefined,
        favorite: false,
        createdAt: Date.now(),
      },
      ...items,
    ];
    save(next);
    setNewQ("");
  }

  function toggleFav(id: string) {
    const next = items.map((x) => (x.id === id ? { ...x, favorite: !x.favorite } : x));
    save(next);
  }

  function removeOne(id: string) {
    const next = items.filter((x) => x.id !== id);
    save(next);
  }

  function clearAll() {
    save([]);
  }

  function importFromLastGenerated() {
    const home = safeJSONParse<HomeState>(localStorage.getItem(LS_HOME_KEY), {});
    const buckets = home.questionBuckets ?? null;

    // Build a map question -> bucket (best effort)
    const bucketMap = new Map<string, BankItem["bucket"]>();
    if (buckets) {
      buckets.behavioral?.forEach((q) => bucketMap.set(String(q), "behavioral"));
      buckets.technical?.forEach((q) => bucketMap.set(String(q), "technical"));
      buckets.culture?.forEach((q) => bucketMap.set(String(q), "culture"));
    }

    const qs = Array.isArray(home.questions) ? home.questions.map(String) : [];
    const unique = Array.from(new Set(qs)).filter(Boolean);

    if (!unique.length) return;

    // Prevent duplicates vs existing
    const existingSet = new Set(items.map((x) => x.question.trim().toLowerCase()));

    const incoming: BankItem[] = unique
      .filter((q) => !existingSet.has(q.trim().toLowerCase()))
      .map((q) => ({
        id: uid(),
        question: q,
        bucket: bucketMap.get(q) ?? "other",
        role: roleTag.trim() || undefined,
        favorite: false,
        createdAt: Date.now(),
      }));

    save([...incoming, ...items]);

    // refresh preview count
    setHomePreview({ hasGenerated: unique.length > 0, total: unique.length });
  }

  function exportJSON() {
    try {
      const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ipc-question-bank.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();

    return items.filter((x) => {
      if (onlyFav && !x.favorite) return false;
      if (bucketFilter !== "all" && x.bucket !== bucketFilter) return false;

      if (!q) return true;

      const hay = `${x.question} ${x.bucket ?? ""} ${x.role ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, filter, onlyFav, bucketFilter]);

  return (
    <div style={{ color: "#E5E7EB", maxWidth: 980 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ fontSize: 28, fontWeight: 950, margin: 0 }}>Question Bank</h1>
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>{items.length} saved</div>
      </div>

      <div style={{ marginTop: 10, color: "#9CA3AF", lineHeight: 1.6 }}>
        Save your best questions, tag them, favorite them, and reuse them across roles.
      </div>

      {/* Import + Add */}
      <div
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={importFromLastGenerated}
            disabled={!homePreview.hasGenerated}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(34,211,238,0.35)",
              background: homePreview.hasGenerated ? "rgba(34,211,238,0.10)" : "rgba(255,255,255,0.04)",
              color: homePreview.hasGenerated ? "#A5F3FC" : "#9CA3AF",
              fontWeight: 900,
              cursor: homePreview.hasGenerated ? "pointer" : "not-allowed",
              fontSize: 13,
            }}
          >
            Import last generated ({homePreview.total || 0})
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>Role tag (optional)</span>
            <input
              value={roleTag}
              onChange={(e) => setRoleTag(e.target.value)}
              placeholder="e.g., Supply Chain Planner"
              style={{
                width: 220,
                padding: "9px 10px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(17,24,39,0.55)",
                color: "#E5E7EB",
                outline: "none",
                fontSize: 13,
              }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
          <input
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            placeholder="Add a custom question…"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(17,24,39,0.55)",
              color: "#E5E7EB",
              outline: "none",
              fontSize: 13,
            }}
          />
          <button
            type="button"
            onClick={addManual}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              color: "#E5E7EB",
              fontWeight: 900,
              cursor: "pointer",
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search questions, tags…"
          style={{
            width: 320,
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(17,24,39,0.55)",
            color: "#E5E7EB",
            outline: "none",
            fontSize: 13,
          }}
        />

        <select
          value={bucketFilter}
          onChange={(e) => setBucketFilter(e.target.value as any)}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(17,24,39,0.55)",
            color: "#E5E7EB",
            outline: "none",
            fontSize: 13,
          }}
        >
          <option value="all">All buckets</option>
          <option value="behavioral">Behavioral</option>
          <option value="technical">Technical</option>
          <option value="culture">Culture</option>
          <option value="other">Other</option>
        </select>

        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#9CA3AF" }}>
          <input type="checkbox" checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)} />
          Favorites only
        </label>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={exportJSON}
            disabled={items.length === 0}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: items.length ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.03)",
              color: items.length ? "#E5E7EB" : "#9CA3AF",
              fontWeight: 900,
              cursor: items.length ? "pointer" : "not-allowed",
              fontSize: 13,
            }}
          >
            Export JSON
          </button>

          <button
            type="button"
            onClick={clearAll}
            disabled={items.length === 0}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(252,165,165,0.35)",
              background: items.length ? "rgba(252,165,165,0.10)" : "rgba(255,255,255,0.03)",
              color: items.length ? "#FCA5A5" : "#9CA3AF",
              fontWeight: 900,
              cursor: items.length ? "pointer" : "not-allowed",
              fontSize: 13,
            }}
          >
            Clear all
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              color: "#9CA3AF",
            }}
          >
            No questions yet. Import from Practice (generate questions), or add one manually.
          </div>
        ) : (
          filtered.map((x) => (
            <div
              key={x.id}
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1.5 }}>{x.question}</div>

                  <div style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF", display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>
                      {x.bucket ?? "other"}
                    </span>
                    {x.role ? (
                      <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.10)" }}>
                        {x.role}
                      </span>
                    ) : null}
                    <span>
                      {new Date(x.createdAt).toLocaleDateString()} ·{" "}
                      {new Date(x.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => toggleFav(x.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: x.favorite
                        ? "1px solid rgba(34,211,238,0.45)"
                        : "1px solid rgba(255,255,255,0.10)",
                      background: x.favorite ? "rgba(34,211,238,0.10)" : "rgba(255,255,255,0.04)",
                      color: x.favorite ? "#A5F3FC" : "#E5E7EB",
                      fontWeight: 900,
                      cursor: "pointer",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {x.favorite ? "★ Saved" : "☆ Save"}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeOne(x.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(252,165,165,0.35)",
                      background: "rgba(252,165,165,0.10)",
                      color: "#FCA5A5",
                      fontWeight: 900,
                      cursor: "pointer",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
