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
  roleType: "finance" | "operations" | "research" | "consulting";
};

type PersonaSeed = {
  key: string;
  label: string;
  overallStart: number; // 0-100
  overallEnd: number; // 0-100
  communicationStart: number; // 0-10
  communicationEnd: number; // 0-10
  confidenceStart: number; // 0-10
  confidenceEnd: number; // 0-10
  fillersStart: number; // per 100 words
  fillersEnd: number;
  monotoneStart: number; // 0-10, higher = worse
  monotoneEnd: number;
  wpmStart: number;
  wpmEnd: number;
  closingStart: number; // 0-10
  closingEnd: number;
  volatility: number;
};

const QUESTIONS: QuestionSeed[] = [
  {
    question: "Tell me about a time you led a team through a challenge.",
    category: "behavioral",
  },
  {
    question: "Describe a situation where you had to handle conflict.",
    category: "behavioral",
  },
  {
    question: "Tell me about a time you failed and what you learned.",
    category: "behavioral",
  },
  {
    question: "Describe a time you improved a process.",
    category: "behavioral",
  },
  {
    question: "Tell me about a difficult decision you had to make.",
    category: "behavioral",
  },
  {
    question:
      "Walk me through how you would prioritize competing operational constraints.",
    category: "role_specific",
  },
  {
    question: "How would you explain a recommendation to senior stakeholders?",
    category: "role_specific",
  },
  {
    question: "Explain a technical process to a non-technical audience.",
    category: "technical",
  },
  {
    question: "Walk me through a time you used data to influence a decision.",
    category: "role_specific",
  },
  {
    question: "Describe a time you balanced speed vs quality.",
    category: "behavioral",
  },
];

const ROLES: RoleSeed[] = [
  {
    title: "Financial Analyst",
    company: "Goldman Sachs",
    roleType: "finance",
  },
  {
    title: "Supply Chain Analyst",
    company: "Apple",
    roleType: "operations",
  },
  {
    title: "Research Associate",
    company: "Pfizer",
    roleType: "research",
  },
  {
    title: "Strategy Consultant",
    company: "Deloitte",
    roleType: "consulting",
  },
];

const PERSONAS: PersonaSeed[] = [
  {
    key: "struggling_improver",
    label: "Struggling but improving",
    overallStart: 52,
    overallEnd: 76,
    communicationStart: 5.1,
    communicationEnd: 7.4,
    confidenceStart: 4.9,
    confidenceEnd: 7.2,
    fillersStart: 4.8,
    fillersEnd: 2.0,
    monotoneStart: 7.2,
    monotoneEnd: 5.0,
    wpmStart: 98,
    wpmEnd: 128,
    closingStart: 4.8,
    closingEnd: 7.2,
    volatility: 3.4,
  },
  {
    key: "average_plateau",
    label: "Average but plateaued",
    overallStart: 64,
    overallEnd: 69,
    communicationStart: 6.4,
    communicationEnd: 6.9,
    confidenceStart: 6.1,
    confidenceEnd: 6.7,
    fillersStart: 3.0,
    fillersEnd: 2.5,
    monotoneStart: 5.8,
    monotoneEnd: 5.5,
    wpmStart: 122,
    wpmEnd: 130,
    closingStart: 6.0,
    closingEnd: 6.5,
    volatility: 2.8,
  },
  {
    key: "strong_comm_weak_structure",
    label: "Strong communicator, weak structure",
    overallStart: 66,
    overallEnd: 75,
    communicationStart: 7.4,
    communicationEnd: 8.3,
    confidenceStart: 7.0,
    confidenceEnd: 8.0,
    fillersStart: 2.1,
    fillersEnd: 1.3,
    monotoneStart: 4.8,
    monotoneEnd: 3.8,
    wpmStart: 128,
    wpmEnd: 138,
    closingStart: 5.1,
    closingEnd: 6.3,
    volatility: 2.6,
  },
  {
    key: "analytical_flat",
    label: "Analytical but flat delivery",
    overallStart: 68,
    overallEnd: 78,
    communicationStart: 6.8,
    communicationEnd: 7.7,
    confidenceStart: 6.3,
    confidenceEnd: 7.2,
    fillersStart: 2.2,
    fillersEnd: 1.6,
    monotoneStart: 7.4,
    monotoneEnd: 6.1,
    wpmStart: 118,
    wpmEnd: 132,
    closingStart: 6.2,
    closingEnd: 7.3,
    volatility: 2.2,
  },
  {
    key: "high_performer",
    label: "High performer",
    overallStart: 78,
    overallEnd: 87,
    communicationStart: 8.0,
    communicationEnd: 8.9,
    confidenceStart: 7.8,
    confidenceEnd: 8.7,
    fillersStart: 1.6,
    fillersEnd: 0.8,
    monotoneStart: 4.6,
    monotoneEnd: 3.2,
    wpmStart: 126,
    wpmEnd: 142,
    closingStart: 7.3,
    closingEnd: 8.6,
    volatility: 1.8,
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
  const {
    overall100,
    communication10,
    confidence10,
    fillersPer100,
    closingImpact10,
    category,
  } = args;

  const structureLift =
    category === "behavioral"
      ? 0
      : category === "technical"
      ? 0.3
      : 0.2;

  return {
    score: round1(overall100 / 10),
    communication_score: round1(communication10),
    confidence_score: round1(confidence10),
    filler: {
      per100: round1(fillersPer100),
    },
    star: {
      situation: round1(clamp(random(5.8, 8.5) + structureLift, 1, 10)),
      task: round1(clamp(random(5.8, 8.5) + structureLift, 1, 10)),
      action: round1(clamp(random(6.0, 8.9) + structureLift, 1, 10)),
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

  console.log("Clearing existing attempts...");
  await prisma.attempt.deleteMany({});

  console.log("Seeding demo attempts...");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      tenantId: true,
      email: true,
      name: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (users.length === 0) {
    console.log("No users found.");
    await prisma.$disconnect();
    return;
  }

  const now = new Date();

  for (let userIndex = 0; userIndex < users.length; userIndex++) {
    const user = users[userIndex];
    const persona = PERSONAS[userIndex % PERSONAS.length];
    const role = ROLES[userIndex % ROLES.length];

    const attemptsForUser = 18 + (userIndex % 3) * 4;

    for (let i = 0; i < attemptsForUser; i++) {
      const t =
        attemptsForUser === 1 ? 1 : i / Math.max(1, attemptsForUser - 1);

      const q = pickRandom(QUESTIONS);

      const overallScore = round1(
        clamp(
          withNoise(
            lerp(persona.overallStart, persona.overallEnd, t),
            persona.volatility
          ),
          45,
          92
        )
      );

      const communicationScore = round1(
        clamp(
          withNoise(
            lerp(persona.communicationStart, persona.communicationEnd, t),
            persona.volatility * 0.12
          ),
          4.2,
          9.3
        )
      );

      const confidenceScore = round1(
        clamp(
          withNoise(
            lerp(persona.confidenceStart, persona.confidenceEnd, t),
            persona.volatility * 0.12
          ),
          4.0,
          9.2
        )
      );

      const fillersPer100 = round1(
        clamp(
          withNoise(
            lerp(persona.fillersStart, persona.fillersEnd, t),
            persona.volatility * 0.18
          ),
          0.4,
          6.0
        )
      );

      const monotoneScore = round1(
        clamp(
          withNoise(
            lerp(persona.monotoneStart, persona.monotoneEnd, t),
            persona.volatility * 0.12
          ),
          2.2,
          8.4
        )
      );

      const wpm = Math.round(
        clamp(
          withNoise(
            lerp(persona.wpmStart, persona.wpmEnd, t),
            persona.volatility * 2
          ),
          90,
          170
        )
      );

      const closingImpact = round1(
        clamp(
          withNoise(
            lerp(persona.closingStart, persona.closingEnd, t),
            persona.volatility * 0.15
          ),
          4.5,
          9.0
        )
      );

      const attemptDate = daysAgo(
        now,
        Math.max(0, attemptsForUser - i) * 2 + Math.floor(random(0, 2))
      );

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

          prosody: {
            monotoneScore,
            pitchMean: round1(random(165, 230)),
            pitchStd: round1(random(12, 28)),
            pitchRange: round1(random(80, 160)),
            energyMean: round1(random(0.08, 0.18)),
            energyStd: round1(random(0.02, 0.06)),
            energyVariation: round1(
              clamp(8.5 - monotoneScore + random(-0.6, 0.6), 3, 9)
            ),
            tempo: round1(clamp(wpm + random(-8, 10), 88, 170)),
            tempoDynamics: round1(random(4.2, 7.6)),
          },

          deliveryMetrics: {
            fillersPer100,
            fillerWordsPerMin: round1(
              clamp(fillersPer100 * random(0.85, 1.35), 1.2, 8.5)
            ),
            pacingScore: round1(
              clamp(9 - Math.abs(wpm - 132) / 12, 4.5, 9.2) * 10
            ),
            acoustics: {
              monotoneScore,
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