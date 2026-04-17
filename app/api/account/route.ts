import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const allowed = ["demoPersona", "onboardingComplete", "careerStage", "communicationGoals"] as const;
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "NO_VALID_FIELDS" }, { status: 400 });
    }

    await prisma.user.update({ where: { email }, data: updates });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "UPDATE_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, stripeCustomerId: true },
    });

    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    // Safety: require a confirmation string in body
    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== "DELETE_MY_ACCOUNT") {
      return NextResponse.json({ error: "CONFIRMATION_REQUIRED" }, { status: 400 });
    }

    await prisma.$transaction([
  prisma.auditLog.deleteMany({ where: { userId: user.id } }),
  prisma.attempt.deleteMany({ where: { userId: user.id } }),
]);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "ACCOUNT_DELETE_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}