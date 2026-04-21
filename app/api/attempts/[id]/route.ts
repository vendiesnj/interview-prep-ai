import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const attempt = await prisma.attempt.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!attempt) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ attempt });
  } catch (err: any) {
    return NextResponse.json({ error: "FAILED", message: err?.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ✅ Next 16 expects params as Promise

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

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "ATTEMPT_DELETE_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}