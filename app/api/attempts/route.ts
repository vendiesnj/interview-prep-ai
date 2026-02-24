// app/api/attempts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/app/lib/prisma";
import { getAttemptEntitlement } from "@/app/lib/entitlements";
import { rateLimitFixedWindow } from "@/app/lib/rateLimit";

export const runtime = "nodejs";

type Body = {
  ts: number;
  question: string;
  transcript: string;
  inputMethod?: "spoken" | "pasted";
  wpm?: number | null;
  prosody?: any | null;
  feedback?: any | null;

  score?: number | null;
  communication_score?: number | null;
  confidence_score?: number | null;

  focusGoal?: string | null;
  jobDesc?: string | null;
  audioId?: string | null;
  durationSeconds?: number | null;
};

async function requireUserId(req: NextRequest): Promise<string | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const email = token?.email as string | undefined;
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function GET(req: NextRequest) {
  try {
const userId = await requireUserId(req);
if (!userId) {
  return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
}


    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "50") || 50, 200);

    const attempts: any[] = await prisma.attempt.findMany({
      where: { userId, deletedAt: null },
      orderBy: { ts: "desc" },
      take: limit,
      select: {
        id: true,
        ts: true,
        question: true,
        transcript: true,
        inputMethod: true,
        score: true,
        feedback: true,
        wpm: true,
        prosody: true,
      },
    });

    // Match your SessionsPage Attempt shape
    const mapped = attempts.map((a: any) => ({
      id: a.id,
      ts: a.ts.getTime(),
      question: a.question,
      inputMethod: (a.inputMethod as "spoken" | "pasted" | undefined) ?? undefined,
      score: a.score ?? (a.feedback as any)?.score ?? null,
      feedback: a.feedback as any,
      prosody: a.prosody as any,
    }));

    const ent = await getAttemptEntitlement(userId);

return NextResponse.json({ attempts: mapped, entitlement: ent }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "ATTEMPT_LIST_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    const ip =
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  req.headers.get("x-real-ip") ??
  null;

const userAgent = req.headers.get("user-agent") ?? null;


       // Rate limit before doing any real work (prevents cost spikes + abuse)
    const rl = await rateLimitFixedWindow({
      key: `attempt_create:${userId}`,
      limit: 20,
      windowMs: 60_000,
    });
    
    

    if (!rl.ok) {
await prisma.auditLog
  .create({
    data: {
      userId,
      action: "attempt.rate_limited",
      ip,
      userAgent,
      meta: { resetMs: rl.resetMs },
    },
  })
  .catch(() => {});

  return new NextResponse(
    JSON.stringify({ error: "RATE_LIMITED", resetMs: rl.resetMs }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(rl.resetMs / 1000)),
      },
    }
  );
}

    
    const body = (await req.json()) as Body;

    if (!body?.question || !body?.transcript || typeof body.ts !== "number") {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
    }

    // Basic request-size validation (prevents abuse + cost spikes)
if (body.question.length > 600) {
  return NextResponse.json({ error: "QUESTION_TOO_LONG" }, { status: 413 });
}

if (body.transcript.length > 8000) {
  return NextResponse.json({ error: "TRANSCRIPT_TOO_LONG" }, { status: 413 });
}

if (typeof body.jobDesc === "string" && body.jobDesc.length > 12000) {
  return NextResponse.json({ error: "JOBDESC_TOO_LONG" }, { status: 413 });
}

    const result = await prisma.$transaction(
  async (tx) => {
    // Lock the user row to prevent concurrent "free attempt" bypass.
// Prisma doesn't expose FOR UPDATE on findUnique, so use a raw query.
const rows = await tx.$queryRaw<
  Array<{ subscriptionStatus: string | null; freeAttemptCap: number | null }>
>`SELECT "subscriptionStatus", "freeAttemptCap" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;

const user = rows[0] ?? null;

    const isPro = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";
    const cap = user?.freeAttemptCap ?? 3;

    if (!isPro) {
      const used = await tx.attempt.count({
        where: { userId, deletedAt: null },
      });

      if (used >= cap) {
        return {
          ok: false as const,
          status: 402,
          payload: { error: "FREE_LIMIT_REACHED", remaining: 0 },
        };
      }
    }

    const attempt = await tx.attempt.create({
      data: {
        userId,
        ts: new Date(body.ts),
        question: body.question,
        transcript: body.transcript,
        inputMethod: body.inputMethod,

        wpm: typeof body.wpm === "number" ? Math.round(body.wpm) : null,
        prosody: body.prosody ?? null,
        feedback: body.feedback ?? null,

        score: typeof body.score === "number" ? Math.round(body.score) : null,
        communicationScore:
          typeof body.communication_score === "number"
            ? Math.round(body.communication_score)
            : null,
        confidenceScore:
          typeof body.confidence_score === "number"
            ? Math.round(body.confidence_score)
            : null,

        focusGoal: body.focusGoal ?? null,
        jobDesc: body.jobDesc ?? null,
        audioId: body.audioId ?? null,
        durationSeconds:
          typeof body.durationSeconds === "number" ? body.durationSeconds : null,
      },
      select: { id: true },
    });

    // Compute entitlement response without an extra round trip
    if (isPro) {
      return {
  ok: true as const,
  status: 200,
  payload: {
    id: attempt.id,
    entitlement: { allowed: true, isPro: true, cap: null, used: 0, remaining: null },
  },
};
    }

    const usedAfter = await tx.attempt.count({
  where: { userId, deletedAt: null },
});
const remainingAfter = Math.max(0, cap - usedAfter);

return {
  ok: true as const,
  status: 200,
  payload: {
    id: attempt.id,
    entitlement: {
      allowed: remainingAfter > 0,
      isPro: false,
      cap,
      used: usedAfter,
      remaining: remainingAfter,
    },
  },
};
  },
  {
    // Helps prevent race conditions at the DB level under concurrency
    isolationLevel: "Serializable",
  }
);

if (result.ok && result.status === 200) {
  await prisma.auditLog.create({
    data: {
      userId,
      action: "attempt.created",
      ip,
      userAgent,
      meta: {
        attemptId: (result.payload as any)?.id,
        inputMethod: body.inputMethod ?? null,
        score: typeof body.score === "number" ? body.score : null,
        ts: body.ts,
      },
    },
  });
}
else if (!result.ok && (result.payload as any)?.error === "FREE_LIMIT_REACHED") {
  await prisma.auditLog
    .create({
      data: {
        userId,
        action: "attempt.blocked_free_cap",
        ip,
        userAgent,
        meta: { ts: body.ts },
      },
    })
    .catch(() => {});
}


return NextResponse.json(result.payload, { status: result.status });
    
  } catch (err: any) {
    return NextResponse.json(
      { error: "ATTEMPT_CREATE_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}