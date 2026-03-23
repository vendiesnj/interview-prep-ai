import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ─── Utility helpers ──────────────────────────────────────────────────────────

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

function withNoise(base: number, volatility: number) {
  return base + random(-volatility, volatility);
}

/** Return a Date that is `days` days before `from`. */
function daysAgo(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
}

// ─── Question bank ────────────────────────────────────────────────────────────

type QuestionCategory = "behavioral" | "teamwork" | "leadership" | "technical" | "career_dev";

type Question = {
  question: string;
  category: QuestionCategory;
  transcript: string;
};

const QUESTIONS: Question[] = [
  {
    question: "Tell me about a time you led a team through a challenge.",
    category: "leadership",
    transcript:
      "In my previous role I coordinated a cross-functional group to meet a tight deadline. I delegated tasks based on individual strengths and held daily standups to surface blockers. We delivered on time and the client renewed their contract.",
  },
  {
    question: "Describe a situation where you had to handle conflict.",
    category: "behavioral",
    transcript:
      "Two teammates disagreed on the approach to a data model. I facilitated a meeting where each person presented their reasoning, then we agreed on a hybrid solution. The tension resolved and both felt heard.",
  },
  {
    question: "Tell me about a time you failed and what you learned.",
    category: "behavioral",
    transcript:
      "I underestimated the complexity of migrating a vendor system and we missed the sprint goal. I owned the miss in the retrospective and created a pre-flight checklist we still use today.",
  },
  {
    question: "Describe a time you improved a process.",
    category: "career_dev",
    transcript:
      "Our team was manually reconciling shipment records in Excel every Monday. I automated the process with a Python script that cut the time from two hours to five minutes and eliminated recurring errors.",
  },
  {
    question: "Tell me about a difficult decision you had to make.",
    category: "behavioral",
    transcript:
      "I had to recommend cancelling a vendor contract mid-project. I gathered cost and timeline data, presented the trade-offs to leadership, and we pivoted to an in-house solution that saved us 30% over the year.",
  },
  {
    question: "Walk me through how you would prioritize competing operational constraints.",
    category: "technical",
    transcript:
      "I start by mapping dependencies and impact on the end customer. I rank each constraint by urgency and business cost, then align with stakeholders before committing resources. This prevents last-minute surprises.",
  },
  {
    question: "How would you explain a recommendation to senior stakeholders?",
    category: "career_dev",
    transcript:
      "I lead with the recommendation and its expected outcome, then provide supporting data for questions. I avoid jargon and frame everything in terms of business impact. Visual summaries help keep the room engaged.",
  },
  {
    question: "Walk me through a time you used data to influence a decision.",
    category: "technical",
    transcript:
      "I pulled three months of order fulfillment data and identified a carrier that was responsible for 60% of late deliveries despite the lowest quoted rate. The analysis convinced leadership to renegotiate the contract.",
  },
  {
    question: "Describe a time you worked effectively as part of a team.",
    category: "teamwork",
    transcript:
      "During a product launch our team of six operated across three time zones. I set up shared tracking boards and a rotation for daily handoff notes. We shipped with zero critical bugs.",
  },
  {
    question: "Tell me about a time you had to adapt quickly to change.",
    category: "career_dev",
    transcript:
      "Our primary supplier went on strike two days before a major customer delivery. I sourced an alternative within 24 hours, coordinated expedited freight, and communicated proactively with the customer. We delivered only one day late.",
  },
];

// ─── Persona acoustic / scoring profiles ─────────────────────────────────────

type PersonaProfile = {
  // Score trajectories
  overallStart: number;   overallEnd: number;
  commStart: number;      commEnd: number;
  confStart: number;      confEnd: number;
  fillersStart: number;   fillersEnd: number;
  wpmStart: number;       wpmEnd: number;
  closingStart: number;   closingEnd: number;
  volatility: number;
  // Acoustic fingerprint
  monotoneStart: number;  monotoneEnd: number;
  pitchMeanBase: number;
  pitchStdStart: number;  pitchStdEnd: number;
  pitchRangeStart: number; pitchRangeEnd: number;
  energyMeanBase: number;
  energyStdStart: number; energyStdEnd: number;
  energyVarStart: number; energyVarEnd: number;
  tempoDynStart: number;  tempoDynEnd: number;
};

// Maria — struggling improver
const MARIA_PROFILE: PersonaProfile = {
  overallStart: 52,     overallEnd: 76,
  commStart: 5.1,       commEnd: 7.4,
  confStart: 4.9,       confEnd: 7.2,
  fillersStart: 4.8,    fillersEnd: 2.0,
  wpmStart: 98,         wpmEnd: 128,
  closingStart: 4.8,    closingEnd: 7.2,
  volatility: 3.4,
  monotoneStart: 7.8,   monotoneEnd: 4.8,
  pitchMeanBase: 218,
  pitchStdStart: 8,     pitchStdEnd: 22,
  pitchRangeStart: 55,  pitchRangeEnd: 130,
  energyMeanBase: 0.09,
  energyStdStart: 0.012, energyStdEnd: 0.038,
  energyVarStart: 2.0,  energyVarEnd: 6.5,
  tempoDynStart: 2.5,   tempoDynEnd: 5.8,
};

// James — average plateau
const JAMES_PROFILE: PersonaProfile = {
  overallStart: 64,     overallEnd: 69,
  commStart: 6.4,       commEnd: 6.9,
  confStart: 6.1,       confEnd: 6.7,
  fillersStart: 3.0,    fillersEnd: 2.5,
  wpmStart: 122,        wpmEnd: 130,
  closingStart: 6.0,    closingEnd: 6.5,
  volatility: 2.8,
  monotoneStart: 5.8,   monotoneEnd: 5.5,
  pitchMeanBase: 178,
  pitchStdStart: 14,    pitchStdEnd: 16,
  pitchRangeStart: 85,  pitchRangeEnd: 95,
  energyMeanBase: 0.12,
  energyStdStart: 0.022, energyStdEnd: 0.026,
  energyVarStart: 4.2,  energyVarEnd: 4.8,
  tempoDynStart: 4.0,   tempoDynEnd: 4.5,
};

// Priya — strong communicator, weak structure
const PRIYA_PROFILE: PersonaProfile = {
  overallStart: 66,     overallEnd: 75,
  commStart: 7.4,       commEnd: 8.3,
  confStart: 7.0,       confEnd: 8.0,
  fillersStart: 2.1,    fillersEnd: 1.3,
  wpmStart: 128,        wpmEnd: 138,
  closingStart: 5.1,    closingEnd: 6.3,
  volatility: 2.6,
  monotoneStart: 4.2,   monotoneEnd: 3.1,
  pitchMeanBase: 205,
  pitchStdStart: 26,    pitchStdEnd: 32,
  pitchRangeStart: 140, pitchRangeEnd: 175,
  energyMeanBase: 0.15,
  energyStdStart: 0.045, energyStdEnd: 0.058,
  energyVarStart: 7.2,  energyVarEnd: 8.5,
  tempoDynStart: 6.2,   tempoDynEnd: 7.4,
};

// ─── Attempt builder ──────────────────────────────────────────────────────────

function buildAttemptData(
  profile: PersonaProfile,
  i: number,
  total: number,
  attemptDate: Date,
  userId: string,
  tenantId: string,
) {
  const t = total === 1 ? 1 : i / Math.max(1, total - 1);
  const v = profile.volatility;
  const q = pickRandom(QUESTIONS);

  const overallScore      = round1(clamp(withNoise(lerp(profile.overallStart, profile.overallEnd, t), v), 45, 92));
  const communicationScore = round1(clamp(withNoise(lerp(profile.commStart, profile.commEnd, t), v * 0.12), 4.2, 9.3));
  const confidenceScore   = round1(clamp(withNoise(lerp(profile.confStart, profile.confEnd, t), v * 0.12), 4.0, 9.2));
  const fillersPer100     = round1(clamp(withNoise(lerp(profile.fillersStart, profile.fillersEnd, t), v * 0.18), 0.4, 6.0));
  const wpm               = Math.round(clamp(withNoise(lerp(profile.wpmStart, profile.wpmEnd, t), v * 2), 90, 170));
  const closingImpact     = round1(clamp(withNoise(lerp(profile.closingStart, profile.closingEnd, t), v * 0.15), 4.5, 9.0));

  const monotoneScore  = round1(clamp(withNoise(lerp(profile.monotoneStart, profile.monotoneEnd, t), v * 0.08), 1.5, 9.2));
  const pitchStd       = round1(clamp(withNoise(lerp(profile.pitchStdStart, profile.pitchStdEnd, t), v * 0.6), 4, 45));
  const pitchRange     = round1(clamp(withNoise(lerp(profile.pitchRangeStart, profile.pitchRangeEnd, t), v * 2), 30, 220));
  const pitchMean      = round1(clamp(withNoise(profile.pitchMeanBase, v * 1.5), 120, 260));
  const energyStd      = round2(clamp(withNoise(lerp(profile.energyStdStart, profile.energyStdEnd, t), v * 0.002), 0.008, 0.08));
  const energyVariation = round1(clamp(withNoise(lerp(profile.energyVarStart, profile.energyVarEnd, t), v * 0.15), 1.0, 9.8));
  const energyMean     = round2(clamp(withNoise(profile.energyMeanBase, v * 0.004), 0.05, 0.22));
  const tempoDynamics  = round1(clamp(withNoise(lerp(profile.tempoDynStart, profile.tempoDynEnd, t), v * 0.2), 1.5, 9.5));
  const tempo          = round1(clamp(wpm + random(-6, 8), 85, 175));

  const structureLift = q.category === "technical" ? 0.3 : q.category === "career_dev" ? 0.2 : 0;

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
      filler: { per100: round1(fillersPer100) },
      star: {
        situation: round1(clamp(random(5.8, 8.5) + structureLift, 1, 10)),
        task:      round1(clamp(random(5.8, 8.5) + structureLift, 1, 10)),
        action:    round1(clamp(random(6.0, 8.9) + structureLift, 1, 10)),
        result:    round1(closingImpact),
      },
    },

    prosody: {
      monotone:       monotoneScore,
      pitchMean,
      pitchStd,
      energyMean,
      fillerRate:     round2(fillersPer100 / 100),
      tempoDynamics,
    },

    deliveryMetrics: {
      fillersPer100,
      fillerWordsPerMin: round1(clamp(fillersPer100 * random(0.85, 1.35), 0.8, 8.5)),
      pacingScore: round1(clamp(9 - Math.abs(wpm - 132) / 12, 4.5, 9.2) * 10),
      acoustics: {
        monotoneScore,
        pitchMean,
        pitchStd,
        pitchRange,
        energyMean,
        energyStd,
        energyVariation,
        tempo,
        tempoDynamics,
      },
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log("DATABASE_URL loaded:", !!process.env.DATABASE_URL);

  const { prisma } = await import("../app/lib/prisma");

  // ── Resolve tenant ──────────────────────────────────────────────────────────
  const demoTenant = await prisma.tenant.findUnique({ where: { slug: "demo-college" } });
  if (!demoTenant) {
    console.error("Demo tenant not found. Run `npx tsx scripts/setupDemo.ts` first.");
    await prisma.$disconnect();
    process.exit(1);
  }
  const tenantId = demoTenant.id;

  // ── Resolve users ───────────────────────────────────────────────────────────
  const [mariaUser, jamesUser, priyaUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: "maria@demo-college.edu" } }),
    prisma.user.findUnique({ where: { email: "james@demo-college.edu" } }),
    prisma.user.findUnique({ where: { email: "priya@demo-college.edu" } }),
  ]);

  if (!mariaUser || !jamesUser || !priyaUser) {
    console.error(
      "One or more demo users not found. Make sure maria@, james@, and priya@demo-college.edu exist.",
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  // TODAY anchor — 2026-03-22
  const TODAY = new Date("2026-03-22T12:00:00.000Z");

  // ════════════════════════════════════════════════════════════════════════════
  // MARIA SANTOS
  // ════════════════════════════════════════════════════════════════════════════
  console.log("Seeding Maria Santos...");

  // ── Aptitude result ──
  await prisma.aptitudeResult.deleteMany({ where: { userId: mariaUser.id } });
  await prisma.aptitudeResult.create({
    data: {
      userId:    mariaUser.id,
      tenantId,
      primary:   "C",
      secondary: "I",
      scores: {
        riasecProfile: "CIE",
        riasecScores: { R: 20, I: 52, A: 30, S: 45, E: 48, C: 72 },
        workValues: {
          achievement:  2,
          independence: 1,
          recognition:  1,
          relationships: 2,
          support:      1,
          conditions:   3,
        },
        entrepreneurProfile: {
          riskTolerance:      38,
          autonomyDrive:      44,
          executionBias:      62,
          sideIncomeInterest: 35,
          overall:            44,
        },
      },
    },
  });

  // ── Practice attempts — 45 sessions over 6 months ──
  await prisma.attempt.deleteMany({ where: { userId: mariaUser.id, tenantId } });
  const mariaTotalAttempts = 45;
  // Spread over 180 days (6 months) before today
  for (let i = 0; i < mariaTotalAttempts; i++) {
    // Earlier attempts get dates further back; later attempts closer to today
    const daysBack = Math.round(lerp(180, 2, i / Math.max(1, mariaTotalAttempts - 1))) + Math.floor(random(0, 3));
    const attemptDate = daysAgo(TODAY, daysBack);
    const data = buildAttemptData(MARIA_PROFILE, i, mariaTotalAttempts, attemptDate, mariaUser.id, tenantId);
    await prisma.attempt.create({ data });
  }
  console.log(`  Maria: ${mariaTotalAttempts} attempts seeded.`);

  // ── Career check-in ──
  await prisma.careerCheckIn.deleteMany({ where: { userId: mariaUser.id } });
  await prisma.careerCheckIn.create({
    data: {
      userId:            mariaUser.id,
      tenantId,
      employmentStatus:  "employed",
      jobTitle:          "Supply Chain Analyst",
      industry:          "Logistics & Supply Chain",
      salaryRange:       "60_75k",
      salaryExact:       62000,
      has401k:           true,
      contribution401kPct: 6,
      currentSavingsRange: "5_15k",
      studentLoanRange:  "10_30k",
      satisfactionScore: 4,
      graduationYear:    2025,
      monthsSinceGrad:   8,
    },
  });
  console.log("  Maria: career check-in seeded.");

  // ── Checklist progress — post_college ──
  const mariaChecklistItems = [
    "401k_enrolled",
    "contribution_set",
    "benefits_reviewed",
    "w4_set",
    "paycheck_review",
    "emergency_3mo",
    "renter_insurance",
  ];
  for (const itemId of mariaChecklistItems) {
    await prisma.checklistProgress.upsert({
      where:  { userId_stage_itemId: { userId: mariaUser.id, stage: "post_college", itemId } },
      update: { done: true },
      create: { userId: mariaUser.id, tenantId, stage: "post_college", itemId, done: true },
    });
  }
  console.log("  Maria: checklist progress seeded.");

  // ── Student skills ──
  await prisma.studentSkill.deleteMany({ where: { userId: mariaUser.id } });
  const mariaSkills = [
    { skill: "Excel",                    category: "technical" },
    { skill: "SQL",                      category: "technical" },
    { skill: "Supply Chain Management",  category: "domain" },
    { skill: "SAP",                      category: "technical" },
    { skill: "Logistics",                category: "domain" },
    { skill: "Data Analysis",            category: "analytical" },
    { skill: "Project Management",       category: "leadership" },
  ];
  for (const s of mariaSkills) {
    await prisma.studentSkill.create({
      data: {
        userId:     mariaUser.id,
        tenantId,
        skill:      s.skill,
        category:   s.category,
        confidence: round2(random(0.72, 0.95)),
        source:     "ai_extracted",
      },
    });
  }
  console.log("  Maria: skills seeded.");

  // ── Interview activity ──
  await prisma.interviewActivity.deleteMany({ where: { userId: mariaUser.id } });
  await prisma.interviewActivity.createMany({
    data: [
      {
        userId:       mariaUser.id,
        tenantId,
        company:      "Amazon Logistics",
        role:         "Supply Chain Coordinator",
        industry:     "Logistics & Supply Chain",
        appliedDate:  daysAgo(TODAY, 260),
        interviewDate: daysAgo(TODAY, 252),
        stage:        "phone_screen",
        outcome:      "rejected",
        notes:        "Rejected after phone screen. Feedback: needed more quantitative examples.",
      },
      {
        userId:       mariaUser.id,
        tenantId,
        company:      "FedEx",
        role:         "Operations Analyst",
        industry:     "Logistics & Supply Chain",
        appliedDate:  daysAgo(TODAY, 320),
        interviewDate: daysAgo(TODAY, 308),
        stage:        "offer",
        outcome:      "declined",
        salaryOffered: 58000,
        notes:        "Offer received but compensation below target. Declined in favor of better opportunity.",
      },
      {
        userId:       mariaUser.id,
        tenantId,
        company:      "Ryder System",
        role:         "Supply Chain Analyst",
        industry:     "Logistics & Supply Chain",
        appliedDate:  daysAgo(TODAY, 290),
        interviewDate: daysAgo(TODAY, 275),
        stage:        "accepted",
        outcome:      "accepted",
        salaryOffered: 62000,
        notes:        "Current role. Accepted offer — great growth path and 401k match.",
      },
    ],
  });
  console.log("  Maria: interview activity seeded.");

  // ────────────────────────────────────────────────────────────────────────────
  // JAMES OKAFOR
  // ────────────────────────────────────────────────────────────────────────────
  console.log("Seeding James Okafor...");

  // ── Aptitude result ──
  await prisma.aptitudeResult.deleteMany({ where: { userId: jamesUser.id } });
  await prisma.aptitudeResult.create({
    data: {
      userId:    jamesUser.id,
      tenantId,
      primary:   "E",
      secondary: "S",
      scores: {
        riasecProfile: "ESC",
        riasecScores: { R: 15, I: 35, A: 42, S: 58, E: 78, C: 50 },
        workValues: {
          achievement:  1,
          independence: 2,
          recognition:  2,
          relationships: 1,
          support:      0,
          conditions:   0,
        },
        entrepreneurProfile: {
          riskTolerance:      72,
          autonomyDrive:      68,
          executionBias:      65,
          sideIncomeInterest: 80,
          overall:            71,
        },
      },
    },
  });

  // ── Practice attempts — 22 sessions over ~4 months ──
  await prisma.attempt.deleteMany({ where: { userId: jamesUser.id, tenantId } });
  const jamesTotalAttempts = 22;
  for (let i = 0; i < jamesTotalAttempts; i++) {
    const daysBack = Math.round(lerp(120, 3, i / Math.max(1, jamesTotalAttempts - 1))) + Math.floor(random(0, 4));
    const attemptDate = daysAgo(TODAY, daysBack);
    const data = buildAttemptData(JAMES_PROFILE, i, jamesTotalAttempts, attemptDate, jamesUser.id, tenantId);
    await prisma.attempt.create({ data });
  }
  console.log(`  James: ${jamesTotalAttempts} attempts seeded.`);

  // ── Checklist progress — during_college ──
  const jamesChecklistItems = [
    "resume",
    "linkedin",
    "internship_apps",
    "advisor_semester",
    "career_fair",
    "gpa_check",
  ];
  for (const itemId of jamesChecklistItems) {
    await prisma.checklistProgress.upsert({
      where:  { userId_stage_itemId: { userId: jamesUser.id, stage: "during_college", itemId } },
      update: { done: true },
      create: { userId: jamesUser.id, tenantId, stage: "during_college", itemId, done: true },
    });
  }
  console.log("  James: checklist progress seeded.");

  // ── Student skills ──
  await prisma.studentSkill.deleteMany({ where: { userId: jamesUser.id } });
  const jamesSkills = [
    { skill: "Financial Modeling", category: "analytical" },
    { skill: "Excel",              category: "technical" },
    { skill: "Python",             category: "technical" },
    { skill: "Bloomberg",          category: "technical" },
    { skill: "Leadership",         category: "leadership" },
    { skill: "Public Speaking",    category: "communication" },
  ];
  for (const s of jamesSkills) {
    await prisma.studentSkill.create({
      data: {
        userId:     jamesUser.id,
        tenantId,
        skill:      s.skill,
        category:   s.category,
        confidence: round2(random(0.70, 0.92)),
        source:     "ai_extracted",
      },
    });
  }
  console.log("  James: skills seeded.");

  // ────────────────────────────────────────────────────────────────────────────
  // PRIYA NAIR
  // ────────────────────────────────────────────────────────────────────────────
  console.log("Seeding Priya Nair...");

  // ── Aptitude result ──
  await prisma.aptitudeResult.deleteMany({ where: { userId: priyaUser.id } });
  await prisma.aptitudeResult.create({
    data: {
      userId:    priyaUser.id,
      tenantId,
      primary:   "I",
      secondary: "A",
      scores: {
        riasecProfile: "IAS",
        riasecScores: { R: 30, I: 82, A: 66, S: 55, E: 28, C: 32 },
        workValues: {
          achievement:  2,
          independence: 3,
          recognition:  1,
          relationships: 1,
          support:      0,
          conditions:   1,
        },
        entrepreneurProfile: {
          riskTolerance:      48,
          autonomyDrive:      74,
          executionBias:      40,
          sideIncomeInterest: 52,
          overall:            52,
        },
      },
    },
  });

  // ── Practice attempts — 8 sessions over ~2 months ──
  await prisma.attempt.deleteMany({ where: { userId: priyaUser.id, tenantId } });
  const priyaTotalAttempts = 8;
  for (let i = 0; i < priyaTotalAttempts; i++) {
    const daysBack = Math.round(lerp(60, 3, i / Math.max(1, priyaTotalAttempts - 1))) + Math.floor(random(0, 3));
    const attemptDate = daysAgo(TODAY, daysBack);
    const data = buildAttemptData(PRIYA_PROFILE, i, priyaTotalAttempts, attemptDate, priyaUser.id, tenantId);
    await prisma.attempt.create({ data });
  }
  console.log(`  Priya: ${priyaTotalAttempts} attempts seeded.`);

  // ── Student skills ──
  await prisma.studentSkill.deleteMany({ where: { userId: priyaUser.id } });
  const priyaSkills = [
    { skill: "Research",          category: "analytical" },
    { skill: "Python",            category: "technical" },
    { skill: "Biology",           category: "domain" },
    { skill: "Statistics",        category: "analytical" },
    { skill: "Academic Writing",  category: "communication" },
  ];
  for (const s of priyaSkills) {
    await prisma.studentSkill.create({
      data: {
        userId:     priyaUser.id,
        tenantId,
        skill:      s.skill,
        category:   s.category,
        confidence: round2(random(0.68, 0.90)),
        source:     "ai_extracted",
      },
    });
  }
  console.log("  Priya: skills seeded.");

  // ────────────────────────────────────────────────────────────────────────────
  console.log("\nDemo seed complete.");
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error("Seed failed:");
  console.error(e);
  process.exit(1);
});
