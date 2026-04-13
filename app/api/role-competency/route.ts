import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import OpenAI from "openai";
import { findOccupation, inferClusterForOccupation } from "@/app/lib/roleClusters";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Refresh cached maps older than 90 days
const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

// GET /api/role-competency?roleKey=software_engineer
// Returns the competency map for a role, generating it if not cached
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roleKey = req.nextUrl.searchParams.get("roleKey");
  if (!roleKey) {
    return NextResponse.json({ error: "roleKey required" }, { status: 400 });
  }

  // Check cache first
  const cached = await prisma.roleCompetencyMap.findUnique({ where: { roleKey } });
  if (cached && Date.now() - cached.generatedAt.getTime() < CACHE_TTL_MS) {
    return NextResponse.json(cached);
  }

  // Look up role metadata from O*NET
  const occ = findOccupation(roleKey);
  const roleTitle = occ?.title ?? roleKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const clusterKey = occ ? inferClusterForOccupation(occ) : "operations";
  const salaryRange = occ ? { min: occ.salary[0], max: occ.salary[1] } : null;

  // Generate via GPT-4o
  const generated = await generateCompetencyMap(roleTitle, clusterKey);

  // Upsert into cache
  const record = await prisma.roleCompetencyMap.upsert({
    where: { roleKey },
    create: {
      roleKey,
      roleTitle,
      cluster: clusterKey,
      competencies: generated.competencies,
      questions: generated.questions,
      salaryRange: salaryRange ?? undefined,
    },
    update: {
      competencies: generated.competencies,
      questions: generated.questions,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(record);
}

// POST /api/role-competency
// Body: { roleKeys: string[] }
// Batch-fetches/generates maps for multiple roles
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roleKeys } = await req.json() as { roleKeys: string[] };
  if (!Array.isArray(roleKeys) || roleKeys.length === 0) {
    return NextResponse.json({ error: "roleKeys array required" }, { status: 400 });
  }

  const results: Record<string, any> = {};

  for (const roleKey of roleKeys.slice(0, 10)) { // cap at 10 per request
    const cached = await prisma.roleCompetencyMap.findUnique({ where: { roleKey } });
    if (cached && Date.now() - cached.generatedAt.getTime() < CACHE_TTL_MS) {
      results[roleKey] = cached;
      continue;
    }

    const occ = findOccupation(roleKey);
    const roleTitle = occ?.title ?? roleKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const clusterKey = occ ? inferClusterForOccupation(occ) : "operations";
    const salaryRange = occ ? { min: occ.salary[0], max: occ.salary[1] } : null;

    const generated = await generateCompetencyMap(roleTitle, clusterKey);

    const record = await prisma.roleCompetencyMap.upsert({
      where: { roleKey },
      create: { roleKey, roleTitle, cluster: clusterKey, competencies: generated.competencies, questions: generated.questions, salaryRange: salaryRange ?? undefined },
      update: { competencies: generated.competencies, questions: generated.questions, updatedAt: new Date() },
    });

    results[roleKey] = record;
  }

  return NextResponse.json(results);
}

// ── Generator ─────────────────────────────────────────────────────────────────

async function generateCompetencyMap(roleTitle: string, cluster: string) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 1200,
    messages: [
      {
        role: "system",
        content: `You are an expert interview coach and talent assessment specialist. Generate precise, interview-specific competency maps for any role.`,
      },
      {
        role: "user",
        content: `Generate an interview competency map for: ${roleTitle} (${cluster} cluster)

Return JSON only:
{
  "competencies": [
    {
      "key": "snake_case_key",
      "label": "Competency Label",
      "weight": 0.20,
      "description": "What good looks like for this competency in this role",
      "threshold": 7.0,
      "interviewSignals": ["observable signal 1", "observable signal 2"]
    }
  ],
  "questions": [
    {
      "question": "Full interview question text",
      "competency": "competency_key",
      "type": "behavioral | situational",
      "why": "Why this question matters for this role"
    }
  ]
}

Rules:
- Exactly 5 competencies, weights sum to 1.0
- Exactly 10 questions covering all 5 competencies (2 per competency)
- Questions must be specific to ${roleTitle}, not generic
- Thresholds: 6.0–8.0 range (higher for more competitive roles)
- Interview signals are observable behaviors a screener would note`,
      },
    ],
  });

  const data = JSON.parse(res.choices[0].message.content ?? "{}");
  return {
    competencies: data.competencies ?? [],
    questions: data.questions ?? [],
  };
}
