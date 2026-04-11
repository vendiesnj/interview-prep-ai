import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// POST /api/mock-interview/transcribe
// Accepts multipart: audio (File)
// Returns { transcript }
// STAR analysis is handled by the main route's conversational model.

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const audio = form.get("audio") as File | null;
  if (!audio) return NextResponse.json({ error: "No audio" }, { status: 400 });

  const transcription = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file: audio,
    language: "en",
  });

  return NextResponse.json({ transcript: transcription.text.trim() });
}
