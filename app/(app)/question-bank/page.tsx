"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PremiumShell from "@/app/components/PremiumShell";
import PremiumCard from "@/app/components/PremiumCard";
import { userScopedKey } from "@/app/lib/userStorage";
import {
  getActiveJobProfileId,
  type JobProfile,
} from "@/app/lib/jobProfiles";

type BankItem = {
  id: string;
  question: string;
  bucket?: "behavioral" | "technical" | "role_specific" | "custom" | "other";

  role?: string; // legacy fallback

  jobProfileId?: string | null;
  jobProfileTitle?: string | null;
  jobProfileCompany?: string | null;
  jobProfileRoleType?: string | null;

  favorite?: boolean;
  createdAt: number;
};

type HomeState = {
  jobDesc?: string;
  questions?: string[];
  questionBuckets?: {
    behavioral: string[];
    technical: string[];
    role_specific: string[];
    custom?: string[];
  } | null;
  selectedQuestion?: string;
  mode?: "setup" | "questions" | "answer";
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
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

export default function QuestionBankPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const BANK_KEY = userScopedKey("ipc_question_bank", session);
  const HOME_KEY = userScopedKey("ipc_home_state", session);

  const BANK_FALLBACK_KEY = "ipc_question_bank";
  const HOME_FALLBACK_KEY = "ipc_home_state";

  const [items, setItems] = useState<BankItem[]>([]);
  const [newQ, setNewQ] = useState("");
  const [roleTag, setRoleTag] = useState("");
  const [filter, setFilter] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);
  const [bucketFilter, setBucketFilter] = useState<"all" | BankItem["bucket"]>("all");

  const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([]);
  const [activeJobProfile, setActiveJobProfile] = useState<JobProfile | null>(null);
const [jobProfileFilter, setJobProfileFilter] = useState<string>("all");

  const [homePreview, setHomePreview] = useState<{
    hasGenerated: boolean;
    total: number;
  }>({ hasGenerated: false, total: 0 });

useEffect(() => {
  async function hydrate() {
    const bankRaw =
      localStorage.getItem(BANK_KEY) ||
      localStorage.getItem(BANK_FALLBACK_KEY);

    const bank = safeJSONParse<BankItem[]>(bankRaw, []);
    setItems(bank);

    const homeRaw =
      localStorage.getItem(HOME_KEY) ||
      localStorage.getItem(HOME_FALLBACK_KEY);

    const home = safeJSONParse<HomeState>(homeRaw, {});
    const qs = Array.isArray(home.questions) ? home.questions : [];
    const total = qs.length;
    setHomePreview({ hasGenerated: total > 0, total });

    try {
      const activeId = getActiveJobProfileId();

      const res = await fetch("/api/job-profiles", { cache: "no-store" });
      const json = await res.json();

      const profiles = Array.isArray(json?.profiles) ? json.profiles : [];
      setJobProfiles(profiles);

      const active =
        activeId ? profiles.find((p: JobProfile) => p.id === activeId) ?? null : null;

      setActiveJobProfile(active);
    } catch {
      setJobProfiles([]);
      setActiveJobProfile(null);
    }
  }

  void hydrate();
}, [BANK_KEY, HOME_KEY]);



  function save(next: BankItem[]) {
    setItems(next);

    try {
      const json = JSON.stringify(next);
      localStorage.setItem(BANK_FALLBACK_KEY, json);
      localStorage.setItem(BANK_KEY, json);
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

  role: roleTag.trim() || activeJobProfile?.title || undefined,

  jobProfileId: activeJobProfile?.id ?? null,
  jobProfileTitle: activeJobProfile?.title ?? null,
  jobProfileCompany: activeJobProfile?.company ?? null,
  jobProfileRoleType: activeJobProfile?.roleType ?? null,

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
    const homeRaw =
      localStorage.getItem(HOME_KEY) ||
      localStorage.getItem(HOME_FALLBACK_KEY);

    const home = safeJSONParse<HomeState>(homeRaw, {});
    const buckets = home.questionBuckets ?? null;

    const bucketMap = new Map<string, BankItem["bucket"]>();
    if (buckets) {
      buckets.behavioral?.forEach((q) => bucketMap.set(String(q), "behavioral"));
      buckets.technical?.forEach((q) => bucketMap.set(String(q), "technical"));
      buckets.role_specific?.forEach((q) => bucketMap.set(String(q), "role_specific"));
      buckets.custom?.forEach((q) => bucketMap.set(String(q), "custom"));
    }

    const qs = Array.isArray(home.questions) ? home.questions.map(String) : [];
    const unique = Array.from(new Set(qs)).filter(Boolean);

    if (!unique.length) return;

    const existingSet = new Set(items.map((x) => x.question.trim().toLowerCase()));

    const incoming: BankItem[] = unique
      .filter((q) => !existingSet.has(q.trim().toLowerCase()))
      .map((q) => ({
  id: uid(),
  question: q,
  bucket: bucketMap.get(q) ?? "other",

  role: roleTag.trim() || activeJobProfile?.title || undefined,

  jobProfileId: activeJobProfile?.id ?? null,
  jobProfileTitle: activeJobProfile?.title ?? null,
  jobProfileCompany: activeJobProfile?.company ?? null,
  jobProfileRoleType: activeJobProfile?.roleType ?? null,

  favorite: false,
  createdAt: Date.now(),
}));

        save([...incoming, ...items]);
    setHomePreview({ hasGenerated: unique.length > 0, total: unique.length });
  }

  function backfillMissingRoleTagsFromActiveProfile() {
  if (!activeJobProfile) return;

  let changed = false;

  const next = items.map((item) => {
    const hasProfileMeta =
      !!item.jobProfileId ||
      !!item.jobProfileTitle ||
      !!item.jobProfileCompany ||
      !!item.jobProfileRoleType ||
      !!item.role;

    if (hasProfileMeta) return item;

    changed = true;

    return {
      ...item,
      role: activeJobProfile.title || undefined,
      jobProfileId: activeJobProfile.id ?? null,
      jobProfileTitle: activeJobProfile.title ?? null,
      jobProfileCompany: activeJobProfile.company ?? null,
      jobProfileRoleType: activeJobProfile.roleType ?? null,
    };
  });

  if (!changed) return;
  save(next);
}

  function exportJSON() {
    try {
      const blob = new Blob([JSON.stringify(items, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ipc-question-bank.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

    function practiceQuestion(item: BankItem) {
    try {
      const homeRaw =
        localStorage.getItem(HOME_KEY) ||
        localStorage.getItem(HOME_FALLBACK_KEY);

      const prev = safeJSONParse<HomeState>(homeRaw, {});

      const nextHome: HomeState = {
        ...prev,
        selectedQuestion: item.question,
        mode: "answer",
      };

      const json = JSON.stringify(nextHome);

      localStorage.setItem(HOME_FALLBACK_KEY, json);
      localStorage.setItem(HOME_KEY, json);
    } catch {}

    router.push("/practice");
  }


 function matchesJobProfileFilter(item: BankItem) {
  if (jobProfileFilter === "all") return true;

  if (item.jobProfileId && item.jobProfileId === jobProfileFilter) {
    return true;
  }

  const selectedProfile = jobProfiles.find((p) => p.id === jobProfileFilter);
  if (!selectedProfile) return true;

  const roleText = (item.jobProfileTitle || item.role || "").trim().toLowerCase();
  if (!roleText) return false;

  const candidates = [
    selectedProfile.title,
    selectedProfile.company ?? "",
    selectedProfile.roleType ?? "",
  ]
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

  return candidates.some((c) => roleText.includes(c) || c.includes(roleText));
}

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();

    return items.filter((x) => {
  if (onlyFav && !x.favorite) return false;
  if (bucketFilter !== "all" && x.bucket !== bucketFilter) return false;
  if (!matchesJobProfileFilter(x)) return false;

  if (!q) return true;

  const hay = `${x.question} ${x.bucket ?? ""} ${x.role ?? ""}`.toLowerCase();
  return hay.includes(q);
});
  }, [items, filter, onlyFav, bucketFilter, jobProfileFilter, jobProfiles]);

  return (
    <PremiumShell
      title="Question Bank"
      subtitle="Save strong interview questions, organize them by type, and launch directly into practice."
    >
      <div style={{ display: "grid", gap: 16 }}>
        <PremiumCard>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Build your question library
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                Import questions from Practice, add your own, and reuse them for future interview sessions.
              </div>
            </div>

            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {items.length} saved
            </div>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {/* Primary action: add custom question */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8 }}>
              <input
                value={newQ}
                onChange={(e) => setNewQ(e.target.value)}
                placeholder="Add a custom question…"
                style={{
                  padding: "8px 11px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--card-border-soft)",
                  background: "var(--card-bg-strong)",
                  color: "var(--text-primary)",
                  outline: "none",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={addManual}
                style={{
                  padding: "9px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 13,
                  whiteSpace: "nowrap",
                }}
              >
                Add question
              </button>
            </div>

            {/* Secondary actions row */}
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={importFromLastGenerated}
                disabled={!homePreview.hasGenerated}
                style={{
                  padding: 0,
                  border: "none",
                  background: "none",
                  color: homePreview.hasGenerated ? "var(--accent)" : "var(--text-soft)",
                  fontWeight: 700,
                  cursor: homePreview.hasGenerated ? "pointer" : "not-allowed",
                  fontSize: 12,
                }}
              >
                ↓ Import last generated ({homePreview.total || 0})
              </button>

              <span style={{ color: "var(--card-border)", fontSize: 12 }}>·</span>

              <button
                type="button"
                onClick={backfillMissingRoleTagsFromActiveProfile}
                disabled={!activeJobProfile || items.length === 0}
                style={{
                  padding: 0,
                  border: "none",
                  background: "none",
                  color: activeJobProfile && items.length > 0 ? "var(--text-muted)" : "var(--text-soft)",
                  fontWeight: 700,
                  cursor: activeJobProfile && items.length > 0 ? "pointer" : "not-allowed",
                  fontSize: 12,
                }}
              >
                Backfill role tags
              </button>

              {activeJobProfile && (
                <>
                  <span style={{ color: "var(--card-border)", fontSize: 12 }}>·</span>
                  <span style={{ fontSize: 12, color: "var(--text-soft)" }}>
                    Tagged:{" "}
                    <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                      {activeJobProfile.title}{activeJobProfile.company ? ` · ${activeJobProfile.company}` : ""}
                    </span>
                  </span>
                </>
              )}

              {!activeJobProfile && (
                <input
                  value={roleTag}
                  onChange={(e) => setRoleTag(e.target.value)}
                  placeholder="Role tag (e.g. Supply Chain Planner)"
                  style={{
                    flex: 1,
                    minWidth: 180,
                    padding: "6px 10px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--card-border-soft)",
                    background: "var(--card-bg-strong)",
                    color: "var(--text-primary)",
                    outline: "none",
                    fontSize: 12,
                    boxSizing: "border-box",
                  }}
                />
              )}
            </div>
          </div>
        </PremiumCard>

        <PremiumCard>
          <div
  style={{
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  }}
>
  <input
    value={filter}
    onChange={(e) => setFilter(e.target.value)}
    placeholder="Search questions, tags…"
    style={{
      width: 320,
      padding: "8px 11px",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--card-border-soft)",
      background: "var(--card-bg-strong)",
      color: "var(--text-primary)",
      outline: "none",
      fontSize: 13,
      boxSizing: "border-box",
    }}
  />

  <select
    value={bucketFilter}
    onChange={(e) => setBucketFilter(e.target.value as any)}
    style={{
      padding: "8px 11px",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--card-border-soft)",
      background: "var(--card-bg-strong)",
      color: "var(--text-primary)",
      outline: "none",
      fontSize: 13,
    }}
  >
    <option value="all">All buckets</option>
    <option value="behavioral">Behavioral</option>
    <option value="technical">Technical</option>
    <option value="role_specific">Role-Specific</option>
    <option value="custom">Custom</option>
    <option value="other">Other</option>
  </select>

  <select
    value={jobProfileFilter}
    onChange={(e) => setJobProfileFilter(e.target.value)}
    style={{
      padding: "8px 11px",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--card-border-soft)",
      background: "var(--card-bg-strong)",
      color: "var(--text-primary)",
      outline: "none",
      fontSize: 13,
    }}
  >
    <option value="all">All job profiles</option>
    {jobProfiles.map((profile) => (
      <option key={profile.id} value={profile.id}>
        {profile.title}
        {profile.company ? ` · ${profile.company}` : ""}
      </option>
    ))}
  </select>

  <label
    style={{
      display: "flex",
      gap: 8,
      alignItems: "center",
      fontSize: 13,
      color: "var(--text-muted)",
    }}
  >
    <input
      type="checkbox"
      checked={onlyFav}
      onChange={(e) => setOnlyFav(e.target.checked)}
    />
    Favorites only
  </label>

  <div
    style={{
      marginLeft: "auto",
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
    }}
  >
    <button
      type="button"
      onClick={exportJSON}
      disabled={items.length === 0}
      style={{
        padding: "8px 11px",
        borderRadius: "var(--radius-md)",
        border: "none",
        background: "transparent",
        color: "var(--text-muted)",
        fontWeight: 500,
        cursor: items.length ? "pointer" : "not-allowed",
        fontSize: 13,
        /* hover: color var(--text-primary) */
      }}
    >
      Export JSON
    </button>

    <button
      type="button"
      onClick={clearAll}
      disabled={items.length === 0}
      style={{
        padding: "8px 11px",
        borderRadius: "var(--radius-md)",
        border: "none",
        background: items.length ? "var(--danger-soft)" : "transparent",
        color: items.length ? "var(--danger)" : "var(--text-muted)",
        fontWeight: 500,
        cursor: items.length ? "pointer" : "not-allowed",
        fontSize: 13,
      }}
    >
      Clear all
    </button>
  </div>
</div>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: 14,
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--card-border-soft)",
                  background: "var(--card-bg)",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                {items.length === 0
  ? "No questions yet. Import from Practice, or add one manually."
  : "No questions match your current filters."}
              </div>
            ) : (
              filtered.map((x) => (
                <div
                  key={x.id}
                  style={{
                    padding: 14,
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--card-border-soft)",
                    background: "var(--card-bg)",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          lineHeight: 1.55,
                          color: "var(--text-primary)",
                        }}
                      >
                        {x.question}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          color: "var(--text-muted)",
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "var(--radius-sm)",
                            border: "none",
                            background: "var(--card-bg-strong)",
                          }}
                        >
                          {x.bucket ?? "other"}
                        </span>

                        {x.jobProfileTitle || x.role ? (
  <span
    style={{
      padding: "3px 8px",
      borderRadius: "var(--radius-sm)",
      border: "none",
      background: "var(--card-bg-strong)",
    }}
  >
    {x.jobProfileTitle || x.role}
  </span>
) : null}

                        <span>
                          {new Date(x.createdAt).toLocaleDateString()} ·{" "}
                          {new Date(x.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => practiceQuestion(x)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "var(--radius-sm)",
                          border: "none",
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        Practice →
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFav(x.id)}
                        title={x.favorite ? "Unsave" : "Save"}
                        style={{
                          padding: "4px 6px",
                          borderRadius: "var(--radius-sm)",
                          border: "none",
                          background: "none",
                          color: x.favorite ? "var(--accent)" : "var(--text-soft)",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontSize: 16,
                          lineHeight: 1,
                        }}
                      >
                        {x.favorite ? "★" : "☆"}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeOne(x.id)}
                        style={{
                          marginLeft: "auto",
                          padding: "4px 8px",
                          borderRadius: "var(--radius-sm)",
                          border: "none",
                          background: "none",
                          color: "var(--text-soft)",
                          fontWeight: 700,
                          cursor: "pointer",
                          fontSize: 11,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </PremiumCard>
      </div>
    </PremiumShell>
  );
}