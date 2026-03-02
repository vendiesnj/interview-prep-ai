import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { rateLimitFixedWindow } from "@/app/lib/rateLimit";
import { logInfo } from "@/app/lib/logger";

export const runtime = "nodejs";

function getClientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  try {
    // Must be logged in (Google or otherwise) to set a password
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const email = (token?.email as string | undefined)?.toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Basic content-type guard
    const ct = (req.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.includes("application/json")) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as { password?: string } | null;
    const password = body?.password?.trim() ?? "";

    if (password.length < 8 || password.length > 200) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    // Rate limit: per IP + per email
    const rlIp = await rateLimitFixedWindow({
      key: `pwset:ip:${ip}`,
      limit: 10,
      windowMs: 60_000,
    });

    const rlEmail = await rateLimitFixedWindow({
      key: `pwset:email:${email}`,
      limit: 5,
      windowMs: 60_000,
    });

    if (!rlIp.ok || !rlEmail.ok) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Idempotent: if already has a password, treat as success
    if (user.passwordHash) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const newHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    logInfo("password_set", { userId: user.id });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}