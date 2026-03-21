import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

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
  const { primary, secondary, scores } = body;

  if (!primary || !secondary || !scores) {
    return NextResponse.json({ error: "primary, secondary, and scores are required" }, { status: 400 });
  }

  const result = await prisma.aptitudeResult.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      primary,
      secondary,
      scores,
    },
  });

  return NextResponse.json({ id: result.id });
}
