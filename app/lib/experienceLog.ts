/**
 * Experience Log — persists career stories a user can practice and reuse.
 *
 * Each entry maps to one "hero story" the user draws on across interviews and
 * performance reviews. Stored in localStorage per user (same pattern as habits/goals).
 */

export type ExperienceEntry = {
  id: string;
  title: string;              // "Led migration from legacy ERP to SAP"
  company?: string;
  roleAtTime?: string;        // their title when this happened
  timeframe?: string;         // "Q3 2023", "Summer 2022", free text
  skills: string[];           // tags: ["stakeholder mgmt", "SQL", "change mgmt"]

  // STAR fields — all optional so users can fill incrementally
  situation?: string;
  task?: string;
  action?: string;
  result?: string;

  notes?: string;

  // Practice tracking
  practiceCount: number;
  bestScore: number | null;
  lastPracticed: number | null;    // timestamp
  linkedAttemptIds: string[];      // attempt IDs from the practice page

  createdAt: number;               // timestamp
  updatedAt: number;
};

const BASE_KEY = "ipc_experience_log_v1";

function scopedKey(session: any): string {
  const id = session?.user?.id;
  const email = session?.user?.email;
  const scope = (id || email || "anon").toString();
  return `${BASE_KEY}::${scope}`;
}

export function loadExperiences(session: any): ExperienceEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(scopedKey(session));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveExperiences(session: any, entries: ExperienceEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(scopedKey(session), JSON.stringify(entries));
  } catch {
    // storage full or unavailable
  }
}

export function addExperience(session: any, entry: Omit<ExperienceEntry, "id" | "createdAt" | "updatedAt" | "practiceCount" | "bestScore" | "lastPracticed" | "linkedAttemptIds">): ExperienceEntry {
  const entries = loadExperiences(session);
  const now = Date.now();
  const newEntry: ExperienceEntry = {
    ...entry,
    id: `exp_${now}_${Math.random().toString(36).slice(2, 7)}`,
    practiceCount: 0,
    bestScore: null,
    lastPracticed: null,
    linkedAttemptIds: [],
    createdAt: now,
    updatedAt: now,
  };
  saveExperiences(session, [...entries, newEntry]);
  return newEntry;
}

export function updateExperience(session: any, id: string, patch: Partial<ExperienceEntry>): void {
  const entries = loadExperiences(session);
  const updated = entries.map(e => e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e);
  saveExperiences(session, updated);
}

export function deleteExperience(session: any, id: string): void {
  const entries = loadExperiences(session);
  saveExperiences(session, entries.filter(e => e.id !== id));
}

/** Called from results page when a user wants to save a strong answer as an experience. */
export function recordPracticeAttempt(
  session: any,
  entryId: string,
  attemptId: string,
  score: number | null,
): void {
  const entries = loadExperiences(session);
  const entry = entries.find(e => e.id === entryId);
  if (!entry) return;

  const updatedEntry: ExperienceEntry = {
    ...entry,
    practiceCount: entry.practiceCount + 1,
    bestScore: score !== null ? (entry.bestScore === null ? score : Math.max(entry.bestScore, score)) : entry.bestScore,
    lastPracticed: Date.now(),
    linkedAttemptIds: [...entry.linkedAttemptIds, attemptId],
    updatedAt: Date.now(),
  };

  saveExperiences(session, entries.map(e => e.id === entryId ? updatedEntry : e));
}

/** Returns a STAR completeness score 0–4 (one point per filled field). */
export function starCompleteness(entry: ExperienceEntry): number {
  return [entry.situation, entry.task, entry.action, entry.result].filter(Boolean).length;
}
