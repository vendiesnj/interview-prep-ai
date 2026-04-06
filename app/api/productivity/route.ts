import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { computeProductivity } from "@/app/lib/productivity";

export const runtime = "nodejs";

// GET /api/productivity?userId=xxx  (userId optional - defaults to self)
// Admins can pass ?userId= to fetch for any student in their tenant
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const self = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, tenantId: true, role: true },
  });
  if (!self) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const requestedId = req.nextUrl.searchParams.get("userId");
  const isAdmin = self.role === "tenant_admin";

  // Determine whose data to fetch
  let targetId = self.id;
  if (requestedId && requestedId !== self.id) {
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    targetId = requestedId;
  }

  const [tasks, checklist] = await Promise.all([
    prisma.task.findMany({
      where: { userId: targetId },
      select: { scheduledAt: true, completedAt: true, dueDate: true, createdAt: true },
    }),
    prisma.checklistProgress.findMany({
      where: { userId: targetId },
      select: { scheduledDate: true, dueDate: true, completedAt: true, done: true },
    }),
  ]);

  const result = computeProductivity({ tasks, checklist });
  return NextResponse.json(result);
}
