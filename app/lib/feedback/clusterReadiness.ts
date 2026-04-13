/**
 * Cluster Readiness Scoring
 *
 * Computes a 0–100 readiness score for a given role cluster
 * based on a user's practice history (attempt records).
 *
 * Scoring approach:
 *   1. Extract 7-dimension scores from each attempt's feedback
 *   2. Map dimensions → cluster competencies via each competency's dimensionKeys
 *   3. Weight and average per competency
 *   4. Compute weighted overall readiness
 *   5. Apply a recency bias (recent sessions count more)
 *   6. Apply a volume bonus (more sessions = more confidence in score)
 */

import type { RoleCluster } from "@/app/lib/roleClusters";

export interface AttemptForReadiness {
  ts: Date | string;
  feedback: any;
  score: number | null;
  evaluationFramework?: string | null;
}

export interface CompetencyScore {
  key: string;
  label: string;
  score: number;      // 0–10
  weight: number;
  meetsThreshold: boolean;
  sessionCount: number;
}

export interface ClusterReadinessResult {
  overall: number;                    // 0–100
  label: "not_ready" | "developing" | "ready" | "strong";
  competencyScores: CompetencyScore[];
  topStrength: CompetencyScore | null;
  topGap: CompetencyScore | null;
  sessionCount: number;
  hasEnoughData: boolean;             // false if < 3 scored sessions
  narrative: string;                  // 1-sentence coaching note
}

const DIM_TO_SCORE: Record<string, (feedback: any) => number | null> = {
  narrative_clarity:   (f) => f?.dimension_scores?.narrative_clarity?.score   ?? null,
  evidence_quality:    (f) => f?.dimension_scores?.evidence_quality?.score    ?? null,
  ownership_agency:    (f) => f?.dimension_scores?.ownership_agency?.score    ?? null,
  response_control:    (f) => f?.dimension_scores?.response_control?.score    ?? null,
  cognitive_depth:     (f) => f?.dimension_scores?.cognitive_depth?.score     ?? null,
  presence_confidence: (f) => f?.dimension_scores?.presence_confidence?.score ?? null,
  vocal_engagement:    (f) => f?.dimension_scores?.vocal_engagement?.score    ?? null,
};

function avg(vals: number[]): number | null {
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function recencyWeight(ts: Date | string, now: Date): number {
  const daysAgo = (now.getTime() - new Date(ts).getTime()) / (1000 * 60 * 60 * 24);
  // Exponential decay: full weight within 14 days, half weight at 30 days, quarter at 60 days
  return Math.max(0.25, Math.exp(-daysAgo / 30));
}

export function computeClusterReadiness(
  cluster: RoleCluster,
  attempts: AttemptForReadiness[],
): ClusterReadinessResult {
  const now = new Date();

  // Only use interview/mock-interview attempts with dimension scores
  const scoredAttempts = attempts.filter((a) => {
    const framework = a.evaluationFramework;
    if (framework === "networking_pitch" || framework === "public_speaking") return false;
    return a.feedback?.dimension_scores != null;
  });

  const hasEnoughData = scoredAttempts.length >= 3;

  // Compute per-competency scores
  const competencyScores: CompetencyScore[] = cluster.competencies.map((comp) => {
    const weightedVals: Array<{ val: number; weight: number }> = [];

    for (const attempt of scoredAttempts) {
      const dimVals = comp.dimensionKeys
        .map((dk) => DIM_TO_SCORE[dk]?.(attempt.feedback))
        .filter((v): v is number => v !== null);

      if (dimVals.length === 0) continue;
      const dimAvg = dimVals.reduce((a, b) => a + b, 0) / dimVals.length;
      const rw = recencyWeight(attempt.ts, now);
      weightedVals.push({ val: dimAvg, weight: rw });
    }

    const totalWeight = weightedVals.reduce((s, v) => s + v.weight, 0);
    const score = totalWeight > 0
      ? weightedVals.reduce((s, v) => s + v.val * v.weight, 0) / totalWeight
      : 0;

    return {
      key: comp.key,
      label: comp.label,
      score: Math.round(score * 10) / 10,
      weight: comp.weight,
      meetsThreshold: score >= comp.threshold,
      sessionCount: weightedVals.length,
    };
  });

  // Weighted overall score (0–10 → normalize to 0–100)
  const totalW = competencyScores.reduce((s, c) => s + c.weight, 0);
  const raw10 = totalW > 0
    ? competencyScores.reduce((s, c) => s + c.score * c.weight, 0) / totalW
    : 0;

  // Volume bonus: 0 sessions = 0, 3 sessions = 70% confidence, 10+ = full confidence
  const volumeFactor = Math.min(1, scoredAttempts.length / 10);
  const confidenceMultiplier = hasEnoughData ? (0.7 + 0.3 * volumeFactor) : (scoredAttempts.length / 3) * 0.7;

  const rawPct = (raw10 / 10) * 100;
  const overall = Math.round(rawPct * confidenceMultiplier);

  // Readiness label
  const { notReady, developing, ready } = cluster.readinessThresholds;
  const label: ClusterReadinessResult["label"] =
    overall < notReady  ? "not_ready"  :
    overall < developing ? "developing" :
    overall < ready      ? "ready"      : "strong";

  // Top strength and gap
  const sorted = [...competencyScores].sort((a, b) => b.score - a.score);
  const topStrength = sorted[0]?.score >= (sorted[0] ? cluster.competencies.find(c => c.key === sorted[0].key)?.threshold ?? 6 : 0)
    ? sorted[0] : null;
  const topGap = [...competencyScores].sort((a, b) => a.score - b.score)[0] ?? null;

  // Narrative
  const narrative = buildNarrative(label, topStrength, topGap, scoredAttempts.length, cluster.label);

  return { overall, label, competencyScores, topStrength, topGap, sessionCount: scoredAttempts.length, hasEnoughData, narrative };
}

function buildNarrative(
  label: ClusterReadinessResult["label"],
  strength: CompetencyScore | null,
  gap: CompetencyScore | null,
  sessions: number,
  clusterLabel: string,
): string {
  if (sessions === 0) return `Start practicing ${clusterLabel} questions to build your readiness score.`;
  if (sessions < 3)   return `${sessions} session${sessions > 1 ? "s" : ""} in — keep going, readiness score unlocks at 3.`;

  const strengthPart = strength ? `Your ${strength.label.toLowerCase()} is a real asset` : "You're building solid foundations";
  const gapPart = gap ? `— focus on ${gap.label.toLowerCase()} to unlock your next readiness level` : "";

  switch (label) {
    case "not_ready":   return `${strengthPart}. You're in the early stages of ${clusterLabel} prep ${gapPart}.`;
    case "developing":  return `${strengthPart}. You're making progress ${gapPart}.`;
    case "ready":       return `${strengthPart} ${gapPart}. You're competitive for ${clusterLabel} roles.`;
    case "strong":      return `${strengthPart}. You're at a strong readiness level for ${clusterLabel} interviews.`;
  }
}
