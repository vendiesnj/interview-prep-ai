import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const runtime = "nodejs";

// GET — list assignments for the tenant
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session!.user as any).tenantId;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const assignments = await prisma.assignment.findMany({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ assignments });
}

// POST — create assignment (admin/coach only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session!.user as any).tenantId;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const body = await req.json();
  const { title, description, dueDate, questionCategories, evaluationFramework, minAttempts } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const assignment = await prisma.assignment.create({
    data: {
      tenantId,
      createdByUserId: (session!.user as any).id,
      title: title.trim(),
      description: description?.trim() || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      questionCategories: questionCategories ?? [],
      evaluationFramework: evaluationFramework || null,
      minAttempts: minAttempts ?? 5,
    },
  });

  return NextResponse.json({ assignment });
}
