import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ExtractedSkill {
  skill: string;
  category:
    | "technical"
    | "communication"
    | "leadership"
    | "analytical"
    | "interpersonal"
    | "domain";
  confidence: number;
  evidenceQuote: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { attemptIds } = body as { attemptIds?: string[] };

  // Fetch attempts: specific IDs or up to 20 most recent
  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(attemptIds && attemptIds.length > 0
        ? { id: { in: attemptIds } }
        : {}),
    },
    select: {
      id: true,
      transcript: true,
      questionCategory: true,
    },
    orderBy: { createdAt: "desc" },
    take: attemptIds && attemptIds.length > 0 ? undefined : 20,
  });

  if (attempts.length === 0) {
    const total = await prisma.studentSkill.count({ where: { userId } });
    return NextResponse.json({ extracted: 0, total });
  }

  const transcriptSummaries = attempts
    .map(
      (a, i) =>
        `[Attempt ${i + 1}${a.questionCategory ? ` - ${a.questionCategory}` : ""}]\n${a.transcript}`
    )
    .join("\n\n---\n\n");

  const prompt = `You are an expert career coach analyzing interview transcripts to identify demonstrated skills.

Analyze the following interview transcripts and extract concrete skills the student demonstrated. Focus on specific, observable behaviors and competencies.

TRANSCRIPTS:
${transcriptSummaries}

Return JSON with this exact structure:
{
  "skills": [
    {
      "skill": "<concise skill name, e.g. 'Data-Driven Decision Making'>",
      "category": "<one of: technical | communication | leadership | analytical | interpersonal | domain>",
      "confidence": <number between 0 and 1>,
      "evidenceQuote": "<short direct quote or paraphrase from the transcript that demonstrates this skill>"
    }
  ]
}

Extract only skills that are clearly evidenced in the transcripts. Return only valid JSON, no markdown.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { skills?: ExtractedSkill[] };
    const skills: ExtractedSkill[] = Array.isArray(parsed.skills)
      ? parsed.skills
      : [];

    const attemptIdList = attempts.map((a) => a.id);

    // Upsert each extracted skill
    for (const extracted of skills) {
      const existing = await prisma.studentSkill.findUnique({
        where: { userId_skill: { userId, skill: extracted.skill } },
      });

      if (existing) {
        // Average old and new confidence; merge attemptIds without duplicates
        const newConfidence = (existing.confidence + extracted.confidence) / 2;
        const mergedAttemptIds = Array.from(
          new Set([...existing.attemptIds, ...attemptIdList])
        );

        await prisma.studentSkill.update({
          where: { userId_skill: { userId, skill: extracted.skill } },
          data: {
            confidence: newConfidence,
            attemptIds: mergedAttemptIds,
            category: extracted.category,
          },
        });
      } else {
        await prisma.studentSkill.create({
          data: {
            userId,
            skill: extracted.skill,
            category: extracted.category,
            confidence: extracted.confidence,
            attemptIds: attemptIdList,
            source: "ai_extracted",
          },
        });
      }
    }

    const total = await prisma.studentSkill.count({ where: { userId } });

    return NextResponse.json({ extracted: skills.length, total });
  } catch (err) {
    console.error("skills/extract error", err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
