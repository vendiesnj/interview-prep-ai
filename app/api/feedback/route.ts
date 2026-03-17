import OpenAI from "openai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { rateLimitFixedWindow } from "@/app/lib/rateLimit";
import { logInfo, logError } from "@/app/lib/logger";
import { composeRichFeedback } from "@/app/lib/feedback/composer";

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

function buildSystemMessage(framework: EvaluationFramework) {
  const common = `
You are an interview evaluator for a production SaaS coaching product.

You must return valid JSON only and exactly match the provided schema.

Scoring calibration rules:
- Be honest, somewhat strict, and discriminating.
- A decent first attempt usually lands in the upper 5s or low-to-mid 6s.
- Scores above 8.0 should be uncommon and must feel clearly earned.
- Scores above 9.0 should be very rare.
- Polished but vague answers should not score highly.
- Use one decimal place when useful.
- Behavioral questions must use STAR.
- Technical questions must NOT use STAR.
- Experience questions must NOT use STAR.

Evidence rules:
- Use concise, specific evidence.
- communication_evidence and confidence_evidence must not be duplicates.
- strengths and improvements must be answer-specific, not generic.
- better_answer must preserve the same story/topic but improve it.

Output rules:
- Return exactly one JSON object
- Do not wrap it in markdown
- Do not add commentary before or after
- Do not use code fences
- Do not omit required keys
- If unsure, still return the required schema with best-effort values
`.trim();

  if (framework === "star") {
    return `${common}

Behavioral rules:
- Evaluate Situation, Task, Action, and Result.
- Overall quality should be driven mostly by STAR completeness, ownership, and specificity.
- Weak or missing Result should keep the answer from scoring like a strong answer.
- If STAR average is below 6.0, the answer should not look strong overall.
`;
  }

  if (framework === "technical_explanation") {
    return `${common}

Technical explanation rules:
- Do NOT use STAR framing.
- Evaluate clarity, accuracy, structure, depth, and practical reasoning.
- Buzzword-heavy but shallow answers should stay in the 5s or low 6s.
`;
  }

  return `${common}

Experience depth rules:
- Do NOT use STAR framing.
- Evaluate depth, specificity, tool fluency, business impact, and example quality.
- Generic claims without concrete examples should not score highly.
`;
}

function buildUserMessage(args: {
  framework: EvaluationFramework;
  jobDesc: string;
  question: string;
  transcript: string;
  deliveryMetrics: any;
  fillerStats: ReturnType<typeof countFillers>;
}) {
  const { framework, jobDesc, question, transcript, deliveryMetrics, fillerStats } = args;

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
          improvements: "3 to 5 answer-specific items",
          missed_opportunities: "2 to 4 answer-specific items",
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
        minItems: 3,
        maxItems: 5,
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
    score: toScore1dp(json.score, 5.8, 1, 10),
    communication_score: toScore1dp(json.communication_score, 5.8, 1, 10),
    confidence_score: toScore1dp(json.confidence_score, 5.8, 1, 10),
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
      relevance_score: toScore1dp(json?.relevance?.relevance_score, 5.8, 1, 10),
      directness_score: toScore1dp(json?.relevance?.directness_score, 5.8, 1, 10),
      completeness_score: toScore1dp(json?.relevance?.completeness_score, 5.8, 1, 10),
      off_topic_score: toScore1dp(json?.relevance?.off_topic_score, 5.8, 1, 10),
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

  let raw = 5.8;

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

    let capped = raw;

    if (!n.relevance.answered_question) capped = Math.min(capped, 5.8);
    if (n.relevance.completeness_score < 5.8) capped = Math.min(capped, 6.1);
    if (starAvg < 6.0) capped = Math.min(capped, 6.4);
    if (n.star.result < 5.5) capped = Math.min(capped, 7.7);
    if (n.star.action < 5.8) capped = Math.min(capped, 6.8);
    if (n.star_missing.length >= 2) capped = Math.min(capped, 6.5);

    return round1(clamp(capped, 1, 10));
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

    let capped = raw;

    if (!n.relevance.answered_question) capped = Math.min(capped, 5.8);
    if (n.relevance.completeness_score < 5.8) capped = Math.min(capped, 6.2);
    if (n.technical_explanation.depth < 5.8) capped = Math.min(capped, 6.8);
    if (n.technical_explanation.technical_accuracy < 6.0) capped = Math.min(capped, 6.6);
    if (n.technical_explanation.practical_reasoning < 5.8) capped = Math.min(capped, 6.9);

    return round1(clamp(capped, 1, 10));
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

  let capped = raw;

  if (!n.relevance.answered_question) capped = Math.min(capped, 5.8);
  if (n.relevance.completeness_score < 5.8) capped = Math.min(capped, 6.2);
  if (n.experience_depth.specificity < 5.8) capped = Math.min(capped, 6.6);
  if (n.experience_depth.example_quality < 5.8) capped = Math.min(capped, 6.8);
  if (n.experience_depth.business_impact < 5.5) capped = Math.min(capped, 7.2);

  return round1(clamp(capped, 1, 10));
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
    communication_score: toScore1dp(normalized.communication_score, 5.8, 1, 10),
    confidence_score: toScore1dp(normalized.confidence_score, 5.8, 1, 10),
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
  fillerStats: ReturnType<typeof countFillers>;
}) {
  const { client, framework, jobDesc, question, transcript, deliveryMetrics, fillerStats } = args;

  const schema = buildSchema(framework);
  const system = buildSystemMessage(framework);
  const user = buildUserMessage({
    framework,
    jobDesc,
    question,
    transcript,
    deliveryMetrics,
    fillerStats,
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

    const modelResult = await callFeedbackModel({
      client,
      framework: evaluationFramework,
      jobDesc,
      question,
      transcript,
      deliveryMetrics,
      fillerStats,
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

    if (evaluationFramework === "technical_explanation") {
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

        normalized = composeRichFeedback({
      framework: evaluationFramework,
      jobDesc,
      question,
      transcript,
      deliveryMetrics,
      fillerStats,
      normalized,
    });


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