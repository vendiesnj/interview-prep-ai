import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

// GET /api/checklist?stage=during_college
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, tenantId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const stage = req.nextUrl.searchParams.get("stage");
  if (!stage) return NextResponse.json({ error: "stage required" }, { status: 400 });

  const [progress, content] = await Promise.all([
    prisma.checklistProgress.findMany({
      where: { userId: user.id, stage },
      select: { itemId: true, done: true, scheduledDate: true, completedAt: true, dueDate: true },
    }),
    user.tenantId
      ? prisma.checklistItemContent.findMany({
          where: { tenantId: user.tenantId, stage },
          select: { itemId: true, body: true, linkHref: true, linkLabel: true },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({ progress, content });
}

// POST /api/checklist  { stage, itemId, done, scheduledDate? }
// Used for toggling done state - writes completedAt when checking, clears when unchecking
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, tenantId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { stage, itemId, done, scheduledDate } = await req.json();
  if (!stage || !itemId || typeof done !== "boolean")
    return NextResponse.json({ error: "stage, itemId, done required" }, { status: 400 });

  const parsedDate = scheduledDate ? new Date(scheduledDate) : undefined;

  // Set completedAt when checking; clear it when unchecking
  const completedAt = done ? new Date() : null;

  await prisma.checklistProgress.upsert({
    where: { userId_stage_itemId: { userId: user.id, stage, itemId } },
    create: {
      userId: user.id,
      tenantId: user.tenantId,
      stage,
      itemId,
      done,
      scheduledDate: parsedDate,
      completedAt,
    },
    update: {
      done,
      completedAt,
      ...(parsedDate !== undefined ? { scheduledDate: parsedDate } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

// PATCH /api/checklist  { stage, itemId, scheduledDate } - schedule only, no done change
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, tenantId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { stage, itemId, scheduledDate } = await req.json();
  if (!stage || !itemId) return NextResponse.json({ error: "stage, itemId required" }, { status: 400 });

  const parsedDate = scheduledDate ? new Date(scheduledDate) : null;

  await prisma.checklistProgress.upsert({
    where: { userId_stage_itemId: { userId: user.id, stage, itemId } },
    create: {
      userId: user.id,
      tenantId: user.tenantId,
      stage,
      itemId,
      done: false,
      scheduledDate: parsedDate ?? undefined,
    },
    update: { scheduledDate: parsedDate },
  });

  return NextResponse.json({ ok: true });
}
