import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { composeRichFeedback } from "@/app/lib/feedback/composer";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Low-entropy random in [min, max) */
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function r1(n: number) {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// Prisma helpers
// ---------------------------------------------------------------------------

async function ensureUser(params: {
  tenantId: string;
  name: string;
  email: string;
  demoPersona: string;
}) {
  const existing = await prisma.user.findFirst({ where: { email: params.email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { name: params.name, demoPersona: params.demoPersona, tenantId: params.tenantId },
    });
    return existing;
  }
  return prisma.user.create({
    data: {
      tenantId: params.tenantId,
      name: params.name,
      email: params.email,
      demoPersona: params.demoPersona,
    },
  });
}

async function ensureMembership(tenantId: string, userId: string) {
  const existing = await prisma.tenantMembership.findFirst({ where: { tenantId, userId } });
  if (existing) return existing;
  return prisma.tenantMembership.create({
    data: { tenantId, userId, role: "student", status: "active", isDefault: true },
  });
}

async function ensureJobProfile(params: {
  userId: string;
  tenantId: string;
  title: string;
  company: string;
  roleType: string;
  jobDescription: string;
}) {
  const existing = await prisma.jobProfile.findFirst({
    where: {
      userId: params.userId,
      tenantId: params.tenantId,
      title: params.title,
      company: params.company,
      deletedAt: null,
    },
  });
  if (existing) return existing;
  return prisma.jobProfile.create({
    data: {
      userId: params.userId,
      tenantId: params.tenantId,
      title: params.title,
      company: params.company,
      roleType: params.roleType,
      jobDescription: params.jobDescription,
    },
  });
}

// ---------------------------------------------------------------------------
// Feedback builder — builds normalized JSON inline then passes to composeRichFeedback
// ---------------------------------------------------------------------------

function buildFeedback(params: {
  framework: "star" | "technical_explanation" | "experience_depth";
  jobDesc: string;
  question: string;
  transcript: string;
  overallScore: number;       // 0-10
  communication: number;      // 0-10
  confidence: number;         // 0-10
  closingImpact: number;      // 0-10
  wpm: number;
  fillersPer100: number;
  monotoneScore: number;      // 0-10
  starSubscores?: { S: number; T: number; A: number; R: number };
  strengths: string[];
  improvements: string[];
  confidenceExplanation: string;
  betterAnswer: string;
  keywords_used: string[];
  keywords_missing: string[];
  trajectoryNote: string | null;
  milestoneNote: string | null;
  prevScore?: number | null;
  prevAttemptCount?: number | null;
}) {
  const wc = countWords(params.transcript);
  const fillerTotal = Math.max(1, Math.round((params.fillersPer100 / 100) * wc));
  const fillersPer100Words = wc > 0 ? r1((fillerTotal / wc) * 100) : params.fillersPer100;

  const relevanceScore = r1(clamp(
    params.communication * 0.45 + params.closingImpact * 0.35 + params.confidence * 0.20 + rand(-0.4, 0.4),
    4.0, 9.8
  ));
  const directnessScore = r1(clamp(
    params.communication * 0.6 + params.confidence * 0.4 + rand(-0.5, 0.5),
    4.0, 9.8
  ));
  const completenessScore = r1(clamp(
    params.communication * 0.45 + params.closingImpact * 0.55 + rand(-0.5, 0.5),
    4.0, 9.8
  ));
  const offTopicScore = r1(clamp(
    params.communication * 0.7 + params.confidence * 0.3 + rand(-0.4, 0.4),
    4.0, 9.8
  ));

  // Prosody fields for delivery
  const pitchStd = r1(clamp(45 - params.monotoneScore * 3.2 + rand(-3, 3), 5, 45));
  const energyVariation = r1(clamp(0.18 - params.monotoneScore * 0.012 + rand(-0.02, 0.02), 0.04, 0.18));

  const normalized: any = {
    score: params.overallScore,
    communication_score: params.communication,
    confidence_score: params.confidence,
    confidence_explanation: params.confidenceExplanation,
    strengths: params.strengths,
    improvements: params.improvements,
    better_answer: params.betterAnswer,
    keywords_used: params.keywords_used,
    keywords_missing: params.keywords_missing,
    trajectory_note: params.trajectoryNote,
    milestone_note: params.milestoneNote,
    relevance: {
      relevance_score: relevanceScore,
      directness_score: directnessScore,
      completeness_score: completenessScore,
      off_topic_score: offTopicScore,
      answered_question: params.communication >= 5.5,
    },
    fillerStats: {
      total: fillerTotal,
      wordCount: wc,
      fillersPer100Words,
      perFiller: {
        um: Math.round(fillerTotal * 0.35),
        uh: Math.round(fillerTotal * 0.25),
        like: Math.round(fillerTotal * 0.28),
        "you know": Math.round(fillerTotal * 0.12),
      },
    },
    deliveryMetrics: {
      wpm: params.wpm,
      acoustics: {
        monotoneScore: params.monotoneScore,
        pitchStd,
        pitchMean: r1(rand(130, 190)),
        energyVariation,
        energyDrift: r1(rand(-0.2, 0.2)),
      },
    },
  };

  if (params.framework === "star" && params.starSubscores) {
    normalized.star = {
      situation: {
        score: params.starSubscores.S,
        feedback: params.starSubscores.S >= 7
          ? "Context is set clearly and efficiently."
          : "Situation is vague — add one concrete detail about stakes or scope.",
      },
      task: {
        score: params.starSubscores.T,
        feedback: params.starSubscores.T >= 7
          ? "Your ownership of the task is clear."
          : "State your specific responsibility more explicitly.",
      },
      action: {
        score: params.starSubscores.A,
        feedback: params.starSubscores.A >= 7
          ? "Actions are concrete and show real decision-making."
          : "Use stronger verbs; make the steps more specific.",
      },
      result: {
        score: params.starSubscores.R,
        feedback: params.starSubscores.R >= 7
          ? "Strong result with measurable or meaningful outcome."
          : "Close with a specific, quantified result — what exactly changed?",
      },
    };
  }

  if (params.framework === "technical_explanation") {
    const depth = r1(clamp(params.communication * 0.4 + params.closingImpact * 0.6 + rand(-0.3, 0.3), 4, 9.5));
    normalized.technical_explanation = {
      technical_clarity: r1(clamp(params.communication + rand(-0.3, 0.3), 4, 9.5)),
      technical_accuracy: r1(clamp((params.communication + params.confidence) / 2 + rand(-0.3, 0.3), 4, 9.5)),
      structure: r1(clamp(params.communication + rand(-0.4, 0.4), 4, 9.5)),
      depth,
      practical_reasoning: r1(clamp(params.confidence * 0.35 + params.closingImpact * 0.65 + rand(-0.3, 0.3), 4, 9.5)),
    };
  }

  if (params.framework === "experience_depth") {
    normalized.experience_depth = {
      experience_depth: r1(clamp((params.communication + params.confidence) / 2 + rand(-0.3, 0.3), 4, 9.5)),
      specificity: r1(clamp(params.communication + rand(-0.3, 0.3), 4, 9.5)),
      tool_fluency: r1(clamp((params.communication + params.confidence) / 2 + rand(-0.3, 0.3), 4, 9.5)),
      business_impact: r1(clamp(params.closingImpact + rand(-0.3, 0.3), 4, 9.5)),
      example_quality: r1(clamp(params.communication * 0.45 + params.closingImpact * 0.55 + rand(-0.3, 0.3), 4, 9.5)),
    };
  }

  return composeRichFeedback({
    framework: params.framework,
    jobDesc: params.jobDesc,
    question: params.question,
    transcript: params.transcript,
    deliveryMetrics: {
      wpm: params.wpm,
      acoustics: {
        monotoneScore: params.monotoneScore,
        pitchStd,
        energyVariation,
      },
    },
    fillerStats: {
      total: fillerTotal,
      wordCount: wc,
      fillersPer100Words,
      perFiller: normalized.fillerStats.perFiller,
    },
    normalized,
    prevScore: params.prevScore ?? null,
    prevAttemptCount: params.prevAttemptCount ?? null,
  });
}

// ---------------------------------------------------------------------------
// Timestamps: spread attempts realistically
// ---------------------------------------------------------------------------

/** For a student with N attempts, returns Date objects spread over `spanDays` days ending today */
function spreadTimestamps(count: number, spanDays: number, gapVariance = 0.3): Date[] {
  const now = Date.now();
  const stepMs = (spanDays * 24 * 60 * 60 * 1000) / Math.max(count - 1, 1);
  return Array.from({ length: count }).map((_, i) => {
    const jitter = stepMs * gapVariance * (Math.random() - 0.5);
    const ms = now - (spanDays * 24 * 60 * 60 * 1000) + i * stepMs + jitter;
    return new Date(ms);
  });
}

// ---------------------------------------------------------------------------
// ============================================================
// FEATURED STUDENTS — 5 persona-driven community college students
// ============================================================
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 1. Maria Santos — struggling improver
// ---------------------------------------------------------------------------
async function seedMariaSantos(tenantId: string) {
  const user = await ensureUser({
    tenantId,
    name: "Maria Santos",
    email: "maria@demo-college.edu",
    demoPersona: "Struggling Improver — Healthcare Admin",
  });
  await ensureMembership(tenantId, user.id);

  const profile = await ensureJobProfile({
    userId: user.id,
    tenantId,
    title: "Medical Office Coordinator",
    company: "Regional Health System",
    roleType: "operations",
    jobDescription:
      "Coordinate patient scheduling, manage front-desk operations, support billing and insurance verification, and ensure smooth clinic workflows across a multi-provider primary care office.",
  });

  const questions = [
    "Tell me about a time you handled a difficult patient or customer situation.",
    "Describe a time you had to manage multiple competing priorities.",
    "Tell me about a time you identified and fixed a process problem.",
    "Describe a time you made an error and how you handled it.",
    "Tell me about a time you had to learn a new system quickly.",
    "Describe a time you went above and beyond for someone you were serving.",
  ];

  // 10 attempts, score 4.8 → 7.3 (strong upward)
  const overallSeq  = [4.8, 5.0, 5.2, 5.5, 5.8, 6.1, 6.4, 6.7, 7.0, 7.3];
  const commSeq     = [5.0, 5.2, 5.4, 5.7, 6.0, 6.3, 6.6, 6.9, 7.1, 7.4];
  const confSeq     = [4.5, 4.7, 4.9, 5.2, 5.5, 5.8, 6.1, 6.4, 6.8, 7.1];
  const wpmSeq      = [172, 169, 166, 163, 160, 157, 153, 150, 147, 145];
  const fillersSeq  = [7.8, 7.2, 6.9, 6.2, 5.5, 4.8, 4.0, 3.2, 2.6, 2.1];
  const monotoneSeq = [5.2, 5.0, 4.8, 4.5, 4.2, 3.9, 3.6, 3.3, 3.0, 2.7];
  const closingSeq  = [2.8, 3.0, 3.3, 3.8, 4.2, 5.0, 5.8, 6.4, 6.9, 7.2];
  const starS = [5.5, 5.7, 6.0, 6.3, 6.5, 6.8, 7.0, 7.2, 7.4, 7.6];
  const starT = [5.0, 5.3, 5.5, 5.8, 6.1, 6.4, 6.7, 7.0, 7.2, 7.4];
  const starA = [4.8, 5.0, 5.3, 5.6, 5.9, 6.3, 6.7, 7.0, 7.3, 7.5];
  const starR = [2.2, 2.5, 2.8, 3.4, 4.0, 4.8, 5.6, 6.2, 6.8, 7.2];

  const earlyTranscripts = [
    "Um, so there was this patient who was really upset about her appointment and like, she was at the front desk being really loud and I kind of didn't know what to do. Um, I tried to calm her down and like, brought her to a quiet area. And um, I talked to her and eventually she kind of settled down. It worked out I think.",
    "I had like a lot of things happening at once — phones ringing, patients checking in, and a doctor needed something from me. Um, I tried to handle everything but it was kind of overwhelming. I got through it eventually and um, nothing went too badly I think.",
    "There was this problem with how we were scheduling appointments and um, it was causing patients to wait a long time. I noticed it was a problem and mentioned it to my supervisor. Um, I think they made some changes after that.",
  ];

  const lateTranscripts = [
    "A patient came to the front desk very distressed because she had been given the wrong appointment time for a specialist referral. My task was to resolve it immediately while keeping the waiting room calm. I pulled up her chart, confirmed the referring doctor's instructions, called the specialist office directly, and secured a same-day slot at 3 PM. I stayed on the line until it was confirmed and handed the patient a written confirmation before she left. She thanked the office manager later that week, and the situation became part of our new same-day resolution protocol.",
    "During a week when we were short-staffed, I was handling check-in, phones, and insurance verification at the same time. I created a quick triage system on a notepad — incoming calls got a callback time, walk-ins were triaged by appointment urgency, and insurance issues were flagged for end-of-day batch processing. We processed 47 patients that day with no appointment gaps and no billing backlogs. The office manager said it was one of our smoothest short-staffed days in months.",
    "I noticed our appointment cancellation rate was high on Monday mornings — about 30% of our 9 AM slots. I tracked it over three weeks and found most cancellations came from patients who had forgotten to confirm. I proposed a Friday reminder call workflow to my supervisor, piloted it for four weeks, and our Monday cancellation rate dropped to 11%. We now do Friday confirmations for the whole week.",
  ];

  const timestamps = spreadTimestamps(10, 84, 0.3);

  for (let i = 0; i < 10; i++) {
    const isEarly = i < 5;
    const transcriptPool = isEarly ? earlyTranscripts : lateTranscripts;
    const transcript = transcriptPool[i % transcriptPool.length];

    const trajectoryNote = i === 0
      ? "First attempt: answer lacks STAR structure and result is missing. Focus: add a specific outcome to every answer before the next session."
      : i === 4
      ? "Maria is consistently adding context and action detail. Result statements are still the weakest component — coach specifically on closing with a measurable or meaningful outcome."
      : i === 9
      ? "Strong improvement over 10 attempts. STAR structure is now reliable. Result statements have improved dramatically. Maria is approaching interview-ready for entry-level healthcare admin roles."
      : null;

    const feedback = buildFeedback({
      framework: "star",
      jobDesc: profile.jobDescription,
      question: questions[i % questions.length],
      transcript,
      overallScore: overallSeq[i],
      communication: commSeq[i],
      confidence: confSeq[i],
      closingImpact: closingSeq[i],
      wpm: wpmSeq[i],
      fillersPer100: fillersSeq[i],
      monotoneScore: monotoneSeq[i],
      starSubscores: { S: starS[i], T: starT[i], A: starA[i], R: starR[i] },
      strengths: isEarly
        ? ["Shows genuine care for patients.", "Willing to engage with the question."]
        : ["Strong specific example with clear ownership.", "Result is measurable and memorable.", "Delivery is calm and professional."],
      improvements: isEarly
        ? [
            "Result is missing — always end with what specifically changed.",
            "High filler rate — pause instead of saying 'um'.",
            "Situation setup is vague — add one specific detail about stakes.",
          ]
        : [
            "Minor: briefly acknowledge the team involved in the solution.",
            "Consider adding one sentence on what you'd replicate in a future role.",
          ],
      confidenceExplanation: isEarly
        ? "Voice sounds uncertain and rushed. Filler words signal anxiety. Try writing the answer outline before speaking — structure creates confidence."
        : "Delivery is measured and assured. Clear ownership language throughout. This is the right register for a healthcare admin interview.",
      betterAnswer: isEarly
        ? "Describe the situation in one sentence, state your specific responsibility, walk through the concrete steps you took, then close with a specific outcome — what changed for the patient or for the office."
        : "Your answer is strong. One enhancement: after the result, add one sentence about what you'd carry into your next role from this experience.",
      keywords_used: isEarly ? ["patient", "appointment"] : ["patient", "scheduling", "protocol", "cancellation rate"],
      keywords_missing: isEarly ? ["specific outcome", "result", "metric"] : ["team coordination"],
      trajectoryNote,
      milestoneNote: i === 9 ? "Highest score in Maria's trajectory. Answer demonstrates patient-centered problem solving with measurable outcomes. Interview-ready for medical office coordinator roles." : null,
      prevScore: i > 0 ? overallSeq[i - 1] : null,
      prevAttemptCount: i,
    });

    await prisma.attempt.create({
      data: {
        userId: user.id,
        tenantId,
        ts: timestamps[i],
        question: questions[i % questions.length],
        questionCategory: "behavioral",
        questionSource: "seeded",
        evaluationFramework: "star",
        transcript,
        inputMethod: "spoken",
        score: overallSeq[i],
        communicationScore: commSeq[i],
        confidenceScore: confSeq[i],
        wpm: wpmSeq[i],
        prosody: {
          monotoneScore: monotoneSeq[i],
          pitchStd: r1(clamp(45 - monotoneSeq[i] * 3.2 + rand(-2, 2), 5, 42)),
          pitchMean: r1(rand(165, 205)),
          energyVariation: r1(clamp(0.18 - monotoneSeq[i] * 0.012, 0.05, 0.17)),
          energyDrift: r1(rand(-0.15, 0.2)),
        },
        deliveryMetrics: {
          wpm: wpmSeq[i],
          pauseCount: Math.round(rand(2, 7)),
          longPauseCount: Math.round(rand(0, 2)),
          avgPauseMs: Math.round(rand(400, 900)),
          fillerCount: Math.max(1, Math.round((fillersSeq[i] / 100) * countWords(transcript))),
          wordCount: countWords(transcript),
        },
        feedback,
        jobDesc: profile.jobDescription,
        jobProfileId: profile.id,
        jobProfileTitle: profile.title,
        jobProfileCompany: profile.company,
        jobProfileRoleType: profile.roleType,
      },
    });
  }

  return user;
}

// ---------------------------------------------------------------------------
// 2. James Okafor — average plateau
// ---------------------------------------------------------------------------
async function seedJamesOkafor(tenantId: string) {
  const user = await ensureUser({
    tenantId,
    name: "James Okafor",
    email: "james@demo-college.edu",
    demoPersona: "Average Plateau — IT Support",
  });
  await ensureMembership(tenantId, user.id);

  const profile = await ensureJobProfile({
    userId: user.id,
    tenantId,
    title: "IT Support Specialist",
    company: "County Government",
    roleType: "operations",
    jobDescription:
      "Provide first and second-tier technical support to county employees, troubleshoot hardware and software issues, manage help desk tickets, and support onboarding of new staff technology setups.",
  });

  const questions = [
    "Tell me about a time you resolved a technical issue under pressure.",
    "Describe a time you had to explain a technical concept to a non-technical user.",
    "Tell me about a time you prioritized multiple support tickets at once.",
    "Describe a situation where you went the extra mile to help a user.",
    "Tell me about a time you identified a recurring problem and addressed the root cause.",
    "Describe a time you had to quickly learn a new tool or system.",
  ];

  // 10 attempts, 6.3-6.8 flat — reliable but not growing
  const overallSeq  = [6.3, 6.5, 6.4, 6.7, 6.5, 6.6, 6.3, 6.8, 6.5, 6.7];
  const commSeq     = [6.5, 6.7, 6.6, 6.9, 6.7, 6.8, 6.5, 7.0, 6.7, 6.9];
  const confSeq     = [6.2, 6.4, 6.3, 6.6, 6.4, 6.5, 6.2, 6.7, 6.4, 6.6];
  const wpmSeq      = [148, 150, 147, 152, 149, 151, 148, 153, 150, 152];
  const fillersSeq  = [3.8, 3.5, 3.9, 3.3, 3.7, 3.5, 3.8, 3.2, 3.6, 3.4];
  const monotoneSeq = [4.8, 4.6, 4.9, 4.5, 4.7, 4.5, 4.8, 4.4, 4.6, 4.5];
  const closingSeq  = [5.2, 5.4, 5.3, 5.6, 5.4, 5.5, 5.2, 5.7, 5.4, 5.6];
  const starS = [6.5, 6.7, 6.6, 6.9, 6.7, 6.8, 6.5, 7.0, 6.7, 6.9];
  const starT = [6.3, 6.5, 6.4, 6.7, 6.5, 6.6, 6.3, 6.8, 6.5, 6.7];
  const starA = [6.4, 6.6, 6.5, 6.8, 6.6, 6.7, 6.4, 6.9, 6.6, 6.8];
  const starR = [5.5, 5.7, 5.6, 5.9, 5.7, 5.8, 5.5, 6.0, 5.7, 5.9];

  const transcripts = [
    "I had a situation at my last help desk job where a county employee's computer wouldn't connect to the network. I went through the standard troubleshooting steps — checked the cable, restarted the network adapter, verified the IP settings. Turned out the DHCP lease had expired because of a configuration issue. I renewed it and got her back online. She was pretty relieved because she had a meeting coming up.",
    "I had a staff member who needed to understand how to set up two-factor authentication on their county email. She wasn't very tech-savvy and was getting frustrated. I walked her through it step by step and used an analogy about a key and a deadbolt to explain why it's secure. She got it set up and said it made more sense after that.",
    "I was managing about 12 open tickets at once during a system upgrade rollout. I categorized them by urgency — anything blocking active work got priority, then new device setups, then software installs. I worked through them in order and escalated one ticket to the network team that was outside my scope. Most got resolved that day.",
  ];

  const timestamps = spreadTimestamps(10, 90, 0.35);

  for (let i = 0; i < 10; i++) {
    const trajectoryNote = i === 4
      ? "James is producing reliable, competent answers consistently. The plateau pattern suggests he has found a comfortable floor but isn't being challenged to push past it. Recommended: focus coaching on adding a quantified result and a reflection statement to break the ceiling."
      : i === 9
      ? "Plateau persists after 10 attempts. Core STAR structure is solid but result specificity has not improved. Direct coaching intervention recommended: assign one practice session focused exclusively on closing impact."
      : null;

    const feedback = buildFeedback({
      framework: "star",
      jobDesc: profile.jobDescription,
      question: questions[i % questions.length],
      transcript: transcripts[i % transcripts.length],
      overallScore: overallSeq[i],
      communication: commSeq[i],
      confidence: confSeq[i],
      closingImpact: closingSeq[i],
      wpm: wpmSeq[i],
      fillersPer100: fillersSeq[i],
      monotoneScore: monotoneSeq[i],
      starSubscores: { S: starS[i], T: starT[i], A: starA[i], R: starR[i] },
      strengths: [
        "Clear and methodical action steps — demonstrates structured troubleshooting.",
        "STAR components are all present and logically sequenced.",
        "Relevant technical vocabulary used appropriately.",
      ],
      improvements: [
        "Result needs a quantified or time-bound outcome — 'she was relieved' doesn't land as strongly as 'she was back online in 8 minutes before her meeting.'",
        "Closing impact is consistently your weakest component — commit to ending with a specific, memorable result.",
        "Consider adding a brief reflection: what would you do the same way next time, and why?",
      ],
      confidenceExplanation:
        "Delivery is measured and calm — James projects competence. The monotone pattern, while not severe, creates a ceiling on perceived enthusiasm. Minor pitch variation on key moments would increase engagement.",
      betterAnswer:
        "Your content is solid. The upgrade: after 'she got it set up,' add the concrete outcome — 'She was able to log in independently within 10 minutes, and I documented the walkthrough for our user guide so we could help future staff faster.'",
      keywords_used: ["IT support", "troubleshooting", "help desk", "county"],
      keywords_missing: ["quantified outcome", "time to resolution", "ticket closure"],
      trajectoryNote,
      milestoneNote: null,
      prevScore: i > 0 ? overallSeq[i - 1] : null,
      prevAttemptCount: i,
    });

    await prisma.attempt.create({
      data: {
        userId: user.id,
        tenantId,
        ts: timestamps[i],
        question: questions[i % questions.length],
        questionCategory: "behavioral",
        questionSource: "seeded",
        evaluationFramework: "star",
        transcript: transcripts[i % transcripts.length],
        inputMethod: "spoken",
        score: overallSeq[i],
        communicationScore: commSeq[i],
        confidenceScore: confSeq[i],
        wpm: wpmSeq[i],
        prosody: {
          monotoneScore: monotoneSeq[i],
          pitchStd: r1(clamp(45 - monotoneSeq[i] * 3.2 + rand(-2, 2), 10, 28)),
          pitchMean: r1(rand(130, 165)),
          energyVariation: r1(clamp(0.18 - monotoneSeq[i] * 0.012, 0.05, 0.12)),
          energyDrift: r1(rand(-0.1, 0.1)),
        },
        deliveryMetrics: {
          wpm: wpmSeq[i],
          pauseCount: Math.round(rand(4, 8)),
          longPauseCount: Math.round(rand(0, 1)),
          avgPauseMs: Math.round(rand(450, 750)),
          fillerCount: Math.max(1, Math.round((fillersSeq[i] / 100) * countWords(transcripts[i % transcripts.length]))),
          wordCount: countWords(transcripts[i % transcripts.length]),
        },
        feedback,
        jobDesc: profile.jobDescription,
        jobProfileId: profile.id,
        jobProfileTitle: profile.title,
        jobProfileCompany: profile.company,
        jobProfileRoleType: profile.roleType,
      },
    });
  }

  return user;
}

// ---------------------------------------------------------------------------
// 3. Priya Nair — strong communicator, weak structure
// ---------------------------------------------------------------------------
async function seedPriyaNair(tenantId: string) {
  const user = await ensureUser({
    tenantId,
    name: "Priya Nair",
    email: "priya@demo-college.edu",
    demoPersona: "Strong Comm / Weak Structure — Business Admin",
  });
  await ensureMembership(tenantId, user.id);

  const profile = await ensureJobProfile({
    userId: user.id,
    tenantId,
    title: "Business Office Administrator",
    company: "Community Credit Union",
    roleType: "finance",
    jobDescription:
      "Support daily branch operations including member account management, loan processing, cash handling, compliance documentation, and cross-department coordination for a community-focused credit union.",
  });

  const questions = [
    "Tell me about a time you handled a sensitive member or client situation.",
    "Describe your experience managing financial records or documentation.",
    "Tell me about a time you caught an error before it became a problem.",
    "Describe a time you had to balance accuracy with speed.",
    "Tell me about a time you worked with a difficult colleague.",
    "Describe how you stay organized when managing multiple ongoing tasks.",
  ];

  // Communication scores high, structure/closing lower — stays mid-high overall
  const overallSeq  = [6.8, 6.5, 7.1, 6.4, 7.0, 6.6, 7.2, 6.5, 7.1, 6.8];
  const commSeq     = [8.2, 7.9, 8.4, 7.8, 8.3, 8.0, 8.5, 7.9, 8.4, 8.1];
  const confSeq     = [7.5, 7.2, 7.8, 7.1, 7.6, 7.3, 7.9, 7.2, 7.7, 7.4];
  const wpmSeq      = [144, 147, 142, 148, 143, 146, 141, 147, 143, 145];
  const fillersSeq  = [1.8, 2.1, 1.6, 2.3, 1.7, 2.0, 1.5, 2.2, 1.8, 1.9];
  const monotoneSeq = [2.2, 2.5, 2.0, 2.7, 2.1, 2.4, 1.9, 2.6, 2.2, 2.3];
  const closingSeq  = [4.2, 3.8, 4.8, 3.5, 4.6, 3.9, 5.0, 3.7, 4.7, 4.2];
  const starS = [8.0, 7.7, 8.2, 7.6, 8.1, 7.8, 8.3, 7.7, 8.2, 7.9];
  const starT = [7.5, 7.2, 7.8, 7.0, 7.6, 7.3, 7.9, 7.2, 7.7, 7.4];
  const starA = [7.2, 6.9, 7.5, 6.7, 7.3, 7.0, 7.6, 6.9, 7.4, 7.1];
  const starR = [3.8, 3.5, 4.2, 3.2, 4.0, 3.6, 4.5, 3.4, 4.1, 3.8];

  const transcripts = [
    "Oh, I love this question because I had a really meaningful experience at my last job at the community bank. There was a member who came in absolutely distraught — she had just lost her husband and was trying to sort out the accounts and she didn't know where to start. I sat with her for over an hour. We went through every account together. I explained everything in plain language and I made sure she left feeling like she had a plan. She actually came back two weeks later to say thank you, which meant a lot to me. I really believe that financial institutions have a responsibility to be human when people are going through hard times.",
    "I'm very detail-oriented when it comes to documentation, and it actually caught a significant error once. We had a loan application where the income verification didn't match between two submitted documents, and I flagged it before it went to underwriting. My supervisor said it would have caused a compliance issue downstream. I really pride myself on catching those things — I believe accuracy is the foundation of trust in financial services, especially for a credit union where members are counting on us.",
    "This is something I deal with all the time. In my current role, accuracy is non-negotiable but so is turnaround time. I've developed a system where I complete the high-stakes documentation first thing when I'm freshest, then handle routine transactions in the afternoon. I also double-check my work on anything that involves member funds. I find that being organized about my own workflow means I rarely have to choose between speed and accuracy.",
  ];

  const timestamps = spreadTimestamps(10, 75, 0.3);

  for (let i = 0; i < 10; i++) {
    const trajectoryNote = i === 3
      ? "High communication scores confirm Priya's natural storytelling ability. The persistent gap is in result specificity — Situation and Task are vivid but the closing outcome rarely lands with a concrete metric. Coaching recommendation: end every answer with 'The result was [specific thing that changed].'"
      : i === 9
      ? "Communication remains a clear strength — top of the cohort. Structure pattern has not closed: result scores remain 2-3 points below communication scores after 10 attempts. Focused coaching on STAR completion required."
      : null;

    const feedback = buildFeedback({
      framework: "star",
      jobDesc: profile.jobDescription,
      question: questions[i % questions.length],
      transcript: transcripts[i % transcripts.length],
      overallScore: overallSeq[i],
      communication: commSeq[i],
      confidence: confSeq[i],
      closingImpact: closingSeq[i],
      wpm: wpmSeq[i],
      fillersPer100: fillersSeq[i],
      monotoneScore: monotoneSeq[i],
      starSubscores: { S: starS[i], T: starT[i], A: starA[i], R: starR[i] },
      strengths: [
        "Exceptional communication — warm, engaging, and memorable storytelling.",
        "Situation and context are vivid and specific.",
        "Authentic delivery that builds trust with interviewers.",
      ],
      improvements: [
        "Result is consistently the weakest component — close every answer with a specific, concrete outcome.",
        "Avoid editorial commentary after the result ('I really believe...') — let the outcome speak for itself.",
        "Add one quantified detail to the result: time saved, error rate reduced, member satisfaction, etc.",
      ],
      confidenceExplanation:
        "Delivery is warm, natural, and compelling. Priya's communication is a genuine strength. The gap is structural, not vocal — she tells great stories that end too softly. A strong result close would make these answers top-tier.",
      betterAnswer:
        "Your story is excellent. Change the ending: instead of 'She came back to say thank you,' close with 'She came back two weeks later to say it was the first time she felt she understood her own finances — and she referred her sister to the branch the following month.' Specific impact makes it memorable.",
      keywords_used: ["credit union", "documentation", "accuracy", "member", "compliance"],
      keywords_missing: ["quantified result", "specific outcome", "metric"],
      trajectoryNote,
      milestoneNote: null,
      prevScore: i > 0 ? overallSeq[i - 1] : null,
      prevAttemptCount: i,
    });

    await prisma.attempt.create({
      data: {
        userId: user.id,
        tenantId,
        ts: timestamps[i],
        question: questions[i % questions.length],
        questionCategory: "behavioral",
        questionSource: "seeded",
        evaluationFramework: "star",
        transcript: transcripts[i % transcripts.length],
        inputMethod: "spoken",
        score: overallSeq[i],
        communicationScore: commSeq[i],
        confidenceScore: confSeq[i],
        wpm: wpmSeq[i],
        prosody: {
          monotoneScore: monotoneSeq[i],
          pitchStd: r1(clamp(45 - monotoneSeq[i] * 3.2 + rand(-2, 3), 22, 45)),
          pitchMean: r1(rand(160, 210)),
          energyVariation: r1(clamp(0.18 - monotoneSeq[i] * 0.012, 0.12, 0.18)),
          energyDrift: r1(rand(-0.1, 0.15)),
        },
        deliveryMetrics: {
          wpm: wpmSeq[i],
          pauseCount: Math.round(rand(5, 10)),
          longPauseCount: Math.round(rand(0, 1)),
          avgPauseMs: Math.round(rand(500, 900)),
          fillerCount: Math.max(1, Math.round((fillersSeq[i] / 100) * countWords(transcripts[i % transcripts.length]))),
          wordCount: countWords(transcripts[i % transcripts.length]),
        },
        feedback,
        jobDesc: profile.jobDescription,
        jobProfileId: profile.id,
        jobProfileTitle: profile.title,
        jobProfileCompany: profile.company,
        jobProfileRoleType: profile.roleType,
      },
    });
  }

  return user;
}

// ---------------------------------------------------------------------------
// 4. Derek Williams — analytical flat (good content, monotone delivery)
// ---------------------------------------------------------------------------
async function seedDerekWilliams(tenantId: string) {
  const user = await ensureUser({
    tenantId,
    name: "Derek Williams",
    email: "derek@demo-college.edu",
    demoPersona: "Analytical Flat — Early Childhood Education",
  });
  await ensureMembership(tenantId, user.id);

  const profile = await ensureJobProfile({
    userId: user.id,
    tenantId,
    title: "Early Childhood Program Coordinator",
    company: "County School District",
    roleType: "general",
    jobDescription:
      "Coordinate early childhood education programs across multiple school sites, support lead teachers with curriculum planning, manage enrollment and compliance documentation, and serve as the primary liaison between families and the district.",
  });

  const questions = [
    "Tell me about a time you managed a challenging situation involving a child or family.",
    "Describe a time you coordinated across multiple teams or sites.",
    "Tell me about a time you identified a gap in a program and took steps to address it.",
    "Describe how you ensure compliance with state licensing and reporting requirements.",
    "Tell me about a time you had to deliver difficult news to a parent or guardian.",
    "Describe a time you onboarded or trained a new staff member.",
  ];

  // Good scores, flat trajectory — content is strong but delivery is persistently monotone
  const overallSeq  = [6.9, 7.0, 6.8, 7.1, 6.9, 7.0, 7.2, 7.0, 7.1, 7.2];
  const commSeq     = [7.4, 7.5, 7.3, 7.6, 7.4, 7.5, 7.7, 7.5, 7.6, 7.7];
  const confSeq     = [6.8, 6.9, 6.7, 7.0, 6.8, 6.9, 7.1, 6.9, 7.0, 7.1];
  const wpmSeq      = [138, 140, 137, 141, 139, 140, 142, 139, 141, 142];
  const fillersSeq  = [1.5, 1.4, 1.6, 1.3, 1.5, 1.4, 1.3, 1.5, 1.4, 1.3];
  const monotoneSeq = [7.2, 7.0, 7.4, 6.9, 7.1, 7.0, 6.8, 7.1, 7.0, 6.8];
  const closingSeq  = [6.8, 6.9, 6.7, 7.0, 6.8, 6.9, 7.1, 6.9, 7.0, 7.1];
  const starS = [7.5, 7.6, 7.4, 7.7, 7.5, 7.6, 7.8, 7.6, 7.7, 7.8];
  const starT = [7.2, 7.3, 7.1, 7.4, 7.2, 7.3, 7.5, 7.3, 7.4, 7.5];
  const starA = [7.0, 7.1, 6.9, 7.2, 7.0, 7.1, 7.3, 7.1, 7.2, 7.3];
  const starR = [6.5, 6.6, 6.4, 6.7, 6.5, 6.6, 6.8, 6.6, 6.7, 6.8];

  const transcripts = [
    "I coordinate across six pre-K sites in the district and there was a period when two sites were understaffed at the same time. I identified the gap by reviewing our weekly staffing reports on Monday morning. I contacted our substitute coordinator and arranged coverage at both sites by Tuesday. I also adjusted the master schedule to temporarily redistribute one floating staff member. All six sites maintained licensed ratios throughout the week, which is a compliance requirement we take seriously.",
    "There was a family in our program whose child had significant behavioral needs that weren't being adequately addressed in the classroom. I reviewed the IEP, met with the lead teacher and the district behavior specialist, and together we developed a modified daily schedule with three specific supports built in. I communicated the plan to the parents at a scheduled conference. The child's incident reports decreased by roughly half over the following six weeks and the family expressed relief at the next check-in.",
    "I noticed our program completion documentation was being submitted late at multiple sites, which creates compliance risk with our state licensing office. I created a shared submission calendar with automatic reminders, held a 30-minute training session for site leads, and added a review checkpoint to our monthly coordinators meeting. Our on-time submission rate went from about 71% to 96% over the following quarter.",
  ];

  const timestamps = spreadTimestamps(10, 80, 0.25);

  for (let i = 0; i < 10; i++) {
    const trajectoryNote = i === 4
      ? "Derek's content quality is consistently high — structured answers with good specificity and outcomes. The persistent coaching opportunity is vocal delivery: monotone score has not improved across 5 attempts. Recommend a session focused specifically on vocal emphasis and energy variation."
      : i === 9
      ? "Strong content throughout all 10 attempts. Monotone delivery remains the primary limiter — Derek's answers would be significantly more compelling with added vocal variety. Content is interview-ready; delivery coaching needed."
      : null;

    const feedback = buildFeedback({
      framework: "star",
      jobDesc: profile.jobDescription,
      question: questions[i % questions.length],
      transcript: transcripts[i % transcripts.length],
      overallScore: overallSeq[i],
      communication: commSeq[i],
      confidence: confSeq[i],
      closingImpact: closingSeq[i],
      wpm: wpmSeq[i],
      fillersPer100: fillersSeq[i],
      monotoneScore: monotoneSeq[i],
      starSubscores: { S: starS[i], T: starT[i], A: starA[i], R: starR[i] },
      strengths: [
        "Excellent STAR structure with clear ownership at each stage.",
        "Strong specific metrics — compliance rates, timelines, concrete outcomes.",
        "Demonstrates program management competence clearly.",
      ],
      improvements: [
        "Vocal delivery is flat throughout — vary your tone and pace to emphasize key outcomes.",
        "Slow down slightly before your result statement — a brief pause signals its importance.",
        "Add a moment of warmth when describing family interactions — the content is there, let it come through in your voice.",
      ],
      confidenceExplanation:
        "Derek's content projects real competence, but the flat delivery creates a gap between substance and impact. Interviewers may sense the answer is strong without feeling it. Strategic vocal variation — even one emphasis per sentence — would significantly improve impression.",
      betterAnswer:
        "Your answer is strong. The one change that would make it land harder: when you say 'the child's incident reports decreased by roughly half,' pause briefly before that result and let the number carry weight. That moment of emphasis signals to the interviewer that the outcome matters.",
      keywords_used: ["early childhood", "compliance", "IEP", "staffing", "district"],
      keywords_missing: ["vocal emphasis", "engagement"],
      trajectoryNote,
      milestoneNote: i === 9 ? "Derek's content is among the strongest in the cohort for structure and specificity. Primary development area is delivery coaching, not content." : null,
      prevScore: i > 0 ? overallSeq[i - 1] : null,
      prevAttemptCount: i,
    });

    await prisma.attempt.create({
      data: {
        userId: user.id,
        tenantId,
        ts: timestamps[i],
        question: questions[i % questions.length],
        questionCategory: "behavioral",
        questionSource: "seeded",
        evaluationFramework: "star",
        transcript: transcripts[i % transcripts.length],
        inputMethod: "spoken",
        score: overallSeq[i],
        communicationScore: commSeq[i],
        confidenceScore: confSeq[i],
        wpm: wpmSeq[i],
        prosody: {
          monotoneScore: monotoneSeq[i],
          pitchStd: r1(clamp(45 - monotoneSeq[i] * 3.2 + rand(-1, 1), 4, 12)),
          pitchMean: r1(rand(120, 150)),
          energyVariation: r1(clamp(0.05 + rand(0, 0.02), 0.04, 0.07)),
          energyDrift: r1(rand(-0.05, 0.08)),
        },
        deliveryMetrics: {
          wpm: wpmSeq[i],
          pauseCount: Math.round(rand(5, 9)),
          longPauseCount: Math.round(rand(0, 1)),
          avgPauseMs: Math.round(rand(500, 800)),
          fillerCount: Math.max(1, Math.round((fillersSeq[i] / 100) * countWords(transcripts[i % transcripts.length]))),
          wordCount: countWords(transcripts[i % transcripts.length]),
        },
        feedback,
        jobDesc: profile.jobDescription,
        jobProfileId: profile.id,
        jobProfileTitle: profile.title,
        jobProfileCompany: profile.company,
        jobProfileRoleType: profile.roleType,
      },
    });
  }

  return user;
}

// ---------------------------------------------------------------------------
// 5. Ashley Chen — high performer
// ---------------------------------------------------------------------------
async function seedAshleyChen(tenantId: string) {
  const user = await ensureUser({
    tenantId,
    name: "Ashley Chen",
    email: "ashley@demo-college.edu",
    demoPersona: "High Performer — Healthcare Admin",
  });
  await ensureMembership(tenantId, user.id);

  const profile = await ensureJobProfile({
    userId: user.id,
    tenantId,
    title: "Medical Office Coordinator",
    company: "Valley Medical Group",
    roleType: "operations",
    jobDescription:
      "Lead front-office operations for a multi-provider specialty clinic including patient scheduling, insurance pre-authorization, billing coordination, staff supervision, and compliance reporting.",
  });

  const questions = [
    "Tell me about a time you improved an operational process.",
    "Describe a time you resolved a complex patient or billing issue.",
    "Tell me about a time you supervised or mentored a team member.",
    "Describe a time you managed a high-stakes, time-sensitive situation.",
    "Tell me about a time you identified a compliance risk and took action.",
    "Describe how you build rapport with patients from different backgrounds.",
  ];

  // 8 attempts, 8.0-9.0 consistently excellent
  const overallSeq  = [8.0, 8.2, 8.1, 8.4, 8.3, 8.6, 8.5, 8.8];
  const commSeq     = [8.4, 8.6, 8.5, 8.8, 8.7, 9.0, 8.9, 9.2];
  const confSeq     = [8.2, 8.4, 8.3, 8.6, 8.5, 8.8, 8.7, 9.0];
  const wpmSeq      = [136, 134, 137, 133, 135, 132, 134, 131];
  const fillersSeq  = [0.8, 0.7, 0.9, 0.6, 0.7, 0.5, 0.6, 0.4];
  const monotoneSeq = [2.0, 1.9, 2.1, 1.8, 1.9, 1.7, 1.8, 1.6];
  const closingSeq  = [8.0, 8.2, 8.1, 8.4, 8.3, 8.6, 8.5, 8.8];
  const starS = [8.3, 8.5, 8.4, 8.7, 8.6, 8.9, 8.8, 9.1];
  const starT = [8.1, 8.3, 8.2, 8.5, 8.4, 8.7, 8.6, 8.9];
  const starA = [8.0, 8.2, 8.1, 8.4, 8.3, 8.6, 8.5, 8.8];
  const starR = [8.0, 8.2, 8.1, 8.4, 8.3, 8.6, 8.5, 8.8];

  const transcripts = [
    "Our pre-authorization process was taking an average of four days and causing appointment delays for patients needing specialist referrals. I audited the last 30 pre-auth requests, identified that 60% were being sent incomplete, and created a pre-auth checklist specific to each of our five most common referral types. I trained the front desk in a 45-minute session and monitored completion for two weeks. Our average pre-auth turnaround dropped from four days to 1.5 days, and we eliminated eight patient appointment delays in the first month alone.",
    "A patient came in for a procedure and our system showed her pre-authorization had expired two days prior. The procedure was scheduled for that morning and she had taken a day off work. My task was to resolve it before her 10 AM appointment. I called the insurance company directly, explained the clinical urgency, escalated to a supervisor, and secured a verbal authorization in 35 minutes. I documented everything in the chart and the procedure went forward as scheduled. The patient said it was the first time a medical office had actually solved a problem for her rather than just telling her to reschedule.",
    "A new front-desk coordinator was struggling with insurance verification during her first two weeks and was slowing down the morning check-in flow. I paired with her for two mornings, walked through my process step by step, then created a one-page quick-reference card for the six insurance types we see most often. By her third week she was handling verification independently. Her accuracy rate was at 94% by the end of the month, which matched our team average.",
  ];

  const timestamps = spreadTimestamps(8, 60, 0.2);

  for (let i = 0; i < 8; i++) {
    const feedback = buildFeedback({
      framework: "star",
      jobDesc: profile.jobDescription,
      question: questions[i % questions.length],
      transcript: transcripts[i % transcripts.length],
      overallScore: overallSeq[i],
      communication: commSeq[i],
      confidence: confSeq[i],
      closingImpact: closingSeq[i],
      wpm: wpmSeq[i],
      fillersPer100: fillersSeq[i],
      monotoneScore: monotoneSeq[i],
      starSubscores: { S: starS[i], T: starT[i], A: starA[i], R: starR[i] },
      strengths: [
        "Exceptional STAR structure with measurable, specific outcomes at every stage.",
        "Confident, measured delivery — authoritative without being cold.",
        "Role-aligned language that demonstrates real operational knowledge.",
      ],
      improvements: [
        "Minor: consider adding one sentence on what this experience taught you or how it shapes your approach now.",
        "Action section is comprehensive — could briefly note how you handled any stakeholder pushback.",
      ],
      confidenceExplanation:
        "Delivery is assured, natural, and trust-building. Controlled pacing, declarative language, and zero hedging. This is exactly what hiring managers in clinical operations environments are looking for.",
      betterAnswer:
        "This is a strong answer. One optional enhancement: after the result, add a single sentence about what you'd carry forward — 'I now do a monthly audit of pre-auth completion rates so we catch these gaps before they reach patients.' That shows proactive process thinking.",
      keywords_used: ["pre-authorization", "insurance", "patient", "medical office", "compliance", "training"],
      keywords_missing: ["reflection", "process ownership"],
      trajectoryNote: i === 7
        ? "Ashley is the benchmark student in this cohort. Her answers demonstrate both operational mastery and patient-centered communication at a level appropriate for senior clinic coordinator roles."
        : null,
      milestoneNote: i === 7 ? "Highest score in cohort. Interview-ready for medical office coordinator and clinic operations supervisor roles." : null,
      prevScore: i > 0 ? overallSeq[i - 1] : null,
      prevAttemptCount: i,
    });

    await prisma.attempt.create({
      data: {
        userId: user.id,
        tenantId,
        ts: timestamps[i],
        question: questions[i % questions.length],
        questionCategory: "behavioral",
        questionSource: "seeded",
        evaluationFramework: "star",
        transcript: transcripts[i % transcripts.length],
        inputMethod: "spoken",
        score: overallSeq[i],
        communicationScore: commSeq[i],
        confidenceScore: confSeq[i],
        wpm: wpmSeq[i],
        prosody: {
          monotoneScore: monotoneSeq[i],
          pitchStd: r1(clamp(45 - monotoneSeq[i] * 3.2 + rand(-2, 2), 26, 44)),
          pitchMean: r1(rand(155, 195)),
          energyVariation: r1(clamp(0.18 - monotoneSeq[i] * 0.012, 0.14, 0.18)),
          energyDrift: r1(rand(-0.05, 0.1)),
        },
        deliveryMetrics: {
          wpm: wpmSeq[i],
          pauseCount: Math.round(rand(6, 11)),
          longPauseCount: Math.round(rand(0, 1)),
          avgPauseMs: Math.round(rand(550, 900)),
          fillerCount: Math.max(1, Math.round((fillersSeq[i] / 100) * countWords(transcripts[i % transcripts.length]))),
          wordCount: countWords(transcripts[i % transcripts.length]),
        },
        feedback,
        jobDesc: profile.jobDescription,
        jobProfileId: profile.id,
        jobProfileTitle: profile.title,
        jobProfileCompany: profile.company,
        jobProfileRoleType: profile.roleType,
      },
    });
  }

  return user;
}

// ---------------------------------------------------------------------------
// ============================================================
// SUPPORTING CAST — community college cohort
// ============================================================
// ---------------------------------------------------------------------------

type SupportingStudent = {
  name: string;
  email: string;
  persona: string;
  cohort: "high" | "mid" | "low";
  role: {
    title: string;
    company: string;
    roleType: string;
    jobDescription: string;
    framework: "star" | "technical_explanation" | "experience_depth";
    questionCategory: "behavioral" | "technical" | "role_specific";
  };
  baseScore: number;
  scoreVariance: number;
  attempts: number;
  trajectory: "up" | "flat" | "down" | "volatile";
};

const SUPPORTING_STUDENTS: SupportingStudent[] = [
  // HIGH PERFORMERS (5)
  {
    name: "Rosa Gutierrez", email: "rosa.gutierrez@demo-college.edu", persona: "High Performer — Nursing Support",
    cohort: "high",
    role: { title: "Patient Care Technician", company: "Valley Medical Center", roleType: "healthcare", jobDescription: "Assist RNs with patient monitoring, vital signs, ADL support, and clinical documentation in a busy acute-care unit.", framework: "star", questionCategory: "behavioral" },
    baseScore: 8.0, scoreVariance: 0.3, attempts: 7, trajectory: "up",
  },
  {
    name: "Michael Torres", email: "michael.torres@demo-college.edu", persona: "High Performer — Admin",
    cohort: "high",
    role: { title: "Office Manager", company: "Community Non-Profit Services", roleType: "operations", jobDescription: "Oversee daily administrative operations, manage donor records, support grant reporting, and coordinate a team of five.", framework: "star", questionCategory: "behavioral" },
    baseScore: 7.8, scoreVariance: 0.35, attempts: 6, trajectory: "up",
  },
  {
    name: "Destiny Johnson", email: "destiny.johnson@demo-college.edu", persona: "High Performer — Customer Service",
    cohort: "high",
    role: { title: "Customer Service Supervisor", company: "County Utilities Authority", roleType: "operations", jobDescription: "Lead a team of eight representatives handling billing inquiries, service disputes, and account management for residential and commercial customers.", framework: "star", questionCategory: "behavioral" },
    baseScore: 7.9, scoreVariance: 0.3, attempts: 8, trajectory: "flat",
  },
  {
    name: "Samuel Park", email: "samuel.park@demo-college.edu", persona: "High Performer — Pharmacy",
    cohort: "high",
    role: { title: "Pharmacy Technician", company: "Walgreens", roleType: "healthcare", jobDescription: "Process prescriptions, manage inventory, support pharmacist clinical duties, and maintain compliance with DEA and state board regulations.", framework: "experience_depth", questionCategory: "behavioral" },
    baseScore: 7.6, scoreVariance: 0.4, attempts: 6, trajectory: "up",
  },
  {
    name: "Angela Reyes", email: "angela.reyes@demo-college.edu", persona: "High Performer — Education Support",
    cohort: "high",
    role: { title: "Instructional Aide", company: "Riverside Unified School District", roleType: "education", jobDescription: "Support classroom instruction for K-3 students with diverse learning needs, assist with differentiated activities, and maintain student progress documentation.", framework: "star", questionCategory: "behavioral" },
    baseScore: 7.7, scoreVariance: 0.35, attempts: 7, trajectory: "up",
  },

  // MID PERFORMERS (8)
  {
    name: "Kevin Murphy", email: "kevin.murphy@demo-college.edu", persona: "Mid Performer — Billing",
    cohort: "mid",
    role: { title: "Medical Billing Specialist", company: "Regional Health System", roleType: "finance", jobDescription: "Process insurance claims, resolve billing disputes, verify patient coverage, and follow up on denied claims across multiple payer types.", framework: "star", questionCategory: "behavioral" },
    baseScore: 6.5, scoreVariance: 0.6, attempts: 6, trajectory: "flat",
  },
  {
    name: "Tanya Williams", email: "tanya.williams@demo-college.edu", persona: "Mid Performer — Library",
    cohort: "mid",
    role: { title: "Library Services Assistant", company: "City Public Library", roleType: "general", jobDescription: "Support circulation, reference assistance, program coordination, and community outreach for a branch serving a diverse urban population.", framework: "star", questionCategory: "behavioral" },
    baseScore: 6.3, scoreVariance: 0.7, attempts: 7, trajectory: "up",
  },
  {
    name: "Carlos Rivera", email: "carlos.rivera@demo-college.edu", persona: "Mid Performer — IT",
    cohort: "mid",
    role: { title: "Help Desk Technician", company: "City Housing Authority", roleType: "operations", jobDescription: "Provide technical support to 200+ agency staff, manage service requests, troubleshoot network and software issues, and maintain IT asset inventory.", framework: "technical_explanation", questionCategory: "technical" },
    baseScore: 6.6, scoreVariance: 0.6, attempts: 5, trajectory: "up",
  },
  {
    name: "Monique Davis", email: "monique.davis@demo-college.edu", persona: "Mid Performer — Social Work Aide",
    cohort: "mid",
    role: { title: "Social Services Assistant", company: "County Department of Social Services", roleType: "general", jobDescription: "Support case managers with client intake, benefit eligibility screenings, documentation, and resource referrals for low-income families.", framework: "experience_depth", questionCategory: "behavioral" },
    baseScore: 6.4, scoreVariance: 0.7, attempts: 6, trajectory: "up",
  },
  {
    name: "Brian Nguyen", email: "brian.nguyen@demo-college.edu", persona: "Mid Performer — Banking",
    cohort: "mid",
    role: { title: "Bank Teller", company: "Community Credit Union", roleType: "finance", jobDescription: "Process member transactions, handle cash, assist with account inquiries, support member onboarding, and identify cross-sell opportunities for financial products.", framework: "star", questionCategory: "behavioral" },
    baseScore: 6.7, scoreVariance: 0.5, attempts: 7, trajectory: "flat",
  },
  {
    name: "Keisha Brown", email: "keisha.brown@demo-college.edu", persona: "Mid Performer — Childcare",
    cohort: "mid",
    role: { title: "Childcare Center Teacher", company: "Little Learners Academy", roleType: "education", jobDescription: "Lead developmental activities for toddlers and preschoolers, maintain daily observation records, support family communication, and ensure licensing compliance.", framework: "star", questionCategory: "behavioral" },
    baseScore: 6.2, scoreVariance: 0.8, attempts: 6, trajectory: "volatile",
  },
  {
    name: "Andre Mitchell", email: "andre.mitchell@demo-college.edu", persona: "Mid Performer — Accounts Payable",
    cohort: "mid",
    role: { title: "Accounts Payable Clerk", company: "County Government Finance Office", roleType: "finance", jobDescription: "Process vendor invoices, verify purchase orders, reconcile accounts, and ensure timely payment within compliance and audit requirements.", framework: "star", questionCategory: "behavioral" },
    baseScore: 6.5, scoreVariance: 0.6, attempts: 5, trajectory: "up",
  },
  {
    name: "Jennifer Lee", email: "jennifer.lee@demo-college.edu", persona: "Mid Performer — Medical Reception",
    cohort: "mid",
    role: { title: "Medical Receptionist", company: "Family Health Clinic", roleType: "healthcare", jobDescription: "Greet patients, manage scheduling and check-in, collect copays, coordinate with clinical staff, and handle insurance verification for a high-volume primary care clinic.", framework: "star", questionCategory: "behavioral" },
    baseScore: 6.8, scoreVariance: 0.5, attempts: 7, trajectory: "up",
  },

  // LOW / AT-RISK (4)
  {
    name: "Darius Thompson", email: "darius.thompson@demo-college.edu", persona: "At-Risk — Career Pivot",
    cohort: "low",
    role: { title: "Administrative Assistant", company: "County Assessor's Office", roleType: "operations", jobDescription: "Support property assessment operations, maintain records, assist the public with inquiries, and provide clerical support to assessors.", framework: "star", questionCategory: "behavioral" },
    baseScore: 5.0, scoreVariance: 0.8, attempts: 6, trajectory: "down",
  },
  {
    name: "Lisa Martinez", email: "lisa.martinez@demo-college.edu", persona: "At-Risk — Needs Structure",
    cohort: "low",
    role: { title: "Customer Service Representative", company: "State Employment Development Department", roleType: "general", jobDescription: "Assist job seekers and employers with benefit claims, eligibility questions, appeals support, and referrals to employment programs.", framework: "star", questionCategory: "behavioral" },
    baseScore: 4.8, scoreVariance: 0.9, attempts: 5, trajectory: "volatile",
  },
  {
    name: "Jerome Washington", email: "jerome.washington@demo-college.edu", persona: "At-Risk — Struggling",
    cohort: "low",
    role: { title: "Warehouse Associate", company: "Regional Distribution Center", roleType: "operations", jobDescription: "Support receiving, inventory management, order fulfillment, and safety compliance in a high-volume distribution environment.", framework: "star", questionCategory: "behavioral" },
    baseScore: 4.5, scoreVariance: 1.0, attempts: 5, trajectory: "down",
  },
  {
    name: "Alexis Cooper", email: "alexis.cooper@demo-college.edu", persona: "At-Risk — Early Stage",
    cohort: "low",
    role: { title: "Dental Office Assistant", company: "Community Dental Clinic", roleType: "healthcare", jobDescription: "Support front-office operations including scheduling, patient intake, insurance verification, and coordination with clinical staff.", framework: "star", questionCategory: "behavioral" },
    baseScore: 4.6, scoreVariance: 1.1, attempts: 6, trajectory: "volatile",
  },
];

const SUPPORTING_QUESTIONS: Record<string, string[]> = {
  behavioral: [
    "Tell me about a time you managed a challenging situation at work.",
    "Describe a time you had to communicate difficult information to someone.",
    "Tell me about a time you identified a problem and took initiative to fix it.",
    "Describe a time you had to balance speed and accuracy.",
    "Tell me about a time you worked effectively with a difficult colleague.",
    "Describe a time you had to learn something new quickly.",
    "Tell me about a time you made an error and how you recovered.",
    "Describe how you prioritize when you have multiple urgent tasks.",
  ],
  technical: [
    "Walk me through how you would troubleshoot a computer that won't connect to the network.",
    "Explain how you manage multiple open support tickets at once.",
    "Describe your approach to documenting a technical issue for future reference.",
    "Walk me through your process for setting up a new employee's workstation.",
    "How do you decide when to escalate a support request versus resolving it yourself?",
    "Describe how you verify that a technical fix actually resolved the underlying issue.",
  ],
  role_specific: [
    "How do you handle a patient or client who becomes frustrated or upset?",
    "Walk me through your process for verifying insurance eligibility.",
    "How do you ensure accuracy in high-volume data entry or documentation?",
    "Describe how you stay organized when managing multiple ongoing cases or accounts.",
  ],
};

const SUPPORTING_TRANSCRIPTS: Record<"high" | "mid" | "low", string[]> = {
  high: [
    "I noticed our patient wait time at check-in was consistently running over 15 minutes on Monday mornings. I pulled our scheduling data and identified that three providers had overlapping appointment starts at 9 AM. I proposed staggering the first appointments by 10 minutes each, drafted the change, and presented it to the office manager. We implemented it the following Monday and average wait time dropped to under 8 minutes. Patient satisfaction scores for that time slot improved in the next survey cycle.",
    "When a longtime member came in with a billing dispute that had been open for six weeks, I took ownership and called the insurance company directly. I stayed on the line for 28 minutes, escalated to a supervisor, and got written confirmation of the corrected claim the same day. The member said she had never had anyone actually resolve a billing issue in one call before. We added that escalation path to our standard billing dispute protocol.",
    "A new team member was struggling with our documentation system in her first two weeks. I created a one-page quick reference guide for the five most common workflows, walked through it with her, and followed up daily for the first week. By week three she was completing her documentation independently and accurately. Her quality scores were at the team average within a month.",
  ],
  mid: [
    "I had a patient who was upset because she had been waiting longer than expected and no one had explained the delay. I went over and introduced myself, acknowledged the wait, explained what was happening with her provider, and offered to get her water while she waited. She seemed calmer after that. The appointment went okay and she thanked me at checkout.",
    "There was a billing error where a patient had been charged for a service that wasn't covered at their tier. I caught it when I was processing the next month's statement. I flagged it to my supervisor and we issued a correction. It took a few days to process but we got it sorted out and notified the patient.",
    "I had multiple things going on at once — phones, walk-ins, and a deadline for some paperwork. I tried to handle the most urgent things first and communicate with my supervisor about the ones I couldn't get to right away. Everything got done eventually. It was stressful but I managed.",
  ],
  low: [
    "Um, there was a situation that came up and like, I wasn't totally sure how to handle it. I tried my best and talked to someone about it. I think it kind of worked out. Um yeah, it was a learning experience.",
    "So I had to deal with this issue at work and um, it was hard. I wasn't really prepared for it. I did what I could and I guess it was okay. I'm still figuring out how to deal with things like that.",
    "Um, I had a lot going on and I wasn't sure what to do first. I kind of just started with whatever seemed most urgent. Um, some things got done and some things didn't. I know I need to work on being more organized.",
  ],
};

function buildSupportingScore(baseScore: number, variance: number, index: number, attempts: number, trajectory: SupportingStudent["trajectory"]): number {
  let base = baseScore;
  if (trajectory === "up") base += (index / (attempts - 1)) * variance * 0.8;
  else if (trajectory === "down") base -= (index / (attempts - 1)) * variance * 0.8;
  else if (trajectory === "volatile") base += (index % 2 === 0 ? 1 : -1) * variance * 0.6;
  const noise = rand(-variance * 0.3, variance * 0.3);
  return r1(clamp(base + noise, 3.5, 9.5));
}

async function seedSupportingStudents(tenantId: string) {
  for (const student of SUPPORTING_STUDENTS) {
    const user = await ensureUser({
      tenantId,
      name: student.name,
      email: student.email,
      demoPersona: student.persona,
    });
    await ensureMembership(tenantId, user.id);

    const profile = await ensureJobProfile({
      userId: user.id,
      tenantId,
      title: student.role.title,
      company: student.role.company,
      roleType: student.role.roleType,
      jobDescription: student.role.jobDescription,
    });

    const qPool = SUPPORTING_QUESTIONS[student.role.questionCategory];
    const tPool = SUPPORTING_TRANSCRIPTS[student.cohort];

    const spanDays = student.cohort === "low" ? 80 : student.cohort === "mid" ? 65 : 55;
    const gapVariance = student.cohort === "low" ? 0.6 : 0.3;
    const timestamps = spreadTimestamps(student.attempts, spanDays, gapVariance);

    const wpmBase = student.cohort === "high" ? 138 : student.cohort === "mid" ? 155 : 188;
    const fillerBase = student.cohort === "high" ? 1.2 : student.cohort === "mid" ? 4.2 : 8.1;
    const monotoneBase = student.cohort === "high" ? 2.2 : student.cohort === "mid" ? 4.0 : 6.5;
    const closingBase = student.cohort === "high" ? 7.8 : student.cohort === "mid" ? 5.5 : 3.2;

    for (let i = 0; i < student.attempts; i++) {
      const overallScore = buildSupportingScore(student.baseScore, student.scoreVariance, i, student.attempts, student.trajectory);
      const communication = r1(clamp(overallScore + rand(-0.4, 0.4), 3.5, 9.5));
      const confidence = r1(clamp(overallScore + rand(-0.5, 0.3), 3.5, 9.5));
      const closingImpact = r1(clamp(closingBase + rand(-0.6, 0.6), 2.0, 9.5));
      const wpm = Math.round(clamp(wpmBase + rand(-12, 12), 110, 210));
      const fillersPer100 = r1(clamp(fillerBase + rand(-1.0, 1.0), 0.3, 12.0));
      const monotoneScore = r1(clamp(monotoneBase + rand(-0.5, 0.5), 1.5, 9.0));
      const transcript = tPool[i % tPool.length];
      const question = qPool[i % qPool.length];

      const strengths = student.cohort === "high"
        ? ["Clear structured delivery with ownership throughout.", "Specific outcome with measurable impact."]
        : student.cohort === "mid"
        ? ["Addresses the core question.", "Shows relevant real-world experience."]
        : ["Willing to engage with the question.", "Some relevant experience is present."];

      const improvements = student.cohort === "high"
        ? ["Add one more quantified metric to strengthen the result.", "Minor: tighten the action section slightly."]
        : student.cohort === "mid"
        ? ["Close with a more specific, quantified result.", "Closing impact could be stronger — state exactly what changed."]
        : ["Use STAR structure — Situation, Task, Action, Result.", "Result is missing entirely — always close with what changed.", "Reduce filler words — pause instead of saying 'um'."];

      const starSubscores = student.role.framework === "star" ? {
        S: r1(clamp(communication + rand(-0.5, 0.5), 3.0, 9.5)),
        T: r1(clamp(communication + rand(-0.6, 0.4), 3.0, 9.5)),
        A: r1(clamp((communication + confidence) / 2 + rand(-0.4, 0.4), 3.0, 9.5)),
        R: r1(clamp(closingImpact + rand(-0.4, 0.4), 2.0, 9.5)),
      } : undefined;

      const feedback = buildFeedback({
        framework: student.role.framework,
        jobDesc: student.role.jobDescription,
        question,
        transcript,
        overallScore,
        communication,
        confidence,
        closingImpact,
        wpm,
        fillersPer100,
        monotoneScore,
        starSubscores,
        strengths,
        improvements,
        confidenceExplanation: student.cohort === "high"
          ? "Confident, measured delivery throughout — clear ownership from the first sentence."
          : student.cohort === "mid"
          ? "Moderate confidence — some hedging language, but generally composed and on-topic."
          : "Low confidence detected. Unstructured delivery and filler words signal uncertainty. Building a structured answer framework would improve both confidence and clarity.",
        betterAnswer: student.cohort === "high"
          ? "Strong answer. Optional enhancement: after the result, add one sentence on how you'd replicate this approach in a new role."
          : student.cohort === "mid"
          ? "Add a specific metric to your result — 'it improved' becomes 'wait time dropped from 15 minutes to 8 minutes.' That's the difference between a forgettable answer and one that sticks."
          : "Structure your answer: one sentence on the situation, one on your specific role, two to three sentences on what you did (specific steps), then close with what changed. Practice this pattern before recording again.",
        keywords_used: [student.role.roleType, student.role.company],
        keywords_missing: student.cohort === "high" ? ["reflection"] : student.cohort === "mid" ? ["quantified outcome", "metric"] : ["STAR structure", "result", "specific outcome"],
        trajectoryNote: null,
        milestoneNote: null,
        prevScore: i > 0 ? buildSupportingScore(student.baseScore, student.scoreVariance, i - 1, student.attempts, student.trajectory) : null,
        prevAttemptCount: i,
      });

      await prisma.attempt.create({
        data: {
          userId: user.id,
          tenantId,
          ts: timestamps[i],
          question,
          questionCategory: student.role.questionCategory,
          questionSource: "seeded",
          evaluationFramework: student.role.framework,
          transcript,
          inputMethod: "spoken",
          score: overallScore,
          communicationScore: communication,
          confidenceScore: confidence,
          wpm,
          prosody: {
            monotoneScore,
            pitchStd: r1(clamp(45 - monotoneScore * 3.2 + rand(-3, 3), 5, 45)),
            pitchMean: r1(rand(130, 200)),
            energyVariation: r1(clamp(0.18 - monotoneScore * 0.012, 0.04, 0.18)),
            energyDrift: r1(rand(-0.2, 0.2)),
          },
          deliveryMetrics: {
            wpm,
            pauseCount: Math.round(rand(2, 10)),
            longPauseCount: Math.round(rand(0, 3)),
            avgPauseMs: Math.round(rand(380, 1100)),
            fillerCount: Math.max(1, Math.round((fillersPer100 / 100) * countWords(transcript))),
            wordCount: countWords(transcript),
          },
          feedback,
          jobDesc: student.role.jobDescription,
          jobProfileId: profile.id,
          jobProfileTitle: profile.title,
          jobProfileCompany: profile.company,
          jobProfileRoleType: profile.roleType,
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// ============================================================
// MAIN POST HANDLER
// ============================================================
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    await req.json().catch(() => ({}));

    // Find the demo tenant by slug
    const tenant = await prisma.tenant.findUnique({
      where: { slug: "demo-college" },
      select: { id: true, name: true },
    });

    if (!tenant?.id) {
      return NextResponse.json(
        { error: "NO_TENANT_FOUND", message: "Demo tenant 'demo-college' not found. Run scripts/setupDemo.ts first." },
        { status: 400 }
      );
    }

    const tenantId = tenant.id;

    // ---------------------------------------------------------------------------
    // Step 1: Clean up demo data
    // Featured students (created by setupDemo.ts with passwords): keep user records,
    // just wipe their attempts and job profiles so passwords are preserved.
    // Supporting students: delete entirely since they have no passwords to preserve.
    // ---------------------------------------------------------------------------
    const FEATURED_EMAILS = [
      "maria@demo-college.edu",
      "james@demo-college.edu",
      "priya@demo-college.edu",
      "derek@demo-college.edu",
      "ashley@demo-college.edu",
    ];

    // Wipe attempts + job profiles for featured students (keep users)
    const featuredUsers = await prisma.user.findMany({
      where: { email: { in: FEATURED_EMAILS } },
      select: { id: true },
    });
    const featuredIds = featuredUsers.map((u) => u.id);
    if (featuredIds.length > 0) {
      await prisma.attempt.deleteMany({ where: { userId: { in: featuredIds } } });
      await prisma.jobProfile.deleteMany({ where: { userId: { in: featuredIds } } });
    }

    // Delete supporting students entirely
    const supportingUsers = await prisma.user.findMany({
      where: {
        email: { contains: "@demo-college.edu" },
        NOT: { email: { in: [...FEATURED_EMAILS, "admin@demo-college.edu"] } },
      },
      select: { id: true },
    });
    const supportingIds = supportingUsers.map((u) => u.id);
    if (supportingIds.length > 0) {
      await prisma.attempt.deleteMany({ where: { userId: { in: supportingIds } } });
      await prisma.jobProfile.deleteMany({ where: { userId: { in: supportingIds } } });
      await prisma.tenantMembership.deleteMany({ where: { userId: { in: supportingIds } } });
      await prisma.user.deleteMany({ where: { id: { in: supportingIds } } });
    }

    // ---------------------------------------------------------------------------
    // Step 2: Seed featured students
    // ---------------------------------------------------------------------------
    const featured = await Promise.all([
      seedMariaSantos(tenantId),
      seedJamesOkafor(tenantId),
      seedPriyaNair(tenantId),
      seedDerekWilliams(tenantId),
      seedAshleyChen(tenantId),
    ]);

    // ---------------------------------------------------------------------------
    // Step 3: Seed supporting cast
    // ---------------------------------------------------------------------------
    await seedSupportingStudents(tenantId);

    // ---------------------------------------------------------------------------
    // Step 4: Return summary
    // ---------------------------------------------------------------------------
    const totalUsers = await prisma.user.count({
      where: { email: { contains: "@demo-college.edu" } },
    });
    const totalAttempts = await prisma.attempt.count({
      where: { tenantId },
    });

    return NextResponse.json({
      ok: true,
      tenantId,
      tenantName: tenant.name,
      demoUsersCreated: totalUsers,
      totalAttemptsCreated: totalAttempts,
      featuredStudents: featured.map((u) => ({ id: u.id, email: u.email })),
      supportingStudents: SUPPORTING_STUDENTS.length,
    });
  } catch (err: any) {
    console.error("[seed-attempts] error:", err);
    return NextResponse.json(
      { error: "SEED_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
