/**
 * Roosevelt University — Patch Seed
 *
 * Adds to existing Roosevelt data:
 *  - User profile fields (major, graduationYear, targetRole, targetIndustry)
 *  - Networking pitch attempts with distinct scoring (hook, value prop, CTA, pitch_style)
 *  - Public speaking attempts with distinct scoring (structure, presence, vocal variety, delivery_archetype)
 *  - Career check-ins for Aaliyah and Diego
 *  - Financial literacy checklist progress for Marcus and Aaliyah
 *
 * Run after seedRoosevelt.ts:
 *   npx tsx scripts/seedRoosevelt_patch.ts
 */

import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

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

const TODAY = new Date("2026-03-30T12:00:00.000Z");

// ─── Networking pitch content ─────────────────────────────────────────────────

const NETWORKING_QUESTIONS = [
  {
    question: "Deliver your 60-second professional introduction for a finance career fair.",
    transcript: "Hi, I'm Marcus Johnson, a Roosevelt University finance graduate. I spent the last year building financial models at Northern Trust and have a strong background in portfolio analysis and client relations. I'm particularly drawn to wealth management because of the combination of quantitative rigor and client trust. I'd love to hear more about what career paths look like on your team.",
  },
  {
    question: "Pitch yourself to a recruiter at a consulting networking event.",
    transcript: "I'm Aaliyah Washington, graduating from Roosevelt this May with a degree in Business Administration. I've been deeply focused on strategy consulting — I've done two case competitions reaching the regional level, and I've built experience synthesizing complex research into client-ready presentations. I'm actively pursuing analyst roles and would love to learn how your firm approaches early-career development.",
  },
  {
    question: "Give your elevator pitch for a tech internship at a career fair.",
    transcript: "Hey, I'm Diego Reyes, a junior in Computer Science at Roosevelt. I've built full-stack applications in React and Python and I'm most excited by problems at the intersection of tech and real-world workflows. I had a phone screen with Motorola Solutions recently and it reinforced that I want to be in a product-driven environment. What kinds of projects does your intern cohort typically take on?",
  },
  {
    question: "Introduce yourself professionally at a networking reception.",
    transcript: "I'm Sophie Park, a senior studying Psychology with a concentration in organizational behavior. My passion is helping people thrive at work — I've done volunteer recruiting coordination and HR support. I'm targeting people and culture roles at companies that treat employee wellbeing as a strategic priority, not an afterthought.",
  },
];

const PITCH_STYLES = ["storyteller", "data-driven", "connector", "visionary"] as const;

// ─── Public speaking content ──────────────────────────────────────────────────

const PUBLIC_SPEAKING_QUESTIONS = [
  {
    question: "Give a 2-minute presentation on a professional challenge you overcame.",
    transcript: "When I first started at Northern Trust, I was given a data reconciliation project that my manager estimated would take three weeks. I didn't know where to start. I broke the project into daily deliverables, asked for structured feedback at the end of each week, and finished in eleven days. The lesson I took: unfamiliar problems aren't barriers — they're blueprints waiting to be drawn.",
  },
  {
    question: "Deliver a persuasive presentation on why this industry needs you.",
    transcript: "Financial services has a trust problem. Study after study shows that younger investors distrust traditional wealth management because they've never been spoken to in plain language. I've spent my career learning to translate complexity. I don't just build the model — I explain why it matters. The industry doesn't need more analysts who speak to spreadsheets. It needs communicators who speak to people.",
  },
  {
    question: "Present your 5-year career vision to a professional panel.",
    transcript: "In five years, I want to be leading a client portfolio independently — having earned that responsibility through demonstrated results, not just tenure. I want two things from that journey: depth in a domain that matters, and a track record of developing at least one junior colleague. Success for me isn't promotion titles. It's earning the room's trust when I walk in cold.",
  },
  {
    question: "Open a professional presentation on a trend shaping your industry.",
    transcript: "AI is not coming for your job. It is coming for the parts of your job you shouldn't have been doing in the first place — the manual reconciliation, the templated summaries, the low-signal screening. The organizations that will win are those that redirect that freed capacity toward judgment, relationships, and the genuinely hard decisions that algorithms cannot make. The question isn't whether to adopt AI. It's what you do with the time it returns.",
  },
];

const DELIVERY_ARCHETYPES = ["inspirational", "educator", "persuader", "narrator"] as const;

// ─── Attempt builders ─────────────────────────────────────────────────────────

function buildNetworkingAttempt(
  overallBase: number,
  hookBase: number,
  valuePropBase: number,
  ctaBase: number,
  fillersBase: number,
  pitchStyle: typeof PITCH_STYLES[number],
  date: Date,
  userId: string,
  tenantId: string,
  vol: number = 1.8,
) {
  const q = pickRandom(NETWORKING_QUESTIONS);
  const overall = round1(clamp(noise(overallBase, vol), 42, 95));
  const hook    = round1(clamp(noise(hookBase, vol * 0.8), 3, 10));
  const vp      = round1(clamp(noise(valuePropBase, vol * 0.8), 3, 10));
  const cta     = round1(clamp(noise(ctaBase, vol * 0.9), 3, 10));
  const comm    = round1(clamp(noise((hook + vp) / 2, vol * 0.5), 3, 10));
  const conf    = round1(clamp(noise(hookBase * 0.9, vol * 0.5), 3, 10));
  const fillers = round1(clamp(noise(fillersBase, vol * 0.3), 0.2, 6));
  const wpm     = Math.round(clamp(noise(148, vol * 3), 120, 180)); // pitches are faster

  return {
    userId, tenantId,
    ts: date, createdAt: date,
    question: q.question,
    questionCategory: "career_dev" as const,
    evaluationFramework: "networking_pitch",
    transcript: q.transcript,
    score: overall,
    communicationScore: comm,
    confidenceScore: conf,
    wpm,
    inputMethod: "spoken",
    feedback: {
      score: round1(overall / 10),
      communication_score: comm,
      confidence_score: conf,
      hook_score: hook,
      value_prop_score: vp,
      cta_score: cta,
      pitch_style: pitchStyle,
      filler: { per100: fillers },
    },
    prosody: {
      monotone: round1(clamp(noise(3.8, vol * 0.4), 1.5, 7)),
      pitchMean: round1(clamp(noise(185, vol * 2), 130, 260)),
      pitchStd: round1(clamp(noise(28, vol * 1.2), 8, 48)),
      energyMean: round2(clamp(noise(0.15, 0.008), 0.05, 0.25)),
      fillerRate: round2(fillers / 100),
      tempoDynamics: round1(clamp(noise(6.2, vol * 0.4), 2, 9.5)),
    },
    deliveryMetrics: {
      fillersPer100: fillers,
      fillerWordsPerMin: round1(clamp(fillers * random(0.9, 1.3), 0.3, 8)),
      pacingScore: round1(clamp(9 - Math.abs(wpm - 148) / 14, 5, 9.2) * 10),
    },
  };
}

function buildPublicSpeakingAttempt(
  overallBase: number,
  structureBase: number,
  presenceBase: number,
  vocalBase: number,
  fillersBase: number,
  archetype: typeof DELIVERY_ARCHETYPES[number],
  date: Date,
  userId: string,
  tenantId: string,
  vol: number = 1.8,
) {
  const q          = pickRandom(PUBLIC_SPEAKING_QUESTIONS);
  const overall    = round1(clamp(noise(overallBase, vol), 40, 95));
  const structure  = round1(clamp(noise(structureBase, vol * 0.8), 3, 10));
  const presence   = round1(clamp(noise(presenceBase, vol * 0.8), 3, 10));
  const vocal      = round1(clamp(noise(vocalBase, vol * 0.8), 3, 10));
  const comm       = round1(clamp(noise((structure + presence) / 2, vol * 0.5), 3, 10));
  const conf       = round1(clamp(noise(presenceBase * 0.95, vol * 0.5), 3, 10));
  const fillers    = round1(clamp(noise(fillersBase, vol * 0.3), 0.1, 5));
  const wpm        = Math.round(clamp(noise(138, vol * 3), 110, 175));

  return {
    userId, tenantId,
    ts: date, createdAt: date,
    question: q.question,
    questionCategory: "behavioral" as const,
    evaluationFramework: "public_speaking",
    transcript: q.transcript,
    score: overall,
    communicationScore: comm,
    confidenceScore: conf,
    wpm,
    inputMethod: "spoken",
    feedback: {
      score: round1(overall / 10),
      communication_score: comm,
      confidence_score: conf,
      structure_score: structure,
      presence_score: presence,
      vocal_variety_score: vocal,
      delivery_archetype: archetype,
      filler: { per100: fillers },
    },
    prosody: {
      monotone: round1(clamp(noise(3.2, vol * 0.4), 1.2, 7)),
      pitchMean: round1(clamp(noise(192, vol * 2), 130, 270)),
      pitchStd: round1(clamp(noise(34, vol * 1.5), 10, 55)),
      energyMean: round2(clamp(noise(0.16, 0.009), 0.05, 0.26)),
      fillerRate: round2(fillers / 100),
      tempoDynamics: round1(clamp(noise(6.8, vol * 0.4), 2.5, 9.5)),
    },
    deliveryMetrics: {
      fillersPer100: fillers,
      fillerWordsPerMin: round1(clamp(fillers * random(0.85, 1.25), 0.2, 7)),
      pacingScore: round1(clamp(9 - Math.abs(wpm - 138) / 12, 5, 9.2) * 10),
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const { prisma } = await import("../app/lib/prisma");

  const tenant = await prisma.tenant.findUnique({ where: { slug: "roosevelt" } });
  if (!tenant) { console.error("Roosevelt tenant not found. Run setupRoosevelt.ts first."); process.exit(1); }
  const tenantId = tenant.id;

  const [marcus, aaliyah, diego, sophie, jordan] = await Promise.all([
    prisma.user.findUnique({ where: { email: "marcus@roosevelt.edu" } }),
    prisma.user.findUnique({ where: { email: "aaliyah@roosevelt.edu" } }),
    prisma.user.findUnique({ where: { email: "diego@roosevelt.edu" } }),
    prisma.user.findUnique({ where: { email: "sophie@roosevelt.edu" } }),
    prisma.user.findUnique({ where: { email: "jordan@roosevelt.edu" } }),
  ]);
  if (!marcus || !aaliyah || !diego || !sophie || !jordan) {
    console.error("One or more students not found. Run setupRoosevelt.ts first.");
    process.exit(1);
  }

  // ── 1. User profile fields ────────────────────────────────────────────────

  console.log("Patching user profile fields...");
  await Promise.all([
    prisma.user.update({ where: { id: marcus.id },  data: { graduationYear: 2025, major: "Finance", targetRole: "Wealth Management Analyst", targetIndustry: "Financial Services" } }),
    prisma.user.update({ where: { id: aaliyah.id }, data: { graduationYear: 2026, major: "Business Administration", targetRole: "Business Analyst", targetIndustry: "Consulting" } }),
    prisma.user.update({ where: { id: diego.id },   data: { graduationYear: 2027, major: "Computer Science", targetRole: "Software Engineer", targetIndustry: "Technology" } }),
    prisma.user.update({ where: { id: sophie.id },  data: { graduationYear: 2026, major: "Psychology", targetRole: "HR Coordinator", targetIndustry: "Human Resources" } }),
    prisma.user.update({ where: { id: jordan.id },  data: { graduationYear: 2028, major: "Communications", targetRole: null, targetIndustry: null } }),
  ]);
  console.log("  Done.");

  // ── 2. Career check-ins for Aaliyah and Diego ─────────────────────────────

  console.log("Seeding career check-ins for Aaliyah and Diego...");

  await prisma.careerCheckIn.deleteMany({ where: { userId: aaliyah.id } });
  await prisma.careerCheckIn.create({
    data: {
      userId: aaliyah.id, tenantId,
      employmentStatus: "student",
      industry: "Consulting",
      salaryRange: "under_40k",
      graduationYear: 2026,
      major: "Business Administration",
      satisfactionScore: 5,
      topChallenge: "Breaking into consulting without a target-school pedigree",
      has401k: false,
      studentLoanRange: "10_30k",
      currentSavingsRange: "under_5k",
    },
  });

  await prisma.careerCheckIn.deleteMany({ where: { userId: diego.id } });
  await prisma.careerCheckIn.create({
    data: {
      userId: diego.id, tenantId,
      employmentStatus: "student",
      industry: "Technology",
      salaryRange: "under_40k",
      graduationYear: 2027,
      major: "Computer Science",
      satisfactionScore: 4,
      topChallenge: "Standing out in technical interviews without a big-name school brand",
      has401k: false,
      studentLoanRange: "under_10k",
      currentSavingsRange: "under_5k",
    },
  });
  console.log("  Done.");

  // ── 3. Financial literacy checklist for Marcus and Aaliyah ────────────────

  console.log("Seeding financial literacy checklist items...");

  // Marcus: post-grad, has taken real financial steps
  const marcusFinlit = [
    "budget_basics", "income_vs_expense", "emergency_fund_101", "credit_score_basics",
    "student_loans_101", "401k_basics", "401k_match", "tax_filing_101",
    "renter_insurance", "health_insurance_basics", "paycheck_breakdown", "w4_basics",
    "debt_paydown_strategies", "savings_accounts", "compound_interest",
  ];
  for (const itemId of marcusFinlit) {
    await prisma.checklistProgress.upsert({
      where: { userId_stage_itemId: { userId: marcus.id, stage: "finlit_core", itemId } },
      update: { done: true },
      create: { userId: marcus.id, tenantId, stage: "finlit_core", itemId, done: true },
    });
  }

  // Aaliyah: motivated student, completed intro modules
  const aaliyahFinlit = [
    "budget_basics", "income_vs_expense", "emergency_fund_101", "credit_score_basics",
    "student_loans_101", "401k_basics", "tax_filing_101",
  ];
  for (const itemId of aaliyahFinlit) {
    await prisma.checklistProgress.upsert({
      where: { userId_stage_itemId: { userId: aaliyah.id, stage: "finlit_core", itemId } },
      update: { done: true },
      create: { userId: aaliyah.id, tenantId, stage: "finlit_core", itemId, done: true },
    });
  }
  console.log("  Done.");

  // ── 4. Networking pitch attempts ──────────────────────────────────────────

  console.log("Seeding networking pitch attempts...");

  // Marcus — 10 sessions, strong closer, connector style, improving CTA arc
  await prisma.attempt.deleteMany({ where: { userId: marcus.id, tenantId, evaluationFramework: "networking_pitch" } });
  const marcusNetTotal = 10;
  for (let i = 0; i < marcusNetTotal; i++) {
    const t  = i / Math.max(1, marcusNetTotal - 1);
    const dt = daysAgo(TODAY, Math.round(lerp(160, 12, t)) + Math.floor(random(0, 5)));
    await prisma.attempt.create({ data: buildNetworkingAttempt(
      lerp(62, 82, t), lerp(7.0, 8.5, t), lerp(6.2, 8.0, t), lerp(5.5, 7.8, t),
      lerp(3.2, 1.2, t), "connector", dt, marcus.id, tenantId,
    )});
  }

  // Aaliyah — 12 sessions, naturally high performer, visionary storyteller
  await prisma.attempt.deleteMany({ where: { userId: aaliyah.id, tenantId, evaluationFramework: "networking_pitch" } });
  const aaliyahNetTotal = 12;
  for (let i = 0; i < aaliyahNetTotal; i++) {
    const t  = i / Math.max(1, aaliyahNetTotal - 1);
    const dt = daysAgo(TODAY, Math.round(lerp(120, 8, t)) + Math.floor(random(0, 4)));
    await prisma.attempt.create({ data: buildNetworkingAttempt(
      lerp(74, 90, t), lerp(8.0, 9.2, t), lerp(7.5, 9.0, t), lerp(7.0, 8.8, t),
      lerp(1.5, 0.7, t), "visionary", dt, aaliyah.id, tenantId,
    )});
  }

  // Diego — 8 sessions, technical, improving hook significantly
  await prisma.attempt.deleteMany({ where: { userId: diego.id, tenantId, evaluationFramework: "networking_pitch" } });
  const diegoNetTotal = 8;
  for (let i = 0; i < diegoNetTotal; i++) {
    const t  = i / Math.max(1, diegoNetTotal - 1);
    const dt = daysAgo(TODAY, Math.round(lerp(85, 6, t)) + Math.floor(random(0, 4)));
    await prisma.attempt.create({ data: buildNetworkingAttempt(
      lerp(58, 76, t), lerp(5.5, 7.5, t), lerp(6.2, 7.8, t), lerp(5.0, 6.8, t),
      lerp(4.0, 2.0, t), "data-driven", dt, diego.id, tenantId,
    )});
  }

  // Sophie — 6 sessions, warm connector, weak CTA (plateau)
  await prisma.attempt.deleteMany({ where: { userId: sophie.id, tenantId, evaluationFramework: "networking_pitch" } });
  const sophieNetTotal = 6;
  for (let i = 0; i < sophieNetTotal; i++) {
    const t  = i / Math.max(1, sophieNetTotal - 1);
    const dt = daysAgo(TODAY, Math.round(lerp(75, 10, t)) + Math.floor(random(0, 3)));
    await prisma.attempt.create({ data: buildNetworkingAttempt(
      lerp(64, 68, t), lerp(7.2, 7.5, t), lerp(6.8, 7.0, t), lerp(4.8, 5.2, t),
      lerp(2.8, 2.4, t), "storyteller", dt, sophie.id, tenantId,
    )});
  }

  // Jordan — 3 sessions, very early, big opportunity story
  await prisma.attempt.deleteMany({ where: { userId: jordan.id, tenantId, evaluationFramework: "networking_pitch" } });
  for (let i = 0; i < 3; i++) {
    const t  = i / 2;
    const dt = daysAgo(TODAY, Math.round(lerp(40, 8, t)) + Math.floor(random(0, 3)));
    await prisma.attempt.create({ data: buildNetworkingAttempt(
      lerp(44, 56, t), lerp(4.2, 5.5, t), lerp(4.0, 5.2, t), lerp(3.5, 4.5, t),
      lerp(5.8, 4.2, t), "storyteller", dt, jordan.id, tenantId,
    )});
  }

  console.log("  Networking pitch attempts seeded.");

  // ── 5. Public speaking attempts ───────────────────────────────────────────

  console.log("Seeding public speaking attempts...");

  // Marcus — 8 sessions, persuader archetype, strong structure
  await prisma.attempt.deleteMany({ where: { userId: marcus.id, tenantId, evaluationFramework: "public_speaking" } });
  const marcusPSTotal = 8;
  for (let i = 0; i < marcusPSTotal; i++) {
    const t  = i / Math.max(1, marcusPSTotal - 1);
    const dt = daysAgo(TODAY, Math.round(lerp(150, 18, t)) + Math.floor(random(0, 5)));
    await prisma.attempt.create({ data: buildPublicSpeakingAttempt(
      lerp(58, 79, t), lerp(6.5, 8.2, t), lerp(5.8, 7.8, t), lerp(5.5, 7.5, t),
      lerp(2.8, 1.4, t), "persuader", dt, marcus.id, tenantId,
    )});
  }

  // Aaliyah — 10 sessions, inspirational archetype, already excellent
  await prisma.attempt.deleteMany({ where: { userId: aaliyah.id, tenantId, evaluationFramework: "public_speaking" } });
  const aaliyahPSTotal = 10;
  for (let i = 0; i < aaliyahPSTotal; i++) {
    const t  = i / Math.max(1, aaliyahPSTotal - 1);
    const dt = daysAgo(TODAY, Math.round(lerp(110, 10, t)) + Math.floor(random(0, 4)));
    await prisma.attempt.create({ data: buildPublicSpeakingAttempt(
      lerp(76, 91, t), lerp(8.2, 9.4, t), lerp(7.8, 9.0, t), lerp(7.5, 8.8, t),
      lerp(1.2, 0.6, t), "inspirational", dt, aaliyah.id, tenantId,
    )});
  }

  // Diego — 5 sessions, educator archetype, technical explainer
  await prisma.attempt.deleteMany({ where: { userId: diego.id, tenantId, evaluationFramework: "public_speaking" } });
  const diegoPSTotal = 5;
  for (let i = 0; i < diegoPSTotal; i++) {
    const t  = i / Math.max(1, diegoPSTotal - 1);
    const dt = daysAgo(TODAY, Math.round(lerp(70, 10, t)) + Math.floor(random(0, 4)));
    await prisma.attempt.create({ data: buildPublicSpeakingAttempt(
      lerp(60, 75, t), lerp(6.8, 7.8, t), lerp(5.5, 6.8, t), lerp(5.2, 6.5, t),
      lerp(3.5, 2.2, t), "educator", dt, diego.id, tenantId,
    )});
  }

  // Sophie — 4 sessions, narrator archetype, good presence but weak structure
  await prisma.attempt.deleteMany({ where: { userId: sophie.id, tenantId, evaluationFramework: "public_speaking" } });
  const sophiePSTotal = 4;
  for (let i = 0; i < sophiePSTotal; i++) {
    const t  = i / Math.max(1, sophiePSTotal - 1);
    const dt = daysAgo(TODAY, Math.round(lerp(60, 12, t)) + Math.floor(random(0, 3)));
    await prisma.attempt.create({ data: buildPublicSpeakingAttempt(
      lerp(64, 68, t), lerp(5.5, 6.0, t), lerp(7.2, 7.5, t), lerp(6.0, 6.4, t),
      lerp(2.5, 2.2, t), "narrator", dt, sophie.id, tenantId,
    )});
  }

  // Jordan — 2 sessions only (very early)
  await prisma.attempt.deleteMany({ where: { userId: jordan.id, tenantId, evaluationFramework: "public_speaking" } });
  for (let i = 0; i < 2; i++) {
    const dt = daysAgo(TODAY, 30 - i * 12);
    await prisma.attempt.create({ data: buildPublicSpeakingAttempt(
      lerp(42, 54, i), lerp(4.0, 5.2, i), lerp(4.5, 5.5, i), lerp(3.8, 4.8, i),
      lerp(6.0, 4.5, i), "narrator", dt, jordan.id, tenantId,
    )});
  }

  console.log("  Public speaking attempts seeded.");

  console.log("\n✓ Roosevelt patch complete.");
  console.log("  Added: profile fields, networking + public speaking attempts, career check-ins, finlit progress.");
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error("Patch failed:", e);
  process.exit(1);
});
