import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { rateLimitFixedWindow } from "@/app/lib/rateLimit";
import crypto from "crypto";
import { logInfo, logError } from "@/app/lib/logger";
import { Resend } from "resend";

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

function getOrigin() {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;

  // Prefer NEXTAUTH_URL like: https://interviewperformancecoach.com
  if (baseUrl?.startsWith("http")) return baseUrl;

  // VERCEL_URL is often like: yourapp.vercel.app (no protocol)
  if (baseUrl) return `https://${baseUrl}`;

  return "";
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  try {
    // Content-type guard
    const ct = (req.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.includes("application/json")) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Size guard
    const cl = req.headers.get("content-length");
    if (cl && Number(cl) > 5_000) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

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

    // Create token, store ONLY hash
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

    const origin = getOrigin();
    const resetLink = `${origin}/reset-password?token=${token}`;

    logInfo("password_reset_requested", { userId: user.id });

    // ---- SEND EMAIL (Resend) ----
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;

    if (!resendKey || !from) {
      // Don’t leak details; but do log internally for debugging
      logError("password_reset_email_missing_env", new Error("Missing RESEND_API_KEY or RESEND_FROM"), {
        hasResendKey: !!resendKey,
        hasResendFrom: !!from,
      });

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const resend = new Resend(resendKey);

    await resend.emails.send({
      from,
      to: email,
      subject: "Reset your Interview Performance Coach password",
      html: `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; line-height: 1.5;">
          <h2 style="margin: 0 0 12px;">Reset your password</h2>
          <p style="margin: 0 0 12px;">
            Click the button below to choose a new password. This link expires in 1 hour.
          </p>
          <p style="margin: 16px 0;">
            <a href="${resetLink}"
               style="display:inline-block;padding:10px 14px;border-radius:10px;
                      background:#06b6d4;color:#021018;font-weight:700;text-decoration:none;">
              Reset password
            </a>
          </p>
          <p style="margin: 16px 0 0; color: #6b7280; font-size: 13px;">
            If you didn’t request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    logInfo("password_reset_email_sent", { userId: user.id });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    // Still return ok=true to avoid leaking details
    logError("password_reset_request_error", err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}