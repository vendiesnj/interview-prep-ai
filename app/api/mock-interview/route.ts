import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ── POST /api/mock-interview
// Body: { action: "start" | "followup" | "score", ...payload }
//
// start   → { role?, industry? }            → { question, questionIndex: 0, total: 5 }
// followup → { transcript, starAnalysis, questionIndex, history }
//           → { question, questionIndex, done: false } | { done: true }
// score   → { history }                     → { feedback }

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "start") {
    return handleStart(body);
  }
  if (action === "followup") {
    return handleFollowup(body);
  }
  if (action === "score") {
    return handleScore(body);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// ── Start: generate the opening question ─────────────────────────────────────

async function handleStart(body: { role?: string; industry?: string }) {
  const { role = "a professional role", industry = "general" } = body;

  const prompt = `You are conducting a mock job interview for a ${role} position in the ${industry} industry.

Generate ONE strong behavioral interview question appropriate for this role. The question should:
- Follow the "Tell me about a time when..." or "Describe a situation where..." format
- Target a specific NACE competency (communication, critical thinking, leadership, teamwork, or professionalism)
- Be appropriately challenging but answerable by a college student or early-career professional

Respond with JSON only:
{
  "question": "...",
  "competency": "communication|critical_thinking|leadership|teamwork|professionalism",
  "hint": "one sentence tip for answering this well"
}`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
  });

  const data = JSON.parse(res.choices[0].message.content ?? "{}");
  return NextResponse.json({ question: data.question, competency: data.competency, hint: data.hint, questionIndex: 0, total: 5 });
}

// ── Follow-up: analyze STAR completeness and generate next question ───────────

async function handleFollowup(body: {
  transcript: string;
  starAnalysis: { situation: boolean; task: boolean; action: boolean; result: boolean };
  questionIndex: number;
  history: Array<{ question: string; transcript: string }>;
  role?: string;
  industry?: string;
}) {
  const { transcript, starAnalysis, questionIndex, history, role = "professional", industry = "general" } = body;

  const missingComponents = Object.entries(starAnalysis)
    .filter(([, present]) => !present)
    .map(([k]) => k);

  // If a key STAR component is missing, generate a targeted follow-up
  if (missingComponents.length > 0 && questionIndex < 4) {
    const missing = missingComponents[0];
    const followupMap: Record<string, string> = {
      situation: "Can you give me more context on the situation you were in?",
      task: "What specifically was your role or responsibility in that situation?",
      action: "What exact steps did you take? Walk me through your specific actions.",
      result: "What was the outcome? What did you learn from that experience?",
    };

    const followup = followupMap[missing] ?? "Can you tell me more about that?";

    // If this is the last follow-up slot, move to next behavioral question
    if (questionIndex >= 3) {
      return NextResponse.json({ done: true });
    }

    return NextResponse.json({
      question: followup,
      isFollowup: true,
      missingComponent: missing,
      questionIndex: questionIndex + 1,
      total: 5,
    });
  }

  // STAR complete (or no missing components) - generate next behavioral question
  if (questionIndex >= 4) {
    return NextResponse.json({ done: true });
  }

  const previousQuestions = history.map((h) => h.question).join("\n");

  const prompt = `You are conducting a mock interview for a ${role} position in ${industry}.

The candidate has already answered these questions:
${previousQuestions}

Generate ONE new behavioral interview question that:
- Targets a DIFFERENT NACE competency than questions already asked
- Is appropriate for a college student or early-career professional
- Uses behavioral format ("Tell me about a time...")

Respond with JSON only:
{
  "question": "...",
  "competency": "communication|critical_thinking|leadership|teamwork|professionalism|career_dev",
  "hint": "one sentence tip"
}`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
  });

  const data = JSON.parse(res.choices[0].message.content ?? "{}");
  return NextResponse.json({
    question: data.question,
    competency: data.competency,
    hint: data.hint,
    isFollowup: false,
    questionIndex: questionIndex + 1,
    total: 5,
  });
}

// ── Score: generate final feedback summary ────────────────────────────────────

async function handleScore(body: {
  history: Array<{ question: string; transcript: string; starAnalysis: Record<string, boolean> }>;
  role?: string;
}) {
  const { history, role = "a professional role" } = body;

  const transcript = history
    .map((h, i) => `Q${i + 1}: ${h.question}\nA: ${h.transcript}`)
    .join("\n\n");

  const prompt = `You evaluated a mock interview for a candidate applying for ${role}.

Full interview transcript:
${transcript}

Provide concise coaching feedback. Respond with JSON only:
{
  "overallScore": 0-100,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["area 1", "area 2"],
  "starCompleteness": { "situation": 0-100, "task": 0-100, "action": 0-100, "result": 0-100 },
  "coachingSummary": "2-3 sentence personalized coaching note",
  "readinessLevel": "not_ready|developing|ready|strong"
}`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
    max_tokens: 600,
  });

  const data = JSON.parse(res.choices[0].message.content ?? "{}");
  return NextResponse.json(data);
}
