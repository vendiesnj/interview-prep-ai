import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import OpenAI from "openai";

export const runtime = "nodejs";

export type WarmupDrill = {
  id: string;
  text: string;
  target: string;      // short label, e.g. "Plosive consonants"
  focus: string;       // coaching cue, e.g. "Crisp P and B sounds"
  difficulty: "easy" | "medium" | "hard";
  phonemeGroup: string; // plosives | sibilants | fricatives | vowels | clusters | pitch
};

type MetricsInput = {
  pronunciationScore?: number | null;
  fluencyScore?: number | null;
  prosodyScore?: number | null;
  monotoneScore?: number | null;   // 0-10, higher = more monotone
  energyVariation?: number | null; // 0-3+, lower = flat
  mumbleIndex?: number | null;     // 0-100, higher = more mumbling
  mispronunciationRate?: number | null;
  wpm?: number | null;
};

function buildWeakAreas(m: MetricsInput): string[] {
  const areas: string[] = [];
  if (m.pronunciationScore !== null && m.pronunciationScore !== undefined && m.pronunciationScore < 75)
    areas.push("pronunciation accuracy");
  if (m.fluencyScore !== null && m.fluencyScore !== undefined && m.fluencyScore < 70)
    areas.push("fluency and natural flow");
  if (m.monotoneScore !== null && m.monotoneScore !== undefined && m.monotoneScore > 6)
    areas.push("pitch variety (currently flat/monotone delivery)");
  if (m.energyVariation !== null && m.energyVariation !== undefined && m.energyVariation < 0.8)
    areas.push("vocal energy and emphasis contrast");
  if (m.mumbleIndex !== null && m.mumbleIndex !== undefined && m.mumbleIndex > 30)
    areas.push("word clarity and articulation (mumbling detected)");
  if (m.mispronunciationRate !== null && m.mispronunciationRate !== undefined && m.mispronunciationRate > 15)
    areas.push("consonant precision");
  if (m.wpm !== null && m.wpm !== undefined && m.wpm > 165)
    areas.push("pace control (speaking too fast)");
  return areas;
}

const SYSTEM_PROMPT = `You are an expert voice coach creating pre-interview vocal warmup drills.
Your job is to generate short, spoken tongue twisters and warmup phrases that target specific articulation and delivery skills.

Rules:
- Each drill is 2-4 short sentences designed to be read aloud repeatedly
- Drills must be phonetically challenging for the target area
- Include at least one drill targeting pitch/energy variety (sentences with natural rising-falling intonation, emotional color, or emphasis shifts — NOT a tongue twister, but an expressive speaking exercise)
- Keep language appropriate for a professional context
- Difficulty: easy = simple words but challenging phonemes, medium = moderate complexity, hard = rapid complex sequences
- Return exactly 4 drills

Return a JSON object: { "drills": [ { "id": "d1", "text": "...", "target": "...", "focus": "...", "difficulty": "easy|medium|hard", "phonemeGroup": "plosives|sibilants|fricatives|vowels|clusters|pitch" } ] }`;

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let metrics: MetricsInput = {};
  try {
    const body = await req.json();
    metrics = body?.metrics ?? {};
  } catch {}

  const weakAreas = buildWeakAreas(metrics);
  const weakContext = weakAreas.length > 0
    ? `The user's weak delivery areas based on recent sessions: ${weakAreas.join("; ")}.`
    : "No prior session data. Generate a balanced warmup covering plosives, sibilants, pitch variety, and general articulation.";

  const userPrompt = `${weakContext}

Generate 4 pre-interview vocal warmup drills targeting their needs. Ensure variety across phoneme groups. Always include one pitch/energy variety drill.`;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.8,
      max_output_tokens: 800,
      input: [
        { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
        { role: "user",   content: [{ type: "input_text", text: userPrompt }] },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "warmup_drills",
          strict: true,
          schema: {
            type: "object",
            properties: {
              drills: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id:           { type: "string" },
                    text:         { type: "string" },
                    target:       { type: "string" },
                    focus:        { type: "string" },
                    difficulty:   { type: "string", enum: ["easy", "medium", "hard"] },
                    phonemeGroup: { type: "string", enum: ["plosives", "sibilants", "fricatives", "vowels", "clusters", "pitch"] },
                  },
                  required: ["id", "text", "target", "focus", "difficulty", "phonemeGroup"],
                  additionalProperties: false,
                },
              },
            },
            required: ["drills"],
            additionalProperties: false,
          },
        } as any,
      },
    });

    const raw = (resp as any).output_text ?? (resp as any).output?.[0]?.content?.[0]?.text ?? "";
    const parsed = JSON.parse(raw);
    const drills: WarmupDrill[] = parsed.drills ?? [];

    return NextResponse.json({ drills }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: "WARMUP_FAILED", message: err?.message ?? "Unknown" }, { status: 500 });
  }
}
