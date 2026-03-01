// app/lib/authServer.ts
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/app/lib/prisma";

export type AuthedUser = { userId: string; email: string };

export async function requireUser(req: NextRequest): Promise<AuthedUser> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const email = (token?.email as string | undefined) ?? null;
  if (!email) throw new Error("UNAUTHORIZED");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user?.id) throw new Error("UNAUTHORIZED");
  return { userId: user.id, email };
}

export function getClientIp(req: Request | NextRequest) {
  const h = (req as any).headers;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;
  return ip ?? "unknown";
}