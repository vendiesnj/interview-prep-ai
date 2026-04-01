/**
 * Roosevelt University — Demo Seed
 *
 * Five student personas that tell a complete career-center story:
 *  1. Marcus Johnson    — post-grad success story (52→81, placed at Northern Trust $67k)
 *  2. Aaliyah Washington— consulting track, high performer (72→88, interviewing at Deloitte)
 *  3. Diego Reyes       — CS junior, rapid improver (58→79, targeting Motorola/Accenture tech)
 *  4. Sophie Park       — HR/Psychology, classic plateau (65→69, needs coaching intervention)
 *  5. Jordan Taylor     — first-gen sophomore, early stage (44→62, lots of runway)
 *
 * Run after setupRoosevelt.ts:
 *   npx tsx scripts/seedRoosevelt.ts
 */

import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ─── Utilities ────────────────────────────────────────────────────────────────

function random(min: number, max: number) { return Math.random() * (max - min) + min; }
function clamp(v: number, mn: number, mx: number) { return Math.max(mn, Math.min(mx, v)); }
function round1(v: number) { return Math.round(v * 10) / 10; }
function round2(v: number) { return Math.round(v * 100) / 100; }
function pickRandom<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function noise(base: number, vol: number) { return base + random(-vol, vol); }
function daysAgo(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
}

// ─── Question bank ────────────────────────────────────────────────────────────

type QuestionCategory = "behavioral" | "teamwork" | "leadership" | "technical" | "career_dev";
type Question = { question: string; category: QuestionCategory; transcript: string };

const QUESTIONS: Question[] = [
  {
    question: "Tell me about a time you led a team through a challenge.",
    category: "leadership",
    transcript:
      "In my campus leadership role I coordinated a five-person team through a compressed timeline for a business plan competition. I delegated based on each person's strengths, held quick daily check-ins, and we finished second in the regional round — our best result in three years.",
  },
  {
    question: "Describe a situation where you had to handle conflict.",
    category: "behavioral",
    transcript:
      "Two group members disagreed on our financial model assumptions. I set up a working session where each person walked through their logic, then we aligned on a hybrid projection with documented assumptions. The tension dropped immediately and we hit our deadline.",
  },
  {
    question: "Tell me about a time you failed and what you learned.",
    category: "behavioral",
    transcript:
      "I underestimated how long it would take to build a client-facing report and missed the draft deadline. I owned it to my supervisor, created a buffer system for future projects, and the final version was delivered ahead of schedule.",
  },
  {
    question: "Describe a time you improved a process.",
    category: "career_dev",
    transcript:
      "Our student organization was tracking event sign-ups in a shared spreadsheet that frequently had version conflicts. I moved us to a form-based system that auto-populated a master sheet. Time to reconcile RSVPs dropped from 40 minutes to under five.",
  },
  {
    question: "Tell me about a difficult decision you had to make.",
    category: "behavioral",
    transcript:
      "I had to recommend dropping a vendor relationship mid-semester that had a personal connection for a teammate. I laid out the cost data and risk profile objectively, the team agreed, and we found a better partner within two weeks.",
  },
  {
    question: "Walk me through how you would prioritize competing deadlines.",
    category: "technical",
    transcript:
      "I rank tasks by impact and urgency — not just due date — using a quick two-by-two. I communicate proactively if something has to shift, then batch similar work to protect focus time. That approach got me through a week with three finals and a part-time internship deadline.",
  },
  {
    question: "How would you explain a technical recommendation to a non-technical audience?",
    category: "career_dev",
    transcript:
      "I lead with the outcome in plain terms, then give one analogy that connects to something familiar. I save the methodology details for follow-up questions rather than front-loading them. A recent presentation I gave to a community nonprofit got a standing ovation from a non-technical board.",
  },
  {
    question: "Walk me through a time you used data to influence a decision.",
    category: "technical",
    transcript:
      "I analyzed two semesters of tutoring center visit data and showed that Thursday evening drop-in hours had 40% lower utilization but the same staffing cost. The director reallocated those hours to a high-demand Monday slot and saw a 25% increase in weekly sessions.",
  },
  {
    question: "Describe a time you worked effectively as part of a team.",
    category: "teamwork",
    transcript:
      "For a capstone consulting project we had five students across three majors. I built a shared Notion workspace, set weekly milestones, and created a role assignment doc so no one overlapped. We received an A and the client implemented two of our three recommendations.",
  },
  {
    question: "Tell me about a time you had to adapt quickly to change.",
    category: "career_dev",
    transcript:
      "My internship project was scoped for eight weeks but the team got a production incident that pulled everyone off for ten days. I independently reprioritized to work on documentation and testing, then re-onboarded the team to my progress in a structured handoff when they returned.",
  },
  {
    question: "Tell me about your greatest professional strength.",
    category: "behavioral",
    transcript:
      "I'm unusually good at translating ambiguous problems into structured plans. Whether it's a vague assignment from a professor or an open-ended client brief, I instinctively break it into components, assign time to each, and identify the first unknown I need to resolve. That's kept me ahead on almost every complex project.",
  },
  {
    question: "Where do you see yourself in five years?",
    category: "career_dev",
    transcript:
      "I see myself in a client-facing strategy role, having moved from individual contributor to someone who shapes the framing of problems, not just the solutions. I want to have built real domain depth in two or three industries and have managed at least one direct report through a meaningful project.",
  },
];

// ─── Acoustic / scoring persona profiles ─────────────────────────────────────

type Persona = {
  overallStart: number; overallEnd: number;
  commStart: number;    commEnd: number;
  confStart: number;    confEnd: number;
  fillersStart: number; fillersEnd: number;
  wpmStart: number;     wpmEnd: number;
  closingStart: number; closingEnd: number;
  volatility: number;
  monotoneStart: number; monotoneEnd: number;
  pitchMeanBase: number;
  pitchStdStart: number; pitchStdEnd: number;
  pitchRangeStart: number; pitchRangeEnd: number;
  energyMeanBase: number;
  energyStdStart: number; energyStdEnd: number;
  energyVarStart: number; energyVarEnd: number;
  tempoDynStart: number;  tempoDynEnd: number;
};

// Marcus — post-grad success story (strong improvement arc)
const MARCUS: Persona = {
  overallStart: 52, overallEnd: 81,
  commStart: 5.2,   commEnd: 7.9,
  confStart: 4.8,   confEnd: 7.7,
  fillersStart: 5.1, fillersEnd: 1.6,
  wpmStart: 95,     wpmEnd: 132,
  closingStart: 4.9, closingEnd: 7.8,
  volatility: 3.2,
  monotoneStart: 7.6, monotoneEnd: 4.2,
  pitchMeanBase: 168,
  pitchStdStart: 9,   pitchStdEnd: 26,
  pitchRangeStart: 50, pitchRangeEnd: 140,
  energyMeanBase: 0.10,
  energyStdStart: 0.011, energyStdEnd: 0.040,
  energyVarStart: 2.2, energyVarEnd: 6.8,
  tempoDynStart: 2.4, tempoDynEnd: 6.0,
};

// Aaliyah — high performer, natural communicator (consulting track)
const AALIYAH: Persona = {
  overallStart: 72, overallEnd: 88,
  commStart: 7.4,   commEnd: 8.8,
  confStart: 7.2,   confEnd: 8.6,
  fillersStart: 1.8, fillersEnd: 0.9,
  wpmStart: 138,    wpmEnd: 148,
  closingStart: 7.0, closingEnd: 8.6,
  volatility: 1.8,
  monotoneStart: 3.2, monotoneEnd: 2.2,
  pitchMeanBase: 210,
  pitchStdStart: 28,  pitchStdEnd: 38,
  pitchRangeStart: 155, pitchRangeEnd: 195,
  energyMeanBase: 0.17,
  energyStdStart: 0.048, energyStdEnd: 0.062,
  energyVarStart: 8.0, energyVarEnd: 9.2,
  tempoDynStart: 6.8, tempoDynEnd: 7.8,
};

// Diego — CS junior, rapid improver (technical, initially stilted)
const DIEGO: Persona = {
  overallStart: 58, overallEnd: 79,
  commStart: 5.5,   commEnd: 7.5,
  confStart: 5.0,   confEnd: 7.4,
  fillersStart: 4.2, fillersEnd: 1.9,
  wpmStart: 108,    wpmEnd: 134,
  closingStart: 5.2, closingEnd: 7.2,
  volatility: 2.8,
  monotoneStart: 6.8, monotoneEnd: 3.8,
  pitchMeanBase: 172,
  pitchStdStart: 10,  pitchStdEnd: 24,
  pitchRangeStart: 60, pitchRangeEnd: 135,
  energyMeanBase: 0.11,
  energyStdStart: 0.014, energyStdEnd: 0.038,
  energyVarStart: 2.8, energyVarEnd: 6.2,
  tempoDynStart: 3.0, tempoDynEnd: 5.6,
};

// Sophie — plateau (HR/Psych) — coaching intervention needed
const SOPHIE: Persona = {
  overallStart: 65, overallEnd: 69,
  commStart: 6.5,   commEnd: 6.9,
  confStart: 6.2,   confEnd: 6.6,
  fillersStart: 2.8, fillersEnd: 2.4,
  wpmStart: 124,    wpmEnd: 130,
  closingStart: 6.2, closingEnd: 6.5,
  volatility: 2.6,
  monotoneStart: 5.4, monotoneEnd: 5.2,
  pitchMeanBase: 220,
  pitchStdStart: 15,  pitchStdEnd: 17,
  pitchRangeStart: 90, pitchRangeEnd: 100,
  energyMeanBase: 0.13,
  energyStdStart: 0.024, energyStdEnd: 0.027,
  energyVarStart: 4.5, energyVarEnd: 4.9,
  tempoDynStart: 4.2, tempoDynEnd: 4.6,
};

// Jordan — first-gen sophomore, early stage (significant growth trajectory)
const JORDAN: Persona = {
  overallStart: 44, overallEnd: 62,
  commStart: 4.2,   commEnd: 6.1,
  confStart: 3.8,   confEnd: 5.8,
  fillersStart: 6.4, fillersEnd: 3.2,
  wpmStart: 85,     wpmEnd: 115,
  closingStart: 4.0, closingEnd: 5.8,
  volatility: 4.2,
  monotoneStart: 8.4, monotoneEnd: 6.2,
  pitchMeanBase: 195,
  pitchStdStart: 6,   pitchStdEnd: 16,
  pitchRangeStart: 35, pitchRangeEnd: 85,
  energyMeanBase: 0.08,
  energyStdStart: 0.008, energyStdEnd: 0.025,
  energyVarStart: 1.5, energyVarEnd: 4.2,
  tempoDynStart: 1.8, tempoDynEnd: 4.0,
};

// ─── Attempt builder ──────────────────────────────────────────────────────────

function buildAttempt(
  persona: Persona,
  i: number,
  total: number,
  attemptDate: Date,
  userId: string,
  tenantId: string,
) {
  const t  = total === 1 ? 1 : i / Math.max(1, total - 1);
  const v  = persona.volatility;
  const q  = pickRandom(QUESTIONS);
  const sl = q.category === "technical" ? 0.3 : q.category === "career_dev" ? 0.2 : 0;

  const overallScore       = round1(clamp(noise(lerp(persona.overallStart, persona.overallEnd, t), v), 38, 95));
  const communicationScore = round1(clamp(noise(lerp(persona.commStart,    persona.commEnd,    t), v * 0.12), 3.5, 9.5));
  const confidenceScore    = round1(clamp(noise(lerp(persona.confStart,    persona.confEnd,    t), v * 0.12), 3.5, 9.5));
  const fillersPer100      = round1(clamp(noise(lerp(persona.fillersStart, persona.fillersEnd, t), v * 0.18), 0.3, 7.0));
  const wpm                = Math.round(clamp(noise(lerp(persona.wpmStart, persona.wpmEnd, t), v * 2), 82, 175));
  const closingImpact      = round1(clamp(noise(lerp(persona.closingStart, persona.closingEnd, t), v * 0.15), 3.5, 9.5));

  const monotoneScore  = round1(clamp(noise(lerp(persona.monotoneStart, persona.monotoneEnd, t), v * 0.08), 1.5, 9.2));
  const pitchStd       = round1(clamp(noise(lerp(persona.pitchStdStart, persona.pitchStdEnd, t), v * 0.6), 4, 48));
  const pitchRange     = round1(clamp(noise(lerp(persona.pitchRangeStart, persona.pitchRangeEnd, t), v * 2), 28, 225));
  const pitchMean      = round1(clamp(noise(persona.pitchMeanBase, v * 1.5), 115, 270));
  const energyStd      = round2(clamp(noise(lerp(persona.energyStdStart, persona.energyStdEnd, t), v * 0.002), 0.006, 0.082));
  const energyVar      = round1(clamp(noise(lerp(persona.energyVarStart, persona.energyVarEnd, t), v * 0.15), 1.0, 9.8));
  const energyMean     = round2(clamp(noise(persona.energyMeanBase, v * 0.004), 0.04, 0.24));
  const tempoDyn       = round1(clamp(noise(lerp(persona.tempoDynStart, persona.tempoDynEnd, t), v * 0.2), 1.5, 9.5));
  const tempo          = round1(clamp(wpm + random(-6, 8), 80, 180));

  return {
    userId,
    tenantId,
    ts: attemptDate,
    createdAt: attemptDate,
    question: q.question,
    questionCategory: q.category,
    evaluationFramework: "STAR",
    transcript: q.transcript,
    score: overallScore,
    communicationScore,
    confidenceScore,
    wpm,
    inputMethod: "spoken",
    feedback: {
      score: round1(overallScore / 10),
      communication_score: round1(communicationScore),
      confidence_score: round1(confidenceScore),
      filler: { per100: fillersPer100 },
      star: {
        situation: round1(clamp(random(5.5, 8.5) + sl, 1, 10)),
        task:      round1(clamp(random(5.5, 8.5) + sl, 1, 10)),
        action:    round1(clamp(random(6.0, 8.9) + sl, 1, 10)),
        result:    round1(closingImpact),
      },
    },
    prosody: {
      monotone: monotoneScore,
      pitchMean,
      pitchStd,
      energyMean,
      fillerRate: round2(fillersPer100 / 100),
      tempoDynamics: tempoDyn,
    },
    deliveryMetrics: {
      fillersPer100,
      fillerWordsPerMin: round1(clamp(fillersPer100 * random(0.85, 1.35), 0.6, 9.0)),
      pacingScore: round1(clamp(9 - Math.abs(wpm - 132) / 12, 4.5, 9.2) * 10),
      acoustics: {
        monotoneScore,
        pitchMean,
        pitchStd,
        pitchRange,
        energyMean,
        energyStd,
        energyVariation: energyVar,
        tempo,
        tempoDynamics: tempoDyn,
      },
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log("DATABASE_URL loaded:", !!process.env.DATABASE_URL);
  const { prisma } = await import("../app/lib/prisma");

  const tenant = await prisma.tenant.findUnique({ where: { slug: "roosevelt" } });
  if (tenant) await prisma.tenant.update({ where: { slug: "roosevelt" }, data: { plan: "university" } });
  if (!tenant) {
    console.error("Roosevelt tenant not found. Run setupRoosevelt.ts first.");
    process.exit(1);
  }
  const tenantId = tenant.id;

  const [marcus, aaliyah, diego, sophie, jordan] = await Promise.all([
    prisma.user.findUnique({ where: { email: "marcus@roosevelt.edu" } }),
    prisma.user.findUnique({ where: { email: "aaliyah@roosevelt.edu" } }),
    prisma.user.findUnique({ where: { email: "diego@roosevelt.edu" } }),
    prisma.user.findUnique({ where: { email: "sophie@roosevelt.edu" } }),
    prisma.user.findUnique({ where: { email: "jordan@roosevelt.edu" } }),
  ]);
  if (!marcus || !aaliyah || !diego || !sophie || !jordan) {
    console.error("One or more Roosevelt students not found. Run setupRoosevelt.ts first.");
    process.exit(1);
  }

  // Demo anchor date — today's actual seed date
  const TODAY = new Date("2026-03-30T12:00:00.000Z");

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. MARCUS JOHNSON — Post-grad success story
  //    Business/Finance, graduated May 2025, now at Northern Trust
  //    Arc: 52 → 81 over 38 sessions (6 months of heavy practice)
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("\nSeeding Marcus Johnson...");

  await prisma.aptitudeResult.deleteMany({ where: { userId: marcus.id } });
  await prisma.aptitudeResult.create({
    data: {
      userId: marcus.id, tenantId,
      primary: "E", secondary: "C",
      scores: {
        riasecProfile: "ECF",
        riasecScores: { R: 18, I: 38, A: 32, S: 55, E: 80, C: 68 },
        workValues: { achievement: 3, independence: 1, recognition: 2, relationships: 2, support: 0, conditions: 2 },
        entrepreneurProfile: { riskTolerance: 65, autonomyDrive: 60, executionBias: 72, sideIncomeInterest: 55, overall: 63 },
      },
    },
  });

  await prisma.attempt.deleteMany({ where: { userId: marcus.id, tenantId } });
  const marcusTotal = 38;
  for (let i = 0; i < marcusTotal; i++) {
    const daysBack = Math.round(lerp(185, 3, i / Math.max(1, marcusTotal - 1))) + Math.floor(random(0, 4));
    await prisma.attempt.create({ data: buildAttempt(MARCUS, i, marcusTotal, daysAgo(TODAY, daysBack), marcus.id, tenantId) });
  }
  console.log(`  ${marcusTotal} attempts seeded.`);

  await prisma.careerCheckIn.deleteMany({ where: { userId: marcus.id } });
  await prisma.careerCheckIn.create({
    data: {
      userId: marcus.id, tenantId,
      employmentStatus: "employed",
      jobTitle: "Wealth Management Analyst",
      industry: "Financial Services",
      salaryRange: "60_75k",
      salaryExact: 67000,
      has401k: true,
      contribution401kPct: 5,
      currentSavingsRange: "5_15k",
      studentLoanRange: "10_30k",
      satisfactionScore: 5,
      graduationYear: 2025,
      monthsSinceGrad: 10,
    },
  });

  await prisma.checklistProgress.deleteMany({ where: { userId: marcus.id } });
  for (const itemId of ["401k_enrolled", "contribution_set", "benefits_reviewed", "w4_set", "paycheck_review", "emergency_3mo", "renter_insurance", "credit_report"]) {
    await prisma.checklistProgress.upsert({
      where: { userId_stage_itemId: { userId: marcus.id, stage: "post_college", itemId } },
      update: { done: true },
      create: { userId: marcus.id, tenantId, stage: "post_college", itemId, done: true },
    });
  }

  await prisma.studentSkill.deleteMany({ where: { userId: marcus.id } });
  for (const [skill, category] of [
    ["Financial Modeling", "analytical"], ["Excel", "technical"], ["Bloomberg Terminal", "technical"],
    ["Client Relations", "communication"], ["Portfolio Analysis", "domain"], ["Risk Assessment", "analytical"],
    ["PowerPoint", "technical"], ["Leadership", "leadership"],
  ]) {
    await prisma.studentSkill.create({ data: { userId: marcus.id, tenantId, skill, category, confidence: round2(random(0.74, 0.96)), source: "ai_extracted" } });
  }

  await prisma.interviewActivity.deleteMany({ where: { userId: marcus.id } });
  await prisma.interviewActivity.createMany({
    data: [
      {
        userId: marcus.id, tenantId,
        company: "JPMorgan Chase", role: "Financial Analyst", industry: "Financial Services",
        appliedDate: daysAgo(TODAY, 310), interviewDate: daysAgo(TODAY, 295),
        stage: "phone_screen", outcome: "rejected",
        notes: "Rejected after phone screen — feedback cited need for more quantitative depth.",
      },
      {
        userId: marcus.id, tenantId,
        company: "Morningstar", role: "Investment Research Associate", industry: "Financial Services",
        appliedDate: daysAgo(TODAY, 280), interviewDate: daysAgo(TODAY, 265),
        stage: "offer", outcome: "declined",
        salaryOffered: 61000,
        notes: "Offer at $61k. Declined — compensation below target and no WFH flexibility.",
      },
      {
        userId: marcus.id, tenantId,
        company: "Northern Trust", role: "Wealth Management Analyst", industry: "Financial Services",
        appliedDate: daysAgo(TODAY, 255), interviewDate: daysAgo(TODAY, 238),
        stage: "accepted", outcome: "accepted",
        salaryOffered: 67000,
        notes: "Current role. Strong panel interview — Signal prep made the behavioral round straightforward.",
      },
    ],
  });
  console.log("  Career check-in, checklist, skills, interview activity seeded.");

  await prisma.task.deleteMany({ where: { userId: marcus.id } });
  await prisma.task.createMany({ data: [
    { userId: marcus.id, tenantId, title: "Max out 401(k) contribution to 10%", priority: "high", category: "Finance", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 3), completedAt: null, createdAt: daysAgo(TODAY, 5) },
    { userId: marcus.id, tenantId, title: "Schedule 30-day check-in with manager", priority: "high", category: "Career", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 1), completedAt: null, createdAt: daysAgo(TODAY, 4) },
    { userId: marcus.id, tenantId, title: "Open Roth IRA account", priority: "medium", category: "Finance", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 14), completedAt: null, createdAt: daysAgo(TODAY, 6) },
    { userId: marcus.id, tenantId, title: "Update LinkedIn with Northern Trust role", priority: "medium", category: "Career", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 2), completedAt: null, createdAt: daysAgo(TODAY, 3) },
    { userId: marcus.id, tenantId, title: "Build post-grad monthly budget", priority: "high", category: "Finance", scheduledAt: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 10, 0), dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()), completedAt: null, createdAt: daysAgo(TODAY, 7) },
    { userId: marcus.id, tenantId, title: "Request renter's insurance quote", priority: "low", category: "Finance", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 7), completedAt: null, createdAt: daysAgo(TODAY, 2) },
    { userId: marcus.id, tenantId, title: "Complete Signal career assessment retake", priority: "medium", category: "Career", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 5), completedAt: null, createdAt: daysAgo(TODAY, 1) },
    { userId: marcus.id, tenantId, title: "Review first pay stub and verify withholdings", priority: "high", category: "Finance", completedAt: daysAgo(TODAY, 2), createdAt: daysAgo(TODAY, 10) },
    { userId: marcus.id, tenantId, title: "Enroll in health + dental benefits", priority: "high", category: "Finance", completedAt: daysAgo(TODAY, 5), createdAt: daysAgo(TODAY, 14) },
    { userId: marcus.id, tenantId, title: "Connect with mentor from Roosevelt alumni network", priority: "medium", category: "Career", completedAt: daysAgo(TODAY, 8), createdAt: daysAgo(TODAY, 20) },
  ]});
  console.log("  Tasks seeded for Marcus.");

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. AALIYAH WASHINGTON — High performer, consulting track
  //    Business/Communications senior, targeting Deloitte & Accenture
  //    Arc: 72 → 88 over 26 sessions (steady climb)
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("\nSeeding Aaliyah Washington...");

  await prisma.aptitudeResult.deleteMany({ where: { userId: aaliyah.id } });
  await prisma.aptitudeResult.create({
    data: {
      userId: aaliyah.id, tenantId,
      primary: "E", secondary: "S",
      scores: {
        riasecProfile: "ESA",
        riasecScores: { R: 12, I: 44, A: 62, S: 74, E: 88, C: 42 },
        workValues: { achievement: 3, independence: 2, recognition: 3, relationships: 2, support: 1, conditions: 1 },
        entrepreneurProfile: { riskTolerance: 78, autonomyDrive: 72, executionBias: 80, sideIncomeInterest: 65, overall: 74 },
      },
    },
  });

  await prisma.attempt.deleteMany({ where: { userId: aaliyah.id, tenantId } });
  const aaliyahTotal = 26;
  for (let i = 0; i < aaliyahTotal; i++) {
    const daysBack = Math.round(lerp(130, 4, i / Math.max(1, aaliyahTotal - 1))) + Math.floor(random(0, 3));
    await prisma.attempt.create({ data: buildAttempt(AALIYAH, i, aaliyahTotal, daysAgo(TODAY, daysBack), aaliyah.id, tenantId) });
  }
  console.log(`  ${aaliyahTotal} attempts seeded.`);

  await prisma.checklistProgress.deleteMany({ where: { userId: aaliyah.id } });
  for (const itemId of ["resume", "linkedin", "internship_apps", "taxes_filed", "fafsa_renewed", "advisor_semester", "career_fair", "rec_letter", "gpa_check"]) {
    await prisma.checklistProgress.upsert({
      where: { userId_stage_itemId: { userId: aaliyah.id, stage: "during_college", itemId } },
      update: { done: true },
      create: { userId: aaliyah.id, tenantId, stage: "during_college", itemId, done: true },
    });
  }

  await prisma.studentSkill.deleteMany({ where: { userId: aaliyah.id } });
  for (const [skill, category] of [
    ["Strategic Consulting", "domain"], ["Slide Decks & Storytelling", "communication"], ["Excel & Modeling", "technical"],
    ["Project Management", "leadership"], ["Research & Synthesis", "analytical"], ["Client Communication", "communication"],
    ["Python (basic)", "technical"], ["Change Management", "domain"],
  ]) {
    await prisma.studentSkill.create({ data: { userId: aaliyah.id, tenantId, skill, category, confidence: round2(random(0.80, 0.97)), source: "ai_extracted" } });
  }

  await prisma.interviewActivity.deleteMany({ where: { userId: aaliyah.id } });
  await prisma.interviewActivity.createMany({
    data: [
      {
        userId: aaliyah.id, tenantId,
        company: "PwC", role: "Advisory Associate", industry: "Professional Services",
        appliedDate: daysAgo(TODAY, 95), interviewDate: daysAgo(TODAY, 78),
        stage: "offer", outcome: "pending",
        notes: "Offer pending decision. Great cultural fit, case round went very well.",
      },
      {
        userId: aaliyah.id, tenantId,
        company: "Deloitte", role: "Business Analyst", industry: "Professional Services",
        appliedDate: daysAgo(TODAY, 80), interviewDate: daysAgo(TODAY, 58),
        stage: "final_round", outcome: "pending",
        notes: "Final round scheduled next week. Strong first-round case performance.",
      },
      {
        userId: aaliyah.id, tenantId,
        company: "Accenture", role: "Technology Analyst", industry: "Professional Services",
        appliedDate: daysAgo(TODAY, 65),
        stage: "applied", outcome: "pending",
        notes: "Applied to Chicago office. Network connection made at Roosevelt career fair.",
      },
    ],
  });
  console.log("  Checklist, skills, interview activity seeded.");

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. DIEGO REYES — CS Junior, rapid improver
  //    Computer Science, targeting Motorola Solutions / Outcome Health
  //    Arc: 58 → 79 over 20 sessions (accelerating in last 6 weeks)
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("\nSeeding Diego Reyes...");

  await prisma.aptitudeResult.deleteMany({ where: { userId: diego.id } });
  await prisma.aptitudeResult.create({
    data: {
      userId: diego.id, tenantId,
      primary: "I", secondary: "R",
      scores: {
        riasecProfile: "IRC",
        riasecScores: { R: 70, I: 85, A: 28, S: 35, E: 42, C: 60 },
        workValues: { achievement: 2, independence: 3, recognition: 1, relationships: 0, support: 1, conditions: 2 },
        entrepreneurProfile: { riskTolerance: 58, autonomyDrive: 80, executionBias: 74, sideIncomeInterest: 70, overall: 70 },
      },
    },
  });

  await prisma.attempt.deleteMany({ where: { userId: diego.id, tenantId } });
  const diegoTotal = 20;
  for (let i = 0; i < diegoTotal; i++) {
    const daysBack = Math.round(lerp(100, 2, i / Math.max(1, diegoTotal - 1))) + Math.floor(random(0, 4));
    await prisma.attempt.create({ data: buildAttempt(DIEGO, i, diegoTotal, daysAgo(TODAY, daysBack), diego.id, tenantId) });
  }
  console.log(`  ${diegoTotal} attempts seeded.`);

  await prisma.checklistProgress.deleteMany({ where: { userId: diego.id } });
  for (const itemId of ["resume", "linkedin", "internship_apps", "advisor_semester", "gpa_check"]) {
    await prisma.checklistProgress.upsert({
      where: { userId_stage_itemId: { userId: diego.id, stage: "during_college", itemId } },
      update: { done: true },
      create: { userId: diego.id, tenantId, stage: "during_college", itemId, done: true },
    });
  }

  await prisma.studentSkill.deleteMany({ where: { userId: diego.id } });
  for (const [skill, category] of [
    ["Python", "technical"], ["Java", "technical"], ["React", "technical"],
    ["SQL", "technical"], ["System Design", "domain"], ["Data Structures & Algorithms", "domain"],
    ["Git", "technical"], ["Agile/Scrum", "leadership"],
  ]) {
    await prisma.studentSkill.create({ data: { userId: diego.id, tenantId, skill, category, confidence: round2(random(0.72, 0.94)), source: "ai_extracted" } });
  }

  await prisma.interviewActivity.deleteMany({ where: { userId: diego.id } });
  await prisma.interviewActivity.createMany({
    data: [
      {
        userId: diego.id, tenantId,
        company: "Motorola Solutions", role: "Software Engineer Intern", industry: "Technology",
        appliedDate: daysAgo(TODAY, 72), interviewDate: daysAgo(TODAY, 55),
        stage: "phone_screen", outcome: "rejected",
        notes: "Good technical screen, rejected on behavioral round — communication cited as feedback area.",
      },
      {
        userId: diego.id, tenantId,
        company: "Outcome Health", role: "Junior Software Engineer", industry: "Health Tech",
        appliedDate: daysAgo(TODAY, 45), interviewDate: daysAgo(TODAY, 28),
        stage: "final_round", outcome: "pending",
        notes: "Final round scheduled. Noticeably more confident in mock sessions leading up.",
      },
      {
        userId: diego.id, tenantId,
        company: "Relativity", role: "Software Engineer Intern", industry: "Technology",
        appliedDate: daysAgo(TODAY, 20),
        stage: "applied", outcome: "pending",
        notes: "Chicago-based legaltech — strong cultural mission fit.",
      },
    ],
  });
  await prisma.task.deleteMany({ where: { userId: diego.id } });
  await prisma.task.createMany({ data: [
    { userId: diego.id, tenantId, title: "LeetCode medium: binary trees (3 problems)", priority: "high", category: "Career", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()), scheduledAt: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 9, 0), completedAt: null, createdAt: daysAgo(TODAY, 2) },
    { userId: diego.id, tenantId, title: "Prep behavioral stories for Outcome Health final round", priority: "high", category: "Career", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 1), completedAt: null, createdAt: daysAgo(TODAY, 3) },
    { userId: diego.id, tenantId, title: "Polish GitHub — pin 3 best projects with READMEs", priority: "medium", category: "Career", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 3), completedAt: null, createdAt: daysAgo(TODAY, 4) },
    { userId: diego.id, tenantId, title: "Apply to 2 more Chicago tech internships", priority: "high", category: "Career", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 5), completedAt: null, createdAt: daysAgo(TODAY, 1) },
    { userId: diego.id, tenantId, title: "Email CS advisor about spring registration", priority: "medium", category: "Career", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 2), completedAt: null, createdAt: daysAgo(TODAY, 2) },
    { userId: diego.id, tenantId, title: "Build personal portfolio site", priority: "medium", category: "Career", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 14), completedAt: null, createdAt: daysAgo(TODAY, 5) },
    { userId: diego.id, tenantId, title: "Research Relativity — prep company-specific questions", priority: "medium", category: "Career", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 4), completedAt: null, createdAt: daysAgo(TODAY, 1) },
    { userId: diego.id, tenantId, title: "Complete Signal mock interview session", priority: "high", category: "Career", completedAt: daysAgo(TODAY, 1), createdAt: daysAgo(TODAY, 3) },
    { userId: diego.id, tenantId, title: "Submit FAFSA renewal", priority: "high", category: "Finance", completedAt: daysAgo(TODAY, 6), createdAt: daysAgo(TODAY, 10) },
    { userId: diego.id, tenantId, title: "Ask Professor Kim for recommendation letter", priority: "medium", category: "Career", completedAt: daysAgo(TODAY, 4), createdAt: daysAgo(TODAY, 8) },
  ]});
  console.log("  Tasks seeded for Diego.");

  console.log("  Checklist, skills, interview activity seeded.");

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. SOPHIE PARK — Plateau case, coaching intervention needed
  //    Psychology/HR senior, targeting Hyatt & United Airlines
  //    Arc: 65 → 69 over 18 sessions (flat line — demonstration of coaching need)
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("\nSeeding Sophie Park...");

  await prisma.aptitudeResult.deleteMany({ where: { userId: sophie.id } });
  await prisma.aptitudeResult.create({
    data: {
      userId: sophie.id, tenantId,
      primary: "S", secondary: "A",
      scores: {
        riasecProfile: "SAE",
        riasecScores: { R: 15, I: 38, A: 62, S: 78, E: 55, C: 35 },
        workValues: { achievement: 1, independence: 1, recognition: 1, relationships: 3, support: 2, conditions: 1 },
        entrepreneurProfile: { riskTolerance: 38, autonomyDrive: 42, executionBias: 50, sideIncomeInterest: 28, overall: 39 },
      },
    },
  });

  await prisma.attempt.deleteMany({ where: { userId: sophie.id, tenantId } });
  const sophieTotal = 18;
  for (let i = 0; i < sophieTotal; i++) {
    const daysBack = Math.round(lerp(90, 5, i / Math.max(1, sophieTotal - 1))) + Math.floor(random(0, 3));
    await prisma.attempt.create({ data: buildAttempt(SOPHIE, i, sophieTotal, daysAgo(TODAY, daysBack), sophie.id, tenantId) });
  }
  console.log(`  ${sophieTotal} attempts seeded.`);

  await prisma.checklistProgress.deleteMany({ where: { userId: sophie.id } });
  for (const itemId of ["resume", "linkedin", "internship_apps", "advisor_semester", "career_fair"]) {
    await prisma.checklistProgress.upsert({
      where: { userId_stage_itemId: { userId: sophie.id, stage: "during_college", itemId } },
      update: { done: true },
      create: { userId: sophie.id, tenantId, stage: "during_college", itemId, done: true },
    });
  }

  await prisma.studentSkill.deleteMany({ where: { userId: sophie.id } });
  for (const [skill, category] of [
    ["Conflict Resolution", "leadership"], ["Active Listening", "communication"], ["HRIS Systems", "technical"],
    ["Recruiting", "domain"], ["Employee Relations", "domain"], ["Microsoft Office", "technical"],
  ]) {
    await prisma.studentSkill.create({ data: { userId: sophie.id, tenantId, skill, category, confidence: round2(random(0.65, 0.88)), source: "ai_extracted" } });
  }

  await prisma.interviewActivity.deleteMany({ where: { userId: sophie.id } });
  await prisma.interviewActivity.createMany({
    data: [
      {
        userId: sophie.id, tenantId,
        company: "Hyatt Hotels", role: "HR Coordinator", industry: "Hospitality",
        appliedDate: daysAgo(TODAY, 60), interviewDate: daysAgo(TODAY, 45),
        stage: "phone_screen", outcome: "rejected",
        notes: "Passed recruiter screen, rejected after hiring manager call. Needs stronger behavioral stories.",
      },
      {
        userId: sophie.id, tenantId,
        company: "United Airlines", role: "People & Culture Associate", industry: "Aviation",
        appliedDate: daysAgo(TODAY, 30),
        stage: "applied", outcome: "pending",
        notes: "Strong mission alignment. Following up next week.",
      },
    ],
  });
  console.log("  Checklist, skills, interview activity seeded.");

  // ══════════════════════════════════════════════════════════════════════════════
  // 5. JORDAN TAYLOR — First-gen sophomore, early stage
  //    Communications, exploring career paths, big improvement arc ahead
  //    Arc: 44 → 62 over 12 sessions (just getting started)
  // ══════════════════════════════════════════════════════════════════════════════
  console.log("\nSeeding Jordan Taylor...");

  await prisma.aptitudeResult.deleteMany({ where: { userId: jordan.id } });
  await prisma.aptitudeResult.create({
    data: {
      userId: jordan.id, tenantId,
      primary: "A", secondary: "S",
      scores: {
        riasecProfile: "ASE",
        riasecScores: { R: 22, I: 35, A: 75, S: 68, E: 48, C: 25 },
        workValues: { achievement: 1, independence: 2, recognition: 2, relationships: 3, support: 2, conditions: 0 },
        entrepreneurProfile: { riskTolerance: 45, autonomyDrive: 55, executionBias: 38, sideIncomeInterest: 60, overall: 49 },
      },
    },
  });

  await prisma.attempt.deleteMany({ where: { userId: jordan.id, tenantId } });
  const jordanTotal = 12;
  for (let i = 0; i < jordanTotal; i++) {
    const daysBack = Math.round(lerp(55, 3, i / Math.max(1, jordanTotal - 1))) + Math.floor(random(0, 4));
    await prisma.attempt.create({ data: buildAttempt(JORDAN, i, jordanTotal, daysAgo(TODAY, daysBack), jordan.id, tenantId) });
  }
  console.log(`  ${jordanTotal} attempts seeded.`);

  // Jordan only just started — partial checklist
  await prisma.checklistProgress.deleteMany({ where: { userId: jordan.id } });
  for (const itemId of ["fafsa_done", "email_setup", "linkedin_setup"]) {
    await prisma.checklistProgress.upsert({
      where: { userId_stage_itemId: { userId: jordan.id, stage: "pre_college", itemId } },
      update: { done: true },
      create: { userId: jordan.id, tenantId, stage: "pre_college", itemId, done: true },
    });
  }

  await prisma.studentSkill.deleteMany({ where: { userId: jordan.id } });
  for (const [skill, category] of [
    ["Social Media Content", "communication"], ["Copywriting", "communication"],
    ["Canva", "technical"], ["Event Planning", "leadership"],
  ]) {
    await prisma.studentSkill.create({ data: { userId: jordan.id, tenantId, skill, category, confidence: round2(random(0.55, 0.78)), source: "ai_extracted" } });
  }

  await prisma.task.deleteMany({ where: { userId: jordan.id } });
  await prisma.task.createMany({ data: [
    { userId: jordan.id, tenantId, title: "Submit housing application by deadline", priority: "high", category: "Personal", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 4), scheduledAt: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 14, 0), completedAt: null, createdAt: daysAgo(TODAY, 2) },
    { userId: jordan.id, tenantId, title: "Set up Roosevelt student email and portal", priority: "high", category: "Personal", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 1), completedAt: null, createdAt: daysAgo(TODAY, 3) },
    { userId: jordan.id, tenantId, title: "Register for orientation", priority: "high", category: "Personal", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 7), completedAt: null, createdAt: daysAgo(TODAY, 1) },
    { userId: jordan.id, tenantId, title: "Build first college budget — tuition, housing, books", priority: "medium", category: "Finance", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 6), completedAt: null, createdAt: daysAgo(TODAY, 2) },
    { userId: jordan.id, tenantId, title: "Schedule meeting with academic advisor", priority: "medium", category: "Career", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 10), completedAt: null, createdAt: daysAgo(TODAY, 1) },
    { userId: jordan.id, tenantId, title: "Add headshot and major to LinkedIn profile", priority: "low", category: "Career", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 8), completedAt: null, createdAt: daysAgo(TODAY, 2) },
    { userId: jordan.id, tenantId, title: "Complete Signal career assessment", priority: "high", category: "Career", dueDate: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 2), completedAt: null, createdAt: daysAgo(TODAY, 1) },
    { userId: jordan.id, tenantId, title: "Complete FAFSA application", priority: "high", category: "Finance", completedAt: daysAgo(TODAY, 5), createdAt: daysAgo(TODAY, 12) },
    { userId: jordan.id, tenantId, title: "Set up student email", priority: "high", category: "Personal", completedAt: daysAgo(TODAY, 3), createdAt: daysAgo(TODAY, 8) },
  ]});
  console.log("  Tasks seeded for Jordan.");

  console.log("  Checklist and skills seeded. No interview activity yet (sophomore).");

  // ══════════════════════════════════════════════════════════════════════════════
  console.log("\n✓ Roosevelt University seed complete.");
  console.log("  5 students seeded across 3 stages with", marcusTotal + aaliyahTotal + diegoTotal + sophieTotal + jordanTotal, "total attempts.");
  console.log("\nAdmin login: careers@roosevelt.edu / RooseveltAdmin2026!");
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
