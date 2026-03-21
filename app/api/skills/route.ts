import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import type { StudentSkill } from "@prisma/client";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const skills = await prisma.studentSkill.findMany({
    where: { userId },
    orderBy: { confidence: "desc" },
  });

  const byCategory = skills.reduce<Record<string, StudentSkill[]>>(
    (acc, skill) => {
      const key = skill.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(skill);
      return acc;
    },
    {}
  );

  return NextResponse.json({ byCategory, total: skills.length });
}
