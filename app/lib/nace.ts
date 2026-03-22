/**
 * NACE Career Readiness Competency Framework
 *
 * Official competency definitions sourced directly from:
 * NACE (National Association of Colleges and Employers)
 * "Career Readiness Competencies" — https://www.naceweb.org/career-readiness/competencies/
 * Revised 2021.
 *
 * IMPORTANT — Data integrity:
 * Not every competency is assessable from interview practice data alone.
 * Each competency below has an explicit `assessable` field indicating the
 * signal confidence level and the specific behavioral indicators we can observe.
 *
 * We only produce scores where we have genuine signal.
 * Competencies marked "not_assessable" show null scores with an explanation,
 * rather than fabricating numbers.
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

export type AssessabilityLevel = "high" | "moderate" | "low" | "not_assessable";

export type NaceScore = {
  key: NaceKey;
  label: string;
  shortLabel: string;
  /** Official NACE definition verbatim */
  definition: string;
  /** NACE behavioral indicators observable from practice session data */
  observableIndicators: string[];
  /** Indicators that require other data sources (checklist, check-in, etc.) */
  otherDataIndicators: string[];
  /** How reliably we can assess this from available data */
  assessability: AssessabilityLevel;
  /** Why this assessability level */
  assessabilityNote: string;
  score: number | null; // 0–100, null = insufficient data
  evidenceSources: string[];
};

// ── Official NACE definitions + behavioral indicators ─────────────────────────
// Source: NACE Career Readiness Competencies (2021)
// https://www.naceweb.org/career-readiness/competencies/

export const NACE_META: Record<
  NaceKey,
  {
    label: string;
    shortLabel: string;
    definition: string;
    observableIndicators: string[];
    otherDataIndicators: string[];
    assessability: AssessabilityLevel;
    assessabilityNote: string;
  }
> = {
  communication: {
    label: "Communication",
    shortLabel: "Communication",
    definition:
      "Clearly and effectively exchange information, ideas, facts, and perspectives with persons inside and outside of an organization.",
    observableIndicators: [
      "Articulates thoughts and ideas clearly in oral form",
      "Uses appropriate structure and sequencing when speaking",
      "Adjusts pace and tone to aid comprehension",
      "Controls filler words that disrupt clarity",
    ],
    otherDataIndicators: [
      "Written communication ability (not assessed here)",
      "Active listening (not assessed here)",
    ],
    assessability: "high",
    assessabilityNote:
      "Oral communication is directly observable from speaking sessions. Clarity, structure, pace, and filler rate are all measurable signals.",
  },

  critical_thinking: {
    label: "Critical Thinking",
    shortLabel: "Critical Thinking",
    definition:
      "Identify and respond to needs based upon an understanding of situational context and logical analysis of relevant information.",
    observableIndicators: [
      "Frames situations with relevant context (STAR: Situation/Task)",
      "Demonstrates logical sequencing of information",
      "Draws clear conclusions from described events",
      "Connects action to outcome with reasoning",
    ],
    otherDataIndicators: [
      "Data analysis tasks (not assessed here)",
      "Written problem-solving (not assessed here)",
    ],
    assessability: "moderate",
    assessabilityNote:
      "STAR structure quality — particularly how well a student frames a situation and connects actions to outcomes — is a reasonable proxy for critical thinking in an oral context. Not a complete measure.",
  },

  professionalism: {
    label: "Professionalism",
    shortLabel: "Professionalism",
    definition:
      "Knowing work environments differ greatly, understand and demonstrate effective work habits, and act in the interest of the larger community and workplace.",
    observableIndicators: [
      "Demonstrates ownership and accountability language (avoids hedging)",
      "Presents with preparation and intentionality",
      "Maintains appropriate pace and composure",
      "Avoids disruptive speech habits",
    ],
    otherDataIndicators: [
      "Punctuality and follow-through (not assessed from speech)",
      "Written professional conduct (not assessed here)",
    ],
    assessability: "moderate",
    assessabilityNote:
      "Confidence scores and delivery signals (filler rate, pacing) reflect professional presentation. Ownership language in responses is a behavioral indicator of accountability.",
  },

  leadership: {
    label: "Leadership",
    shortLabel: "Leadership",
    definition:
      "Recognize and capitalize on personal and team strengths to achieve organizational goals.",
    observableIndicators: [
      "Describes initiative-taking in STAR action sections",
      "Uses 'I' statements that show ownership of decisions",
      "Articulates how they influenced or mobilized others",
      "Demonstrates confidence in describing their role",
    ],
    otherDataIndicators: [
      "Direct observation of leading others (not assessable from speech)",
      "360° feedback from colleagues (not assessable here)",
    ],
    assessability: "moderate",
    assessabilityNote:
      "Leadership is partially observable when students describe past situations. STAR action quality and ownership language are indirect indicators. This is inherently limited — speaking about leadership is not the same as demonstrating it.",
  },

  teamwork: {
    label: "Teamwork",
    shortLabel: "Teamwork",
    definition:
      "Build and maintain collaborative relationships to work effectively toward common goals, while appreciating diverse viewpoints and shared responsibilities.",
    observableIndicators: [
      "Describes collaborative situations accurately",
      "Demonstrates nuanced understanding of team dynamics",
      "Shows awareness of others' roles and contributions",
    ],
    otherDataIndicators: [
      "Actual behavior in team settings (not assessable from speech alone)",
      "Peer ratings (not assessed here)",
    ],
    assessability: "low",
    assessabilityNote:
      "Teamwork is only partially observable through behavioral interview answers about collaborative situations. A student can describe teamwork without demonstrating it. Score is produced only when teamwork-category questions are answered.",
  },

  career_dev: {
    label: "Career & Self-Development",
    shortLabel: "Career Dev",
    definition:
      "Proactively develop oneself and one's career through continual personal and professional learning, awareness of one's strengths and weaknesses, navigation of career opportunities, and networking to build relationships within and without one's organization.",
    observableIndicators: [
      "Demonstrates continuous practice and improvement over time",
      "Reflects on outcomes and learning in STAR result sections",
      "Engages with career planning tools (aptitude assessment, career check-in)",
    ],
    otherDataIndicators: [
      "Networking activity (tracked separately in Pipeline)",
      "Formal professional development (not assessed here)",
    ],
    assessability: "low",
    assessabilityNote:
      "Career & Self-Development is most honestly assessed through behavioral signals outside speech: completing the aptitude quiz, career check-in, and sustained practice. STAR result quality provides a weak speech-based signal around growth mindset.",
  },

  equity_inclusion: {
    label: "Equity & Inclusion",
    shortLabel: "Equity & Inclusion",
    definition:
      "Demonstrate the awareness, attitude, knowledge, and skills required to equitably engage and include people from different local and global cultures. Engage in anti-racist practices that actively challenge the systems, structures, and policies of racism.",
    observableIndicators: [],
    otherDataIndicators: [
      "Cross-cultural engagement experiences (not assessed from interview practice)",
      "Demonstrated behavior in team and community settings (not assessable here)",
      "Coursework, volunteering, or formal equity training (not tracked here)",
    ],
    assessability: "not_assessable",
    assessabilityNote:
      "Equity & Inclusion cannot be meaningfully assessed from interview practice session data. Generating a score here would be fabricated. This competency requires direct observation or self-report of relevant experiences and behaviors.",
  },

  technology: {
    label: "Technology",
    shortLabel: "Technology",
    definition:
      "Understand and leverage technologies ethically to enhance efficiencies, complete tasks, and accomplish goals.",
    observableIndicators: [
      "Demonstrates technical fluency when answering domain-specific questions",
      "Correctly describes tools, systems, or processes relevant to their field",
    ],
    otherDataIndicators: [
      "Actual tool proficiency (not assessable from speech descriptions)",
      "Digital literacy beyond interview context (not assessed here)",
    ],
    assessability: "low",
    assessabilityNote:
      "Technology is only assessable when technical questions are answered, and even then we're measuring how well someone talks about technology, not their actual proficiency. Score is produced only from technical-category sessions.",
  },
};

// ── Input types ──────────────────────────────────────────────────────────────

export type NaceAttemptInput = {
  score?: number | null;
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
  /** Aggregate Career Instincts dimension scores (0–1 scale) across all sessions */
  instinctDimensions?: Record<string, number> | null;
  /** Number of Career Instincts sessions completed */
  instinctSessionCount?: number;
  /** Number of technical skills extracted from resume/sessions */
  technicalSkillsCount?: number;
  /** Whether the student has at least one resume analysis */
  hasResumeAnalysis?: boolean;
  /** Total speaking attempt count */
  totalAttempts?: number;
  /** Average visual delivery scores from webcam sessions (0–10 scale) */
  visualScores?: { eyeContact?: number; expressiveness?: number; headStability?: number } | null;
  /** Average checklist completion 0–1 across pre/during/post stages */
  checklistCompletionPct?: number | null;
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

function to100(v: number | null): number | null {
  if (v === null) return null;
  return clamp(v * 10);
}

/** WPM quality — NACE communication indicator: "appropriate pace aids comprehension" */
function wpmScore(wpm: number): number {
  // 115–145 wpm = optimal conversational interview pace
  const ideal = 130;
  const dev = Math.abs(wpm - ideal);
  return clamp(100 - dev * 1.2);
}

/** Filler rate — NACE communication indicator: "controls disruptive speech habits" */
function fillerScore(per100: number): number {
  return clamp(100 - per100 * 16.7);
}

/** Monotone — NACE communication indicator: "adjusts tone to aid comprehension" */
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

function isTeamCategory(a: NaceAttemptInput): boolean {
  const cat = a.questionCategory?.toLowerCase() ?? "";
  return cat.includes("team") || cat.includes("collaborat") || cat.includes("conflict");
}

function isTechCategory(a: NaceAttemptInput): boolean {
  const cat = a.questionCategory?.toLowerCase() ?? "";
  return cat.includes("tech") || cat.includes("software") || cat.includes("data") || cat.includes("engineer");
}

// ── Per-attempt NACE scoring ──────────────────────────────────────────────────

export function computeNaceForAttempt(a: NaceAttemptInput): Partial<Record<NaceKey, number>> {
  const comm10 = n(a.communicationScore);
  const conf10 = n(a.confidenceScore);
  const overall = n(a.score);
  const wpm = n(a.wpm);
  const fillers = getFillers(a);
  const monotone = getMonotone(a);
  const star = a.feedback?.star;
  const starA = starAvg(a);

  const out: Partial<Record<NaceKey, number>> = {};

  // ── Communication (HIGH confidence) ──────────────────────────────────────
  // Observable indicators: oral clarity, structure, pace, filler control
  {
    let numerator = 0;
    let denominator = 0;

    if (comm10 !== null) { numerator += clamp(comm10 * 10) * 0.5; denominator += 0.5; }
    if (wpm !== null)    { numerator += wpmScore(wpm) * 0.2;       denominator += 0.2; }
    if (fillers !== null){ numerator += fillerScore(fillers) * 0.15; denominator += 0.15; }
    if (monotone !== null){ numerator += monotoneScore(monotone) * 0.15; denominator += 0.15; }
    // Fall back to STAR average if no direct comm score
    if (denominator === 0 && starA !== null) { numerator = clamp(starA * 10); denominator = 1; }

    if (denominator > 0) out.communication = clamp(numerator / denominator);
  }

  // ── Critical Thinking (MODERATE confidence) ──────────────────────────────
  // Observable indicators: STAR situation + task framing, logical structure
  {
    const parts: number[] = [];
    const weights: number[] = [];

    // STAR situation: how well they establish context
    if (star?.situation != null) { parts.push(clamp((n(star.situation) ?? 0) * 10)); weights.push(0.3); }
    // STAR task: clarity of what needed to be solved
    if (star?.task != null)      { parts.push(clamp((n(star.task) ?? 0) * 10)); weights.push(0.3); }
    // Overall score: general answer quality
    if (overall !== null)        { parts.push(clamp(overall)); weights.push(0.4); }

    if (parts.length) {
      const totalW = weights.reduce((a, b) => a + b, 0);
      out.critical_thinking = clamp(
        parts.reduce((acc, v, i) => acc + v * weights[i], 0) / totalW
      );
    }
  }

  // ── Professionalism (MODERATE confidence) ────────────────────────────────
  // Observable indicators: ownership/accountability language, preparation, composure
  {
    const parts: number[] = [];
    const weights: number[] = [];

    if (conf10 !== null) { parts.push(clamp(conf10 * 10)); weights.push(0.6); }
    if (fillers !== null){ parts.push(fillerScore(fillers)); weights.push(0.25); }
    if (wpm !== null)    { parts.push(wpmScore(wpm)); weights.push(0.15); }

    if (parts.length) {
      const totalW = weights.reduce((a, b) => a + b, 0);
      out.professionalism = clamp(
        parts.reduce((acc, v, i) => acc + v * weights[i], 0) / totalW
      );
    }
  }

  // ── Leadership (MODERATE confidence) ────────────────────────────────────
  // Observable indicator: STAR action quality — describes initiative and decision-making
  {
    if (star?.action != null) {
      out.leadership = clamp((n(star.action) ?? 0) * 10);
    }
    // No action component: no score — don't infer from overall
  }

  // ── Teamwork (LOW confidence) ────────────────────────────────────────────
  // Only scored when student answers a teamwork/collaboration question
  {
    if (isTeamCategory(a) && overall !== null) {
      out.teamwork = clamp(overall);
    }
    // No teamwork question: no score — don't infer from generic STAR
  }

  // ── Technology (LOW confidence) ──────────────────────────────────────────
  // Only scored when student answers a technical question
  {
    if (isTechCategory(a) && overall !== null) {
      out.technology = clamp(overall);
    }
  }

  // ── Career & Self-Development (LOW confidence) ───────────────────────────
  // Observable: STAR result quality (learning/growth orientation only)
  // Profile-level signals (aptitude, check-in) added at aggregation level
  {
    if (star?.result != null) {
      out.career_dev = clamp((n(star.result) ?? 0) * 10);
    }
    // No STAR result: no attempt-level score
  }

  // equity_inclusion: NOT scored at attempt level — no observable speech signal

  return out;
}

// ── Profile-level aggregation ────────────────────────────────────────────────

export function computeNaceProfile(input: NaceProfileInput): NaceScore[] {
  const {
    attempts,
    hasCompletedAptitude,
    hasCompletedCareerCheckIn,
    instinctDimensions,
    instinctSessionCount = 0,
    technicalSkillsCount = 0,
    hasResumeAnalysis = false,
    totalAttempts = 0,
    visualScores,
    checklistCompletionPct,
  } = input;

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

  // ── 1. Speaking attempt data ──────────────────────────────────────────────
  for (const a of attempts) {
    const scores = computeNaceForAttempt(a);
    for (const [key, val] of Object.entries(scores)) {
      if (val !== undefined) buckets[key as NaceKey].push(val);
    }
  }

  // ── 2. Career Instincts data ──────────────────────────────────────────────
  // Instincts give us behavioral signal for competencies that are hard to assess
  // purely from speaking. Scale: instinct dimensions are 0–1, NACE is 0–100.
  // Weight: instinct contributes at ~35% blended with speaking-based scores
  // for overlapping competencies; it's the primary signal for equity_inclusion.
  if (instinctDimensions && instinctSessionCount > 0) {
    const inst = instinctDimensions;
    const scale = (v: number | undefined) => (typeof v === "number" ? clamp(v * 100) : null);

    // Teamwork — instinct is primary signal here (speaking alone is weak)
    const instTeam = scale(inst.teamwork);
    if (instTeam !== null) buckets.teamwork.push(instTeam, instTeam); // double-weight vs single speaking attempt

    // Leadership — instinct complements STAR action signal
    const instLead = scale(inst.leadership);
    if (instLead !== null) buckets.leadership.push(instLead, instLead);

    // Professionalism — instinct reinforces speaking-based signal
    const instProf = scale(inst.professionalism);
    if (instProf !== null) buckets.professionalism.push(instProf);

    // Critical Thinking — instinct adds scenario-based reasoning signal
    const instCrit = scale(inst.criticalThinking);
    if (instCrit !== null) buckets.critical_thinking.push(instCrit);

    // Communication — instinct gives scenario-based signal (lower weight —
    // speaking quality is a stronger direct indicator)
    const instComm = scale(inst.communication);
    if (instComm !== null) buckets.communication.push(instComm);

    // Career & Self-Dev — adaptability dimension maps to growth mindset
    const instAdapt = scale(inst.adaptability);
    if (instAdapt !== null) buckets.career_dev.push(instAdapt);

    // Equity & Inclusion — instinct is the primary (and only) measurable signal
    // Only score if the student actually played E&I scenarios (equityInclusion > 0)
    const instEI = scale(inst.equityInclusion);
    if (instEI !== null && inst.equityInclusion > 0) {
      buckets.equity_inclusion.push(instEI, instEI, instEI); // primary signal, triple-weight
    }
  }

  // ── 3. Visual delivery scores (webcam) ───────────────────────────────────
  // Eye contact + expressiveness → Communication (visual delivery component)
  // Head stability → Professionalism (composure/preparation)
  if (visualScores) {
    const eyeContact = visualScores.eyeContact != null ? clamp(visualScores.eyeContact * 10) : null;
    const expressiveness = visualScores.expressiveness != null ? clamp(visualScores.expressiveness * 10) : null;
    const headStability = visualScores.headStability != null ? clamp(visualScores.headStability * 10) : null;

    // Eye contact improves communication score (weighted lower than audio — secondary signal)
    if (eyeContact !== null) buckets.communication.push(eyeContact);
    // Expressiveness adds to communication (vocal variety complement)
    if (expressiveness !== null) buckets.communication.push(expressiveness);
    // Head stability reflects composure — a professionalism indicator
    if (headStability !== null) buckets.professionalism.push(headStability);
  }

  // ── 4. Profile completion → Career & Self-Development ────────────────────
  // NACE indicators: "identify areas for growth", "commit to lifelong learning"
  if (hasCompletedAptitude)      buckets.career_dev.push(80);
  if (hasCompletedCareerCheckIn) buckets.career_dev.push(75);
  if (hasResumeAnalysis)         buckets.career_dev.push(70);
  if (instinctSessionCount >= 3) buckets.career_dev.push(80);
  else if (instinctSessionCount >= 1) buckets.career_dev.push(65);
  // Checklist completion reflects proactive career self-development
  if (checklistCompletionPct != null && checklistCompletionPct > 0) {
    buckets.career_dev.push(clamp(checklistCompletionPct * 100));
  }

  // Speaking volume as self-development signal — consistent practice = growth mindset
  if (totalAttempts >= 15)      buckets.career_dev.push(85);
  else if (totalAttempts >= 8)  buckets.career_dev.push(75);
  else if (totalAttempts >= 3)  buckets.career_dev.push(60);

  // ── 4. Technical skills → Technology ─────────────────────────────────────
  // Resume/session skill extraction gives us concrete tech competency signal
  if (technicalSkillsCount >= 8)       buckets.technology.push(90);
  else if (technicalSkillsCount >= 5)  buckets.technology.push(80);
  else if (technicalSkillsCount >= 2)  buckets.technology.push(65);
  else if (technicalSkillsCount >= 1)  buckets.technology.push(50);

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
    const meta = NACE_META[key];

    // equity_inclusion is never scored — it has no observable signal in this product
    if (key === "equity_inclusion") {
      return {
        key,
        label: meta.label,
        shortLabel: meta.shortLabel,
        definition: meta.definition,
        observableIndicators: meta.observableIndicators,
        otherDataIndicators: meta.otherDataIndicators,
        assessability: meta.assessability,
        assessabilityNote: meta.assessabilityNote,
        score: null,
        evidenceSources: ["Not assessable from interview practice data"],
      };
    }

    const vals = buckets[key];
    const score = avg(vals);

    const sources: string[] = [];
    if (key === "communication")    sources.push("Oral clarity score", "Pace (WPM)", "Filler rate", "Vocal monotone score", ...(visualScores ? ["Eye contact (webcam)", "Expressiveness (webcam)"] : []));
    if (key === "critical_thinking") sources.push("STAR situation score", "STAR task score", "Overall answer quality");
    if (key === "professionalism")   sources.push("Confidence/ownership score", "Filler rate", "Pacing", ...(visualScores?.headStability != null ? ["Head stability (webcam)"] : []));
    if (key === "career_dev")        sources.push("STAR result quality", "Aptitude quiz completion", "Career check-in completion", ...(checklistCompletionPct != null ? ["Checklist progress"] : []));
    if (key === "leadership")        sources.push("STAR action score (initiative + decision-making)");
    if (key === "teamwork")          sources.push("Performance on teamwork/collaboration questions only");
    if (key === "technology")        sources.push("Performance on technical questions only");

    return {
      key,
      label: meta.label,
      shortLabel: meta.shortLabel,
      definition: meta.definition,
      observableIndicators: meta.observableIndicators,
      otherDataIndicators: meta.otherDataIndicators,
      assessability: meta.assessability,
      assessabilityNote: meta.assessabilityNote,
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
    const a = avg(buckets[key]);
    result[key] = a !== null ? Math.round(a) : null;
  }
  return result;
}

/** Color for a NACE score */
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
