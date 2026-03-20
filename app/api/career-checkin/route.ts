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
  const {
    employmentStatus,
    jobTitle,
    company,
    industry,
    city,
    state,
    salaryRange,
    graduationYear,
    major,
    satisfactionScore,
    topChallenge,
    checklistItems,
  } = body;

  if (!employmentStatus) {
    return NextResponse.json({ error: "employmentStatus is required" }, { status: 400 });
  }

  const monthsSinceGrad = graduationYear
    ? Math.max(0, Math.round((Date.now() - new Date(`${graduationYear}-06-01`).getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : null;

  const record = await prisma.careerCheckIn.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      employmentStatus,
      jobTitle: jobTitle || null,
      company: company || null,
      industry: industry || null,
      city: city || null,
      state: state || null,
      salaryRange: salaryRange || null,
      graduationYear: graduationYear ? parseInt(graduationYear) : null,
      major: major || null,
      monthsSinceGrad,
      satisfactionScore: satisfactionScore ? parseInt(satisfactionScore) : null,
      topChallenge: topChallenge || null,
      checklistItems: checklistItems || null,
    },
  });

  return NextResponse.json({ success: true, id: record.id });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const checkIns = await prisma.careerCheckIn.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json({ checkIns });
}
