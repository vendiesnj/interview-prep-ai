import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { computeSessionDimensions } from "@/lib/scenario-bank";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const sessions = await prisma.instinctSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ sessions });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, tenantId: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const { responses } = body as {
    responses: Array<{ scenarioId: string; choiceIndex: number }>;
  };

  if (!Array.isArray(responses) || responses.length === 0) {
    return NextResponse.json({ error: "responses required" }, { status: 400 });
  }

  const dimensions = computeSessionDimensions(responses);
  const scenariosPlayed = responses.map((r) => r.scenarioId);
  const xpEarned = responses.length * 30 + (responses.length >= 10 ? 50 : 0); // bonus for completing full session

  const record = await prisma.instinctSession.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      scenariosPlayed,
      responses,
      dimensions,
      xpEarned,
    },
  });

  return NextResponse.json({ session: record, dimensions, xpEarned });
}
