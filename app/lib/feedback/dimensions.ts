/**
 * Dimension Scoring Engine
 *
 * Computes 7 named competency dimensions from the full signal set.
 * This is the analytical core — archetypes are derived from dimension patterns,
 * not the other way around. Dimensions also power the IBM-competitive metrics:
 * lexical richness, cognitive complexity, behavioral indicators, question-intent weighting.
 *
 * Dimensions:
 *  1. Narrative Clarity       — coherence, structure, through-line
 *  2. Evidence Quality        — specificity, proof, outcome strength
 *  3. Ownership & Agency      — first-person language, behavioral indicators, hedging
 *  4. Vocal Engagement        — pitch variety, energy, expressiveness
 *  5. Response Control        — pacing, fluency, answer length
 *  6. Cognitive Depth         — complexity markers, lexical richness, reasoning quality
 *  7. Presence & Confidence   — eye contact, expressiveness, overall confidence signal
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type DimensionKey =
  | "narrative_clarity"
  | "evidence_quality"
  | "ownership_agency"
  | "vocal_engagement"
  | "response_control"
  | "cognitive_depth"
  | "presence_confidence"
  | "audience_awareness";

export type DimensionScore = {
  key: DimensionKey;
  label: string;
  score: number;           // 0–10
  coaching: string;        // band-specific coaching note
  isStrength: boolean;     // score >= 7.0
  isGap: boolean;          // score < 5.5
  driverSignals: string[]; // top signals that moved this score
};

export type DimensionProfile = Record<DimensionKey, DimensionScore>;

/** Question intent shapes dimension weighting — same signals, different priorities */
export type QuestionIntent =
  | "behavioral"    // "tell me about a time…"
  | "technical"     // "explain how X works…"
  | "situational"   // "what would you do if…"
  | "motivational"  // "why do you want this role…"
  | "values"        // "what do you value most…"
  | "general";

/** IBM-aligned metrics surfaced alongside dimensions */
export type IBMMetrics = {
  lexicalRichnessScore: number;        // 0–10, type-token ratio normalized
  cognitiveComplexityScore: number;    // 0–10, tradeoff/nuance marker density
  behavioralIndicatorScore: number;    // 0–10, strong I-led/I-drove phrase count
  hedgingPenaltyScore: number;         // 0–10, 10 = no hedging, 0 = heavy hedging
  fragmentationScore: number;          // 0–10, 10 = fluent, 0 = fragmented
  answerLengthScore: number;           // 0–10, appropriateness for question type
  questionIntent: QuestionIntent;
};

/** All signals fed into the dimension engine */
export type DimensionInputSignals = {
  // Content scores (0–10)
  overall: number;
  communication: number;
  confidence: number;
  directness: number;
  completeness: number;
  answeredQuestion: boolean;
  starResult: number | null;
  techDepth: number | null;
  techClarity: number | null;
  expDepth: number | null;
  expImpact: number | null;
  expSpecificity: number | null;

  // Delivery scalars
  wpm: number | null;
  fillersPer100: number;
  wordCount: number;
  avgPauseMs: number | null;
  longPauseCount: number | null;
  monotoneScore: number | null;
  pitchRange: number | null;
  pitchStd: number | null;
  energyVariation: number | null;
  energyMean: number | null;
  tempoDynamics: number | null;

  // Ownership counts
  iCount: number;
  weCount: number;

  // Face / presence
  eyeContact: number | null;
  expressiveness: number | null;
  headStability: number | null;

  // Delivery categoricals
  structure: "strong" | "moderate" | "weak";
  ownership: "strong" | "moderate" | "soft";
  directnessLabel: "direct" | "delayed" | "wandering";
  specificity: "specific" | "mixed" | "generalized";
  outcomeStrength: "strong" | "moderate" | "weak";
  depthMode: "deep" | "adequate" | "thin";
  completenessLabel: "complete" | "partial";
  evidenceMode: "metrics_forward" | "example_forward" | "process_forward" | "generalized";
  fluency: "clean" | "slightly_disfluent" | "filler_heavy" | "fragmented";
  pace: "slow" | "controlled" | "fast" | "rushed";
  vocalDynamics: "flat" | "moderate" | "dynamic" | "erratic";
  energyProfile: "low" | "steady" | "engaging" | "inconsistent";
  cadenceStability: "stable" | "slightly_uneven" | "erratic";
  presenceSignal: "strong" | "moderate" | "low" | null;
  emphasisControl: "weak" | "moderate" | "strong";

  // New IBM / text-derived signals
  hedgingDensity: number;       // hedge phrases per 100 words
  fragmentationRatio: number;   // 0–1, ratio of fragmented/incomplete sentences
  lexicalTTR: number;           // 0–1, unique words / total words
  cognitiveMarkers: number;     // tradeoff/nuance markers per sentence
  behavioralPhraseCount: number; // count of strong I-led/I-drove phrases
  vocabularySophistication: number; // avg word length proxy (0–10)

  // Trajectory / arc signals (null when transcript too short < 50 words)
  ownershipGradient: number | null;   // −1..+1 (+ve = ownership language rising through answer)
  confidenceArc: number | null;       // −1..+1 (+ve = assertiveness increasing through answer)
  fillerRecovery: number | null;      // −1..+1 (+ve = filler density decreasing through answer)

  // Framework
  framework: "star" | "technical_explanation" | "experience_depth" | "public_speaking" | "networking_pitch";
  question: string;
};

// ── Utility helpers ────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** Convert categorical label to a numeric score */
const CAT: Record<string, number> = {
  strong: 8.5, moderate: 6.5, weak: 4.0, soft: 4.0,
  direct: 9.0, delayed: 6.5, wandering: 3.5,
  specific: 9.0, mixed: 6.5, generalized: 3.5,
  deep: 9.0, adequate: 6.5, thin: 3.5,
  complete: 9.0, partial: 4.5,
  clean: 9.5, slightly_disfluent: 6.5, filler_heavy: 3.0, fragmented: 1.5,
  controlled: 8.5, slow: 5.5, fast: 6.0, rushed: 2.5,
  dynamic: 9.0, flat: 2.5, erratic: 5.0,
  engaging: 9.0, steady: 6.5, low: 3.0, inconsistent: 5.0,
  stable: 9.0, slightly_uneven: 6.0,
  "strong-presence": 9.0, "moderate-presence": 6.5, "low-presence": 3.0,
  strong_emphasis: 9.0, moderate_emphasis: 6.5, weak_emphasis: 3.5,
  metrics_forward: 9.5, example_forward: 7.5, process_forward: 6.0,
};

function cat(v: string, suffix = ""): number {
  return CAT[v + suffix] ?? CAT[v] ?? 6.5;
}

/** Normalize hedging density (phrases/100 words) to 0–10 (10 = no hedging) */
function hedgingToScore(density: number): number {
  if (density <= 0.2) return 10;
  if (density <= 0.5) return 9;
  if (density <= 1.0) return 7.5;
  if (density <= 2.0) return 6;
  if (density <= 3.5) return 4;
  if (density <= 5.0) return 2.5;
  return 1;
}

/** Normalize TTR (0–1) to 0–10 */
function ttrToScore(ttr: number): number {
  if (ttr >= 0.55) return 10;
  if (ttr >= 0.45) return 8.5;
  if (ttr >= 0.38) return 7;
  if (ttr >= 0.30) return 5.5;
  if (ttr >= 0.22) return 4;
  return 1.0;
}

/** Normalize cognitive marker density (per sentence) to 0–10 */
function complexityToScore(markersPerSentence: number): number {
  if (markersPerSentence >= 0.25) return 10;
  if (markersPerSentence >= 0.15) return 8.5;
  if (markersPerSentence >= 0.08) return 7;
  if (markersPerSentence >= 0.04) return 5.5;
  if (markersPerSentence >= 0.01) return 4;
  return 1.0;
}

/** Normalize behavioral phrase count to 0–10 */
function behavioralToScore(count: number): number {
  if (count >= 5) return 10;
  if (count >= 4) return 9;
  if (count >= 3) return 7.5;
  if (count >= 2) return 6;
  if (count >= 1) return 4.5;
  return 1.0;
}

/** Normalize fragmentation ratio (0–1) to 0–10 (10 = fluent) */
function fragmentationToScore(ratio: number): number {
  if (ratio <= 0.03) return 10;
  if (ratio <= 0.08) return 8.5;
  if (ratio <= 0.15) return 7;
  if (ratio <= 0.25) return 5;
  if (ratio <= 0.35) return 3;
  return 1.0;
}

/** Score answer length appropriateness (words, adjusted by question intent) */
function lengthToScore(wordCount: number, intent: QuestionIntent): number {
  // Behavioral/situational: 150–250 words ideal
  // Technical: 100–200 words ideal
  // Motivational/values: 80–160 words ideal
  const [lo, hi] = intent === "technical" ? [80, 220]
    : intent === "motivational" || intent === "values" ? [60, 180]
    : [120, 270];
  if (wordCount >= lo && wordCount <= hi) return 10;
  if (wordCount < lo * 0.6) return 1.5;   // extremely short — no substance possible
  if (wordCount > hi * 1.5) return 1.5;   // extremely long — no discipline
  if (wordCount < lo) return clamp(6 + ((wordCount - lo * 0.6) / (lo * 0.4)) * 4, 1.5, 10);
  return clamp(10 - ((wordCount - hi) / (hi * 0.5)) * 6.5, 1.5, 10);
}

// ── Question intent detection ─────────────────────────────────────────────────

export function detectQuestionIntent(question: string): QuestionIntent {
  const q = question.toLowerCase();
  if (/tell me about a time|describe a situation|give me an example|walk me through a time/.test(q)) return "behavioral";
  if (/explain|how does|what is|describe the (process|difference|architecture|system)|walk me through how/.test(q)) return "technical";
  if (/what would you do|how would you handle|if you were|imagine you|hypothetically/.test(q)) return "situational";
  if (/why do you want|why this (role|company|position)|what draws you|what excites you|why are you/.test(q)) return "motivational";
  if (/what do you value|what matters to you|what kind of (culture|team|environment)|what are your/.test(q)) return "values";
  return "general";
}

// ── IBM metric extraction from transcript ─────────────────────────────────────

export const HEDGE_RE = /\b(i think|i feel like|i guess|i suppose|maybe|perhaps|kind of|sort of|sort-of|kinda|somewhat|basically|essentially|you know|like,|i mean,|probably|it seems like|i believe|i'm not sure but|i would say)\b/gi;

export const COMPLEXITY_RE = /\b(on the other hand|the tradeoff|the trade-off|i considered|however|that said|the risk was|but i decided|weighed|the challenge was|in hindsight|alternatively|despite|although|even though|the downside|the upside|the nuance|it depends on|the key tension|while also)\b/gi;

export const BEHAVIORAL_RE = /\b(i led|i drove|i owned|i built|i designed|i created|i launched|i managed|i implemented|i negotiated|i restructured|i identified|i solved|i fixed|i reduced|i increased|i improved|i delivered|i presented|i partnered with|i coordinated|i executed|i deployed)\b/gi;

export const STOP_WORDS = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","was","are","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","i","we","you","they","it","this","that","these","those","my","our","your","their","its","me","us","him","her","them"]);

export function extractIBMMetrics(transcript: string, wordCount: number, intent: QuestionIntent): IBMMetrics {
  const words = transcript.toLowerCase().split(/\s+/).filter(Boolean);
  const total = Math.max(words.length, 1);

  // Lexical richness (type-token ratio on content words)
  const contentWords = words.filter(w => !STOP_WORDS.has(w.replace(/[^a-z]/g, '')));
  const uniqueContent = new Set(contentWords.map(w => w.replace(/[^a-z]/g, ''))).size;
  const ttr = contentWords.length > 10 ? uniqueContent / contentWords.length : 0.35;

  // Counts
  const hedgeMatches = (transcript.match(HEDGE_RE) || []).length;
  const hedgeDensity = (hedgeMatches / total) * 100;

  const complexityMatches = (transcript.match(COMPLEXITY_RE) || []).length;
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 8);
  const markersPerSentence = sentences.length > 0 ? complexityMatches / sentences.length : 0;

  const behavioralMatches = (transcript.match(BEHAVIORAL_RE) || []).length;

  // Fragmentation: sentences under 5 words or trailing with dashes/ellipses
  const fragmented = sentences.filter(s => {
    const sw = s.trim().split(/\s+/);
    return sw.length < 5 || /—|\.\.\.|…/.test(s);
  }).length;
  const fragmentRatio = sentences.length > 0 ? fragmented / sentences.length : 0;

  // Vocabulary sophistication: avg length of content words (proxy for complexity)
  const avgWordLen = contentWords.length > 0 ? contentWords.reduce((a, w) => a + w.replace(/[^a-z]/g, '').length, 0) / contentWords.length : 4;
  const vocabSophistication = clamp((avgWordLen - 3) / 4 * 10, 0, 10);

  return {
    lexicalRichnessScore: ttrToScore(ttr),
    cognitiveComplexityScore: complexityToScore(markersPerSentence),
    behavioralIndicatorScore: behavioralToScore(behavioralMatches),
    hedgingPenaltyScore: hedgingToScore(hedgeDensity),
    fragmentationScore: fragmentationToScore(fragmentRatio),
    answerLengthScore: lengthToScore(wordCount, intent),
    questionIntent: intent,
  };
}

// ── Dimension weights by question intent ──────────────────────────────────────

type WeightMap = Record<DimensionKey, number>;

function getWeights(intent: QuestionIntent, framework?: string): WeightMap {
  const base: WeightMap = {
    narrative_clarity:  1.0,
    evidence_quality:   1.0,
    ownership_agency:   1.0,
    vocal_engagement:   1.0,
    response_control:   1.0,
    cognitive_depth:    1.0,
    presence_confidence: 1.0,
    audience_awareness: 1.0,
  };
  if (intent === "behavioral") {
    base.ownership_agency = 1.35;
    base.evidence_quality = 1.25;
    base.narrative_clarity = 1.15;
    base.audience_awareness = 0.9;
  } else if (intent === "technical") {
    base.cognitive_depth = 1.4;
    base.narrative_clarity = 1.2;
    base.evidence_quality = 1.1;
    base.audience_awareness = 0.85;
  } else if (intent === "situational") {
    base.cognitive_depth = 1.3;
    base.narrative_clarity = 1.2;
    base.ownership_agency = 1.1;
  } else if (intent === "motivational") {
    base.presence_confidence = 1.3;
    base.ownership_agency = 1.2;
    base.narrative_clarity = 1.1;
    base.audience_awareness = 1.15;
  } else if (intent === "values") {
    base.cognitive_depth = 1.25;
    base.presence_confidence = 1.2;
    base.narrative_clarity = 1.1;
    base.audience_awareness = 1.1;
  }
  // Framework-level overrides (context beats question intent for audience weighting)
  if (framework === "public_speaking") {
    base.audience_awareness = 1.4;
    base.vocal_engagement = 1.2;
    base.presence_confidence = 1.1;
    base.evidence_quality = 0.8;   // less about proof, more about delivery in presentations
  } else if (framework === "networking_pitch") {
    base.audience_awareness = 1.25;
    base.presence_confidence = 1.2;
  }
  return base;
}

// ── Coaching copy by dimension + score band ───────────────────────────────────

const COACHING: Record<DimensionKey, { strong: string; good: string; moderate: string; weak: string; critical: string }> = {
  narrative_clarity: {
    strong: "Your story has a clear through-line. The interviewer can follow the arc from start to finish without effort.",
    good: "The narrative holds together well. A slightly tighter opening sentence would make the through-line even cleaner.",
    moderate: "The story has the right ingredients but needs a cleaner structure. Try narrating it in one sentence before you start ('I did X which led to Y'), then build outward from there.",
    weak: "The answer circles before landing. Say the core of your story aloud in one sentence first, then add context. Right now the interviewer is waiting to understand the point.",
    critical: "The answer does not yet tell a coherent story. Write S-T-A-R on paper, say 'Situation:' out loud, and work through each section. The ideas are there; they need sequencing.",
  },
  evidence_quality: {
    strong: "Concrete, specific, and credible. The proof points make this answer stand out from generic responses.",
    good: "Good specificity overall. One more metric or named tool in your Result section would push this to excellent.",
    moderate: "The story is plausible but still relies on broad language. Add one concrete number (even a rough estimate) and the credibility jumps significantly.",
    weak: "The answer describes the shape of the work but not the substance. Name one specific metric, constraint, or tool. 'Reduced reporting time' is weak; 'cut weekly reporting from 6 hours to 45 minutes' is strong.",
    critical: "Without concrete proof points, this answer cannot score above average. Every strong interview answer has at least one named number, tool, or observable change. Add that before your next attempt.",
  },
  ownership_agency: {
    strong: "Strong first-person ownership throughout. The interviewer clearly understands what you personally drove.",
    good: "Clear personal ownership. Watch for 'we' slippage in your result section, which is where credit often diffuses unintentionally.",
    moderate: "Ownership is present but soft in places. Replace 'we worked on' with 'I led' and 'I drove'. The difference in how it lands with an interviewer is larger than it sounds.",
    weak: "The answer distributes credit too broadly. Start your next answer with 'I decided...' or 'I owned...' and that single change reshapes how the whole story reads.",
    critical: "This answer sounds like a team retrospective, not a personal story. Every action needs a first-person subject: 'I analyzed', 'I implemented', 'I drove'. Own your contribution explicitly.",
  },
  vocal_engagement: {
    strong: "Your voice is working with your content. Pitch variation and energy make the delivery dynamic and engaging.",
    good: "Good vocal variety overall. Add a slight pitch lift specifically at your result sentence, which is the moment that deserves the most emphasis.",
    moderate: "The delivery is flat in places. Focus on your result sentence: slow down, add a half-second pause before it, then lift your pitch slightly. That one moment changes how the whole answer is remembered.",
    weak: "Flat delivery is obscuring good content. When you reach your result, pause for a beat and let your voice lift slightly. Interviewers decide whether they heard something important based on vocal emphasis.",
    critical: "Both pitch and energy are flat throughout. In your next attempt, just change how you deliver the final sentence. Slow it down 30% and add emphasis. That is the only change needed right now.",
  },
  response_control: {
    strong: "Clean, controlled delivery. Pacing and fluency are working in your favor.",
    good: "Good control overall. Watch for filler clusters at transitions, which is where most disfluency occurs under pressure.",
    moderate: "Pacing and fluency have some rough patches. Deliberate pauses at transitions (S to T, T to A, A to R) eliminate fillers better than any other technique.",
    weak: "Filler words and pacing are interfering with the content. Replace every 'um' or 'uh' with a one-beat pause. Silence sounds more confident than a filler and gives you a moment to think.",
    critical: "Delivery control is the main barrier right now. Before your next attempt, record yourself saying just the result sentence with no fillers and controlled pace. That single sentence sets the tone for the whole answer.",
  },
  cognitive_depth: {
    strong: "The answer demonstrates sophisticated thinking. Tradeoffs, nuance, and clear reasoning are all present.",
    good: "Good analytical depth. One more acknowledged tradeoff or constraint would signal senior-level thinking to the interviewer.",
    moderate: "The answer shows competence but not yet analytical depth. Add one line acknowledging a tradeoff you navigated: 'The challenge was X, so I chose Y over Z because...'",
    weak: "The answer lacks the reasoning depth that separates strong candidates. Interviewers at senior levels look for: what you considered, why you chose one path, what the tradeoff was. Add one of those.",
    critical: "This answer reads as a summary of actions, not a demonstration of judgment. Add at least one sentence showing your reasoning process: what options you evaluated, what you decided against, and why.",
  },
  presence_confidence: {
    strong: "Strong on-camera presence. Eye contact and expressiveness are projecting genuine confidence.",
    good: "Good presence overall. Stay on camera during the result sentence, which is the moment eye contact matters most.",
    moderate: "Presence and confidence are adequate but not reinforcing the content. Try holding eye contact specifically during your strongest sentence. That single moment shifts how confident you appear.",
    weak: "Confidence signals are mixed. On video, where your eyes go shapes the impression more than your words. Hold the camera gaze through every key claim, especially when you are uncertain.",
    critical: "Low presence and confidence signals are working against strong content. On your next attempt, commit to sustained eye contact from your first sentence. It will feel uncomfortable at first, and that discomfort is the signal improving.",
  },
  audience_awareness: {
    strong: "Your delivery is calibrated to your listener. Energy, variety, and clarity all signal that you are thinking about how you are landing, not just what you are saying.",
    good: "Good listener awareness. One area to push further: vary your energy specifically at the moment you shift from setup to result. That contrast keeps attention.",
    moderate: "The delivery is present but not yet tuned to the listener. Think about where you want the audience to lean in — that moment needs a change in pace, pitch, or energy to signal that something important is happening.",
    weak: "The delivery reads as self-directed rather than audience-directed. Before your next attempt, pick one sentence in your answer that deserves emphasis and practice delivering it with a deliberate change in energy or pace.",
    critical: "Flat energy and monotone delivery are disconnecting the content from the listener. Record yourself and identify the sentence that should land hardest. In your next attempt, deliver that sentence differently from everything around it.",
  },
};

function getCoaching(key: DimensionKey, score: number): string {
  const c = COACHING[key];
  if (score >= 8.5) return c.strong;
  if (score >= 7.0) return c.good;
  if (score >= 5.5) return c.moderate;
  if (score >= 3.5) return c.weak;
  return c.critical;
}

// ── Vocal authority composite ─────────────────────────────────────────────────

/**
 * Composite metric combining pitch range, energy variation, WPM control, and
 * pause discipline into a single "vocal authority" score (0–10).
 * Returns null if no acoustic data is present.
 */
export function computeVocalAuthority(signals: {
  wpm: number | null;
  pitchRange: number | null;
  energyVariation: number | null;
  monotoneScore: number | null;
  avgPauseMs: number | null;
  longPauseCount: number | null;
}): number | null {
  const { wpm, pitchRange, energyVariation, monotoneScore, avgPauseMs, longPauseCount } = signals;

  // Need at least two acoustic signals to compute
  const hasSignals = [wpm, pitchRange, energyVariation, monotoneScore].filter(v => v !== null).length >= 2;
  if (!hasSignals) return null;

  // WPM authority curve: peak at 145-170 wpm
  const wpmScore = wpm !== null
    ? wpm < 80   ? 1.0   // barely intelligible crawl
    : wpm < 100  ? 2.5   // very slow — hesitant delivery
    : wpm < 120  ? 5.5
    : wpm < 145  ? 7.5
    : wpm <= 175 ? 9.0
    : wpm <= 200 ? 7.0
    : wpm <= 220 ? 4.5   // fast but followable
    : 2.5                // too fast to follow
    : 6.5;

  // Pitch range: wider range = more authoritative up to a point
  const pitchScore = pitchRange !== null
    ? clamp(((pitchRange - 40) / 130) * 10, 0, 10)
    : 6.5;

  // Energy variation: moderate is best (0.8–2.0 is ideal)
  const energyScore = energyVariation !== null
    ? energyVariation < 0.4  ? 3.0
    : energyVariation < 0.8  ? 5.5
    : energyVariation <= 2.0 ? 9.0
    : energyVariation <= 3.0 ? 7.0
    : 5.0
    : 6.5;

  // Monotone (inverted): low monotone = authoritative
  const monoScore = monotoneScore !== null ? clamp(10 - monotoneScore, 0, 10) : 6.5;

  // Pause discipline: 1-2 long pauses = controlled, 0 = too rushed, 3+ = hesitant
  const pauseScore = longPauseCount !== null
    ? longPauseCount === 0 ? 6.0  // no pauses = slightly too rushed
    : longPauseCount <= 2  ? 9.0  // controlled pauses = authoritative
    : longPauseCount <= 4  ? 6.5
    : 4.0                          // many long pauses = hesitant
    : avgPauseMs !== null ? (avgPauseMs < 300 ? 6.5 : avgPauseMs < 600 ? 8.0 : 5.0) : 6.5;

  const raw = (
    wpmScore   * 0.30 +
    monoScore  * 0.25 +
    pitchScore * 0.20 +
    energyScore * 0.15 +
    pauseScore * 0.10
  );

  return clamp(Math.round(raw * 10) / 10, 0, 10);
}

// ── Q-A alignment score ───────────────────────────────────────────────────────

/**
 * Measures whether the candidate used the right answer approach for the question type.
 * Returns 0–10. Powers a UI signal and a minor adjustment on evidence_quality.
 */
export function computeQAAlignment(
  intent: QuestionIntent,
  signals: {
    outcomeStrength: "strong" | "moderate" | "weak";
    structure: "strong" | "moderate" | "weak";
    specificity: string;
    depthMode: "deep" | "adequate" | "thin";
    evidenceMode: string;
    directnessLabel: string;
    behavioralPhraseCount: number;
    wordCount: number;
    answeredQuestion: boolean;
  },
): number {
  const { outcomeStrength, structure, specificity, depthMode, evidenceMode, directnessLabel, behavioralPhraseCount, wordCount, answeredQuestion } = signals;

  // Base penalty: if answeredQuestion is false, alignment is capped low
  const baseScore = answeredQuestion ? 7.0 : 1.5;

  let score = baseScore;

  if (intent === "behavioral") {
    // Expected: STAR structure, I-led ownership, specific example, concrete outcome
    if (structure === "strong") score += 1.2;
    else if (structure === "weak") score -= 1.5;
    if (outcomeStrength === "strong") score += 1.0;
    else if (outcomeStrength === "weak") score -= 1.2;
    if (specificity === "specific") score += 0.6;
    else if (specificity === "generalized") score -= 1.0; // generic answer = big misalignment
    if (behavioralPhraseCount >= 2) score += 0.5;
    else if (behavioralPhraseCount === 0) score -= 0.8;
    if (evidenceMode === "generalized") score -= 0.8; // no real example
  } else if (intent === "technical") {
    // Expected: depth, process-forward explanation, adequate length
    if (depthMode === "deep") score += 1.2;
    else if (depthMode === "thin") score -= 1.5;
    if (evidenceMode === "process_forward") score += 0.8;
    else if (evidenceMode === "generalized") score -= 0.8;
    if (specificity === "specific") score += 0.6;
    if (wordCount < 80) score -= 1.0; // too short for a technical explanation
  } else if (intent === "situational") {
    // Expected: structured approach, directness, some outcome
    if (structure === "strong") score += 1.0;
    else if (structure === "weak") score -= 1.2;
    if (directnessLabel === "direct") score += 0.8;
    else if (directnessLabel === "wandering") score -= 0.8;
    if (outcomeStrength === "strong") score += 0.5;
  } else if (intent === "motivational" || intent === "values") {
    // Lower stakes — just check for directness and specificity
    if (directnessLabel === "direct") score += 0.8;
    if (specificity !== "generalized") score += 0.5;
  }
  // general: use the base score as-is with minor directness adjustment
  if (intent === "general" && directnessLabel === "wandering") score -= 0.5;

  return clamp(Math.round(score * 10) / 10, 0, 10);
}

// ── Arc / trajectory metrics ──────────────────────────────────────────────────

/** Filler words for arc density counting (subset of full filler list) */
const ARC_FILLER_RE = /\b(um+|uh+|like|you know|basically|literally|kind of|sort of|i mean)\b/gi;

/** Ownership / assertiveness markers */
const ARC_OWNERSHIP_RE = /\b(i (?:led|built|created|drove|designed|owned|managed|decided|chose|initiated|launched|delivered|implemented|improved|increased|reduced|solved|fixed|resolved|achieved|accomplished|negotiated|spearheaded)|i took|i made the call|i was responsible)\b/gi;

/** Assertiveness markers — positive framing, direct claims */
const ARC_ASSERTIVE_RE = /\b(as a result|which (?:led to|resulted in|increased|reduced|improved)|successfully|directly|specifically|measured by|by \d+%?|we (?:achieved|delivered|shipped|launched|closed|won))\b/gi;

/**
 * Split transcript into thirds and compute density ratios for arc metrics.
 * Returns null for all metrics when transcript is too short (< 50 words).
 */
export function computeArcMetrics(transcript: string): {
  ownershipGradient: number | null;
  confidenceArc: number | null;
  fillerRecovery: number | null;
} {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  if (words.length < 50) {
    return { ownershipGradient: null, confidenceArc: null, fillerRecovery: null };
  }

  const third = Math.floor(words.length / 3);
  const firstThird = words.slice(0, third).join(" ");
  const lastThird  = words.slice(words.length - third).join(" ");

  function densityPer100(text: string, re: RegExp): number {
    const w = text.split(/\s+/).filter(Boolean).length;
    if (w === 0) return 0;
    const matches = (text.match(new RegExp(re.source, "gi")) ?? []).length;
    return (matches / w) * 100;
  }

  // ownershipGradient: ownership density last third vs first third, normalised to −1..+1
  const ownFirst = densityPer100(firstThird, ARC_OWNERSHIP_RE);
  const ownLast  = densityPer100(lastThird, ARC_OWNERSHIP_RE);
  const ownershipGradient = clamp((ownLast - ownFirst) / (ownFirst + ownLast + 0.5), -1, 1);

  // confidenceArc: assertiveness density last vs first, normalised
  const assFirst = densityPer100(firstThird, ARC_ASSERTIVE_RE);
  const assLast  = densityPer100(lastThird, ARC_ASSERTIVE_RE);
  const confidenceArc = clamp((assLast - assFirst) / (assFirst + assLast + 0.5), -1, 1);

  // fillerRecovery: filler density first vs last (positive = fillers went down = good recovery)
  const fillFirst = densityPer100(firstThird, ARC_FILLER_RE);
  const fillLast  = densityPer100(lastThird, ARC_FILLER_RE);
  const fillerRecovery = clamp((fillFirst - fillLast) / (fillFirst + fillLast + 0.5), -1, 1);

  return { ownershipGradient, confidenceArc, fillerRecovery };
}

// ── Dimension computation ─────────────────────────────────────────────────────

export function buildDimensionProfile(s: DimensionInputSignals): DimensionProfile {
  const intent = detectQuestionIntent(s.question);
  const ibm = extractIBMMetrics(
    s.question + " " + ((s as any).transcript ?? ""),
    s.wordCount,
    intent,
  );

  // Pre-compute numeric categorical values
  const structureScore   = cat(s.structure);
  const ownershipScore   = cat(s.ownership);
  const directnessScore  = cat(s.directnessLabel);
  const specificityScore = cat(s.specificity);
  const outcomeScore     = cat(s.outcomeStrength);
  const depthScore       = cat(s.depthMode);
  const completenessS    = cat(s.completenessLabel);
  const fluencyScore     = cat(s.fluency);
  const paceScore        = cat(s.pace);
  const vocalScore       = cat(s.vocalDynamics);
  const energyScore      = cat(s.energyProfile);
  const cadenceScore     = cat(s.cadenceStability);
  const presenceS        = s.presenceSignal !== null ? cat(s.presenceSignal + "-presence") : 6.5;
  const emphasisS        = cat(s.emphasisControl + "_emphasis");
  const hedgingS         = hedgingToScore(s.hedgingDensity);
  const fragmentS        = fragmentationToScore(s.fragmentationRatio);
  const ttrS             = ttrToScore(s.lexicalTTR);
  const complexityS      = complexityToScore(s.cognitiveMarkers);
  const behavioralS      = behavioralToScore(s.behavioralPhraseCount);
  const lengthS          = lengthToScore(s.wordCount, intent);

  // Monotone: invert so higher = better
  const monotoneInverted = s.monotoneScore !== null ? clamp(10 - s.monotoneScore, 0, 10) : 6.5;
  const pitchRangeS      = s.pitchRange !== null
    ? clamp(((s.pitchRange - 50) / 150) * 10, 0, 10) : 6.5;
  const energyVarS       = s.energyVariation !== null
    ? clamp((s.energyVariation / 10) * 10, 0, 10) : 6.5;

  // Eye contact / expressiveness to 0–10
  const eyeS  = s.eyeContact  !== null ? s.eyeContact  * 10 : null;
  const exprS = s.expressiveness !== null ? s.expressiveness * 10 : null;
  const headS = s.headStability !== null ? s.headStability * 10 : null;

  // ── 1. Narrative Clarity ───────────────────────────────────────────────────
  const ncRaw = (
    directnessScore   * 0.30 +
    structureScore    * 0.25 +
    cadenceScore      * 0.15 +
    fragmentS         * 0.18 +
    completenessS     * 0.12
  );
  const narrativeClarity = clamp(ncRaw, 0, 10);
  const ncDrivers: string[] = [];
  if (directnessScore < 5.5) ncDrivers.push("wandering_directness");
  if (structureScore < 5.5)  ncDrivers.push("weak_structure");
  if (fragmentS < 5.5)       ncDrivers.push("fragmented_delivery");
  if (cadenceScore < 5.5)    ncDrivers.push("erratic_cadence");

  // ── 2. Evidence Quality ───────────────────────────────────────────────────
  const qaAlignment = computeQAAlignment(intent, {
    outcomeStrength: s.outcomeStrength,
    structure: s.structure,
    specificity: s.specificity,
    depthMode: s.depthMode,
    evidenceMode: s.evidenceMode,
    directnessLabel: s.directnessLabel,
    behavioralPhraseCount: s.behavioralPhraseCount,
    wordCount: s.wordCount,
    answeredQuestion: s.answeredQuestion,
  });
  // Q-A alignment contributes a minor adjustment (±0.5 at most) to evidence quality
  const qaAdj = ((qaAlignment - 5) / 5) * 0.5;
  const eqRaw = (
    outcomeScore    * 0.30 +
    specificityScore * 0.25 +
    ttrS             * 0.20 +
    behavioralS      * 0.15 +
    cat(s.evidenceMode) * 0.10
  ) + qaAdj;
  const evidenceQuality = clamp(eqRaw, 0, 10);
  const eqDrivers: string[] = [];
  if (outcomeScore < 5.5)    eqDrivers.push("weak_outcome");
  if (specificityScore < 5.5) eqDrivers.push("low_specificity");
  if (ttrS < 5.5)            eqDrivers.push("low_lexical_richness");
  if (behavioralS < 4.5)     eqDrivers.push("few_behavioral_indicators");
  if (qaAlignment < 5.0)     eqDrivers.push("framework_mismatch");

  // ── 3. Ownership & Agency ─────────────────────────────────────────────────
  const oaBase = (
    ownershipScore * 0.35 +
    hedgingS       * 0.35 +
    behavioralS    * 0.30
  );
  // Ownership gradient arc: +0.4 if improving, −0.3 if declining
  const oaArcAdj = s.ownershipGradient !== null
    ? (s.ownershipGradient > 0.2 ? 0.4 : s.ownershipGradient < -0.2 ? -0.3 : 0)
    : 0;
  const ownershipAgency = clamp(oaBase + oaArcAdj, 0, 10);
  const oaDrivers: string[] = [];
  if (ownershipScore < 5.5) oaDrivers.push("soft_ownership");
  if (hedgingS < 6.0)       oaDrivers.push("high_hedging_density");
  if (behavioralS < 4.5)    oaDrivers.push("weak_behavioral_language");
  if (s.ownershipGradient !== null && s.ownershipGradient > 0.2) oaDrivers.push("ownership_builds_through_answer");
  if (s.ownershipGradient !== null && s.ownershipGradient < -0.2) oaDrivers.push("ownership_fades_through_answer");

  // ── 4. Vocal Engagement ───────────────────────────────────────────────────
  const veRaw = (
    monotoneInverted * 0.30 +
    energyVarS       * 0.25 +
    pitchRangeS      * 0.20 +
    vocalScore       * 0.15 +
    emphasisS        * 0.10
  );
  const vocalEngagement = clamp(veRaw, 0, 10);
  const veDrivers: string[] = [];
  if (monotoneInverted < 5.0) veDrivers.push("high_monotone");
  if (energyVarS < 4.5)       veDrivers.push("low_energy_variation");
  if (pitchRangeS < 4.5)      veDrivers.push("narrow_pitch_range");

  // ── 5. Response Control ───────────────────────────────────────────────────
  const rcBase = (
    fluencyScore   * 0.35 +
    paceScore      * 0.25 +
    lengthS        * 0.25 +
    cadenceScore   * 0.15
  );
  // Filler recovery arc: +0.35 if candidate recovers from fillers mid-answer
  const rcArcAdj = s.fillerRecovery !== null
    ? (s.fillerRecovery > 0.2 ? 0.35 : s.fillerRecovery < -0.2 ? -0.25 : 0)
    : 0;
  const responseControl = clamp(rcBase + rcArcAdj, 0, 10);
  const rcDrivers: string[] = [];
  if (fluencyScore < 5.5)  rcDrivers.push("filler_heavy_or_fragmented");
  if (paceScore < 5.5)     rcDrivers.push("poor_pace");
  if (lengthS < 5.5)       rcDrivers.push("length_off");
  if (s.fillerRecovery !== null && s.fillerRecovery > 0.2) rcDrivers.push("filler_recovery_mid_answer");

  // ── 6. Cognitive Depth ───────────────────────────────────────────────────
  const cdRaw = (
    depthScore    * 0.30 +
    complexityS   * 0.30 +
    ttrS          * 0.20 +
    (s.vocabularySophistication / 10) * 10 * 0.20
  );
  const cognitiveDepth = clamp(cdRaw, 0, 10);
  const cdDrivers: string[] = [];
  if (depthScore < 5.5)    cdDrivers.push("thin_depth");
  if (complexityS < 4.5)   cdDrivers.push("low_complexity_markers");
  if (ttrS < 5.5)          cdDrivers.push("low_lexical_richness");

  // ── 7. Presence & Confidence ─────────────────────────────────────────────
  const hasCamera = eyeS !== null && exprS !== null;
  const pcBase = hasCamera
    ? (
        s.confidence   * 0.30 +
        eyeS!          * 0.30 +
        exprS!         * 0.20 +
        presenceS      * 0.20
      )
    : (
        s.confidence   * 0.55 +
        presenceS      * 0.25 +
        energyScore    * 0.20
      );
  // Confidence arc: +0.35 if assertiveness builds, −0.25 if it fades
  const pcArcAdj = s.confidenceArc !== null
    ? (s.confidenceArc > 0.2 ? 0.35 : s.confidenceArc < -0.2 ? -0.25 : 0)
    : 0;
  const presenceConfidence = clamp(pcBase + pcArcAdj, 0, 10);
  const pcDrivers: string[] = [];
  if (s.confidence < 5.5)   pcDrivers.push("low_confidence_score");
  if (eyeS !== null && eyeS < 5.0) pcDrivers.push("low_eye_contact");
  if (exprS !== null && exprS < 5.0) pcDrivers.push("low_expressiveness");
  if (s.confidenceArc !== null && s.confidenceArc > 0.2) pcDrivers.push("confidence_builds_through_answer");
  if (s.confidenceArc !== null && s.confidenceArc < -0.2) pcDrivers.push("confidence_fades_through_answer");

  // ── 8. Audience Awareness ─────────────────────────────────────────────────
  // Measures whether delivery is calibrated for the listener:
  // vocal variety, energy modulation, directness, and completeness from the audience's POV.
  const aaRaw = (
    cat(s.vocalDynamics)  * 0.30 +  // vocal variety = keeps audience engaged
    cat(s.energyProfile)  * 0.25 +  // energy level appropriate for context
    monotoneInverted       * 0.20 +  // monotone = audience disengages
    directnessScore        * 0.15 +  // audience needs you on topic fast
    completenessS          * 0.10    // did the audience get what they came for
  );
  const audienceAwareness = clamp(aaRaw, 0, 10);
  const aaDrivers: string[] = [];
  if (cat(s.vocalDynamics) < 4.0)  aaDrivers.push("flat_vocal_delivery");
  if (cat(s.energyProfile) < 4.0)  aaDrivers.push("low_energy_for_context");
  if (monotoneInverted < 5.0)       aaDrivers.push("monotone_disengaging");
  if (directnessScore < 5.5)        aaDrivers.push("slow_to_get_to_point");

  // ── Apply question-intent weights ────────────────────────────────────────
  const weights = getWeights(intent, s.framework);
  const rawScores: Record<DimensionKey, number> = {
    narrative_clarity:   narrativeClarity,
    evidence_quality:    evidenceQuality,
    ownership_agency:    ownershipAgency,
    vocal_engagement:    vocalEngagement,
    response_control:    responseControl,
    cognitive_depth:     cognitiveDepth,
    presence_confidence: presenceConfidence,
    audience_awareness:  audienceAwareness,
  };

  // Weights don't change the absolute score shown to user — they feed archetype detection only
  // Store weighted scores separately for archetype use
  const weightedScores: Record<DimensionKey, number> = {} as any;
  for (const k of Object.keys(rawScores) as DimensionKey[]) {
    weightedScores[k] = clamp(rawScores[k] * weights[k], 0, 10);
  }

  const LABELS: Record<DimensionKey, string> = {
    narrative_clarity:   "Narrative Clarity",
    evidence_quality:    "Evidence Quality",
    ownership_agency:    "Ownership & Agency",
    vocal_engagement:    "Vocal Engagement",
    response_control:    "Response Control",
    cognitive_depth:     "Cognitive Depth",
    presence_confidence: "Presence & Confidence",
    audience_awareness:  "Audience Awareness",
  };

  const drivers: Record<DimensionKey, string[]> = {
    narrative_clarity:   ncDrivers,
    evidence_quality:    eqDrivers,
    ownership_agency:    oaDrivers,
    vocal_engagement:    veDrivers,
    response_control:    rcDrivers,
    cognitive_depth:     cdDrivers,
    presence_confidence: pcDrivers,
    audience_awareness:  aaDrivers,
  };

  const profile: DimensionProfile = {} as DimensionProfile;
  for (const k of Object.keys(rawScores) as DimensionKey[]) {
    const score = Math.round(rawScores[k] * 10) / 10;
    profile[k] = {
      key: k,
      label: LABELS[k],
      score,
      coaching: getCoaching(k, score),
      isStrength: score >= 7.0,
      isGap: score < 5.5,
      driverSignals: drivers[k],
    };
  }

  // Attach weighted scores for archetype use (not shown to user)
  (profile as any)._weighted = weightedScores;
  // Attach Q-A alignment score for composer to surface
  (profile as any)._qaAlignment = qaAlignment;

  return profile;
}

/** Returns dimension keys sorted weakest first (for coaching priority) */
export function rankedGaps(profile: DimensionProfile): DimensionKey[] {
  return (Object.keys(profile) as DimensionKey[])
    .filter(k => profile[k].isGap)
    .sort((a, b) => profile[a].score - profile[b].score);
}

/** Returns dimension keys sorted strongest first */
export function rankedStrengths(profile: DimensionProfile): DimensionKey[] {
  return (Object.keys(profile) as DimensionKey[])
    .filter(k => profile[k].isStrength)
    .sort((a, b) => profile[b].score - profile[a].score);
}
