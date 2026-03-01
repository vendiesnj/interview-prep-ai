import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    const token = (body?.token ?? "").trim();
    const password = (body?.password ?? "").trim();

    if (!token || !password || password.length < 8) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const tokenHash = sha256(token);
    const now = new Date();

    // Make the token single-use atomically:
    // 1) Find token
    // 2) In a transaction, "claim" it by setting usedAt only if it's unused + unexpired
    // 3) Only then update the user's password
    const result = await prisma.$transaction(async (tx) => {
      const rec = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, usedAt: true, expiresAt: true },
      });

      if (!rec || rec.usedAt || rec.expiresAt < now) {
        return { ok: false as const };
      }

      // Claim token: update only if still unused and unexpired
      const claimed = await tx.passwordResetToken.updateMany({
        where: {
          id: rec.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (claimed.count !== 1) {
        return { ok: false as const };
      }

      const newHash = await bcrypt.hash(password, 12);

      await tx.user.update({
        where: { id: rec.userId },
        data: { passwordHash: newHash },
      });

      return { ok: true as const };
    });

    if (!result.ok) {
      return NextResponse.json({ error: "Token invalid or expired." }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}