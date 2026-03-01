import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const started = Date.now();

  try {
    // Fast DB ping (cheap, works with pooler)
    await prisma.$queryRaw`SELECT 1`;

    const ms = Date.now() - started;

    return NextResponse.json(
      {
        ok: true,
        db: "ok",
        ms,
        env: {
          nodeEnv: process.env.NODE_ENV ?? null,
          hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
          hasStripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
          hasStripeWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
          hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
          hasUpstashRedis:
            Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
            Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    const ms = Date.now() - started;

    return NextResponse.json(
      {
        ok: false,
        db: "fail",
        ms,
        error: process.env.NODE_ENV === "production" ? "DB_UNAVAILABLE" : err?.message,
      },
      { status: 503 }
    );
  }
}