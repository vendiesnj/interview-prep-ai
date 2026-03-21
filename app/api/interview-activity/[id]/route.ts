// app/api/interview-activity/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    if (!id) return NextResponse.json({ error: "BAD_REQUEST", message: "id is required" }, { status: 400 });

    // Verify ownership
    const existing = await prisma.interviewActivity.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const body = await req.json();

    const { company, role, industry, appliedDate, interviewDate, stage, outcome, salaryOffered, notes } = body;

    const updated = await prisma.interviewActivity.update({
      where: { id },
      data: {
        ...(company !== undefined && { company: company.trim() }),
        ...(role !== undefined && { role: role.trim() }),
        ...(industry !== undefined && { industry: industry?.trim() ?? null }),
        ...(appliedDate !== undefined && { appliedDate: appliedDate ? new Date(appliedDate) : null }),
        ...(interviewDate !== undefined && { interviewDate: interviewDate ? new Date(interviewDate) : null }),
        ...(stage !== undefined && { stage }),
        ...(outcome !== undefined && { outcome: outcome ?? null }),
        ...(salaryOffered !== undefined && { salaryOffered: typeof salaryOffered === "number" ? salaryOffered : null }),
        ...(notes !== undefined && { notes: notes?.trim() ?? null }),
      },
    });

    return NextResponse.json({ activity: updated }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "UPDATE_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
