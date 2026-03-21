import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

async function getAdminUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, tenantId: true },
  });
  if (!user?.tenantId) return null;

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: user.tenantId, userId: user.id } },
    select: { role: true },
  });

  const isAdmin = membership?.role === "tenant_admin" ||
    membership?.role === "career_coach" ||
    membership?.role === "super_admin";

  return isAdmin ? user : null;
}

// PATCH /api/admin/roster - update a student's membership status
export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { userId, status } = body;

  if (!userId || !["active", "disabled"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Prevent admins from disabling themselves
  if (userId === admin.id) {
    return NextResponse.json({ error: "Cannot modify your own account" }, { status: 400 });
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: admin.tenantId!, userId } },
  });

  if (!membership) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (membership.role !== "student") {
    return NextResponse.json({ error: "Can only modify student accounts" }, { status: 400 });
  }

  await prisma.tenantMembership.update({
    where: { tenantId_userId: { tenantId: admin.tenantId!, userId } },
    data: { status },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: status === "disabled" ? "roster.student.disabled" : "roster.student.reactivated",
      meta: { targetUserId: userId },
    },
  });

  return NextResponse.json({ ok: true });
}
