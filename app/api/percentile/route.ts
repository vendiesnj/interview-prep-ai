// app/api/percentile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scoreParam = searchParams.get("score");

    if (!scoreParam) {
      return NextResponse.json({ error: "MISSING_SCORE" }, { status: 400 });
    }

    const score = Number(scoreParam);

    if (Number.isNaN(score)) {
      return NextResponse.json({ error: "INVALID_SCORE" }, { status: 400 });
    }

    const scores = await prisma.attempt.findMany({
      where: {
        score: { not: null },
        deletedAt: null,
      },
      select: { score: true },
    });

    if (scores.length === 0) {
      return NextResponse.json({ percentile: null });
    }

    const values = scores
      .map((s) => s.score as number)
      .sort((a, b) => a - b);

    const countBelow = values.filter((v) => v <= score).length;

    const percentile = countBelow / values.length;

    return NextResponse.json({
      percentile,
      totalSamples: values.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "PERCENTILE_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}