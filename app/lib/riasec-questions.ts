/**
 * RIASEC + Work Values + Entrepreneurship question bank
 * Based on Holland's RIASEC model used by O*NET, Strong Interest Inventory, and career research
 *
 * Dimensions:
 *   R = Realistic  (hands-on, physical, technical)
 *   I = Investigative (analytical, research, scientific)
 *   A = Artistic   (creative, expressive, aesthetic)
 *   S = Social     (helping, teaching, interpersonal)
 *   E = Enterprising (leading, persuading, business)
 *   C = Conventional (organizing, data, structured)
 *
 * Additional sections:
 *   V = Work Values
 *   N = Entrepreneurship & Side Income
 */

export type RiasecDimension = "R" | "I" | "A" | "S" | "E" | "C";
export type QuestionSection = "interests" | "activities" | "values" | "entrepreneurship";

export interface RiasecOption {
  label: string;
  dimension: RiasecDimension;
  weight?: number; // default 1
}

export interface RiasecQuestion {
  id: string;
  section: QuestionSection;
  prompt: string;
  type: "choice" | "scale"; // choice = pick one, scale = 1-5 agreement
  options?: RiasecOption[];   // for choice type
  dimension?: RiasecDimension; // for scale type
}

// ── Section 1: Activities — Would you enjoy doing this? ──────────────────────
// Format: yes/no styled as scale (1=Strongly dislike, 5=Strongly enjoy)

export const ACTIVITY_QUESTIONS: RiasecQuestion[] = [
  // Realistic
  { id: "act_R1", section: "activities", type: "scale", dimension: "R", prompt: "Operate heavy machinery or power tools" },
  { id: "act_R2", section: "activities", type: "scale", dimension: "R", prompt: "Wire an electrical outlet or install a light fixture" },
  { id: "act_R3", section: "activities", type: "scale", dimension: "R", prompt: "Build furniture or a structure from raw materials" },
  { id: "act_R4", section: "activities", type: "scale", dimension: "R", prompt: "Diagnose and fix a mechanical or plumbing problem" },
  { id: "act_R5", section: "activities", type: "scale", dimension: "R", prompt: "Work outdoors in construction, agriculture, or land management" },
  { id: "act_R6", section: "activities", type: "scale", dimension: "R", prompt: "Inspect a system (vehicle, building, equipment) for problems" },

  // Investigative
  { id: "act_I1", section: "activities", type: "scale", dimension: "I", prompt: "Research a complex topic by reading papers and studies" },
  { id: "act_I2", section: "activities", type: "scale", dimension: "I", prompt: "Analyze a data set to find patterns or insights" },
  { id: "act_I3", section: "activities", type: "scale", dimension: "I", prompt: "Design and run an experiment to test a hypothesis" },
  { id: "act_I4", section: "activities", type: "scale", dimension: "I", prompt: "Troubleshoot a software bug or technical system failure" },
  { id: "act_I5", section: "activities", type: "scale", dimension: "I", prompt: "Study scientific literature in biology, chemistry, or physics" },
  { id: "act_I6", section: "activities", type: "scale", dimension: "I", prompt: "Build a mathematical model to simulate a real-world situation" },

  // Artistic
  { id: "act_A1", section: "activities", type: "scale", dimension: "A", prompt: "Design a visual identity (logo, color palette, typography) for a brand" },
  { id: "act_A2", section: "activities", type: "scale", dimension: "A", prompt: "Write a story, essay, or poem that expresses a personal idea" },
  { id: "act_A3", section: "activities", type: "scale", dimension: "A", prompt: "Create a short film, video, or photo series" },
  { id: "act_A4", section: "activities", type: "scale", dimension: "A", prompt: "Design the layout or user experience of a website or app" },
  { id: "act_A5", section: "activities", type: "scale", dimension: "A", prompt: "Perform or create music, theater, or dance" },
  { id: "act_A6", section: "activities", type: "scale", dimension: "A", prompt: "Redesign a space — a room, a garden, a storefront — from scratch" },

  // Social
  { id: "act_S1", section: "activities", type: "scale", dimension: "S", prompt: "Tutor or coach someone struggling with a difficult concept" },
  { id: "act_S2", section: "activities", type: "scale", dimension: "S", prompt: "Listen to someone in distress and help them work through it" },
  { id: "act_S3", section: "activities", type: "scale", dimension: "S", prompt: "Facilitate a group discussion or workshop" },
  { id: "act_S4", section: "activities", type: "scale", dimension: "S", prompt: "Volunteer in a school, clinic, or community service program" },
  { id: "act_S5", section: "activities", type: "scale", dimension: "S", prompt: "Train new employees or onboard team members to a process" },
  { id: "act_S6", section: "activities", type: "scale", dimension: "S", prompt: "Resolve a conflict between two people and find a fair solution" },

  // Enterprising
  { id: "act_E1", section: "activities", type: "scale", dimension: "E", prompt: "Pitch an idea to a room full of people and persuade them" },
  { id: "act_E2", section: "activities", type: "scale", dimension: "E", prompt: "Negotiate a contract or the price of something important" },
  { id: "act_E3", section: "activities", type: "scale", dimension: "E", prompt: "Lead a project team toward a tight deadline" },
  { id: "act_E4", section: "activities", type: "scale", dimension: "E", prompt: "Start a small side business and try to make it profitable" },
  { id: "act_E5", section: "activities", type: "scale", dimension: "E", prompt: "Develop a strategy to grow an organization or department" },
  { id: "act_E6", section: "activities", type: "scale", dimension: "E", prompt: "Make a high-stakes decision with limited information" },

  // Conventional
  { id: "act_C1", section: "activities", type: "scale", dimension: "C", prompt: "Set up and maintain a detailed financial tracking spreadsheet" },
  { id: "act_C2", section: "activities", type: "scale", dimension: "C", prompt: "Proofread and edit a document for accuracy and completeness" },
  { id: "act_C3", section: "activities", type: "scale", dimension: "C", prompt: "Create a filing and organizational system from scratch" },
  { id: "act_C4", section: "activities", type: "scale", dimension: "C", prompt: "Audit records or a process to find errors and inconsistencies" },
  { id: "act_C5", section: "activities", type: "scale", dimension: "C", prompt: "Process a set of transactions or records with precision" },
  { id: "act_C6", section: "activities", type: "scale", dimension: "C", prompt: "Build a reporting dashboard or prepare a detailed status report" },
];

// ── Section 2: Interest Scenarios (choice-format) ────────────────────────────

export const SCENARIO_QUESTIONS: RiasecQuestion[] = [
  {
    id: "sc_1",
    section: "interests",
    type: "choice",
    prompt: "You have a free Saturday to learn something new. What do you do?",
    options: [
      { label: "Watch tutorials on home repair and try fixing something around the house", dimension: "R" },
      { label: "Deep-dive into a documentary or book about science, history, or technology", dimension: "I" },
      { label: "Take an art, photography, music, or writing workshop", dimension: "A" },
      { label: "Volunteer at a local shelter, hospital, or tutoring program", dimension: "S" },
      { label: "Brainstorm a business idea and research the market for it", dimension: "E" },
      { label: "Organize your space, review your finances, and plan your schedule", dimension: "C" },
    ],
  },
  {
    id: "sc_2",
    section: "interests",
    type: "choice",
    prompt: "Which of these projects sounds most exciting to you?",
    options: [
      { label: "Build a deck, greenhouse, or mechanical system from blueprints", dimension: "R" },
      { label: "Research a medical or scientific question and write a detailed report", dimension: "I" },
      { label: "Create a short documentary or photo essay about your community", dimension: "A" },
      { label: "Design and run a mentorship program for high school students", dimension: "S" },
      { label: "Launch a product or service and get your first paying customer", dimension: "E" },
      { label: "Build a financial model that projects five years of a company's growth", dimension: "C" },
    ],
  },
  {
    id: "sc_3",
    section: "interests",
    type: "choice",
    prompt: "You're choosing a college minor or night course. What do you pick?",
    options: [
      { label: "Engineering technology, construction management, or automotive systems", dimension: "R" },
      { label: "Data science, neuroscience, environmental studies, or statistics", dimension: "I" },
      { label: "Graphic design, creative writing, film production, or music", dimension: "A" },
      { label: "Counseling psychology, public health, education, or social work", dimension: "S" },
      { label: "Entrepreneurship, marketing, sales, or finance", dimension: "E" },
      { label: "Accounting, business analytics, information management, or logistics", dimension: "C" },
    ],
  },
  {
    id: "sc_4",
    section: "interests",
    type: "choice",
    prompt: "Which description sounds most like your ideal work day?",
    options: [
      { label: "Active and physical — on a job site, in a workshop, or in the field", dimension: "R" },
      { label: "Focused and analytical — deep research, experiments, or complex problem-solving", dimension: "I" },
      { label: "Creative and generative — designing, writing, or making something new", dimension: "A" },
      { label: "Relational and impactful — coaching, counseling, or directly helping people", dimension: "S" },
      { label: "Strategic and high-stakes — leading, pitching, or driving results", dimension: "E" },
      { label: "Structured and organized — managing data, processes, and systems with precision", dimension: "C" },
    ],
  },
  {
    id: "sc_5",
    section: "interests",
    type: "choice",
    prompt: "A company asks you to lead a big new project. Which sounds most appealing?",
    options: [
      { label: "Designing and overseeing the construction of a new facility", dimension: "R" },
      { label: "Running a study to determine why customer retention is dropping", dimension: "I" },
      { label: "Rebranding the entire company — name, logo, voice, and messaging", dimension: "A" },
      { label: "Building a mental health and wellness program for employees", dimension: "S" },
      { label: "Launching the company into a new market and hitting revenue targets", dimension: "E" },
      { label: "Implementing a new financial reporting and compliance system", dimension: "C" },
    ],
  },
  {
    id: "sc_6",
    section: "interests",
    type: "choice",
    prompt: "Which kind of recognition feels most meaningful to you?",
    options: [
      { label: "Being known as the most skilled craftsperson or technician in your field", dimension: "R" },
      { label: "Being recognized for a breakthrough discovery or innovative solution", dimension: "I" },
      { label: "Seeing your creative work touch or inspire a large audience", dimension: "A" },
      { label: "Hearing that you changed someone's life for the better", dimension: "S" },
      { label: "Building something from zero into a thriving organization", dimension: "E" },
      { label: "Being trusted to run the systems that keep a large organization operating", dimension: "C" },
    ],
  },
  {
    id: "sc_7",
    section: "interests",
    type: "choice",
    prompt: "When you're most in the zone, what are you usually doing?",
    options: [
      { label: "Using tools, equipment, or my hands to solve a physical problem", dimension: "R" },
      { label: "Researching, analyzing, or learning something complex", dimension: "I" },
      { label: "Making something — writing, designing, performing, or building creatively", dimension: "A" },
      { label: "Listening, coaching, or helping someone figure something out", dimension: "S" },
      { label: "Selling, pitching, leading, or driving a team forward", dimension: "E" },
      { label: "Organizing, planning, or building a system that makes things run better", dimension: "C" },
    ],
  },
  {
    id: "sc_8",
    section: "interests",
    type: "choice",
    prompt: "Which work environment would you thrive in most?",
    options: [
      { label: "Outdoors, on a job site, in a shop, or in a production facility", dimension: "R" },
      { label: "A lab, research facility, or focused desk with data and tools", dimension: "I" },
      { label: "A studio, open creative space, or media production environment", dimension: "A" },
      { label: "A school, hospital, community center, or nonprofit organization", dimension: "S" },
      { label: "A fast-moving startup, sales floor, or executive boardroom", dimension: "E" },
      { label: "A structured corporate office with clear processes and defined roles", dimension: "C" },
    ],
  },
];

// ── Section 3: Work Values ────────────────────────────────────────────────────

export interface WorkValuesQuestion {
  id: string;
  section: "values";
  prompt: string;
  options: Array<{ label: string; value: WorkValue }>;
}

export type WorkValue =
  | "achievement"    // mastery, solving hard problems
  | "independence"   // autonomy, self-direction
  | "recognition"    // status, visibility, advancement
  | "relationships"  // teamwork, connection, community
  | "support"        // helping others, service
  | "conditions"     // stability, income, work-life balance

export const WORK_VALUES_QUESTIONS: WorkValuesQuestion[] = [
  {
    id: "val_1",
    section: "values",
    prompt: "Which matters most to you in a job?",
    options: [
      { label: "Constantly learning and mastering new skills", value: "achievement" },
      { label: "Having the freedom to decide how I do my work", value: "independence" },
      { label: "Earning a high income and gaining career status", value: "recognition" },
      { label: "Working closely with a tight-knit team I respect", value: "relationships" },
      { label: "Doing work that genuinely helps people or society", value: "support" },
      { label: "Having job security, good benefits, and stable hours", value: "conditions" },
    ],
  },
  {
    id: "val_2",
    section: "values",
    prompt: "What would make you most proud of your career 10 years from now?",
    options: [
      { label: "Being considered one of the best at what I do", value: "achievement" },
      { label: "Having built something entirely my own", value: "independence" },
      { label: "Being a recognized leader in my industry", value: "recognition" },
      { label: "Having developed and mentored others", value: "relationships" },
      { label: "Having made a meaningful difference in people's lives", value: "support" },
      { label: "Having financial security and a fulfilling personal life", value: "conditions" },
    ],
  },
  {
    id: "val_3",
    section: "values",
    prompt: "Which would frustrate you most in a job?",
    options: [
      { label: "Doing repetitive work that doesn't challenge me", value: "achievement" },
      { label: "Being micromanaged or told exactly how to do everything", value: "independence" },
      { label: "Working hard but getting no recognition or advancement", value: "recognition" },
      { label: "Working alone with no team or community", value: "relationships" },
      { label: "Doing work that has no positive impact on anyone", value: "support" },
      { label: "High stress, unpredictable income, or poor work-life balance", value: "conditions" },
    ],
  },
  {
    id: "val_4",
    section: "values",
    prompt: "When you picture your ideal life at 35, what's most important?",
    options: [
      { label: "Being highly skilled and respected in a specialized field", value: "achievement" },
      { label: "Running my own business or working for myself", value: "independence" },
      { label: "Having a high-profile career with real influence", value: "recognition" },
      { label: "Building deep relationships with colleagues and clients", value: "relationships" },
      { label: "Working in a mission-driven role I believe in", value: "support" },
      { label: "Owning a home, having financial stability, and time for family", value: "conditions" },
    ],
  },
];

// ── Section 4: Entrepreneurship & Side Income ─────────────────────────────────

export interface EntrepreneurQuestion {
  id: string;
  section: "entrepreneurship";
  prompt: string;
  type: "scale" | "choice";
  dimension?: "risk_tolerance" | "autonomy" | "execution" | "side_income_interest";
  options?: Array<{ label: string; score: number }>;
}

export const ENTREPRENEUR_QUESTIONS: EntrepreneurQuestion[] = [
  {
    id: "ent_1",
    section: "entrepreneurship",
    type: "scale",
    dimension: "risk_tolerance",
    prompt: "I would be comfortable investing my own savings into a business idea I believed in, even if it might fail",
  },
  {
    id: "ent_2",
    section: "entrepreneurship",
    type: "scale",
    dimension: "autonomy",
    prompt: "I prefer making my own decisions about how I work rather than following someone else's system",
  },
  {
    id: "ent_3",
    section: "entrepreneurship",
    type: "scale",
    dimension: "execution",
    prompt: "When I have an idea, I tend to take action on it rather than just thinking about it",
  },
  {
    id: "ent_4",
    section: "entrepreneurship",
    type: "scale",
    dimension: "side_income_interest",
    prompt: "I am interested in building income streams outside of a traditional 9-to-5 job",
  },
  {
    id: "ent_5",
    section: "entrepreneurship",
    type: "scale",
    dimension: "risk_tolerance",
    prompt: "The idea of building something from nothing is more exciting to me than climbing a corporate ladder",
  },
  {
    id: "ent_6",
    section: "entrepreneurship",
    type: "scale",
    dimension: "side_income_interest",
    prompt: "I would like to explore ways to earn money from my skills or interests outside of a regular job",
  },
];

// ── Scoring ───────────────────────────────────────────────────────────────────

export type RiasecScores = Record<RiasecDimension, number>;
export type WorkValueScores = Record<WorkValue, number>;

export interface EntrepreneurProfile {
  riskTolerance: number;     // 0-100
  autonomyDrive: number;     // 0-100
  executionBias: number;     // 0-100
  sideIncomeInterest: number; // 0-100
  overall: number;           // composite 0-100
}

export interface AssessmentAnswers {
  activities: Record<string, number>; // question id → 1-5
  scenarios: Record<string, string>;  // question id → dimension letter
  values: Record<string, WorkValue>;  // question id → value key
  entrepreneurship: Record<string, number>; // question id → 1-5
}

export function scoreRiasec(answers: AssessmentAnswers): RiasecScores {
  const scores: RiasecScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const counts: RiasecScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

  // Score activity questions (1-5 scale, each maps to one dimension)
  for (const q of ACTIVITY_QUESTIONS) {
    const val = answers.activities[q.id];
    if (val !== undefined && q.dimension) {
      scores[q.dimension] += val;
      counts[q.dimension]++;
    }
  }

  // Score scenario questions (each selection = 1 point for chosen dimension)
  for (const q of SCENARIO_QUESTIONS) {
    const chosen = answers.scenarios[q.id] as RiasecDimension | undefined;
    if (chosen) {
      scores[chosen] += 3; // scenarios worth more than individual activities
      counts[chosen]++;
    }
  }

  // Normalize to 0-100
  const dims: RiasecDimension[] = ["R", "I", "A", "S", "E", "C"];
  const rawScores: RiasecScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

  // Max possible per dimension: 6 activity questions × 5 + 8 scenario questions × 3 = 30 + 24 = 54
  const maxPossible = 54;
  for (const d of dims) {
    rawScores[d] = Math.round((scores[d] / maxPossible) * 100);
  }

  return rawScores;
}

export function scoreWorkValues(answers: AssessmentAnswers): WorkValueScores {
  const scores: WorkValueScores = {
    achievement: 0,
    independence: 0,
    recognition: 0,
    relationships: 0,
    support: 0,
    conditions: 0,
  };
  for (const q of WORK_VALUES_QUESTIONS) {
    const chosen = answers.values[q.id];
    if (chosen) scores[chosen]++;
  }
  return scores;
}

export function scoreEntrepreneurship(answers: AssessmentAnswers): EntrepreneurProfile {
  const dims: Record<string, number[]> = {
    risk_tolerance: [],
    autonomy: [],
    execution: [],
    side_income_interest: [],
  };
  for (const q of ENTREPRENEUR_QUESTIONS) {
    const val = answers.entrepreneurship[q.id];
    if (val !== undefined && q.dimension) {
      dims[q.dimension].push(val);
    }
  }
  const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length / 5) * 100) : 0;
  const riskTolerance = avg(dims.risk_tolerance);
  const autonomyDrive = avg(dims.autonomy);
  const executionBias = avg(dims.execution);
  const sideIncomeInterest = avg(dims.side_income_interest);
  const overall = Math.round((riskTolerance + autonomyDrive + executionBias + sideIncomeInterest) / 4);
  return { riskTolerance, autonomyDrive, executionBias, sideIncomeInterest, overall };
}

/** Return top 3 RIASEC dimensions as a profile string e.g. "EAI" */
export function riasecProfileString(scores: RiasecScores): string {
  return (Object.entries(scores) as [RiasecDimension, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d)
    .join("");
}

/** Human-readable dimension names */
export const DIMENSION_LABELS: Record<RiasecDimension, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

export const DIMENSION_DESCRIPTIONS: Record<RiasecDimension, string> = {
  R: "You prefer working with tools, machines, or physical systems. You're practical, hands-on, and often excel in technical trades, engineering, or outdoor work.",
  I: "You're analytical, curious, and drawn to understanding complex problems. You thrive in research, science, technology, and data-driven fields.",
  A: "You're creative, expressive, and original. You excel in design, media, writing, and any field that rewards imagination and aesthetic sense.",
  S: "You're empathetic, supportive, and skilled with people. You do your best work in healthcare, education, counseling, and community service.",
  E: "You're persuasive, ambitious, and driven to lead. You thrive in business, entrepreneurship, sales, law, and high-stakes decision-making environments.",
  C: "You're organized, precise, and methodical. You excel at building systems, managing data, and ensuring accuracy in finance, operations, and administration.",
};

export const VALUE_LABELS: Record<WorkValue, string> = {
  achievement: "Mastery & Achievement",
  independence: "Autonomy & Independence",
  recognition: "Status & Recognition",
  relationships: "Relationships & Teamwork",
  support: "Service & Impact",
  conditions: "Stability & Work-Life Balance",
};
