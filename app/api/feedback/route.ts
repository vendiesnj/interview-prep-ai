import OpenAI from "openai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { rateLimitFixedWindow } from "@/app/lib/rateLimit";
import { logInfo, logError } from "@/app/lib/logger";

export const runtime = "nodejs";

// ---- concurrency gate (simple semaphore) ----
const MAX_CONCURRENT_FEEDBACK = 8;
let activeFeedbackJobs = 0;

async function acquireFeedbackSlot() {
  if (activeFeedbackJobs >= MAX_CONCURRENT_FEEDBACK) return false;
  activeFeedbackJobs += 1;
  return true;
}

function releaseFeedbackSlot() {
  activeFeedbackJobs = Math.max(0, activeFeedbackJobs - 1);
}

type EvaluationFramework = "star" | "technical_explanation" | "experience_depth";

type RelevanceJSON = {
  answered_question: boolean;
  relevance_score: number;
  directness_score: number;
  completeness_score: number;
  off_topic_score: number;
  missed_parts: string[];
  relevance_explanation: string;
};

type MissedOpportunity = {
  label: string;
  why: string;
  add_sentence: string;
};

type BaseFeedbackJSON = {
  score: number;
  communication_score: number;
  confidence_score: number;
  communication_evidence: string[];
  confidence_evidence: string[];
  confidence_explanation: string;
  relevance: RelevanceJSON;
  missed_opportunities: MissedOpportunity[];
  strengths: string[];
  improvements: string[];
  better_answer: string;
};

type StarFeedbackJSON = BaseFeedbackJSON & {
  star: {
    situation: number;
    task: number;
    action: number;
    result: number;
  };
  star_evidence: {
    situation: string[];
    task: string[];
    action: string[];
    result: string[];
  };
  star_missing: Array<"situation" | "task" | "action" | "result">;
  star_advice: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
};

type TechnicalFeedbackJSON = BaseFeedbackJSON & {
  technical_explanation: {
    technical_clarity: number;
    technical_accuracy: number;
    structure: number;
    depth: number;
    practical_reasoning: number;
  };
  technical_strengths: string[];
  technical_improvements: string[];
};

type ExperienceFeedbackJSON = BaseFeedbackJSON & {
  experience_depth: {
    experience_depth: number;
    specificity: number;
    tool_fluency: number;
    business_impact: number;
    example_quality: number;
  };
  experience_strengths: string[];
  experience_improvements: string[];
};

type AnyFeedbackJSON =
  | StarFeedbackJSON
  | TechnicalFeedbackJSON
  | ExperienceFeedbackJSON;

type FeedbackResponse = AnyFeedbackJSON & {
  filler: {
    total: number;
    words: number;
    per100: number;
    top: string[];
  };
  question_used: string[];
  question_missing: string[];
  deliveryMetrics: any | null;
};

// -------------------------
// Generic helpers
// -------------------------

function tryParseJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function extractFirstJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function isNonEmptyString(x: unknown) {
  return typeof x === "string" && x.trim().length > 0;
}

function isPlainObject(x: unknown): x is Record<string, any> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function toScore1dp(value: unknown, fallback: number, min = 0, max = 10) {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : NaN;

  if (!Number.isFinite(n)) return fallback;
  const clamped = Math.max(min, Math.min(max, n));
  return Math.round(clamped * 10) / 10;
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : NaN;

  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function ensureStringArray(value: unknown, min = 0, max = 5, fallback: string[] = []) {
  const arr = Array.isArray(value) ? value.filter(isNonEmptyString).map((s) => s.trim()) : [];
  if (arr.length >= min) return arr.slice(0, max);
  return fallback.slice(0, max);
}

function ensureMissedOpportunities(value: unknown): MissedOpportunity[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((it) => isPlainObject(it))
    .map((it) => ({
      label: isNonEmptyString(it.label) ? it.label.trim() : "Opportunity",
      why: isNonEmptyString(it.why) ? it.why.trim() : "Not provided.",
      add_sentence: isNonEmptyString(it.add_sentence)
        ? it.add_sentence.trim()
        : "Add one sentence clarifying impact.",
    }))
    .slice(0, 4);
}

// -------------------------
// Validation
// -------------------------

function validateBaseFeedbackShape(obj: any): boolean {
  if (!isPlainObject(obj)) return false;

  for (const key of ["score", "communication_score", "confidence_score"] as const) {
    const v = obj[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 1 || v > 10) return false;
  }

  if (!isNonEmptyString(obj.confidence_explanation)) return false;

  if (!Array.isArray(obj.communication_evidence) || obj.communication_evidence.length < 2 || obj.communication_evidence.length > 4) return false;
  if (!obj.communication_evidence.every(isNonEmptyString)) return false;

  if (!Array.isArray(obj.confidence_evidence) || obj.confidence_evidence.length < 2 || obj.confidence_evidence.length > 4) return false;
  if (!obj.confidence_evidence.every(isNonEmptyString)) return false;

  if (!isPlainObject(obj.relevance)) return false;
  if (typeof obj.relevance.answered_question !== "boolean") return false;

  for (const key of ["relevance_score", "directness_score", "completeness_score", "off_topic_score"] as const) {
    const v = obj.relevance[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 1 || v > 10) return false;
  }

  if (!Array.isArray(obj.relevance.missed_parts) || obj.relevance.missed_parts.length > 6) return false;
  if (!obj.relevance.missed_parts.every(isNonEmptyString)) return false;
  if (!isNonEmptyString(obj.relevance.relevance_explanation)) return false;

  if (!Array.isArray(obj.strengths) || obj.strengths.length < 3 || obj.strengths.length > 5) return false;
  if (!obj.strengths.every(isNonEmptyString)) return false;

  if (!Array.isArray(obj.improvements) || obj.improvements.length < 3 || obj.improvements.length > 5) return false;
  if (!obj.improvements.every(isNonEmptyString)) return false;

  if (!Array.isArray(obj.missed_opportunities) || obj.missed_opportunities.length > 4) return false;
  for (const it of obj.missed_opportunities) {
    if (!isPlainObject(it)) return false;
    if (!isNonEmptyString(it.label) || !isNonEmptyString(it.why) || !isNonEmptyString(it.add_sentence)) {
      return false;
    }
  }

  if (!isNonEmptyString(obj.better_answer)) return false;

  return true;
}

function validateStarFeedback(obj: any): obj is StarFeedbackJSON {
  if (!validateBaseFeedbackShape(obj)) return false;
  if (!isPlainObject(obj.star)) return false;
  if (!isPlainObject(obj.star_evidence)) return false;
  if (!isPlainObject(obj.star_advice)) return false;
  if (!Array.isArray(obj.star_missing) || obj.star_missing.length > 4) return false;

  const allowed = new Set(["situation", "task", "action", "result"]);
  if (!obj.star_missing.every((x: any) => typeof x === "string" && allowed.has(x))) return false;

  for (const k of ["situation", "task", "action", "result"] as const) {
    const v = obj.star[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 10) return false;

    const ev = obj.star_evidence[k];
    if (!Array.isArray(ev) || ev.length > 2 || !ev.every(isNonEmptyString)) return false;

    if (!isNonEmptyString(obj.star_advice[k])) return false;
  }

  return true;
}

function validateTechnicalFeedback(obj: any): obj is TechnicalFeedbackJSON {
  if (!validateBaseFeedbackShape(obj)) return false;
  if (!isPlainObject(obj.technical_explanation)) return false;

  for (const k of [
    "technical_clarity",
    "technical_accuracy",
    "structure",
    "depth",
    "practical_reasoning",
  ] as const) {
    const v = obj.technical_explanation[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 10) return false;
  }

  if (!Array.isArray(obj.technical_strengths) || obj.technical_strengths.length < 2 || obj.technical_strengths.length > 4) return false;
  if (!obj.technical_strengths.every(isNonEmptyString)) return false;

  if (!Array.isArray(obj.technical_improvements) || obj.technical_improvements.length < 2 || obj.technical_improvements.length > 4) return false;
  if (!obj.technical_improvements.every(isNonEmptyString)) return false;

  return true;
}

function validateExperienceFeedback(obj: any): obj is ExperienceFeedbackJSON {
  if (!validateBaseFeedbackShape(obj)) return false;
  if (!isPlainObject(obj.experience_depth)) return false;

  for (const k of [
    "experience_depth",
    "specificity",
    "tool_fluency",
    "business_impact",
    "example_quality",
  ] as const) {
    const v = obj.experience_depth[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 10) return false;
  }

  if (!Array.isArray(obj.experience_strengths) || obj.experience_strengths.length < 2 || obj.experience_strengths.length > 4) return false;
  if (!obj.experience_strengths.every(isNonEmptyString)) return false;

  if (!Array.isArray(obj.experience_improvements) || obj.experience_improvements.length < 2 || obj.experience_improvements.length > 4) return false;
  if (!obj.experience_improvements.every(isNonEmptyString)) return false;

  return true;
}

// -------------------------
// Transcript / filler helpers
// -------------------------

const FILLERS = [
  "um",
  "uh",
  "like",
  "you know",
  "sort of",
  "kind of",
  "basically",
  "literally",
  "actually",
  "honestly",
  "so",
  "right",
  "i mean",
  "okay",
  "well",
];

function countFillers(transcript: string) {
  const t = transcript.toLowerCase();
  let total = 0;
  const perFiller: Record<string, number> = {};

  for (const phrase of FILLERS) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = phrase.includes(" ")
      ? new RegExp(`\\b${escaped.replace(/\s+/g, "\\s+")}\\b`, "g")
      : new RegExp(`\\b${escaped}\\b`, "g");

    const matches = t.match(pattern);
    const n = matches ? matches.length : 0;
    perFiller[phrase] = n;
    total += n;
  }

  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const per100 = wordCount > 0 ? (total / wordCount) * 100 : 0;

  return {
    total,
    perFiller,
    wordCount,
    fillersPer100Words: per100,
    penaltyPoints: Math.min(2.0, per100 * 0.15),
  };
}

const STOP = new Set([
  "the","and","or","a","an","to","of","in","for","on","with","as","at","by","from","into","that","this",
  "is","are","was","were","be","been","being","it","its","their","our","your","you","we","they","i",
  "will","would","should","can","could","may","might","must","not","no","yes","but","if","then","than",
  "about","over","under","between","within","across","per","via","etc",
]);

function normalizeText(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/[^a-z0-9\s/+.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQuestionSignals(question: string) {
  const q = normalizeText(question);

  const Q_STOP = new Set([
    ...STOP,
    "tell","me","about","describe","walk","through","time","when","example","examples",
    "give","share","how","what","why","your",
  ]);

  const words = q.split(" ").filter(Boolean).filter((w) => !Q_STOP.has(w));
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);

  const INTENT_TAGS: Array<{ tag: string; re: RegExp }> = [
    { tag: "conflict", re: /\b(conflict|disagree|pushback|difficult|challenge|tough)\b/i },
    { tag: "leadership", re: /\b(lead|led|leadership|influence|align|coach|mentor)\b/i },
    { tag: "ownership", re: /\b(own|ownership|accountable|responsible)\b/i },
    { tag: "tradeoffs", re: /\b(tradeoff|trade-offs|prioriti|decision|choose|evaluate)\b/i },
    { tag: "impact", re: /\b(impact|result|outcome|metric|improve|increase|decrease|reduce)\b/i },
    { tag: "data", re: /\b(data|analysis|analyz|measure|kpi|metrics)\b/i },
    { tag: "failure/learning", re: /\b(fail|failure|mistake|learn|lesson)\b/i },
    { tag: "stakeholders", re: /\b(stakeholder|partner|cross[- ]functional|team|customer|client)\b/i },
    { tag: "process", re: /\b(process|approach|method|framework|steps)\b/i },
  ];

  const tags = INTENT_TAGS.filter((t) => t.re.test(question)).map((t) => t.tag);

  const topTerms = [...counts.entries()]
    .filter(([w]) => w.length >= 5)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 6);

  return { tags, topTerms };
}

function computeQuestionAlignment(question: string, transcript: string) {
  const tr = normalizeText(transcript);
  const { tags, topTerms } = extractQuestionSignals(question ?? "");

  const usedTags: string[] = [];
  const missingTags: string[] = [];

  for (const t of tags) {
    const hit = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(tr);
    if (hit) usedTags.push(t);
    else missingTags.push(t);
  }

  const usedTerms: string[] = [];
  const missingTerms: string[] = [];

  for (const w of topTerms) {
    const hit = new RegExp(`\\b${w}\\b`, "i").test(tr);
    if (hit) usedTerms.push(w);
    else missingTerms.push(w);
  }

  return {
    question_used: [...usedTags, ...usedTerms].slice(0, 8),
    question_missing: [...missingTags, ...missingTerms].slice(0, 5),
  };
}

// -------------------------
// Prompt builder
// -------------------------

function buildPrompt(args: {
  framework: EvaluationFramework;
  jobDesc: string;
  question: string;
  transcript: string;
  deliveryMetrics: any;
  fillerStats: ReturnType<typeof countFillers>;
}) {
  const { framework, jobDesc, question, transcript, deliveryMetrics, fillerStats } = args;

  const commonIntro = `
You are a rigorous interview evaluator. Be fair, honest, and specific.

Important calibration:
- Do NOT inflate scores for answers that merely sound polished.
- Vague but polished answers should land in the 5.0–6.9 range.
- Strong answers with specificity and clear ownership can land in the 7.0–8.4 range.
- Scores above 8.5 should be rare.
- 9.0+ requires unusually strong evidence, specificity, and impact.
- Use decimal scoring when appropriate (for example 5.6, 6.8, 7.3).

JOB DESCRIPTION:
${jobDesc ?? ""}

QUESTION:
${question ?? ""}

CANDIDATE ANSWER (TRANSCRIPT):
${transcript}

QUESTION RELEVANCE EVALUATION:
Judge whether the candidate actually answered the interview question being asked.

Return:
- answered_question: boolean
- relevance_score (1-10, allow one decimal place)
- directness_score (1-10, allow one decimal place)
- completeness_score (1-10, allow one decimal place)
- off_topic_score (1-10, allow one decimal place)
- missed_parts: array of strings
- relevance_explanation: 1-2 sentences

Important relevance rules:
- Judge relevance primarily against the QUESTION, not the job description.
- Multi-part questions must be graded strictly.
- If the candidate answers only one part of a multi-part question, completeness_score must be <= 5.5.
- If the answer is polished but does not answer the question, relevance_score must be <= 5.5.
- directness_score should be lower if the candidate takes too long to get to the point.

FILLER WORD ANALYSIS (precomputed):
- total_fillers: ${fillerStats.total}
- words: ${fillerStats.wordCount}
- fillers_per_100_words: ${fillerStats.fillersPer100Words.toFixed(1)}

VOICE DELIVERY METRICS (from audio; may be null):
${deliveryMetrics ? JSON.stringify(deliveryMetrics) : "null"}

Communication and confidence rules:
- communication_score (1-10, allow one decimal place) is ONLY about clarity, sequencing, signposting, and ease of following the answer.
- confidence_score (1-10, allow one decimal place) is ONLY about ownership language vs hedging.
- communication_score and confidence_score must not be justified using the same evidence.
- If fillers_per_100_words >= 8, reduce communication_score and confidence_score modestly.
- If long pauses or obvious hesitation are present, reduce confidence_score modestly.

Required common JSON fields:
{
  "score": 1-10,
  "communication_score": 1-10,
  "confidence_score": 1-10,
  "communication_evidence": ["string"],
  "confidence_evidence": ["string"],
  "confidence_explanation": "string",
  "relevance": {
    "answered_question": true,
    "relevance_score": 1-10,
    "directness_score": 1-10,
    "completeness_score": 1-10,
    "off_topic_score": 1-10,
    "missed_parts": ["string"],
    "relevance_explanation": "string"
  },
  "strengths": ["string"],
  "improvements": ["string"],
  "missed_opportunities": [
    { "label": "string", "why": "string", "add_sentence": "string" }
  ],
  "better_answer": "string"
}

Common rules:
- strengths: 3-5 items, specific to this answer
- improvements: 3-5 items, specific to this answer
- communication_evidence: 2-4 short verbatim quotes (or fallback phrases if evidence is weak)
- confidence_evidence: 2-4 short verbatim quotes (or fallback phrases if evidence is weak)
- missed_opportunities: 2-4 items
- better_answer: 120-180 words
- Do not include markdown
- Output JSON only
`.trim();

  const starPrompt = `
${commonIntro}

This is a behavioral STAR question.

Behavioral rubric:
- Evaluate Situation, Task, Action, and Result on a 0-10 scale with one decimal place allowed.
- Missing or vague elements should score low.
- Strong answers require clear ownership and concrete details.
- Higher overall scores require a meaningful result or impact.
- 8.0+ requires strong structure and specificity.
- 9.0+ should be rare and require strong measurable impact.

Behavioral-specific JSON fields:
{
  "star": {
    "situation": 0-10,
    "task": 0-10,
    "action": 0-10,
    "result": 0-10
  },
  "star_missing": ["situation" | "task" | "action" | "result"],
  "star_evidence": {
    "situation": ["string"],
    "task": ["string"],
    "action": ["string"],
    "result": ["string"]
  },
  "star_advice": {
    "situation": "string",
    "task": "string",
    "action": "string",
    "result": "string"
  }
}

Behavioral-specific rules:
- Overall score should be driven mainly by STAR quality, with communication/confidence as secondary adjustments.
- If STAR average is below 6.0, overall score should usually stay below 6.5.
- If the result is weak or non-measurable, overall score should usually stay below 8.0.
- better_answer should rewrite the answer into a stronger behavioral response using the same story.
- strengths and improvements may reference Situation, Task, Action, and Result.
`.trim();

  const technicalPrompt = `
${commonIntro}

This is a technical explanation question.

Technical rubric:
- Do NOT force STAR.
- Evaluate:
  - technical_clarity
  - technical_accuracy
  - structure
  - depth
  - practical_reasoning
- Use a 0-10 scale with one decimal place allowed.
- Strong answers should explain the concept correctly, clearly, and with practical reasoning.
- Buzzword-heavy but shallow answers should score in the 5s or low 6s.
- 8.0+ requires real clarity, credible depth, and practical reasoning.
- 9.0+ should be rare.

Technical-specific JSON fields:
{
  "technical_explanation": {
    "technical_clarity": 0-10,
    "technical_accuracy": 0-10,
    "structure": 0-10,
    "depth": 0-10,
    "practical_reasoning": 0-10
  },
  "technical_strengths": ["string"],
  "technical_improvements": ["string"]
}

Technical-specific rules:
- Do not return STAR fields.
- better_answer should rewrite the answer as a stronger technical explanation, not a STAR story.
- strengths and improvements should focus on explanation quality, specificity, and reasoning.
`.trim();

  const experiencePrompt = `
${commonIntro}

This is an experience depth question.

Experience rubric:
- Do NOT force STAR.
- Evaluate:
  - experience_depth
  - specificity
  - tool_fluency
  - business_impact
  - example_quality
- Use a 0-10 scale with one decimal place allowed.
- Generic claims like "I have experience with X" should not score highly.
- Strong answers require concrete examples, credible familiarity, and practical business relevance.
- 8.0+ requires clear specificity and credible impact.
- 9.0+ should be rare.

Experience-specific JSON fields:
{
  "experience_depth": {
    "experience_depth": 0-10,
    "specificity": 0-10,
    "tool_fluency": 0-10,
    "business_impact": 0-10,
    "example_quality": 0-10
  },
  "experience_strengths": ["string"],
  "experience_improvements": ["string"]
}

Experience-specific rules:
- Do not return STAR fields.
- better_answer should rewrite the answer as a stronger experience-based answer, not a STAR story.
- strengths and improvements should focus on specificity, fluency, examples, and impact.
`.trim();

  if (framework === "technical_explanation") return technicalPrompt;
  if (framework === "experience_depth") return experiencePrompt;
  return starPrompt;
}

// -------------------------
// Normalization
// -------------------------

function normalizeBaseFeedback(json: any): BaseFeedbackJSON {
  const base: BaseFeedbackJSON = {
    score: toScore1dp(json.score, 5, 1, 10),
    communication_score: toScore1dp(json.communication_score, 5, 1, 10),
    confidence_score: toScore1dp(json.confidence_score, 5, 1, 10),
    communication_evidence: ensureStringArray(json.communication_evidence, 2, 4, [
      "No clear signposting detected",
      "Sequencing was hard to follow",
    ]),
    confidence_evidence: ensureStringArray(json.confidence_evidence, 2, 4, [
      "Limited ownership language detected",
      "Some hedging reduced assertiveness",
    ]),
    confidence_explanation: isNonEmptyString(json.confidence_explanation)
      ? json.confidence_explanation.trim()
      : "Confidence evidence was limited.",
    relevance: {
      answered_question: Boolean(json?.relevance?.answered_question),
      relevance_score: toScore1dp(json?.relevance?.relevance_score, 5, 1, 10),
      directness_score: toScore1dp(json?.relevance?.directness_score, 5, 1, 10),
      completeness_score: toScore1dp(json?.relevance?.completeness_score, 5, 1, 10),
      off_topic_score: toScore1dp(json?.relevance?.off_topic_score, 5, 1, 10),
      missed_parts: ensureStringArray(json?.relevance?.missed_parts, 0, 6),
      relevance_explanation: isNonEmptyString(json?.relevance?.relevance_explanation)
        ? json.relevance.relevance_explanation.trim()
        : "Relevance analysis was unavailable.",
    },
    missed_opportunities: ensureMissedOpportunities(json.missed_opportunities),
    strengths: ensureStringArray(json.strengths, 3, 5, [
      "Some relevant detail was included.",
      "The answer addressed part of the question.",
      "There was at least some evidence of ownership or structure.",
    ]),
    improvements: ensureStringArray(json.improvements, 3, 5, [
      "Add more specific detail tied to the question asked.",
      "Make the answer easier to follow with clearer sequencing.",
      "Strengthen the close with clearer impact or takeaway.",
    ]),
    better_answer: isNonEmptyString(json.better_answer)
      ? json.better_answer.trim()
      : "A stronger answer would be more specific, more structured, and more clearly tied to the question.",
  };

  return base;
}

function normalizeStarFeedback(json: any): StarFeedbackJSON {
  const base = normalizeBaseFeedback(json);
  const allowed = new Set(["situation", "task", "action", "result"]);

  return {
    ...base,
    star: {
      situation: toScore1dp(json?.star?.situation, 0, 0, 10),
      task: toScore1dp(json?.star?.task, 0, 0, 10),
      action: toScore1dp(json?.star?.action, 0, 0, 10),
      result: toScore1dp(json?.star?.result, 0, 0, 10),
    },
    star_evidence: {
      situation: ensureStringArray(json?.star_evidence?.situation, 0, 2),
      task: ensureStringArray(json?.star_evidence?.task, 0, 2),
      action: ensureStringArray(json?.star_evidence?.action, 0, 2),
      result: ensureStringArray(json?.star_evidence?.result, 0, 2),
    },
    star_missing: Array.isArray(json?.star_missing)
      ? json.star_missing.filter((x: any) => typeof x === "string" && allowed.has(x)).slice(0, 4)
      : [],
    star_advice: {
      situation: isNonEmptyString(json?.star_advice?.situation)
        ? json.star_advice.situation.trim()
        : "Not mentioned.",
      task: isNonEmptyString(json?.star_advice?.task)
        ? json.star_advice.task.trim()
        : "Not mentioned.",
      action: isNonEmptyString(json?.star_advice?.action)
        ? json.star_advice.action.trim()
        : "Not mentioned.",
      result: isNonEmptyString(json?.star_advice?.result)
        ? json.star_advice.result.trim()
        : "Not mentioned.",
    },
  };
}

function normalizeTechnicalFeedback(json: any): TechnicalFeedbackJSON {
  const base = normalizeBaseFeedback(json);

  return {
    ...base,
    technical_explanation: {
      technical_clarity: toScore1dp(json?.technical_explanation?.technical_clarity, 0, 0, 10),
      technical_accuracy: toScore1dp(json?.technical_explanation?.technical_accuracy, 0, 0, 10),
      structure: toScore1dp(json?.technical_explanation?.structure, 0, 0, 10),
      depth: toScore1dp(json?.technical_explanation?.depth, 0, 0, 10),
      practical_reasoning: toScore1dp(json?.technical_explanation?.practical_reasoning, 0, 0, 10),
    },
    technical_strengths: ensureStringArray(json?.technical_strengths, 2, 4, [
      "Some technically relevant detail was included.",
      "The answer showed at least partial familiarity with the topic.",
    ]),
    technical_improvements: ensureStringArray(json?.technical_improvements, 2, 4, [
      "Add more concrete technical detail.",
      "Explain the reasoning more clearly and practically.",
    ]),
  };
}

function normalizeExperienceFeedback(json: any): ExperienceFeedbackJSON {
  const base = normalizeBaseFeedback(json);

  return {
    ...base,
    experience_depth: {
      experience_depth: toScore1dp(json?.experience_depth?.experience_depth, 0, 0, 10),
      specificity: toScore1dp(json?.experience_depth?.specificity, 0, 0, 10),
      tool_fluency: toScore1dp(json?.experience_depth?.tool_fluency, 0, 0, 10),
      business_impact: toScore1dp(json?.experience_depth?.business_impact, 0, 0, 10),
      example_quality: toScore1dp(json?.experience_depth?.example_quality, 0, 0, 10),
    },
    experience_strengths: ensureStringArray(json?.experience_strengths, 2, 4, [
      "Some relevant experience was described.",
      "The answer showed at least partial familiarity with the work.",
    ]),
    experience_improvements: ensureStringArray(json?.experience_improvements, 2, 4, [
      "Add more concrete examples.",
      "Show stronger specificity and business relevance.",
    ]),
  };
}

// -------------------------
// Route
// -------------------------

export async function POST(req: Request) {
  const slotAcquired = await acquireFeedbackSlot();
  if (!slotAcquired) {
    return new Response(
      JSON.stringify({
        error: "SERVER_BUSY",
        message: "System is under heavy load. Please retry in a few seconds.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const start = Date.now();

  const cl = req.headers.get("content-length");
  if (cl && Number(cl) > 40_000) {
    releaseFeedbackSlot();
    return new Response(JSON.stringify({ error: "PAYLOAD_TOO_LARGE" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const jobDesc = typeof body.jobDesc === "string" ? body.jobDesc : "";
    const question = typeof body.question === "string" ? body.question : "";
    const transcript = typeof body.transcript === "string" ? body.transcript : "";
    const deliveryMetrics = body.deliveryMetrics ?? null;
    const evaluationFramework: EvaluationFramework =
      body.evaluationFramework === "technical_explanation"
        ? "technical_explanation"
        : body.evaluationFramework === "experience_depth"
        ? "experience_depth"
        : "star";

    logInfo("feedback_delivery_metrics_received", {
      hasDeliveryMetrics: !!deliveryMetrics,
      deliveryMetricsKeys:
        deliveryMetrics && typeof deliveryMetrics === "object"
          ? Object.keys(deliveryMetrics)
          : [],
    });

    if (jobDesc.length > 12_000) {
      return new Response(JSON.stringify({ error: "JOBDESC_TOO_LONG" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (question.length > 800) {
      return new Response(JSON.stringify({ error: "QUESTION_TOO_LONG" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (transcript.length > 10_000) {
      return new Response(JSON.stringify({ error: "TRANSCRIPT_TOO_LONG" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!transcript || transcript.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Transcript is too short." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fillerStats = countFillers(transcript);

    const aaiFillers = Array.isArray(deliveryMetrics?.fillers) ? deliveryMetrics.fillers : null;
    if (aaiFillers && aaiFillers.length > 0) {
      fillerStats.total = aaiFillers.length;

      if (typeof deliveryMetrics?.words === "number" && deliveryMetrics.words > 0) {
        fillerStats.wordCount = deliveryMetrics.words;
        fillerStats.fillersPer100Words =
          (fillerStats.total / fillerStats.wordCount) * 100;
      }

      const counts = new Map<string, number>();
      for (const f of aaiFillers) {
        const t = String(f?.text ?? "").toLowerCase().trim();
        if (!t) continue;
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }

      (fillerStats as any).perFiller = Object.fromEntries(counts.entries());
    }

    const qa = computeQuestionAlignment(question, transcript);

    const topFillers = Object.entries(fillerStats.perFiller)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, n]) => `${k} (${n})`);

    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return new Response("Unauthorized", { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        freeAttemptsUsed: true,
        freeAttemptCap: true,
        subscriptionStatus: true,
      },
    });

    if (!user) return new Response("Unauthorized", { status: 401 });

    logInfo("feedback_request_started", { userId: user.id });

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const rlUser = await rateLimitFixedWindow({
      key: `feedback:user:${user.id}`,
      limit: 10,
      windowMs: 60_000,
    });

    const rlIp = await rateLimitFixedWindow({
      key: `feedback:ip:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });

    const remaining =
      rlUser.ok && rlIp.ok ? Math.min(rlUser.remaining, rlIp.remaining) : 0;

    const resetMs = Math.max(rlUser.resetMs, rlIp.resetMs);

    if (!rlUser.ok || !rlIp.ok) {
      return new Response(
        JSON.stringify({
          error: "RATE_LIMITED",
          message: "Too many feedback requests. Please wait a moment.",
          retryAfterMs: resetMs,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(resetMs / 1000)),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset-Ms": String(resetMs),
          },
        }
      );
    }

    const isPro =
      user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing";

    if (!isPro && user.freeAttemptsUsed >= user.freeAttemptCap) {
      return new Response(
        JSON.stringify({
          error: "FREE_LIMIT_REACHED",
          message: "You’ve used your free attempts. Upgrade to keep practicing.",
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = buildPrompt({
      framework: evaluationFramework,
      jobDesc,
      question,
      transcript,
      deliveryMetrics,
      fillerStats,
    });

    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0,
    });

    const text = resp.output_text?.trim() ?? "";

    let parsed: any = tryParseJson(text);
    if (!parsed) {
      const candidate = extractFirstJsonObject(text);
      if (candidate) parsed = tryParseJson(candidate);
    }

    if (!parsed) {
      logError("feedback_non_json_output", { raw: text.slice(0, 1200) });
      return new Response(
        JSON.stringify({ error: "Model returned non-JSON output.", raw: text }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let normalized: AnyFeedbackJSON;

    if (evaluationFramework === "technical_explanation") {
      normalized = normalizeTechnicalFeedback(parsed);
      if (!validateTechnicalFeedback(normalized)) {
        return new Response(
          JSON.stringify({
            error: "Model returned invalid technical feedback shape.",
            parsed: normalized,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } else if (evaluationFramework === "experience_depth") {
      normalized = normalizeExperienceFeedback(parsed);
      if (!validateExperienceFeedback(normalized)) {
        return new Response(
          JSON.stringify({
            error: "Model returned invalid experience feedback shape.",
            parsed: normalized,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      normalized = normalizeStarFeedback(parsed);
      if (!validateStarFeedback(normalized)) {
        return new Response(
          JSON.stringify({
            error: "Model returned invalid behavioral feedback shape.",
            parsed: normalized,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    if (!isPro) {
      await prisma.user.update({
        where: { id: user.id },
        data: { freeAttemptsUsed: { increment: 1 } },
      });
    }

    logInfo("feedback_request_completed", {
      userId: user.id,
      framework: evaluationFramework,
      elapsedMs: Date.now() - start,
      score: normalized.score,
    });

    const response: FeedbackResponse = {
      ...normalized,
      deliveryMetrics: deliveryMetrics ?? null,
      filler: {
        total: fillerStats.total,
        words: fillerStats.wordCount,
        per100: Number(fillerStats.fillersPer100Words.toFixed(1)),
        top: topFillers,
      },
      question_used: qa.question_used,
      question_missing: qa.question_missing,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset-Ms": String(resetMs),
      },
    });
  } catch (err: any) {
    logError("feedback_route_failed", {
      message: err?.message ?? "Unknown error",
      stack: err?.stack ?? null,
    });

    return new Response(
      JSON.stringify({ error: err?.message ?? "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    releaseFeedbackSlot();
  }
}