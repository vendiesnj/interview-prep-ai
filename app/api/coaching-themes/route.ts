import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface CoachingTheme {
  type: "strength" | "improvement";
  theme: string;
  frequency: number;
  description: string;
  exampleQuote: string;
}

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch up to 30 most recent attempts that have feedback
  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
      deletedAt: null,
      NOT: { feedback: { equals: Prisma.AnyNull } },
    },
    select: {
      id: true,
      feedback: true,
      questionCategory: true,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  if (attempts.length < 3) {
    return NextResponse.json({ themes: [], insufficientData: true });
  }

  const feedbackSummaries = attempts
    .map((a, i) => {
      const feedbackStr =
        typeof a.feedback === "string"
          ? a.feedback
          : JSON.stringify(a.feedback);
      return `[Attempt ${i + 1}${a.questionCategory ? ` - ${a.questionCategory}` : ""}]\n${feedbackStr}`;
    })
    .join("\n\n---\n\n");

  const prompt = `You are a career coach. Analyze these interview feedback summaries and identify the 3-5 most recurring themes - both strengths and areas for improvement.

FEEDBACK SUMMARIES:
${feedbackSummaries}

Return JSON with this exact structure:
{
  "themes": [
    {
      "type": "<'strength' or 'improvement'>",
      "theme": "<concise theme name, e.g. 'Clear Structured Responses'>",
      "frequency": <number of attempts where this theme appeared>,
      "description": "<1-2 sentence description of this pattern across the attempts>",
      "exampleQuote": "<short illustrative quote or paraphrase from the feedback>"
    }
  ]
}

Identify 3-5 themes total (mix of strengths and improvements). Return only valid JSON, no markdown.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { themes?: CoachingTheme[] };
    const themes: CoachingTheme[] = Array.isArray(parsed.themes)
      ? parsed.themes
      : [];

    return NextResponse.json({ themes });
  } catch (err) {
    console.error("coaching-themes error", err);
    return NextResponse.json(
      { error: "Theme analysis failed" },
      { status: 500 }
    );
  }
}
