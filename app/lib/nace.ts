/**
 * NACE Career Readiness Competency Framework
 * https://www.naceweb.org/career-readiness/competencies/
 *
 * Maps Signal's existing scores to the 8 NACE competencies.
 * All output scores are 0–100.
 */

export type NaceKey =
  | "career_dev"
  | "communication"
  | "critical_thinking"
  | "equity_inclusion"
  | "leadership"
  | "professionalism"
  | "teamwork"
  | "technology";

export type NaceScore = {
  key: NaceKey;
  label: string;
  shortLabel: string;
  description: string;
  score: number | null; // 0–100, null = insufficient data
  evidenceSources: string[]; // what Signal data contributed
};

export const NACE_META: Record<NaceKey, { label: string; shortLabel: string; description: string }> = {
  career_dev: {
    label: "Career & Self-Development",
    shortLabel: "Career Dev",
    description:
      "Proactively developing oneself and one's career through continuous learning and self-awareness.",
  },
  communication: {
    label: "Communication",
    shortLabel: "Communication",
    description:
      "Clearly and effectively exchanging information, ideas, and perspectives with individuals and groups.",
  },
  critical_thinking: {
    label: "Critical Thinking",
    shortLabel: "Critical Thinking",
    description:
      "Identifying and responding to needs based on an understanding of situational context and logical analysis.",
  },
  equity_inclusion: {
    label: "Equity & Inclusion",
    shortLabel: "Equity & Inclusion",
    description:
      "Demonstrating the awareness, attitude, knowledge, and skills required to equitably engage and include people from different backgrounds.",
  },
  leadership: {
    label: "Leadership",
    shortLabel: "Leadership",
    description:
      "Recognizing and capitalizing on personal and team strengths to achieve organizational goals.",
  },
  professionalism: {
    label: "Professionalism",
    shortLabel: "Professionalism",
    description:
      "Knowing work environments differ greatly, and understanding and demonstrating effective work habits.",
  },
  teamwork: {
    label: "Teamwork",
    shortLabel: "Teamwork",
    description:
      "Building and maintaining collaborative relationships to work effectively toward common goals.",
  },
  technology: {
    label: "Technology",
    shortLabel: "Technology",
    description:
      "Understanding and leveraging technologies ethically to enhance efficiencies, complete tasks, and accomplish goals.",
  },
};

// ── Input types ──────────────────────────────────────────────────────────────

export type NaceAttemptInput = {
  score?: number | null;            // overall 0–100
  communicationScore?: number | null; // 0–10
  confidenceScore?: number | null;    // 0–10
  wpm?: number | null;
  feedback?: {
    star?: {
      situation?: number;
      task?: number;
      action?: number;
      result?: number;
    };
    filler?: { per100?: number };
    fillersPer100?: number;
  } | null;
  prosody?: { monotoneScore?: number } | null;
  deliveryMetrics?: {
    fillersPer100?: number;
    acoustics?: { monotoneScore?: number };
  } | null;
  questionCategory?: string | null;
};

export type NaceProfileInput = {
  attempts: NaceAttemptInput[];
  aptitudeScores?: Partial<Record<"A" | "B" | "C" | "H" | "L" | "M", number>> | null;
  hasCompletedAptitude?: boolean;
  hasCompletedCareerCheckIn?: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function n(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function avg(vals: number[]): number | null {
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Convert a 0–10 score to 0–100 */
function to100(v: number | null): number | null {
  if (v === null) return null;
  return clamp(v * 10);
}

/** Score WPM quality: 115–145 = 100, deviation reduces score */
function wpmScore(wpm: number): number {
  const ideal = 130;
  const dev = Math.abs(wpm - ideal);
  return clamp(100 - dev * 1.2);
}

/** Score filler rate: 0 fillers/100 = 100, >6 = 0 */
function fillerScore(per100: number): number {
  return clamp(100 - per100 * 16.7);
}

/** Score monotone: 0 = expressive (100), 10 = flat (0) */
function monotoneScore(score: number): number {
  return clamp(100 - score * 10);
}

function getFillers(a: NaceAttemptInput): number | null {
  return (
    n(a.feedback?.filler?.per100) ??
    n(a.feedback?.fillersPer100) ??
    n(a.deliveryMetrics?.fillersPer100) ??
    null
  );
}

function getMonotone(a: NaceAttemptInput): number | null {
  return (
    n(a.prosody?.monotoneScore) ??
    n(a.deliveryMetrics?.acoustics?.monotoneScore) ??
    null
  );
}

function starAvg(a: NaceAttemptInput): number | null {
  const s = a.feedback?.star;
  if (!s) return null;
  const vals = [n(s.situation), n(s.task), n(s.action), n(s.result)].filter(
    (v): v is number => v !== null
  );
  return avg(vals);
}

// ── Per-attempt NACE computation ─────────────────────────────────────────────

export function computeNaceForAttempt(a: NaceAttemptInput): Partial<Record<NaceKey, number>> {
  const comm10 = n(a.communicationScore);
  const conf10 = n(a.confidenceScore);
  const overall = n(a.score);
  const wpm = n(a.wpm);
  const fillers = getFillers(a);
  const monotone = getMonotone(a);
  const star = a.feedback?.star;
  const starA = starAvg(a);
  const isTechCat =
    typeof a.questionCategory === "string" &&
    (a.questionCategory.toLowerCase().includes("tech") ||
      a.questionCategory.toLowerCase().includes("software") ||
      a.questionCategory.toLowerCase().includes("data"));
  const isTeamCat =
    typeof a.questionCategory === "string" &&
    (a.questionCategory.toLowerCase().includes("team") ||
      a.questionCategory.toLowerCase().includes("collaborat") ||
      a.questionCategory.toLowerCase().includes("conflict"));

  const out: Partial<Record<NaceKey, number>> = {};

  // ── Communication ──
  {
    const parts: number[] = [];
    if (comm10 !== null) parts.push(clamp(comm10 * 10) * 0.5);
    if (wpm !== null) parts.push(wpmScore(wpm) * 0.2);
    if (fillers !== null) parts.push(fillerScore(fillers) * 0.15);
    if (monotone !== null) parts.push(monotoneScore(monotone) * 0.15);
    if (starA !== null && !parts.length) parts.push(clamp(starA * 10));
    if (parts.length) out.communication = clamp(parts.reduce((a, b) => a + b, 0) * (1 / parts.reduce((_, __, ___, arr) => {
      // normalize weights actually present
      let w = 0;
      if (comm10 !== null) w += 0.5;
      if (wpm !== null) w += 0.2;
      if (fillers !== null) w += 0.15;
      if (monotone !== null) w += 0.15;
      return w || 1;
    }, 0)));
  }

  // ── Critical Thinking ──
  {
    const parts: number[] = [];
    const weights: number[] = [];
    if (star?.situation !== null && star?.situation !== undefined) {
      parts.push(clamp((n(star.situation) ?? 0) * 10)); weights.push(0.3);
    }
    if (star?.task !== null && star?.task !== undefined) {
      parts.push(clamp((n(star.task) ?? 0) * 10)); weights.push(0.3);
    }
    if (overall !== null) {
      parts.push(clamp(overall)); weights.push(0.4);
    }
    if (parts.length) {
      const totalW = weights.reduce((a, b) => a + b, 0);
      out.critical_thinking = clamp(
        parts.reduce((acc, v, i) => acc + v * weights[i], 0) / totalW
      );
    }
  }

  // ── Professionalism ──
  {
    const parts: number[] = [];
    const weights: number[] = [];
    if (conf10 !== null) { parts.push(clamp(conf10 * 10)); weights.push(0.6); }
    if (fillers !== null) { parts.push(fillerScore(fillers)); weights.push(0.25); }
    if (wpm !== null) { parts.push(wpmScore(wpm)); weights.push(0.15); }
    if (parts.length) {
      const totalW = weights.reduce((a, b) => a + b, 0);
      out.professionalism = clamp(
        parts.reduce((acc, v, i) => acc + v * weights[i], 0) / totalW
      );
    }
  }

  // ── Career & Self-Development ── (attempt-level: STAR result quality)
  {
    if (star?.result !== null && star?.result !== undefined) {
      out.career_dev = clamp((n(star.result) ?? 0) * 10);
    } else if (overall !== null) {
      out.career_dev = clamp(overall * 0.8); // weaker signal
    }
  }

  // ── Leadership ── (STAR action = initiative/decision-making)
  {
    if (star?.action !== null && star?.action !== undefined) {
      out.leadership = clamp((n(star.action) ?? 0) * 10);
    }
  }

  // ── Teamwork ── (from teamwork-category questions)
  {
    if (isTeamCat && overall !== null) {
      out.teamwork = clamp(overall);
    } else if (starA !== null) {
      out.teamwork = clamp(starA * 10 * 0.7); // weaker signal
    }
  }

  // ── Technology ── (from technical-category questions)
  {
    if (isTechCat && overall !== null) {
      out.technology = clamp(overall);
    }
  }

  return out;
}

// ── Profile-level aggregation ────────────────────────────────────────────────

export function computeNaceProfile(input: NaceProfileInput): NaceScore[] {
  const { attempts, aptitudeScores, hasCompletedAptitude, hasCompletedCareerCheckIn } = input;

  // Aggregate per-competency scores across attempts
  const buckets: Record<NaceKey, number[]> = {
    career_dev: [],
    communication: [],
    critical_thinking: [],
    equity_inclusion: [],
    leadership: [],
    professionalism: [],
    teamwork: [],
    technology: [],
  };

  for (const a of attempts) {
    const scores = computeNaceForAttempt(a);
    for (const [key, val] of Object.entries(scores)) {
      if (val !== undefined) buckets[key as NaceKey].push(val);
    }
  }

  // Boost career_dev from profile completion signals
  const careerDevBoosts: number[] = [...buckets.career_dev];
  if (hasCompletedAptitude) careerDevBoosts.push(85);
  if (hasCompletedCareerCheckIn) careerDevBoosts.push(80);

  // Boost leadership/teamwork from aptitude
  if (aptitudeScores) {
    const totalApt = Object.values(aptitudeScores).reduce((a, b) => (a ?? 0) + (b ?? 0), 0) ?? 1;
    if (aptitudeScores.L) {
      buckets.leadership.push(clamp((aptitudeScores.L / totalApt) * 200));
    }
    if (aptitudeScores.H) {
      buckets.teamwork.push(clamp((aptitudeScores.H / totalApt) * 200));
    }
  }

  const keys: NaceKey[] = [
    "career_dev",
    "communication",
    "critical_thinking",
    "equity_inclusion",
    "leadership",
    "professionalism",
    "teamwork",
    "technology",
  ];

  return keys.map((key) => {
    const vals = key === "career_dev" ? careerDevBoosts : buckets[key];
    const score = avg(vals);
    const meta = NACE_META[key];

    const sources: string[] = [];
    if (key === "communication") sources.push("Communication score", "WPM", "Filler rate", "Vocal delivery");
    if (key === "critical_thinking") sources.push("STAR situation/task", "Overall score");
    if (key === "professionalism") sources.push("Confidence score", "Filler rate", "Pacing");
    if (key === "career_dev") sources.push("STAR results", "Aptitude quiz", "Career check-in");
    if (key === "leadership") sources.push("STAR action", "Aptitude assessment");
    if (key === "teamwork") sources.push("Teamwork question performance", "Aptitude assessment");
    if (key === "technology") sources.push("Technical question performance");
    if (key === "equity_inclusion") sources.push("Insufficient data — not directly measurable");

    return {
      key,
      label: meta.label,
      shortLabel: meta.shortLabel,
      description: meta.description,
      score: score !== null ? Math.round(score) : null,
      evidenceSources: sources,
    };
  });
}

// ── Cohort aggregation (for admin) ───────────────────────────────────────────

export function computeNaceCohortAverages(
  allAttempts: NaceAttemptInput[]
): Record<NaceKey, number | null> {
  const buckets: Record<NaceKey, number[]> = {
    career_dev: [],
    communication: [],
    critical_thinking: [],
    equity_inclusion: [],
    leadership: [],
    professionalism: [],
    teamwork: [],
    technology: [],
  };

  for (const a of allAttempts) {
    const scores = computeNaceForAttempt(a);
    for (const [key, val] of Object.entries(scores)) {
      if (val !== undefined) buckets[key as NaceKey].push(val);
    }
  }

  const result = {} as Record<NaceKey, number | null>;
  for (const key of Object.keys(buckets) as NaceKey[]) {
    result[key] = avg(buckets[key]) !== null ? Math.round(avg(buckets[key])!) : null;
  }
  return result;
}

/** Color for a NACE score (used in UI) */
export function naceScoreColor(score: number | null): string {
  if (score === null) return "var(--text-muted)";
  if (score >= 80) return "#10B981";
  if (score >= 65) return "#2563EB";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
}

/** Label for a NACE score */
export function naceScoreLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 80) return "Strong";
  if (score >= 65) return "Developing";
  if (score >= 50) return "Emerging";
  return "Beginning";
}
