import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConversationTurn {
  speaker: "interviewer" | "candidate";
  content: string;
  questionIndex?: number;
  isFollowup?: boolean;
  competency?: string;
  questionType?: "behavioral" | "situational" | "problem_solving";
}

interface StartBody {
  action: "start";
  role: string;
  industry: string;
  numQuestions: number;
  questionTypes: string[];
  coachingContext?: string; // llmContext from UserCoachingProfile
}

interface RespondBody {
  action: "respond";
  role: string;
  industry: string;
  transcript: string;
  history: ConversationTurn[];
  mainQuestionsAsked: number;
  numQuestions: number;
  questionTypes: string[];
  coachingContext?: string;
}

interface ScoreBody {
  action: "score";
  role: string;
  industry: string;
  history: ConversationTurn[];
  faceMetrics?: Record<string, number> | null;
}

interface SaveBody {
  action: "save";
  role: string;
  industry: string;
  history: ConversationTurn[];
  scoreResult: MockScoreResult;
  faceMetrics?: Record<string, number> | null;
  voiceMetrics?: Record<string, number> | null;
  wpm?: number | null;
}

export interface MockScoreResult {
  overallScore: number;
  dimensionScores: Record<string, { score: number; label: string; coaching: string }>;
  starScores: { situation: number; task: number; action: number; result: number };
  strengths: string[];
  improvements: string[];
  coachingSummary: string;
  readinessLevel: "not_ready" | "developing" | "ready" | "strong";
  questionBreakdowns: Array<{
    question: string;
    competency: string;
    score: number;
    note: string;
  }>;
}

// ── System prompt builder ─────────────────────────────────────────────────────

function buildSystemPrompt(
  role: string,
  industry: string,
  numQuestions: number,
  questionTypes: string[],
  coachingContext?: string,
): string {
  const typeDesc = questionTypes.includes("situational") && questionTypes.includes("behavioral")
    ? "behavioral (tell me about a time...) and situational (imagine you're in a scenario where...)"
    : questionTypes.includes("situational")
    ? "situational (imagine you're in a scenario where...)"
    : "behavioral (tell me about a time...)";

  const coachingBlock = coachingContext
    ? `\n\nCANDIDATE COACHING PROFILE (from their practice history):\n${coachingContext}\n\nUse this profile to:\n- Target their known weak areas with specific probes\n- Acknowledge progress on resolved weaknesses if relevant\n- Ask follow-up questions that expose their persistent gaps`
    : "";

  return `You are Jordan, a senior hiring manager at a leading ${industry} company conducting a structured interview for a ${role} position. You are experienced, professional, and genuinely curious — you probe when answers are vague and move on when you have enough signal.${coachingBlock}

INTERVIEW STRUCTURE:
- Ask exactly ${numQuestions} main questions total, using ${typeDesc} formats
- After each candidate answer, decide: does it need a follow-up probe, or do you have enough signal?
- A follow-up is warranted when: the answer is vague, missing a key outcome, uses "we" without owning their contribution, or skips context
- Do NOT ask more than one follow-up per main question
- Space questions across different competencies: leadership, problem-solving, collaboration, communication, and domain knowledge for ${role}

RESPONSE FORMAT — always respond with valid JSON, nothing else:
{
  "action": "followup" | "next_question" | "done",
  "message": "your question or transition statement (natural, conversational)",
  "competency": "what you are assessing with this question",
  "questionType": "behavioral" | "situational",
  "isFollowup": true | false,
  "internalNote": "brief observation about the candidate's answer (not shown to them)"
}

Set "action": "done" only when all ${numQuestions} main questions are complete AND any necessary follow-ups have been asked.
Be conversational — brief transitions like "Thanks for sharing that." or "Got it." before the next question feel natural.`;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleStart(body: StartBody): Promise<NextResponse> {
  const { role, industry, numQuestions, questionTypes, coachingContext } = body;

  const systemPrompt = buildSystemPrompt(role, industry, numQuestions, questionTypes, coachingContext);

  const openingInstruction = `You are beginning the interview. Ask the first question. Do not introduce yourself — jump straight into the question naturally. Choose a question appropriate for ${role} in ${industry}.`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: openingInstruction },
    ],
    max_tokens: 400,
    temperature: 0.8,
  });

  const data = JSON.parse(res.choices[0].message.content ?? "{}");

  return NextResponse.json({
    action: "next_question",
    message: data.message ?? "Tell me about a time you led a project from start to finish.",
    competency: data.competency ?? "leadership",
    questionType: data.questionType ?? "behavioral",
    isFollowup: false,
  });
}

async function handleRespond(body: RespondBody): Promise<NextResponse> {
  const {
    role, industry, transcript, history, mainQuestionsAsked,
    numQuestions, questionTypes, coachingContext,
  } = body;

  const systemPrompt = buildSystemPrompt(role, industry, numQuestions, questionTypes, coachingContext);

  // Build conversation messages for context
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  // Replay conversation history
  for (const turn of history) {
    if (turn.speaker === "interviewer") {
      messages.push({ role: "assistant", content: turn.content });
    } else {
      messages.push({ role: "user", content: turn.content });
    }
  }

  // Append the latest answer with context
  const contextNote = mainQuestionsAsked >= numQuestions
    ? `The candidate just answered. This was main question ${mainQuestionsAsked} of ${numQuestions}. You may ask ONE follow-up if truly needed, then set action to "done".`
    : `The candidate just answered. Main questions asked so far: ${mainQuestionsAsked} of ${numQuestions}. Decide: follow-up probe, or move to the next main question?`;

  messages.push({
    role: "user",
    content: `${transcript}\n\n[SYSTEM NOTE: ${contextNote}]`,
  });

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages,
    max_tokens: 400,
    temperature: 0.7,
  });

  const data = JSON.parse(res.choices[0].message.content ?? "{}");

  // Safety valve: if all questions done and this isn't a follow-up, force done
  if (mainQuestionsAsked >= numQuestions && !data.isFollowup) {
    return NextResponse.json({ action: "done" });
  }

  return NextResponse.json({
    action: data.action ?? "next_question",
    message: data.message ?? "",
    competency: data.competency ?? "",
    questionType: data.questionType ?? "behavioral",
    isFollowup: data.isFollowup ?? false,
    internalNote: data.internalNote ?? "",
  });
}

async function handleScore(body: ScoreBody): Promise<NextResponse> {
  const { role, industry, history } = body;

  // Build a clean transcript for scoring
  const transcript = history
    .map((t) => `${t.speaker === "interviewer" ? "Interviewer" : "Candidate"}: ${t.content}`)
    .join("\n\n");

  const questionList = history
    .filter((t) => t.speaker === "interviewer")
    .map((t, i) => `Q${i + 1} [${t.competency ?? "general"}]: ${t.content}`)
    .join("\n");

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert interview coach scoring a mock interview for a ${role} position in ${industry}. Score rigorously but fairly — a score of 75+ means genuinely ready to interview.`,
      },
      {
        role: "user",
        content: `Score this mock interview across 7 communication dimensions plus STAR structure.

QUESTIONS ASKED:
${questionList}

FULL TRANSCRIPT:
${transcript}

Respond with JSON only:
{
  "overallScore": <0-100>,
  "dimensionScores": {
    "narrative_clarity": { "score": <1-10>, "label": "Narrative Clarity", "coaching": "<one specific coaching sentence>" },
    "evidence_quality": { "score": <1-10>, "label": "Evidence Quality", "coaching": "<one specific coaching sentence>" },
    "ownership_agency": { "score": <1-10>, "label": "Ownership & Agency", "coaching": "<one specific coaching sentence>" },
    "response_control": { "score": <1-10>, "label": "Response Control", "coaching": "<one specific coaching sentence>" },
    "cognitive_depth": { "score": <1-10>, "label": "Cognitive Depth", "coaching": "<one specific coaching sentence>" },
    "presence_confidence": { "score": <1-10>, "label": "Presence & Confidence", "coaching": "<one specific coaching sentence>" },
    "vocal_engagement": { "score": <1-10>, "label": "Vocal Engagement", "coaching": "<one specific coaching sentence>" }
  },
  "starScores": {
    "situation": <0-100>,
    "task": <0-100>,
    "action": <0-100>,
    "result": <0-100>
  },
  "strengths": ["<specific strength with evidence from transcript>", "<specific strength>", "<specific strength>"],
  "improvements": ["<specific improvement with evidence>", "<specific improvement>"],
  "coachingSummary": "<3-4 sentence personalized coaching note referencing specific moments from the interview>",
  "readinessLevel": "not_ready" | "developing" | "ready" | "strong",
  "questionBreakdowns": [
    { "question": "<question text>", "competency": "<competency>", "score": <0-100>, "note": "<one sentence on this specific answer>" }
  ]
}`,
      },
    ],
    max_tokens: 1200,
    temperature: 0.3,
  });

  const scored = JSON.parse(res.choices[0].message.content ?? "{}") as MockScoreResult;
  return NextResponse.json(scored);
}

async function handleSave(
  body: SaveBody,
  userId: string,
  tenantId: string | null,
): Promise<NextResponse> {
  const { role, history, scoreResult, faceMetrics, voiceMetrics, wpm } = body;

  // Build a clean transcript string
  const transcript = history
    .map((t) => `${t.speaker === "interviewer" ? "Q" : "A"}: ${t.content}`)
    .join("\n\n");

  // Convert dimension scores to the format the coaching profile expects
  const dimensionScoresForFeedback: Record<string, { label: string; score: number; coaching: string; isStrength: boolean; isGap: boolean }> = {};
  for (const [key, val] of Object.entries(scoreResult.dimensionScores ?? {})) {
    dimensionScoresForFeedback[key] = {
      label: val.label,
      score: val.score,
      coaching: val.coaching,
      isStrength: val.score >= 7.5,
      isGap: val.score < 5.5,
    };
  }

  // Build strength/improvement theme keys for coaching profile
  const strengthThemeKeys = scoreResult.strengths.map((s) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/ +/g, "_").slice(0, 30)
  );
  const improvementThemeKeys = scoreResult.improvements.map((s) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/ +/g, "_").slice(0, 30)
  );

  const attempt = await prisma.attempt.create({
    data: {
      userId,
      ...(tenantId ? { tenantId } : {}),
      ts: new Date(),
      question: `Mock Interview — ${role}`,
      questionCategory: "mock_interview",
      evaluationFramework: "mock_interview",
      inputMethod: "spoken",
      transcript,
      score: scoreResult.overallScore / 10, // store as 0-10
      communicationScore: scoreResult.dimensionScores?.narrative_clarity?.score ?? null,
      confidenceScore: scoreResult.dimensionScores?.presence_confidence?.score ?? null,
      wpm: wpm ?? null,
      feedback: {
        score: scoreResult.overallScore / 10,
        communication_score: scoreResult.dimensionScores?.narrative_clarity?.score ?? null,
        confidence_score: scoreResult.dimensionScores?.presence_confidence?.score ?? null,
        strengths: scoreResult.strengths,
        improvements: scoreResult.improvements,
        coaching_summary: scoreResult.coachingSummary,
        readiness_level: scoreResult.readinessLevel,
        dimension_scores: dimensionScoresForFeedback,
        star: {
          situation: (scoreResult.starScores?.situation ?? 50) / 10,
          task: (scoreResult.starScores?.task ?? 50) / 10,
          action: (scoreResult.starScores?.action ?? 50) / 10,
          result: (scoreResult.starScores?.result ?? 50) / 10,
        },
        question_breakdowns: scoreResult.questionBreakdowns,
        strength_theme_keys: strengthThemeKeys,
        improvement_theme_keys: improvementThemeKeys,
        mock_interview: true,
        conversation_turns: history.length,
      },
      deliveryMetrics: {
        ...(voiceMetrics ?? {}),
        ...(faceMetrics ? { face: faceMetrics } : {}),
      },
      prosody: voiceMetrics ? {
        monotoneScore: voiceMetrics.monotoneScore ?? undefined,
        energyVariation: voiceMetrics.energyVariation ?? undefined,
        tempoDynamics: voiceMetrics.tempoDynamics ?? undefined,
      } : undefined,
    },
    select: { id: true },
  });

  return NextResponse.json({ attemptId: attempt.id });
}

// ── Router ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "start") return handleStart(body as StartBody);
  if (action === "respond") return handleRespond(body as RespondBody);
  if (action === "score") return handleScore(body as ScoreBody);

  if (action === "save") {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, tenantId: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return handleSave(body as SaveBody, user.id, user.tenantId ?? null);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
