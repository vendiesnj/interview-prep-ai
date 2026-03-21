// Delivery coaching engine - cross-signal pattern analysis
// Classifies delivery into archetypes and generates specific, actionable coaching.

export type DeliveryArchetype =
  | "controlled_clear"
  | "enthusiastic_rush"
  | "stress_rush"
  | "measured_authority"
  | "flat_articulate"
  | "hesitant_deliberate"
  | "scattered_energy"
  | "quiet_credibility"
  | "raw";

export type SignalRating = "ideal" | "ok" | "needs_work" | "unavailable";

export type RoleFamily = "general" | "finance" | "operations" | "research" | "consulting";

export interface DeliverySignal {
  label: string;
  value: string;
  rating: SignalRating;
  coaching: string;
}

export interface DeliveryCoachProfile {
  archetype: DeliveryArchetype;
  archetypeLabel: string;
  tagline: string;
  whatInterviewersHear: string;
  patternDetail: string;
  primaryLever: string;
  primaryLeverDetail: string;
  effort: "Low" | "Medium" | "High";
  impact: "High" | "Medium" | "Low";
  signals: {
    pace: DeliverySignal;
    variety: DeliverySignal;
    fillers: DeliverySignal;
    energy: DeliverySignal;
  };
  contentInsight: string | null;
  roleNote: string | null;
  hasData: boolean;
}

export interface DeliveryCoachInput {
  wpm?: number | null;
  fillersPer100?: number | null;
  monotoneScore?: number | null;
  energyVariation?: number | null;
  pitchStd?: number | null;       // used directly + as fallback for monotoneScore derivation
  pitchRange?: number | null;
  longPauseRate?: number | null;
  energyStd?: number | null;      // fallback for energyVariation
  jobDesc?: string;
  question?: string;
  framework?: string;
  contentScore?: number | null;
  starMissing?: string[];
  hasStrongStructure?: boolean;
  inputMethod?: "spoken" | "pasted";
}

// ── Internal signal categories ─────────────────────────────────────────────

type PaceCat = "slow" | "deliberate" | "controlled" | "fast" | "rushed" | "unknown";
type MonotoneCat = "expressive" | "moderate" | "flat" | "unknown";
type FillerCat = "clean" | "light" | "moderate" | "heavy" | "unknown";
type EnergyCat = "dynamic" | "moderate" | "low" | "unknown";

function classifyPace(wpm: number | null | undefined): PaceCat {
  if (wpm == null || !Number.isFinite(wpm)) return "unknown";
  if (wpm < 95) return "slow";
  if (wpm < 110) return "deliberate";
  if (wpm <= 145) return "controlled";
  if (wpm <= 165) return "fast";
  return "rushed";
}

function classifyMonotone(score: number | null | undefined): MonotoneCat {
  if (score == null || !Number.isFinite(score)) return "unknown";
  if (score < 3.5) return "expressive";
  if (score < 5.5) return "moderate";
  return "flat";
}

function classifyFillers(rate: number | null | undefined): FillerCat {
  if (rate == null || !Number.isFinite(rate)) return "unknown";
  if (rate < 1) return "clean";
  if (rate < 2) return "light";
  if (rate < 3.5) return "moderate";
  return "heavy";
}

function classifyEnergy(variation: number | null | undefined): EnergyCat {
  if (variation == null || !Number.isFinite(variation)) return "unknown";
  if (variation < 3) return "low";
  if (variation < 6.5) return "moderate";
  return "dynamic";
}

function inferRoleFamily(jobDesc?: string, question?: string): RoleFamily {
  const text = `${jobDesc ?? ""} ${question ?? ""}`.toLowerCase();
  if (/\b(finance|financial|fp&a|accounting|investment|bank|analyst)\b/.test(text)) return "finance";
  if (/\b(operations|supply chain|logistics|inventory|supplier|planning|procurement)\b/.test(text)) return "operations";
  if (/\b(research|science|scientific|experiment|lab|laboratory)\b/.test(text)) return "research";
  if (/\b(consulting|strategy|mckinsey|bain|bcg|deloitte)\b/.test(text)) return "consulting";
  return "general";
}

// ── Archetype classifier ───────────────────────────────────────────────────

function classifyArchetype(
  pace: PaceCat,
  mono: MonotoneCat,
  fillers: FillerCat,
  energy: EnergyCat
): DeliveryArchetype {
  const hasData =
    pace !== "unknown" || mono !== "unknown" || fillers !== "unknown" || energy !== "unknown";
  if (!hasData) return "raw";

  const isRushed = pace === "rushed" || pace === "fast";
  const isSlow = pace === "slow" || pace === "deliberate";
  const isFlat = mono === "flat";
  const isExpressive = mono === "expressive";
  const isHeavyFillers = fillers === "heavy" || fillers === "moderate";
  const isDynamic = energy === "dynamic";
  const isLowEnergy = energy === "low";

  // Stress rush: fast + flat + noticeable fillers - classic anxiety pattern
  if (isRushed && isFlat && isHeavyFillers) return "stress_rush";

  // Enthusiastic rush: fast with good/moderate energy - high energy, too fast
  if (isRushed && (isDynamic || energy === "moderate")) return "enthusiastic_rush";

  // Scattered energy: dynamic but filler-heavy - engaged but disorganized
  if (isDynamic && fillers === "heavy") return "scattered_energy";

  // Measured authority: slow + expressive + clean - deliberate and credible
  if (isSlow && isExpressive && !isHeavyFillers) return "measured_authority";

  // Hesitant deliberate: slow + not expressive - thoughtful but may signal uncertainty
  if (isSlow && !isExpressive) return "hesitant_deliberate";

  // Flat articulate: controlled pace + flat + clean delivery
  if (!isRushed && isFlat && !isHeavyFillers) return "flat_articulate";

  // Quiet credibility: controlled + low energy + clean
  if (!isRushed && isLowEnergy && !isHeavyFillers) return "quiet_credibility";

  return "controlled_clear";
}

// ── Archetype data ─────────────────────────────────────────────────────────

const ARCHETYPE_DATA: Record<
  DeliveryArchetype,
  {
    label: string;
    tagline: string;
    whatInterviewersHear: string;
    patternDetail: string;
    primaryLever: string;
    primaryLeverDetail: string;
    effort: "Low" | "Medium" | "High";
    impact: "High" | "Medium" | "Low";
  }
> = {
  controlled_clear: {
    label: "Controlled & Clear",
    tagline: "Your delivery is reinforcing your content - that's rare.",
    whatInterviewersHear:
      "Confidence, preparation, and clarity. This person sounds like they know their material.",
    patternDetail:
      "Controlled pace, natural vocal variation, and minimal fillers create a delivery style that lets your content do the talking. Interviewers don't have to work to follow you - they can focus entirely on what you're saying.",
    primaryLever: "Pause after your result line",
    primaryLeverDetail:
      "Your delivery is already working well. The one upgrade: after your key metric or outcome, pause for a full beat before continuing. It gives interviewers time to register the impact - and signals you're confident enough not to rush past your best moment.",
    effort: "Low",
    impact: "Medium",
  },

  enthusiastic_rush: {
    label: "Energetic but Rushing",
    tagline: "High energy is an asset - your pace is spending it too fast.",
    whatInterviewersHear:
      "Enthusiasm and knowledge, but key points are getting lost in the momentum.",
    patternDetail:
      "Your vocal energy and range are genuine strengths. The problem is pace: when you speak fast, each point competes with the next for attention. The most important parts - your actions, your results - land without the weight they deserve because there's no contrast to signal they matter.",
    primaryLever: "Slow to 115 WPM at your result line",
    primaryLeverDetail:
      "Don't slow the whole answer - slow down at the most important moment. When you're about to say your result or key metric, take a breath and drop your pace deliberately. The contrast between your normal energy and that intentional slowdown makes the result land significantly harder.",
    effort: "Medium",
    impact: "High",
  },

  stress_rush: {
    label: "Stress Rush",
    tagline: "Fast pace + flat tone + fillers is a recognizable anxiety pattern.",
    whatInterviewersHear:
      "Nervousness or under-preparation - regardless of your actual content quality.",
    patternDetail:
      "This combination - rushing, flat delivery, and filler words - is what anxiety sounds like to an interviewer. It's not necessarily what you feel, but it's what the signals communicate. The good news: all three improve together with one change, because they share the same root cause: not pausing.",
    primaryLever: "Replace every filler with a pause",
    primaryLeverDetail:
      "Every 'um', 'like', or 'you know' should become a 1-second silence. It feels uncomfortable at first, but interviewers read that pause as confidence and control. When you stop filling, your pace also drops and your tone naturally varies more. Practice this on one answer - it changes your baseline across all three signals.",
    effort: "Medium",
    impact: "High",
  },

  measured_authority: {
    label: "Measured Authority",
    tagline: "Deliberate and expressive - you sound like someone who has thought this through.",
    whatInterviewersHear: "Credibility and preparation. This person chooses their words carefully.",
    patternDetail:
      "Slower pace with expressive delivery and clean articulation is the delivery style of someone genuinely confident in their content. The risk: in high-energy environments or with impatient interviewers, it can feel slow - which may read as missing the room's energy rather than commanding it.",
    primaryLever: "Match pace to the interviewer's energy",
    primaryLeverDetail:
      "Your baseline is already strong. When you sense the interviewer is fast-paced or the environment is high-energy, add 10–15% pace and slightly more volume on your key points. Don't change your structure - just match the room's tempo to stay in sync with how they're receiving information.",
    effort: "Low",
    impact: "Medium",
  },

  flat_articulate: {
    label: "Flat but Articulate",
    tagline: "Your words are clear, but your voice isn't adding conviction.",
    whatInterviewersHear:
      "Competence without enthusiasm - a gap that doesn't reflect your actual capability.",
    patternDetail:
      "Clear structure and minimal fillers are real strengths. The delivery gap is monotone pitch - when every part of your answer sounds equally important, interviewers can't tell what you're most proud of or most certain about. The content is there; the vocal signal that you believe in it isn't.",
    primaryLever: "Pitch lift on your result line",
    primaryLeverDetail:
      "You don't need to be theatrical. Add a slight pitch rise - and a half-second pause after - when you state your result or key metric. Say the outcome with just slightly more volume and a rising tone on the key number or phrase. That one sentence, delivered with emphasis, changes how the entire answer lands in the interviewer's memory.",
    effort: "Low",
    impact: "High",
  },

  hesitant_deliberate: {
    label: "Hesitant Pace",
    tagline: "Thoughtful delivery can read as uncertainty - here's the fix.",
    whatInterviewersHear:
      "Careful thinking, but possibly searching for the answer rather than delivering one you know cold.",
    patternDetail:
      "Slow pace with pauses signals deliberateness - but there's a fine line between 'thoughtful' and 'hesitant.' When pace dips below 100 WPM, some interviewers start to wonder if you're constructing the answer in real time rather than recalling one you've prepared. The content may be strong, but the delivery signal undermines it.",
    primaryLever: "Shorten sentences to build momentum",
    primaryLeverDetail:
      "Your pace slows when sentences get long and connected. Break complex thoughts into two shorter ones. 'I led the project and coordinated with three teams to deliver it in six weeks.' → 'I led the project. Three teams, six weeks.' Shorter sentences sound more decisive even at the same pace - and they're easier for interviewers to track.",
    effort: "Medium",
    impact: "High",
  },

  scattered_energy: {
    label: "Scattered Energy",
    tagline: "High engagement that reads as disorganized.",
    whatInterviewersHear:
      "Enthusiasm, but the structure is getting lost in the energy.",
    patternDetail:
      "Dynamic vocal range and genuine engagement are real assets. The problem is that combined with a high filler rate, the energy reads as reactive rather than controlled. Interviewers can't always tell where one point ends and the next begins - your content is harder to follow than it needs to be.",
    primaryLever: "One thought per sentence, then fully stop",
    primaryLeverDetail:
      "After each complete thought, pause fully before continuing. Don't bridge sentences with 'and', 'so', or 'like' - let each one stand alone. 'I did X.' [pause] 'The outcome was Y.' [pause] This slows the energy just enough for each point to land before the next one arrives. The pauses also eliminate most of your fillers naturally.",
    effort: "Medium",
    impact: "High",
  },

  quiet_credibility: {
    label: "Quiet Credibility",
    tagline: "Controlled and clear - but your vocal energy may not be matching your confidence.",
    whatInterviewersHear:
      "Composure and precision, but possibly reserved or low-energy depending on the interviewer.",
    patternDetail:
      "Low energy variation with clean delivery and controlled pace sits on a narrow margin: some interviewers read it as calm authority, others as disengagement. The difference usually comes down to volume and emphasis at key moments - not your overall energy level, just targeted projection at the right instants.",
    primaryLever: "Project on key phrases, not all of them",
    primaryLeverDetail:
      "Pick 2–3 moments in your answer - your main action, your result, your key metric - and say those phrases noticeably louder with a brief pause before them. You don't need to raise your energy across the whole answer. Just be visibly more present at the moments that matter most, and let the contrast do the work.",
    effort: "Low",
    impact: "High",
  },

  raw: {
    label: "No Delivery Data",
    tagline: "Record a spoken answer to unlock delivery coaching.",
    whatInterviewersHear: "No audio data captured for this attempt.",
    patternDetail:
      "Delivery coaching requires a recorded spoken answer. Pasted text attempts don't generate acoustic signals - pace, filler words, vocal variety, and energy can only be measured from audio.",
    primaryLever: "Record a spoken answer",
    primaryLeverDetail:
      "Use the microphone option to practice with audio. Delivery coaching - pace, filler detection, vocal variety, and energy - will be automatically analyzed and a full profile generated.",
    effort: "Low",
    impact: "High",
  },
};

// ── Signal builders ────────────────────────────────────────────────────────

function buildPaceSignal(wpm: number | null | undefined, cat: PaceCat): DeliverySignal {
  if (cat === "unknown" || wpm == null) {
    return {
      label: "Pace",
      value: " - ",
      rating: "unavailable",
      coaching: "Record a spoken answer to measure speaking pace.",
    };
  }
  const display = `${Math.round(wpm)} WPM`;
  if (cat === "controlled") {
    return { label: "Pace", value: display, rating: "ideal", coaching: "Ideal range - keep it here." };
  }
  if (cat === "deliberate") {
    return { label: "Pace", value: display, rating: "ok", coaching: "Slightly slow - tighten pauses and cut filler setup sentences." };
  }
  if (cat === "slow") {
    return { label: "Pace", value: display, rating: "needs_work", coaching: "Too slow - get to the point earlier and shorten sentences." };
  }
  if (cat === "fast") {
    return { label: "Pace", value: display, rating: "ok", coaching: "A little fast - slow down specifically at your result line." };
  }
  return { label: "Pace", value: display, rating: "needs_work", coaching: "Too fast - add deliberate pauses after key metrics and outcomes." };
}

function buildVarietySignal(monotoneScore: number | null | undefined, cat: MonotoneCat, inputMethod?: "spoken" | "pasted"): DeliverySignal {
  if (cat === "unknown") {
    const coaching = inputMethod === "pasted"
      ? "Paste answers don't have audio - record a spoken answer to unlock vocal variety analysis."
      : inputMethod === "spoken"
      ? "Pitch data wasn't captured for this attempt - the analysis service may have been busy. Re-record to get this signal."
      : "No pitch data captured for this attempt.";
    return { label: "Vocal Variety", value: " - ", rating: "unavailable", coaching };
  }
  const display = cat === "expressive" ? "Expressive" : cat === "moderate" ? "Moderate" : "Flat";
  if (cat === "expressive") {
    return { label: "Vocal Variety", value: display, rating: "ideal", coaching: "Good tonal range - interviewers can hear where you're confident." };
  }
  if (cat === "moderate") {
    return { label: "Vocal Variety", value: display, rating: "ok", coaching: "Some range - add more lift specifically on outcomes and results." };
  }
  return { label: "Vocal Variety", value: display, rating: "needs_work", coaching: "Pitch isn't varying - add a deliberate rise when stating your key metric." };
}

function buildFillersSignal(rate: number | null | undefined, cat: FillerCat): DeliverySignal {
  if (cat === "unknown" || rate == null) {
    return {
      label: "Filler Words",
      value: " - ",
      rating: "unavailable",
      coaching: "Filler detection requires a transcript.",
    };
  }
  const display = `${rate.toFixed(1)} per 100 words`;
  if (cat === "clean") {
    return { label: "Filler Words", value: display, rating: "ideal", coaching: "Very clean - no filler issue detected." };
  }
  if (cat === "light") {
    return { label: "Filler Words", value: display, rating: "ideal", coaching: "Mostly clean - minor fillers, no coaching needed." };
  }
  if (cat === "moderate") {
    return { label: "Filler Words", value: display, rating: "ok", coaching: "Noticeable fillers - replace each with a 1-second pause." };
  }
  return { label: "Filler Words", value: display, rating: "needs_work", coaching: "High filler rate - every 'um' or 'like' should become a pause instead." };
}

function buildEnergySignal(variation: number | null | undefined, cat: EnergyCat, inputMethod?: "spoken" | "pasted"): DeliverySignal {
  if (cat === "unknown") {
    const coaching = inputMethod === "pasted"
      ? "Paste answers don't have audio - record a spoken answer to unlock energy analysis."
      : inputMethod === "spoken"
      ? "Energy data wasn't captured for this attempt - the analysis service may have been busy. Re-record to get this signal."
      : "No energy data captured for this attempt.";
    return { label: "Energy", value: " - ", rating: "unavailable", coaching };
  }
  const display = cat === "dynamic" ? "Dynamic" : cat === "moderate" ? "Steady" : "Low";
  if (cat === "dynamic") {
    return { label: "Energy", value: display, rating: "ideal", coaching: "Strong energy variation - keeps interviewers engaged." };
  }
  if (cat === "moderate") {
    return { label: "Energy", value: display, rating: "ok", coaching: "Healthy baseline - add more projection on outcome statements." };
  }
  return { label: "Energy", value: display, rating: "needs_work", coaching: "Low energy - project 10–15% louder on your key moments." };
}

// ── Content × Delivery insight ─────────────────────────────────────────────

function buildContentInsight(
  archetype: DeliveryArchetype,
  framework: string | undefined,
  contentScore: number | null | undefined,
  starMissing: string[],
  hasStrongStructure: boolean | undefined
): string | null {
  if (archetype === "raw") return null;

  const score = typeof contentScore === "number" ? contentScore : null;
  const isStar = framework === "star";
  const missingResult = starMissing.includes("result");

  if (isStar && missingResult) {
    return "Your Result line is missing from the STAR structure - that's the highest-weighted component. Any delivery improvement is secondary to adding a clear outcome sentence first.";
  }

  if (isStar && hasStrongStructure && (archetype === "flat_articulate" || archetype === "quiet_credibility")) {
    return "Your STAR structure is strong. The coaching opportunity here is purely delivery - add vocal emphasis at the Result component to signal conviction in the outcome, not just the process.";
  }

  if (score !== null && score >= 7.5 && (archetype === "stress_rush" || archetype === "enthusiastic_rush")) {
    return "Your content scored well despite the delivery pace. With more controlled delivery, you'd likely score higher - interviewers may be discounting content quality due to the speed.";
  }

  if (score !== null && score < 5.5 && archetype !== "controlled_clear") {
    return "Delivery isn't the primary issue here. Focus on content structure first - once the answer is sharper, delivery improvements will have more to work with.";
  }

  if (framework === "technical_explanation") {
    return "Technical answers benefit from slower, more deliberate delivery. Taking your time signals you understand the material deeply enough to explain it clearly - not that you're searching for the answer.";
  }

  if (framework === "experience_depth" && (archetype === "flat_articulate" || archetype === "quiet_credibility")) {
    return "Experience depth answers land harder when your delivery shows conviction in what you're describing. The moments where you name specific outcomes are where vocal energy matters most.";
  }

  return null;
}

// ── Role calibration ───────────────────────────────────────────────────────

function buildRoleNote(archetype: DeliveryArchetype, roleFamily: RoleFamily): string | null {
  if (roleFamily === "general" || archetype === "raw") return null;

  if (roleFamily === "finance") {
    if (archetype === "measured_authority") {
      return "Finance interviews tend to reward measured, precise delivery - your current style aligns well with the environment.";
    }
    if (archetype === "enthusiastic_rush" || archetype === "scattered_energy") {
      return "Finance interviewers typically prefer controlled, precise delivery. Pull back the pace and energy to sound more deliberate and numbers-focused.";
    }
  }

  if (roleFamily === "consulting") {
    if (archetype === "hesitant_deliberate") {
      return "Consulting interviews move fast and reward decisive communication. Your current pace may read as uncertain - work on sentence-level momentum.";
    }
    if (archetype === "flat_articulate") {
      return "Consulting values structured thinking AND confident delivery. The vocal flatness may undercut your otherwise strong structure - interviewers are looking for conviction behind the frameworks.";
    }
  }

  if (roleFamily === "research") {
    if (archetype === "measured_authority") {
      return "Research roles value deliberate, careful delivery - your pace and style are well-suited to this environment.";
    }
    if (archetype === "stress_rush") {
      return "Even in fast-moving research environments, rushed delivery signals under-preparation. Slower and controlled beats fast and anxious.";
    }
  }

  if (roleFamily === "operations") {
    if (archetype === "hesitant_deliberate") {
      return "Operations interviews focus on decisiveness and clarity. A slightly faster pace with shorter sentences better signals command of your material.";
    }
    if (archetype === "measured_authority") {
      return "Operations roles reward structured, decisive communication - your measured style works well here, especially if you keep pacing crisp.";
    }
  }

  return null;
}

// ── Main export ────────────────────────────────────────────────────────────

export function computeDeliveryCoach(input: DeliveryCoachInput): DeliveryCoachProfile {
  // Derive fallbacks when primary acoustic fields are missing
  const effectiveMonotone =
    input.monotoneScore ??
    (input.pitchStd != null ? Math.max(0, Math.min(10, 10 - input.pitchStd / 2.5)) : null);
  const effectiveEnergy =
    input.energyVariation ??
    (input.energyStd != null ? Math.max(0, Math.min(10, (input.energyStd / 0.12) * 10)) : null);

  const paceCat = classifyPace(input.wpm);
  const monoCat = classifyMonotone(effectiveMonotone);
  const fillersCat = classifyFillers(input.fillersPer100);
  const energyCat = classifyEnergy(effectiveEnergy);

  const hasData =
    paceCat !== "unknown" ||
    monoCat !== "unknown" ||
    fillersCat !== "unknown" ||
    energyCat !== "unknown";

  const archetype = classifyArchetype(paceCat, monoCat, fillersCat, energyCat);
  const data = ARCHETYPE_DATA[archetype];
  const roleFamily = inferRoleFamily(input.jobDesc, input.question);

  const signals = {
    pace: buildPaceSignal(input.wpm, paceCat),
    variety: buildVarietySignal(effectiveMonotone, monoCat, input.inputMethod),
    fillers: buildFillersSignal(input.fillersPer100, fillersCat),
    energy: buildEnergySignal(effectiveEnergy, energyCat, input.inputMethod),
  };

  const contentInsight = buildContentInsight(
    archetype,
    input.framework,
    input.contentScore,
    input.starMissing ?? [],
    input.hasStrongStructure
  );

  const roleNote = buildRoleNote(archetype, roleFamily);

  return {
    archetype,
    archetypeLabel: data.label,
    tagline: data.tagline,
    whatInterviewersHear: data.whatInterviewersHear,
    patternDetail: data.patternDetail,
    primaryLever: data.primaryLever,
    primaryLeverDetail: data.primaryLeverDetail,
    effort: data.effort,
    impact: data.impact,
    signals,
    contentInsight,
    roleNote,
    hasData,
  };
}
