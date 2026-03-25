import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { randomUUID } from "crypto";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = randomUUID();

  return NextResponse.json({
    sessionId,
    studentId: (session!.user as any).id,
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await prisma.browserSession.findMany({
    where: { studentId: (session!.user as any).id },
    orderBy: { startedAt: "desc" },
    take: 10,
    include: {
      urlVisits: { orderBy: { enteredAt: "asc" }, take: 50 },
      screenshots: { orderBy: { takenAt: "desc" }, take: 5 },
    },
  });

  return NextResponse.json({ sessions });
}
