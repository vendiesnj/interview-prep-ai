import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { getAttemptEntitlement } from "@/app/lib/entitlements";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ isAuthed: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ isAuthed: false }, { status: 401 });
  }

  const entitlement = await getAttemptEntitlement(user.id);

  return NextResponse.json(
    {
      isAuthed: true,
      ...entitlement,
    },
    { status: 200 }
  );
}