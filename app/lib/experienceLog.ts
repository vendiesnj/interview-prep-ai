/**
 * Experience Log — persists career stories a user can practice and reuse.
 *
 * Each entry maps to one "hero story" the user draws on across interviews and
 * performance reviews. Stored in localStorage per user (same pattern as habits/goals).
 */

export type QuestionCategory =
  | "leadership"
  | "conflict"
  | "achievement"
  | "teamwork"
  | "problem_solving"
  | "failure"
  | "initiative"
  | "communication"
  | "adaptability"
  | "prioritization";

export const QUESTION_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  leadership:      "Leadership & Influence",
  conflict:        "Conflict Resolution",
  achievement:     "Achievement & Impact",
  teamwork:        "Teamwork & Collaboration",
  problem_solving: "Problem Solving",
  failure:         "Failure & Learning",
  initiative:      "Initiative & Drive",
  communication:   "Communication",
  adaptability:    "Adaptability & Change",
  prioritization:  "Prioritization",
};

/** Approximate % of senior interviews that include this category */
export const CATEGORY_FREQUENCY: Record<QuestionCategory, number> = {
  leadership:      85,
  conflict:        75,
  achievement:     90,
  teamwork:        80,
  problem_solving: 70,
  failure:         65,
  initiative:      60,
  communication:   55,
  adaptability:    60,
  prioritization:  55,
};

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

  // Auto-derived tags (set on save)
  questionTags?: QuestionCategory[];
  strengthScore?: number | null; // 0–100, computed from specificity/impact/evidence

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

// ── Auto-tagging ──────────────────────────────────────────────────────────────

const CATEGORY_SIGNALS: Record<QuestionCategory, RegExp> = {
  leadership: /\b(lead|led|manag|direct|drove|spearhead|oversee|owned|championed|mentor|coached|delegat|VP|director|head of|team of|report)/i,
  conflict:   /\b(conflict|disagree|tension|push.?back|resistant|difficult person|friction|challenge\w* colleague|escalat|mediat|resolv\w* issue|competing priorities)/i,
  achievement:/\b(achiev|accomplish|result|impact|grew|increased|reduced|saved|revenue|cost|metric|KPI|percent|%|\$\d|\d+x|delivered|exceeded|award|recogni)/i,
  teamwork:   /\b(team|collaborat|partner|cross.?functional|together|with (the|my|our) team|peer|colleague|coordinated|aligned|worked with)/i,
  problem_solving: /\b(problem|solution|solved|debug|root cause|analyze|diagnose|unknown|investigat|figured out|discovered|complex|challenge\w* (system|process|technical))/i,
  failure:    /\b(fail|mistake|wrong|error|didn.t work|setback|miss\w* (deadline|goal|target)|learned|hindsight|would have done|regret|pivot\w+ after)/i,
  initiative: /\b(initiated|started|launched|built|created|proposed|without being asked|proactive|volunteered|new idea|side project|beyond (my|the) role)/i,
  communication: /\b(present|communicated|explained|stakeholder|executive|C.?suite|board|wrote|report\w+ to|briefed|trained|facilitated|workshop)/i,
  adaptability:  /\b(change|pivot|adapt|shifted|new (direction|priority|system|process)|reorg|restructur|ambiguous|uncertain|unclear requirement|moving target)/i,
  prioritization:/\b(prioritize|deadline|juggling|multiple projects|competing demands|time.?constrained|limited resources|trade.?off|chose to focus|urgent)/i,
};

/** Derive question category tags from story content. */
export function autoTagEntry(entry: ExperienceEntry): QuestionCategory[] {
  const text = [entry.title, entry.situation, entry.task, entry.action, entry.result, entry.notes].filter(Boolean).join(" ");
  const tags: QuestionCategory[] = [];
  for (const [cat, re] of Object.entries(CATEGORY_SIGNALS) as [QuestionCategory, RegExp][]) {
    if (re.test(text)) tags.push(cat);
  }
  return tags;
}

// ── Strength scoring ──────────────────────────────────────────────────────────

/** Score a story's strength 0–100 based on specificity, impact evidence, and completeness. */
export function computeStrengthScore(entry: ExperienceEntry): number {
  let score = 0;
  const fullText = [entry.situation, entry.task, entry.action, entry.result].filter(Boolean).join(" ");

  // STAR completeness (max 30)
  const completion = starCompleteness(entry);
  score += completion * 7.5;

  // Quantified result: numbers, %, $, Nx multipliers (max 25)
  const hasNumbers = /\d+%|\$\d|\d+x|\b\d{2,}\b/.test(entry.result ?? "");
  const hasImpactWord = /\b(increas|decreas|reduc|grew|saved|revenue|cost|metric|KPI|outcome|impact)\b/i.test(entry.result ?? "");
  if (hasNumbers) score += 20;
  else if (hasImpactWord) score += 10;

  // Action specificity: concrete verbs (max 20)
  const actionWords = (entry.action ?? "").match(/\b(implement|design|build|analyz|negotiat|present|lead|coached|facilitat|written|automated|created|resolved)\w*/gi) ?? [];
  score += Math.min(actionWords.length * 4, 20);

  // Story length depth — longer = more detailed (max 15)
  const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount >= 150) score += 15;
  else if (wordCount >= 80) score += 10;
  else if (wordCount >= 40) score += 5;

  // Has a clear lesson or ownership in result/action (max 10)
  const hasOwnership = /\b(I |my |directly )\w/i.test(entry.action ?? "");
  if (hasOwnership) score += 10;

  return Math.min(Math.round(score), 100);
}

// ── Gap detection ─────────────────────────────────────────────────────────────

export type StoryGap = {
  category: QuestionCategory;
  label: string;
  frequency: number;   // % of interviews that include this category
  hasCoverage: boolean;
  storiesCount: number;
  strongCount: number; // stories with strengthScore >= 60
};

/** Return gap analysis — which question categories need stronger stories. */
export function detectStoryGaps(entries: ExperienceEntry[]): StoryGap[] {
  const categories = Object.keys(QUESTION_CATEGORY_LABELS) as QuestionCategory[];
  return categories
    .map(cat => {
      const covered = entries.filter(e => e.questionTags?.includes(cat) ?? false);
      const strong = covered.filter(e => (e.strengthScore ?? 0) >= 60);
      return {
        category: cat,
        label: QUESTION_CATEGORY_LABELS[cat],
        frequency: CATEGORY_FREQUENCY[cat],
        hasCoverage: covered.length > 0,
        storiesCount: covered.length,
        strongCount: strong.length,
      };
    })
    .sort((a, b) => {
      // Sort: gaps first (no coverage), then weak coverage, by frequency descending
      const aStrong = a.strongCount > 0;
      const bStrong = b.strongCount > 0;
      if (aStrong !== bStrong) return aStrong ? 1 : -1;
      return b.frequency - a.frequency;
    });
}
