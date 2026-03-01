import OpenAI from "openai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { rateLimitFixedWindow } from "@/app/lib/rateLimit";
import { logInfo, logError } from "@/app/lib/logger";

export const runtime = "nodejs";

// ---- concurrency gate (transcribe) ----
const MAX_CONCURRENT_TRANSCRIBE = 6;
let activeTranscribeJobs = 0;

async function acquireTranscribeSlot() {
  if (activeTranscribeJobs >= MAX_CONCURRENT_TRANSCRIBE) return false;
  activeTranscribeJobs += 1;
  return true;
}

function releaseTranscribeSlot() {
  activeTranscribeJobs = Math.max(0, activeTranscribeJobs - 1);
}

export async function POST(req: Request) {
  // ---- concurrency cap ----
  const slotAcquired = await acquireTranscribeSlot();
  if (!slotAcquired) {
    return new Response(
      JSON.stringify({
        error: "SERVER_BUSY",
        message: "System is under heavy load. Please retry in a few seconds.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const start = Date.now();

  try {
    // ---- auth check ----
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ---- load user + enforce PRO ONLY ----
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, subscriptionStatus: true },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isPro =
      user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing";

    if (!isPro) {
      return new Response(
        JSON.stringify({
          error: "PRO_REQUIRED",
          message: "Upgrade to Pro to use voice transcription.",
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    logInfo("transcribe_request_started", {
      userId: user.id,
    });

    // ---- rate limit (per user + per IP) ----
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const rlUser = await rateLimitFixedWindow({
      key: `transcribe:user:${user.id}`,
      limit: 6,
      windowMs: 60_000,
    });

    const rlIp = await rateLimitFixedWindow({
      key: `transcribe:ip:${ip}`,
      limit: 12,
      windowMs: 60_000,
    });

    const remaining =
      rlUser.ok && rlIp.ok ? Math.min(rlUser.remaining, rlIp.remaining) : 0;

    const resetMs = Math.max(rlUser.resetMs, rlIp.resetMs);

    if (!rlUser.ok || !rlIp.ok) {
      return new Response(
        JSON.stringify({
          error: "RATE_LIMITED",
          message: "Too many transcription requests. Please wait a moment.",
          retryAfterMs: resetMs,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(resetMs / 1000)),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset-Ms": String(resetMs),
          },
        }
      );
    }

    // ---- parse form ----
    const formData = await req.formData();
    const audio = formData.get("audio");
    const durationRaw = formData.get("duration");

    const durationSeconds =
      typeof durationRaw === "string" ? Number(durationRaw) : null;

    if (!audio || !(audio instanceof File)) {
      return new Response(JSON.stringify({ error: "MISSING_AUDIO" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ---- upload size cap ----
    const MAX_AUDIO_BYTES = 12 * 1024 * 1024; // 12MB
    if (audio.size > MAX_AUDIO_BYTES) {
      return new Response(
        JSON.stringify({ error: "AUDIO_TOO_LARGE", maxBytes: MAX_AUDIO_BYTES }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const transcript = await client.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
    });

    logInfo("transcribe_success", {
      userId: user.id,
      durationMs: Date.now() - start,
      durationSeconds,
    });

    return new Response(
      JSON.stringify({ text: transcript.text, durationSeconds }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset-Ms": String(resetMs),
        },
      }
    );
  } catch (err: any) {
    logError("transcribe_error", err);

    const msg =
      process.env.NODE_ENV === "production"
        ? "INTERNAL_ERROR"
        : (err?.message ?? "Unknown error");

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    releaseTranscribeSlot();
  }
}