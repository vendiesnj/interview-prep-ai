
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

  confidence_score: number;
  confidence_explanation: string;


  star: {
    situation: number;
    task: number;
    action: number;
    result: number;
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
  keywords_missing: string[];
  keywords_used:string[]
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

  // better_answer
  if (!isNonEmptyString(obj.better_answer)) return false;

    // keywords_used
  if (!Array.isArray(obj.keywords_used)) return false;
  if (obj.keywords_used.length > 12) return false;
  if (!obj.keywords_used.every(isNonEmptyString)) return false;

  // keywords_missing
  if (!Array.isArray(obj.keywords_missing)) return false;
  if (obj.keywords_missing.length > 8) return false;
  if (!obj.keywords_missing.every(isNonEmptyString)) return false;

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

// JD-generic words that frequently appear but are not differentiating "keywords"
const JD_GENERIC_STOP = new Set([
  // HR/legal/boilerplate & low-signal terms
  "required","requirements","requirement","duties","duty","responsibilities","responsibility",
  "ensure","ensures","ensuring","including","include","includes","etc",
  "employee","employees","personnel","organization","company","values",
  "work","working","environment","workplace","work environment","work area",
  "all levels","entire","while performing",
  "policies","procedures","housekeeping","regulatory","compliance","comply",
  "training","train","assist","participate","team meetings","special projects","miscellaneous",
  "us citizen","citizen",
  "vision","color vision",
  "secure","well maintained","maintained","clean"
]);



function normalizeText(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/+.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenBad(t: string) {
  return STOP.has(t) || JD_GENERIC_STOP.has(t);
}

function phraseBad(phrase: string) {
  if (JD_GENERIC_STOP.has(phrase)) return true;
  // very common low-signal phrases
  if (
    phrase === "work environment" ||
    phrase === "workplace environment" ||
    phrase === "job duties" ||
    phrase === "job requirements"
  ) return true;
  return false;
}

function pruneJobDescForKeywords(jobDesc: string) {
  const raw = (jobDesc || "").replace(/\r/g, "");

  // Prefer the responsibilities section; stop before qualifications/extra duties.
  const startIdx = (() => {
    const m =
      raw.match(/Essential or Primary\s*\/\s*Key Responsibilities[:\s]/i) ??
      raw.match(/Key Responsibilities[:\s]/i) ??
      raw.match(/Responsibilities[:\s]/i);
    return m?.index ?? 0;
  })();

  const endIdx = (() => {
    const cut = [
      raw.search(/Minimum Required Qualifications[:\s]/i),
      raw.search(/Qualifications[:\s]/i),
      raw.search(/Additional Duties\s*\/\s*Responsibilities[:\s]/i),
      raw.search(/Additional Duties[:\s]/i),
    ].filter((n) => n >= 0);
    return cut.length ? Math.min(...cut) : raw.length;
  })();

  const slice = raw.slice(startIdx, endIdx);

  // Drop lines that are legal/HR/physical requirements or generic fluff.
  const lines = slice
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/must be\b/i.test(l))
    .filter((l) => !/\bus citizen\b/i.test(l))
    .filter((l) => !/\bcolor vision\b/i.test(l))
    .filter((l) => !/\bwork area\b/i.test(l))
    .filter((l) => !/\bhousekeeping\b/i.test(l))
    .filter((l) => !/\bpolicies\/procedures\b/i.test(l))
    .filter((l) => !/\bclean\b.*\bmaintained\b/i.test(l));

  return lines.join("\n");
}



function extractKeywords(jobDesc: string) {
  const pruned = pruneJobDescForKeywords(jobDesc);
  const text = normalizeText(pruned);
  const words = text.split(" ").filter(Boolean);

  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);

  const candidates = new Map<string, number>();

  // Universal “head nouns” that appear across domains (keeps phrases meaningful)
  const GOOD_HEADS = new Set([
    "strategy","planning","analysis","reporting","operations","execution","delivery","performance","quality",
    "pipeline","growth","research","design","architecture","development","implementation","integration",
    "forecasting","budgeting","optimization","testing","deployment","security","automation","framework",
    "stakeholders","customers","clients","systems","tools","metrics","kpis","roadmap","pricing","retention"
  ]);

  function isMostlyLetters(s: string) {
    return /^[a-z][a-z0-9\/\-']*$/i.test(s);
  }

  function isJunkyPhrase(p: string) {
    if (phraseBad(p)) return true;

    // Ban phrases that are just generic verb-led fragments
    if (/^(perform|ensure|maintain|provide|support|assist|participate|bring|abide|contribute|keep)\b/i.test(p)) return true;

    // Ban obvious HR/legal/physical requirement language
    if (/\b(us citizen|color vision|work environment|work area|housekeeping|policies|procedures|all levels|miscellaneous)\b/i.test(p)) return true;

    const parts = p.split(" ").filter(Boolean);
    const badCount = parts.filter((x) => tokenBad(x)).length;
    if (badCount >= Math.ceil(parts.length / 2)) return true;

    return false;
  }

  // Bigrams: keep only if both tokens look real and phrase isn't junky
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i], b = words[i + 1];
    if (![a, b].every((t) => t.length >= 3 && isMostlyLetters(t) && !tokenBad(t))) continue;

    const bigram = `${a} ${b}`;
    if (isJunkyPhrase(bigram)) continue;

    const boost = GOOD_HEADS.has(b) ? 3 : 0;
    candidates.set(bigram, (candidates.get(bigram) ?? 0) + 3 + boost);
  }

  // Trigrams: only if last token is a good “head noun” (prevents garbage fragments)
  for (let i = 0; i < words.length - 2; i++) {
    const a = words[i], b = words[i + 1], c = words[i + 2];
    if (![a, b, c].every((t) => t.length >= 3 && isMostlyLetters(t) && !tokenBad(t))) continue;

    const trigram = `${a} ${b} ${c}`;
    if (isJunkyPhrase(trigram)) continue;

    const boost = GOOD_HEADS.has(c) ? 5 : 0;
    if (boost === 0) continue; // require a meaningful head noun for trigrams
    candidates.set(trigram, (candidates.get(trigram) ?? 0) + 4 + boost);
  }

  // Unigrams: keep only if repeated OR domain-ish acronyms OR long technical terms
  for (const w of words) {
    const freq = counts.get(w) ?? 0;
    if (w.length < 4) continue;
    if (tokenBad(w)) continue;
    if (!isMostlyLetters(w)) continue;

    const isAcr = /^(erp|mrp|kpi|okr|api|sla|etl|aws|gcp|crm|sql|prisma|stripe)$/i.test(w);
    if (!isAcr && freq < 2 && w.length < 9) continue;

    candidates.set(w, (candidates.get(w) ?? 0) + 1);
  }

  // Sort and de-dupe: drop unigrams covered by phrases
  const sorted = [...candidates.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);

  const keep: string[] = [];
  for (const k of sorted) {
    if (keep.length >= 20) break;

    if (k.includes(" ")) {
      keep.push(k);
      continue;
    }

    if (keep.some((p) => p.includes(` ${k} `) || p.startsWith(`${k} `) || p.endsWith(` ${k}`))) continue;
    keep.push(k);
  }

  return keep;
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

function computeKeywordUsage(jobDesc: string, transcript: string) {
  const jd = normalizeText(jobDesc);
  const tr = normalizeText(transcript);

  const keywords = extractKeywords(jobDesc);
  

  const used: string[] = [];
  const missing: string[] = [];

  for (const k of keywords) {
    const hit = (() => {
  if (tr.includes(k)) return true;

  // For phrases, allow close variants: words appear in order with small gaps
  if (k.includes(" ")) {
    const parts = k.split(" ").filter(Boolean).slice(0, 4);
    const pattern = parts.map((p) => `\\b${p}\\b`).join("(?:\\W+\\w+){0,3}\\W+");
    const re = new RegExp(pattern, "i");
    return re.test(tr);
  }

  // For single words, require whole-word match (avoid partials)
  const re = new RegExp(`\\b${k}\\b`, "i");
  return re.test(tr);
})();

if (hit) used.push(k);
else missing.push(k);
  }

  return {
    keywords_used: used.slice(0, 12),
    keywords_missing: missing.slice(0, 8),
  };
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
    const { jobDesc, question, transcript } = await req.json();

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
    const kw = computeKeywordUsage(jobDesc ?? "", transcript);
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

FILLER WORD ANALYSIS (precomputed):
- total_fillers: ${fillerStats.total}
- words: ${fillerStats.wordCount}
- fillers_per_100_words: ${fillerStats.fillersPer100Words.toFixed(1)}

Use the filler word analysis to slightly influence the communication_score.
Frequent filler words should lower communication_score slightly, but should not dominate the overall score.



Grade STAR quality:
- situation/task/action/result are 0-10 based on clarity, specificity, and completeness.
- If an element is weak or missing, give it 0-3.
STAR scoring anchors (use these strictly):
0-2 = missing or extremely vague (no concrete detail)
3-4 = mentioned but unclear (generic, lacks context)
5-6 = present with some specifics (at least 1 concrete detail)
7-8 = strong and specific (clear details + logical flow)
9-10 = exceptional (highly specific + measurable impact + crisp phrasing)

For each STAR sub-score, base it on a specific detail from the transcript. If none exists, score must be 0-2.

When unsure between two scores, choose the LOWER score unless the transcript clearly supports the higher one.



Scoring guidance:
- Overall score should be driven mainly by STAR quality (about 70% weight).
- communication_score (1-10) measures STRUCTURE + CLARITY only:
  - Clear sequencing (S→T→A→R flow), easy to follow, concise sentences, minimal rambling.
  - Good signposting ("First...", "Then...", "As a result..."), concrete nouns/verbs.
  - Use filler analysis to slightly reduce this score if high, but don't let fillers dominate.
  - Do NOT punish hedging/ownership language here (that belongs to confidence_score).

Also return "confidence_score" (1-10) based on ASSERTIVENESS + OWNERSHIP language only:
- Higher if the candidate uses direct ownership language ("I led", "I implemented", "I improved").
- Lower if the answer contains hedging ("maybe", "kind of", "sort of", "I think"), uncertainty, or excessive softeners.
- Filler words can lower confidence slightly, but only if they strongly signal uncertainty.

Confidence_score must be distinct from communication_score:
- communication_score = how clear/structured the answer is
- confidence_score = how decisive/owned the answer sounds

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
  "confidence_explanation": "string",

  "star": {
    "situation": 0-10,
    "task": 0-10,
    "action": 0-10,
    "result": 0-10
  },

  "star_missing": ["situation" | "task" | "action" | "result"],

  "star_advice": {
    "situation": "string",
    "task": "string",
    "action": "string",
    "result": "string"
  },

  "strengths": ["string"],
  "improvements": ["string"],
  "better_answer": "string",
  "keywords_used": ["string"],
  "keywords_missing": ["string"]
}

Rules:
- strengths must be 3–5 items.
- improvements must be 3–5 items.
- keywords_missing must be 0–8 items.
- star_missing must be 0–4 items.
- better_answer must be 120–180 words.
- star_advice: 1–2 sentences per field, must reference something they said OR say "Not mentioned".
- Include "What you said:" + a 3–10 word verbatim quote inside each star_advice field.
- keywords_used must be 0–12 items (keywords from the job description that ARE present in the transcript).
- keywords_missing must be 0–8 items (important keywords from the job description NOT present in the transcript).
- Prefer concrete terms (tools, metrics, processes) over generic words.





Do not include any extra text outside JSON.
`.trim();

    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0,
    });

    const text = resp.output_text?.trim() ?? "";

    // 1) Try direct parse
    let json = tryParseJson(text);

    // 2) If that fails, extract JSON and parse it
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


    // 3) Validate shape
    if (!validateFeedbackShape(json)) {
      return new Response(
        JSON.stringify({ error: "Model returned invalid JSON shape.", raw: text, parsed: json }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!isPro) {
  await prisma.user.update({
    where: { id: user.id },
    data: { freeAttemptsUsed: { increment: 1 } },
  });
}



   return new Response(
  JSON.stringify({
    ...json,
    filler: {
      total: fillerStats.total,
      words: fillerStats.wordCount,
      per100: Number(fillerStats.fillersPer100Words.toFixed(1)),
      top: topFillers,
    },
    keywords_used: kw.keywords_used,
    keywords_missing: kw.keywords_missing,
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
