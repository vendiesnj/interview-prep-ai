// app/api/student-profile/route.ts
// Single source of truth for the My Journey hub page.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import {
  computeNaceProfile,
  type NaceAttemptInput,
  type NaceScore,
} from "@/app/lib/nace";

export const runtime = "nodejs";

// ── Helpers ──────────────────────────────────────────────────────────────────

function toNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Normalize a raw score value to 0–100. Values < 15 are treated as 0–10 scale. */
function normalizeScore(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = toNumber(v);
  if (n === null) return null;
  return n < 15 ? Math.round(n * 10) : Math.round(n);
}

function avg(vals: number[]): number | null {
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function round1(v: number | null): number | null {
  return v === null ? null : Math.round(v * 10) / 10;
}

/** Return the most common string value in an array, or null if empty. */
function mode(vals: string[]): string | null {
  if (!vals.length) return null;
  const counts = new Map<string, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
  let topKey: string | null = null;
  let topCount = 0;
  counts.forEach((count, key) => {
    if (count > topCount) {
      topCount = count;
      topKey = key;
    }
  });
  return topKey;
}

// ── Framework classification ──────────────────────────────────────────────────

type SpeakingFramework = "interview" | "networking" | "publicSpeaking";

function classifyFramework(framework: string | null | undefined): SpeakingFramework {
  if (framework === "networking_pitch") return "networking";
  if (framework === "public_speaking") return "publicSpeaking";
  return "interview";
}

// ── Attempt shape returned from DB ───────────────────────────────────────────

interface RawAttempt {
  id: string;
  ts: Date;
  score: number | null;
  communicationScore: number | null;
  confidenceScore: number | null;
  wpm: number | null;
  question: string;
  questionCategory: string | null;
  evaluationFramework: string | null;
  jobProfileTitle: string | null;
  jobProfileCompany: string | null;
  feedback: unknown;
  prosody: unknown;
  deliveryMetrics: unknown;
  inputMethod: string | null;
  durationSeconds: number | null;
}

// ── Score segment builder ─────────────────────────────────────────────────────

function buildSpeakingSegment(
  attempts: RawAttempt[],
  framework: SpeakingFramework
) {
  const filtered = attempts.filter(
    (a) => classifyFramework(a.evaluationFramework) === framework
  );

  const scoredAttempts = filtered.filter((a) => a.score !== null);
  const scores100 = scoredAttempts.map((a) => normalizeScore(a.score)).filter((v): v is number => v !== null);
  const comms = filtered
    .map((a) => toNumber(a.communicationScore))
    .filter((v): v is number => v !== null);
  const confs = filtered
    .map((a) => toNumber(a.confidenceScore))
    .filter((v): v is number => v !== null);
  const wpms = filtered
    .map((a) => toNumber(a.wpm))
    .filter((v): v is number => v !== null);

  const recentAttempts = filtered
    .slice()
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 5);

  const base = {
    count: filtered.length,
    avgScore: round1(avg(scores100)),
    recentAttempts,
  };

  if (framework === "interview") {
    return {
      ...base,
      avgComm: round1(avg(comms)),
      avgConf: round1(avg(confs)),
      avgWpm: round1(avg(wpms)),
    };
  }

  if (framework === "networking") {
    const pitchStyles = filtered
      .map((a) => {
        const fb = a.feedback && typeof a.feedback === "object" ? (a.feedback as Record<string, unknown>) : null;
        const ps = fb?.pitch_style;
        return typeof ps === "string" ? ps : null;
      })
      .filter((v): v is string => v !== null);
    return {
      ...base,
      topPitchStyle: mode(pitchStyles),
    };
  }

  // publicSpeaking
  const archetypes = filtered
    .map((a) => {
      const fb = a.feedback && typeof a.feedback === "object" ? (a.feedback as Record<string, unknown>) : null;
      const da = fb?.delivery_archetype;
      return typeof da === "string" ? da : null;
    })
    .filter((v): v is string => v !== null);
  return {
    ...base,
    topArchetype: mode(archetypes),
  };
}

// ── Completeness calculation ──────────────────────────────────────────────────

function computeCompleteness(opts: {
  graduationYear: number | null;
  major: string | null;
  targetRole: string | null;
  targetIndustry: string | null;
  interviewCount: number;
  networkingCount: number;
  publicSpeakingCount: number;
  hasAptitude: boolean;
  hasCareerCheckIn: boolean;
  preCollegeDone: number;
  duringCollegeDone: number;
  postCollegeDone: number;
  hasInterviewActivity: boolean;
  hasResumeAnalysis: boolean;
}): number {
  let score = 0;
  if (opts.graduationYear) score += 10;
  if (opts.major) score += 10;
  if (opts.targetRole) score += 10;
  if (opts.targetIndustry) score += 10;
  if (opts.interviewCount >= 5) score += 15;
  if (opts.networkingCount >= 1) score += 5;
  if (opts.publicSpeakingCount >= 1) score += 5;
  if (opts.hasAptitude) score += 10;
  if (opts.hasCareerCheckIn) score += 10;
  if (opts.preCollegeDone >= 3) score += 3;
  if (opts.duringCollegeDone >= 3) score += 3;
  if (opts.postCollegeDone >= 3) score += 3;
  if (opts.hasInterviewActivity) score += 3;
  if (opts.hasResumeAnalysis) score += 3;
  return score;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve user id
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      graduationYear: true,
      major: true,
      targetRole: true,
      targetIndustry: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userId = user.id;

  // ── Fetch all data in parallel ────────────────────────────────────────────

  const [
    attempts,
    aptitudeResult,
    careerCheckIn,
    checklistProgress,
    interviewActivities,
    studentSkills,
    resumeAnalyses,
    instinctSessions,
  ] = await Promise.all([
    // 1. Attempts — all non-deleted
    prisma.attempt.findMany({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        ts: true,
        score: true,
        communicationScore: true,
        confidenceScore: true,
        wpm: true,
        question: true,
        questionCategory: true,
        evaluationFramework: true,
        jobProfileTitle: true,
        jobProfileCompany: true,
        feedback: true,
        prosody: true,
        deliveryMetrics: true,
        inputMethod: true,
        durationSeconds: true,
      },
      orderBy: { ts: "desc" },
    }),

    // 2. Most recent aptitude result
    prisma.aptitudeResult.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        primary: true,
        secondary: true,
        scores: true,
        createdAt: true,
      },
    }),

    // 3. Most recent career check-in
    prisma.careerCheckIn.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        employmentStatus: true,
        jobTitle: true,
        company: true,
        industry: true,
        salaryRange: true,
        salaryExact: true,
        graduationYear: true,
        major: true,
        satisfactionScore: true,
        topChallenge: true,
        has401k: true,
        studentLoanRange: true,
        createdAt: true,
      },
    }),

    // 4. Checklist progress — all records
    prisma.checklistProgress.findMany({
      where: { userId },
      select: { stage: true, itemId: true, done: true },
    }),

    // 5. Interview activities — all, ordered by createdAt desc
    prisma.interviewActivity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),

    // 6. Student skills — all, ordered by confidence desc
    prisma.studentSkill.findMany({
      where: { userId },
      orderBy: { confidence: "desc" },
    }),

    // 7. Resume analyses — last 10
    prisma.resumeAnalysis.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        overallScore: true,
        atsScore: true,
        overallLabel: true,
        summary: true,
        topAction: true,
        resumeSnippet: true,
        jobDescSnippet: true,
      },
    }),

    // 8. Instinct sessions — last 10
    prisma.instinctSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        dimensions: true,
        xpEarned: true,
        scenariosPlayed: true,
      },
    }),
  ]);

  // ── Speaking segments ─────────────────────────────────────────────────────

  const rawAttempts = attempts as RawAttempt[];

  const interviewSeg = buildSpeakingSegment(rawAttempts, "interview");
  const networkingSeg = buildSpeakingSegment(rawAttempts, "networking");
  const publicSpeakingSeg = buildSpeakingSegment(rawAttempts, "publicSpeaking");

  // ── Checklist counts ──────────────────────────────────────────────────────

  const doneItems = checklistProgress.filter((p) => p.done);

  const preCollegeDone = doneItems.filter((p) => p.stage === "pre_college").length;
  const duringCollegeDone = doneItems.filter((p) => p.stage === "during_college").length;
  const postCollegeDone = doneItems.filter((p) => p.stage === "post_college").length;
  const finlitDone = doneItems.filter((p) => p.stage.startsWith("finlit_")).length;

  // ── Interview pipeline ────────────────────────────────────────────────────

  const byStage: Record<string, number> = {};
  for (const act of interviewActivities) {
    byStage[act.stage] = (byStage[act.stage] ?? 0) + 1;
  }

  const offers = interviewActivities.filter((a) => a.stage === "offer").length;
  const accepted = interviewActivities.filter(
    (a) => a.stage === "accepted" || a.outcome === "accepted"
  ).length;

  // ── Skills by category ────────────────────────────────────────────────────

  const byCategory: Record<string, typeof studentSkills> = {};
  for (const skill of studentSkills) {
    if (!byCategory[skill.category]) byCategory[skill.category] = [];
    byCategory[skill.category].push(skill);
  }

  // ── Face metrics (aggregate from deliveryMetrics.face) ───────────────────

  const faceAttempts = rawAttempts.filter((a) => {
    const dm = a.deliveryMetrics as any;
    return dm?.face?.framesAnalyzed > 0;
  });
  const faceMetricsAggregate = faceAttempts.length > 0 ? (() => {
    const dm = faceAttempts.map((a) => (a.deliveryMetrics as any).face);
    const avg = (key: string) => Math.round((dm.reduce((s: number, f: any) => s + (f[key] ?? 0), 0) / dm.length) * 100) / 100;
    return {
      eyeContact: avg("eyeContact"),
      expressiveness: avg("expressiveness"),
      headStability: avg("headStability"),
      sessionsAnalyzed: faceAttempts.length,
    };
  })() : null;

  // ── Instinct profile (aggregate dimensions across sessions) ───────────────

  const instinctDimensionsAggregate = instinctSessions.length > 0 ? (() => {
    const dims = ["teamwork", "leadership", "communication", "criticalThinking", "professionalism", "adaptability", "equityInclusion"];
    const result: Record<string, number> = {};
    for (const d of dims) {
      const vals = instinctSessions.map((s) => ((s.dimensions as any)?.[d] ?? 0) as number);
      result[d] = Math.round((vals.reduce((a, v) => a + v, 0) / vals.length) * 100) / 100;
    }
    return result;
  })() : null;

  // ── NACE scores ───────────────────────────────────────────────────────────

  const naceInputs: NaceAttemptInput[] = rawAttempts.map((a) => ({
    score: normalizeScore(a.score) ?? undefined,
    communicationScore: toNumber(a.communicationScore) ?? undefined,
    confidenceScore: toNumber(a.confidenceScore) ?? undefined,
    wpm: toNumber(a.wpm) ?? undefined,
    feedback:
      a.feedback && typeof a.feedback === "object"
        ? (a.feedback as NaceAttemptInput["feedback"])
        : null,
    prosody:
      a.prosody && typeof a.prosody === "object"
        ? (a.prosody as NaceAttemptInput["prosody"])
        : null,
    deliveryMetrics:
      a.deliveryMetrics && typeof a.deliveryMetrics === "object"
        ? (a.deliveryMetrics as NaceAttemptInput["deliveryMetrics"])
        : null,
    questionCategory: a.questionCategory ?? undefined,
  }));

  const aptitudeScores =
    aptitudeResult?.scores &&
    typeof aptitudeResult.scores === "object" &&
    !Array.isArray(aptitudeResult.scores)
      ? (aptitudeResult.scores as Partial<Record<"A" | "B" | "C" | "H" | "L" | "M", number>>)
      : null;

  const technicalSkillsCount = studentSkills.filter(
    (s) => s.category.toLowerCase().includes("tech") || s.category.toLowerCase().includes("software") || s.category.toLowerCase().includes("data") || s.category.toLowerCase().includes("engineer")
  ).length;

  // Checklist completion 0–1 (average across the 3 stage checklists)
  const CHECKLIST_TOTALS = { pre_college: 8, during_college: 10, post_college: 8 };
  const checklistCompletionPct =
    (preCollegeDone / CHECKLIST_TOTALS.pre_college +
      duringCollegeDone / CHECKLIST_TOTALS.during_college +
      postCollegeDone / CHECKLIST_TOTALS.post_college) / 3;

  const naceScores: NaceScore[] = computeNaceProfile({
    attempts: naceInputs,
    aptitudeScores: aptitudeScores ?? undefined,
    hasCompletedAptitude: !!aptitudeResult,
    hasCompletedCareerCheckIn: !!careerCheckIn,
    instinctDimensions: instinctDimensionsAggregate,
    instinctSessionCount: instinctSessions.length,
    technicalSkillsCount,
    hasResumeAnalysis: resumeAnalyses.length > 0,
    totalAttempts: rawAttempts.length,
    visualScores: faceMetricsAggregate
      ? {
          eyeContact: faceMetricsAggregate.eyeContact,
          expressiveness: faceMetricsAggregate.expressiveness,
          headStability: faceMetricsAggregate.headStability,
        }
      : null,
    checklistCompletionPct,
  });

  // ── Signal Score (weighted composite of NACE) ─────────────────────────────
  // Weights reflect assessability confidence and employer survey importance
  const SIGNAL_WEIGHTS: Partial<Record<NaceScore["key"], number>> = {
    communication:    0.28,
    professionalism:  0.22,
    critical_thinking: 0.20,
    leadership:       0.15,
    career_dev:       0.10,
    teamwork:         0.05,
  };
  let signalNumerator = 0;
  let signalDenominator = 0;
  for (const ns of naceScores) {
    const w = SIGNAL_WEIGHTS[ns.key];
    if (w && ns.score !== null) {
      signalNumerator += ns.score * w;
      signalDenominator += w;
    }
  }
  const signalScore = signalDenominator > 0 ? Math.round(signalNumerator / signalDenominator) : null;

  // ── Next Action recommendation ────────────────────────────────────────────
  const ACTION_MAP: Record<NaceScore["key"], { title: string; description: string; href: string }> = {
    communication:    { title: "Practice speaking",         description: "Your communication score has the most room to grow. Do another interview session to improve clarity and pace.", href: "/practice" },
    critical_thinking:{ title: "Work on your STAR answers", description: "Structure your answers with clear situation, task, action, and result to boost your critical thinking score.", href: "/practice" },
    professionalism:  { title: "Build your presence",       description: "Practice public speaking to strengthen composure and reduce filler words.", href: "/public-speaking" },
    leadership:       { title: "Demonstrate initiative",    description: "Your STAR action scores suggest room to better highlight your decision-making. Practice leadership-focused questions.", href: "/practice" },
    teamwork:         { title: "Try Career Instincts",      description: "Play scenario-based situations to build your teamwork and collaboration profile.", href: "/career-instincts" },
    career_dev:       { title: "Complete your profile",     description: "Finish the Career Assessment and career check-in to strengthen your Career Development score.", href: "/aptitude" },
    technology:       { title: "Upload your resume",        description: "A resume analysis will surface technical skills and boost your Technology competency score.", href: "/resume-gap" },
    equity_inclusion: { title: "Explore Career Instincts",  description: "Play through diversity and inclusion scenarios to build your equity score.", href: "/career-instincts" },
  };

  const scoredNace = naceScores.filter((n) => n.score !== null && n.key !== "equity_inclusion");
  const lowestNace = scoredNace.sort((a, b) => (a.score ?? 100) - (b.score ?? 100))[0];
  const nextAction = lowestNace ? { ...ACTION_MAP[lowestNace.key], naceKey: lowestNace.key, currentScore: lowestNace.score } : null;

  // ── Completeness ──────────────────────────────────────────────────────────

  const completeness = computeCompleteness({
    graduationYear: user.graduationYear ?? null,
    major: user.major ?? null,
    targetRole: user.targetRole ?? null,
    targetIndustry: user.targetIndustry ?? null,
    interviewCount: interviewSeg.count,
    networkingCount: networkingSeg.count,
    publicSpeakingCount: publicSpeakingSeg.count,
    hasAptitude: !!aptitudeResult,
    hasCareerCheckIn: !!careerCheckIn,
    preCollegeDone,
    duringCollegeDone,
    postCollegeDone,
    hasInterviewActivity: interviewActivities.length > 0,
    hasResumeAnalysis: resumeAnalyses.length > 0,
  });

  // ── Build response ────────────────────────────────────────────────────────

  const payload = {
    profile: {
      name: user.name ?? null,
      email: user.email ?? null,
      graduationYear: user.graduationYear ?? null,
      major: user.major ?? null,
      targetRole: user.targetRole ?? null,
      targetIndustry: user.targetIndustry ?? null,
      memberSince: user.createdAt,
    },

    speaking: {
      interview: interviewSeg,
      networking: networkingSeg,
      publicSpeaking: publicSpeakingSeg,
    },

    aptitude: aptitudeResult
      ? {
          primary: aptitudeResult.primary,
          secondary: aptitudeResult.secondary,
          scores: aptitudeResult.scores,
          completedAt: aptitudeResult.createdAt,
        }
      : null,

    careerCheckIn: careerCheckIn ?? null,

    checklist: {
      preCollege: { total: 8, done: preCollegeDone },
      duringCollege: { total: 10, done: duringCollegeDone },
      postCollege: { total: 8, done: postCollegeDone },
      financialLiteracy: { total: 40, done: finlitDone },
    },

    interviewPipeline: {
      total: interviewActivities.length,
      byStage,
      offers,
      accepted,
      activities: interviewActivities,
    },

    skills: {
      byCategory,
      total: studentSkills.length,
    },

    resumeHistory: resumeAnalyses,

    naceScores,
    signalScore,
    nextAction,

    faceMetrics: faceMetricsAggregate,

    instincts: {
      sessions: instinctSessions,
      dimensions: instinctDimensionsAggregate,
      totalXp: instinctSessions.reduce((s, sess) => s + (sess.xpEarned ?? 0), 0),
    },

    completeness,
  };

  return NextResponse.json(payload);
}
