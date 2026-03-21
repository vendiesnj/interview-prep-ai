// app/api/interview-activity/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

async function getAuthedUser(req?: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, tenantId: true },
  });
  if (!user) return null;

  return user;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const activities = await prisma.interviewActivity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ activities }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "FETCH_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const body = await req.json();

    const { company, role, industry, appliedDate, interviewDate, stage, outcome, salaryOffered, notes } = body;

    if (!company || typeof company !== "string" || !company.trim()) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "company is required" }, { status: 400 });
    }
    if (!role || typeof role !== "string" || !role.trim()) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "role is required" }, { status: 400 });
    }

    const activity = await prisma.interviewActivity.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId ?? null,
        company: company.trim(),
        role: role.trim(),
        industry: industry?.trim() ?? null,
        appliedDate: appliedDate ? new Date(appliedDate) : null,
        interviewDate: interviewDate ? new Date(interviewDate) : null,
        stage: stage ?? "applied",
        outcome: outcome ?? null,
        salaryOffered: typeof salaryOffered === "number" ? salaryOffered : null,
        notes: notes?.trim() ?? null,
      },
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "CREATE_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "BAD_REQUEST", message: "id is required" }, { status: 400 });

    // Verify ownership before deleting
    const existing = await prisma.interviewActivity.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    await prisma.interviewActivity.delete({ where: { id } });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "DELETE_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
