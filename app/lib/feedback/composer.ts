import { ISSUE_LIBRARY, ROLE_LIBRARY } from "./library";
import type {
  BehavioralFingerprint,
  ComposeArgs,
  Diagnosis,
  FeedbackIssue,
  RoleFamily,
  Severity,
} from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

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

function inferRoleFamily(jobDesc: string, question: string): RoleFamily {
  const text = normalizeText(`${jobDesc} ${question}`);

  if (
    /\b(finance|financial|fp&a|accounting|investment|bank|analyst)\b/.test(text)
  ) return "finance";

  if (
    /\b(operations|supply chain|logistics|inventory|supplier|planning|procurement)\b/.test(text)
  ) return "operations";

  if (
    /\b(research|science|scientific|experiment|lab|laboratory|associate)\b/.test(text)
  ) return "research";

  if (/\b(consulting|strategy)\b/.test(text)) return "consulting";

  return "general";
}

function inferFingerprint(args: ComposeArgs, roleFamily: RoleFamily): BehavioralFingerprint {
  const avgPauseMs =
    typeof args.deliveryMetrics?.avgPauseMs === "number"
      ? args.deliveryMetrics.avgPauseMs
      : typeof args.deliveryMetrics?.avg_pause_ms === "number"
      ? args.deliveryMetrics.avg_pause_ms
      : null;

  const monotone =
    typeof args.deliveryMetrics?.acoustics?.monotoneScore === "number"
      ? args.deliveryMetrics.acoustics.monotoneScore
      : typeof args.deliveryMetrics?.prosody?.monotoneScore === "number"
      ? args.deliveryMetrics.prosody.monotoneScore
      : typeof args.normalized?.deliveryMetrics?.acoustics?.monotoneScore === "number"
      ? args.normalized.deliveryMetrics.acoustics.monotoneScore
      : null;

  const wpm =
    typeof args.deliveryMetrics?.wpm === "number"
      ? args.deliveryMetrics.wpm
      : typeof args.normalized?.wpm === "number"
      ? args.normalized.wpm
      : null;

  let deliveryStyle: BehavioralFingerprint["deliveryStyle"] = "measured";
  if (typeof wpm === "number" && wpm > 160) deliveryStyle = "rushed";
  else if (typeof monotone === "number" && monotone >= 6) deliveryStyle = "flat";
  else if ((args.fillerStats.fillersPer100Words ?? 0) <= 1.5) deliveryStyle = "polished";

  let answerStyle: BehavioralFingerprint["answerStyle"] = "structured";
  if ((args.normalized?.relevance?.directness_score ?? 7) <= 6.2) answerStyle = "wandering";
  else if ((args.normalized?.relevance?.completeness_score ?? 7) >= 7.8 && typeof avgPauseMs === "number" && avgPauseMs > 1200) {
    answerStyle = "overdetailed";
  } else if ((args.normalized?.communication_score ?? 7) <= 6.2) {
    answerStyle = "wandering";
  } else if ((args.normalized?.communication_score ?? 7) >= 7.7) {
    answerStyle = "structured";
  } else {
    answerStyle = "concise";
  }

  let ownershipStyle: BehavioralFingerprint["ownershipStyle"] = "moderate";
  const transcript = normalizeText(args.transcript);
  const iCount = (transcript.match(/\bi\b/g) || []).length;
  const weCount = (transcript.match(/\bwe\b/g) || []).length;
  if (iCount >= weCount * 1.5) ownershipStyle = "strong";
  else if (weCount > iCount * 1.3) ownershipStyle = "soft";

  let evidenceStyle: BehavioralFingerprint["evidenceStyle"] = "generalized";
  if (/\b\d+%|\b\d+\b|\$|\bpercent\b|\bmetric\b|\bkpi\b/.test(transcript)) evidenceStyle = "metrics_forward";
  else if (/\bfor example\b|\bfor instance\b|\bone time\b|\bin one project\b/.test(transcript)) evidenceStyle = "example_forward";
  else if (/\bfirst\b|\bthen\b|\bafter\b|\bprocess\b|\bworkflow\b|\bmethod\b/.test(transcript)) evidenceStyle = "process_forward";

  return {
    deliveryStyle,
    answerStyle,
    ownershipStyle,
    evidenceStyle,
    roleFamily,
  };
}

function detectPrimaryIssue(args: ComposeArgs): FeedbackIssue {
  const framework = args.framework;
  const score = args.normalized?.score ?? 6.5;
  const comm = args.normalized?.communication_score ?? 6.5;
  const conf = args.normalized?.confidence_score ?? 6.5;
  const fillers = args.fillerStats.fillersPer100Words ?? 0;
  const result =
    framework === "star"
      ? args.normalized?.star?.result ?? 6.5
      : framework === "technical_explanation"
      ? args.normalized?.technical_explanation?.practical_reasoning ?? 6.5
      : args.normalized?.experience_depth?.business_impact ?? 6.5;

  const directness = args.normalized?.relevance?.directness_score ?? 6.8;
  const completeness = args.normalized?.relevance?.completeness_score ?? 6.8;
  const answeredQuestion = Boolean(args.normalized?.relevance?.answered_question);

  const monotone =
    typeof args.deliveryMetrics?.acoustics?.monotoneScore === "number"
      ? args.deliveryMetrics.acoustics.monotoneScore
      : typeof args.deliveryMetrics?.prosody?.monotoneScore === "number"
      ? args.deliveryMetrics.prosody.monotoneScore
      : null;

  const wpm =
    typeof args.deliveryMetrics?.wpm === "number"
      ? args.deliveryMetrics.wpm
      : typeof args.normalized?.wpm === "number"
      ? args.normalized.wpm
      : null;

  if (!answeredQuestion || completeness <= 5.8) return "partial_answer";
  if (framework === "star" && result <= 6.1) return "weak_closing";
  if (framework === "technical_explanation" && (args.normalized?.technical_explanation?.depth ?? 7) <= 6.0) return "shallow_technical";
  if (framework === "experience_depth" && (args.normalized?.experience_depth?.experience_depth ?? 7) <= 6.0) return "thin_experience_depth";
  if (fillers >= 3.2) return "filler_overuse";
  if (typeof wpm === "number" && wpm >= 166) return "rushed_delivery";
  if (typeof wpm === "number" && wpm < 100) return "slow_delivery";
  if (typeof monotone === "number" && monotone >= 6.1) return "flat_delivery";
  if (directness <= 6.0) return "overlong_setup";
  if (comm <= 6.2) return "weak_structure";
  if (conf <= 6.1) return "weak_ownership";
  if (score <= 6.3) return "low_specificity";
  return "weak_role_alignment";
}

function detectSecondaryIssue(args: ComposeArgs, primary: FeedbackIssue): FeedbackIssue | undefined {
  const options: FeedbackIssue[] = [];
  const framework = args.framework;

  if ((args.fillerStats.fillersPer100Words ?? 0) >= 2.8 && primary !== "filler_overuse") options.push("filler_overuse");

  const wpm =
    typeof args.deliveryMetrics?.wpm === "number"
      ? args.deliveryMetrics.wpm
      : typeof args.normalized?.wpm === "number"
      ? args.normalized.wpm
      : null;

  if (typeof wpm === "number" && wpm >= 160 && primary !== "rushed_delivery") options.push("rushed_delivery");
  if (typeof wpm === "number" && wpm < 102 && primary !== "slow_delivery") options.push("slow_delivery");

  const monotone =
    typeof args.deliveryMetrics?.acoustics?.monotoneScore === "number"
      ? args.deliveryMetrics.acoustics.monotoneScore
      : typeof args.deliveryMetrics?.prosody?.monotoneScore === "number"
      ? args.deliveryMetrics.prosody.monotoneScore
      : null;

  if (typeof monotone === "number" && monotone >= 5.8 && primary !== "flat_delivery") options.push("flat_delivery");
  if ((args.normalized?.communication_score ?? 7) <= 6.4 && primary !== "weak_structure") options.push("weak_structure");
  if ((args.normalized?.confidence_score ?? 7) <= 6.4 && primary !== "weak_ownership") options.push("weak_ownership");

  if (framework === "star" && (args.normalized?.star?.result ?? 7) <= 6.4 && primary !== "weak_closing") {
    options.push("weak_closing");
  }

  return options[0];
}

function detectSeverity(args: ComposeArgs, primary: FeedbackIssue): Severity {
  const score = args.normalized?.score ?? 6.8;
  const fillers = args.fillerStats.fillersPer100Words ?? 0;
  const result = args.normalized?.star?.result ?? args.normalized?.experience_depth?.business_impact ?? 7;
  const depth = args.normalized?.technical_explanation?.depth ?? args.normalized?.experience_depth?.experience_depth ?? 7;

  if (primary === "filler_overuse" && fillers >= 4.0) return "high";
  if (primary === "weak_closing" && result <= 5.5) return "high";
  if ((primary === "shallow_technical" || primary === "thin_experience_depth") && depth <= 5.5) return "high";
  if (score <= 5.9) return "high";
  if (score <= 6.8) return "moderate";
  return "mild";
}

function detectStrengths(args: ComposeArgs, roleFamily: RoleFamily): string[] {
  const strengths: string[] = [];
  const comm = args.normalized?.communication_score ?? 0;
  const conf = args.normalized?.confidence_score ?? 0;
  const result = args.normalized?.star?.result ?? args.normalized?.experience_depth?.business_impact ?? 0;
  const fillers = args.fillerStats.fillersPer100Words ?? 99;

  if (comm >= 7.7) strengths.push("clear communication");
  if (conf >= 7.5) strengths.push("credible tone");
  if (result >= 7.4) strengths.push("strong closing");
  if (fillers <= 1.5) strengths.push("polished delivery");
  if (roleFamily === "operations" && (args.normalized?.technical_explanation?.practical_reasoning ?? 0) >= 7.4) strengths.push("practical reasoning");
  if (roleFamily === "research" && (args.normalized?.experience_depth?.specificity ?? 0) >= 7.4) strengths.push("good specificity");
  if (roleFamily === "finance" && (args.normalized?.relevance?.directness_score ?? 0) >= 7.5) strengths.push("good business framing");

  return strengths.slice(0, 3);
}

function buildDiagnosis(args: ComposeArgs): Diagnosis {
  const roleFamily = inferRoleFamily(args.jobDesc, args.question);
  const fingerprint = inferFingerprint(args, roleFamily);
  const primaryIssue = detectPrimaryIssue(args);
  const secondaryIssue = detectSecondaryIssue(args, primaryIssue);
  const severity = detectSeverity(args, primaryIssue);
  const strengths = detectStrengths(args, roleFamily);

  return {
    primaryIssue,
    secondaryIssue,
    severity,
    strengths,
    fingerprint,
  };
}

function issueLine(issue: FeedbackIssue, severity: Severity, seed: string, salt: string) {
  return pickDeterministic(ISSUE_LIBRARY[issue][severity], seed, salt);
}

function roleLine(roleFamily: RoleFamily, key: keyof (typeof ROLE_LIBRARY)["finance"], seed: string, salt: string) {
  return pickDeterministic(ROLE_LIBRARY[roleFamily][key], seed, salt);
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

function buildStrengthCopy(args: ComposeArgs, diagnosis: Diagnosis, seed: string) {
  const lines: string[] = [];

  const comm = args.normalized?.communication_score ?? 0;
  const conf = args.normalized?.confidence_score ?? 0;
  const overall = args.normalized?.score ?? 0;
  const directness = args.normalized?.relevance?.directness_score ?? 0;
  const completeness = args.normalized?.relevance?.completeness_score ?? 0;
  const result =
    args.framework === "star"
      ? args.normalized?.star?.result ?? 0
      : args.framework === "technical_explanation"
      ? args.normalized?.technical_explanation?.practical_reasoning ?? 0
      : args.normalized?.experience_depth?.business_impact ?? 0;

  const technicalClarity = args.normalized?.technical_explanation?.technical_clarity ?? 0;
  const technicalDepth = args.normalized?.technical_explanation?.depth ?? 0;

  const expDepth = args.normalized?.experience_depth?.experience_depth ?? 0;
  const specificity = args.normalized?.experience_depth?.specificity ?? 0;
  const exampleQuality = args.normalized?.experience_depth?.example_quality ?? 0;

  const fillers = args.fillerStats.fillersPer100Words ?? 99;

  const wpm =
    typeof args.deliveryMetrics?.wpm === "number"
      ? args.deliveryMetrics.wpm
      : typeof args.normalized?.wpm === "number"
      ? args.normalized.wpm
      : null;

  const monotone =
    typeof args.deliveryMetrics?.acoustics?.monotoneScore === "number"
      ? args.deliveryMetrics.acoustics.monotoneScore
      : typeof args.deliveryMetrics?.prosody?.monotoneScore === "number"
      ? args.deliveryMetrics.prosody.monotoneScore
      : null;

  if (comm >= 8.2) {
    lines.push(
      pickDeterministic(
        [
          "You communicate the core point clearly when you avoid overbuilding the setup.",
          "Your strongest answers are easy to follow because your framing is naturally clear.",
          "You already have a strong communication baseline when the answer stays structured.",
          "Clarity is one of your stronger signals, especially when you state the point early.",
          "The answer works best when you trust your natural ability to explain ideas simply.",
          "Your communication is strongest when you move quickly from context to main point.",
        ],
        seed,
        "strength-comm-high"
      )
    );
  } else if (comm >= 7.4) {
    lines.push(
      pickDeterministic(
        [
          "Your communication is solid when the answer stays disciplined and direct.",
          "You explain ideas reasonably well when the structure remains clean.",
          "There is a strong communication base here, especially when you avoid extra setup.",
          "You already sound fairly clear when the answer does not drift.",
        ],
        seed,
        "strength-comm-mid"
      )
    );
  }

  if (conf >= 8.0) {
    lines.push(
      pickDeterministic(
        [
          "Your tone is most convincing when you lead with a direct statement instead of easing into it.",
          "Confidence is one of your better traits when you trust the first sentence.",
          "You sound strongest when you make the recommendation or main point early.",
          "There is real authority in your tone when you do not soften the opening.",
          "Your delivery carries credibility best when you sound decisive from the start.",
        ],
        seed,
        "strength-conf-high"
      )
    );
  } else if (conf >= 7.2) {
    lines.push(
      pickDeterministic(
        [
          "Your tone is generally credible when the answer feels controlled.",
          "You sound reasonably assured when the story stays structured.",
          "There is a solid confidence base here, especially when your ownership is clear.",
          "Your delivery sounds more convincing when you avoid hedging.",
        ],
        seed,
        "strength-conf-mid"
      )
    );
  }

  if (result >= 7.8) {
    lines.push(
      pickDeterministic(
        [
          "Your answer gets much stronger when you clearly state what changed at the end.",
          "You are at your best when the final outcome is explicit and easy to remember.",
          "Strong result statements are one of the things helping your higher-scoring attempts.",
          "When you land the final takeaway clearly, the whole answer feels more complete.",
        ],
        seed,
        "strength-result-high"
      )
    );
  }

  if (directness >= 8.0) {
    lines.push(
      pickDeterministic(
        [
          "Directness is helping you — you are strongest when you answer the question without a long runway.",
          "Your better attempts get to the point early and avoid unnecessary setup.",
          "You sound strongest when the answer arrives quickly at the main point.",
          "A clear early answer line is one of the things helping your performance.",
        ],
        seed,
        "strength-directness"
      )
    );
  }

  if (completeness >= 8.0) {
    lines.push(
      pickDeterministic(
        [
          "You generally do a good job covering the full question instead of only part of it.",
          "Your stronger answers feel complete rather than partial, which helps scoring.",
          "Completeness is one of the more stable strengths in this response style.",
        ],
        seed,
        "strength-completeness"
      )
    );
  }

  if (fillers <= 1.5) {
    lines.push(
      pickDeterministic(
        [
          "Your delivery sounds more polished because filler words are mostly under control.",
          "Lower filler usage is helping the answer feel more composed.",
          "You already have a cleaner delivery profile when you let pauses do the work.",
          "The answer benefits from relatively controlled filler usage.",
          "Your polish improves noticeably when filler words stay low.",
        ],
        seed,
        "strength-fillers"
      )
    );
  }

  if (typeof wpm === "number" && wpm >= 118 && wpm <= 145) {
    lines.push(
      pickDeterministic(
        [
          "Your pacing is in a strong interview range, which helps the answer sound controlled.",
          "The tempo is helping rather than hurting — it feels measured enough to land key points.",
          "This pace supports clarity and makes the answer feel more intentional.",
          "A steady speaking tempo is helping the answer sound more polished.",
        ],
        seed,
        "strength-wpm"
      )
    );
  }

  if (typeof monotone === "number" && monotone <= 4.5) {
    lines.push(
      pickDeterministic(
        [
          "Your vocal variety is helping the answer feel more engaged and less flat.",
          "Delivery sounds stronger when your tone separates the key point from the background detail.",
          "There is enough vocal movement here to help important lines stand out.",
        ],
        seed,
        "strength-monotone"
      )
    );
  }

  if (args.framework === "star" && result >= 7.3) {
    lines.push(
      pickDeterministic(
        [
          "Your behavioral answers are strongest when the result is stated cleanly instead of implied.",
          "For behavioral stories, you score better when the ending clearly explains the outcome.",
          "The stronger STAR answers are the ones where the payoff is easy to hear.",
        ],
        seed,
        "strength-star"
      )
    );
  }

  if (args.framework === "technical_explanation" && technicalClarity >= 7.5) {
    lines.push(
      pickDeterministic(
        [
          "Your technical answers are stronger when the explanation moves in a clear step-by-step order.",
          "Technical clarity is helping you when you explain the logic in sequence.",
          "You sound more credible in technical answers when the reasoning is structured and practical.",
          "Your stronger technical reps are the ones where the process is easy to follow.",
        ],
        seed,
        "strength-tech-clarity"
      )
    );
  }

  if (args.framework === "technical_explanation" && technicalDepth >= 7.5) {
    lines.push(
      pickDeterministic(
        [
          "There is good technical substance here when you stay specific about the reasoning.",
          "Technical depth becomes a strength when you explain the tradeoffs instead of staying broad.",
          "Your technical answers work best when the logic sounds grounded in real constraints.",
        ],
        seed,
        "strength-tech-depth"
      )
    );
  }

  if (args.framework === "experience_depth" && specificity >= 7.5) {
    lines.push(
      pickDeterministic(
        [
          "Your experience-based answers are stronger when they stay concrete and specific.",
          "Specificity is helping your example feel more credible and more lived-in.",
          "You sound stronger when you describe the example with enough detail to make it real.",
          "The answer benefits when your experience is explained with concrete detail instead of summary.",
        ],
        seed,
        "strength-exp-specificity"
      )
    );
  }

  if (args.framework === "experience_depth" && exampleQuality >= 7.5) {
    lines.push(
      pickDeterministic(
        [
          "The example itself is doing useful work because it feels relevant and believable.",
          "Your stronger experience answers are the ones where the example is clearly chosen and well matched to the question.",
          "Example quality is helping this answer feel more credible than generic.",
        ],
        seed,
        "strength-exp-example"
      )
    );
  }

  if (expDepth >= 7.5) {
    lines.push(
      pickDeterministic(
        [
          "You are strongest when the answer goes beyond summary and actually shows the work.",
          "This response style works better when you unpack the example instead of only describing it broadly.",
          "Depth is helping the answer feel more credible when you stay inside the details of the example.",
        ],
        seed,
        "strength-exp-depth"
      )
    );
  }

  lines.push(roleLine(diagnosis.fingerprint.roleFamily, "praise", seed, "role-praise"));

  if (overall >= 8.0) {
    lines.push(
      pickDeterministic(
        [
          "Overall, this answer is strongest when you trust the structure and keep the story disciplined.",
          "The stronger overall signal comes from how clear, relevant, and controlled the answer feels.",
          "This response works best when you keep the answer simple, direct, and complete.",
        ],
        seed,
        "strength-overall-high"
      )
    );
  }

  if (diagnosis.fingerprint.answerStyle === "structured") {
    lines.push(
      pickDeterministic(
        [
          "Structure is helping you most when you resist the urge to add unnecessary setup.",
          "The answer scores better when the structure stays clean from start to finish.",
          "A disciplined answer shape is one of the clearer strengths in your better attempts.",
        ],
        seed,
        "strength-structured-fingerprint"
      )
    );
  }

  if (diagnosis.fingerprint.evidenceStyle === "metrics_forward") {
    lines.push(
      pickDeterministic(
        [
          "You already have the right instinct to use proof points — that helps the answer feel more credible.",
          "Metric-forward language is helping the answer sound more convincing.",
          "Using proof points is one of the stronger habits showing up here.",
        ],
        seed,
        "strength-metrics-fingerprint"
      )
    );
  }

  if (diagnosis.fingerprint.evidenceStyle === "process_forward") {
    lines.push(
      pickDeterministic(
        [
          "Your process-based explanation helps the answer feel thoughtful and easier to trust.",
          "You are strongest when you explain how you moved through the problem instead of jumping around the story.",
          "Process clarity is one of the reasons this answer feels more grounded.",
        ],
        seed,
        "strength-process-fingerprint"
      )
    );
  }

  return dedupe(lines).slice(0, 4);
}


function buildImprovementCopy(args: ComposeArgs, diagnosis: Diagnosis, seed: string) {
  const lines: string[] = [];

  const comm = args.normalized?.communication_score ?? 0;
  const conf = args.normalized?.confidence_score ?? 0;
  const directness = args.normalized?.relevance?.directness_score ?? 0;
  const completeness = args.normalized?.relevance?.completeness_score ?? 0;

  const result =
    args.framework === "star"
      ? args.normalized?.star?.result ?? 0
      : args.framework === "technical_explanation"
      ? args.normalized?.technical_explanation?.practical_reasoning ?? 0
      : args.normalized?.experience_depth?.business_impact ?? 0;

  const technicalDepth = args.normalized?.technical_explanation?.depth ?? 0;
  const technicalStructure = args.normalized?.technical_explanation?.structure ?? 0;

  const expDepth = args.normalized?.experience_depth?.experience_depth ?? 0;
  const specificity = args.normalized?.experience_depth?.specificity ?? 0;
  const businessImpact = args.normalized?.experience_depth?.business_impact ?? 0;

  const fillers = args.fillerStats.fillersPer100Words ?? 0;

  const wpm =
    typeof args.deliveryMetrics?.wpm === "number"
      ? args.deliveryMetrics.wpm
      : typeof args.normalized?.wpm === "number"
      ? args.normalized.wpm
      : null;

  const monotone =
    typeof args.deliveryMetrics?.acoustics?.monotoneScore === "number"
      ? args.deliveryMetrics.acoustics.monotoneScore
      : typeof args.deliveryMetrics?.prosody?.monotoneScore === "number"
      ? args.deliveryMetrics.prosody.monotoneScore
      : null;

  lines.push(issueLine(diagnosis.primaryIssue, diagnosis.severity, seed, "primary"));

  if (diagnosis.secondaryIssue) {
    lines.push(issueLine(diagnosis.secondaryIssue, "mild", seed, "secondary"));
  }

  if (diagnosis.primaryIssue !== "weak_closing" && result <= 6.6) {
    lines.push(
      pickDeterministic(
        [
          "Even when the middle of the answer is decent, the ending still needs to say more clearly what changed.",
          "The answer would score higher if the final line made the result easier to hear.",
          "The close still needs more payoff — right now the outcome lands too softly.",
          "You are still leaving some points on the table by not finishing with a sharper outcome statement.",
        ],
        seed,
        "improve-result-low"
      )
    );
  }

  if (diagnosis.primaryIssue !== "low_specificity" && specificity > 0 && specificity <= 6.6) {
    lines.push(
      pickDeterministic(
        [
          "The example still needs more concrete detail to feel fully convincing.",
          "You would gain credibility by naming one sharper fact, number, or decision point.",
          "The answer is still leaning too much on broad language and not enough on exact detail.",
          "A little more specificity would make the story more believable and more memorable.",
        ],
        seed,
        "improve-specificity-low"
      )
    );
  }

  if (diagnosis.primaryIssue !== "weak_structure" && comm <= 6.5) {
    lines.push(
      pickDeterministic(
        [
          "Communication would improve if the answer moved in a cleaner order.",
          "The structure still needs work so the best point arrives sooner.",
          "You have usable content, but the flow is still making it harder to follow than it should be.",
          "A cleaner structure would raise communication without changing the underlying story.",
        ],
        seed,
        "improve-comm-structure"
      )
    );
  }

  if (diagnosis.primaryIssue !== "weak_ownership" && conf <= 6.5) {
    lines.push(
      pickDeterministic(
        [
          "The answer would sound more convincing if your ownership were stated more directly.",
          "Confidence is being held back by softer ownership language more than by tone alone.",
          "You need to name your role more explicitly so the answer sounds more assured.",
          "A firmer statement of what you drove would improve confidence quickly.",
        ],
        seed,
        "improve-confidence-ownership"
      )
    );
  }

  if (diagnosis.primaryIssue !== "filler_overuse" && fillers >= 2.8) {
    lines.push(
      pickDeterministic(
        [
          "Filler words are not the biggest issue, but reducing them would still improve polish.",
          "Cleaner pauses would make the answer sound more controlled during transitions.",
          "There is still some filler leakage that is softening delivery.",
          "Delivery would feel sharper if you let pauses replace placeholder words.",
        ],
        seed,
        "improve-fillers-secondary"
      )
    );
  }

  if (diagnosis.primaryIssue !== "rushed_delivery" && typeof wpm === "number" && wpm > 160) {
    lines.push(
      pickDeterministic(
        [
          "The answer is also moving fast enough to reduce emphasis on the strongest points.",
          "Tempo is not the only issue, but slowing slightly would help the answer land better.",
          "You would sound more controlled if you gave the key moments a little more space.",
          "A slight reduction in pace would make the answer feel more deliberate.",
        ],
        seed,
        "improve-rushed-secondary"
      )
    );
  }

  if (diagnosis.primaryIssue !== "slow_delivery" && typeof wpm === "number" && wpm < 100) {
    lines.push(
      pickDeterministic(
        [
          "The pace is also a little slow, which makes the answer feel more hesitant than it needs to.",
          "Tightening the first few sentences would help the answer gain momentum faster.",
          "You would sound stronger if the setup moved a bit more efficiently.",
          "A more concise opening would help the answer feel less heavy.",
        ],
        seed,
        "improve-slow-secondary"
      )
    );
  }

  if (diagnosis.primaryIssue !== "flat_delivery" && typeof monotone === "number" && monotone >= 5.8) {
    lines.push(
      pickDeterministic(
        [
          "Your delivery would also improve with more vocal contrast on the result or recommendation.",
          "The tone still flattens slightly on key points, which softens impact.",
          "A little more emphasis would help the strongest line stand out.",
          "The answer would be more memorable if the key outcome sounded different from the background detail.",
        ],
        seed,
        "improve-flat-secondary"
      )
    );
  }

  if (args.framework === "technical_explanation" && technicalDepth <= 6.5) {
    lines.push(
      pickDeterministic(
        [
          "For technical answers, you need to go one layer deeper than the current explanation.",
          "Technical depth is still lighter than it should be for a strong explanation-based answer.",
          "The answer would benefit from more concrete reasoning, tradeoffs, or constraints.",
          "This technical explanation still needs more substance inside the structure.",
        ],
        seed,
        "improve-technical-depth"
      )
    );
  }

  if (args.framework === "technical_explanation" && technicalStructure <= 6.5) {
    lines.push(
      pickDeterministic(
        [
          "Technical answers will score better when the explanation moves in a clearer sequence.",
          "The technical reasoning would feel stronger with a more obvious step-by-step order.",
          "This explanation needs cleaner sequencing so the logic is easier to track.",
          "A more structured technical walkthrough would improve credibility.",
        ],
        seed,
        "improve-technical-structure"
      )
    );
  }

  if (args.framework === "experience_depth" && expDepth <= 6.5) {
    lines.push(
      pickDeterministic(
        [
          "The example still needs more depth so the interviewer can really see the work.",
          "You are describing relevant experience, but not yet unpacking it enough.",
          "This experience-based answer needs more detail on what you actually did and what changed.",
          "The answer would be stronger if it moved beyond summary and into the real example.",
        ],
        seed,
        "improve-experience-depth"
      )
    );
  }

  if (args.framework === "experience_depth" && businessImpact <= 6.5) {
    lines.push(
      pickDeterministic(
        [
          "The experience is relevant, but the impact still needs to be stated more explicitly.",
          "This answer needs a clearer explanation of why the work mattered.",
          "You are describing the example, but not yet fully landing its effect.",
          "The story would be stronger if the final impact were easier to hear.",
        ],
        seed,
        "improve-experience-impact"
      )
    );
  }

  if (directness <= 6.2 && diagnosis.primaryIssue !== "overlong_setup") {
    lines.push(
      pickDeterministic(
        [
          "The answer also takes slightly too long to reach the main point.",
          "You would gain clarity by answering earlier and trimming some of the runway.",
          "A shorter setup would help the strongest part of the answer arrive sooner.",
          "The main point still needs to show up earlier in the response.",
        ],
        seed,
        "improve-directness"
      )
    );
  }

  if (completeness <= 6.2 && diagnosis.primaryIssue !== "partial_answer") {
    lines.push(
      pickDeterministic(
        [
          "One part of the question still feels under-addressed.",
          "The answer would be stronger if it closed the loop more fully on the prompt.",
          "There is still a small completeness gap in how the question is being answered.",
          "You are covering the topic, but not yet the whole ask strongly enough.",
        ],
        seed,
        "improve-completeness"
      )
    );
  }

  lines.push(roleLine(diagnosis.fingerprint.roleFamily, "alignment", seed, "role-alignment"));

  if (diagnosis.fingerprint.ownershipStyle === "soft" && diagnosis.primaryIssue !== "weak_ownership") {
    lines.push(
      pickDeterministic(
        [
          "Your examples would carry more authority if you named your role more directly.",
          "Ownership still reads a little soft, even when the example itself is solid.",
          "You would sound more credible by making your personal contribution harder to miss.",
          "The answer would gain force if it used stronger first-person ownership language.",
        ],
        seed,
        "improve-soft-ownership-fingerprint"
      )
    );
  }

  if (diagnosis.fingerprint.answerStyle === "wandering" && diagnosis.primaryIssue !== "weak_structure") {
    lines.push(
      pickDeterministic(
        [
          "A cleaner answer shape would make the content feel stronger without changing the story.",
          "You have useful material, but the flow still needs more discipline.",
          "The structure is not yet helping the content as much as it could.",
          "The answer would score better if the sequence felt more controlled.",
        ],
        seed,
        "improve-wandering-fingerprint"
      )
    );
  }

  if (diagnosis.fingerprint.evidenceStyle === "generalized") {
    lines.push(
      pickDeterministic(
        [
          "The answer would feel more credible with one concrete fact, metric, or decision point.",
          "You still need more proof inside the story, not just the summary of what happened.",
          "A sharper piece of evidence would make the answer easier to trust.",
          "The response needs more concrete support to feel fully convincing.",
        ],
        seed,
        "improve-generalized-evidence"
      )
    );
  }

  return dedupe(lines).slice(0, 4);
}


function buildMissedOpportunities(args: ComposeArgs, diagnosis: Diagnosis, seed: string) {
  const opportunities = [];

  if (diagnosis.primaryIssue === "weak_closing") {
    opportunities.push({
      label: "State the outcome more explicitly",
      why: "The answer explains the action, but the final result is not landing strongly enough.",
      add_sentence: "As a result, the work produced a clearer outcome, better decision-making, or stronger execution than before.",
    });
  }

  if (diagnosis.primaryIssue === "low_specificity" || diagnosis.secondaryIssue === "low_specificity") {
    opportunities.push({
      label: "Add one concrete detail",
      why: "The example would feel more credible with one sharper fact, number, or decision point.",
      add_sentence: "One detail that would strengthen this answer is the specific tradeoff, metric, or constraint you were managing.",
    });
  }

  if (diagnosis.primaryIssue === "weak_ownership" || diagnosis.fingerprint.ownershipStyle === "soft") {
    opportunities.push({
      label: "Clarify your ownership",
      why: "The story describes the work, but your direct contribution could be clearer.",
      add_sentence: "I took ownership of the key decision and drove the next step with the team.",
    });
  }

  if (diagnosis.primaryIssue === "weak_role_alignment" || diagnosis.secondaryIssue === "weak_role_alignment") {
    opportunities.push({
      label: "Tie the example back to the role",
      why: "The answer is relevant, but it does not yet make the role-fit signal obvious enough.",
      add_sentence: "That experience matters here because it shows how I think through the exact priorities this role cares about.",
    });
  }

  if (!opportunities.length) {
    opportunities.push({
      label: "Make the final takeaway clearer",
      why: "The answer is workable, but one sharper final line would make it more memorable.",
      add_sentence: "The main takeaway is that I helped move the work forward in a concrete and measurable way.",
    });
  }

  return opportunities.slice(0, 3);
}

function buildConfidenceExplanation(args: ComposeArgs, diagnosis: Diagnosis, seed: string) {
  const conf = args.normalized?.confidence_score ?? 6.8;

  if (conf >= 7.8) {
    return "Your confidence is strongest when you get to the point early and sound decisive about your role in the outcome.";
  }

  if (diagnosis.primaryIssue === "weak_ownership") {
    return "Your confidence score is being held back less by tone alone and more by ownership language that stays too soft.";
  }

  if (diagnosis.primaryIssue === "rushed_delivery") {
    return "You do not sound uncertain exactly — the faster pace makes the answer feel less controlled than it could.";
  }

  return pickDeterministic(
    [
      "Confidence is moderate right now: the answer has substance, but stronger ownership and cleaner final framing would make it sound more assured.",
      "The answer shows useful content, but confidence would rise if the story felt more controlled and more explicitly yours.",
      "You sound reasonably capable, though the answer would project more confidence with clearer ownership and a firmer finish.",
    ],
    seed,
    "confidence-expl"
  );
}

function enrichBetterAnswer(original: string, diagnosis: Diagnosis) {
  if (!original || original.trim().length < 40) {
    return original;
  }

  const prefix =
    diagnosis.primaryIssue === "weak_closing"
      ? "A stronger version would keep the same story but end with a more explicit result: "
      : diagnosis.primaryIssue === "low_specificity"
      ? "A stronger version would keep the same story but add one more concrete detail: "
      : diagnosis.primaryIssue === "weak_ownership"
      ? "A stronger version would keep the same story but make your role more explicit: "
      : diagnosis.primaryIssue === "weak_role_alignment"
      ? "A stronger version would keep the same story but connect it more clearly to the role: "
      : "A stronger version would keep the same story but make the answer cleaner and more intentional: ";

  return `${prefix}${original}`;
}

export function composeRichFeedback(args: ComposeArgs) {
  const seed = `${args.question}|||${args.transcript.slice(0, 500)}`;
  const diagnosis = buildDiagnosis(args);

  const strengths = buildStrengthCopy(args, diagnosis, seed);
  const improvements = buildImprovementCopy(args, diagnosis, seed);
  const missed_opportunities = buildMissedOpportunities(args, diagnosis, seed);

  const roleMismatchLine =
    diagnosis.primaryIssue === "weak_role_alignment" || diagnosis.secondaryIssue === "weak_role_alignment"
      ? roleLine(diagnosis.fingerprint.roleFamily, "mismatch", seed, "role-mismatch")
      : undefined;

  const next = {
    ...args.normalized,
    strengths: dedupe([
      ...strengths,
      ...(Array.isArray(args.normalized?.strengths) ? args.normalized.strengths : []),
    ]).slice(0, 4),

    improvements: dedupe([
      ...improvements,
      ...(roleMismatchLine ? [roleMismatchLine] : []),
      ...(Array.isArray(args.normalized?.improvements) ? args.normalized.improvements : []),
    ]).slice(0, 4),

    missed_opportunities: missed_opportunities,

    confidence_explanation: buildConfidenceExplanation(args, diagnosis, seed),

    better_answer: enrichBetterAnswer(
      typeof args.normalized?.better_answer === "string" ? args.normalized.better_answer : "",
      diagnosis
    ),
  };

  if (args.framework === "star" && next.star) {
    if (diagnosis.primaryIssue === "weak_closing") {
      next.star_advice = {
        ...(next.star_advice ?? {}),
        result: "Do not stop after the action. End with one sentence that clearly states what changed, improved, or was achieved.",
      };
    }
    if (diagnosis.primaryIssue === "overlong_setup") {
      next.star_advice = {
        ...(next.star_advice ?? {}),
        situation: "Shrink the setup to one sentence so the interviewer reaches the main point faster.",
      };
    }
    if (diagnosis.primaryIssue === "weak_ownership") {
      next.star_advice = {
        ...(next.star_advice ?? {}),
        action: "Use stronger first-person language so your direct contribution is unmistakable.",
      };
    }
  }

  return next;
}
