import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;
    const question = formData.get("question") as string | null;
    const optionsRaw = formData.get("options") as string | null;

    if (!audio || !question || !optionsRaw) {
      return NextResponse.json({ error: "audio, question, options required" }, { status: 400 });
    }

    const options: Array<{ label: string; cat: string }> = JSON.parse(optionsRaw);

    // Step 1: Transcribe
    const transcription = await client.audio.transcriptions.create({
      model: "whisper-1",
      file: audio,
      language: "en",
    });

    const transcript = transcription.text.trim();

    if (!transcript || transcript.split(" ").length < 3) {
      return NextResponse.json({ error: "NO_SPEECH", transcript: "" });
    }

    // Step 2: Score against archetypes
    const optionList = options
      .map((o, i) => `${String.fromCharCode(65 + i)} (${o.cat}): ${o.label}`)
      .join("\n");

    const scoreResponse = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 120,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You analyze spoken responses to career personality questions and determine which archetype they best align with.
Archetypes: A=Analyst, B=Builder (engineering/design), C=Creator, H=Helper, L=Leader, M=Communicator, T=Technician (skilled trades: electrician, plumber, HVAC, welder, auto/diesel tech, machinist, avionics).
Return JSON: {"category": "A"|"B"|"C"|"H"|"L"|"M"|"T", "confidence": 0-1, "reasoning": "one sentence"}`,
        },
        {
          role: "user",
          content: `Question: ${question}\n\nResponse options:\n${optionList}\n\nUser said: "${transcript}"\n\nWhich archetype does this response align with most?`,
        },
      ],
    });

    const raw = scoreResponse.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      transcript,
      category: parsed.category ?? null,
      confidence: parsed.confidence ?? 0.5,
      reasoning: parsed.reasoning ?? "",
    });
  } catch (err: any) {
    console.error("[aptitude/voice-score]", err);
    return NextResponse.json({ error: "scoring_failed" }, { status: 500 });
  }
}
