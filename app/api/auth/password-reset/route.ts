import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { rateLimitFixedWindow } from "@/app/lib/rateLimit";
import crypto from "crypto";
import { logInfo } from "@/app/lib/logger";

export const runtime = "nodejs";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

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
    // Content-type guard
    const ct = req.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Size guard (basic)
    const cl = req.headers.get("content-length");
    if (cl && Number(cl) > 5_000) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const body = (await req.json()) as { email?: string };
    const email = (body?.email ?? "").trim().toLowerCase();

    // Always return ok=true to avoid account enumeration
    if (!email || email.length > 320) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Rate limit: per email + per IP
    const rlEmail = await rateLimitFixedWindow({
      key: `pwreset:email:${email}`,
      limit: 3,
      windowMs: 60_000,
    });

    const rlIp = await rateLimitFixedWindow({
      key: `pwreset:ip:${ip}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!rlEmail.ok || !rlIp.ok) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });

    // If user doesn't exist or doesn't have password auth, still return ok=true
    if (!user?.id || !user.passwordHash) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Create a token, store ONLY hash
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
    const origin =
      baseUrl?.startsWith("http") ? baseUrl : baseUrl ? `https://${baseUrl}` : "";

    const resetLink = `${origin}/reset-password?token=${token}`;

    // TODO: send email via Resend (Step 3). For now log the link safely.
    logInfo("password_reset_requested", {
      userId: user.id,
      // logger redacts email anyway, but don't include it
    });
    logInfo("password_reset_link_generated", { resetLink });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    // Still return ok=true to avoid leaking details
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}