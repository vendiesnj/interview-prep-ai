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
  const envOrigin = process.env.APP_ORIGIN?.trim();
  if (envOrigin) return envOrigin;

  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
  const origin =
    baseUrl?.startsWith("http") ? baseUrl : baseUrl ? `https://${baseUrl}` : "";
  return origin;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  try {
    const ct = (req.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.includes("application/json")) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

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
      select: { id: true, passwordHash: true },
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
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const origin = getOrigin();
    const resetLink = `${origin}/reset-password?token=${token}`;

    logInfo("password_reset_requested", { userId: user.id });

    const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM;

logInfo("password_reset_email_env_check", {
  hasApiKey: Boolean(apiKey),
  hasFrom: Boolean(from),
  fromValue: from ?? null,
});

if (apiKey && from) {
  const resend = new Resend(apiKey);

  const subject = "Reset your Interview Performance Coach password";
  const text = `Reset your password using this link (valid for 1 hour):\n\n${resetLink}\n\nIf you didn't request this, you can ignore this email.`;

  const html = `
<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.5;">
  <h2 style="margin:0 0 12px 0;">Reset your password</h2>
  <p style="margin:0 0 12px 0;">Click the button below to reset your password. This link is valid for 1 hour.</p>
  <p style="margin:18px 0;">
    <a href="${resetLink}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#22d3ee;color:#001018;text-decoration:none;font-weight:800;">
      Reset password
    </a>
  </p>
  <p style="margin:0 0 10px 0;font-size:12px;color:#6b7280;">If the button doesn’t work, paste this link into your browser:</p>
  <p style="margin:0 0 18px 0;font-size:12px;"><a href="${resetLink}">${resetLink}</a></p>
  <p style="margin:0;font-size:12px;color:#6b7280;">If you didn’t request this, you can ignore this email.</p>
</div>`;

  try {
    const sent = await resend.emails.send({
      from,
      to: email,
      subject,
      text,
      html,
    });

    logInfo("password_reset_email_sent", {
      userId: user.id,
      resendId: (sent as any)?.id ?? null,
    });
  } catch (err: any) {
    logError("password_reset_email_failed", err, { userId: user.id });
  }
} else {
  logInfo("password_reset_link_generated_dev_only", { resetLink });
}

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    logError("password_reset_request_error", err);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}