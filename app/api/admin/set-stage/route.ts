import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, tenantId: true },
  });

  if (!adminUser?.tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 403 });
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: adminUser.tenantId, userId: adminUser.id } },
    select: { role: true },
  });

  const isAdmin = membership?.role === "tenant_admin" ||
    membership?.role === "career_coach" ||
    membership?.role === "super_admin";

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, stage } = await req.json() as { userId: string; stage: string | null };

  // Verify the target user is in the admin's tenant
  const targetMembership = await prisma.tenantMembership.findFirst({
    where: { tenantId: adminUser.tenantId, userId },
  });

  if (!targetMembership) {
    return NextResponse.json({ error: "User not found in tenant" }, { status: 404 });
  }

  const validStages = ["pre_college", "during_college", "post_college", null];
  if (!validStages.includes(stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { demoPersona: stage },
  });

  return NextResponse.json({ ok: true });
}
