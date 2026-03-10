export type EvaluationFramework =
  | "star"
  | "technical_explanation"
  | "experience_depth";

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STAR_PATTERNS = [
  /tell me about a time/,
  /describe a time/,
  /give me an example/,
  /share an example/,
  /walk me through a time/,
  /when have you/,
  /a situation where/,
  /a time when/,
];

const TECHNICAL_PATTERNS = [
  /how would you/,
  /how do you/,
  /walk me through how/,
  /what is your approach/,
  /how would you handle/,
  /how would you manage/,
  /explain how/,
  /how do you balance/,
  /what factors would you consider/,
  /how do you evaluate/,
  /how would you decide/,
];

const EXPERIENCE_PATTERNS = [
  /what experience do you have/,
  /tell me about your experience/,
  /what is your experience with/,
  /have you worked with/,
  /have you used/,
  /what tools have you used/,
  /what systems have you used/,
  /what is your background in/,
  /how familiar are you with/,
  /what environments have you worked in/,
];

export function classifyEvaluationFramework(
  question: string
): EvaluationFramework {
  const q = normalize(question);

  // 1️⃣ Strong STAR signals (highest priority)
  const starSignals = [
    "tell me about a time",
    "describe a time",
    "give me an example",
    "share an example",
    "a time when",
    "a situation where",
    "when have you",
    "walk me through a time",
  ];

  if (starSignals.some((p) => q.includes(p))) {
    return "star";
  }

  // 2️⃣ Experience-depth signals
  const experienceSignals = [
    "experience with",
    "experience in",
    "your experience with",
    "background in",
    "worked with",
    "used",
    "tools have you used",
    "systems have you used",
    "familiar with",
    "knowledge of",
    "proficiency in",
    "have you worked with",
  ];

  if (experienceSignals.some((p) => q.includes(p))) {
    return "experience_depth";
  }

  // 3️⃣ Technical reasoning signals
  const technicalSignals = [
    "how would you",
    "how do you",
    "how would",
    "walk me through how",
    "what is your approach",
    "how would you handle",
    "how would you manage",
    "explain how",
    "how do you balance",
    "what factors would you consider",
    "how do you evaluate",
    "how would you decide",
  ];

  if (technicalSignals.some((p) => q.includes(p))) {
    return "technical_explanation";
  }

  // 4️⃣ Fallback rules
  if (q.startsWith("how ")) {
    return "technical_explanation";
  }

  if (q.includes("experience")) {
    return "experience_depth";
  }

  // Default safest fallback
  return "experience_depth";
}
