import OpenAI from "openai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { rateLimitFixedWindow } from "@/app/lib/rateLimit";
import { logInfo, logError } from "@/app/lib/logger";
import { composeRichFeedback } from "@/app/lib/feedback/composer";
import type { UserCoachingProfile } from "@/app/lib/feedback/coachingProfile";

export const runtime = "nodejs";

// -------------------------
// Concurrency gate
// -------------------------

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

// -------------------------
// Types
// -------------------------

type EvaluationFramework = "star" | "technical_explanation" | "experience_depth" | "public_speaking" | "networking_pitch";

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

type PublicSpeakingFeedbackJSON = BaseFeedbackJSON & {
  public_speaking: {
    hook_impact: number;
    structure: number;
    vocal_variety: number;
    clarity: number;
    audience_connection: number;
    confidence_presence: number;
  };
  delivery_archetype: string;
  archetype_coaching: string;
  speaking_strengths: string[];
  speaking_improvements: string[];
};

type NetworkingPitchFeedbackJSON = BaseFeedbackJSON & {
  networking_pitch: {
    hook_strength: number;
    clarity_of_ask: number;
    credibility: number;
    conciseness: number;
    memorability: number;
  };
  pitch_style: string;
  pitch_coaching: string;
  pitch_strengths: string[];
  pitch_improvements: string[];
};

type AnyFeedbackJSON =
  | StarFeedbackJSON
  | TechnicalFeedbackJSON
  | ExperienceFeedbackJSON
  | PublicSpeakingFeedbackJSON
  | NetworkingPitchFeedbackJSON;

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

function getResponseText(resp: any) {
  if (typeof resp?.output_text === "string" && resp.output_text.trim()) {
    return resp.output_text.trim();
  }

  const parts = Array.isArray(resp?.output) ? resp.output : [];

  for (const item of parts) {
    const content = Array.isArray(item?.content) ? item.content : [];

    for (const c of content) {
      if (typeof c?.text === "string" && c.text.trim()) {
        return c.text.trim();
      }

      if (typeof c?.json === "object" && c.json !== null) {
        try {
          return JSON.stringify(c.json);
        } catch {}
      }

      if (typeof c?.parsed === "object" && c.parsed !== null) {
        try {
          return JSON.stringify(c.parsed);
        } catch {}
      }
    }
  }

  if (typeof resp?.text === "string" && resp.text.trim()) {
    return resp.text.trim();
  }

  return "";
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

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

  if (!Array.isArray(obj.improvements) || obj.improvements.length < 1 || obj.improvements.length > 4) return false;
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
    penaltyPoints: Math.min(1.2, per100 * 0.08),
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
    { tag: "leadership", re: /\b(lead|led|leadership|influence|coach|mentor|align)\b/i },
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
// Prompt architecture
// -------------------------

function buildSystemMessage(framework: EvaluationFramework, eslMode = false) {
  const common = `
You are an interview evaluator for a production SaaS coaching product.

You must return valid JSON only and exactly match the provided schema.

Scoring calibration — use the FULL 1–10 range based strictly on what you observe:
- 1.0–3.0: No genuine attempt, completely off-topic, or incomprehensible
- 3.1–4.9: Attempted but with major failures — missing core STAR parts, factually wrong, entirely vague, or mostly irrelevant
- 5.0–6.4: Partial — some relevant content but with clearly observable gaps (e.g., no quantified result, "we" language throughout, answer drifts, structure breaks down halfway)
- 6.5–7.4: Solid — real attempt, identifiable structure and ownership, minor gaps only
- 7.5–8.4: Strong — specific, well-structured, clearly owned, demonstrates the competency with evidence
- 8.5–9.0: Excellent — polished, memorable, would stand out at competitive companies
- 9.1–10.0: Exceptional — rare, reserved for responses that demonstrate mastery and set a new bar
Score what you actually observe in the transcript. Do not default to any band. A strong answer should score strongly. A weak answer should score weakly. Do not compress scores toward the middle.
Use one decimal place when useful.
Behavioral questions must use STAR.
Technical questions must NOT use STAR.
Experience questions must NOT use STAR.

Evidence rules:
- Use concise, specific evidence.
- communication_evidence and confidence_evidence must not be duplicates.
- strengths and improvements must be answer-specific, not generic.
- better_answer must preserve the same story/topic but improve it.

Improvements discipline:
- Only list improvements for genuine, observable weaknesses in THIS answer.
- Do NOT invent improvements to fill a quota. If the answer is strong, 1 improvement is fine.
- Do NOT suggest improving something that is already a demonstrated strength.
- Avoid generic advice like "add more examples" or "be more specific" unless specificity is a measurable problem in this transcript.
- Every improvement must be grounded in specific evidence from the transcript — quote or paraphrase the actual moment that reveals the weakness.

Candidate history (when candidate_history is provided):
- recurring_weaknesses lists areas the candidate has struggled with across multiple past attempts. Check whether those specific issues appear in THIS transcript. If they do, name them precisely with transcript evidence. If this answer has resolved them, explicitly acknowledge that in trajectory_note and do NOT re-flag them.
- consistently_weak_dimensions shows dimension areas averaging below 6.0 over recent attempts. If the current answer still shows those weaknesses, your improvements should directly target them.
- dominant_archetype tells you the candidate's habitual communication pattern. Your coaching should help them break the pattern's specific limitations.
- Do not repeat advice that was given in prev_improvement_areas unless the same specific problem is clearly visible in THIS transcript.

Webcam presence rules (when presence_signals is provided):
- Factor eye_contact and expressiveness into confidence_score. Strong eye contact (>= "strong") supports higher confidence scores. Weak eye contact ("weak") should lower the confidence_score by 0.3–0.8 relative to verbal content alone.
- If eye_contact is weak, include one confidence_evidence item noting the camera disengagement and its effect on perceived confidence.
- Do not mention webcam or eye contact in strengths/improvements/better_answer unless presence_signals shows a clear signal worth naming - if it's strong, it can appear as a strength; if weak, as an improvement.

Output rules:
- Return exactly one JSON object
- Do not wrap it in markdown
- Do not add commentary before or after
- Do not use code fences
- Do not omit required keys
- Only generate feedback if the transcript is a genuine attempt to answer the question
- Evidence, strengths, and improvements must be grounded in actual content from the transcript - never invented
`.trim();

  const eslBlock = `

ESL / International speaker mode is ACTIVE. Apply these adjustments:
- Do NOT penalize non-native accent, regional dialect, or minor grammatical variation.
- Evaluate idea clarity and professional communication quality - not linguistic polish.
- Filler thresholds are 25% more lenient: treat fillers_per_100_words < 6.5 as acceptable.
- Do NOT include language-level corrections in improvements unless comprehension is clearly impaired.
- Confidence scoring should not penalize hedging phrases that reflect cultural communication norms.
- Scores should reflect the quality of ideas and clarity of communication, not native fluency.`;

  if (framework === "star") {
    return `${common}${eslMode ? eslBlock : ""}

Behavioral rules:
- Evaluate Situation, Task, Action, and Result.
- Drive scores from STAR completeness, ownership language, specificity, and quantified outcomes.
- A missing or vague Result is the single strongest signal of an incomplete answer — cap STAR scores accordingly.
- An answer with all 4 STAR parts present, specific actions in first-person, and a measurable outcome should score well (7.5+). Reward completeness.
- An answer missing 2+ STAR components should not exceed 6.0 on any STAR dimension.
- Generic answers ("I worked with the team", "we solved it together") without ownership should score 4.0–5.5 on ownership_agency.
`;
  }

  if (framework === "technical_explanation") {
    return `${common}${eslMode ? eslBlock : ""}

Technical explanation rules:
- Do NOT use STAR framing.
- Evaluate clarity, accuracy, structure, depth, and practical reasoning.
- Buzzword-heavy but shallow answers with no concrete mechanics should score 4.0–5.5.
- Clear, accurate, well-structured explanations with practical reasoning should score 7.5–8.5.
- Score each sub-dimension based on what is literally present in the answer, not on what an average candidate would say.
`;
  }

  if (framework === "public_speaking") {
    return `${common}${eslMode ? eslBlock : ""}

Public speaking rules:
- Do NOT use STAR framing. This is NOT an interview answer evaluation.
- Evaluate the speech as a standalone spoken delivery: hook, structure, vocal variety, clarity, audience connection, and confidence/presence.
- A strong hook that grabs attention immediately should score 8+. A weak or absent hook should score 4 or below.
- Structure means a clear opening, developed body, and strong close. Trailing off without a close should cap structure at 5.
- Vocal variety is about pitch variation, pace changes, and strategic pauses - not just speed.
- Delivery archetypes: "The Storyteller" (narrative-forward, engaging), "The Lecturer" (structured but flat), "The Rusher" (fast, nervous energy), "The Pauser" (measured, authoritative), "The Rambler" (enthusiastic but unfocused), "The Mumbler" (low energy, unclear).
- Choose exactly one archetype that best fits the delivery. The archetype_coaching field must give one specific, actionable lever for that archetype.
`;
  }

  if (framework === "networking_pitch") {
    return `${common}${eslMode ? eslBlock : ""}

Networking pitch rules:
- Do NOT use STAR framing. This is NOT an interview answer evaluation.
- Evaluate the pitch as a real-world networking moment: opening hook, clarity of what the speaker wants, credibility signals, conciseness, and memorability.
- Hook strength: does the opening immediately capture interest? A strong, specific hook scores 8+. Generic or slow openers score 4 or below.
- Clarity of ask: can you clearly tell what the speaker wants (advice, referral, connection, job)? Vague or absent asks score 4 or below.
- Credibility: does the speaker establish relevant background, experience, or accomplishment quickly? Name-dropping without substance should not score well.
- Conciseness: great networking pitches are 30-60 seconds. Rambling or filler-heavy pitches should be penalized. Very tight, well-edited pitches score 9+.
- Memorability: will the listener remember this person and reach out? A distinctive angle, story, or detail scores high. Generic pitches score low.
- Pitch styles: "The Connector" (warm, relationship-forward), "The Achiever" (credential-forward, specific accomplishments), "The Visionary" (idea-first, ambitious), "The Wanderer" (unfocused, unclear direction), "The Bullet-Pointer" (efficient but cold), "The Over-Sharer" (too much detail, loses listener).
- Choose exactly one pitch style. pitch_coaching must give one specific, actionable improvement lever.
`;
  }

  return `${common}${eslMode ? eslBlock : ""}

Experience depth rules:
- Do NOT use STAR framing.
- Evaluate depth, specificity, tool fluency, business impact, and example quality.
- Generic claims ("I've worked with various teams", "I have experience in...") with no concrete examples should score 3.0–5.0 on specificity and example_quality.
- Named tools, technologies, or methodologies with a concrete outcome should score 7.0+.
- Let the actual level of detail, not assumed candidate level, determine the score.
`;
}

function labelPresence(value: number | null | undefined, thresholdHigh: number, thresholdLow: number): string | null {
  if (value === null || value === undefined || typeof value !== "number") return null;
  const pct = Math.round(value * 100);
  if (value >= thresholdHigh) return `strong (${pct}%)`;
  if (value < thresholdLow) return `weak (${pct}%)`;
  return `moderate (${pct}%)`;
}

function buildUserMessage(args: {
  framework: EvaluationFramework;
  jobDesc: string;
  question: string;
  transcript: string;
  deliveryMetrics: any;
  faceMetrics: any;
  fillerStats: ReturnType<typeof countFillers>;
  prevScore?: number | null;
  prevImprovementThemeKeys?: string[] | null;
  userProfile?: UserCoachingProfile | null;
}) {
  const { framework, jobDesc, question, transcript, deliveryMetrics, faceMetrics, fillerStats, prevScore, prevImprovementThemeKeys, userProfile } = args;

  // Build presence_signals block only when webcam data is available and meaningful
  const presenceSignals = faceMetrics && typeof faceMetrics === "object" && (faceMetrics.framesAnalyzed ?? 1) > 0
    ? {
        eye_contact:     labelPresence(faceMetrics.eyeContact,     0.65, 0.35),
        expressiveness:  labelPresence(faceMetrics.expressiveness,  0.5,  0.2),
        head_stability:  labelPresence(faceMetrics.headStability,   0.8,  0.5),
        smile_rate:      typeof faceMetrics.smileRate === "number"
          ? (faceMetrics.smileRate > 0.25 ? "warm" : faceMetrics.smileRate > 0.08 ? "neutral" : "flat")
          : null,
        blink_rate:      typeof faceMetrics.blinkRate === "number"
          ? (faceMetrics.blinkRate > 30 ? "nervous (high)" : faceMetrics.blinkRate < 8 ? "suppressed (low)" : "normal")
          : null,
        brow_engagement: typeof faceMetrics.browEngagement === "number"
          ? (faceMetrics.browEngagement > 0.12 ? "animated" : faceMetrics.browEngagement > 0.05 ? "moderate" : "frozen")
          : null,
        look_away_rate:  typeof faceMetrics.lookAwayRate === "number"
          ? (faceMetrics.lookAwayRate > 0.3 ? "frequent" : faceMetrics.lookAwayRate > 0.12 ? "occasional" : "minimal")
          : null,
        note: "Measured from webcam. Strong eye contact, warm smile rate, and animated brows support confidence_score and presence. Nervous blink rate or frequent look-aways should lower confidence_score. Brow engagement reflects emotional investment.",
      }
    : null;

  // Candidate profile context: rich all-history profile takes precedence over shallow prev_score fallback
  const profileContext = userProfile?.llmContext?.length
    ? { candidate_coaching_profile: userProfile.llmContext }
    : prevScore != null
    ? {
        candidate_history: {
          prev_score: prevScore,
          ...(prevImprovementThemeKeys?.length ? { prev_improvement_areas: prevImprovementThemeKeys } : {}),
          note: prevImprovementThemeKeys?.length
            ? "Previously struggled with these areas. Acknowledge improvement if present; do not re-flag if resolved."
            : "Use trajectory_note to acknowledge whether score improved vs last attempt.",
        },
      }
    : {};

  // Extract acoustic + IBM signals to ground the AI's vocal/language coaching
  const dm = (deliveryMetrics ?? {}) as any;
  const acoustics = (dm.acoustics ?? {}) as any;
  const prosody   = (dm.prosody ?? {}) as any;

  const pitchRangeHz    = acoustics.pitchRange ?? acoustics.pitch_range ?? prosody.pitchRange ?? null;
  const monotoneScore   = acoustics.monotoneScore ?? prosody.monotoneScore ?? null;
  const energyVariation = acoustics.energyVariation ?? acoustics.energy_variation ?? null;
  const avgPauseMs      = dm.avgPauseMs ?? dm.avg_pause_ms ?? null;
  const longPauseCount  = dm.longPauseCount ?? dm.long_pause_count ?? null;
  const wpm             = dm.wpm ?? null;

  // IBM text-derived signals (computed client-side from transcript)
  const hedgingDensity      = dm.hedgingDensity ?? null;
  const cognitiveMarkers    = dm.cognitiveMarkers ?? null;
  const behavioralPhrases   = dm.behavioralPhraseCount ?? null;
  const fragmentationRatio  = dm.fragmentationRatio ?? null;

  const acousticContext = (
    pitchRangeHz !== null || monotoneScore !== null || energyVariation !== null ||
    avgPauseMs !== null || wpm !== null || hedgingDensity !== null
  ) ? {
    note: "Use these measured signals to ground coaching on vocal_engagement, response_control, and confidence_score. Do not contradict them.",
    ...(wpm !== null            ? { speaking_pace_wpm: wpm } : {}),
    ...(pitchRangeHz !== null   ? { pitch_range_hz: round1(pitchRangeHz), pitch_note: pitchRangeHz < 70 ? "narrow — flat delivery" : pitchRangeHz > 140 ? "wide — dynamic delivery" : "moderate range" } : {}),
    ...(monotoneScore !== null  ? { monotone_score: round1(monotoneScore), monotone_note: monotoneScore >= 6.5 ? "high monotony — vocal variety is low" : monotoneScore <= 3.5 ? "low monotony — good vocal variety" : "moderate" } : {}),
    ...(energyVariation !== null ? { energy_variation: round1(energyVariation), energy_note: energyVariation < 0.8 ? "low amplitude variation — delivery lacks emphasis contrast" : energyVariation > 2.0 ? "high variation — energy is inconsistent" : "healthy range" } : {}),
    ...(avgPauseMs !== null     ? { avg_pause_ms: Math.round(avgPauseMs) } : {}),
    ...(longPauseCount !== null ? { long_pause_count: longPauseCount, long_pause_note: longPauseCount >= 3 ? "multiple long pauses detected — signals hesitation" : "minimal long pauses" } : {}),
  } : null;

  const ibmContext = (hedgingDensity !== null || cognitiveMarkers !== null) ? {
    note: "These are measured from the transcript. Reference specific counts in coaching when relevant.",
    ...(hedgingDensity !== null     ? { hedging_per_100_words: round1(hedgingDensity), hedging_note: hedgingDensity >= 4.0 ? "above threshold — weakens ownership language" : "within normal range" } : {}),
    ...(cognitiveMarkers !== null   ? { cognitive_complexity_markers: cognitiveMarkers, cognitive_note: cognitiveMarkers === 0 ? "no tradeoff/reasoning language detected" : cognitiveMarkers >= 3 ? "strong reasoning depth" : "some analytical depth present" } : {}),
    ...(behavioralPhrases !== null  ? { behavioral_ownership_phrases: behavioralPhrases } : {}),
    ...(fragmentationRatio !== null ? { fragmentation_ratio: round1(fragmentationRatio), fragmentation_note: fragmentationRatio > 0.35 ? "high — answer structure is fragmented" : "acceptable" } : {}),
  } : null;

  return JSON.stringify(
    {
      framework,
      job_description: jobDesc ?? "",
      question: question ?? "",
      transcript,
      filler_analysis: {
        total_fillers: fillerStats.total,
        word_count: fillerStats.wordCount,
        fillers_per_100_words: round1(fillerStats.fillersPer100Words),
      },
      delivery_metrics: deliveryMetrics ?? null,
      ...(acousticContext ? { acoustic_signals: acousticContext } : {}),
      ...(ibmContext ? { language_signals: ibmContext } : {}),
      ...(presenceSignals ? { presence_signals: presenceSignals } : {}),
      ...profileContext,
      grading_instructions: {
        score_scale: "All scores are 1.0 to 10.0 with decimals allowed.",
        communication_score_definition:
          "clarity, sequencing, signposting, and ease of following the answer",
        confidence_score_definition:
          "ownership language vs hedging, hesitation, and assertiveness",
        relevance_rules: [
          "Judge relevance primarily against the interview question.",
          "If the candidate answers only part of a multi-part question, completeness should fall meaningfully.",
          "If the answer sounds polished but misses the actual question, relevance should stay low.",
        ],
        answer_lists: {
          communication_evidence: "2 to 4 short snippets or concrete paraphrases",
          confidence_evidence: "2 to 4 short snippets or concrete paraphrases",
          strengths: "3 to 5 answer-specific items",
          improvements: "1 to 4 answer-specific items. Only list genuine observed weaknesses. Do not invent improvements.",
          missed_opportunities: "0 to 2 items. Only include if there are concrete gaps worth naming. Leave empty for strong answers.",
        },
        better_answer_target: "120 to 180 words",
      },
    },
    null,
    2
  );
}

// -------------------------
// JSON schema builders
// -------------------------

function baseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      score: { type: "number" },
      communication_score: { type: "number" },
      confidence_score: { type: "number" },
      communication_evidence: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: { type: "string" },
      },
      confidence_evidence: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: { type: "string" },
      },
      confidence_explanation: { type: "string" },
      relevance: {
        type: "object",
        additionalProperties: false,
        properties: {
          answered_question: { type: "boolean" },
          relevance_score: { type: "number" },
          directness_score: { type: "number" },
          completeness_score: { type: "number" },
          off_topic_score: { type: "number" },
          missed_parts: {
            type: "array",
            maxItems: 6,
            items: { type: "string" },
          },
          relevance_explanation: { type: "string" },
        },
        required: [
          "answered_question",
          "relevance_score",
          "directness_score",
          "completeness_score",
          "off_topic_score",
          "missed_parts",
          "relevance_explanation",
        ],
      },
      strengths: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: { type: "string" },
      },
      improvements: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: { type: "string" },
      },
      missed_opportunities: {
        type: "array",
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            why: { type: "string" },
            add_sentence: { type: "string" },
          },
          required: ["label", "why", "add_sentence"],
        },
      },
      better_answer: { type: "string" },
    },
    required: [
      "score",
      "communication_score",
      "confidence_score",
      "communication_evidence",
      "confidence_evidence",
      "confidence_explanation",
      "relevance",
      "strengths",
      "improvements",
      "missed_opportunities",
      "better_answer",
    ],
  };
}

function buildSchema(framework: EvaluationFramework) {
  const base = baseSchema();

  if (framework === "public_speaking") {
    return {
      ...base,
      properties: {
        ...base.properties,
        public_speaking: {
          type: "object",
          additionalProperties: false,
          properties: {
            hook_impact: { type: "number" },
            structure: { type: "number" },
            vocal_variety: { type: "number" },
            clarity: { type: "number" },
            audience_connection: { type: "number" },
            confidence_presence: { type: "number" },
          },
          required: ["hook_impact", "structure", "vocal_variety", "clarity", "audience_connection", "confidence_presence"],
        },
        delivery_archetype: { type: "string" },
        archetype_coaching: { type: "string" },
        speaking_strengths: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
        speaking_improvements: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
      },
      required: [
        ...(base.required as string[]),
        "public_speaking", "delivery_archetype", "archetype_coaching", "speaking_strengths", "speaking_improvements",
      ],
    };
  }

  if (framework === "networking_pitch") {
    return {
      ...base,
      properties: {
        ...base.properties,
        networking_pitch: {
          type: "object",
          additionalProperties: false,
          properties: {
            hook_strength: { type: "number" },
            clarity_of_ask: { type: "number" },
            credibility: { type: "number" },
            conciseness: { type: "number" },
            memorability: { type: "number" },
          },
          required: ["hook_strength", "clarity_of_ask", "credibility", "conciseness", "memorability"],
        },
        pitch_style: { type: "string" },
        pitch_coaching: { type: "string" },
        pitch_strengths: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
        pitch_improvements: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
      },
      required: [
        ...(base.required as string[]),
        "networking_pitch", "pitch_style", "pitch_coaching", "pitch_strengths", "pitch_improvements",
      ],
    };
  }

  if (framework === "star") {
    return {
      ...base,
      properties: {
        ...base.properties,
        star: {
          type: "object",
          additionalProperties: false,
          properties: {
            situation: { type: "number" },
            task: { type: "number" },
            action: { type: "number" },
            result: { type: "number" },
          },
          required: ["situation", "task", "action", "result"],
        },
        star_evidence: {
          type: "object",
          additionalProperties: false,
          properties: {
            situation: {
              type: "array",
              maxItems: 2,
              items: { type: "string" },
            },
            task: {
              type: "array",
              maxItems: 2,
              items: { type: "string" },
            },
            action: {
              type: "array",
              maxItems: 2,
              items: { type: "string" },
            },
            result: {
              type: "array",
              maxItems: 2,
              items: { type: "string" },
            },
          },
          required: ["situation", "task", "action", "result"],
        },
        star_missing: {
          type: "array",
          maxItems: 4,
          items: {
            type: "string",
            enum: ["situation", "task", "action", "result"],
          },
        },
        star_advice: {
          type: "object",
          additionalProperties: false,
          properties: {
            situation: { type: "string" },
            task: { type: "string" },
            action: { type: "string" },
            result: { type: "string" },
          },
          required: ["situation", "task", "action", "result"],
        },
      },
      required: [...base.required, "star", "star_evidence", "star_missing", "star_advice"],
    };
  }

  if (framework === "technical_explanation") {
    return {
      ...base,
      properties: {
        ...base.properties,
        technical_explanation: {
          type: "object",
          additionalProperties: false,
          properties: {
            technical_clarity: { type: "number" },
            technical_accuracy: { type: "number" },
            structure: { type: "number" },
            depth: { type: "number" },
            practical_reasoning: { type: "number" },
          },
          required: [
            "technical_clarity",
            "technical_accuracy",
            "structure",
            "depth",
            "practical_reasoning",
          ],
        },
        technical_strengths: {
          type: "array",
          minItems: 2,
          maxItems: 4,
          items: { type: "string" },
        },
        technical_improvements: {
          type: "array",
          minItems: 2,
          maxItems: 4,
          items: { type: "string" },
        },
      },
      required: [
        ...base.required,
        "technical_explanation",
        "technical_strengths",
        "technical_improvements",
      ],
    };
  }

  return {
    ...base,
    properties: {
      ...base.properties,
      experience_depth: {
        type: "object",
        additionalProperties: false,
        properties: {
          experience_depth: { type: "number" },
          specificity: { type: "number" },
          tool_fluency: { type: "number" },
          business_impact: { type: "number" },
          example_quality: { type: "number" },
        },
        required: [
          "experience_depth",
          "specificity",
          "tool_fluency",
          "business_impact",
          "example_quality",
        ],
      },
      experience_strengths: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: { type: "string" },
      },
      experience_improvements: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: { type: "string" },
      },
    },
    required: [
      ...base.required,
      "experience_depth",
      "experience_strengths",
      "experience_improvements",
    ],
  };
}

// -------------------------
// Normalization
// -------------------------

function normalizeBaseFeedback(json: any): BaseFeedbackJSON {
  return {
    score: toScore1dp(json.score, 5.0, 1, 10),
    communication_score: toScore1dp(json.communication_score, 5.0, 1, 10),
    confidence_score: toScore1dp(json.confidence_score, 5.0, 1, 10),
    communication_evidence: ensureStringArray(json.communication_evidence, 2, 4, [
      "The answer had some structure but could be easier to follow.",
      "Clearer signposting would improve flow.",
    ]),
    confidence_evidence: ensureStringArray(json.confidence_evidence, 2, 4, [
      "Some ownership language was present.",
      "There was some hesitation or hedging.",
    ]),
    confidence_explanation: isNonEmptyString(json.confidence_explanation)
      ? json.confidence_explanation.trim()
      : "Confidence evidence was limited.",
    relevance: {
      answered_question: Boolean(json?.relevance?.answered_question),
      relevance_score: toScore1dp(json?.relevance?.relevance_score, 5.0, 1, 10),
      directness_score: toScore1dp(json?.relevance?.directness_score, 5.0, 1, 10),
      completeness_score: toScore1dp(json?.relevance?.completeness_score, 5.0, 1, 10),
      off_topic_score: toScore1dp(json?.relevance?.off_topic_score, 5.0, 1, 10),
      missed_parts: ensureStringArray(json?.relevance?.missed_parts, 0, 6),
      relevance_explanation: isNonEmptyString(json?.relevance?.relevance_explanation)
        ? json.relevance.relevance_explanation.trim()
        : "Relevance analysis was unavailable.",
    },
    missed_opportunities: ensureMissedOpportunities(json.missed_opportunities),
    strengths: ensureStringArray(json.strengths, 3, 5, [
      "The answer included at least some relevant substance.",
      "There was some attempt at structure.",
      "Parts of the response showed ownership or familiarity.",
    ]),
    improvements: ensureStringArray(json.improvements, 3, 5, [
      "Add more specific detail tied directly to the question.",
      "Make the answer easier to follow with clearer sequencing.",
      "Close with clearer impact, takeaway, or reasoning.",
    ]),
    better_answer: isNonEmptyString(json.better_answer)
      ? json.better_answer.trim()
      : "A stronger answer would be more specific, more structured, and more directly tied to the question.",
  };
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
        : "Add more context.",
      task: isNonEmptyString(json?.star_advice?.task)
        ? json.star_advice.task.trim()
        : "Clarify the goal or responsibility.",
      action: isNonEmptyString(json?.star_advice?.action)
        ? json.star_advice.action.trim()
        : "Explain exactly what you did.",
      result: isNonEmptyString(json?.star_advice?.result)
        ? json.star_advice.result.trim()
        : "State the outcome and impact.",
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
      "The answer showed partial familiarity with the topic.",
    ]),
    technical_improvements: ensureStringArray(json?.technical_improvements, 2, 4, [
      "Add more concrete technical detail.",
      "Explain the reasoning more clearly and practically.",
    ]),
  };
}

function validatePublicSpeakingFeedback(obj: any): obj is PublicSpeakingFeedbackJSON {
  if (!validateBaseFeedbackShape(obj)) return false;
  if (!isPlainObject(obj.public_speaking)) return false;
  for (const k of ["hook_impact", "structure", "vocal_variety", "clarity", "audience_connection", "confidence_presence"] as const) {
    const v = obj.public_speaking[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 10) return false;
  }
  if (!isNonEmptyString(obj.delivery_archetype)) return false;
  if (!isNonEmptyString(obj.archetype_coaching)) return false;
  if (!Array.isArray(obj.speaking_strengths) || obj.speaking_strengths.length < 2 || obj.speaking_strengths.length > 4) return false;
  if (!obj.speaking_strengths.every(isNonEmptyString)) return false;
  if (!Array.isArray(obj.speaking_improvements) || obj.speaking_improvements.length < 2 || obj.speaking_improvements.length > 4) return false;
  if (!obj.speaking_improvements.every(isNonEmptyString)) return false;
  return true;
}

function normalizePublicSpeakingFeedback(json: any): PublicSpeakingFeedbackJSON {
  const base = normalizeBaseFeedback(json);
  return {
    ...base,
    public_speaking: {
      hook_impact: toScore1dp(json?.public_speaking?.hook_impact, 0, 0, 10),
      structure: toScore1dp(json?.public_speaking?.structure, 0, 0, 10),
      vocal_variety: toScore1dp(json?.public_speaking?.vocal_variety, 0, 0, 10),
      clarity: toScore1dp(json?.public_speaking?.clarity, 0, 0, 10),
      audience_connection: toScore1dp(json?.public_speaking?.audience_connection, 0, 0, 10),
      confidence_presence: toScore1dp(json?.public_speaking?.confidence_presence, 0, 0, 10),
    },
    delivery_archetype: isNonEmptyString(json?.delivery_archetype) ? json.delivery_archetype.trim() : "The Lecturer",
    archetype_coaching: isNonEmptyString(json?.archetype_coaching) ? json.archetype_coaching.trim() : "Focus on varying your vocal pitch and pace to keep listeners engaged.",
    speaking_strengths: ensureStringArray(json?.speaking_strengths, 2, 4, ["Some relevant content was included.", "The delivery showed effort."]),
    speaking_improvements: ensureStringArray(json?.speaking_improvements, 2, 4, ["Strengthen your opening hook.", "Add a clear closing statement."]),
  };
}

function validateNetworkingPitchFeedback(obj: any): obj is NetworkingPitchFeedbackJSON {
  if (!validateBaseFeedbackShape(obj)) return false;
  if (!isPlainObject(obj.networking_pitch)) return false;
  for (const k of ["hook_strength", "clarity_of_ask", "credibility", "conciseness", "memorability"] as const) {
    const v = obj.networking_pitch[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 10) return false;
  }
  if (!isNonEmptyString(obj.pitch_style)) return false;
  if (!isNonEmptyString(obj.pitch_coaching)) return false;
  if (!Array.isArray(obj.pitch_strengths) || obj.pitch_strengths.length < 2 || obj.pitch_strengths.length > 4) return false;
  if (!obj.pitch_strengths.every(isNonEmptyString)) return false;
  if (!Array.isArray(obj.pitch_improvements) || obj.pitch_improvements.length < 2 || obj.pitch_improvements.length > 4) return false;
  if (!obj.pitch_improvements.every(isNonEmptyString)) return false;
  return true;
}

function normalizeNetworkingPitchFeedback(json: any): NetworkingPitchFeedbackJSON {
  const base = normalizeBaseFeedback(json);
  return {
    ...base,
    networking_pitch: {
      hook_strength: toScore1dp(json?.networking_pitch?.hook_strength, 0, 0, 10),
      clarity_of_ask: toScore1dp(json?.networking_pitch?.clarity_of_ask, 0, 0, 10),
      credibility: toScore1dp(json?.networking_pitch?.credibility, 0, 0, 10),
      conciseness: toScore1dp(json?.networking_pitch?.conciseness, 0, 0, 10),
      memorability: toScore1dp(json?.networking_pitch?.memorability, 0, 0, 10),
    },
    pitch_style: isNonEmptyString(json?.pitch_style) ? json.pitch_style.trim() : "The Wanderer",
    pitch_coaching: isNonEmptyString(json?.pitch_coaching) ? json.pitch_coaching.trim() : "Lead with a specific ask so the listener knows exactly how to help you.",
    pitch_strengths: ensureStringArray(json?.pitch_strengths, 2, 4, ["Some relevant content was included.", "The delivery showed confidence."]),
    pitch_improvements: ensureStringArray(json?.pitch_improvements, 2, 4, ["Sharpen your opening hook.", "State your ask more clearly."]),
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
      "The answer showed partial familiarity with the work.",
    ]),
    experience_improvements: ensureStringArray(json?.experience_improvements, 2, 4, [
      "Add more concrete examples.",
      "Show stronger specificity and business relevance.",
    ]),
  };
}

// -------------------------
// Deterministic calibration
// -------------------------

function deliveryPenalty(deliveryMetrics: any, fillerStats: ReturnType<typeof countFillers>) {
  let penalty = 0;

  const fillersPer100 = fillerStats.fillersPer100Words;
  if (fillersPer100 >= 12) penalty += 0.6;
  else if (fillersPer100 >= 8) penalty += 0.35;
  else if (fillersPer100 >= 5) penalty += 0.15;

  const avgPauseMs =
    typeof deliveryMetrics?.avgPauseMs === "number"
      ? deliveryMetrics.avgPauseMs
      : typeof deliveryMetrics?.avg_pause_ms === "number"
      ? deliveryMetrics.avg_pause_ms
      : null;

  if (typeof avgPauseMs === "number") {
    if (avgPauseMs >= 1800) penalty += 0.35;
    else if (avgPauseMs >= 1200) penalty += 0.2;
  }

  return round1(Math.min(1.2, penalty));
}

function computeHeadlineScore(
  framework: EvaluationFramework,
  normalized: AnyFeedbackJSON,
  fillerStats: ReturnType<typeof countFillers>,
  deliveryMetrics: any
) {
  const relevanceAvg = round1(
    (normalized.relevance.relevance_score +
      normalized.relevance.directness_score +
      normalized.relevance.completeness_score) / 3
  );

  const deliveryAvg = round1(
    (normalized.communication_score + normalized.confidence_score) / 2
  );

  const penalty = deliveryPenalty(deliveryMetrics, fillerStats);

  // raw is always overwritten below — no default seed
  let raw: number;

  if (framework === "star") {
    const n = normalized as StarFeedbackJSON;
    const starAvg = round1(
      (n.star.situation + n.star.task + n.star.action + n.star.result) / 4
    );

    raw =
      starAvg * 0.64 +
      relevanceAvg * 0.22 +
      deliveryAvg * 0.14 -
      penalty;

    return round1(clamp(raw, 1, 10));
  }

  if (framework === "technical_explanation") {
    const n = normalized as TechnicalFeedbackJSON;
    const techAvg = round1(
      (n.technical_explanation.technical_clarity +
        n.technical_explanation.technical_accuracy +
        n.technical_explanation.structure +
        n.technical_explanation.depth +
        n.technical_explanation.practical_reasoning) / 5
    );

    raw =
      techAvg * 0.66 +
      relevanceAvg * 0.20 +
      deliveryAvg * 0.14 -
      penalty;

    return round1(clamp(raw, 1, 10));
  }

  if (framework === "public_speaking") {
    const n = normalized as PublicSpeakingFeedbackJSON;
    const ps = n.public_speaking;
    const psAvg = round1(
      (ps.hook_impact + ps.structure + ps.vocal_variety + ps.clarity + ps.audience_connection + ps.confidence_presence) / 6
    );

    raw = psAvg * 0.72 + deliveryAvg * 0.28 - penalty;

    return round1(clamp(raw, 1, 10));
  }

  if (framework === "networking_pitch") {
    const n = normalized as NetworkingPitchFeedbackJSON;
    const np = n.networking_pitch;
    const npAvg = round1(
      (np.hook_strength + np.clarity_of_ask + np.credibility + np.conciseness + np.memorability) / 5
    );

    raw = npAvg * 0.75 + deliveryAvg * 0.25 - penalty;

    return round1(clamp(raw, 1, 10));
  }

  const n = normalized as ExperienceFeedbackJSON;
  const expAvg = round1(
    (n.experience_depth.experience_depth +
      n.experience_depth.specificity +
      n.experience_depth.tool_fluency +
      n.experience_depth.business_impact +
      n.experience_depth.example_quality) / 5
  );

  raw =
    expAvg * 0.66 +
    relevanceAvg * 0.20 +
    deliveryAvg * 0.14 -
    penalty;

  return round1(clamp(raw, 1, 10));
}

function applyDeterministicCalibration(
  framework: EvaluationFramework,
  normalized: AnyFeedbackJSON,
  fillerStats: ReturnType<typeof countFillers>,
  deliveryMetrics: any
): AnyFeedbackJSON {
  const score = computeHeadlineScore(framework, normalized, fillerStats, deliveryMetrics);
  return {
    ...normalized,
    score,
    communication_score: toScore1dp(normalized.communication_score, 5.0, 1, 10),
    confidence_score: toScore1dp(normalized.confidence_score, 5.0, 1, 10),
  };
}



// -------------------------
// Model call
// -------------------------

async function callFeedbackModel(args: {
  client: OpenAI;
  framework: EvaluationFramework;
  jobDesc: string;
  question: string;
  transcript: string;
  deliveryMetrics: any;
  faceMetrics: any;
  eslMode: boolean;
  fillerStats: ReturnType<typeof countFillers>;
  prevScore?: number | null;
  prevImprovementThemeKeys?: string[] | null;
  userProfile?: UserCoachingProfile | null;
}) {
  const { client, framework, jobDesc, question, transcript, deliveryMetrics, faceMetrics, eslMode, fillerStats, prevScore, prevImprovementThemeKeys, userProfile } = args;

  const schema = buildSchema(framework);
  const system = buildSystemMessage(framework, eslMode);
  const user = buildUserMessage({
    framework,
    jobDesc,
    question,
    transcript,
    deliveryMetrics,
    faceMetrics,
    fillerStats,
    prevScore,
    prevImprovementThemeKeys,
    userProfile,
  });

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const retryNote =
      attempt === 1
        ? ""
        : "\n\nRetry note: your prior response failed validation. Return schema-compliant JSON only.";

// IMPORTANT: keep strict json_schema here.
// Do not switch this to plain text output or the parser will become unreliable.

const resp = await client.responses.create({
  model: "gpt-4.1-mini",
  temperature: 0,
  max_output_tokens: 2200,
  input: [
    {
      role: "system",
      content: [{ type: "input_text", text: system }],
    },
    {
      role: "user",
      content: [{ type: "input_text", text: user + retryNote }],
    },
  ],
  text: {
    format: {
      type: "json_schema",
      name: "feedback_response",
      strict: true,
      schema,
    } as any,
  },
});

const text = getResponseText(resp);
let parsed = tryParseJson(text);

if (!parsed && text) {
  const candidate = extractFirstJsonObject(text);
  if (candidate) parsed = tryParseJson(candidate);
}

// Final fallback for SDK variants that may expose parsed output directly
if (!parsed && typeof (resp as any)?.output_parsed === "object" && (resp as any).output_parsed !== null) {
  parsed = (resp as any).output_parsed;
}

if (parsed && typeof parsed === "object") {
  return { parsed, rawText: text };
}

 logError("feedback_parse_attempt_failed", {
  framework,
  attempt,
  raw: text.slice(0, 1200),
  hasOutputText: typeof (resp as any)?.output_text === "string",
  hasOutputParsed: typeof (resp as any)?.output_parsed === "object" && (resp as any).output_parsed !== null,
});
  }

  return { parsed: null, rawText: "" };
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

  try {
    const cl = req.headers.get("content-length");
    if (cl && Number(cl) > 40_000) {
      return new Response(JSON.stringify({ error: "PAYLOAD_TOO_LARGE" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const jobDesc = typeof body.jobDesc === "string" ? body.jobDesc : "";
    const question = typeof body.question === "string" ? body.question : "";
    const transcript = typeof body.transcript === "string" ? body.transcript : "";
    const deliveryMetrics = body.deliveryMetrics ?? null;
    const faceMetrics = (body.faceMetrics && typeof body.faceMetrics === "object") ? body.faceMetrics : null;
    const eslMode = body.eslMode === true;
    const prevScore = typeof body.prevScore === "number" ? body.prevScore : null;
    const prevAttemptCount = typeof body.prevAttemptCount === "number" ? body.prevAttemptCount : null;
    const prevImprovementThemeKeys = Array.isArray(body.prevImprovementThemeKeys) ? body.prevImprovementThemeKeys as string[] : null;
    // Accept a pre-computed UserCoachingProfile from the client (built from full history)
    const userProfile: UserCoachingProfile | null =
      body.userProfile && typeof body.userProfile === "object" && typeof body.userProfile.llmContext === "string"
        ? (body.userProfile as UserCoachingProfile)
        : null;

    const evaluationFramework: EvaluationFramework =
      body.evaluationFramework === "technical_explanation"
        ? "technical_explanation"
        : body.evaluationFramework === "experience_depth"
        ? "experience_depth"
        : body.evaluationFramework === "public_speaking"
        ? "public_speaking"
        : body.evaluationFramework === "networking_pitch"
        ? "networking_pitch"
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

    // Minimum word count - ambient audio / accidental phrases shouldn't be scored
    const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 15) {
      return new Response(
        JSON.stringify({
          error: "RESPONSE_TOO_SHORT",
          message: `Your response was only ${wordCount} word${wordCount === 1 ? "" : "s"}. Interview answers need at least 15 words to score. Try recording a full answer.`,
          wordCount,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
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

      fillerStats.perFiller = Object.fromEntries(counts.entries());
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

    // ── Pre-flight relevance check ─────────────────────────────────────────
    // Cheap GPT call to verify the transcript is a genuine attempt to answer
    // the question before running the full (expensive) analysis.
    try {
      const relevanceCheck = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 60,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You detect whether a transcript is a genuine attempt to answer an interview/speaking question. " +
              "Respond with JSON only: {\"genuine\": boolean, \"reason\": string}. " +
              "Set genuine=false if the transcript is: a greeting, farewell, random ambient speech, " +
              "off-topic chatter, test audio, or clearly unrelated to the question topic. " +
              "Set genuine=true if the person is making any real attempt to address the question, even if badly.",
          },
          {
            role: "user",
            content: `Question: ${question}\n\nTranscript: ${transcript.slice(0, 600)}`,
          },
        ],
      });

      const raw = relevanceCheck.choices[0]?.message?.content ?? "{}";
      let parsed: { genuine?: boolean; reason?: string } = {};
      try { parsed = JSON.parse(raw); } catch {}

      if (parsed.genuine === false) {
        return new Response(
          JSON.stringify({
            error: "NOT_AN_ANSWER",
            message:
              "This recording doesn't appear to be a response to the question. " +
              "Make sure you're speaking directly into your mic and answering the question shown. " +
              (parsed.reason ? `(${parsed.reason})` : ""),
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch {
      // If the relevance check itself fails, allow through - don't block the user
    }

    const modelResult = await callFeedbackModel({
      client,
      framework: evaluationFramework,
      jobDesc,
      question,
      transcript,
      deliveryMetrics,
      faceMetrics,
      eslMode,
      fillerStats,
      prevScore,
      prevImprovementThemeKeys,
      userProfile,
    });

    if (!modelResult.parsed) {
      logError("feedback_non_json_output", {
        framework: evaluationFramework,
        raw: modelResult.rawText.slice(0, 1200),
      });

      return new Response(
        JSON.stringify({ error: "Model returned non-JSON output." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let normalized: AnyFeedbackJSON;

    if (evaluationFramework === "public_speaking") {
      normalized = normalizePublicSpeakingFeedback(modelResult.parsed);
      normalized = applyDeterministicCalibration(evaluationFramework, normalized, fillerStats, deliveryMetrics);
      if (!validatePublicSpeakingFeedback(normalized)) {
        return new Response(
          JSON.stringify({ error: "Model returned invalid public speaking feedback shape." }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } else if (evaluationFramework === "technical_explanation") {
      normalized = normalizeTechnicalFeedback(modelResult.parsed);
      normalized = applyDeterministicCalibration(
        evaluationFramework,
        normalized,
        fillerStats,
        deliveryMetrics
      );

      if (!validateTechnicalFeedback(normalized)) {
        return new Response(
          JSON.stringify({
            error: "Model returned invalid technical feedback shape.",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } else if (evaluationFramework === "experience_depth") {
      normalized = normalizeExperienceFeedback(modelResult.parsed);
      normalized = applyDeterministicCalibration(
        evaluationFramework,
        normalized,
        fillerStats,
        deliveryMetrics
      );

      if (!validateExperienceFeedback(normalized)) {
        return new Response(
          JSON.stringify({
            error: "Model returned invalid experience feedback shape.",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } else if (evaluationFramework === "networking_pitch") {
      normalized = normalizeNetworkingPitchFeedback(modelResult.parsed);
      normalized = applyDeterministicCalibration(evaluationFramework, normalized, fillerStats, deliveryMetrics);
      if (!validateNetworkingPitchFeedback(normalized)) {
        return new Response(
          JSON.stringify({ error: "Model returned invalid networking pitch feedback shape." }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      normalized = normalizeStarFeedback(modelResult.parsed);
      normalized = applyDeterministicCalibration(
        evaluationFramework,
        normalized,
        fillerStats,
        deliveryMetrics
      );

      if (!validateStarFeedback(normalized)) {
        return new Response(
          JSON.stringify({
            error: "Model returned invalid behavioral feedback shape.",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

        if (evaluationFramework !== "public_speaking") {
      normalized = composeRichFeedback({
        framework: evaluationFramework as "star" | "technical_explanation" | "experience_depth",
        jobDesc,
        question,
        transcript,
        deliveryMetrics,
        faceMetrics,
        eslMode,
        fillerStats,
        normalized,
        prevScore,
        prevAttemptCount,
      });
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
      communicationScore: normalized.communication_score,
      confidenceScore: normalized.confidence_score,
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