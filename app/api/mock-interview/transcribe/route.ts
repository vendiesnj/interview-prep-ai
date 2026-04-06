import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// POST /api/mock-interview/transcribe
// Accepts multipart: audio (File)
// Returns { transcript, starAnalysis: { situation, task, action, result } }

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const audio = form.get("audio") as File | null;
  if (!audio) return NextResponse.json({ error: "No audio" }, { status: 400 });

  // Transcribe with Whisper
  const transcription = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file: audio,
  });
  const transcript = transcription.text.trim();

  // Analyze STAR completeness
  const starRes = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: `Analyze whether this interview answer contains each STAR component.

Answer: "${transcript}"

Respond with JSON only:
{
  "situation": true/false,
  "task": true/false,
  "action": true/false,
  "result": true/false
}

Be generous - a brief mention counts as present.`,
      },
    ],
    max_tokens: 100,
  });

  const starAnalysis = JSON.parse(starRes.choices[0].message.content ?? "{}");

  return NextResponse.json({ transcript, starAnalysis });
}
