import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      graduationYear: true,
      major: true,
      targetRole: true,
      targetIndustry: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  let body: {
    graduationYear?: number;
    major?: string;
    targetRole?: string;
    targetIndustry?: string;
    name?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.graduationYear !== undefined)
    data.graduationYear = body.graduationYear ? Number(body.graduationYear) : null;
  if (body.major !== undefined) data.major = body.major;
  if (body.targetRole !== undefined) data.targetRole = body.targetRole;
  if (body.targetIndustry !== undefined) data.targetIndustry = body.targetIndustry;

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      name: true,
      email: true,
      graduationYear: true,
      major: true,
      targetRole: true,
      targetIndustry: true,
    },
  });

  return NextResponse.json(updated);
}
