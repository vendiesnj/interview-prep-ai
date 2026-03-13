import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  try {
        const result = await prisma.attempt.deleteMany({
      where: {
        questionSource: "seeded",
      },
    });

    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (err: any) {
    return NextResponse.json(
      { error: "CLEAR_SEEDED_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}