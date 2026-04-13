import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import {
  ROLE_CLUSTERS,
  inferClusterForOccupation,
  findOccupation,
  type ClusterKey,
} from "@/app/lib/roleClusters";
import { computeClusterReadiness } from "@/app/lib/feedback/clusterReadiness";

export const runtime = "nodejs";

// GET /api/cluster-readiness
// Returns readiness scores for all clusters the user is targeting,
// plus suggested next roles to add based on aptitude results.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      targetRole: true,
      targetRoleKeys: true,
      major: true,
      targetIndustry: true,
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Build the list of target role keys
  const storedKeys: string[] = Array.isArray(user.targetRoleKeys)
    ? (user.targetRoleKeys as string[])
    : [];

  // Fall back to legacy single targetRole if no multi-role set
  const legacyKey = user.targetRole
    ? user.targetRole.toLowerCase().replace(/[^a-z0-9]+/g, "_")
    : null;

  const allRoleKeys = storedKeys.length > 0
    ? storedKeys
    : legacyKey ? [legacyKey] : [];

  // Fetch attempt history (last 200 attempts)
  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id, deletedAt: null },
    select: { ts: true, feedback: true, score: true, evaluationFramework: true },
    orderBy: { ts: "desc" },
    take: 200,
  });

  // Group target roles by cluster
  const clusterTargets = new Map<ClusterKey, string[]>();
  for (const key of allRoleKeys) {
    const occ = findOccupation(key);
    if (!occ) continue;
    const ck = inferClusterForOccupation(occ);
    if (!clusterTargets.has(ck)) clusterTargets.set(ck, []);
    clusterTargets.get(ck)!.push(key);
  }

  // If user has no target roles yet, infer from attempt history
  if (clusterTargets.size === 0) {
    // Use all clusters so they see their scores across the board
    for (const cluster of ROLE_CLUSTERS) {
      clusterTargets.set(cluster.key, []);
    }
  }

  // Compute readiness per cluster
  const clusterResults = await Promise.all(
    Array.from(clusterTargets.entries()).map(async ([clusterKey, roleKeys]) => {
      const cluster = ROLE_CLUSTERS.find((c) => c.key === clusterKey);
      if (!cluster) return null;

      const readiness = computeClusterReadiness(cluster, attempts.map((a) => ({
        ts: a.ts,
        feedback: a.feedback,
        score: a.score,
        evaluationFramework: a.evaluationFramework,
      })));

      // Fetch cached competency maps for target roles
      const competencyMaps = roleKeys.length > 0
        ? await prisma.roleCompetencyMap.findMany({
            where: { roleKey: { in: roleKeys } },
            select: { roleKey: true, roleTitle: true, questions: true, salaryRange: true },
          })
        : [];

      // Build "next questions to practice" — questions from competency maps not yet well-covered
      const nextQuestions = competencyMaps
        .flatMap((m) => (m.questions as any[]).slice(0, 3))
        .slice(0, 5);

      // Avg salary range across target roles
      const salaryRanges = competencyMaps
        .map((m) => m.salaryRange as { min: number; max: number } | null)
        .filter(Boolean) as { min: number; max: number }[];
      const avgSalaryMin = salaryRanges.length
        ? Math.round(salaryRanges.reduce((s, r) => s + r.min, 0) / salaryRanges.length)
        : null;
      const avgSalaryMax = salaryRanges.length
        ? Math.round(salaryRanges.reduce((s, r) => s + r.max, 0) / salaryRanges.length)
        : null;

      return {
        clusterKey,
        clusterLabel: cluster.label,
        clusterDescription: cluster.description,
        targetRoles: roleKeys,
        readiness,
        nextQuestions,
        salary: avgSalaryMin && avgSalaryMax ? { min: avgSalaryMin, max: avgSalaryMax } : null,
      };
    })
  );

  const results = clusterResults
    .filter(Boolean)
    .sort((a, b) => (b!.readiness.overall) - (a!.readiness.overall));

  return NextResponse.json({
    targetRoleKeys: allRoleKeys,
    clusters: results,
    totalAttempts: attempts.length,
  });
}

// PATCH /api/cluster-readiness
// Update the user's target role keys
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { targetRoleKeys } = await req.json() as { targetRoleKeys: string[] };
  if (!Array.isArray(targetRoleKeys)) {
    return NextResponse.json({ error: "targetRoleKeys array required" }, { status: 400 });
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data: { targetRoleKeys: targetRoleKeys.slice(0, 8) }, // cap at 8
  });

  return NextResponse.json({ ok: true });
}
