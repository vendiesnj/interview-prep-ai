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
  if (activeTranscribeJobs >= MAX_CONCURRENT_TRANSCRIBE) {
    return false;
  }
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
      return new Response("Unauthorized", { status: 401 });
    }

    logInfo("transcribe_request_started", {
  email,
});

    // ---- rate limit (stricter than feedback) ----
    const rate = await rateLimitFixedWindow({
      key: `rl:transcribe:${email}`,
      limit: 3,
      windowMs: 60_000,
    });

    if (!rate.ok) {
      return new Response(
        JSON.stringify({
          error: "RATE_LIMITED",
          message: "Too many transcription requests. Please wait a moment.",
          retryAfterMs: rate.resetMs,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(rate.resetMs / 1000)),
          },
        }
      );
    }

    const formData = await req.formData();
    const audio = formData.get("audio");
    const durationRaw = formData.get("duration");

    const durationSeconds =
      typeof durationRaw === "string" ? Number(durationRaw) : null;

    if (!audio || !(audio instanceof File)) {
      return new Response(
        JSON.stringify({ error: "Missing audio file." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
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
  email,
  durationMs: Date.now() - start,
  durationSeconds,
});

    return new Response(
      JSON.stringify({ text: transcript.text, durationSeconds }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
 } catch (err: any) {
  logError("transcribe_error", err);

  return new Response(
    JSON.stringify({ error: err?.message ?? "Unknown error" }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
  
  finally {
    releaseTranscribeSlot();
  }
}
