
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
  if (activeFeedbackJobs >= MAX_CONCURRENT_FEEDBACK) {
    return false;
  }
  activeFeedbackJobs += 1;
  return true;
}

function releaseFeedbackSlot() {
  activeFeedbackJobs = Math.max(0, activeFeedbackJobs - 1);
}

type FeedbackJSON = {
  score: number;
  communication_score: number;
  communication_evidence: string[];
confidence_evidence: string[];

  confidence_score: number;
  confidence_explanation: string;

    relevance: {
    answered_question: boolean;
    relevance_score: number;
    directness_score: number;
    completeness_score: number;
    off_topic_score: number;
    missed_parts: string[];
    relevance_explanation: string;
  };

  missed_opportunities: Array<{
  label: string;      // e.g. "Prioritization"
  why: string;        // 1 sentence tying to question/JD
  add_sentence: string; // exact sentence to add
}>;

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

  strengths: string[];
  improvements: string[];
  better_answer: string;
};

// (optional) response type you actually return after you append filler
type FeedbackResponse = FeedbackJSON & {
  filler: {
    total: number;
    words: number;
    per100: number;
    top: string[];
  };
  question_used: string[];
  question_missing: string[];
};



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

function validateFeedbackShape(obj: any): obj is FeedbackJSON {
  if (typeof obj !== "object" || obj === null) return false;

  // score
  if (typeof obj.score !== "number" || !Number.isFinite(obj.score)) return false;
  if (obj.score < 1 || obj.score > 10) return false;

  // communication score
  if (typeof obj.communication_score !== "number" || !Number.isFinite(obj.communication_score)) return false;
  if (obj.communication_score < 1 || obj.communication_score > 10) return false;

  // confidence score
if (typeof obj.confidence_score !== "number" || !Number.isFinite(obj.confidence_score)) return false;
if (obj.confidence_score < 1 || obj.confidence_score > 10) return false;

// confidence explanation
if (!isNonEmptyString(obj.confidence_explanation)) return false;

  // relevance
  if (typeof obj.relevance !== "object" || obj.relevance === null) return false;

  if (typeof obj.relevance.answered_question !== "boolean") return false;

  for (const k of ["relevance_score", "directness_score", "completeness_score", "off_topic_score"] as const) {
    const v = obj.relevance[k];
    if (typeof v !== "number" || !Number.isFinite(v)) return false;
    if (v < 1 || v > 10) return false;
  }

  if (!Array.isArray(obj.relevance.missed_parts)) return false;
  if (obj.relevance.missed_parts.length > 6) return false;
  if (!obj.relevance.missed_parts.every(isNonEmptyString)) return false;

  if (!isNonEmptyString(obj.relevance.relevance_explanation)) return false;

  // communication_evidence
  if (!Array.isArray(obj.communication_evidence)) return false;
  if (obj.communication_evidence.length < 2 || obj.communication_evidence.length > 4) return false;
  if (!obj.communication_evidence.every(isNonEmptyString)) return false;

  // confidence_evidence
  if (!Array.isArray(obj.confidence_evidence)) return false;
  if (obj.confidence_evidence.length < 2 || obj.confidence_evidence.length > 4) return false;
  if (!obj.confidence_evidence.every(isNonEmptyString)) return false;

  // STAR
  if (typeof obj.star !== "object" || obj.star === null) return false;

  const starKeys = ["situation", "task", "action", "result"] as const;
  for (const k of starKeys) {
  const v = obj.star[k];
  if (typeof v !== "number" || !Number.isFinite(v)) return false;
  if (v < 0 || v > 10) return false;

}

  // star_missing
const allowed = new Set(["situation", "task", "action", "result"]);
if (!Array.isArray(obj.star_missing)) return false;
if (obj.star_missing.length > 4) return false;
if (!obj.star_missing.every((x: any) => typeof x === "string" && allowed.has(x))) return false;


// star_evidence (optional but validated if present)
if (obj.star_evidence !== undefined) {
  if (typeof obj.star_evidence !== "object" || obj.star_evidence === null) return false;

  for (const k of ["situation", "task", "action", "result"]) {
    const arr = obj.star_evidence[k];
    if (!Array.isArray(arr)) return false;
    if (arr.length > 2) return false;
    if (!arr.every(isNonEmptyString)) return false;
  }
}


// star_advice
if (typeof obj.star_advice !== "object" || obj.star_advice === null) return false;

for (const k of ["situation", "task", "action", "result"]) {
  if (!isNonEmptyString(obj.star_advice[k])) return false;
}




  // strengths / improvements
  if (!Array.isArray(obj.strengths) || !Array.isArray(obj.improvements)) return false;
  if (obj.strengths.length < 3 || obj.strengths.length > 5) return false;
  if (obj.improvements.length < 3 || obj.improvements.length > 5) return false;
  if (!obj.strengths.every(isNonEmptyString)) return false;
  if (!obj.improvements.every(isNonEmptyString)) return false;

    // missed_opportunities (2–4 structured items)
if (!Array.isArray(obj.missed_opportunities)) return false;
if (obj.missed_opportunities.length > 4) return false;

for (const it of obj.missed_opportunities) {
  if (typeof it !== "object" || it === null) return false;
  if (!isNonEmptyString(it.label)) return false;
  if (!isNonEmptyString(it.why)) return false;
  if (!isNonEmptyString(it.add_sentence)) return false;
}
  // better_answer
  if (!isNonEmptyString(obj.better_answer)) return false;


  return true;
}


const FILLERS = [
  "um", "uh", "like", "you know", "sort of", "kind of", "basically", "literally",
  "actually", "honestly", "so", "right", "i mean", "okay", "well"
];

function countFillers(transcript: string) {
  const t = transcript.toLowerCase();

  // Count multi-word fillers with word boundaries-ish
  let total = 0;
  const perFiller: Record<string, number> = {};

  for (const phrase of FILLERS) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Allow spaces in multiword fillers, enforce boundaries around first/last word.
    const pattern = phrase.includes(" ")
      ? new RegExp(`\\b${escaped.replace(/\s+/g, "\\s+")}\\b`, "g")
      : new RegExp(`\\b${escaped}\\b`, "g");

    const matches = t.match(pattern);
    const n = matches ? matches.length : 0;
    perFiller[phrase] = n;
    total += n;
  }

  // Word count (rough) + fillers per 100 words
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const per100 = wordCount > 0 ? (total / wordCount) * 100 : 0;

  // A simple penalty signal you can use (optional)
  // (keep penalty small; STAR content matters more)
  const penaltyPoints = Math.min(2.0, per100 * 0.15); // e.g., 10 fillers/100 words => 1.5 pts penalty (cap at 2)

  return { total, perFiller, wordCount, fillersPer100Words: per100, penaltyPoints };
  

}
const STOP = new Set([
  "the","and","or","a","an","to","of","in","for","on","with","as","at","by","from","into","that","this",
  "is","are","was","were","be","been","being","it","its","their","our","your","you","we","they","i",
  "will","would","should","can","could","may","might","must","not","no","yes","but","if","then","than",
  "about","over","under","between","within","across","per","via","etc"
]);





function normalizeText(s: string) {
  return (s || "")
    .toLowerCase()
    // turn hyphens/underscores into spaces so "cross-functional" == "cross functional"
    .replace(/[-_]+/g, " ")
    // keep alphanumerics and a few symbols, replace others with space
    .replace(/[^a-z0-9\s/+.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}






function extractQuestionSignals(question: string) {
  const q = normalizeText(question);

  // Very small stoplist for question text
  const Q_STOP = new Set([
    ...STOP,
    "tell","me","about","describe","walk","through","time","when","an","a","the","and","or",
    "example","examples","give","share","how","what","why","your","you","i"
  ]);

  const words = q.split(" ").filter(Boolean).filter((w) => !Q_STOP.has(w));
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);

  // Universal “intent tags” that map questions to expectations
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

  // Also keep up to a few concrete nouns from the question (e.g., "deadline", "shortage", "roadmap")
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

  // Keep it tight so it feels intentional
  return {
    question_used: [...usedTags, ...usedTerms].slice(0, 8),
    question_missing: [...missingTags, ...missingTerms].slice(0, 5),
  };
}

export async function POST(req: Request) {
// ---- concurrency cap ----
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

// Basic JSON size guard via Content-Length when present
const cl = req.headers.get("content-length");
if (cl && Number(cl) > 40_000) {
  return new Response(
    JSON.stringify({ error: "PAYLOAD_TOO_LARGE" }),
    { status: 413, headers: { "Content-Type": "application/json" } }
  );
}

  try {
    const { jobDesc, question, transcript, deliveryMetrics } = await req.json();

    logInfo("feedback_delivery_metrics_received", {
  hasDeliveryMetrics: !!deliveryMetrics,
  deliveryMetricsKeys: deliveryMetrics && typeof deliveryMetrics === "object" ? Object.keys(deliveryMetrics) : [],
});

    // ---- individual field caps (cost control + memory safety) ----
if (typeof jobDesc === "string" && jobDesc.length > 12_000) {
  return new Response(JSON.stringify({ error: "JOBDESC_TOO_LONG" }), {
    status: 413,
    headers: { "Content-Type": "application/json" },
  });
}

if (typeof question === "string" && question.length > 800) {
  return new Response(JSON.stringify({ error: "QUESTION_TOO_LONG" }), {
    status: 413,
    headers: { "Content-Type": "application/json" },
  });
}

if (typeof transcript === "string" && transcript.length > 10_000) {
  return new Response(JSON.stringify({ error: "TRANSCRIPT_TOO_LONG" }), {
    status: 413,
    headers: { "Content-Type": "application/json" },
  });
}

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Transcript is too short." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const fillerStats = countFillers(transcript);
    // Prefer AssemblyAI filler/disfluency list if available
const aaiFillers = Array.isArray(deliveryMetrics?.fillers) ? deliveryMetrics.fillers : null;

if (aaiFillers && aaiFillers.length > 0) {
  // Override totals using vendor-derived disfluencies
  fillerStats.total = aaiFillers.length;

  // Estimate words if vendor provided words count; else keep transcript-derived wordCount
  if (typeof deliveryMetrics?.words === "number" && deliveryMetrics.words > 0) {
    fillerStats.wordCount = deliveryMetrics.words;
    fillerStats.fillersPer100Words = (fillerStats.total / fillerStats.wordCount) * 100;
  }

  // Build top fillers list by text
  const counts = new Map<string, number>();
  for (const f of aaiFillers) {
    const t = String(f?.text ?? "").toLowerCase().trim();
    if (!t) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, n]) => `${k} (${n})`);

  // Replace perFiller map for consistency downstream
  (fillerStats as any).perFiller = Object.fromEntries(counts.entries());
  // Replace topFillers source later by using fillerStats.perFiller
}

    const qa = computeQuestionAlignment(question ?? "", transcript);

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
  select: { id: true, freeAttemptsUsed: true, freeAttemptCap: true, subscriptionStatus: true },
});

if (!user) return new Response("Unauthorized", { status: 401 });

logInfo("feedback_request_started", {
  userId: user.id,
});

// ---- rate limit (per user + per IP) ----
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

// Choose the failing limiter if either fails (so the error resetMs is meaningful)
const rl = !rlUser.ok ? rlUser : !rlIp.ok ? rlIp : rlUser;

// Compute headers for both success + failure
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



    const prompt = `
You are an interview coach. Give feedback on the candidate's answer.

JOB DESCRIPTION:
${jobDesc ?? ""}

QUESTION:
${question ?? ""}

CANDIDATE ANSWER (TRANSCRIPT):
${transcript}

QUESTION RELEVANCE EVALUATION:
Judge whether the candidate actually answered the interview question being asked.

Evaluate:
- answered_question: true if the response substantially addresses the interviewer’s ask.
- relevance_score (1-10): overall relevance to the question asked.
- directness_score (1-10): how directly the candidate answered instead of circling around.
- completeness_score (1-10): how fully they addressed all parts of the question.
- off_topic_score (1-10): how off-topic the response was.
  - 1 = fully on-topic
  - 10 = highly off-topic
- missed_parts: list the specific parts of the question the candidate failed to answer.
- relevance_explanation: 1-2 sentences explaining whether the candidate answered the question directly and completely.

Important relevance rules:
- Judge relevance primarily against the QUESTION, not the job description.
- Multi-part questions must be graded strictly.
- If the candidate answers only one part of a multi-part question, completeness_score must be <= 5.
- If the answer is polished but does not actually answer what was asked, relevance_score must be <= 5.
- Distinguish between:
  - on-topic but incomplete
  - partially relevant
  - mostly off-topic
- If the candidate clearly avoids the interviewer’s ask, answered_question must be false.

FILLER WORD ANALYSIS (precomputed):
- total_fillers: ${fillerStats.total}
- words: ${fillerStats.wordCount}
- fillers_per_100_words: ${fillerStats.fillersPer100Words.toFixed(1)}


Use the filler word analysis to influence communication_score:

Guidelines:
- 0–3 fillers per 100 words → no penalty
- 4–7 fillers per 100 words → reduce communication_score by ~1 point
- 8–12 fillers per 100 words → reduce communication_score by ~2 points
- 13+ fillers per 100 words → reduce communication_score by ~3 points

Filler words should noticeably lower communication_score when frequent, but STAR content should still remain the primary driver of the overall score.

VOICE DELIVERY METRICS (from audio; may be null):
${deliveryMetrics ? JSON.stringify(deliveryMetrics) : "null"}

Use these delivery metrics to influence scoring (apply when metrics are present):
- If longPauseCount >= 2 OR maxPauseMs >= 1200:
  reduce confidence_score by ~1–2 points.
- If pauseCount >= 8 OR avgPauseMs >= 500:
  reduce communication_score by ~1 point.
- If longPauseCount >= 4:
  confidence_score must be <= 6 unless the transcript has very strong ownership language AND a clear measurable Result.
- Delivery metrics may adjust overall score by at most -1 total (they should not raise the score).
Grade STAR quality:
- situation/task/action/result are 0-10 based on clarity, specificity, and completeness.
- If an element is weak or missing, give it 0-3.

STAR scoring anchors (use these strictly):
0-2 = missing or extremely vague (no concrete detail)
3-4 = weak mention, generic, or unclear context
5 = average interview answer (basic explanation but limited specificity)
6 = solid detail but lacks measurable impact or clear ownership
7 = strong explanation with clear actions and context
8 = strong + includes measurable outcome or clear impact
9 = exceptional clarity + measurable impact + strong ownership language
10 = outstanding example with precise metrics, crisp structure, and clear impact
For each STAR sub-score, base it on a specific detail from the transcript. If none exists, score must be 0-2.

When unsure between two scores, choose the LOWER score unless the transcript clearly supports the higher one.



Scoring guidance:
- Overall score should be driven mainly by STAR quality (about 70% weight).
Overall score calibration (must follow):
- Compute STAR_avg = average of the four STAR subscores.
- Set overall score close to STAR_avg, rounded to the nearest whole number.
- communication_score and confidence_score may adjust the overall score by at most +/-1 total (combined).
- If STAR_avg is below 6, overall score must not exceed 6.
- Only give overall score 8+ if STAR_avg >= 7 AND the answer includes a clear result/impact.
- Only give 9–10 if STAR_avg >= 8.5 AND the result includes measurable impact.
- Treat scores 9–10 as rare: only assign them when the transcript includes at least one concrete metric AND a clear Result.
- If the Result is not measurable (no metric, no quantified impact, no before/after), overall score must be <= 7.


- communication_score (1-10) measures STRUCTURE + CLARITY only:
  - Clear sequencing (S→T→A→R flow), easy to follow, concise sentences, minimal rambling.
  - Good signposting ("First...", "Then...", "As a result..."), concrete nouns/verbs.
  - Use filler analysis to slightly reduce this score if high, but don't let fillers dominate.
  - Do NOT punish hedging/ownership language here (that belongs to confidence_score).

Also return "confidence_score" (1-10) based on ASSERTIVENESS + OWNERSHIP language only:
- Higher if the candidate uses direct ownership language ("I led", "I implemented", "I improved").
- Lower if the answer contains hedging ("maybe", "kind of", "sort of", "I think"), uncertainty, or excessive softeners.
- Filler words can lower confidence slightly, but only if they strongly signal uncertainty.
Confidence strictness (apply):
- If the transcript contains 3+ hedging phrases (e.g., "I think", "maybe", "kind of", "sort of", "hopefully", "pretty much"),
  confidence_score must be <= 6 unless there is strong repeated ownership language ("I led/I owned/I drove") AND a clear result.
- If fillers_per_100_words >= 8, reduce confidence_score by ~1 point (in addition to hedging effects).
- If fillers_per_100_words >= 13, reduce confidence_score by ~2 points.
- If the candidate never uses first-person ownership verbs (led/owned/drove/implemented/built/shipped/reduced/increased),
  confidence_score must be <= 5.


Confidence_score must be distinct from communication_score:
- communication_score = how clear/structured the answer is
- confidence_score = how decisive/owned the answer sounds

Hard separation rule (must follow):
- communication_score and confidence_score must not be justified using the same evidence.
- communication_score must be based ONLY on structure markers and sequencing (e.g., "First...", "Then...", "As a result...", clear STAR ordering).
- confidence_score must be based ONLY on ownership vs hedging language (e.g., "I led / I drove / I implemented" vs "maybe / kind of / I think").

Anchors (use these strictly):
Communication_score anchors:
- 9–10: clear STAR sequence + signposting + concise phrasing (easy to follow)
- 6–8: mostly structured but some rambling or missing signposts
- 3–5: unclear sequencing, jumps around, hard to follow
- 1–2: incoherent / extremely rambling / no structure

Confidence_score anchors:
- 9–10: strong ownership verbs + decisive framing + direct impact statements
- 6–8: some ownership but occasional hedging/softeners
- 3–5: frequent hedging/softeners, weak ownership language
- 1–2: highly uncertain, apologetic, or non-committal language dominates

If communication_score and confidence_score would be within 1 point, force them to differ by at least 2 points
UNLESS the transcript clearly shows BOTH strong signposted structure AND strong ownership language.


Also return "confidence_explanation" (1-2 sentences) explaining WHY the candidate received that confidence score.
Reference specific language patterns from the transcript (e.g., hedging, ownership, clarity, filler usage).



Also return "star_missing" listing any STAR components that are missing or too vague.
Only include values from: ["situation","task","action","result"].
If all are present, return [].

Be specific to THIS answer and THIS job description; do not give generic STAR tips.

For each STAR advice item, include a short label: "What you said:" followed by a 3–10 word quote from the transcript (verbatim).

Return STRICT JSON with this exact shape (no extra keys, no markdown):

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
  },

  "strengths": ["string"],
  "improvements": ["string"],
  "missed_opportunities": [
  { "label": "string", "why": "string", "add_sentence": "string" }
],
  "better_answer": "string",
}

Rules:
- strengths must be 3–5 items.
- Each strength must reference something specific the candidate said (a detail, metric, action, or outcome).
- Avoid generic advice like "good structure" or "clear communication".

- relevance.missed_parts must be 0–6 items.
- relevance_explanation must be 1–2 sentences and reference the actual question asked.
- off_topic_score uses this direction:
  - 1–3 = strongly on-topic
  - 4–6 = somewhat incomplete or drifting
  - 7–10 = mostly off-topic or did not answer the question
- directness_score must be lower if the candidate takes too long to get to the point.
- completeness_score must reflect whether all parts of the interviewer’s question were answered.

- improvements must be 3–5 items.
- Each improvement must identify a specific missing detail or weak part of the answer and explain how to improve it in one sentence.
- Avoid generic suggestions like "be more specific".

- Each strength or improvement must explicitly reference a phrase, action, or outcome from the transcript so the feedback is clearly tied to this answer.
- At least 1 strength and 1 improvement must explicitly reference a STAR element by name (Situation/Task/Action/Result) and what was strong/missing in this answer.
- When a strength or improvement references a STAR element, it must include one short supporting quote taken from star_evidence for that same element (if available).


- star_missing must be 0–4 items.

- better_answer must be 120–180 words.
- Rewrite the candidate's answer into a stronger STAR response using the SAME situation they described.
- Do not invent a completely new story.
- Preserve the candidate's scenario but improve clarity, structure, and measurable impact.
- If metrics are missing, suggest a realistic outcome rather than fabricating a precise number.

- star_advice: 1–2 sentences per field, must reference something they said OR say "Not mentioned".
- strengths: each item must include evidence from the transcript in quotes (3–12 words), e.g. 'Used ownership: "I led the rollout"'.
- improvements: each item must include (a) evidence quote from transcript OR say "Not present", and (b) a concrete fix (what to add/change in 1 sentence).
- Add a "missed_opportunities" array (2–4 items): each item must reference (a) a question intent tag OR JD keyword concept, and (b) the exact sentence they should add.
- better_answer must reuse 2–4 exact nouns/phrases from the transcript (verbatim) to keep it grounded in their story.
- If the transcript lacks specifics (metrics/tools/stakes), the better_answer must introduce ONLY plausible metrics phrased as ranges or proxies (e.g. "reduced cycle time ~10–15%") and label them as estimates.
- missed_opportunities must be 2–4 items.
- Each missed_opportunity must reference either a question intent tag OR an important JD keyword concept.
- Each item must include the exact sentence the candidate could add.
- communication_evidence must be 2–4 verbatim quotes (3–12 words each) showing STRUCTURE or CLARITY
  (signposting, sequencing, concise phrasing). If none exist, include "No clear signposting" and set
  communication_score <= 5.
- confidence_evidence must be 2–4 verbatim quotes (3–12 words each) showing OWNERSHIP or HEDGING.
  If there is little ownership language, confidence_score <= 5.
- communication_score must IGNORE ownership/hedging language. It is only about clarity + structure.
- confidence_score must IGNORE structure/clarity. It is only about ownership + assertiveness language.
- If communication_score and confidence_score would be within 1 point of each other, force them to differ by at least 2 points
  unless the transcript clearly has BOTH strong structure AND strong ownership.
- missed_opportunities must be 2–4 items.
- Each missed_opportunity must have:
  - label: 1–3 words (e.g., "Metrics", "Prioritization", "Stakeholder alignment")
  - why: 1 sentence referencing the QUESTION or JOB DESCRIPTION
  - add_sentence: a single sentence the candidate can add verbatim (no bullets).
- star_evidence: include 1–2 short verbatim quotes (3–12 words each) from the transcript that demonstrate each STAR element.
- If no clear quote exists for a STAR element, return an empty array [] for that field.


Tone guidelines:
- Write feedback like a professional interview coach: specific, concise, and direct.
- Avoid generic phrases such as "good job", "nice answer", or "try to".
- Each bullet should feel tailored to the candidate's answer, not like a template.

Do not include any extra text outside JSON.
`.trim();

   const resp = await client.responses.create({
  model: "gpt-4.1-mini",
  input: prompt,
  temperature: 0,
});

const text = resp.output_text?.trim() ?? "";

// 1) Try direct parse
let json: any = tryParseJson(text);

// 2) If that fails, extract the first JSON object and parse it
if (!json) {
  const candidate = extractFirstJsonObject(text);
  if (candidate) json = tryParseJson(candidate);
}

if (!json) {
  return new Response(
    JSON.stringify({ error: "Model returned non-JSON output.", raw: text }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}

json.communication_evidence = Array.isArray(json.communication_evidence)
  ? json.communication_evidence.filter(isNonEmptyString).slice(0, 4)
  : [];

json.confidence_evidence = Array.isArray(json.confidence_evidence)
  ? json.confidence_evidence.filter(isNonEmptyString).slice(0, 4)
  : [];

if (json.communication_evidence.length < 2) {
  json.communication_evidence = [
    ...json.communication_evidence,
    "No clear signposting detected",
    "Sequencing was hard to follow",
  ].slice(0, 2);
}

if (json.confidence_evidence.length < 2) {
  json.confidence_evidence = [
    ...json.confidence_evidence,
    "Limited ownership language detected",
    "Some hedging reduced assertiveness",
  ].slice(0, 2);
}

json.star_evidence ??= { situation: [], task: [], action: [], result: [] };

for (const k of ["situation", "task", "action", "result"]) {
  const arr = json.star_evidence?.[k];
  json.star_evidence[k] = Array.isArray(arr)
    ? arr.filter(isNonEmptyString).slice(0, 2)
    : [];
}

json.missed_opportunities = Array.isArray(json.missed_opportunities)
  ? json.missed_opportunities
      .filter((it: any) => typeof it === "object" && it !== null)
      .map((it: any) => ({
        label: isNonEmptyString(it.label) ? it.label : "Opportunity",
        why: isNonEmptyString(it.why) ? it.why : "Not provided.",
        add_sentence: isNonEmptyString(it.add_sentence)
          ? it.add_sentence
          : "Add one sentence clarifying impact.",
      }))
      .slice(0, 4)
  : [];

  json.relevance ??= {
  answered_question: false,
  relevance_score: 5,
  directness_score: 5,
  completeness_score: 5,
  off_topic_score: 5,
  missed_parts: [],
  relevance_explanation: "Relevance analysis was unavailable.",
};

json.relevance.answered_question = Boolean(json.relevance.answered_question);

for (const k of ["relevance_score", "directness_score", "completeness_score", "off_topic_score"] as const) {
  const v = Number(json.relevance[k]);
  json.relevance[k] = Number.isFinite(v) ? Math.max(1, Math.min(10, v)) : 5;
}

json.relevance.missed_parts = Array.isArray(json.relevance.missed_parts)
  ? json.relevance.missed_parts.filter(isNonEmptyString).slice(0, 6)
  : [];

if (!isNonEmptyString(json.relevance.relevance_explanation)) {
  json.relevance.relevance_explanation = "Relevance analysis was unavailable.";
}

// Optional: keep your validator as a safety net
if (!validateFeedbackShape(json)) {
  return new Response(
    JSON.stringify({ error: "Model returned invalid JSON shape.", parsed: json }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}

    // Ensure star_evidence always exists (safety default)
(json as any).star_evidence ??= {
  situation: [],
  task: [],
  action: [],
  result: [],
};

    if (!isPro) {
  await prisma.user.update({
    where: { id: user.id },
    data: { freeAttemptsUsed: { increment: 1 } },
  });
}



   return new Response(
  JSON.stringify({
    ...json,
    deliveryMetrics: deliveryMetrics ?? null,
    filler: {
      total: fillerStats.total,
      words: fillerStats.wordCount,
      per100: Number(fillerStats.fillersPer100Words.toFixed(1)),
      top: topFillers,
    },

    question_used: qa.question_used,
    question_missing: qa.question_missing,


  }),
  {
    status: 200,
    headers: {
  "Content-Type": "application/json",
  "X-RateLimit-Remaining": String(remaining),
  "X-RateLimit-Reset-Ms": String(resetMs),
},
  }
);

} catch (err: any) {
  return new Response(
    JSON.stringify({ error: err?.message ?? "Unknown error" }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
} finally {
  releaseFeedbackSlot(); // 👈 ALWAYS release
}
 
}
