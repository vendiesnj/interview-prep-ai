import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: NextRequest) {
  // Support both session auth (browser) and token auth (extension)
  const authHeader = req.headers.get("authorization");
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    // Extension token auth - validate via session token stored in DB
    const token = authHeader.slice(7);
    const dbSession = await prisma.session.findUnique({
      where: { sessionToken: token },
      select: { userId: true, expires: true },
    });
    if (dbSession && dbSession.expires > new Date()) {
      userId = dbSession.userId;
    }
  } else {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      userId = user?.id ?? null;
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    action: "task_complete" | "session_data";
    taskId?: string;
    stage?: string;
    url?: string;
    timestamp?: string;
    visitedDomains?: string[];
    totalTimeSeconds?: number;
    topSites?: Array<{ domain: string; seconds: number }>;
  };

  if (body.action === "task_complete" && body.taskId && body.stage) {
    // Mark the checklist item as done
    await prisma.checklistProgress.upsert({
      where: { userId_stage_itemId: { userId, stage: body.stage, itemId: body.taskId } },
      create: {
        userId,
        stage: body.stage,
        itemId: body.taskId,
        done: true,
      },
      update: { done: true },
    });

    // Log to audit
    await prisma.auditLog.create({
      data: {
        userId,
        action: "extension_task_complete",
        meta: { taskId: body.taskId, stage: body.stage, url: body.url },
      },
    });

    return NextResponse.json({ ok: true, completed: body.taskId });
  }

  if (body.action === "session_data") {
    await prisma.auditLog.create({
      data: {
        userId,
        action: "extension_session_data",
        meta: {
          visitedDomains: body.visitedDomains,
          totalTimeSeconds: body.totalTimeSeconds,
          topSites: body.topSites,
        },
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  // Extension calls this to get the user's pending tasks
  const authHeader = req.headers.get("authorization");
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const dbSession = await prisma.session.findUnique({
      where: { sessionToken: token },
      select: { userId: true, expires: true },
    });
    if (dbSession && dbSession.expires > new Date()) {
      userId = dbSession.userId;
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { demoPersona: true, name: true },
  });

  const completedItems = await prisma.checklistProgress.findMany({
    where: { userId, done: true },
    select: { itemId: true, stage: true },
  });

  return NextResponse.json({
    stage: user?.demoPersona ?? null,
    name: user?.name ?? null,
    completedItems,
  });
}
