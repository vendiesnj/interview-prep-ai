import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function DELETE(req: Request, context: Ctx) {
  try {
    const { id } = await Promise.resolve(context.params); // ✅ works in both envs

    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    if (!id) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    await prisma.attempt.updateMany({
      where: { id, userId: user.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;

    const userAgent = req.headers.get("user-agent") ?? null;

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "attempt.deleted",
        ip,
        userAgent,
        meta: { attemptId: id },
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "ATTEMPT_DELETE_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}