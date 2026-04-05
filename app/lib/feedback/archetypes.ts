// ---------------------------------------------------------------------------
// Delivery Archetypes
// Computed deterministically from acoustic + answer signals.
// Each archetype identifies the dominant pattern limiting performance
// and gives one concrete coaching action for the next attempt.
// ---------------------------------------------------------------------------

export type DeliveryArchetype =
  | "Polished Performer"
  | "Rusher"
  | "Hedger"
  | "Vague Narrator"
  | "Monotone Expert"
  | "Scattered Thinker"
  | "Quiet Achiever"
  | "Overloader";

export type ArchetypeResult = {
  archetype: DeliveryArchetype;
  archetypeCoaching: string;
  archetypeDescription: string;
  /** The 1–3 metric keys that most contributed to this archetype assignment */
  primarySignals: string[];
};

// One coaching action and description per archetype
const ARCHETYPE_DATA: Record<
  DeliveryArchetype,
  { coaching: string; description: string }
> = {
  "Polished Performer": {
    description: "Your fundamentals are solid — clean delivery, clear structure, and ownership language working together.",
    coaching: "You're executing well. The next level is one specific metric or dollar figure in your Result to separate you from other strong candidates.",
  },
  Rusher: {
    description: "Your pace is outrunning your content — the interviewer is processing before you finish landing your points.",
    coaching: "Slow down the first sentence of your Result section. That's the moment interviewers decide if they understood you.",
  },
  Hedger: {
    description: "Your content is there but your ownership language is softening it — too much 'we' and conditional phrasing.",
    coaching: "Start your next answer with 'I decided…' or 'I drove…' — first-person ownership in the opening line immediately shifts the confidence signal.",
  },
  "Vague Narrator": {
    description: "The story is plausible but not grounded — no numbers, named tools, or concrete proof points.",
    coaching: "Add one concrete number to your Result — a percentage, timeline, or dollar figure. Even a rough estimate makes the story credible.",
  },
  "Monotone Expert": {
    description: "Your content is solid but the delivery is acoustically flat — the answer sounds recited rather than lived.",
    coaching: "When you reach your Result, raise your pitch slightly and pause one beat before saying the outcome. That contrast will carry the whole answer.",
  },
  "Scattered Thinker": {
    description: "Your ideas are present but not sequenced — the interviewer has to work to track your through-line.",
    coaching: "Write S-T-A-R on paper before your next attempt and say 'Situation:' out loud before you start. The label forces structure.",
  },
  "Quiet Achiever": {
    description: "Your content and ownership are strong but your delivery energy isn't matching the quality of what you're saying.",
    coaching: "The story is there — project 15% more volume on your Action and Result sections and the answer will land the way it deserves to.",
  },
  Overloader: {
    description: "Strong depth and detail, but you're burying the lead — the setup is longer than the answer can justify.",
    coaching: "Cut the first 20 seconds of your answer. Move directly to your action and let the context emerge from the specifics.",
  },
};

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

type Signals = {
  overall: number;
  communication: number;
  confidence: number;
  wpm: number | null;
  fillersPer100: number;
  wordCount: number;
  iCount: number;
  weCount: number;
  pitchRange: number | null;
  monotoneScore: number | null;
  energyProfile: "low" | "steady" | "engaging" | "inconsistent";
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
};

export function computeArchetype(signals: Signals): ArchetypeResult {
  const s = signals;

  // Polished Performer — all green across the board
  if (
    s.fluency === "clean" &&
    s.vocalDynamics !== "flat" &&
    s.structure === "strong" &&
    s.ownership !== "soft" &&
    s.outcomeStrength !== "weak" &&
    s.directness !== "wandering"
  ) {
    return make("Polished Performer", ["structure", "ownership", "fluency"]);
  }

  // Rusher — pace is the dominant issue
  if (
    s.pace === "rushed" &&
    (s.cadenceStability === "erratic" || s.fluency !== "clean" || s.structure !== "strong")
  ) {
    return make("Rusher", ["pace", "cadenceStability", "fluency"]);
  }

  // Scattered Thinker — structural chaos
  if (
    s.structure === "weak" &&
    s.directness === "wandering" &&
    s.completeness === "partial"
  ) {
    return make("Scattered Thinker", ["structure", "directness", "completeness"]);
  }

  // Hedger — ownership and confidence are the anchor
  if (
    s.ownership === "soft" &&
    s.confidence <= 6.2 &&
    (s.directness !== "direct" || s.fluency !== "clean")
  ) {
    const hedgerSignals: string[] = ["ownership", "confidence"];
    if (s.weCount > s.iCount * 1.3) hedgerSignals.push("we_vs_i_ratio");
    return make("Hedger", hedgerSignals.slice(0, 3));
  }

  // Monotone Expert — flat delivery, decent content
  if (
    s.vocalDynamics === "flat" &&
    (s.pitchRange !== null ? s.pitchRange < 85 : true) &&
    (s.monotoneScore !== null ? s.monotoneScore >= 6.2 : true) &&
    s.depthMode !== "thin"
  ) {
    return make("Monotone Expert", ["vocalDynamics", "pitchRange", "monotoneScore"]);
  }

  // Quiet Achiever — strong content, low energy/presence
  if (
    s.ownership === "strong" &&
    s.outcomeStrength !== "weak" &&
    (s.energyProfile === "low" || s.presenceSignal === "low")
  ) {
    return make("Quiet Achiever", ["ownership", "energyProfile", "presenceSignal"]);
  }

  // Overloader — verbose and deep but buries the lead
  if (
    (s.depthMode === "deep" || s.specificity === "specific") &&
    s.directness === "wandering" &&
    s.wordCount > 290
  ) {
    return make("Overloader", ["depthMode", "directness", "wordCount"]);
  }

  // Vague Narrator — the default for low-specificity answers
  if (
    s.specificity === "generalized" &&
    s.evidenceMode === "generalized"
  ) {
    return make("Vague Narrator", ["specificity", "evidenceMode", "depthMode"]);
  }

  // Default fallback — assign based on weakest signal
  if (s.structure === "weak") return make("Scattered Thinker", ["structure"]);
  if (s.ownership === "soft") return make("Hedger", ["ownership"]);
  if (s.vocalDynamics === "flat") return make("Monotone Expert", ["vocalDynamics"]);

  return make("Quiet Achiever", ["overall"]);
}

function make(archetype: DeliveryArchetype, primarySignals: string[]): ArchetypeResult {
  return {
    archetype,
    archetypeCoaching: ARCHETYPE_DATA[archetype].coaching,
    archetypeDescription: ARCHETYPE_DATA[archetype].description,
    primarySignals,
  };
}

// ---------------------------------------------------------------------------
// Archetype color / icon map (used in UI)
// ---------------------------------------------------------------------------

export const ARCHETYPE_COLOR: Record<DeliveryArchetype, string> = {
  "Polished Performer": "#10B981",
  Rusher: "#F59E0B",
  Hedger: "#8B5CF6",
  "Vague Narrator": "#6B7280",
  "Monotone Expert": "#2563EB",
  "Scattered Thinker": "#EF4444",
  "Quiet Achiever": "#06B6D4",
  Overloader: "#EC4899",
};
