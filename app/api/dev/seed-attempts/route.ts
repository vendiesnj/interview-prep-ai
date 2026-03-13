import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

type Persona = {
  key: string;
  demoLabel: string;
  title: string;
  company: string;
  roleType: string;
  jobDescription: string;
  questionCategory: "behavioral" | "role_specific" | "technical";
  evaluationFramework: "star" | "technical_explanation" | "experience_depth";
  questionPool: string[];
  transcriptPool: string[];

  scoreMin: number;
  scoreMax: number;
  communicationMin: number;
  communicationMax: number;
  confidenceMin: number;
  confidenceMax: number;
  wpmMin: number;
  wpmMax: number;
  monotoneMin: number;
  monotoneMax: number;
  fillersMin: number;
  fillersMax: number;

  strengthsPool: string[];
  improvementsPool: string[];
  missedOpportunitiesPool: Array<{
    label: string;
    why: string;
    add_sentence: string;
  }>;

  betterAnswerPool: string[];

  relevance: {
    relevanceMin: number;
    relevanceMax: number;
    directnessMin: number;
    directnessMax: number;
    completenessMin: number;
    completenessMax: number;
    offTopicMin: number;
    offTopicMax: number;
    answeredQuestion: boolean;
    missedPartsPool: string[];
    explanationPool: string[];
  };

  star?: {
    situationMin: number;
    situationMax: number;
    taskMin: number;
    taskMax: number;
    actionMin: number;
    actionMax: number;
    resultMin: number;
    resultMax: number;
    missingPool: string[][];
    advice: {
      situation: string;
      task: string;
      action: string;
      result: string;
    };
  };

  technicalExplanation?: {
    technical_clarityMin: number;
    technical_clarityMax: number;
    technical_accuracyMin: number;
    technical_accuracyMax: number;
    structureMin: number;
    structureMax: number;
    depthMin: number;
    depthMax: number;
    practical_reasoningMin: number;
    practical_reasoningMax: number;
    strengthsPool: string[];
    improvementsPool: string[];
  };

  experienceDepth?: {
    experience_depthMin: number;
    experience_depthMax: number;
    specificityMin: number;
    specificityMax: number;
    tool_fluencyMin: number;
    tool_fluencyMax: number;
    business_impactMin: number;
    business_impactMax: number;
    example_qualityMin: number;
    example_qualityMax: number;
    strengthsPool: string[];
    improvementsPool: string[];
  };
};

const PERSONAS: Persona[] = [
      {
    key: "engineering_ops",
    demoLabel: "Engineering Demo",
    title: "Supply Chain Analyst",
    company: "Apple",
    roleType: "Operations",
    jobDescription:
      "Support supply planning, inventory optimization, cross-functional execution, supplier coordination, and KPI-driven problem solving.",
    questionCategory: "technical",
    evaluationFramework: "technical_explanation",
    questionPool: [
      "How would you improve a constrained supply planning process?",
      "Walk me through how you would manage inventory risk across multiple suppliers.",
      "How do you prioritize supply chain issues when several metrics move at once?",
      "Describe how you would analyze a forecast miss and recommend action.",
    ],
    transcriptPool: [
      "I would start by identifying the constraint, quantifying its impact on supply and service level, and then segmenting the problem by material, supplier, and timing. From there I would build scenarios, align stakeholders on tradeoffs, and recommend the path that protects customer commitments while minimizing cost and inventory exposure.",
      "My approach would be to first isolate the root cause of the miss, determine whether it came from demand, supply, or execution, and then create a corrective action plan. I would use the data to prioritize the largest business impact first, then partner cross-functionally to stabilize the plan.",
      "I typically break this into diagnosis, scenario modeling, and execution. First I identify what changed, then I compare possible responses, and finally I drive the decision that best protects continuity, service, and inventory health.",
    ],
    scoreMin: 6.8,
    scoreMax: 8.6,
    communicationMin: 6.5,
    communicationMax: 8.3,
    confidenceMin: 5.8,
    confidenceMax: 7.6,
    wpmMin: 145,
    wpmMax: 172,
    monotoneMin: 5.5,
    monotoneMax: 7.8,
    fillersMin: 1.6,
    fillersMax: 3.8,
    strengthsPool: [
      "Strong technical reasoning and structured problem solving.",
      "Good prioritization of operational tradeoffs.",
      "Shows credible cross-functional thinking.",
    ],
    improvementsPool: [
      "Slow down slightly when explaining technical steps.",
      "Add clearer business impact at the end of the answer.",
      "Use more vocal emphasis on recommendations and outcomes.",
    ],
    missedOpportunitiesPool: [
      {
        label: "Quantify the impact",
        why: "The answer explains the process well but does not land on a measurable business outcome.",
        add_sentence: "The result was a more stable plan that improved service while reducing excess inventory exposure.",
      },
      {
        label: "Show ownership sooner",
        why: "The answer is thoughtful but starts a little passively.",
        add_sentence: "I led the analysis by first isolating the main operational constraint and quantifying the risk.",
      },
    ],
    betterAnswerPool: [
      "I would start by identifying the specific constraint and quantifying its impact on service level, inventory, and timing. Then I would build a small set of scenarios, compare tradeoffs, and recommend the path that protects customer commitments while minimizing excess inventory and cost. The key is to turn a planning problem into a decision with a measurable business outcome.",
    ],
    relevance: {
      relevanceMin: 7.2,
      relevanceMax: 9.0,
      directnessMin: 6.8,
      directnessMax: 8.4,
      completenessMin: 7.0,
      completenessMax: 8.8,
      offTopicMin: 7.5,
      offTopicMax: 9.2,
      answeredQuestion: true,
      missedPartsPool: ["Could have stated the business impact more directly."],
      explanationPool: [
        "You stayed on question and explained a practical approach, but the answer would be stronger with a crisper final recommendation and business impact line.",
      ],
    },
    technicalExplanation: {
      technical_clarityMin: 7.2,
      technical_clarityMax: 8.8,
      technical_accuracyMin: 7.4,
      technical_accuracyMax: 9.0,
      structureMin: 6.8,
      structureMax: 8.2,
      depthMin: 7.3,
      depthMax: 8.9,
      practical_reasoningMin: 7.5,
      practical_reasoningMax: 9.1,
      strengthsPool: [
        "Good operational logic and scenario thinking.",
        "Demonstrates strong prioritization under constraints.",
      ],
      improvementsPool: [
        "Translate the technical logic into a clearer business recommendation.",
        "Make the final answer more concise and executive-friendly.",
      ],
    },
  },
  {
    key: "science_research",
    demoLabel: "Science Demo",
    title: "Research Associate",
    company: "Moderna",
    roleType: "Science",
    jobDescription:
      "Support experimental execution, documentation, collaboration with cross-functional teams, data interpretation, and communication of findings.",
    questionCategory: "behavioral",
    evaluationFramework: "experience_depth",
    questionPool: [
      "Tell me about a time you solved a research problem.",
      "Describe a time your experiment did not go as planned.",
      "How have you balanced speed with scientific rigor?",
      "Tell me about a time you improved a lab process.",
    ],
    transcriptPool: [
      "In one project I was supporting, an experiment began producing inconsistent results across runs. I reviewed the process step by step, compared the conditions between runs, and worked with the team to isolate a handling issue. After adjusting the process and documenting the change, we were able to restore consistency and move the work forward.",
      "I once had a study where the expected result did not replicate cleanly. I paused the downstream work, reviewed the method, and partnered with the team to identify where variability was being introduced. That helped us refine the workflow and improve reliability in future runs.",
      "When I approach research problems, I focus on reproducibility first, then speed. I want to make sure the method is stable and documented before scaling the work, because strong scientific execution depends on repeatability.",
    ],
    scoreMin: 6.6,
    scoreMax: 8.4,
    communicationMin: 7.0,
    communicationMax: 8.6,
    confidenceMin: 6.5,
    confidenceMax: 8.1,
    wpmMin: 112,
    wpmMax: 142,
    monotoneMin: 3.2,
    monotoneMax: 5.8,
    fillersMin: 0.6,
    fillersMax: 2.2,
    strengthsPool: [
      "Clear and composed delivery.",
      "Strong process discipline and credibility.",
      "Good specificity around experimentation and workflow.",
    ],
    improvementsPool: [
      "End with a stronger measurable result.",
      "Make the final business or research impact more explicit.",
      "Show slightly more ownership in the outcome statement.",
    ],
    missedOpportunitiesPool: [
      {
        label: "Stronger impact close",
        why: "The story explains the process well but does not fully land the result.",
        add_sentence: "As a result, we improved reliability across runs and reduced repeat troubleshooting.",
      },
      {
        label: "Name your ownership more directly",
        why: "You sound collaborative, but the answer could show your direct contribution more clearly.",
        add_sentence: "I led the review of the process and documented the change that stabilized the workflow.",
      },
    ],
    betterAnswerPool: [
      "An experiment I supported started producing inconsistent results across runs. I reviewed each step of the process, compared run conditions, and helped isolate a handling issue that was introducing variability. After we adjusted the workflow and documented the change, the experiment became more repeatable, which improved reliability and helped the team move forward with greater confidence.",
    ],
    relevance: {
      relevanceMin: 7.8,
      relevanceMax: 9.3,
      directnessMin: 7.4,
      directnessMax: 8.9,
      completenessMin: 7.2,
      completenessMax: 8.8,
      offTopicMin: 8.0,
      offTopicMax: 9.4,
      answeredQuestion: true,
      missedPartsPool: ["Could have highlighted the final impact more clearly."],
      explanationPool: [
        "You answered the question directly and stayed focused. The biggest missing piece was a sharper final outcome line.",
      ],
    },
    experienceDepth: {
      experience_depthMin: 7.0,
      experience_depthMax: 8.8,
      specificityMin: 7.4,
      specificityMax: 9.0,
      tool_fluencyMin: 6.8,
      tool_fluencyMax: 8.4,
      business_impactMin: 5.8,
      business_impactMax: 7.5,
      example_qualityMin: 7.2,
      example_qualityMax: 8.9,
      strengthsPool: [
        "Good specificity and credible research process.",
        "Strong example quality and clarity.",
      ],
      improvementsPool: [
        "Make the final impact more measurable.",
        "State your ownership and contribution more directly.",
      ],
    },
  },
   {
    key: "business_finance",
    demoLabel: "Finance Demo",
    title: "Financial Analyst",
    company: "JPMorgan",
    roleType: "Finance",
    jobDescription:
      "Support financial analysis, stakeholder communication, reporting, business case development, and decision support across fast-moving teams.",
    questionCategory: "behavioral",
    evaluationFramework: "star",
    questionPool: [
      "Tell me about a time you influenced a decision with data.",
      "Describe a time you had to manage competing priorities.",
      "Tell me about a time you improved a reporting process.",
      "Describe a time you worked with stakeholders who disagreed.",
    ],
    transcriptPool: [
      "I was supporting a reporting process that had several manual steps and caused delays at month end. I reviewed the workflow, identified the biggest bottlenecks, and proposed a more standardized approach. After aligning with stakeholders and implementing the change, the process became faster and easier to maintain.",
      "In one project, I had to support multiple deadlines while also responding to ad hoc requests from different stakeholders. I prioritized by business impact and timing, communicated tradeoffs early, and kept the highest-risk deliverables moving first. That helped me stay on top of the work without missing critical deadlines.",
      "I used data to support a decision by first clarifying what the stakeholders needed to know, then building a cleaner analysis that made the tradeoffs obvious. Once the key metric was visible, it was much easier to align on a recommendation.",
    ],
    scoreMin: 6.9,
    scoreMax: 8.7,
    communicationMin: 7.3,
    communicationMax: 8.9,
    confidenceMin: 6.8,
    confidenceMax: 8.4,
    wpmMin: 125,
    wpmMax: 152,
    monotoneMin: 3.8,
    monotoneMax: 6.0,
    fillersMin: 1.2,
    fillersMax: 3.2,
    strengthsPool: [
      "Strong communication and stakeholder framing.",
      "Good answer flow and professional polish.",
      "Clear business-oriented structure.",
    ],
    improvementsPool: [
      "Use more concrete metrics in the result.",
      "Make the closing impact sharper and more memorable.",
      "Cut a little setup and land the result faster.",
    ],
    missedOpportunitiesPool: [
      {
        label: "Add measurable outcome",
        why: "The answer sounds polished but lacks a strong quantified result.",
        add_sentence: "The result was a faster reporting cycle and better visibility for decision-making.",
      },
      {
        label: "Tighten the setup",
        why: "The context is clear, but it can be shorter so the action lands faster.",
        add_sentence: "The process had become too manual and was slowing month-end reporting.",
      },
    ],
    betterAnswerPool: [
      "I was supporting a reporting process with several manual steps that slowed month-end close. I mapped the workflow, identified the biggest bottlenecks, and proposed a more standardized approach so the team could reduce rework and move faster. After aligning stakeholders and implementing the change, the process became more efficient, easier to maintain, and more useful for decision-making.",
    ],
    relevance: {
      relevanceMin: 7.5,
      relevanceMax: 9.2,
      directnessMin: 7.0,
      directnessMax: 8.7,
      completenessMin: 7.1,
      completenessMax: 8.8,
      offTopicMin: 7.8,
      offTopicMax: 9.3,
      answeredQuestion: true,
      missedPartsPool: ["Could have quantified the final impact more directly."],
      explanationPool: [
        "You stayed on question and structured the story well. The main missing piece was a stronger, more measurable result.",
      ],
    },
    star: {
      situationMin: 7.2,
      situationMax: 8.8,
      taskMin: 7.0,
      taskMax: 8.7,
      actionMin: 7.2,
      actionMax: 8.8,
      resultMin: 5.8,
      resultMax: 7.6,
      missingPool: [["result"], [], ["result"], []],
      advice: {
        situation: "Frame the context in one sentence so the interviewer understands the stakes faster.",
        task: "State your responsibility more explicitly so your ownership is clear.",
        action: "Use stronger verbs and keep the action sequence more concrete.",
        result: "Close with a measurable business result or a clearer outcome statement.",
      },
    },
  },
];

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function score(min: number, max: number) {
  return Math.round(random(min, max) * 10) / 10;
}

async function ensureProfileForUser(userId: string, tenantId: string | null, persona: Persona) {
  const existing = await prisma.attempt.findFirst({
    where: {
      userId,
      tenantId,
      jobProfileTitle: persona.title,
      jobProfileCompany: persona.company,
      jobProfileRoleType: persona.roleType,
    },
    select: {
      jobProfileId: true,
    },
  });

  return existing?.jobProfileId ?? `${persona.key}_${userId}`;
}

function buildFeedback(persona: Persona) {
  const overall = score(persona.scoreMin, persona.scoreMax);
  const communication = score(persona.communicationMin, persona.communicationMax);
  const confidence = score(persona.confidenceMin, persona.confidenceMax);
  const fillersPer100 = score(persona.fillersMin, persona.fillersMax);

  const relevanceScore = score(
    persona.relevance.relevanceMin,
    persona.relevance.relevanceMax
  );
  const directnessScore = score(
    persona.relevance.directnessMin,
    persona.relevance.directnessMax
  );
  const completenessScore = score(
    persona.relevance.completenessMin,
    persona.relevance.completenessMax
  );
  const offTopicScore = score(
    persona.relevance.offTopicMin,
    persona.relevance.offTopicMax
  );

  const feedback: any = {
    score: overall,
    communication_score: communication,
    confidence_score: confidence,
    strengths: [
      pick(persona.strengthsPool),
      pick(persona.strengthsPool),
    ].filter((v, i, a) => a.indexOf(v) === i),
    improvements: [
      pick(persona.improvementsPool),
      pick(persona.improvementsPool),
    ].filter((v, i, a) => a.indexOf(v) === i),
    filler: {
      per100: fillersPer100,
      total: Math.max(1, Math.round(random(1, 10))),
    },
    relevance: {
      relevance_score: relevanceScore,
      directness_score: directnessScore,
      completeness_score: completenessScore,
      off_topic_score: offTopicScore,
      answered_question: persona.relevance.answeredQuestion,
      missed_parts: [pick(persona.relevance.missedPartsPool)],
      relevance_explanation: pick(persona.relevance.explanationPool),
    },
    missed_opportunities: [pick(persona.missedOpportunitiesPool)],
    better_answer: pick(persona.betterAnswerPool),
    keywords_used: [persona.roleType, persona.company].filter(Boolean),
    keywords_missing: ["impact", "metrics"],
  };

  if (persona.star) {
    const missing = pick(persona.star.missingPool);
    feedback.star = {
      situation: score(persona.star.situationMin, persona.star.situationMax),
      task: score(persona.star.taskMin, persona.star.taskMax),
      action: score(persona.star.actionMin, persona.star.actionMax),
      result: score(persona.star.resultMin, persona.star.resultMax),
    };
    feedback.star_missing = missing;
    feedback.star_advice = persona.star.advice;
  }

  if (persona.technicalExplanation) {
    feedback.technical_explanation = {
      technical_clarity: score(
        persona.technicalExplanation.technical_clarityMin,
        persona.technicalExplanation.technical_clarityMax
      ),
      technical_accuracy: score(
        persona.technicalExplanation.technical_accuracyMin,
        persona.technicalExplanation.technical_accuracyMax
      ),
      structure: score(
        persona.technicalExplanation.structureMin,
        persona.technicalExplanation.structureMax
      ),
      depth: score(
        persona.technicalExplanation.depthMin,
        persona.technicalExplanation.depthMax
      ),
      practical_reasoning: score(
        persona.technicalExplanation.practical_reasoningMin,
        persona.technicalExplanation.practical_reasoningMax
      ),
    };
    feedback.technical_strengths = [
      pick(persona.technicalExplanation.strengthsPool),
    ];
    feedback.technical_improvements = [
      pick(persona.technicalExplanation.improvementsPool),
    ];
  }

  if (persona.experienceDepth) {
    feedback.experience_depth = {
      experience_depth: score(
        persona.experienceDepth.experience_depthMin,
        persona.experienceDepth.experience_depthMax
      ),
      specificity: score(
        persona.experienceDepth.specificityMin,
        persona.experienceDepth.specificityMax
      ),
      tool_fluency: score(
        persona.experienceDepth.tool_fluencyMin,
        persona.experienceDepth.tool_fluencyMax
      ),
      business_impact: score(
        persona.experienceDepth.business_impactMin,
        persona.experienceDepth.business_impactMax
      ),
      example_quality: score(
        persona.experienceDepth.example_qualityMin,
        persona.experienceDepth.example_qualityMax
      ),
    };
    feedback.experience_strengths = [
      pick(persona.experienceDepth.strengthsPool),
    ];
    feedback.experience_improvements = [
      pick(persona.experienceDepth.improvementsPool),
    ];
  }

  return feedback;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const count = Math.min(Number(body?.count ?? 180) || 180, 400);

    const users = await prisma.user.findMany({
      select: { id: true, tenantId: true, email: true },
      take: 12,
    });

    if (users.length === 0) {
      return NextResponse.json({ error: "NO_USERS_FOUND" }, { status: 400 });
    }

    let created = 0;

    for (let i = 0; i < count; i++) {
      const user = users[i % users.length];
      const persona = PERSONAS[i % PERSONAS.length];

      await prisma.user.update({
        where: { id: user.id },
        data: { demoPersona: persona.demoLabel },
      });

      const feedback = buildFeedback(persona);
      const profileId = await ensureProfileForUser(user.id, user.tenantId ?? null, persona);
      const monotoneScore = score(persona.monotoneMin, persona.monotoneMax);
      const wpm = Math.round(random(persona.wpmMin, persona.wpmMax));

      await prisma.attempt.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId ?? null,
          ts: new Date(Date.now() - i * 1000 * 60 * 60 * 6),
          question: pick(persona.questionPool),
          questionCategory: persona.questionCategory,
          questionSource: "seeded",
          evaluationFramework: persona.evaluationFramework,
          transcript: pick(persona.transcriptPool),
          inputMethod: "spoken",
          score: feedback.score,
          communicationScore: feedback.communication_score,
          confidenceScore: feedback.confidence_score,
          wpm,
          prosody: {
            monotoneScore,
          },
          deliveryMetrics: {
            fillerWordsPerMin: score(2, 8),
            pacingScore: score(6, 9.5),
          },
          feedback,
          jobDesc: "SEEDED_DEMO_DATA",
          jobProfileId: profileId,
          jobProfileTitle: persona.title,
          jobProfileCompany: persona.company,
          jobProfileRoleType: persona.roleType,
        },
      });

      created += 1;
    }

    return NextResponse.json({ ok: true, created });
  } catch (err: any) {
    return NextResponse.json(
      { error: "SEED_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}