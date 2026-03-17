import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { composeRichFeedback } from "@/app/lib/feedback/composer";


export const runtime = "nodejs";

type QuestionCategory = "behavioral" | "role_specific" | "technical";
type EvaluationFramework = "star" | "technical_explanation" | "experience_depth";

type DemoUserTemplate = {
  key: string;
  demoLabel: string;
  nameHint: string;
  traits: {
    communicationShift: number;
    confidenceShift: number;
    closingImpactShift: number;
    wpmShift: number;
    monotoneShift: number;
    fillersShift: number;
  };
};

type RoleTemplate = {
  key: string;
  title: string;
  company: string;
  roleType: string;
  roleFamily: "finance" | "operations" | "research";
  jobDescription: string;
  questionCategory: QuestionCategory;
  evaluationFramework: EvaluationFramework;
  questionPool: string[];
  transcriptPool: string[];
};

type RoleModifier = {
  communicationShift: number;
  confidenceShift: number;
  closingImpactShift: number;
  wpmShift: number;
  monotoneShift: number;
  fillersShift: number;
};

const DEMO_USERS: DemoUserTemplate[] = [
  {
    key: "communicator_weak_endings",
    demoLabel: "Communicator Demo",
    nameHint: "Demo Student A",
    traits: {
      communicationShift: 0.8,
      confidenceShift: 0.3,
      closingImpactShift: -0.9,
      wpmShift: 4,
      monotoneShift: -0.4,
      fillersShift: -0.3,
    },
  },
  {
    key: "analytical_flat",
    demoLabel: "Analytical Demo",
    nameHint: "Demo Student B",
    traits: {
      communicationShift: 0.1,
      confidenceShift: -0.2,
      closingImpactShift: 0.1,
      wpmShift: 8,
      monotoneShift: 1.2,
      fillersShift: 0.4,
    },
  },
  {
    key: "technical_overdetailed",
    demoLabel: "Technical Demo",
    nameHint: "Demo Student C",
    traits: {
      communicationShift: -0.3,
      confidenceShift: -0.2,
      closingImpactShift: -0.2,
      wpmShift: -10,
      monotoneShift: 0.5,
      fillersShift: 0.2,
    },
  },
  {
    key: "fast_confident_rushed",
    demoLabel: "Fast Demo",
    nameHint: "Demo Student D",
    traits: {
      communicationShift: 0.3,
      confidenceShift: 0.8,
      closingImpactShift: 0.1,
      wpmShift: 18,
      monotoneShift: 0.2,
      fillersShift: 0.8,
    },
  },
  {
    key: "balanced_generalist",
    demoLabel: "Balanced Demo",
    nameHint: "Demo Student E",
    traits: {
      communicationShift: 0,
      confidenceShift: 0,
      closingImpactShift: 0,
      wpmShift: 0,
      monotoneShift: 0,
      fillersShift: 0,
    },
  },
];

const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    key: "financial_analyst",
    title: "Financial Analyst",
    company: "JPMorgan",
    roleType: "Finance",
    roleFamily: "finance",
    jobDescription:
      "Support financial analysis, stakeholder communication, reporting, business case development, and decision support across fast-moving teams.",
    questionCategory: "behavioral",
    evaluationFramework: "star",
    questionPool: [
      "Tell me about a time you influenced a decision with data.",
      "Describe a time you improved a reporting process.",
      "Tell me about a time you had to manage competing priorities.",
      "Describe a time you worked with stakeholders who disagreed.",
    ],
    transcriptPool: [
      "I supported a reporting process with too many manual steps, mapped the workflow, identified the bottlenecks, and proposed a more standardized approach. After aligning stakeholders and implementing the changes, the process became faster and easier to maintain.",
      "I used data to support a decision by clarifying what stakeholders needed to know, building a cleaner analysis, and highlighting the tradeoffs in a way that made the recommendation easier to align on.",
      "I prioritized competing work by business impact and timing, communicated tradeoffs early, and kept the highest-risk deliverables moving first so I could protect the most important deadlines.",
    ],
  },
  {
    key: "supply_chain_analyst",
    title: "Supply Chain Analyst",
    company: "Apple",
    roleType: "Operations",
    roleFamily: "operations",
    jobDescription:
      "Support supply planning, inventory optimization, supplier coordination, KPI-driven execution, and cross-functional decision-making.",
    questionCategory: "technical",
    evaluationFramework: "technical_explanation",
    questionPool: [
      "How would you improve a constrained supply planning process?",
      "Walk me through how you would manage inventory risk across multiple suppliers.",
      "How do you prioritize supply chain issues when several metrics move at once?",
      "Describe how you would analyze a forecast miss and recommend action.",
    ],
    transcriptPool: [
      "I would start by identifying the constraint, quantifying the impact on service and inventory, and segmenting the issue by material, supplier, and timing. From there I would compare scenarios and recommend the option that best protects continuity and customer commitments.",
      "My approach would be diagnosis, scenario modeling, and execution. First I identify the root cause, then compare the tradeoffs, and finally drive the response that best balances service, cost, and inventory risk.",
      "I would first isolate whether the issue came from demand, supply, or execution, then prioritize the largest business impact and partner cross-functionally to stabilize the plan.",
    ],
  },
  {
    key: "research_associate",
    title: "Research Associate",
    company: "Moderna",
    roleType: "Science",
    roleFamily: "research",
    jobDescription:
      "Support experimental execution, documentation, scientific collaboration, workflow improvement, and interpretation of findings.",
    questionCategory: "behavioral",
    evaluationFramework: "experience_depth",
    questionPool: [
      "Tell me about a time you solved a research problem.",
      "Describe a time your experiment did not go as planned.",
      "How have you balanced speed with scientific rigor?",
      "Tell me about a time you improved a lab process.",
    ],
    transcriptPool: [
      "An experiment I supported started producing inconsistent results across runs. I reviewed each step, compared conditions between runs, and helped isolate a handling issue. After we adjusted the workflow and documented the change, the process became more reliable.",
      "When a study did not replicate cleanly, I paused the downstream work, reviewed the method, and worked with the team to identify where variability was being introduced. That helped us refine the workflow and improve repeatability.",
      "I focus on reproducibility first, then speed. I want the method to be stable and documented before scaling the work, because good scientific execution depends on repeatability.",
    ],
  },
];

const PERSONA_ROLE_MODIFIERS: Record<string, Record<string, RoleModifier>> = {
  communicator_weak_endings: {
    financial_analyst: {
      communicationShift: 0.5,
      confidenceShift: 0.2,
      closingImpactShift: -0.8,
      wpmShift: 0,
      monotoneShift: 0,
      fillersShift: 0,
    },
    supply_chain_analyst: {
      communicationShift: 0.2,
      confidenceShift: 0.1,
      closingImpactShift: -0.3,
      wpmShift: 2,
      monotoneShift: 0.2,
      fillersShift: 0.1,
    },
    research_associate: {
      communicationShift: 0.1,
      confidenceShift: 0.1,
      closingImpactShift: -0.2,
      wpmShift: -2,
      monotoneShift: 0,
      fillersShift: 0,
    },
  },
  analytical_flat: {
    financial_analyst: {
      communicationShift: 0.2,
      confidenceShift: 0,
      closingImpactShift: 0.2,
      wpmShift: 3,
      monotoneShift: 0.8,
      fillersShift: 0.1,
    },
    supply_chain_analyst: {
      communicationShift: 0.4,
      confidenceShift: 0.3,
      closingImpactShift: 0.3,
      wpmShift: 5,
      monotoneShift: 0.6,
      fillersShift: 0.2,
    },
    research_associate: {
      communicationShift: 0.1,
      confidenceShift: 0.1,
      closingImpactShift: 0.1,
      wpmShift: -4,
      monotoneShift: 0.4,
      fillersShift: 0,
    },
  },
  technical_overdetailed: {
    financial_analyst: {
      communicationShift: -0.5,
      confidenceShift: -0.2,
      closingImpactShift: -0.3,
      wpmShift: -8,
      monotoneShift: 0.2,
      fillersShift: 0.2,
    },
    supply_chain_analyst: {
      communicationShift: 0.2,
      confidenceShift: 0.1,
      closingImpactShift: 0.1,
      wpmShift: -2,
      monotoneShift: 0.3,
      fillersShift: 0.1,
    },
    research_associate: {
      communicationShift: 0.5,
      confidenceShift: 0.2,
      closingImpactShift: 0.2,
      wpmShift: -5,
      monotoneShift: 0.1,
      fillersShift: 0,
    },
  },
  fast_confident_rushed: {
    financial_analyst: {
      communicationShift: 0.2,
      confidenceShift: 0.6,
      closingImpactShift: 0.1,
      wpmShift: 8,
      monotoneShift: 0.1,
      fillersShift: 0.6,
    },
    supply_chain_analyst: {
      communicationShift: 0.3,
      confidenceShift: 0.7,
      closingImpactShift: 0.2,
      wpmShift: 10,
      monotoneShift: 0.2,
      fillersShift: 0.7,
    },
    research_associate: {
      communicationShift: -0.2,
      confidenceShift: 0.2,
      closingImpactShift: -0.2,
      wpmShift: 12,
      monotoneShift: 0.3,
      fillersShift: 0.8,
    },
  },
  balanced_generalist: {
    financial_analyst: {
      communicationShift: 0.1,
      confidenceShift: 0.1,
      closingImpactShift: 0.1,
      wpmShift: 0,
      monotoneShift: 0,
      fillersShift: 0,
    },
    supply_chain_analyst: {
      communicationShift: 0.1,
      confidenceShift: 0.1,
      closingImpactShift: 0.1,
      wpmShift: 0,
      monotoneShift: 0,
      fillersShift: 0,
    },
    research_associate: {
      communicationShift: 0.1,
      confidenceShift: 0.1,
      closingImpactShift: 0.1,
      wpmShift: 0,
      monotoneShift: 0,
      fillersShift: 0,
    },
  },
};

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function score(min: number, max: number) {
  return Math.round(random(min, max) * 10) / 10;
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickManyUnique<T>(arr: T[], count: number) {
  const copy = [...arr];
  const out: T[] = [];
  while (copy.length > 0 && out.length < count) {
    const index = Math.floor(Math.random() * copy.length);
    out.push(copy[index]);
    copy.splice(index, 1);
  }
  return out;
}

function daysAgo(index: number, total: number) {
  const spread = Math.max(total, 1);
  const days = Math.floor((index / spread) * 75);
  const jitterHours = Math.floor(random(0, 20));
  return new Date(Date.now() - (days * 24 + jitterHours) * 60 * 60 * 1000);
}

function buildAttemptMetrics(input: {
  user: DemoUserTemplate;
  role: RoleTemplate;
  modifier: RoleModifier;
}) {
  const communication = clamp(
    7.2 + input.user.traits.communicationShift + input.modifier.communicationShift + random(-0.45, 0.45),
    5.6,
    9.2
  );

  const confidence = clamp(
    7.0 + input.user.traits.confidenceShift + input.modifier.confidenceShift + random(-0.45, 0.45),
    5.4,
    9.1
  );

  const closingImpact = clamp(
    7.0 + input.user.traits.closingImpactShift + input.modifier.closingImpactShift + random(-0.55, 0.55),
    5.0,
    9.0
  );

  const wpm = Math.round(
    clamp(
      138 + input.user.traits.wpmShift + input.modifier.wpmShift + random(-8, 8),
      102,
      178
    )
  );

  const monotoneScore = Math.round(
    clamp(
      4.9 + input.user.traits.monotoneShift + input.modifier.monotoneShift + random(-0.8, 0.8),
      2.5,
      8.2
    ) * 10
  ) / 10;

  const fillersPer100 = Math.round(
    clamp(
      2.0 + input.user.traits.fillersShift + input.modifier.fillersShift + random(-0.7, 0.7),
      0.5,
      5.2
    ) * 10
  ) / 10;

  let overall =
    communication * 0.34 +
    confidence * 0.26 +
    closingImpact * 0.24 +
    (wpm >= 115 && wpm <= 145 ? 8.0 : wpm <= 165 ? 7.0 : 6.0) * 0.08 +
    (fillersPer100 <= 1.5 ? 8.3 : fillersPer100 < 3 ? 7.2 : 6.0) * 0.08;

  if (input.role.roleFamily === "finance") overall += 0.08 * closingImpact;
  if (input.role.roleFamily === "operations") overall += 0.06 * confidence;
  if (input.role.roleFamily === "research") overall += 0.06 * communication;

  overall = clamp(overall / 1.06, 5.5, 9.2);

  return {
    overall: Math.round(overall * 10) / 10,
    communication: Math.round(communication * 10) / 10,
    confidence: Math.round(confidence * 10) / 10,
    closingImpact: Math.round(closingImpact * 10) / 10,
    wpm,
    monotoneScore,
    fillersPer100,
  };
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}


function buildFeedback(input: {
  role: RoleTemplate;
  metrics: ReturnType<typeof buildAttemptMetrics>;
  transcript: string;
}) {
  const strengthsPool =
    input.role.roleFamily === "finance"
      ? [
          "Strong stakeholder-oriented communication.",
          "Professional answer flow and executive-friendly framing.",
          "Clear business-oriented structure.",
          "Good recommendation framing when the answer stays concise.",
        ]
      : input.role.roleFamily === "operations"
      ? [
          "Strong operational reasoning and prioritization.",
          "Good structure when explaining tradeoffs.",
          "Shows practical problem-solving credibility.",
          "Clearer execution logic than most average responses.",
        ]
      : [
          "Clear process explanation and scientific discipline.",
          "Good specificity around methods and workflow.",
          "Composed and credible delivery.",
          "Strong example selection for experience-based answers.",
        ];

  const improvementsPool =
    input.role.roleFamily === "finance"
      ? [
          "Use more concrete metrics in the result.",
          "Make the closing impact sharper and more memorable.",
          "Land the business takeaway faster.",
          "Clarify the final decision impact more explicitly.",
        ]
      : input.role.roleFamily === "operations"
      ? [
          "Translate the technical logic into a clearer recommendation.",
          "Slow down slightly when walking through the steps.",
          "Make the final business impact more explicit.",
          "Show the tradeoff logic more clearly near the end.",
        ]
      : [
          "End with a stronger measurable result.",
          "Show your ownership more directly in the outcome.",
          "Make the final impact more explicit.",
          "Add slightly more depth to the example detail.",
        ];

  const missedOpportunitiesPool =
    input.role.roleFamily === "finance"
      ? [
          {
            label: "Add measurable outcome",
            why: "The answer sounds polished but lacks a strong quantified result.",
            add_sentence: "The result was better visibility, faster decision-making, and a cleaner reporting cycle.",
          },
          {
            label: "Tighten the setup",
            why: "The context is clear, but it can be shorter so the action lands faster.",
            add_sentence: "The process had become too manual and was slowing key decisions.",
          },
        ]
      : input.role.roleFamily === "operations"
      ? [
          {
            label: "Quantify the impact",
            why: "The answer explains the process but does not fully land the business outcome.",
            add_sentence: "The result was a more stable plan with lower inventory risk and better service continuity.",
          },
          {
            label: "Show ownership sooner",
            why: "The answer is thoughtful, but your ownership could be clearer earlier.",
            add_sentence: "I led the analysis by isolating the constraint and framing the tradeoffs.",
          },
        ]
      : [
          {
            label: "Stronger impact close",
            why: "The story explains the process well but does not fully land the result.",
            add_sentence: "As a result, the workflow became more reliable and easier to repeat.",
          },
          {
            label: "State ownership more directly",
            why: "You sound collaborative, but your direct contribution could be clearer.",
            add_sentence: "I led the review and documented the change that stabilized the process.",
          },
        ];

  const betterAnswerPool =
    input.role.roleFamily === "finance"
      ? [
          "I clarified the decision stakeholders needed to make, built a cleaner analysis, and framed the tradeoffs more clearly. That made it easier to align on the recommendation and improved the usefulness of the output.",
        ]
      : input.role.roleFamily === "operations"
      ? [
          "I started by isolating the main operational constraint, quantifying the impact, and comparing realistic response options. That let me recommend the path that best protected service, continuity, and inventory health.",
        ]
      : [
          "I reviewed the process step by step, isolated the source of variability, and documented the change that improved repeatability. That made the workflow more reliable and helped the team move forward with more confidence.",
        ];

  const relevanceScore = score(7.3, 9.2);
  const directnessScore = score(6.9, 8.8);
  const completenessScore = score(7.0, 8.9);
  const offTopicScore = score(7.8, 9.4);

  const feedback: any = {
    score: input.metrics.overall,
    communication_score: input.metrics.communication,
    confidence_score: input.metrics.confidence,
    strengths: pickManyUnique(strengthsPool, 2),
    improvements: pickManyUnique(improvementsPool, 2),
    filler: {
      per100: input.metrics.fillersPer100,
      total: Math.max(1, Math.round(random(1, 8))),
    },
    relevance: {
      relevance_score: relevanceScore,
      directness_score: directnessScore,
      completeness_score: completenessScore,
      off_topic_score: offTopicScore,
      answered_question: true,
      missed_parts: ["Could have made the final impact more explicit."],
      relevance_explanation:
        "You stayed on question and sounded relevant throughout. The main opportunity is making the final outcome land more clearly.",
    },
    missed_opportunities: [pick(missedOpportunitiesPool)],
    better_answer: pick(betterAnswerPool),
    keywords_used: [input.role.roleType, input.role.company],
    keywords_missing: ["impact", "metrics"],
  };

  if (input.role.evaluationFramework === "star") {
    feedback.star = {
      situation: score(7.0, 8.7),
      task: score(7.0, 8.6),
      action: score(7.1, 8.8),
      result: input.metrics.closingImpact,
    };
    feedback.star_missing = input.metrics.closingImpact <= 6.6 ? [["result"]] : [[]];
    feedback.star_advice = {
      situation: "Frame the context in one sentence so the stakes are clear faster.",
      task: "State your responsibility more explicitly so ownership is clear.",
      action: "Use stronger verbs and keep the action sequence concrete.",
      result: "Close with a measurable business result or a clearer outcome statement.",
    };
  }

  if (input.role.evaluationFramework === "technical_explanation") {
    feedback.technical_explanation = {
      technical_clarity: score(7.1, 8.8),
      technical_accuracy: score(7.2, 8.9),
      structure: score(6.8, 8.4),
      depth: score(7.0, 8.8),
      practical_reasoning: score(7.3, 9.0),
    };
    feedback.technical_strengths = ["Good operational logic and scenario thinking."];
    feedback.technical_improvements = ["Translate the technical logic into a clearer business recommendation."];
  }

  if (input.role.evaluationFramework === "experience_depth") {
    feedback.experience_depth = {
      experience_depth: score(7.0, 8.8),
      specificity: score(7.2, 9.0),
      tool_fluency: score(6.8, 8.4),
      business_impact: score(5.8, 7.8),
      example_quality: score(7.2, 8.9),
    };
    feedback.experience_strengths = ["Good specificity and credible process explanation."];
    feedback.experience_improvements = ["Make the final impact more measurable and explicit."];
  }

  const fillerTotal = feedback?.filler?.total ?? 3;
  const wordCount = countWords(input.transcript);
  const fillersPer100Words =
    wordCount > 0 ? Math.round((fillerTotal / wordCount) * 100 * 10) / 10 : input.metrics.fillersPer100;

  return composeRichFeedback({
    framework: input.role.evaluationFramework,
    jobDesc: input.role.jobDescription,
    question: "",
    transcript: input.transcript,
    deliveryMetrics: {
      wpm: input.metrics.wpm,
      acoustics: {
        monotoneScore: input.metrics.monotoneScore,
      },
    },
    fillerStats: {
      total: fillerTotal,
      wordCount,
      fillersPer100Words,
      perFiller: {},
    },
    normalized: feedback,
  });
}


async function ensureJobProfile(params: {
  userId: string;
  tenantId: string;
  role: RoleTemplate;
}) {
  const existing = await prisma.jobProfile.findFirst({
    where: {
      userId: params.userId,
      tenantId: params.tenantId,
      title: params.role.title,
      company: params.role.company,
      roleType: params.role.roleType,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      company: true,
      roleType: true,
      jobDescription: true,
    },
  });

  if (existing) return existing;

  return prisma.jobProfile.create({
    data: {
      userId: params.userId,
      tenantId: params.tenantId,
      title: params.role.title,
      company: params.role.company,
      roleType: params.role.roleType,
      jobDescription: params.role.jobDescription,
    },
    select: {
      id: true,
      title: true,
      company: true,
      roleType: true,
      jobDescription: true,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const perProfile = Math.min(Math.max(Number(body?.perProfile ?? 18) || 18, 6), 40);
    const resetAttempts = body?.resetAttempts === true;

    const users = await prisma.user.findMany({
      where: {
        tenantId: { not: null },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        tenantId: true,
        email: true,
        name: true,
      },
    });

    if (users.length < 5) {
      return NextResponse.json(
        {
          error: "NOT_ENOUGH_USERS",
          message: "You need at least 5 existing users with tenantId set before running this seed.",
        },
        { status: 400 }
      );
    }

    if (resetAttempts) {
      const userIds = users.map((u) => u.id);

      const deleted = await prisma.attempt.deleteMany({
        where: {
          userId: { in: userIds },
        },
      });

      console.log(
        `[seed-attempts] deleted ${deleted.count} attempts for ${userIds.length} users`
      );
    }

    let createdAttempts = 0;
    let touchedProfiles = 0;

    for (let userIndex = 0; userIndex < 5; userIndex++) {
      const user = users[userIndex];
      const demoUser = DEMO_USERS[userIndex];

      await prisma.user.update({
        where: { id: user.id },
        data: {
          demoPersona: demoUser.demoLabel,
        },
      });

      const tenantId = user.tenantId;
      if (!tenantId) continue;

      for (const role of ROLE_TEMPLATES) {
        const profile = await ensureJobProfile({
          userId: user.id,
          tenantId,
          role,
        });

        touchedProfiles += 1;

        const modifier =
          PERSONA_ROLE_MODIFIERS[demoUser.key]?.[role.key] ?? {
            communicationShift: 0,
            confidenceShift: 0,
            closingImpactShift: 0,
            wpmShift: 0,
            monotoneShift: 0,
            fillersShift: 0,
          };

        for (let i = 0; i < perProfile; i++) {
          const metrics = buildAttemptMetrics({
            user: demoUser,
            role,
            modifier,
          });

          const transcript = pick(role.transcriptPool);

          const feedback = buildFeedback({
            role,
            metrics,
            transcript,
          });

          await prisma.attempt.create({
            data: {
              userId: user.id,
              tenantId,
              ts: daysAgo(i + userIndex * perProfile, perProfile * ROLE_TEMPLATES.length),
              question: pick(role.questionPool),
              questionCategory: role.questionCategory,
              questionSource: "seeded",
              evaluationFramework: role.evaluationFramework,
              transcript,
              inputMethod: "spoken",

              score: feedback.score,
              communicationScore: feedback.communication_score,
              confidenceScore: feedback.confidence_score,

              wpm: metrics.wpm,
              prosody: {
                monotoneScore: metrics.monotoneScore,
              },
              deliveryMetrics: {
                fillerWordsPerMin: Math.max(
                  0.5,
                  Math.round((metrics.fillersPer100 / 1.7) * 10) / 10
                ),
                pacingScore: score(6.2, 9.1),
              },
              feedback,

              jobDesc: role.jobDescription,
              jobProfileId: profile.id,
              jobProfileTitle: profile.title,
              jobProfileCompany: profile.company,
              jobProfileRoleType: profile.roleType,
            },
          });

          createdAttempts += 1;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      resetAttempts,
      usersSeeded: 5,
      profilesTouched: touchedProfiles,
      attemptsCreated: createdAttempts,
      perProfile,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "SEED_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
