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

export interface CompetencyQuestion {
  question: string;
  competency: string;
  type: string;
  why: string;
}

interface StartBody {
  action: "start";
  role: string;
  industry: string;
  numQuestions: number;
  questionTypes: string[];
  coachingContext?: string; // llmContext from UserCoachingProfile
  competencyQuestions?: CompetencyQuestion[]; // from RoleCompetencyMap cache
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
  competencyQuestions?: CompetencyQuestion[];
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
    // Per-question arc signals
    wordCount?: number;
    starComplete?: boolean;
    confidenceSignal?: number;   // 1-10
    ownershipScore?: number;     // 1-10
    fillerEstimate?: number;     // estimated count
  }>;
  // Interview arc — how performance changed across the session
  interviewArc?: {
    qualityArc: number[];        // score per question in order
    confidenceArc: number[];     // confidence per question
    ownershipArc: number[];      // ownership/I-language per question
    wordCountArc: number[];      // words spoken per answer
    warmupEffect: boolean;       // Q1 score notably below avg
    fatigueSigns: boolean;       // last 2 Qs notably below first 2
    consistencyScore: number;    // 0-100, lower = more variable performance
    pitchDrift?: "stable" | "building" | "declining" | "volatile"; // derived from qualityArc, not AI-generated
    openingNote: string;         // observation about first answer
    closingNote: string;         // observation about final answer
  };
}

// ── System prompt builder ─────────────────────────────────────────────────────

function buildSystemPrompt(
  role: string,
  industry: string,
  numQuestions: number,
  questionTypes: string[],
  coachingContext?: string,
  competencyQuestions?: CompetencyQuestion[],
): string {
  const typeDesc = questionTypes.includes("situational") && questionTypes.includes("behavioral")
    ? "behavioral (tell me about a time...) and situational (imagine you're in a scenario where...)"
    : questionTypes.includes("situational")
    ? "situational (imagine you're in a scenario where...)"
    : "behavioral (tell me about a time...)";

  const coachingBlock = coachingContext
    ? `\n\nCANDIDATE COACHING PROFILE (from their practice history):\n${coachingContext}\n\nUse this profile to:\n- Target their known weak areas with specific probes\n- Acknowledge progress on resolved weaknesses if relevant\n- Ask follow-up questions that expose their persistent gaps`
    : "";

  const questionBankBlock = competencyQuestions && competencyQuestions.length > 0
    ? `\n\nROLE-SPECIFIC QUESTION BANK — draw your ${numQuestions} main questions from this list (adapt phrasing naturally, don't ask verbatim):
${competencyQuestions.slice(0, numQuestions + 3).map((q, i) => `${i + 1}. [${q.competency} | ${q.type}] ${q.question}`).join("\n")}

These questions were curated specifically for ${role}. Prioritize them over generic questions. Distribute across the competency areas shown.`
    : "";

  return `You are Jordan, a senior hiring manager at a leading ${industry} company conducting a structured interview for a ${role} position. You are experienced, professional, and genuinely curious — you probe when answers are vague and move on when you have enough signal.${coachingBlock}${questionBankBlock}

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
  const { role, industry, numQuestions, questionTypes, coachingContext, competencyQuestions } = body;

  const systemPrompt = buildSystemPrompt(role, industry, numQuestions, questionTypes, coachingContext, competencyQuestions);

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
    numQuestions, questionTypes, coachingContext, competencyQuestions,
  } = body;

  const systemPrompt = buildSystemPrompt(role, industry, numQuestions, questionTypes, coachingContext, competencyQuestions);

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
        content: `You are an expert interview coach scoring a mock interview for a ${role} position in ${industry}.

Score everything based strictly on what you observe in the transcript — not on what a typical candidate would say.

DIMENSION SCORING (1–10 scale, use the full range):
- 1–3: Critically absent or harmful (e.g., no structure, completely off-topic, entirely passive language)
- 4–5: Below expectations — present but weak, vague, or mostly missing the mark
- 6–6.9: Adequate — demonstrated but with clear gaps or missed opportunities
- 7–7.9: Solid — clear, owned, and structured with only minor gaps
- 8–8.9: Strong — specific, well-evidenced, interview-ready at most companies
- 9–10: Exceptional — polished, memorable, sets a high bar

QUESTION SCORE (0–100 scale):
- Map proportionally: a dimension average of 7.0 should produce roughly 70/100. 8.5 → 85. 5.0 → 50.
- A question with all STAR parts, specific I-language, and a quantified result should score 75–90.
- A question with vague answers, "we" language, or missing result should score 40–60.
- Do not compress scores toward 70–80. Use the full range.

DO NOT anchor scores around any particular threshold. Score what you see.`,
      },
      {
        role: "user",
        content: `Score this mock interview across 7 communication dimensions plus STAR structure.

QUESTIONS ASKED:
${questionList}

FULL TRANSCRIPT:
${transcript}

DIMENSION WEIGHTS (use these to inform overall score):
- narrative_clarity: 18% — did answers tell a coherent, easy-to-follow story?
- evidence_quality: 18% — were claims backed by specific, concrete examples?
- ownership_agency: 16% — did the candidate use "I" language and own their contributions?
- cognitive_depth: 16% — did answers show analytical thinking, tradeoffs, or reasoning?
- response_control: 14% — were answers appropriately scoped (not too long, not too short)?
- presence_confidence: 10% — did the candidate project conviction and assertiveness?
- vocal_engagement: 8% — was delivery varied and engaging (based on transcript patterns)?

Respond with JSON only:
{
  "overallScore": <0-100, computed as weighted average of dimension scores * 10, then adjusted ±5 for interview-wide signals like arc, consistency, warmup effect>,
  "dimensionScores": {
    "narrative_clarity": { "score": <1-10>, "label": "Narrative Clarity", "coaching": "<one specific coaching sentence grounded in a transcript moment>" },
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
  "strengths": ["<specific strength with exact transcript evidence>", "<specific strength>", "<specific strength>"],
  "improvements": ["<specific improvement with exact transcript moment>", "<specific improvement>"],
  "coachingSummary": "<3-4 sentence personalized coaching note referencing specific moments from the interview>",
  "readinessLevel": "not_ready" | "developing" | "ready" | "strong",
  "questionBreakdowns": [
    {
      "question": "<question text>",
      "competency": "<competency>",
      "score": <0-100>,
      "note": "<one sentence on this specific answer with evidence>",
      "wordCount": <word count of candidate's answer>,
      "starComplete": <true if answer contained all 4 STAR parts>,
      "confidenceSignal": <1-10>,
      "ownershipScore": <1-10>,
      "fillerEstimate": <estimated filler count>
    }
  ],
  "interviewArc": {
    "qualityArc": [<score Q1 0-100>, <score Q2>, ...],
    "confidenceArc": [<confidence 1-10 Q1>, ...],
    "ownershipArc": [<ownership 1-10 Q1>, ...],
    "wordCountArc": [<word count Q1>, ...],
    "warmupEffect": <true if Q1 score was notably below average>,
    "fatigueSigns": <true if last 2 questions scored notably lower than first 2>,
    "consistencyScore": <0-100, 100=very consistent>,
    "openingNote": "<one sentence about the first answer>",
    "closingNote": "<one sentence about the final answer>"
  }
}`,
      },
    ],
    max_tokens: 1800,
    temperature: 0.3,
  });

  const scored = JSON.parse(res.choices[0].message.content ?? "{}") as MockScoreResult;

  // Derive pitchDrift deterministically from qualityArc — never inferred by AI
  const arc = scored.interviewArc?.qualityArc;
  if (scored.interviewArc && Array.isArray(arc) && arc.length >= 2) {
    const mid = Math.ceil(arc.length / 2);
    const firstAvg = arc.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const lastHalf = arc.slice(Math.floor(arc.length / 2));
    const lastAvg  = lastHalf.reduce((a, b) => a + b, 0) / lastHalf.length;
    const mean = arc.reduce((a, b) => a + b, 0) / arc.length;
    const variance = arc.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / arc.length;
    const diff = lastAvg - firstAvg;
    if (variance > 200) scored.interviewArc.pitchDrift = "volatile";
    else if (diff > 6)  scored.interviewArc.pitchDrift = "building";
    else if (diff < -6) scored.interviewArc.pitchDrift = "declining";
    else                scored.interviewArc.pitchDrift = "stable";
  }

  // ── Deterministic overallScore — never accept AI's free-form number directly ──
  // Compute from dimension scores (weighted) and question breakdowns (weighted).
  // The AI's overallScore is treated as advisory and constrained to ±8 of this.
  const DIM_WEIGHTS: Record<string, number> = {
    narrative_clarity:  0.18,
    evidence_quality:   0.18,
    ownership_agency:   0.16,
    cognitive_depth:    0.16,
    response_control:   0.14,
    presence_confidence: 0.10,
    vocal_engagement:   0.08,
  };

  const dims = scored.dimensionScores ?? {};
  let dimWeightedSum = 0;
  let dimWeightTotal = 0;
  for (const [key, weight] of Object.entries(DIM_WEIGHTS)) {
    const s = dims[key]?.score;
    if (typeof s === "number" && s >= 1 && s <= 10) {
      dimWeightedSum += s * weight;
      dimWeightTotal += weight;
    }
  }
  // Normalize in case some dimensions are missing, convert 1-10 → 0-100
  const dimScore = dimWeightTotal > 0 ? (dimWeightedSum / dimWeightTotal) * 10 : 0;

  // Question breakdown average (0-100 scale)
  const qbScores = (scored.questionBreakdowns ?? [])
    .map(q => q.score)
    .filter(s => typeof s === "number" && s >= 0 && s <= 100) as number[];
  const qbScore = qbScores.length > 0
    ? qbScores.reduce((a, b) => a + b, 0) / qbScores.length
    : dimScore; // fallback to dim score if no breakdowns

  // Weighted blend: question content (55%) + dimension delivery (45%)
  const deterministicScore = Math.round(qbScore * 0.55 + dimScore * 0.45);

  // Soft-constrain AI's overallScore to ±8 of the deterministic result
  const aiScore = typeof scored.overallScore === "number" ? scored.overallScore : deterministicScore;
  const constrainedScore = Math.round(Math.max(0, Math.min(100,
    Math.max(deterministicScore - 8, Math.min(deterministicScore + 8, aiScore))
  )));

  scored.overallScore = constrainedScore;

  // Constrain readinessLevel to match final overallScore
  if (constrainedScore >= 82) scored.readinessLevel = "strong";
  else if (constrainedScore >= 72) scored.readinessLevel = "ready";
  else if (constrainedScore >= 55) scored.readinessLevel = "developing";
  else scored.readinessLevel = "not_ready";

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
      isStrength: val.score >= 7.0,
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
      practiceType: "mock_interview",
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
        interview_arc: scoreResult.interviewArc ?? null,
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

// ── GET: return recent mock interview attempts ────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const all = req.nextUrl.searchParams.get("all") === "1";

  if (all) {
    // Return up to 20 past sessions for aggregate view
    const attempts = await prisma.attempt.findMany({
      where: { userId: user.id, evaluationFramework: "mock_interview", deletedAt: null },
      orderBy: { ts: "desc" },
      take: 20,
      select: {
        id: true, ts: true, question: true, score: true,
        communicationScore: true, confidenceScore: true, wpm: true,
        feedback: true,
      },
    });
    return NextResponse.json({ attempts });
  }

  const attempt = await prisma.attempt.findFirst({
    where: { userId: user.id, evaluationFramework: "mock_interview", deletedAt: null },
    orderBy: { ts: "desc" },
    select: {
      id: true, ts: true, question: true, score: true,
      communicationScore: true, confidenceScore: true, wpm: true,
      feedback: true, deliveryMetrics: true, prosody: true,
    },
  });

  if (!attempt) return NextResponse.json({ attempt: null });

  return NextResponse.json({ attempt });
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
