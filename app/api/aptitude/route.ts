import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

// POST /api/aptitude - save RIASEC aptitude result
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, tenantId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const { primary, secondary, riasecProfile, riasecScores, workValues, entrepreneurProfile } = body;

  if (!primary) {
    return NextResponse.json({ error: "primary is required" }, { status: 400 });
  }

  const result = await prisma.aptitudeResult.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      primary,
      secondary: secondary ?? primary,
      scores: {
        riasecProfile: riasecProfile ?? primary,
        riasecScores: riasecScores ?? {},
        workValues: workValues ?? {},
        entrepreneurProfile: entrepreneurProfile ?? {},
      },
    },
  });

  return NextResponse.json({ id: result.id });
}
