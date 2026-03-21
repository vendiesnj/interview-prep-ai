import { ROLE_LIBRARY } from "./library";
import type { ComposeArgs, RoleFamily } from "./types";

function normalizeText(s: string) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function hashString(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}

function pickDeterministic(arr: string[], seed: string, salt: string) {
  if (!arr.length) return "";
  const idx = hashString(`${seed}:${salt}`) % arr.length;
  return arr[idx];
}

function dedupe(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const k = item.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item.trim());
  }
  return out;
}

function num(v: any): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function inferRoleFamily(jobDesc: string, question: string): RoleFamily {
  const text = normalizeText(`${jobDesc} ${question}`);
  if (/\b(finance|financial|fp&a|accounting|investment|bank|analyst)\b/.test(text)) return "finance";
  if (/\b(operations|supply chain|logistics|inventory|supplier|planning|procurement)\b/.test(text)) return "operations";
  if (/\b(research|science|scientific|experiment|lab|laboratory|associate)\b/.test(text)) return "research";
  if (/\b(consulting|strategy)\b/.test(text)) return "consulting";
  return "general";
}

function roleLine(roleFamily: RoleFamily, key: keyof (typeof ROLE_LIBRARY)["finance"], seed: string, salt: string) {
  const arr = ROLE_LIBRARY?.[roleFamily]?.[key] ?? [];
  return pickDeterministic(arr, seed, salt);
}

function extractSignals(args: ComposeArgs) {
  const delivery = (args.deliveryMetrics ?? {}) as any;
  const acoustics = (delivery.acoustics ?? {}) as any;
  const prosody = (delivery.prosody ?? {}) as any;
  const normalized = (args.normalized ?? {}) as any;
  const relevance = (normalized.relevance ?? {}) as any;
  const tech = (normalized.technical_explanation ?? {}) as any;
  const exp = (normalized.experience_depth ?? {}) as any;
  const star = (normalized.star ?? {}) as any;

  const transcript = normalizeText(args.transcript ?? "");
  const iCount = (transcript.match(/\bi\b/g) || []).length;
  const weCount = (transcript.match(/\bwe\b/g) || []).length;

  return {
    overall: num(normalized.score) ?? 6.5,
    communication: num(normalized.communication_score) ?? 6.5,
    confidence: num(normalized.confidence_score) ?? 6.5,
    directness: num(relevance.directness_score) ?? 6.8,
    completeness: num(relevance.completeness_score) ?? 6.8,
    answeredQuestion: relevance.answered_question !== false,
    wpm: num(delivery.wpm) ?? num(normalized.wpm),
    fillersPer100: num(args.fillerStats?.fillersPer100Words) ?? 0,
    fillerTotal: num(args.fillerStats?.total) ?? 0,
    wordCount: num(args.fillerStats?.wordCount) ?? 0,
    avgPauseMs: num(delivery.avgPauseMs) ?? num(delivery.avg_pause_ms),
    maxPauseMs: num(delivery.maxPauseMs) ?? num(delivery.max_pause_ms),
    pauseCount: num(delivery.pauseCount) ?? num(delivery.pause_count),
    longPauseCount: num(delivery.longPauseCount) ?? num(delivery.long_pause_count),
    monotoneScore: num(acoustics.monotoneScore) ?? num(prosody.monotoneScore) ?? num(normalized?.deliveryMetrics?.acoustics?.monotoneScore),
    pitchStd: num(acoustics.pitchStd) ?? num(acoustics.pitch_std) ?? num(acoustics.pitchStdHz),
    pitchRange: num(acoustics.pitchRange) ?? num(acoustics.pitch_range),
    energyStd: num(acoustics.energyStd) ?? num(acoustics.energy_std),
    energyVariation: num(acoustics.energyVariation) ?? num(acoustics.energy_variation),
    tempoDynamics: num(delivery.tempoDynamics) ?? num(delivery.tempo_dynamics),
    starResult: num(star.result),
    techDepth: num(tech.depth),
    techStructure: num(tech.structure),
    techPracticalReasoning: num(tech.practical_reasoning),
    techClarity: num(tech.technical_clarity),
    expDepth: num(exp.experience_depth),
    expSpecificity: num(exp.specificity),
    expImpact: num(exp.business_impact),
    expExampleQuality: num(exp.example_quality),
    iCount,
    weCount,
    transcript,
  };
}

function buildDeliveryProfile(s: ReturnType<typeof extractSignals>) {
  let pace: "slow" | "controlled" | "fast" | "rushed" = "controlled";
  if (s.wpm !== null && s.wpm >= 168) pace = "rushed";
  else if (s.wpm !== null && s.wpm >= 150) pace = "fast";
  else if (s.wpm !== null && s.wpm < 102) pace = "slow";

  let fluency: "clean" | "slightly_disfluent" | "filler_heavy" | "fragmented" = "clean";
  if (s.fillersPer100 >= 4.2) fluency = "filler_heavy";
  else if (s.fillersPer100 >= 2.4) fluency = "slightly_disfluent";
  if (s.avgPauseMs !== null && s.avgPauseMs > 1500 && s.fillersPer100 >= 2.4) fluency = "fragmented";

  let pausing: "controlled" | "hesitant" | "compressed" | "over_paused" = "controlled";
  if (s.avgPauseMs !== null && s.avgPauseMs > 1500) pausing = "over_paused";
  else if (s.avgPauseMs !== null && s.avgPauseMs > 1100) pausing = "hesitant";
  else if (s.avgPauseMs !== null && s.avgPauseMs < 380) pausing = "compressed";

  let vocalDynamics: "flat" | "moderate" | "dynamic" | "erratic" = "moderate";
  if ((s.monotoneScore !== null && s.monotoneScore >= 6.2) || (s.pitchRange !== null && s.pitchRange < 70)) {
    vocalDynamics = "flat";
  } else if ((s.energyVariation !== null && s.energyVariation > 1.7) || (s.tempoDynamics !== null && s.tempoDynamics > 1.7)) {
    vocalDynamics = "erratic";
  } else if ((s.monotoneScore !== null && s.monotoneScore <= 4.2) || (s.pitchRange !== null && s.pitchRange > 120)) {
    vocalDynamics = "dynamic";
  }

  let energyProfile: "low" | "steady" | "engaging" | "inconsistent" = "steady";
  if ((s.energyVariation !== null && s.energyVariation < 0.35) || vocalDynamics === "flat") energyProfile = "low";
  else if ((s.energyVariation !== null && s.energyVariation > 1.7) || vocalDynamics === "erratic") energyProfile = "inconsistent";
  else if (vocalDynamics === "dynamic" && pace !== "rushed") energyProfile = "engaging";

  let emphasisControl: "weak" | "moderate" | "strong" = "moderate";
  if (vocalDynamics === "flat" || energyProfile === "low") emphasisControl = "weak";
  else if (vocalDynamics === "dynamic" && energyProfile !== "inconsistent") emphasisControl = "strong";

  let cadenceStability: "stable" | "slightly_uneven" | "erratic" = "stable";
  if (pace === "rushed" && fluency !== "clean") cadenceStability = "erratic";
  else if (pausing === "hesitant" || pausing === "compressed" || vocalDynamics === "erratic") cadenceStability = "slightly_uneven";

  return { pace, fluency, pausing, vocalDynamics, energyProfile, emphasisControl, cadenceStability };
}

function buildAnswerPattern(s: ReturnType<typeof extractSignals>, args: ComposeArgs) {
  let structure: "strong" | "moderate" | "weak" = "moderate";
  if (s.communication >= 7.8) structure = "strong";
  else if (s.communication <= 6.2) structure = "weak";

  let directness: "direct" | "delayed" | "wandering" = "direct";
  if (s.directness <= 6.0) directness = "wandering";
  else if (s.directness <= 6.7) directness = "delayed";

  let completeness: "complete" | "partial" = "complete";
  if (!s.answeredQuestion || s.completeness <= 6.3) completeness = "partial";

  let ownership: "strong" | "moderate" | "soft" = "moderate";
  if (s.iCount >= s.weCount * 1.5) ownership = "strong";
  else if (s.weCount > s.iCount * 1.3 || s.confidence <= 6.2) ownership = "soft";

  let outcomeStrength: "strong" | "moderate" | "weak" = "moderate";
  const outcomeSignal = args.framework === "star" ? s.starResult : args.framework === "technical_explanation" ? s.techPracticalReasoning : s.expImpact;
  if ((outcomeSignal ?? 6.5) >= 7.8) outcomeStrength = "strong";
  else if ((outcomeSignal ?? 6.5) <= 6.2) outcomeStrength = "weak";

  let specificity: "specific" | "mixed" | "generalized" = "mixed";
  if (/\b\d+%|\b\d+\b|\$|\bpercent\b|\bmetric\b|\bkpi\b/.test(s.transcript) || (s.expSpecificity ?? 0) >= 7.4) specificity = "specific";
  else if ((s.expSpecificity ?? 6.5) <= 6.2) specificity = "generalized";

  let evidenceMode: "metrics_forward" | "example_forward" | "process_forward" | "generalized" = "generalized";
  if (/\b\d+%|\b\d+\b|\$|\bpercent\b|\bmetric\b|\bkpi\b/.test(s.transcript)) evidenceMode = "metrics_forward";
  else if (/\bfor example\b|\bfor instance\b|\bone time\b|\bin one project\b/.test(s.transcript)) evidenceMode = "example_forward";
  else if (/\bfirst\b|\bthen\b|\bafter\b|\bprocess\b|\bworkflow\b|\bmethod\b/.test(s.transcript)) evidenceMode = "process_forward";

  let depthMode: "deep" | "adequate" | "thin" = "adequate";
  const depthSignal = args.framework === "technical_explanation" ? s.techDepth : args.framework === "experience_depth" ? s.expDepth : s.communication;
  if ((depthSignal ?? 6.5) >= 7.6) depthMode = "deep";
  else if ((depthSignal ?? 6.5) <= 6.1) depthMode = "thin";

  return { structure, directness, completeness, ownership, outcomeStrength, specificity, evidenceMode, depthMode };
}

type ThemeKey = "structure" | "clarity" | "delivery_control" | "pace_control" | "vocal_presence" | "outcome_strength" | "specificity" | "ownership" | "depth" | "directness" | "completeness" | "role_alignment";

function buildStrengthThemes(s: ReturnType<typeof extractSignals>, delivery: ReturnType<typeof buildDeliveryProfile>, answer: ReturnType<typeof buildAnswerPattern>, roleFamily: RoleFamily) {
  const themes: { key: ThemeKey; weight: number }[] = [];
  if (answer.structure === "strong") themes.push({ key: "structure", weight: 1.0 });
  if (s.communication >= 7.7) themes.push({ key: "clarity", weight: 0.95 });
  if (delivery.fluency === "clean") themes.push({ key: "delivery_control", weight: 0.9 });
  if (delivery.pace === "controlled") themes.push({ key: "pace_control", weight: 0.82 });
  if (delivery.vocalDynamics === "dynamic" || delivery.emphasisControl === "strong") themes.push({ key: "vocal_presence", weight: 0.82 });
  if (answer.outcomeStrength === "strong") themes.push({ key: "outcome_strength", weight: 0.9 });
  if (answer.specificity === "specific") themes.push({ key: "specificity", weight: 0.82 });
  if (answer.ownership === "strong") themes.push({ key: "ownership", weight: 0.78 });
  if (answer.depthMode === "deep") themes.push({ key: "depth", weight: 0.76 });
  if (answer.directness === "direct") themes.push({ key: "directness", weight: 0.75 });
  if (answer.completeness === "complete") themes.push({ key: "completeness", weight: 0.74 });
  if (roleFamily === "finance" && answer.directness === "direct" && answer.outcomeStrength !== "weak") themes.push({ key: "role_alignment", weight: 0.72 });
  if (roleFamily === "operations" && answer.depthMode !== "thin" && answer.evidenceMode === "process_forward") themes.push({ key: "role_alignment", weight: 0.72 });
  if (roleFamily === "research" && answer.specificity === "specific" && answer.depthMode !== "thin") themes.push({ key: "role_alignment", weight: 0.72 });
  if (roleFamily === "consulting" && answer.structure === "strong" && answer.directness === "direct") themes.push({ key: "role_alignment", weight: 0.72 });
  return themes.sort((a, b) => b.weight - a.weight);
}

function buildImprovementThemes(s: ReturnType<typeof extractSignals>, delivery: ReturnType<typeof buildDeliveryProfile>, answer: ReturnType<typeof buildAnswerPattern>, roleFamily: RoleFamily) {
  const themes: { key: ThemeKey; weight: number }[] = [];
  if (answer.outcomeStrength === "weak") themes.push({ key: "outcome_strength", weight: 1.0 });
  if (delivery.fluency === "filler_heavy" || delivery.fluency === "fragmented") themes.push({ key: "delivery_control", weight: 0.95 });
  if (answer.directness !== "direct") themes.push({ key: "directness", weight: 0.9 });
  if (answer.structure === "weak") themes.push({ key: "structure", weight: 0.88 });
  if (answer.ownership === "soft") themes.push({ key: "ownership", weight: 0.82 });
  if (answer.specificity === "generalized") themes.push({ key: "specificity", weight: 0.8 });
  if (delivery.vocalDynamics === "flat" || delivery.emphasisControl === "weak") themes.push({ key: "vocal_presence", weight: 0.76 });
  if (delivery.pace === "rushed" || delivery.pace === "slow") themes.push({ key: "pace_control", weight: 0.74 });
  if (answer.depthMode === "thin") themes.push({ key: "depth", weight: 0.72 });
  if (answer.completeness === "partial") themes.push({ key: "completeness", weight: 0.72 });
  if (roleFamily === "finance" && (answer.directness !== "direct" || answer.outcomeStrength === "weak")) themes.push({ key: "role_alignment", weight: 0.68 });
  if (roleFamily === "operations" && (answer.depthMode === "thin" || answer.evidenceMode === "generalized")) themes.push({ key: "role_alignment", weight: 0.68 });
  if (roleFamily === "research" && (answer.specificity === "generalized" || answer.depthMode === "thin")) themes.push({ key: "role_alignment", weight: 0.68 });
  if (roleFamily === "consulting" && (answer.structure === "weak" || answer.directness !== "direct")) themes.push({ key: "role_alignment", weight: 0.68 });
  const deduped: { key: ThemeKey; weight: number }[] = [];
  const seen = new Set<ThemeKey>();
  for (const item of themes.sort((a, b) => b.weight - a.weight)) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    deduped.push(item);
  }
  return deduped;
}

function buildDiagnosis(args: ComposeArgs) {
  const roleFamily = inferRoleFamily(args.jobDesc, args.question);
  const signals = extractSignals(args);
  const delivery = buildDeliveryProfile(signals);
  const answer = buildAnswerPattern(signals, args);
  const strengthThemes = buildStrengthThemes(signals, delivery, answer, roleFamily);
  const improvementThemes = buildImprovementThemes(signals, delivery, answer, roleFamily);
  return { roleFamily, signals, delivery, answer, strengthThemes, improvementThemes, dominantStrength: strengthThemes[0]?.key ?? "clarity", dominantImprovement: improvementThemes[0]?.key ?? "outcome_strength" };
}


// ---------------------------------------------------------------------------
// STRENGTH POOLS - 20 variants per theme, each distinct in voice and framing
// ---------------------------------------------------------------------------

const STRENGTH_POOLS: Record<string, string[]> = {
  structure: [
    "The answer is organized clearly enough that the interviewer can follow the logic without extra effort.",
    "Your structure holds together - each section leads into the next without losing momentum.",
    "The response has a shape that works in your favor: context, action, and result stay in the right order.",
    "Ideas build in a logical sequence, which makes the answer easy to track from start to finish.",
    "The organizational discipline here is a real asset - nothing is out of place.",
    "You move through the answer in a way that feels intentional rather than improvised.",
    "The structure doesn't drift, which helps the interviewer absorb your main point early.",
    "Your answer has a clear backbone - the progression feels earned rather than accidental.",
    "The framing is clean: you set up the problem, explain what you did, and land the point.",
    "Good sequencing means your strongest ideas arrive where they'll have the most impact.",
    "The response has enough shape to feel controlled, which translates directly into credibility.",
    "You don't over-explain the setup, which keeps the structure tight and the answer moving.",
    "Each component of the answer supports the one that follows - the logic is coherent.",
    "The structure works because it mirrors how a strong interviewer wants to receive information.",
    "Your answer doesn't wander, which is one of the clearest markers of a prepared candidate.",
    "The through-line stays visible throughout - the interviewer always knows where you are in the story.",
    "You've organized the response in a way that respects the interviewer's attention.",
    "The answer is disciplined in how it moves from setup to action to takeaway.",
    "Structure is working hard for you here - it makes average content sound stronger.",
    "The flow doesn't collapse at any point, which is harder to do under pressure than it looks.",
  ],
  clarity: [
    "Your language stays accessible throughout - the main idea is never buried under extra words.",
    "The explanation lands cleanly because you don't over-complicate the framing.",
    "Clear phrasing is doing real work here - the interviewer can identify your point quickly.",
    "You communicate the core idea without cluttering it with unnecessary qualifications.",
    "The answer reads as confident and well-organized, largely because the language is direct.",
    "Clarity is a genuine strength in this response - the ideas are easy to follow.",
    "You don't lose the listener in jargon or hedging - the message gets through.",
    "The verbal clarity here is above average, which supports the overall quality of the answer.",
    "Your sentences are tight enough that the meaning survives on the first pass.",
    "The main point is identifiable from early in the response, which reduces listener effort.",
    "Your wording is accessible without being vague - specific and clear at the same time.",
    "The answer doesn't talk around the point, it makes the point.",
    "Clean framing makes your ideas easier to trust - ambiguity is minimal here.",
    "Your explanation doesn't require the interviewer to do extra interpretive work.",
    "The language is economical in a good way - you say enough to be convincing without over-elaborating.",
    "Verbal clarity keeps the answer from losing momentum in the middle sections.",
    "Your communication is consistent - there's no section where the meaning gets blurry.",
    "The ideas transfer cleanly because you've chosen language that doesn't get in the way.",
    "Strong verbal clarity signals preparation and confidence even when content is still developing.",
    "The way you phrase key points makes them easy to remember - concrete and specific.",
  ],
  delivery_control: [
    "Your delivery sounds practiced without being over-rehearsed - the answer flows naturally.",
    "Filler usage is contained enough that it doesn't interrupt the listener's experience.",
    "The speaking pattern is controlled - you're not filling dead air with unnecessary words.",
    "Your transitions are clean, which keeps the answer moving without sounding rushed.",
    "The delivery holds steady throughout - no section falls apart under its own weight.",
    "Verbal discipline is evident here - the answer sounds composed even in the harder moments.",
    "You're not reaching for filler words at the moments that matter most.",
    "The fluency of this response gives the content more room to land clearly.",
    "Clean delivery is a credibility signal - you sound like someone who's prepared and in control.",
    "Your speaking pattern doesn't fight your content - they work in the same direction.",
    "The answer is polished enough that the interviewer's attention stays on what you're saying.",
    "Delivery control keeps your strongest ideas from getting buried under verbal noise.",
    "You sound like you've thought this through before speaking - the delivery confirms the preparation.",
    "The transitions between sections don't introduce clutter, which keeps the answer clean.",
    "Your verbal control is a real asset in a setting where composure matters.",
    "The response doesn't accumulate filler pressure - each sentence starts with purpose.",
    "Clean delivery means your words carry more weight than they would in a more scattered response.",
    "The speaking pattern is steady enough that the content has room to work.",
    "Your phrasing is deliberate in a way that communicates confidence without announcing it.",
    "Delivery is one of the clearest strengths here - the answer sounds professional and controlled.",
  ],
  pace_control: [
    "Your pace is measured enough that key ideas have time to register before the next point arrives.",
    "The tempo feels deliberately controlled - you're not sprinting through important sections.",
    "A steady pace makes the answer easier to follow and harder to discount.",
    "You're hitting a speaking rate that feels natural for a high-stakes conversation.",
    "The pacing doesn't compress your content - each point gets the space it needs.",
    "Your tempo is a strength here - it keeps the listener oriented without slowing the answer down.",
    "Good pace means your strongest lines are actually being heard, not skimmed.",
    "The speaking rate lands in a range that signals confidence without sounding hurried.",
    "You're giving ideas enough runway to land without the answer dragging.",
    "The tempo is balanced - fast enough to feel energetic, slow enough to feel intentional.",
    "Pacing control helps the delivery feel less like a data dump and more like a conversation.",
    "The answer breathes at the right moments, which gives the content more credibility.",
    "Your pace stays consistent even where the content gets complex - that's a real skill.",
    "Speaking at a measured pace is one of the clearest signals of preparation and calm.",
    "The tempo here is an asset - it makes average content sound more deliberate than it is.",
    "Good pacing means the answer doesn't lose coherence under its own weight.",
    "The rate of speech doesn't fight clarity - they work together throughout this response.",
    "You're not racing to get through it, which signals a level of comfort with the material.",
    "The pacing feels natural, which is harder to achieve under pressure than it appears.",
    "Tempo control is doing quiet work in this response - it keeps everything from blurring together.",
  ],
  vocal_presence: [
    "Your voice has enough variation to make the content feel more alive than a flat delivery would.",
    "Vocal dynamics separate your key points from background detail - the result stands out.",
    "You're using emphasis in a way that helps the interviewer track what matters most.",
    "The tonal range here adds credibility - it doesn't sound like a script being read back.",
    "Your delivery has energy without being erratic - the variation feels controlled.",
    "Emphasis control means your strongest lines don't blend into the rest of the answer.",
    "The vocal presence here is a genuine asset - it makes the answer more engaging to receive.",
    "Your voice moves in a way that helps the listener stay oriented - highs and lows are purposeful.",
    "More vocal variety than average here, which prevents the answer from sounding monotone.",
    "The emphasis on key moments is a signal of confidence - it sounds like you mean it.",
    "Your vocal dynamics help the answer feel more like a conversation than a presentation.",
    "The energy you bring to the delivery supports the content, rather than competing with it.",
    "Pitch variation is working in your favor - outcomes and decisions sound more important.",
    "The way you land certain lines signals that you know which parts of the answer matter most.",
    "Your delivery has range, which is harder to fake and more credible as a result.",
    "The vocal control here is above average - you're using your voice to do real communicative work.",
    "Energy variation keeps the listener's attention across the full length of the response.",
    "Your speaking pattern has natural inflection, which prevents the answer from feeling rote.",
    "The delivery is expressive in a calibrated way - purposeful rather than performative.",
    "Vocal presence is a strength that carries over across different answer types.",
  ],
  outcome_strength: [
    "The payoff lands clearly - the interviewer can hear what changed as a result of your work.",
    "You close the loop on the story: the result is stated, not implied.",
    "The outcome is explicit enough that the interviewer doesn't have to infer the impact.",
    "A clear result sentence is one of the hardest things to do well, and you've done it here.",
    "The ending works because it answers the unstated question: so what happened?",
    "Your result statement is concrete enough to be persuasive rather than vague.",
    "The answer finishes strong - the closing impact is as clear as the action that preceded it.",
    "The payoff doesn't fade out - it's stated directly and with enough specificity to land.",
    "Your close is a real strength: you don't stop at the action, you follow it through to the result.",
    "The outcome line makes the rest of the answer make sense - it retroactively improves the story.",
    "You've connected the work to a measurable change, which is exactly what strong answers do.",
    "The result is named clearly enough that the interviewer can repeat it back - that's what you want.",
    "Your strongest moment is the closing, where the impact becomes concrete and specific.",
    "The story earns its ending - the result feels proportional to the effort you described.",
    "A clear outcome signal separates this answer from a vague summary of activity.",
    "You've avoided the most common mistake: stopping right before the payoff is fully stated.",
    "The result line does what it should - it explains why the work mattered.",
    "Your closing gives the answer a reason to be remembered rather than just cataloged.",
    "The outcome here is specific enough to feel real, which raises the overall credibility of the story.",
    "The answer reaches a clear conclusion - and that clarity is one of its strongest assets.",
  ],
  specificity: [
    "The detail level in this answer is high enough to make the example feel grounded.",
    "You've included enough specifics that the interviewer can actually picture the situation.",
    "The answer doesn't rely only on general language - there's real texture in the example.",
    "Specificity is doing credibility work here - it makes the story harder to dismiss.",
    "Your example is concrete enough to feel lived-in rather than invented.",
    "The level of detail is calibrated well - enough to convince without overwhelming.",
    "You've named enough facts or decisions to make the story feel real.",
    "The answer includes the kind of specific detail that separates firsthand experience from general knowledge.",
    "Your specificity makes the story easier to trust - it sounds like something that actually happened.",
    "The concrete detail you've included makes the answer more memorable than a summary would be.",
    "Proof-level detail is one of the harder things to include naturally - you've done it well.",
    "The answer contains enough specificity that the interviewer has something to anchor on.",
    "Your example has real texture - it's specific about what you did, not just that you did something.",
    "The level of detail here is right: enough to convince, not so much that it bogs down the story.",
    "Specificity is the clearest signal that the experience is real rather than theoretical.",
    "You've grounded the answer in detail that adds credibility without adding unnecessary length.",
    "The concrete elements of the answer help the interviewer see the situation, not just hear about it.",
    "Your specificity is one of the most differentiating elements in this response.",
    "The detail level is strong enough that the story stands on its own without explanation.",
    "Specifics make the abstract concrete - and you've used them effectively here.",
  ],
  ownership: [
    "Your role in the outcome comes through clearly - the listener can hear what you personally drove.",
    "Ownership language is strong here - you're not hiding behind team language when it counts.",
    "Your contribution is front and center in the answer, which is exactly where it should be.",
    "The first-person accountability in this response gives it real force.",
    "You're claiming the work in a way that sounds confident rather than boastful.",
    "The ownership signal is one of the best things about this response - it's clear and direct.",
    "Your role is unmistakable - the interviewer doesn't have to guess what you personally did.",
    "The I vs. we balance is working in your favor - the answer sounds personal without erasing the team.",
    "Ownership language adds decisiveness to the answer - you sound like someone who leads.",
    "Your contribution is named clearly enough that the credit doesn't get absorbed by the team narrative.",
    "The way you claim the work helps the answer sound authoritative and specific.",
    "Personal accountability is a strength here - the answer sounds owned, not summarized.",
    "Your role in the decision or outcome is stated with enough directness to be convincing.",
    "The ownership framing makes this feel like your story, not a report on something that happened near you.",
    "You've done the harder thing - naming what you personally drove rather than what we achieved.",
    "The ownership is clear enough that the interviewer can use this story as evidence of your capability.",
    "First-person language is landing the way it should - direct, confident, and specific.",
    "Your contribution is visible without being overstated - that balance is difficult and you've found it.",
    "The answer sounds like someone who takes responsibility rather than distributes it.",
    "Strong ownership language is a credibility signal - it suggests you know exactly what you delivered.",
  ],
  depth: [
    "The explanation goes deep enough to feel substantive rather than summarized.",
    "You've unpacked enough of the work that the interviewer can see how you think, not just what you did.",
    "The depth here separates this answer from surface-level responses to the same question.",
    "Your reasoning is visible - the explanation doesn't stay at the level of what happened.",
    "There's enough substance in this answer to make it feel earned rather than rehearsed.",
    "The answer shows more than the headline - it reveals how the work actually unfolded.",
    "Depth is one of this response's most notable strengths - you've developed the idea beyond a summary.",
    "Your explanation has real layers - it moves from situation to action to reasoning to result.",
    "The level of development here suggests genuine familiarity with the problem, not just its outcome.",
    "More depth than the average answer at this type of question - it adds significant credibility.",
    "You've gone beneath the surface without losing the thread, which is a real skill.",
    "The explanation shows how decisions were made, not just that they were made.",
    "Depth signals experience - you're describing the work with the specificity of someone who did it.",
    "Your answer has enough development that the result feels earned rather than asserted.",
    "The detail you bring to the reasoning is what separates this from a competent summary.",
    "You've explained the how, not just the what - and that's where the strongest answers live.",
    "The reasoning is visible enough that the interviewer can trust the outcome you describe.",
    "Your explanation has substance - it's not just framing around a result, it's the actual story.",
    "Depth is the main thing that elevates this answer above a generic response.",
    "You've taken the time to explain the texture of the work, and that comes through clearly.",
  ],
  directness: [
    "You get to the point early, which keeps the interviewer from having to search for the main idea.",
    "The answer arrives at the key point without a long runway - that directness is a real strength.",
    "Your opening gives the interviewer something to hold on to before the context fills in.",
    "Direct framing is one of the clearest markers of a prepared candidate - you show it here.",
    "The answer doesn't require patience to follow because the point is clear from early on.",
    "Your directness signals confidence - you're not burying the lead behind extensive setup.",
    "The core idea arrives early enough that the rest of the answer has something to build from.",
    "Directness keeps the answer from losing momentum before it's had a chance to land.",
    "The way you front-load the point makes everything that follows easier to process.",
    "You've resisted the temptation to over-explain the setup - the answer starts where it should.",
    "Direct opening saves everyone time and signals that you know what the question is actually asking.",
    "The main idea is visible from the first few sentences, which is harder than it looks.",
    "Your answer wastes less setup time than average - that's a real competitive advantage.",
    "Directness is working in your favor here - the response feels confident and sharp.",
    "You've structured the answer so that the interviewer is oriented before the details come.",
    "The point of the answer is clear early, which makes the supporting detail easier to receive.",
    "Getting to the point quickly is a discipline that signals clarity of thinking.",
    "Your directness prevents the answer from feeling circular or evasive.",
    "The opening is strong enough that the interviewer is already engaged before the story unfolds.",
    "You've made the answer scannable - the key claim is findable without listening twice.",
  ],
  completeness: [
    "The response addresses the full scope of the question - nothing important is left out.",
    "Your answer covers what was asked without requiring the interviewer to ask a follow-up.",
    "The question's full ask is addressed - there's no obvious gap in coverage.",
    "Completeness is a real strength here - the answer closes the loop on what was actually asked.",
    "You've covered the prompt fully, which means the interviewer doesn't have to fill in missing pieces.",
    "The response is complete in a way that lets it stand on its own without supplementation.",
    "Your answer covers both the question and its implicit requirements - that's not easy to do.",
    "Every part of the ask is addressed - the answer earns its conclusion.",
    "The completeness here adds confidence - there's no obvious dimension of the question being avoided.",
    "You've treated the question with enough seriousness to address all of its components.",
    "Complete answers are rarer than they sound - this one qualifies.",
    "The response covers the full terrain of the question without padding or redundancy.",
    "Your answer earns its length because the coverage is genuine rather than repetitive.",
    "Completeness signals that you listened carefully to what was actually being asked.",
    "The answer closes every loop it opens - that's a marker of a careful, prepared candidate.",
    "There's no section of the question this response neglects, which is a meaningful strength.",
    "Fully addressing a multi-part question is one of the clearest signs of strong preparation.",
    "The completeness of the response reflects well on your understanding of what was asked.",
    "The question gets a full answer - and that's more valuable than it might seem in the moment.",
    "Nothing important is implied or skipped - the answer earns full marks on coverage.",
  ],
  role_alignment: [
    "You tied your experience directly to the demands of this type of role.",
    "Your answer showed clear awareness of what this function values most.",
    "You demonstrated the kind of domain fluency interviewers in this space are looking for.",
    "Your framing mapped well to how professionals in this field talk about impact.",
    "You stayed grounded in the priorities that matter for this type of position.",
  ],
};


// ---------------------------------------------------------------------------
// IMPROVEMENT POOLS - 20 variants per theme
// ---------------------------------------------------------------------------

const IMPROVEMENT_POOLS: Record<string, string[]> = {
  outcome_strength: [
    "The answer needs a clearer result line - right now the impact is too implied to score well.",
    "The biggest gap is at the close: what actually changed or improved is never fully stated.",
    "The ending stops at the action rather than the outcome - that's the main thing to fix.",
    "A single crisp result sentence would close the most significant scoring gap in this response.",
    "The answer has all the ingredients except the payoff - the result needs to be named explicitly.",
    "You're describing the work without fully describing the consequence - that's where points are being lost.",
    "The closing impact is the weakest part of an otherwise useful answer.",
    "The answer needs to follow the action all the way through to what it produced.",
    "Right now the response ends before the most important information has been delivered.",
    "The outcome is either missing or buried - it needs to be the last clear thing the interviewer hears.",
    "Points are being left on the table at the end because the result is too vague.",
    "The story stops before it reaches its conclusion - add one sentence that states what changed.",
    "Without a clear result, the answer reads as a description of effort rather than a demonstration of impact.",
    "The payoff line is the most important sentence in a behavioral answer - it's not here yet.",
    "A measurable or named outcome would make the rest of the answer land much harder.",
    "The answer would score significantly higher with a result that says what changed, by how much, or why it mattered.",
    "The ending needs work - it's soft where it should be definitive.",
    "You've built the setup and the action, but the result hasn't been delivered yet.",
    "The answer is incomplete at the most critical moment - the close needs a clear impact statement.",
    "Adding a specific outcome - even a rough estimate - would immediately raise the quality of this response.",
  ],
  delivery_control: [
    "Filler usage is high enough to reduce the perceived polish of an otherwise useful answer.",
    "The delivery is being weakened by verbal clutter between ideas - especially in transitions.",
    "The answer sounds less confident than the content deserves because of the filler density.",
    "Reducing filler words would immediately raise the professionalism signal in this response.",
    "The pacing is broken up by verbal placeholders more often than is helpful.",
    "Clean delivery would make the content land harder - right now, filler is absorbing some of the impact.",
    "The main delivery issue is verbal noise between points - it's interrupting the flow of the answer.",
    "Filler overuse is the most visible delivery problem here and it's worth addressing directly.",
    "A shorter pause sounds better than a filler word - that's the main fix this response needs.",
    "The answer's credibility is being lowered by delivery issues that have nothing to do with content quality.",
    "Verbal clutter is reducing the clarity of the answer at exactly the moments where clarity matters most.",
    "The content is stronger than the delivery currently suggests - filler is hiding that gap.",
    "More controlled transitions would make this answer sound considerably more polished.",
    "The filler frequency is high enough that it's shaping the interviewer's perception of confidence.",
    "The answer needs cleaner pacing - right now the transitions between ideas are introducing noise.",
    "Delivery is costing more points here than content quality - that's fixable with practice.",
    "Replacing filler words with deliberate pauses would change the feel of this answer significantly.",
    "The answer would hold together better if the verbal placeholders were removed from the transitions.",
    "Filler usage at this level tends to undermine the credibility of answers that are otherwise strong.",
    "The speaking pattern is working against you - more control between sentences would help considerably.",
  ],
  directness: [
    "The answer takes too long to arrive at the main point - the setup is longer than it needs to be.",
    "Getting to the answer earlier would help the interviewer stay engaged from the first sentence.",
    "The key idea is buried under context that could be shortened to one sentence.",
    "A faster arrival at the main point would sharpen this response considerably.",
    "The answer would score higher if the point arrived in the first 10–15 seconds instead of later.",
    "The setup is longer than the content can justify - trim it and let the answer breathe.",
    "The strongest part of this response arrives too late - that's costing you early engagement.",
    "A direct opening would immediately change how the rest of the answer is received.",
    "The main idea doesn't surface quickly enough - the interviewer has to wait for it.",
    "Opening with your claim, then supporting it, would make this answer feel sharper and more confident.",
    "The answer warms up for too long before getting to what the question was actually asking.",
    "Directness is the clearest opportunity for improvement in this response - lead with the point.",
    "The current opening delays the answer rather than launching it - that's a fixable problem.",
    "A shorter path to the main idea would signal confidence and clarity simultaneously.",
    "The answer is wandering in the opening, which means the listener is disoriented before the content lands.",
    "One of the most reliable improvements for this type of answer is simply starting with the answer.",
    "The setup is eating time that would be better spent on the action and result.",
    "Directness doesn't require less detail - it just requires the detail to arrive after the point, not before.",
    "An interviewer shouldn't have to wait long to understand what the answer is going to be about.",
    "The current structure inverts what it should be - lead with the claim, then add the supporting detail.",
  ],
  structure: [
    "The sequencing needs more discipline - the material is scattered in a way that costs clarity.",
    "The answer needs a clearer beginning, middle, and end - the parts are present but the shape isn't.",
    "Better structure would let the content do more work - right now the organization is getting in the way.",
    "The ideas are present but not arranged in a way that makes them easy to follow.",
    "A tighter structure would reveal that this answer is stronger than its current delivery suggests.",
    "The flow is loose enough that the interviewer has to do extra work to track the through-line.",
    "The response would improve significantly with a cleaner progression from setup to conclusion.",
    "Structure is the main thing holding this answer back - the content is workable but the shape isn't.",
    "The answer wanders between sections in a way that costs coherence.",
    "Building a cleaner arc from situation to action to result would help the listener stay with you.",
    "The organization needs more intentionality - a tighter structure would help immediately.",
    "The material is harder to follow than it needs to be because of sequencing issues.",
    "The answer needs a clearer through-line - something that connects each section to the one that follows.",
    "Right now the response feels assembled rather than designed - the structure needs to be deliberate.",
    "The ideas aren't arriving in the order that would help the interviewer understand them most clearly.",
    "A more controlled structure would add credibility to content that is otherwise worth hearing.",
    "The structure is costing you points that your content doesn't deserve to lose.",
    "Better organization would immediately raise the perceived quality of this response.",
    "The logic is there - the structure just isn't helping it come through.",
    "A cleaner answer shape would reveal the work you've clearly done on the content.",
  ],
  ownership: [
    "Your role in the outcome isn't clear enough - the interviewer needs to know what you specifically did.",
    "The contribution is buried under team language in a way that weakens the story.",
    "Stronger first-person ownership would make this answer feel more decisive and more credible.",
    "The ownership signal is too soft - the interviewer can't clearly identify what you personally drove.",
    "The story is too collective - the answer needs to claim your specific role more directly.",
    "Using more explicit first-person language would immediately raise the confidence signal in this response.",
    "Your contribution is present but not emphasized - it needs to be harder to miss.",
    "The interview is asking about you, and the answer is too often about we.",
    "Ownership language needs to be more direct - the interviewer should never have to infer your role.",
    "The answer would carry more force if your specific decision or action were named more clearly.",
    "The ownership gap here is significant - the story doesn't make it obvious that you were driving it.",
    "More explicit accountability language would change the tone of the answer substantially.",
    "The credit is being shared where it should be claimed - that's a confidence issue worth fixing.",
    "A clearer statement of what you personally led, built, or decided would strengthen this considerably.",
    "Right now the answer sounds collaborative in a way that obscures your individual contribution.",
    "The story needs a clearer main character - and that character is you.",
    "Ownership is the fastest confidence lever available - use it more directly in the next attempt.",
    "The interviewer should leave knowing exactly what you owned, not approximately what the team did.",
    "Soft ownership language signals less confidence than the content of the answer deserves.",
    "Claiming the work more explicitly is the highest-leverage change available for this response.",
  ],
  specificity: [
    "The answer is too general to be fully convincing - a sharper example would raise the credibility.",
    "Broad language is doing too much of the work - one concrete detail would make this significantly stronger.",
    "The story is plausible but not grounded - specific facts or decisions would make it feel real.",
    "Generality is the main credibility risk in this response - the example needs more detail.",
    "The answer stays at the summary level when it should go one layer deeper.",
    "More concrete proof points would separate this from a response anyone could give.",
    "The detail level needs to rise - the interviewer should be able to picture the specific situation.",
    "One specific number, constraint, or decision would do more for this answer than additional context.",
    "The response would be considerably more convincing with a named metric or a concrete tradeoff.",
    "The story is directionally right but not specific enough to feel fully differentiated.",
    "Broad language signals less direct experience than the specificity of a good example would.",
    "More exact language - about what system, what process, what decision - would add real weight.",
    "The answer needs texture that only specifics can provide - the current version is too smooth.",
    "A single well-chosen detail would do more for the credibility of this answer than more general explanation.",
    "The experience sounds real but the answer doesn't yet prove it - specificity is the fix.",
    "Without more concrete anchoring, the answer sounds like a description of what could have happened.",
    "Specifics separate people who've done the work from people who know about the work - use more of them.",
    "The answer is currently too easy to give - anyone familiar with the topic could say the same thing.",
    "Adding one precise decision point or outcome would immediately raise the perceived quality of this example.",
    "The current level of detail is functional but not differentiated - push further into the specific.",
  ],
  vocal_presence: [
    "The vocal delivery is too flat on the moments that should carry the most weight.",
    "More variation in tone would help the interviewer identify which parts of the answer are most important.",
    "The key points are landing at the same volume as the background detail - that's a missed opportunity.",
    "Adding emphasis to the result and the decision would make the answer considerably more memorable.",
    "The tone stays too even throughout - some variation would help the structure land more clearly.",
    "The delivery needs more vocal contrast between setup and result - they're sounding too similar.",
    "A flatter delivery reduces the perceived impact of content that would otherwise score well.",
    "The outcome line needs a different vocal treatment - right now it blends into the explanation.",
    "Vocal variety is the fastest delivery improvement available for this response.",
    "More emphasis at the key moments would help the answer feel more intentional and confident.",
    "The answer sounds practiced but not expressive - adding more vocal movement would help.",
    "The tonal monotony is reducing engagement in a way that's independent of content quality.",
    "The strongest line in the answer needs more vocal lift - the way it's delivered doesn't match its importance.",
    "A slight pitch change on the result or metric would make it significantly more memorable.",
    "The delivery is undercutting good content by failing to signal what the listener should pay attention to.",
    "More vocal emphasis on outcomes and decisions would help the interviewer know what to take away.",
    "Flat delivery is a risk because it makes all sentences sound equally important - which means none of them do.",
    "The answer needs the delivery to do some of the emphasis work that words alone aren't carrying.",
    "A more expressive delivery would close the gap between the quality of the content and the impact it's having.",
    "Varying the pace and pitch at key moments would make this answer more engaging to receive.",
  ],
  pace_control: [
    "The pace needs adjustment - at this rate, key ideas don't have enough room to register.",
    "Slowing down slightly on outcomes and metrics would raise the impact of the content considerably.",
    "The tempo is working against the answer by compressing the most important sections.",
    "A more deliberate pace would signal that you know which parts of the answer deserve more space.",
    "The rate of speech is reducing clarity in a way that's separate from the content issue.",
    "Pace control is the most available lever for delivery improvement in this response.",
    "The answer is moving too fast in the places where the interviewer most needs to absorb what you're saying.",
    "A brief pause after the result or metric would do more for impact than extra explanation would.",
    "The delivery needs more air - key moments need time to land before the next point arrives.",
    "An intentional slowdown at the close would make the payoff feel more deliberate and more memorable.",
    "The pace is fine for the setup but needs to come down when you're delivering the actual impact.",
    "Tempo adjustment is a quick fix with a significant effect - slow down when you say the number.",
    "The current rate of speech signals urgency more than confidence - a slightly slower pace would help.",
    "The answer would benefit from a more measured delivery, particularly in the action and result sections.",
    "Pacing corrections don't require content changes - just different timing on the same material.",
    "A controlled tempo signals preparation and composure - the current pace is undermining that signal.",
    "The fastest path to a better delivery experience is pacing the result correctly.",
    "An interviewer needs time to absorb what they're hearing - the current pace isn't giving them enough.",
    "The answer is technically complete but experientially rushed - tempo is the variable to adjust.",
    "Slowing down at key transitions would help the structure of the answer become more visible to the listener.",
  ],
  depth: [
    "The explanation stays too close to the surface - more development would make it feel substantive.",
    "The answer needs another layer of reasoning - the how needs more explanation than the what.",
    "The story is there in outline, but the detail needed to make it convincing is still missing.",
    "A deeper explanation of the decision-making process would add significant credibility here.",
    "More substance behind the key action would separate this from a high-level summary.",
    "The answer is thin in the middle sections where the most important detail should live.",
    "Developing the reasoning would help the interviewer trust the outcome you're describing.",
    "More explanation of how the work unfolded would turn this from a good summary into a strong story.",
    "The depth needed to be persuasive isn't quite there yet - the answer is stopping one step too early.",
    "Going one level deeper into the process or decision would raise the quality of the whole response.",
    "The answer covers the what but not enough of the how - that's where the credibility gap is.",
    "More substance in the action section would help the result feel earned rather than asserted.",
    "A stronger explanation of the approach or constraints would add real weight to the story.",
    "The answer reads more like a headline than an explanation - it needs more development.",
    "Depth is what separates answers that are correct from answers that are convincing.",
    "The current version doesn't unpack enough of the actual work to fully convince the listener.",
    "More developed reasoning in the middle of the answer would change how the result is received.",
    "The answer needs to show more of its thinking rather than just its conclusion.",
    "Adding depth to the explanation doesn't mean making it longer - it means making it more precise.",
    "Without more substance in the supporting detail, the answer sounds thinner than the experience deserves.",
  ],
  completeness: [
    "The answer leaves one part of the question underdeveloped - that gap is costing points.",
    "Not all of what was asked has been addressed - the response needs fuller coverage.",
    "The question has multiple parts and not all of them are getting equal attention.",
    "A more complete answer would address the full scope of what was being asked.",
    "Some parts of the prompt are lighter than others - that imbalance is limiting the score.",
    "The answer would be stronger if it closed the loop on the full question rather than part of it.",
    "Completeness is the most fixable issue in this response - more deliberate attention to the ask is the solution.",
    "The response stops short of fully answering what was requested - one more developed section would help.",
    "Not everything that was asked is being answered - the missing piece is visible and worth addressing.",
    "The question deserves a complete answer, and this one leaves something significant unaddressed.",
    "Partial coverage is a ceiling on the score - the answer can only get so far without full completeness.",
    "The response needs to address all parts of the question rather than the parts that are easiest to answer.",
    "A fully complete answer would close the gap between this response and a high-scoring one.",
    "The coverage here is functional but not comprehensive - the question asked for more than this delivers.",
    "More deliberate attention to the exact wording of the question would help identify what's still missing.",
    "The answer is correct about what it covers but incomplete relative to what was actually asked.",
    "The missing dimension of the question is pulling the score lower than the content quality would otherwise allow.",
    "A more thorough response would fill the gap that's currently limiting the overall impression.",
    "Completeness is a signal of careful listening - the answer could show more of that.",
    "The question has more surface than this answer is covering - that gap needs to close.",
  ],
  clarity: [
    "The explanation is harder to follow than the content warrants - clearer language would help.",
    "The main idea could be expressed more directly - the current framing adds unnecessary complexity.",
    "The answer would be clearer if the phrasing were more precise and less hedged.",
    "Simpler language would let the content do more work - the current wording is getting in the way.",
    "The meaning is present but the path to it is unclear - cleaner phrasing would fix that.",
    "The answer would be stronger if the key sentences were shorter and more direct.",
    "Clarity is the main thing this response needs to improve - the ideas are sound, the expression isn't.",
    "More precise word choice would raise the quality of this answer without changing the substance.",
    "The answer is currently harder to absorb than it should be - cleaner sentences would help.",
    "Reducing hedging and qualifying language would immediately sharpen the answer.",
    "The main point gets lost in phrasing that's trying to say too much at once.",
    "Clearer structure within each sentence would help the answer read more confidently.",
    "The answer needs tighter language - the same ideas could be expressed with fewer words and more impact.",
    "Verbal clarity is the gap between this response and the answer it could be.",
    "More direct phrasing in the key sections would help the answer sound more authoritative.",
    "The current phrasing introduces ambiguity where there should be precision.",
    "Simplifying the language would not lose meaning - it would make the meaning more accessible.",
    "The response would benefit from cleaner sentences with fewer embedded qualifications.",
    "Word choice is creating noise that's obscuring a stronger answer underneath.",
    "The ideas are good - they need cleaner expression to reach their full potential.",
  ],
  role_alignment: [
    "Try to use the vocabulary and framing common in this specific function - it signals cultural fit.",
    "Connecting your example more directly to the stated responsibilities would sharpen the relevance.",
    "Interviewers in this space tend to weight certain outcomes more heavily - lean into those specifically.",
    "Showing more awareness of the tradeoffs this role commonly faces would strengthen your answer.",
    "A brief statement about why this type of work interests you would add intentionality to the response.",
  ],
};


// ---------------------------------------------------------------------------
// CONFIDENCE POOLS - 15 variants per situation
// ---------------------------------------------------------------------------

const CONFIDENCE_HIGH = [
  "Your confidence is strongest when your ownership is explicit and the answer gets to the point early.",
  "This response projects the most confidence when your role is clear and the pacing stays controlled.",
  "Confidence is strongest here when the answer sounds both direct and personally owned.",
  "The answer reads as confident largely because the ownership language is clear and the structure holds.",
  "Your strongest confidence signal is the combination of direct language and a clear result.",
  "The confidence here comes through in how directly you claim the work and name the outcome.",
  "You sound assured because the story is yours - you're not sharing credit where you should be claiming it.",
  "The confidence level is high when the answer is this structured and this direct.",
  "Your ownership language is the main confidence driver - keep it at this level.",
  "The answer sounds confident because it doesn't hedge at the moments that matter most.",
  "Confidence works here because the framing is direct and the result is explicit.",
  "When ownership and structure are both this clean, confidence follows automatically.",
  "The delivery and the content align in a way that makes the answer sound genuinely assured.",
  "You sound like someone who knows the work they did and isn't softening the story.",
  "Confidence is fully there - the directness and ownership are working together.",
];

const CONFIDENCE_SOFT_FLUENCY = [
  "Confidence is being reduced by a combination of softer ownership language and less controlled delivery.",
  "The answer has useful substance, but confidence is getting diluted by soft ownership and verbal clutter.",
  "You do not sound incapable - the issue is that softer ownership language and disfluency are lowering confidence.",
  "The delivery and the ownership are both working against confidence - fixing either one would help.",
  "Confidence is harder to project when the delivery introduces noise and the ownership language stays soft.",
  "The filler usage and the ownership softness are compounding - they're both reducing the confidence signal.",
  "Two things are lowering confidence here: how you're claiming the work and how you're delivering it.",
  "Verbal clutter and team-language framing are working together to soften what should sound more assured.",
  "The confidence gap isn't about content - it's about how ownership and delivery are being handled.",
  "If you fix either the delivery control or the ownership language, the confidence signal will improve noticeably.",
  "The content is capable of sounding confident - the delivery and ownership aren't fully reflecting that yet.",
  "Cleaner transitions and stronger ownership framing would immediately raise the confidence signal.",
  "Both the speaking pattern and the ownership language need more directness to project confidence here.",
  "The answer is losing confidence at two points: in the transitions and in how you claim the work.",
  "Fixing one of these - delivery or ownership - would noticeably change how confident the answer sounds.",
];

const CONFIDENCE_RUSHED = [
  "You do not sound uncertain exactly - the faster pace makes the answer feel less controlled than it could.",
  "Confidence is being softened by pace more than by content here.",
  "The answer sounds more hurried than unsure, which still lowers the confidence signal.",
  "The pace is the main thing undermining confidence - the content is not the problem.",
  "Rushing through key sections makes the answer sound anxious rather than prepared.",
  "Slowing down slightly on the result and the decision point would raise the confidence signal immediately.",
  "The confidence dip is almost entirely a tempo issue - the substance is fine.",
  "A faster pace can read as uncertainty even when the speaker is confident - that's what's happening here.",
  "Confidence sounds different when the answer breathes - right now it doesn't have enough room.",
  "The delivery pace is the main thing translating as low confidence - fix that and the rest follows.",
  "The content supports a confident read - the pace is preventing it from landing that way.",
  "More deliberate pacing would give the answer the confidence signal it currently lacks.",
  "Slowing down is a confidence signal - the answer needs more of that, especially at the close.",
  "The answer rushes through the parts that should feel most assured - pace is the lever.",
  "Tempo is the most fixable confidence issue in this response - the substance is already there.",
];

const CONFIDENCE_PAUSES = [
  "Confidence is being lowered by hesitation between ideas more than by the underlying content.",
  "The answer has usable material, but longer pauses are making it sound less assured.",
  "You have enough content here - the main confidence drag is hesitation in the delivery.",
  "The pausing pattern is creating a hesitance signal that the content doesn't actually support.",
  "The gaps between sentences are longer than they should be - and that's reading as uncertainty.",
  "Reducing the pause length between ideas would change how the confidence level is perceived.",
  "The hesitation in the transitions is the main confidence issue - the content itself isn't the problem.",
  "Confident answers move more steadily - the pausing here is interrupting the flow in a way that reads as uncertainty.",
  "The delivery loses confidence at the transitions - that's where the hesitation is concentrated.",
  "A more consistent flow between ideas would immediately raise the confidence signal in this response.",
  "The pauses are longer than the content requires - that's the main confidence signal to address.",
  "Deliberate pausing is a strength; involuntary hesitation is what's happening here.",
  "The confidence gap is mostly in the transitions - the content on either side is workable.",
  "Smoother transitions between ideas would make the answer sound more assured across the board.",
  "The hesitation is the loudest thing in this response - cleaning it up would change everything.",
];

const CONFIDENCE_DEFAULT = [
  "Confidence is moderate right now: the answer has substance, but stronger ownership and cleaner delivery would make it sound more assured.",
  "The response shows useful content, though it would project more confidence with firmer ownership and a more controlled finish.",
  "You sound reasonably capable, but the answer would feel more confident if your role and final takeaway were both clearer.",
  "Confidence is present but not fully projected - the difference is usually in the directness and the close.",
  "The confidence signal is mixed: some strong moments undercut by softer framing or delivery.",
  "The answer sounds capable but not certain - the gap between those is usually ownership and pace.",
  "Confidence is workable here but not yet at the level that high-stakes interviews reward.",
  "The content supports a more confident delivery - the answer just needs to catch up to what it's describing.",
  "There's enough substance here to sound very confident - the delivery and ownership haven't quite reached that level yet.",
  "The confidence signal is developing - it's not yet at the level the content quality could support.",
  "The answer has the foundation for a confident delivery - it's the expression, not the substance, that's limiting it.",
  "Confidence comes through in flashes here, but it needs to be more consistent across the full response.",
  "The strongest parts of the answer sound assured - the weaker parts are pulling the overall confidence signal down.",
  "Moderate confidence is the honest read: capable but not yet fully commanding.",
  "The gap between this and a highly confident answer is smaller than it might feel - mainly directness and close.",
];

// ---------------------------------------------------------------------------
// BETTER ANSWER PREFIXES - varied, non-generic
// ---------------------------------------------------------------------------

const BETTER_ANSWER_PREFIXES: Record<string, string[]> = {
  outcome_strength: [
    "A stronger version keeps the same story but closes with a concrete result: ",
    "The same answer, rewritten to land the outcome more clearly: ",
    "Here is the same story with an explicit impact statement added at the end: ",
    "A version that follows the action all the way to the result: ",
    "The same content with a closing line that names what actually changed: ",
  ],
  specificity: [
    "A stronger version adds one concrete detail that makes the story feel grounded: ",
    "Here is the same story with one more specific proof point: ",
    "The same answer, rewritten to include a named fact or metric: ",
    "A version that grounds the story in something more specific: ",
    "The same structure, but with a concrete detail that raises the credibility: ",
  ],
  ownership: [
    "A stronger version makes your personal role in the story unmistakable: ",
    "Here is the same story with clearer first-person ownership: ",
    "The same answer, rewritten to claim the contribution directly: ",
    "A version that puts your specific role front and center: ",
    "The same content with ownership language that's harder to miss: ",
  ],
  directness: [
    "A stronger version gets to the point in the first sentence: ",
    "Here is the same story with the setup compressed and the point moved forward: ",
    "The same answer, rewritten to open with the answer: ",
    "A version that leads with the conclusion and then explains it: ",
    "The same content with a faster path to the main idea: ",
  ],
  delivery_control: [
    "A stronger version delivers the same content in cleaner, more controlled sentences: ",
    "Here is the same story with the transitions tightened: ",
    "The same answer, written for delivery - shorter sentences and cleaner phrasing: ",
    "A version that would read cleanly when spoken under pressure: ",
    "The same content, edited to reduce filler risk and improve fluency: ",
  ],
  default: [
    "A stronger version keeps the same story but makes the answer more focused and intentional: ",
    "Here is the same content rewritten to land more clearly: ",
    "The same story with tighter structure and a clearer close: ",
    "A more controlled version of the same answer: ",
    "The same content, organized more deliberately: ",
  ],
};

// ---------------------------------------------------------------------------
// MISSED OPPORTUNITY DATA
// ---------------------------------------------------------------------------

const MO_DATA: Record<string, { labels: string[]; whys: string[]; sentences: string[] }> = {
  outcome_strength: {
    labels: ["State the outcome explicitly", "Close with a concrete result", "Name what changed or improved", "Land the impact before you stop", "Give the ending its own sentence"],
    whys: ["The answer explains the action, but the final result is still too implied.", "You describe the work clearly but stop before stating what it actually produced.", "The impact is hinted at but never directly named - that's where the close falls short.", "The story doesn't fully land because the outcome is missing or too vague.", "The answer needs one more sentence that names what changed because of your work."],
    sentences: ["As a result, this created a measurable improvement in performance, decision-making, or execution.", "The outcome was [metric or result], which improved [process/outcome] by [amount or degree].", "This led directly to [specific result] - and the change was visible within [timeframe].", "Because of this, the team was able to [result] - something that hadn't been possible before.", "The final result was [X], measured by [Y], which reduced or improved [Z] by a meaningful margin."],
  },
  ownership: {
    labels: ["Clarify your ownership", "Name your specific role", "Make your contribution unmistakable", "Claim the decision directly", "State what you personally drove"],
    whys: ["Your role is not yet explicit enough inside the story.", "The answer describes what happened but not clearly enough what you drove.", "The contribution is there but it's easy to miss - it needs to be more direct.", "The interviewer should hear your specific responsibility without having to infer it.", "The ownership signal is softer than the content of the story deserves."],
    sentences: ["I led this piece of work directly and was responsible for the key decision or action.", "My specific role was to [action] - I was the one who drove this from start to finish.", "I owned this end-to-end, including [specific responsibility] and the final decision to [X].", "The decision was mine - I identified the issue, evaluated the options, and executed the solution.", "I was the primary driver here, specifically responsible for [X], and accountable for the outcome."],
  },
  specificity: {
    labels: ["Add one concrete detail", "Ground the story in a specific fact", "Include one named metric or constraint", "Name the tool, system, or process", "Add a number or named outcome"],
    whys: ["The example still needs stronger proof inside the story.", "Broad language is doing too much of the work - one sharp detail would change this.", "The story sounds plausible but not grounded - a specific fact would anchor it.", "Without a named detail, the answer could apply to anyone who's done anything similar.", "The credibility gap is in the detail level - one concrete fact would close it."],
    sentences: ["One useful detail to add here is the specific metric, constraint, or tradeoff that shaped the decision.", "Adding [specific number, system, or outcome] would make the example feel immediate and real.", "The strongest version of this story includes the exact figure: [%, $, time, or scope].", "Naming the tool, framework, or process I used would add real credibility.", "The concrete detail missing here is: what did the change actually produce, in measurable terms?"],
  },
  directness: {
    labels: ["Answer earlier", "Lead with the claim", "Cut the setup in half", "Get to the point in the first sentence", "Open with the conclusion"],
    whys: ["The current setup delays the strongest part of the response.", "The main idea arrives later than it should - the answer is losing engagement in the opening.", "Too much context before the point means the listener is waiting longer than necessary.", "The answer starts warming up where it should start answering.", "The best version of this answer starts with the answer - and then adds the context."],
    sentences: ["The core answer is that I identified the issue, acted on it directly, and improved the result.", "Opening sentence: 'The approach I took was [X], because [reason] - here's what happened.'", "Lead with: 'I solved this by [action], which led to [result].' Then explain the context.", "Start with: 'The key decision I made here was [X].' Then build the story from there.", "Cut to: 'I drove [outcome] by [action].' That's the answer - everything else is supporting detail."],
  },
  delivery_control: {
    labels: ["Use pauses instead of filler words", "Replace fillers with deliberate silence", "Clean up the verbal transitions", "Let pauses do the work fillers are doing", "Slow down instead of filling the silence"],
    whys: ["Filler usage is interrupting the answer's fluency in the transitions.", "The verbal placeholders are reducing the polish more than any content issue.", "Filler words between ideas are making the answer sound less controlled than the content deserves.", "The delivery breaks down at the transitions - that's where fillers are doing the most damage.", "Clean pauses would cost the answer nothing and add significant polish."],
    sentences: ["A short pause here would sound stronger than a filler transition.", "In the next attempt: wherever there's a 'um' or 'like', replace it with a one-beat pause.", "The transition between sections needs a pause, not a filler.", "Deliberate silence after a result statement sounds more confident than any filler word.", "Pause where you'd usually say 'um' - the silence is a signal of control, not uncertainty."],
  },
  vocal_presence: {
    labels: ["Add emphasis to the strongest line", "Lift your voice on the result", "Vary your tone at the close", "Emphasize the outcome, not the setup", "Give the key line its own vocal treatment"],
    whys: ["The tone is not yet helping the key point stand out enough.", "The result is landing at the same volume as the context - that's the vocal gap.", "The delivery flattens at exactly the moment where emphasis would add the most impact.", "The strongest sentence needs to sound different from the rest of the answer.", "Vocal emphasis is the difference between a line that registers and one that gets forgotten."],
    sentences: ["The strongest emphasis should land on the result, recommendation, or decision point.", "Raise the energy slightly when you deliver the metric or outcome - let it stand out.", "The result line should be spoken differently from the setup - slower, slightly louder, more deliberate.", "In the next attempt: pause before your best line, say it clearly, then pause again.", "The key moment in this answer deserves the vocal weight it's not currently getting."],
  },
  structure: {
    labels: ["Improve answer structure", "Add a clear opening signpost", "Separate your Action from your Result", "Use intro→rationale→result flow", "Make the structure easier to follow"],
    whys: ["Interviewers mentally score structure in real time - a clear S→T→A→R flow makes your answer easier to follow.", "The answer currently blends sections in a way that makes it harder to track the progression.", "A brief signpost at the start would orient the interviewer before you get into the detail.", "The Result and Action are merging together - separating them would sharpen the close.", "Structure is scoring lower than your content quality deserves - the fix is organizational, not substantive."],
    sentences: ["Use a brief signpost at the start ('To give context…') to orient the interviewer.", "Make sure your Result is distinct from your Action - many candidates blend the two.", "A one-sentence setup followed by a clear action and measurable outcome covers the essentials.", "Opening with the situation in one sentence, then moving directly to what you did, tightens the structure.", "End with a standalone result sentence - it gives the answer a clear landing point."],
  },
  depth: {
    labels: ["Add one concrete detail", "Include a specific metric or constraint", "Replace vague verbs with precise ones", "Ground the story in a named fact", "Add a number or named outcome"],
    whys: ["Vague answers feel rehearsed and forgettable - one specific detail changes the impression.", "The story is plausible but not grounded; a concrete fact would anchor it.", "Without a named detail, the answer could apply to anyone who's done anything similar.", "Specific numbers, names, and constraints make your experience feel real and credible.", "The credibility gap is in the detail level - one precise fact would close it."],
    sentences: ["Add at least one concrete metric - even a rough estimate ('roughly 20%') is more convincing than none.", "Name the constraint or challenge you were working against; it makes the action feel earned.", "Replace general verbs ('helped', 'worked on') with specific ones ('modeled', 'negotiated', 'redesigned').", "The strongest version of this story includes the exact figure: %, $, time, or scope.", "Naming the tool, framework, or process you used would add real credibility to the example."],
  },
};

// ---------------------------------------------------------------------------
// BUILD FUNCTIONS
// ---------------------------------------------------------------------------

function buildStrengthCopy(args: ComposeArgs, diagnosis: ReturnType<typeof buildDiagnosis>, seed: string) {
  const lines: string[] = [];
  const top = diagnosis.strengthThemes.slice(0, 3).map((t) => t.key);
  for (const key of top) {
    if (key === "role_alignment") {
      lines.push(roleLine(diagnosis.roleFamily, "praise", seed, "role-praise"));
    } else {
      const pool = STRENGTH_POOLS[key];
      if (pool?.length) lines.push(pickDeterministic(pool, seed, `strength-${key}`));
    }
  }
  if (!lines.length) lines.push("There is a workable foundation here - the answer has useful material and can become much stronger with refinement.");
  return dedupe(lines).slice(0, 3);
}

function buildImprovementCopy(args: ComposeArgs, diagnosis: ReturnType<typeof buildDiagnosis>, seed: string) {
  const lines: string[] = [];
  const top = diagnosis.improvementThemes.slice(0, 3).map((t) => t.key);
  for (const key of top) {
    if (key === "role_alignment") {
      lines.push(roleLine(diagnosis.roleFamily, "alignment", seed, "role-alignment"));
    } else {
      const pool = IMPROVEMENT_POOLS[key];
      if (pool?.length) lines.push(pickDeterministic(pool, seed, `improve-${key}`));
    }
  }
  return dedupe(lines).slice(0, 3);
}

function buildMissedOpportunities(args: ComposeArgs, diagnosis: ReturnType<typeof buildDiagnosis>) {
  const opportunities: Array<{ label: string; why: string; add_sentence: string }> = [];
  const top = diagnosis.improvementThemes.slice(0, 2).map((t) => t.key);
  const seedNum = hashString(`${args.question}${(args.transcript || "").slice(0, 80)}`);

  for (const key of top) {
    const data = MO_DATA[key];
    if (!data) continue;
    opportunities.push({
      label: data.labels[seedNum % data.labels.length],
      why: data.whys[(seedNum + 1) % data.whys.length],
      add_sentence: data.sentences[(seedNum + 2) % data.sentences.length],
    });
  }

  if (!opportunities.length) {
    opportunities.push({ label: "Make the final takeaway clearer", why: "The answer is workable, but the ending could be more memorable.", add_sentence: "The main takeaway is that I drove a concrete improvement and can explain exactly how it happened." });
  }
  return opportunities.slice(0, 2);
}

function buildConfidenceExplanation(args: ComposeArgs, diagnosis: ReturnType<typeof buildDiagnosis>, seed: string) {
  const s = diagnosis.signals;
  const d = diagnosis.delivery;
  const a = diagnosis.answer;
  const seedNum = hashString(seed);

  if (s.confidence >= 7.8 && a.ownership === "strong") return CONFIDENCE_HIGH[seedNum % CONFIDENCE_HIGH.length];
  if (a.ownership === "soft" && d.fluency !== "clean") return CONFIDENCE_SOFT_FLUENCY[seedNum % CONFIDENCE_SOFT_FLUENCY.length];
  if (d.pace === "rushed") return CONFIDENCE_RUSHED[seedNum % CONFIDENCE_RUSHED.length];
  if (d.pausing === "hesitant" || d.pausing === "over_paused") return CONFIDENCE_PAUSES[seedNum % CONFIDENCE_PAUSES.length];
  return CONFIDENCE_DEFAULT[seedNum % CONFIDENCE_DEFAULT.length];
}

function enrichBetterAnswer(original: string, diagnosis: ReturnType<typeof buildDiagnosis>) {
  if (!original || original.trim().length < 40) return original;
  const key = diagnosis.dominantImprovement in BETTER_ANSWER_PREFIXES ? diagnosis.dominantImprovement : "default";
  const pool = BETTER_ANSWER_PREFIXES[key] ?? BETTER_ANSWER_PREFIXES.default;
  const seedNum = hashString(original.slice(0, 60));
  const prefix = pool[seedNum % pool.length];
  return `${prefix}${original}`;
}

function buildTrajectoryLine(
  currentScore: number | null,
  prevScore: number | null,
  prevAttemptCount: number | null,
  seed: number
): string | null {
  if (currentScore === null || prevScore === null) return null;

  // Normalize both to 0-100 if needed
  const curr = currentScore > 10 ? currentScore : currentScore * 10;
  const prev = prevScore > 10 ? prevScore : prevScore * 10;
  const delta = Math.round(curr - prev);
  const isFirstFew = (prevAttemptCount ?? 0) <= 3;

  if (delta >= 10) {
    const opts = [
      `Your score jumped ${delta} points from last time - that's a meaningful improvement, not noise.`,
      `Up ${delta} points since your last attempt. Whatever you focused on, it's working.`,
      `${delta}-point gain from your previous attempt - keep the same structure going into your next one.`,
      `That's a ${delta}-point improvement over last time. The specificity in your result statement made the biggest difference.`,
    ];
    return opts[seed % opts.length];
  }
  if (delta >= 4) {
    const opts = [
      `You gained ${delta} points over your last attempt - steady progress in the right direction.`,
      `Up ${delta} points from last time. Small gains compound quickly with consistent practice.`,
      `${delta}-point improvement since last attempt. You're trending in the right direction.`,
    ];
    return opts[seed % opts.length];
  }
  if (delta >= -3 && delta <= 3) {
    const opts = [
      `Your score held steady from last attempt. Consistency is a foundation - now push for a specific improvement.`,
      `About the same score as last time. Identify one concrete thing to change for the next attempt.`,
      isFirstFew
        ? `Your score is stable early on - that's normal. Focus on structure first, then delivery.`
        : `Plateau detected across your last few attempts. Try a different question type to break the pattern.`,
    ];
    return opts[seed % opts.length];
  }
  if (delta >= -8) {
    const opts = [
      `Your score dipped ${Math.abs(delta)} points from last attempt - don't over-optimize. One adjustment at a time.`,
      `Down ${Math.abs(delta)} points from last time. Check if you changed your structure - overcorrecting is common.`,
      `${Math.abs(delta)}-point drop from your last attempt. This is normal variance; stay consistent with your approach.`,
    ];
    return opts[seed % opts.length];
  }
  // large drop
  const opts = [
    `Your score dropped ${Math.abs(delta)} points from last attempt. This question type may need more targeted prep.`,
    `Significant drop from last time (${Math.abs(delta)} pts). Review the structure tab and identify which component fell - it's usually one.`,
  ];
  return opts[seed % opts.length];
}

function buildMilestoneNote(prevAttemptCount: number | null): string | null {
  const count = (prevAttemptCount ?? 0) + 1; // this is the Nth attempt
  if (count === 1) return "This is your first recorded attempt - every rep from here compounds.";
  if (count === 5) return "5 attempts in. Research shows performance stabilizes around attempt 7 - you're close to your real baseline.";
  if (count === 10) return "10 attempts completed. You're in the top tier of practice volume for this platform.";
  if (count === 25) return "25 attempts - that's serious dedication. Your interviewer won't see this work, but the results will show.";
  return null;
}

export function composeRichFeedback(args: ComposeArgs) {
  const seed = `${args.question}|||${(args.transcript || "").slice(0, 500)}`;
  const seedNum = hashString(seed);
  const diagnosis = buildDiagnosis(args);

  const strengths = buildStrengthCopy(args, diagnosis, seed);
  const improvements = buildImprovementCopy(args, diagnosis, seed);
  const missed_opportunities = buildMissedOpportunities(args, diagnosis);

  const roleMismatchLine = diagnosis.improvementThemes.some((t) => t.key === "role_alignment")
    ? roleLine(diagnosis.roleFamily, "mismatch", seed, "role-mismatch")
    : undefined;

  const next: any = {
    ...args.normalized,
    strengths: dedupe([...strengths, ...(Array.isArray(args.normalized?.strengths) ? args.normalized.strengths : [])]).slice(0, 3),
    improvements: dedupe([...improvements, ...(roleMismatchLine ? [roleMismatchLine] : []), ...(Array.isArray(args.normalized?.improvements) ? args.normalized.improvements : [])]).slice(0, 3),
    missed_opportunities,
    confidence_explanation: buildConfidenceExplanation(args, diagnosis, seed),
    better_answer: enrichBetterAnswer(typeof args.normalized?.better_answer === "string" ? args.normalized.better_answer : "", diagnosis),
    strength_theme_keys: diagnosis.strengthThemes.slice(0, 3).map((t) => t.key),
    improvement_theme_keys: diagnosis.improvementThemes.slice(0, 3).map((t) => t.key),
  };

  if (args.framework === "star" && next.star) {
    if (diagnosis.dominantImprovement === "outcome_strength") {
      next.star_advice = { ...(next.star_advice ?? {}), result: "Do not stop at the action. End with one sentence that clearly states what changed, improved, or was achieved." };
    }
    if (diagnosis.dominantImprovement === "directness") {
      next.star_advice = { ...(next.star_advice ?? {}), situation: "Shrink the setup to one sentence so the interviewer reaches the main point faster." };
    }
    if (diagnosis.dominantImprovement === "ownership") {
      next.star_advice = { ...(next.star_advice ?? {}), action: "Use stronger first-person language so your direct contribution is unmistakable." };
    }
  }

  next.trajectory_note = buildTrajectoryLine(
    typeof args.normalized?.score === "number" ? args.normalized.score : null,
    args.prevScore ?? null,
    args.prevAttemptCount ?? null,
    seedNum
  );

  next.milestone_note = buildMilestoneNote(args.prevAttemptCount ?? null);

  return next;
}