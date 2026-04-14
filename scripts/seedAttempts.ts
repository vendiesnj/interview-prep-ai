import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

type QuestionSeed = {
  question: string;
  category: "behavioral" | "technical" | "role_specific";
};

type RoleSeed = {
  title: string;
  company: string;
  roleType: "finance" | "operations" | "research" | "consulting" | "general";
};

type PersonaSeed = {
  key: string;
  label: string;
  // Content scores
  overallStart: number;
  overallEnd: number;
  communicationStart: number;
  communicationEnd: number;
  confidenceStart: number;
  confidenceEnd: number;
  fillersStart: number;
  fillersEnd: number;
  wpmStart: number;
  wpmEnd: number;
  closingStart: number;
  closingEnd: number;
  volatility: number;
  // Acoustic fingerprint — each persona has a distinct vocal character
  monotoneStart: number;     // 0-10, higher = more flat/worse
  monotoneEnd: number;
  pitchMeanBase: number;     // Hz — voice register (higher = lighter voice)
  pitchStdStart: number;     // Hz std dev — how much pitch varies
  pitchStdEnd: number;
  pitchRangeStart: number;   // Hz total range
  pitchRangeEnd: number;
  energyMeanBase: number;    // RMS energy baseline (0.05–0.20)
  energyStdStart: number;    // energy variation (higher = more dynamic)
  energyStdEnd: number;
  energyVariationStart: number; // 0-10 score
  energyVariationEnd: number;
  tempoDynamicsStart: number;   // 0-10, rhythm variability
  tempoDynamicsEnd: number;
};

const QUESTIONS: QuestionSeed[] = [
  { question: "Tell me about a time you led a team through a challenge.", category: "behavioral" },
  { question: "Describe a situation where you had to handle conflict.", category: "behavioral" },
  { question: "Tell me about a time you failed and what you learned.", category: "behavioral" },
  { question: "Describe a time you improved a process.", category: "behavioral" },
  { question: "Tell me about a difficult decision you had to make.", category: "behavioral" },
  { question: "Walk me through how you would prioritize competing operational constraints.", category: "role_specific" },
  { question: "How would you explain a recommendation to senior stakeholders?", category: "role_specific" },
  { question: "Explain a technical process to a non-technical audience.", category: "technical" },
  { question: "Walk me through a time you used data to influence a decision.", category: "role_specific" },
  { question: "Describe a time you balanced speed vs quality.", category: "behavioral" },
];

const ROLES: RoleSeed[] = [
  { title: "Medical Office Coordinator", company: "Regional Health System", roleType: "operations" },
  { title: "IT Support Specialist", company: "County Government", roleType: "operations" },
  { title: "Business Office Administrator", company: "Community Credit Union", roleType: "finance" },
  { title: "Early Childhood Program Coordinator", company: "County School District", roleType: "general" },
];

const PERSONAS: PersonaSeed[] = [
  {
    // Maria Santos — nervous beginner who improves dramatically
    // Voice: high-pitched, starts flat and rushed, gains expressiveness over time
    key: "struggling_improver",
    label: "Struggling but improving",
    overallStart: 34,        overallEnd: 68,
    communicationStart: 3.8, communicationEnd: 7.0,
    confidenceStart: 3.5,   confidenceEnd: 6.8,
    fillersStart: 5.8,       fillersEnd: 2.0,
    wpmStart: 98,            wpmEnd: 128,
    closingStart: 3.2,       closingEnd: 6.8,
    volatility: 3.4,
    // Acoustic: starts very monotone and low energy, improves significantly
    monotoneStart: 7.8,      monotoneEnd: 4.8,
    pitchMeanBase: 218,      // higher register — younger/anxious voice
    pitchStdStart: 8,        pitchStdEnd: 22,   // starts nearly flat, gains variation
    pitchRangeStart: 55,     pitchRangeEnd: 130,
    energyMeanBase: 0.09,    // quieter baseline
    energyStdStart: 0.012,   energyStdEnd: 0.038,
    energyVariationStart: 2.0, energyVariationEnd: 6.5,
    tempoDynamicsStart: 2.5,   tempoDynamicsEnd: 5.8,
  },
  {
    // James Okafor — competent but stuck, never breaks through
    // Voice: mid-register, consistently moderate — not bad enough to fix, not good enough to shine
    key: "average_plateau",
    label: "Average but plateaued",
    overallStart: 48,        overallEnd: 58,
    communicationStart: 5.0, communicationEnd: 5.6,
    confidenceStart: 4.8,   confidenceEnd: 5.4,
    fillersStart: 3.0,       fillersEnd: 2.5,
    wpmStart: 122,           wpmEnd: 130,
    closingStart: 4.8,       closingEnd: 5.5,
    volatility: 2.8,
    // Acoustic: "forever moderate" — pitch and energy barely change across all attempts
    monotoneStart: 5.8,      monotoneEnd: 5.5,
    pitchMeanBase: 178,
    pitchStdStart: 14,       pitchStdEnd: 16,   // almost no change — he's stuck
    pitchRangeStart: 85,     pitchRangeEnd: 95,
    energyMeanBase: 0.12,
    energyStdStart: 0.022,   energyStdEnd: 0.026,
    energyVariationStart: 4.2, energyVariationEnd: 4.8,
    tempoDynamicsStart: 4.0,   tempoDynamicsEnd: 4.5,
  },
  {
    // Priya Nair — naturally expressive voice, weak STAR structure
    // Voice: warm, dynamic, good energy — the delivery is her strength
    key: "strong_comm_weak_structure",
    label: "Strong communicator, weak structure",
    overallStart: 50,        overallEnd: 72,
    communicationStart: 7.4, communicationEnd: 8.3,
    confidenceStart: 7.0,   confidenceEnd: 8.0,
    fillersStart: 2.1,       fillersEnd: 1.3,
    wpmStart: 128,           wpmEnd: 138,
    closingStart: 3.8,       closingEnd: 5.8,
    volatility: 2.6,
    // Acoustic: expressive from day 1, maintains and refines
    monotoneStart: 4.2,      monotoneEnd: 3.1,
    pitchMeanBase: 205,
    pitchStdStart: 26,       pitchStdEnd: 32,   // already expressive, gets better
    pitchRangeStart: 140,    pitchRangeEnd: 175,
    energyMeanBase: 0.15,    // naturally louder/more present
    energyStdStart: 0.045,   energyStdEnd: 0.058,
    energyVariationStart: 7.2, energyVariationEnd: 8.5,
    tempoDynamicsStart: 6.2,   tempoDynamicsEnd: 7.4,
  },
  {
    // Derek Williams — analytical thinker, robotically flat delivery
    // Voice: low register, very consistent (flat), controlled pace
    key: "analytical_flat",
    label: "Analytical but flat delivery",
    overallStart: 54,        overallEnd: 74,
    communicationStart: 5.8, communicationEnd: 7.2,
    confidenceStart: 5.4,   confidenceEnd: 6.8,
    fillersStart: 2.2,       fillersEnd: 1.6,
    wpmStart: 118,           wpmEnd: 132,
    closingStart: 5.2,       closingEnd: 7.0,
    volatility: 2.2,
    // Acoustic: persistently flat — improving content scores but voice barely changes
    monotoneStart: 7.8,      monotoneEnd: 6.8,  // improves slightly but stays flat
    pitchMeanBase: 152,      // lower register — deliberate, analytical
    pitchStdStart: 7,        pitchStdEnd: 11,   // minimal pitch variation throughout
    pitchRangeStart: 45,     pitchRangeEnd: 65,
    energyMeanBase: 0.11,
    energyStdStart: 0.014,   energyStdEnd: 0.020,
    energyVariationStart: 2.8, energyVariationEnd: 3.8,
    tempoDynamicsStart: 3.5,   tempoDynamicsEnd: 4.2,
  },
  {
    // Ashley Chen — high performer, polished delivery across the board
    // Voice: confident, dynamic, well-paced from the start
    key: "high_performer",
    label: "High performer",
    overallStart: 72,        overallEnd: 88,
    communicationStart: 8.0, communicationEnd: 8.9,
    confidenceStart: 7.8,   confidenceEnd: 8.7,
    fillersStart: 1.6,       fillersEnd: 0.8,
    wpmStart: 126,           wpmEnd: 142,
    closingStart: 7.0,       closingEnd: 8.8,
    volatility: 1.8,
    // Acoustic: strong and expressive from the start, fine-tuning over time
    monotoneStart: 3.8,      monotoneEnd: 2.6,
    pitchMeanBase: 192,
    pitchStdStart: 28,       pitchStdEnd: 35,   // expressive, gets more refined
    pitchRangeStart: 155,    pitchRangeEnd: 190,
    energyMeanBase: 0.16,
    energyStdStart: 0.052,   energyStdEnd: 0.068,
    energyVariationStart: 8.0, energyVariationEnd: 9.2,
    tempoDynamicsStart: 6.8,   tempoDynamicsEnd: 8.2,
  },
];

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

function buildFeedback(args: {
  overall100: number;
  communication10: number;
  confidence10: number;
  fillersPer100: number;
  closingImpact10: number;
  category: QuestionSeed["category"];
}) {
  const { overall100, communication10, confidence10, fillersPer100, closingImpact10, category } = args;

  const structureLift =
    category === "behavioral" ? 0 : category === "technical" ? 0.3 : 0.2;

  return {
    score: round1(overall100 / 10),
    communication_score: round1(communication10),
    confidence_score: round1(confidence10),
    filler: { per100: round1(fillersPer100) },
    star: {
      situation: round1(clamp(random(3.0, 9.2) + structureLift, 1, 10)),
      task: round1(clamp(random(3.0, 9.2) + structureLift, 1, 10)),
      action: round1(clamp(random(3.5, 9.5) + structureLift, 1, 10)),
      result: round1(closingImpact10),
    },
  };
}

function daysAgo(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

async function run() {
  console.log("DATABASE_URL loaded:", !!process.env.DATABASE_URL);

  const { prisma } = await import("../app/lib/prisma");

  // Scope to demo tenant only — never touch real users' data
  const demoTenant = await prisma.tenant.findUnique({ where: { slug: "demo-college" } });
  if (!demoTenant) {
    console.error("Demo tenant not found. Run `npx tsx scripts/setupDemo.ts` first.");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("Clearing existing demo attempts...");
  await prisma.attempt.deleteMany({ where: { tenantId: demoTenant.id } });

  console.log("Seeding demo attempts...");

  // Only seed student accounts — skip admin
  const adminMemberships = await prisma.tenantMembership.findMany({
    where: { tenantId: demoTenant.id, role: "tenant_admin" },
    select: { userId: true },
  });
  const adminIds = new Set(adminMemberships.map((m) => m.userId));

  const users = await prisma.user.findMany({
    where: { tenantId: demoTenant.id },
    select: { id: true, tenantId: true, email: true, name: true },
    orderBy: { createdAt: "asc" },
  }).then((all) => all.filter((u) => !adminIds.has(u.id)));

  if (users.length === 0) {
    console.log("No users found.");
    await prisma.$disconnect();
    return;
  }

  const now = new Date();

  // Pin personas to specific students for a consistent demo narrative
  const personaByEmail: Record<string, string> = {
    "maria@demo-college.edu":  "struggling_improver",       // Beat 2: "started at 52, now 76"
    "james@demo-college.edu":  "average_plateau",           // Beat 2: "stuck at 66"
    "priya@demo-college.edu":  "strong_comm_weak_structure",
    "derek@demo-college.edu":  "analytical_flat",
    "ashley@demo-college.edu": "high_performer",
  };

  for (let userIndex = 0; userIndex < users.length; userIndex++) {
    const user = users[userIndex];
    const personaKey = (user.email ? personaByEmail[user.email] : undefined) ?? PERSONAS[userIndex % PERSONAS.length].key;
    const persona = PERSONAS.find((p) => p.key === personaKey) ?? PERSONAS[userIndex % PERSONAS.length];
    const role = ROLES[userIndex % ROLES.length];

    const attemptsForUser = 18 + (userIndex % 3) * 4;
    console.log(`  ${user.name} (${persona.key}): ${attemptsForUser} attempts`);

    for (let i = 0; i < attemptsForUser; i++) {
      const t = attemptsForUser === 1 ? 1 : i / Math.max(1, attemptsForUser - 1);
      const q = pickRandom(QUESTIONS);
      const v = persona.volatility;

      const overallScore = round1(clamp(withNoise(lerp(persona.overallStart, persona.overallEnd, t), v), 28, 95));
      const communicationScore = round1(clamp(withNoise(lerp(persona.communicationStart, persona.communicationEnd, t), v * 0.12), 4.2, 9.3));
      const confidenceScore = round1(clamp(withNoise(lerp(persona.confidenceStart, persona.confidenceEnd, t), v * 0.12), 4.0, 9.2));
      const fillersPer100 = round1(clamp(withNoise(lerp(persona.fillersStart, persona.fillersEnd, t), v * 0.18), 0.4, 6.0));
      const wpm = Math.round(clamp(withNoise(lerp(persona.wpmStart, persona.wpmEnd, t), v * 2), 90, 170));
      const closingImpact = round1(clamp(withNoise(lerp(persona.closingStart, persona.closingEnd, t), v * 0.15), 2.0, 9.5));

      // Per-persona acoustic values that evolve over time
      const monotoneScore = round1(clamp(withNoise(lerp(persona.monotoneStart, persona.monotoneEnd, t), v * 0.08), 1.5, 9.2));
      const pitchStd = round1(clamp(withNoise(lerp(persona.pitchStdStart, persona.pitchStdEnd, t), v * 0.6), 4, 45));
      const pitchRange = round1(clamp(withNoise(lerp(persona.pitchRangeStart, persona.pitchRangeEnd, t), v * 2), 30, 220));
      const pitchMean = round1(clamp(withNoise(persona.pitchMeanBase, v * 1.5), 120, 260));
      const energyStd = round2(clamp(withNoise(lerp(persona.energyStdStart, persona.energyStdEnd, t), v * 0.002), 0.008, 0.08));
      const energyVariation = round1(clamp(withNoise(lerp(persona.energyVariationStart, persona.energyVariationEnd, t), v * 0.15), 1.0, 9.8));
      const energyMean = round2(clamp(withNoise(persona.energyMeanBase, v * 0.004), 0.05, 0.22));
      const tempoDynamics = round1(clamp(withNoise(lerp(persona.tempoDynamicsStart, persona.tempoDynamicsEnd, t), v * 0.2), 1.5, 9.5));
      const tempo = round1(clamp(wpm + random(-6, 8), 85, 175));

      const attemptDate = daysAgo(now, Math.max(0, attemptsForUser - i) * 2 + Math.floor(random(0, 2)));

      await prisma.attempt.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId ?? null,
          ts: attemptDate,
          question: q.question,
          questionCategory: q.category,
          transcript: `${persona.label} seeded transcript for ${q.category} interview practice.`,
          score: overallScore,
          communicationScore,
          confidenceScore,
          wpm,
          inputMethod: "spoken",

          jobProfileTitle: role.title,
          jobProfileCompany: role.company,
          jobProfileRoleType: role.roleType,

          feedback: buildFeedback({
            overall100: overallScore,
            communication10: communicationScore,
            confidence10: confidenceScore,
            fillersPer100,
            closingImpact10: closingImpact,
            category: q.category,
          }),

          // Full prosody — matches exactly what the acoustics service returns
          prosody: {
            monotoneScore,
            pitchMean,
            pitchStd,
            pitchRange,
            energyMean,
            energyStd,
            energyVariation,
            tempo,
            tempoDynamics,
            durationSec: round1(random(60, 180)),
          },

          // deliveryMetrics mirrors what voice-metrics/route.ts stores
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
        },
      });
    }
  }

  console.log("Seed complete.");
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error("Seed failed:");
  console.error(e);
  process.exit(1);
});
