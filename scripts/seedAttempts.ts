import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../app/lib/prisma";

const questions = [
  "Tell me about a time you led a team through a challenge.",
  "Describe a situation where you had to handle conflict.",
  "Tell me about a time you failed and what you learned.",
  "Describe a time you improved a process.",
  "Tell me about a difficult decision you had to make.",
  "Describe a time you had to learn something quickly.",
  "Tell me about a time you influenced someone without authority.",
  "Describe a time you had multiple deadlines.",
];

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

async function run() {
  console.log("Seeding demo attempts...");
  console.log("DATABASE_URL loaded:", !!process.env.DATABASE_URL);

  const users = await prisma.user.findMany({
    select: { id: true },
  });

  if (users.length === 0) {
    console.log("No users found.");
    return;
  }

  const attemptsToCreate = 300;

  for (let i = 0; i < attemptsToCreate; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const question = questions[Math.floor(Math.random() * questions.length)];

    const score = random(55, 95);

    await prisma.attempt.create({
      data: {
        userId: user.id,
        ts: new Date(),
        question,
        transcript: "Sample seeded interview response for percentile generation.",
        score: Math.round(score * 10) / 10,
        communicationScore: Math.round(random(55, 95) * 10) / 10,
        confidenceScore: Math.round(random(55, 95) * 10) / 10,
        wpm: Math.round(random(110, 165)),
        deliveryMetrics: {
          fillerWordsPerMin: random(2, 8),
          pacingScore: random(60, 95),
        },
      },
    });
  }

  console.log("Seed complete.");
}

run()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });