// ---------------------------------------------------------------------------
// Delivery Archetypes — Score-Based System
//
// Archetypes are derived from dimension pattern scores, not if/else cascades.
// Each archetype accumulates points from dimension conditions; highest score wins.
// Secondary archetype fires when the runner-up is within 15 points of the winner.
//
// 15 archetypes:
//   Core 10: Polished Performer, Rusher, Hedger, Anxious Achiever, Vague Narrator,
//             Fading Closer, Monotone Expert, Scattered Thinker, Quiet Achiever, Overloader
//   New 5:   Circling the Point, Fragmented Expert, Phantom Expert,
//             Process Narrator, The Creditor
// ---------------------------------------------------------------------------

import type { DimensionProfile, DimensionKey } from "./dimensions";

// ── Types ──────────────────────────────────────────────────────────────────

export type DeliveryArchetype =
  | "Polished Performer"
  | "Rusher"
  | "Hedger"
  | "Anxious Achiever"
  | "Vague Narrator"
  | "Fading Closer"
  | "Monotone Expert"
  | "Scattered Thinker"
  | "Quiet Achiever"
  | "Overloader"
  | "Circling the Point"
  | "Fragmented Expert"
  | "Phantom Expert"
  | "Process Narrator"
  | "The Creditor";

export type ArchetypeResult = {
  archetype: DeliveryArchetype;
  archetypeCoaching: string;
  archetypeDescription: string;
  tagline: string;
  whatInterviewersHear: string;
  effort: "Low" | "Medium" | "High";
  impact: "High" | "Medium" | "Low";
  /** The dimension keys that most contributed to this archetype assignment */
  primarySignals: DimensionKey[];
  /** Score used in detection (0–100), useful for debugging */
  detectionScore: number;
};

export type ArchetypeDetectionResult = {
  primary: ArchetypeResult;
  secondary?: ArchetypeResult;
};

// ── Raw signals passed alongside dimension profile ─────────────────────────

/** Subset of raw signals used for archetype nuance that dimensions don't fully capture */
export type RawArchetypeSignals = {
  ownership: "strong" | "moderate" | "soft";
  structure: "strong" | "moderate" | "weak";
  outcomeStrength: "strong" | "moderate" | "weak";
  evidenceMode: "metrics_forward" | "example_forward" | "process_forward" | "generalized";
  pace: "slow" | "controlled" | "fast" | "rushed";
  fluency: "clean" | "slightly_disfluent" | "filler_heavy" | "fragmented";
  vocalDynamics: "flat" | "moderate" | "dynamic" | "erratic";
  directnessLabel: "direct" | "delayed" | "wandering";
  depthMode: "deep" | "adequate" | "thin";
  specificity: "specific" | "mixed" | "generalized";
  iCount: number;
  weCount: number;
  wordCount: number;
  hedgingDensity: number;
  cognitiveMarkers: number;
  behavioralPhraseCount: number;
  fragmentationRatio: number;
};

// ── Archetype metadata ─────────────────────────────────────────────────────

type ArchetypeData = {
  description: string;
  coaching: string;
  tagline: string;
  whatInterviewersHear: string;
  effort: "Low" | "Medium" | "High";
  impact: "High" | "Medium" | "Low";
  primaryDimensions: DimensionKey[];
};

export const ARCHETYPE_DATA: Record<DeliveryArchetype, ArchetypeData> = {
  "Polished Performer": {
    description: "Your fundamentals are solid — clean delivery, clear structure, and ownership language working together.",
    coaching: "You're executing well. The next level is one specific metric or dollar figure in your Result to separate you from other strong candidates.",
    tagline: "Your delivery is reinforcing your content — that's rare.",
    whatInterviewersHear: "Confidence, preparation, and clarity. This person sounds like they know their material.",
    effort: "Low",
    impact: "Medium",
    primaryDimensions: ["narrative_clarity", "ownership_agency", "response_control"],
  },

  Rusher: {
    description: "Your pace is outrunning your content — the interviewer is processing before you finish landing your points.",
    coaching: "Slow down the first sentence of your Result section. That's the moment interviewers decide if they understood you.",
    tagline: "High energy is an asset — your pace is spending it too fast.",
    whatInterviewersHear: "Enthusiasm and knowledge, but key points are getting lost in the momentum.",
    effort: "Medium",
    impact: "High",
    primaryDimensions: ["response_control", "narrative_clarity"],
  },

  Hedger: {
    description: "Your content is there but your ownership language is softening it — too much 'we' and conditional phrasing.",
    coaching: "Start your next answer with 'I decided…' or 'I drove…' — first-person ownership in the opening line immediately shifts the confidence signal.",
    tagline: "The answer is there — your language is giving the credit away.",
    whatInterviewersHear: "Competence without conviction — like watching someone undersell themselves in real time.",
    effort: "Low",
    impact: "High",
    primaryDimensions: ["ownership_agency", "presence_confidence"],
  },

  "Anxious Achiever": {
    description: "The story is well-structured and the content is solid, but the language is underselling it — hedging words and pace are signaling less confidence than the work deserves.",
    coaching: "Your answer doesn't need a better story, it needs bolder language. Replace 'I helped with' → 'I owned', 'we kind of' → 'I drove'. Say the revised version out loud once before your next attempt.",
    tagline: "Strong structure, soft ownership — the work is there but the confidence isn't landing.",
    whatInterviewersHear: "A well-prepared candidate who seems uncertain whether they deserve the credit.",
    effort: "Low",
    impact: "High",
    primaryDimensions: ["ownership_agency", "response_control", "narrative_clarity"],
  },

  "Vague Narrator": {
    description: "The story is plausible but not grounded — no numbers, named tools, or concrete proof points.",
    coaching: "Add one concrete number to your Result — a percentage, timeline, or dollar figure. Even a rough estimate makes the story credible.",
    tagline: "Plausible but not provable — the answer needs a proof point.",
    whatInterviewersHear: "A reasonable story that could apply to anyone. Nothing that makes it stick.",
    effort: "Medium",
    impact: "High",
    primaryDimensions: ["evidence_quality", "cognitive_depth"],
  },

  "Fading Closer": {
    description: "Strong setup and clear structure, but the Result section lands softly — the payoff doesn't match the buildup.",
    coaching: "Pause one full beat before your Result, then lead with the number or outcome before the explanation. 'The result: costs dropped 22%' outperforms 'So basically things improved over time.'",
    tagline: "Strong setup, soft landing — the result isn't paying off the story.",
    whatInterviewersHear: "A well-structured answer that trails off at the moment it should peak.",
    effort: "Low",
    impact: "High",
    primaryDimensions: ["evidence_quality", "narrative_clarity"],
  },

  "Monotone Expert": {
    description: "Your content is solid but the delivery is acoustically flat — the answer sounds recited rather than lived.",
    coaching: "When you reach your Result, raise your pitch slightly and pause one beat before saying the outcome. That contrast will carry the whole answer.",
    tagline: "Your words are clear, but your voice isn't adding conviction.",
    whatInterviewersHear: "Competence without enthusiasm — a gap that doesn't reflect your actual capability.",
    effort: "Low",
    impact: "High",
    primaryDimensions: ["vocal_engagement", "presence_confidence"],
  },

  "Scattered Thinker": {
    description: "Your ideas are present but not sequenced — the interviewer has to work to track your through-line.",
    coaching: "Write S-T-A-R on paper before your next attempt and say 'Situation:' out loud before you start. The label forces structure.",
    tagline: "High engagement that reads as disorganized.",
    whatInterviewersHear: "Enthusiasm, but the structure is getting lost in the energy.",
    effort: "Medium",
    impact: "High",
    primaryDimensions: ["narrative_clarity", "response_control", "cognitive_depth"],
  },

  "Quiet Achiever": {
    description: "Your content and ownership are strong but your delivery energy isn't matching the quality of what you're saying.",
    coaching: "The story is there — project 15% more volume on your Action and Result sections and the answer will land the way it deserves to.",
    tagline: "Controlled and clear — but your vocal energy may not be matching your confidence.",
    whatInterviewersHear: "Composure and precision, but possibly reserved or low-energy depending on the interviewer.",
    effort: "Low",
    impact: "High",
    primaryDimensions: ["vocal_engagement", "presence_confidence", "ownership_agency"],
  },

  Overloader: {
    description: "Strong depth and detail, but you're burying the lead — the setup is longer than the answer can justify.",
    coaching: "Cut the first 20 seconds of your answer. Move directly to your action and let the context emerge from the specifics.",
    tagline: "Strong depth — but you're giving the interviewer too much to hold at once.",
    whatInterviewersHear: "Lots of information, but it's hard to track the main point through the detail.",
    effort: "Medium",
    impact: "High",
    primaryDimensions: ["cognitive_depth", "narrative_clarity", "response_control"],
  },

  "Circling the Point": {
    description: "You have the ideas — the answer just takes too long to find its center. Multiple threads start but don't converge before you move on.",
    coaching: "Before you start, say the core of your answer in one sentence: 'I did X and the outcome was Y.' That sentence is your anchor — every other sentence either sets it up or proves it.",
    tagline: "The idea is in there — but it's not landing cleanly.",
    whatInterviewersHear: "Someone who thinks out loud. Engaging at first, but they're waiting for the point.",
    effort: "Medium",
    impact: "High",
    primaryDimensions: ["narrative_clarity", "cognitive_depth"],
  },

  "Fragmented Expert": {
    description: "The knowledge is clearly there but the delivery is breaking it into pieces before the ideas can land — fragments and incomplete thoughts interrupt the signal.",
    coaching: "Slow down and finish every sentence before starting the next one. If a sentence trails off, pause, then restart it cleanly. One complete thought at a time — the depth will still come through.",
    tagline: "Deep knowledge, choppy delivery — the ideas deserve a cleaner path out.",
    whatInterviewersHear: "Someone who clearly knows the subject but is getting in their own way technically.",
    effort: "Medium",
    impact: "High",
    primaryDimensions: ["response_control", "cognitive_depth", "narrative_clarity"],
  },

  "Phantom Expert": {
    description: "The answer uses sophisticated language and sounds substantive — but when you look for the concrete proof, it isn't there. Vocabulary and complexity markers without a single verifiable claim.",
    coaching: "Your vocabulary is working too hard to cover for missing evidence. Name one specific outcome, tool, or number. Even a rough figure ('cut time by roughly 40%') is more persuasive than the most polished abstract language.",
    tagline: "Sounds like an expert — but where's the evidence?",
    whatInterviewersHear: "Confident and articulate. Then they try to recall a specific fact from the answer and can't find one.",
    effort: "Medium",
    impact: "High",
    primaryDimensions: ["evidence_quality", "cognitive_depth"],
  },

  "Process Narrator": {
    description: "You're describing the process clearly, but the answer reads like a project log rather than a personal story. Heavy 'we' language, passive constructions, and step-by-step narration without personal ownership.",
    coaching: "Pick the one decision in the answer that only you made, and make it the center of the story. 'I decided to X instead of Y because Z.' That sentence transforms a process description into a leadership story.",
    tagline: "Clear process — but where are you in the story?",
    whatInterviewersHear: "A solid project description. They're still waiting to understand what this person specifically contributed.",
    effort: "Low",
    impact: "High",
    primaryDimensions: ["ownership_agency", "narrative_clarity"],
  },

  "The Creditor": {
    description: "The story is strong and the structure is clear — but credit is diffusing into 'we' at key moments. The work is clearly there; the language is sharing it with people who aren't in the room.",
    coaching: "In your next attempt, every time you said 'we', replace it with 'I'. Listen back. That version is closer to the truth of your contribution — and it's what the interviewer needs to hear.",
    tagline: "Strong story, shared credit — own it.",
    whatInterviewersHear: "A team player who might not be the one who drove the outcome. Or someone too modest to say so.",
    effort: "Low",
    impact: "High",
    primaryDimensions: ["ownership_agency", "narrative_clarity", "evidence_quality"],
  },
};

// ── Color map ──────────────────────────────────────────────────────────────

export const ARCHETYPE_COLOR: Record<DeliveryArchetype, string> = {
  "Polished Performer":  "#10B981",
  Rusher:                "#F59E0B",
  Hedger:                "#8B5CF6",
  "Anxious Achiever":    "#F97316",
  "Vague Narrator":      "#6B7280",
  "Fading Closer":       "#EAB308",
  "Monotone Expert":     "#2563EB",
  "Scattered Thinker":   "#EF4444",
  "Quiet Achiever":      "#06B6D4",
  Overloader:            "#EC4899",
  "Circling the Point":  "#A78BFA",
  "Fragmented Expert":   "#FB923C",
  "Phantom Expert":      "#64748B",
  "Process Narrator":    "#0EA5E9",
  "The Creditor":        "#84CC16",
};

// ── Score-based detection ──────────────────────────────────────────────────

/**
 * Each archetype defines a scoring function that accumulates points from
 * dimension conditions. Scores are 0–100. Ties resolved by order in registry.
 */
type ArchetypeScoreFn = (d: Record<DimensionKey, number>, r: RawArchetypeSignals) => number;

function clamp01(n: number) { return Math.max(0, Math.min(100, n)); }

const ARCHETYPE_SCORES: Record<DeliveryArchetype, ArchetypeScoreFn> = {

  "Polished Performer": (d) => {
    let score = 0;
    // Requires all 7 dimensions at or above good threshold
    if (d.narrative_clarity >= 7.0)   score += 20;
    if (d.evidence_quality >= 7.0)    score += 20;
    if (d.ownership_agency >= 7.0)    score += 20;
    if (d.response_control >= 7.0)    score += 20;
    if (d.presence_confidence >= 7.0) score += 10;
    if (d.vocal_engagement >= 6.5)    score += 10;
    // Hard penalty for any significant gap
    const gaps = Object.values(d).filter(v => v < 5.5).length;
    score -= gaps * 25;
    return clamp01(score);
  },

  Rusher: (d, r) => {
    let score = 0;
    if (r.pace === "rushed")                       score += 40;
    if (r.pace === "fast")                         score += 20;
    if (d.response_control < 5.0)                 score += 30;
    if (d.narrative_clarity < 6.0)                score += 20;
    // Rusher still has some energy — differentiate from Scattered Thinker
    if (d.vocal_engagement >= 5.0)                score += 10;
    // Penalty: if narrative is very weak + cognitive weak → Scattered Thinker
    if (d.narrative_clarity < 4.0 && d.cognitive_depth < 5.0) score -= 20;
    return clamp01(score);
  },

  Hedger: (d, r) => {
    let score = 0;
    if (d.ownership_agency < 5.5)                 score += 40;
    if (d.presence_confidence < 6.0)              score += 25;
    if (r.hedgingDensity > 2.0)                   score += 20;
    // Hedger has mediocre structure (not Anxious Achiever's strong structure)
    if (d.narrative_clarity < 7.0)                score += 10;
    if (r.weCount > r.iCount * 1.3)               score += 10;
    // Penalty: if narrative is strong + pacing is rushed → Anxious Achiever instead
    if (d.narrative_clarity >= 7.0 && r.pace === "rushed") score -= 20;
    // Penalty: if narrative is strong + ownership is the only gap → The Creditor instead
    if (d.narrative_clarity >= 7.5 && d.evidence_quality >= 6.5) score -= 15;
    return clamp01(score);
  },

  "Anxious Achiever": (d, r) => {
    let score = 0;
    if (d.narrative_clarity >= 7.0)               score += 35;
    if (d.ownership_agency < 5.5)                 score += 30;
    if (r.pace === "rushed" || r.pace === "fast")  score += 25;
    if (d.evidence_quality >= 6.0)                score += 10;
    // Penalty: if narrative isn't strong, this is Rusher or Hedger
    if (d.narrative_clarity < 6.5)                score -= 20;
    return clamp01(score);
  },

  "Vague Narrator": (d, r) => {
    let score = 0;
    if (d.evidence_quality < 5.0)                 score += 40;
    if (d.cognitive_depth < 5.5)                  score += 30;
    if (r.specificity === "generalized")           score += 15;
    if (r.evidenceMode === "generalized")          score += 15;
    // Penalty: if cognitive depth is high → Phantom Expert instead
    if (d.cognitive_depth >= 6.5)                 score -= 30;
    // Penalty: if ownership is the main issue → not this one
    if (d.ownership_agency < 4.5 && d.evidence_quality >= 5.0) score -= 20;
    return clamp01(score);
  },

  "Fading Closer": (d, r) => {
    let score = 0;
    // Evidence weak specifically — not a general low-scorer
    if (d.evidence_quality < 5.5)                 score += 40;
    if (d.narrative_clarity >= 6.0)               score += 25;
    if (d.ownership_agency >= 6.0)                score += 20;
    if (r.outcomeStrength === "weak")              score += 15;
    // Penalty: if cognitive also weak, Vague Narrator is more accurate
    if (d.cognitive_depth < 5.0)                  score -= 20;
    // Penalty: if structure is weak, Scattered Thinker or Circling wins
    if (d.narrative_clarity < 5.5)                score -= 20;
    return clamp01(score);
  },

  "Monotone Expert": (d, r) => {
    let score = 0;
    if (d.vocal_engagement < 5.0)                 score += 50;
    if (r.vocalDynamics === "flat")                score += 20;
    if (d.cognitive_depth >= 6.0)                 score += 20;
    if (d.narrative_clarity >= 6.0)               score += 10;
    // Penalty: if energy is simply low due to presence, not flat dynamics → Quiet Achiever
    if (d.ownership_agency >= 7.0 && d.presence_confidence < 5.5) score -= 15;
    return clamp01(score);
  },

  "Scattered Thinker": (d, r) => {
    let score = 0;
    if (d.narrative_clarity < 4.5)                score += 45;
    if (d.response_control < 5.5)                 score += 25;
    if (d.cognitive_depth < 5.5)                  score += 20;
    if (r.directnessLabel === "wandering")         score += 10;
    // Penalty: if cognitive_depth is high → Circling the Point (has ideas, can't structure)
    if (d.cognitive_depth >= 6.0)                 score -= 25;
    // Penalty: if response control is the only issue → Rusher
    if (d.narrative_clarity >= 5.5 && d.response_control < 5.0) score -= 20;
    return clamp01(score);
  },

  "Quiet Achiever": (d, r) => {
    let score = 0;
    if (d.ownership_agency >= 7.0)                score += 35;
    if (d.vocal_engagement < 5.5)                 score += 30;
    if (d.presence_confidence < 5.5)              score += 20;
    if (d.evidence_quality >= 6.5)                score += 15;
    // Penalty: if vocal engagement is flat specifically → Monotone Expert
    if (r.vocalDynamics === "flat" && d.cognitive_depth >= 6.0) score -= 20;
    return clamp01(score);
  },

  Overloader: (d, r) => {
    let score = 0;
    if (d.cognitive_depth >= 7.0)                 score += 35;
    if (d.narrative_clarity < 5.5)                score += 30;
    if (r.wordCount > 290)                        score += 20;
    if (r.directnessLabel === "wandering")         score += 15;
    // Penalty: if response_control is also collapsed → Scattered Thinker
    if (d.response_control < 4.5)                 score -= 20;
    // Penalty: if cognitive depth is moderate — this is more Circling the Point
    if (d.cognitive_depth < 6.5)                  score -= 15;
    return clamp01(score);
  },

  "Circling the Point": (d, r) => {
    let score = 0;
    if (d.narrative_clarity < 5.5)                score += 40;
    // Has ideas but can't land them — differentiated from Scattered Thinker
    if (d.cognitive_depth >= 5.5)                 score += 30;
    if (d.response_control >= 5.5)                score += 20;
    if (r.directnessLabel === "wandering")         score += 10;
    // Penalty: if cognitive is high AND wordcount high → Overloader
    if (d.cognitive_depth >= 7.5 && r.wordCount > 290) score -= 20;
    // Penalty: if everything is chaotic → Scattered Thinker
    if (d.cognitive_depth < 5.0 && d.response_control < 5.0) score -= 25;
    return clamp01(score);
  },

  "Fragmented Expert": (d, r) => {
    let score = 0;
    if (d.cognitive_depth >= 7.0)                 score += 40;
    if (d.response_control < 4.5)                 score += 40;
    if (r.fluency === "fragmented")                score += 20;
    if (r.fragmentationRatio > 0.25)              score += 10;
    // Must have real depth to qualify — else Scattered Thinker
    if (d.cognitive_depth < 6.0)                  score -= 30;
    return clamp01(score);
  },

  "Phantom Expert": (d, r) => {
    let score = 0;
    // Sounds sophisticated but evidence is absent
    if (d.evidence_quality < 4.5)                 score += 40;
    if (d.cognitive_depth >= 6.5)                 score += 35;
    if (d.ownership_agency >= 5.5)                score += 15;
    if (r.cognitiveMarkers >= 3)                  score += 10;
    // Penalty: if cognitive_depth is also low → Vague Narrator
    if (d.cognitive_depth < 5.5)                  score -= 35;
    // Penalty: if ownership is the main gap → not this one
    if (d.ownership_agency < 4.5)                 score -= 20;
    return clamp01(score);
  },

  "Process Narrator": (d, r) => {
    let score = 0;
    if (d.ownership_agency < 4.5)                 score += 45;
    if (d.narrative_clarity >= 6.0)               score += 25;
    if (r.evidenceMode === "process_forward")      score += 20;
    if (r.weCount > r.iCount * 2.0)               score += 10;
    // Penalty: if hedging density is also high → Hedger is more accurate
    if (r.hedgingDensity > 2.5 && d.presence_confidence < 5.5) score -= 20;
    // Penalty: if narrative is also weak → ownership isn't the only issue
    if (d.narrative_clarity < 5.5)                score -= 15;
    return clamp01(score);
  },

  "The Creditor": (d, r) => {
    let score = 0;
    // Strong structure + strong evidence, but ownership is diffusing
    if (d.ownership_agency < 5.0)                 score += 45;
    if (d.narrative_clarity >= 7.0)               score += 30;
    if (d.evidence_quality >= 6.5)                score += 25;
    if (r.weCount > r.iCount * 1.5)               score += 10;
    // Penalty: if narrative is not strong, this is Hedger or Process Narrator
    if (d.narrative_clarity < 6.5)                score -= 25;
    // Penalty: if evidence is not strong — not a clear high-performer diffusing credit
    if (d.evidence_quality < 5.5)                 score -= 20;
    return clamp01(score);
  },
};

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Scores all 15 archetypes from weighted dimension scores and raw signals.
 * Returns primary archetype and optional secondary (if runner-up within 15 pts).
 */
export function scoreArchetypes(
  profile: DimensionProfile,
  rawSignals: RawArchetypeSignals,
): ArchetypeDetectionResult {
  // Use weighted scores from dimension engine (stored on profile by buildDimensionProfile)
  const weighted = (profile as any)._weighted as Record<DimensionKey, number> | undefined;
  const d: Record<DimensionKey, number> = weighted ?? {
    narrative_clarity:   profile.narrative_clarity.score,
    evidence_quality:    profile.evidence_quality.score,
    ownership_agency:    profile.ownership_agency.score,
    vocal_engagement:    profile.vocal_engagement.score,
    response_control:    profile.response_control.score,
    cognitive_depth:     profile.cognitive_depth.score,
    presence_confidence: profile.presence_confidence.score,
    audience_awareness:  profile.audience_awareness?.score ?? 6.5,
  };

  // Compute score for every archetype
  const allScores: Array<{ archetype: DeliveryArchetype; score: number }> = (
    Object.keys(ARCHETYPE_SCORES) as DeliveryArchetype[]
  ).map(archetype => ({
    archetype,
    score: ARCHETYPE_SCORES[archetype](d, rawSignals),
  }));

  // Sort descending
  allScores.sort((a, b) => b.score - a.score);

  const primary = allScores[0];
  const runner  = allScores[1];

  return {
    primary:   makeResult(primary.archetype, profile, primary.score),
    secondary: runner && (primary.score - runner.score) <= 15
      ? makeResult(runner.archetype, profile, runner.score)
      : undefined,
  };
}

function makeResult(
  archetype: DeliveryArchetype,
  profile: DimensionProfile,
  detectionScore: number,
): ArchetypeResult {
  const data = ARCHETYPE_DATA[archetype];
  return {
    archetype,
    archetypeCoaching: data.coaching,
    archetypeDescription: data.description,
    tagline: data.tagline,
    whatInterviewersHear: data.whatInterviewersHear,
    effort: data.effort,
    impact: data.impact,
    primarySignals: data.primaryDimensions,
    detectionScore,
  };
}

// ── Legacy shim — keeps existing composer.ts call sites working ────────────

/** @deprecated Use scoreArchetypes() instead */
export function computeArchetype(signals: {
  overall: number; communication: number; confidence: number;
  wpm: number | null; fillersPer100: number; wordCount: number;
  iCount: number; weCount: number; pitchRange: number | null;
  monotoneScore: number | null; energyProfile: "low" | "steady" | "engaging" | "inconsistent";
  presenceSignal: "strong" | "moderate" | "low" | null;
  pace: "slow" | "controlled" | "fast" | "rushed";
  fluency: "clean" | "slightly_disfluent" | "filler_heavy" | "fragmented";
  cadenceStability: "stable" | "slightly_uneven" | "erratic";
  vocalDynamics: "flat" | "moderate" | "dynamic" | "erratic";
  structure: "strong" | "moderate" | "weak";
  directness: "direct" | "moderate" | "wandering";
  ownership: "strong" | "moderate" | "soft";
  specificity: "specific" | "moderate" | "generalized";
  outcomeStrength: "strong" | "moderate" | "weak";
  depthMode: "deep" | "moderate" | "thin";
  completeness: "complete" | "partial";
  evidenceMode: "metrics_forward" | "example_forward" | "process_forward" | "generalized";
}): { archetype: DeliveryArchetype; archetypeCoaching: string; archetypeDescription: string; primarySignals: string[] } {
  // Build a minimal dimension profile approximation from old signals
  const catNum = (v: string): number => {
    const map: Record<string, number> = {
      strong: 8.5, moderate: 6.5, weak: 4.0, soft: 4.0,
      direct: 9.0, wandering: 3.5, specific: 9.0, generalized: 3.5,
      deep: 9.0, thin: 3.5, complete: 9.0, partial: 4.5,
      clean: 9.5, filler_heavy: 3.0, fragmented: 1.5,
      controlled: 8.5, rushed: 2.5, fast: 6.0, slow: 5.5,
      flat: 2.5, dynamic: 9.0, erratic: 5.0,
      engaging: 9.0, low: 3.0, inconsistent: 5.0,
      stable: 9.0, slightly_uneven: 6.0, slightly_disfluent: 6.5,
    };
    return map[v] ?? 6.5;
  };

  const narrative_clarity   = (catNum(signals.directness) * 0.4 + catNum(signals.structure) * 0.4 + catNum(signals.completeness) * 0.2);
  const evidence_quality    = (catNum(signals.outcomeStrength) * 0.4 + catNum(signals.specificity) * 0.4 + catNum(signals.evidenceMode) * 0.2);
  const ownership_agency    = (catNum(signals.ownership) * 0.6 + (signals.iCount > signals.weCount * 1.5 ? 8 : 5) * 0.4);
  const vocal_engagement    = (catNum(signals.vocalDynamics) * 0.5 + (signals.monotoneScore !== null ? Math.max(0, 10 - signals.monotoneScore) : 6.5) * 0.5);
  const response_control    = (catNum(signals.fluency) * 0.5 + catNum(signals.pace) * 0.5);
  const cognitive_depth     = (catNum(signals.depthMode) * 0.7 + catNum(signals.specificity) * 0.3);
  const presence_confidence = signals.confidence;

  const audience_awareness = (catNum(signals.vocalDynamics) * 0.5 + (signals.monotoneScore !== null ? Math.max(0, 10 - signals.monotoneScore) : 6.5) * 0.5);

  const d: Record<DimensionKey, number> = {
    narrative_clarity, evidence_quality, ownership_agency,
    vocal_engagement, response_control, cognitive_depth, presence_confidence,
    audience_awareness,
  };

  const rawSignals: RawArchetypeSignals = {
    ownership: signals.ownership,
    structure: signals.structure,
    outcomeStrength: signals.outcomeStrength,
    evidenceMode: signals.evidenceMode,
    pace: signals.pace,
    fluency: signals.fluency,
    vocalDynamics: signals.vocalDynamics,
    directnessLabel: signals.directness === "moderate" ? "delayed" : signals.directness as "direct" | "wandering",
    depthMode: signals.depthMode === "moderate" ? "adequate" : signals.depthMode as "deep" | "thin",
    specificity: signals.specificity === "moderate" ? "mixed" : signals.specificity as "specific" | "generalized",
    iCount: signals.iCount,
    weCount: signals.weCount,
    wordCount: signals.wordCount,
    hedgingDensity: 1.0, // default fallback
    cognitiveMarkers: 0,
    behavioralPhraseCount: signals.iCount > 3 ? 2 : 0,
    fragmentationRatio: signals.fluency === "fragmented" ? 0.3 : 0.05,
  };

  // Build a minimal profile wrapper for the scorer
  const makeScore = (key: DimensionKey, score: number) => ({
    key, label: key, score, coaching: "", isStrength: score >= 7, isGap: score < 5.5, driverSignals: [],
  });

  const profile: DimensionProfile = {
    narrative_clarity:   makeScore("narrative_clarity",   narrative_clarity),
    evidence_quality:    makeScore("evidence_quality",    evidence_quality),
    ownership_agency:    makeScore("ownership_agency",    ownership_agency),
    vocal_engagement:    makeScore("vocal_engagement",    vocal_engagement),
    response_control:    makeScore("response_control",    response_control),
    cognitive_depth:     makeScore("cognitive_depth",     cognitive_depth),
    presence_confidence: makeScore("presence_confidence", presence_confidence),
    audience_awareness:  makeScore("audience_awareness",  audience_awareness),
  };
  (profile as any)._weighted = d;

  const { primary } = scoreArchetypes(profile, rawSignals);
  return {
    archetype: primary.archetype,
    archetypeCoaching: primary.archetypeCoaching,
    archetypeDescription: primary.archetypeDescription,
    primarySignals: primary.primarySignals,
  };
}
