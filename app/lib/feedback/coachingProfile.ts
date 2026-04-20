/**
 * coachingProfile.ts
 *
 * Builds a comprehensive, all-history coaching profile for a user.
 * Used by:
 *   - The feedback API (LLM context injection — tells the model the user's real patterns)
 *   - The progress/insights page (renders persistent weaknesses, resolved issues, priorities)
 *   - The practice page (computes profile before each submission)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DimensionTrend = {
  key: string;
  label: string;
  allTimeAvg: number;
  recentAvg: number;       // avg of last 5 attempts that have this dimension
  trend: "improving" | "declining" | "stable";
  classification: "persistent_strength" | "strength" | "developing" | "gap" | "persistent_gap";
  attemptCount: number;
};

export type ImprovementPattern = {
  key: string;
  totalCount: number;       // # attempts where this key was flagged
  recentCount: number;      // # of last 5 attempts where flagged
  allTimeFrequency: number; // 0-1, proportion of ALL attempts
  recentlyFlagged: boolean; // flagged in last 3 attempts
  trend: "improving" | "worsening" | "stable";
};

export type StrengthPattern = {
  key: string;
  totalCount: number;
  allTimeFrequency: number;
  recentCount: number;
  consistent: boolean; // appeared in 3+ attempts AND present recently
};

export type ArchetypeEvolution = {
  dominant: string | null;
  dominantFrequency: number;       // proportion of all attempts
  dominantCount: number;
  distribution: Array<{ name: string; count: number; frequency: number }>;
  recentArchetype: string | null;  // most recent attempt
  evolutionNote: string | null;    // set if recent != dominant
};

export type DeliveryProfile = {
  avgWpm: number | null;
  wpmCategory: "slow" | "good" | "fast" | "very_fast" | null;
  wpmTrend: "improving" | "declining" | "stable" | null;
  avgFillersPer100: number | null;
  fillerCategory: "excellent" | "good" | "high" | null;
  fillerTrend: "improving" | "declining" | "stable" | null;
  avgMonotone: number | null;  // 0-10; lower = more engaging
  monotoneCategory: "engaging" | "moderate" | "flat" | null;
  avgEyeContact: number | null;
  eyeContactCategory: "strong" | "moderate" | "weak" | null;
  // Hand & gesture signals (from webcam hand analysis)
  avgGestureScore: number | null;      // 0-100; higher = more expressive
  gestureCategory: "expressive" | "moderate" | "restricted" | null;
  avgFidgetScore: number | null;       // 0-100; lower is better
  fidgetCategory: "composed" | "some_fidgeting" | "high_fidgeting" | null;
  avgFaceTouchRate: number | null;     // avg face touch events per session
  faceTouchFlag: boolean;              // true if consistent face touching across sessions
};

export type StarPattern = {
  behavioralAttemptCount: number;
  avgSituation: number | null;
  avgTask: number | null;
  avgAction: number | null;
  avgResult: number | null;
  weakestComponent: "situation" | "task" | "action" | "result" | null;
  strongestComponent: "situation" | "task" | "action" | "result" | null;
  resultTrend: "improving" | "declining" | "stable" | null;
};

export type LinguisticProfile = {
  avgHedgingScore: number | null;          // higher = more hedging (bad)
  avgCognitiveComplexity: number | null;   // higher = better
  avgBehavioralIndicator: number | null;   // higher = better
  hedgingTrend: "improving" | "declining" | "stable" | null;
};

export type CoachingPriority = {
  key: string;   // original snake_case key for action lookup
  area: string;  // human-readable label
  evidence: string;
  urgency: "critical" | "high" | "medium";
  type: "dimension" | "delivery" | "star" | "linguistic" | "improvement_theme";
};

export type UserCoachingProfile = {
  totalAttempts: number;
  firstAttemptTs: number | null;
  overallTrajectory: {
    allTimeAvg: number | null;
    recentAvg: number | null;    // last 5
    peakScore: number | null;
    trend: "improving" | "declining" | "plateau";
    trendStrength: "strong" | "moderate" | "slight";
  };
  dimensionProfile: DimensionTrend[];
  improvementPatterns: ImprovementPattern[];   // sorted by frequency desc
  strengthPatterns: StrengthPattern[];          // sorted by frequency desc
  resolvedWeaknesses: string[];                 // keys that were persistent but not recent
  archetypeEvolution: ArchetypeEvolution;
  deliveryProfile: DeliveryProfile;
  starPattern: StarPattern;
  linguisticProfile: LinguisticProfile;
  categoryPerformance: Array<{ category: string; attempts: number; avgScore: number }>;
  topPriorities: CoachingPriority[];
  llmContext: string;  // compact, actionable text block for LLM injection
};

// ---------------------------------------------------------------------------
// Dimension metadata
// ---------------------------------------------------------------------------

const DIM_LABELS: Record<string, string> = {
  narrative_clarity: "Narrative Clarity",
  evidence_quality: "Evidence Quality",
  ownership_agency: "Ownership & Agency",
  vocal_engagement: "Vocal Engagement",
  response_control: "Response Control",
  cognitive_depth: "Cognitive Depth",
  presence_confidence: "Presence & Confidence",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function n(v: any): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function avg(vals: number[]): number | null {
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function round1(v: number | null): number | null {
  return v === null ? null : Math.round(v * 10) / 10;
}

function trendDir(vals: number[]): "improving" | "declining" | "stable" {
  if (vals.length < 3) return "stable";
  const half = Math.floor(vals.length / 2);
  const older = avg(vals.slice(0, half))!;
  const newer = avg(vals.slice(-half))!;
  const delta = newer - older;
  if (delta >= 0.4) return "improving";
  if (delta <= -0.4) return "declining";
  return "stable";
}

function wpmTrendDir(vals: number[]): "improving" | "declining" | "stable" {
  if (vals.length < 3) return "stable";
  const half = Math.floor(vals.length / 2);
  const olderAvg = avg(vals.slice(0, half))!;
  const newerAvg = avg(vals.slice(-half))!;
  // "improving" for WPM means moving toward 115-145 range
  const olderDist = Math.abs(olderAvg - 130);
  const newerDist = Math.abs(newerAvg - 130);
  if (newerDist < olderDist - 5) return "improving";
  if (newerDist > olderDist + 5) return "declining";
  return "stable";
}

// ---------------------------------------------------------------------------
// Extractor helpers for history entries
// ---------------------------------------------------------------------------

function getScore(h: any): number | null {
  const s = n(h?.score) ?? n(h?.feedback?.score);
  if (s === null) return null;
  // Normalize: scores over 20 are already /100, under 20 are /10
  return s > 20 ? s : s * 10;
}

function getFillersPer100(h: any): number | null {
  return n(h?.feedback?.filler?.per100);
}

function getWpm(h: any): number | null {
  return n(h?.wpm) ?? n(h?.feedback?.wpm);
}

function getMonotone(h: any): number | null {
  return n(h?.prosody?.monotoneScore) ?? n(h?.feedback?.deliveryMetrics?.acoustics?.monotoneScore);
}

function getEyeContact(h: any): number | null {
  return n(h?.deliveryMetrics?.face?.eyeContact);
}

function getGestureScore(h: any): number | null {
  return n(h?.deliveryMetrics?.hands?.gestureScore);
}

function getFidgetScore(h: any): number | null {
  return n(h?.deliveryMetrics?.hands?.fidgetScore);
}

function getFaceTouchCount(h: any): number | null {
  return n(h?.deliveryMetrics?.hands?.faceTouchCount);
}

function getDimensions(h: any): Record<string, number> | null {
  const ds = h?.feedback?.dimension_scores;
  if (!ds || typeof ds !== "object") return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(ds)) {
    const score = n((v as any)?.score);
    if (score !== null) out[k] = score;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function getImprovementThemeKeys(h: any): string[] {
  const keys = h?.feedback?.improvement_theme_keys;
  return Array.isArray(keys) ? keys : [];
}

function getStrengthThemeKeys(h: any): string[] {
  const keys = h?.feedback?.strength_theme_keys;
  return Array.isArray(keys) ? keys : [];
}

function getArchetype(h: any): string | null {
  return typeof h?.feedback?.delivery_archetype === "string" ? h.feedback.delivery_archetype : null;
}

function getStar(h: any): { situation: number; task: number; action: number; result: number } | null {
  const s = h?.feedback?.star;
  if (!s || typeof s !== "object") return null;
  const sit = n(s.situation);
  const task = n(s.task);
  const action = n(s.action);
  const result = n(s.result);
  if (sit === null && task === null && action === null && result === null) return null;
  return {
    situation: sit ?? 0,
    task: task ?? 0,
    action: action ?? 0,
    result: result ?? 0,
  };
}

function getIBM(h: any): {
  hedging: number | null;
  cognitive: number | null;
  behavioral: number | null;
} {
  const ibm = h?.feedback?.ibm_metrics;
  if (!ibm) return { hedging: null, cognitive: null, behavioral: null };
  return {
    hedging: n(ibm.hedgingPenaltyScore),
    cognitive: n(ibm.cognitiveComplexityScore),
    behavioral: n(ibm.behavioralIndicatorScore),
  };
}

// ---------------------------------------------------------------------------
// Core builder
// ---------------------------------------------------------------------------

export function buildUserCoachingProfile(history: any[]): UserCoachingProfile {
  // history is newest-first (same order as localStorage/API)
  const all = history.filter((h) => getScore(h) !== null);

  if (all.length === 0) {
    return buildEmptyProfile();
  }

  const totalAttempts = all.length;
  const firstAttemptTs: number | null = all.length > 0 ? (n(all[all.length - 1]?.ts) ?? null) : null;

  // ── Overall trajectory ──────────────────────────────────────────────────
  const allScores = all.map(getScore).filter((s): s is number => s !== null);
  const recentScores = allScores.slice(0, 5);
  const olderScores = allScores.slice(5);

  const allTimeAvg = round1(avg(allScores));
  const recentAvg = round1(avg(recentScores));
  const peakScore = allScores.length ? Math.max(...allScores) : null;

  let trend: "improving" | "declining" | "plateau" = "plateau";
  let trendStrength: "strong" | "moderate" | "slight" = "slight";

  if (olderScores.length >= 3 && recentScores.length >= 2) {
    const olderAvg = avg(olderScores)!;
    const newAvg = avg(recentScores)!;
    const delta = newAvg - olderAvg;
    if (delta >= 5) { trend = "improving"; trendStrength = delta >= 10 ? "strong" : "moderate"; }
    else if (delta >= 2) { trend = "improving"; trendStrength = "slight"; }
    else if (delta <= -5) { trend = "declining"; trendStrength = delta <= -10 ? "strong" : "moderate"; }
    else if (delta <= -2) { trend = "declining"; trendStrength = "slight"; }
  }

  // ── Dimension profile ───────────────────────────────────────────────────
  const dimAllScores: Record<string, number[]> = {};
  const dimRecentScores: Record<string, number[]> = {};  // last 5 attempts with this dim

  for (let i = 0; i < all.length; i++) {
    const dims = getDimensions(all[i]);
    if (!dims) continue;
    for (const [k, v] of Object.entries(dims)) {
      if (!dimAllScores[k]) dimAllScores[k] = [];
      dimAllScores[k].push(v);
      if (i < 5) {
        if (!dimRecentScores[k]) dimRecentScores[k] = [];
        dimRecentScores[k].push(v);
      }
    }
  }

  const dimensionProfile: DimensionTrend[] = [];
  for (const key of Object.keys(DIM_LABELS)) {
    const allVals = dimAllScores[key] ?? [];
    if (allVals.length === 0) continue;

    const allTimeAvgDim = round1(avg(allVals))!;
    const recentVals = dimRecentScores[key] ?? [];
    const recentAvgDim = round1(avg(recentVals.length ? recentVals : allVals))!;

    // Trend: compare oldest half vs newest half
    const dimTrend = trendDir(allVals.slice().reverse()); // reverse to oldest-first

    let classification: DimensionTrend["classification"];
    if (allTimeAvgDim >= 7.5 && recentAvgDim >= 7.0) {
      classification = allVals.length >= 3 ? "persistent_strength" : "strength";
    } else if (allTimeAvgDim >= 6.5) {
      classification = "strength";
    } else if (allTimeAvgDim >= 5.5) {
      classification = "developing";
    } else if (allTimeAvgDim < 5.0 && allVals.length >= 3) {
      classification = "persistent_gap";
    } else {
      classification = "gap";
    }

    dimensionProfile.push({
      key,
      label: DIM_LABELS[key] ?? key,
      allTimeAvg: allTimeAvgDim,
      recentAvg: recentAvgDim,
      trend: dimTrend,
      classification,
      attemptCount: allVals.length,
    });
  }
  // Sort by gap severity first, then strength
  dimensionProfile.sort((a, b) => a.allTimeAvg - b.allTimeAvg);

  // ── Improvement theme key patterns ──────────────────────────────────────
  const improvThemeCounts: Record<string, number> = {};
  const improvRecentCounts: Record<string, number> = {};
  const improvLast3Counts: Record<string, number> = {};

  const recentSlice = all.slice(0, 5);
  const last3Slice = all.slice(0, 3);

  for (const h of all) {
    for (const key of getImprovementThemeKeys(h)) {
      improvThemeCounts[key] = (improvThemeCounts[key] ?? 0) + 1;
    }
  }
  for (const h of recentSlice) {
    for (const key of getImprovementThemeKeys(h)) {
      improvRecentCounts[key] = (improvRecentCounts[key] ?? 0) + 1;
    }
  }
  for (const h of last3Slice) {
    for (const key of getImprovementThemeKeys(h)) {
      improvLast3Counts[key] = (improvLast3Counts[key] ?? 0) + 1;
    }
  }

  // Older slice (6-15 attempts ago) for trend comparison
  const olderImprovCounts: Record<string, number> = {};
  for (const h of all.slice(5, 15)) {
    for (const key of getImprovementThemeKeys(h)) {
      olderImprovCounts[key] = (olderImprovCounts[key] ?? 0) + 1;
    }
  }

  const improvementPatterns: ImprovementPattern[] = Object.entries(improvThemeCounts)
    .map(([key, totalCount]) => {
      const recentCount = improvRecentCounts[key] ?? 0;
      const last3Count = improvLast3Counts[key] ?? 0;
      const olderCount = olderImprovCounts[key] ?? 0;
      const allTimeFrequency = totalCount / totalAttempts;

      let trend: ImprovementPattern["trend"] = "stable";
      if (olderCount > 0) {
        const olderRate = olderCount / Math.min(all.length - 5, 10);
        const recentRate = recentCount / Math.min(5, all.length);
        if (recentRate < olderRate - 0.1) trend = "improving";
        else if (recentRate > olderRate + 0.1) trend = "worsening";
      }

      return {
        key,
        totalCount,
        recentCount,
        allTimeFrequency,
        recentlyFlagged: last3Count > 0,
        trend,
      };
    })
    .sort((a, b) => b.totalCount - a.totalCount);

  // ── Strength theme key patterns ─────────────────────────────────────────
  const strengthThemeCounts: Record<string, number> = {};
  const strengthRecentCounts: Record<string, number> = {};

  for (const h of all) {
    for (const key of getStrengthThemeKeys(h)) {
      strengthThemeCounts[key] = (strengthThemeCounts[key] ?? 0) + 1;
    }
  }
  for (const h of recentSlice) {
    for (const key of getStrengthThemeKeys(h)) {
      strengthRecentCounts[key] = (strengthRecentCounts[key] ?? 0) + 1;
    }
  }

  const strengthPatterns: StrengthPattern[] = Object.entries(strengthThemeCounts)
    .map(([key, totalCount]) => {
      const recentCount = strengthRecentCounts[key] ?? 0;
      return {
        key,
        totalCount,
        allTimeFrequency: totalCount / totalAttempts,
        recentCount,
        consistent: totalCount >= 3 && recentCount >= 1,
      };
    })
    .sort((a, b) => b.totalCount - a.totalCount);

  // ── Resolved weaknesses ─────────────────────────────────────────────────
  // Was in top improvement themes for older attempts but NOT flagged recently
  const resolvedWeaknesses: string[] = improvementPatterns
    .filter((p) => {
      const wasPresistentOlder = (olderImprovCounts[p.key] ?? 0) >= 2;
      const notRecentlyFlagged = !p.recentlyFlagged;
      return wasPresistentOlder && notRecentlyFlagged;
    })
    .map((p) => p.key);

  // ── Archetype evolution ─────────────────────────────────────────────────
  const archetypeCounts: Record<string, number> = {};
  for (const h of all) {
    const arch = getArchetype(h);
    if (arch) archetypeCounts[arch] = (archetypeCounts[arch] ?? 0) + 1;
  }
  const archetypeEntries = Object.entries(archetypeCounts)
    .sort((a, b) => b[1] - a[1]);

  const totalWithArchetype = archetypeEntries.reduce((sum, [, c]) => sum + c, 0);
  const dominantArch = archetypeEntries[0]?.[0] ?? null;
  const recentArch = getArchetype(all[0]) ?? null;

  let evolutionNote: string | null = null;
  if (dominantArch && recentArch && recentArch !== dominantArch && totalAttempts >= 5) {
    evolutionNote = `Shifting from "${dominantArch}" toward "${recentArch}" in recent sessions`;
  }

  const archetypeEvolution: ArchetypeEvolution = {
    dominant: dominantArch,
    dominantFrequency: totalWithArchetype > 0 ? (archetypeCounts[dominantArch ?? ""] ?? 0) / totalWithArchetype : 0,
    dominantCount: archetypeCounts[dominantArch ?? ""] ?? 0,
    distribution: archetypeEntries.map(([name, count]) => ({
      name,
      count,
      frequency: totalWithArchetype > 0 ? count / totalWithArchetype : 0,
    })),
    recentArchetype: recentArch,
    evolutionNote,
  };

  // ── Delivery profile ─────────────────────────────────────────────────────
  const wpmVals = all.map(getWpm).filter((v): v is number => v !== null);
  const fillerVals   = all.map(getFillersPer100).filter((v): v is number => v !== null);
  const monotoneVals = all.map(getMonotone).filter((v): v is number => v !== null);
  const eyeVals      = all.map(getEyeContact).filter((v): v is number => v !== null);
  const gestureVals  = all.map(getGestureScore).filter((v): v is number => v !== null);
  const fidgetVals   = all.map(getFidgetScore).filter((v): v is number => v !== null);
  const faceTouchVals = all.map(getFaceTouchCount).filter((v): v is number => v !== null);

  const avgWpm        = round1(avg(wpmVals));
  const avgFillers    = round1(avg(fillerVals));
  const avgMonotone   = round1(avg(monotoneVals));
  const avgEyeContact = round1(avg(eyeVals));
  const avgGestureScore = gestureVals.length ? Math.round(avg(gestureVals)!) : null;
  const avgFidgetScore  = fidgetVals.length  ? Math.round(avg(fidgetVals)!)  : null;
  const avgFaceTouchRate = faceTouchVals.length ? round1(avg(faceTouchVals)) : null;
  // Flag if face touching is a consistent pattern (avg ≥ 3 events and seen in 2+ sessions)
  const faceTouchFlag = faceTouchVals.length >= 2 && (avgFaceTouchRate ?? 0) >= 3;

  const deliveryProfile: DeliveryProfile = {
    avgWpm,
    wpmCategory: avgWpm === null ? null
      : avgWpm < 100 ? "slow"
      : avgWpm <= 145 ? "good"
      : avgWpm <= 165 ? "fast"
      : "very_fast",
    wpmTrend: wpmVals.length >= 4 ? wpmTrendDir(wpmVals.slice().reverse()) : null,
    avgFillersPer100: avgFillers,
    fillerCategory: avgFillers === null ? null
      : avgFillers <= 1.5 ? "excellent"
      : avgFillers < 3.0 ? "good"
      : "high",
    fillerTrend: fillerVals.length >= 4 ? trendDir(fillerVals.slice().reverse().map(v => -v)) : null,
    avgMonotone,
    monotoneCategory: avgMonotone === null ? null
      : avgMonotone <= 4 ? "engaging"
      : avgMonotone <= 6 ? "moderate"
      : "flat",
    avgEyeContact,
    eyeContactCategory: avgEyeContact === null ? null
      : avgEyeContact >= 0.65 ? "strong"
      : avgEyeContact >= 0.35 ? "moderate"
      : "weak",
    avgGestureScore,
    gestureCategory: avgGestureScore === null ? null
      : avgGestureScore >= 65 ? "expressive"
      : avgGestureScore >= 40 ? "moderate"
      : "restricted",
    avgFidgetScore,
    fidgetCategory: avgFidgetScore === null ? null
      : avgFidgetScore <= 20 ? "composed"
      : avgFidgetScore <= 45 ? "some_fidgeting"
      : "high_fidgeting",
    avgFaceTouchRate,
    faceTouchFlag,
  };

  // ── STAR pattern ─────────────────────────────────────────────────────────
  const behavioralAttempts = all.filter((h) =>
    (h?.evaluationFramework === "star" || h?.evaluationFramework == null) && getStar(h) !== null
  );

  const sitVals = behavioralAttempts.map((h) => getStar(h)!.situation).filter((v) => v > 0);
  const taskVals = behavioralAttempts.map((h) => getStar(h)!.task).filter((v) => v > 0);
  const actionVals = behavioralAttempts.map((h) => getStar(h)!.action).filter((v) => v > 0);
  const resultVals = behavioralAttempts.map((h) => getStar(h)!.result).filter((v) => v > 0);
  const recentResultVals = behavioralAttempts.slice(0, 5).map((h) => getStar(h)!.result).filter((v) => v > 0);

  const avgSituation = round1(avg(sitVals));
  const avgTask = round1(avg(taskVals));
  const avgAction = round1(avg(actionVals));
  const avgResult = round1(avg(resultVals));

  const starComponents = [
    { key: "situation" as const, avg: avgSituation },
    { key: "task" as const, avg: avgTask },
    { key: "action" as const, avg: avgAction },
    { key: "result" as const, avg: avgResult },
  ].filter((c) => c.avg !== null) as Array<{ key: "situation" | "task" | "action" | "result"; avg: number }>;

  const weakestStar = starComponents.sort((a, b) => a.avg - b.avg)[0]?.key ?? null;
  const strongestStar = starComponents.sort((a, b) => b.avg - a.avg)[0]?.key ?? null;

  const resultTrend = recentResultVals.length >= 3 ? trendDir(recentResultVals.slice().reverse()) : null;

  const starPattern: StarPattern = {
    behavioralAttemptCount: behavioralAttempts.length,
    avgSituation,
    avgTask,
    avgAction,
    avgResult,
    weakestComponent: weakestStar,
    strongestComponent: strongestStar,
    resultTrend,
  };

  // ── Linguistic profile ───────────────────────────────────────────────────
  const hedgingVals = all.map((h) => getIBM(h).hedging).filter((v): v is number => v !== null);
  const cogVals = all.map((h) => getIBM(h).cognitive).filter((v): v is number => v !== null);
  const behavVals = all.map((h) => getIBM(h).behavioral).filter((v): v is number => v !== null);

  const linguisticProfile: LinguisticProfile = {
    avgHedgingScore: round1(avg(hedgingVals)),
    avgCognitiveComplexity: round1(avg(cogVals)),
    avgBehavioralIndicator: round1(avg(behavVals)),
    hedgingTrend: hedgingVals.length >= 4 ? trendDir(hedgingVals.slice().reverse().map(v => -v)) : null,
  };

  // ── Category performance ──────────────────────────────────────────────────
  const catMap: Record<string, number[]> = {};
  for (const h of all) {
    const cat = h?.questionCategory ?? "other";
    const score = getScore(h);
    if (score !== null) {
      if (!catMap[cat]) catMap[cat] = [];
      catMap[cat].push(score);
    }
  }
  const categoryPerformance = Object.entries(catMap)
    .map(([category, scores]) => ({
      category,
      attempts: scores.length,
      avgScore: Math.round(avg(scores)! * 10) / 10,
    }))
    .sort((a, b) => b.attempts - a.attempts);

  // ── Top priorities ────────────────────────────────────────────────────────
  const topPriorities: CoachingPriority[] = [];

  // 1. Persistent improvement themes (flagged recently AND frequently)
  for (const p of improvementPatterns.slice(0, 6)) {
    if (p.recentlyFlagged && p.allTimeFrequency >= 0.25) {
      topPriorities.push({
        key: p.key,
        area: p.key.replace(/_/g, " "),
        evidence: `Flagged in ${p.totalCount}/${totalAttempts} sessions (${Math.round(p.allTimeFrequency * 100)}%), including the last 3`,
        urgency: p.allTimeFrequency >= 0.5 ? "critical" : p.allTimeFrequency >= 0.3 ? "high" : "medium",
        type: "improvement_theme",
      });
    }
    if (topPriorities.length >= 3) break;
  }

  // 2. Persistent gap dimensions
  for (const d of dimensionProfile) {
    if ((d.classification === "persistent_gap" || d.classification === "gap") && d.allTimeAvg < 5.5) {
      topPriorities.push({
        key: d.key,
        area: d.label,
        evidence: `Avg ${d.allTimeAvg}/10 across ${d.attemptCount} sessions${d.trend === "declining" ? ", trending worse" : ""}`,
        urgency: d.allTimeAvg < 5.0 ? "critical" : "high",
        type: "dimension",
      });
      if (topPriorities.length >= 5) break;
    }
  }

  // 3. STAR result if chronically weak
  if (avgResult !== null && avgResult < 6.0 && behavioralAttempts.length >= 3) {
    topPriorities.push({
      key: "star_result",
      area: "STAR Result statements",
      evidence: `Avg result score ${avgResult}/10 across ${behavioralAttempts.length} behavioral attempts`,
      urgency: avgResult < 5.0 ? "critical" : "high",
      type: "star",
    });
  }

  // 4. Delivery: fillers
  if (deliveryProfile.fillerCategory === "high" && fillerVals.length >= 3) {
    topPriorities.push({
      key: "filler_words",
      area: "Filler words",
      evidence: `Avg ${deliveryProfile.avgFillersPer100}/100 words${deliveryProfile.fillerTrend === "declining" ? ", worsening" : ""}`,
      urgency: (deliveryProfile.avgFillersPer100 ?? 0) >= 5 ? "high" : "medium",
      type: "delivery",
    });
  }

  // 5. Delivery: pace (if bad and not improving)
  if (
    deliveryProfile.wpmCategory &&
    deliveryProfile.wpmCategory !== "good" &&
    deliveryProfile.wpmTrend !== "improving" &&
    wpmVals.length >= 3
  ) {
    topPriorities.push({
      key: deliveryProfile.wpmCategory === "slow" ? "pace_slow" : "pace_fast",
      area: deliveryProfile.wpmCategory === "slow" ? "Pace (too slow)" : "Pace (too fast)",
      evidence: `Avg ${deliveryProfile.avgWpm} WPM`,
      urgency: deliveryProfile.wpmCategory === "very_fast" ? "high" : "medium",
      type: "delivery",
    });
  }

  // 6. Delivery: face touching (if consistent pattern)
  if (deliveryProfile.faceTouchFlag && faceTouchVals.length >= 2) {
    topPriorities.push({
      key: "face_touching",
      area: "Face touching habit",
      evidence: `Avg ${deliveryProfile.avgFaceTouchRate} face-touch events/session — reads as nervous on camera`,
      urgency: (deliveryProfile.avgFaceTouchRate ?? 0) >= 5 ? "high" : "medium",
      type: "delivery",
    });
  }

  // 7. Delivery: low gesture expressiveness (if restricted and seen in 2+ sessions)
  if (deliveryProfile.gestureCategory === "restricted" && gestureVals.length >= 2) {
    topPriorities.push({
      key: "gesture_restricted",
      area: "Gesture expressiveness",
      evidence: `Avg gesture score ${deliveryProfile.avgGestureScore}/100 — hands mostly hidden or still`,
      urgency: "medium",
      type: "delivery",
    });
  }

  // 8. Delivery: high fidgeting
  if (deliveryProfile.fidgetCategory === "high_fidgeting" && fidgetVals.length >= 2) {
    topPriorities.push({
      key: "high_fidgeting",
      area: "Nervous movement / fidgeting",
      evidence: `Avg fidget score ${deliveryProfile.avgFidgetScore}/100 — erratic hand movement detected`,
      urgency: "medium",
      type: "delivery",
    });
  }

  // Deduplicate and cap
  const seen = new Set<string>();
  const deduped = topPriorities.filter((p) => {
    if (seen.has(p.area)) return false;
    seen.add(p.area);
    return true;
  });

  const sortedPriorities = deduped.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2 };
    return order[a.urgency] - order[b.urgency];
  }).slice(0, 5);

  // ── LLM context string ────────────────────────────────────────────────────
  const llmContext = buildLLMContext({
    totalAttempts,
    firstAttemptTs,
    overallTrajectory: { allTimeAvg, recentAvg, peakScore, trend, trendStrength },
    improvementPatterns,
    strengthPatterns,
    resolvedWeaknesses,
    dimensionProfile,
    archetypeEvolution,
    deliveryProfile,
    starPattern,
    linguisticProfile,
    topPriorities: sortedPriorities,
  });

  return {
    totalAttempts,
    firstAttemptTs,
    overallTrajectory: { allTimeAvg, recentAvg, peakScore, trend, trendStrength },
    dimensionProfile,
    improvementPatterns,
    strengthPatterns,
    resolvedWeaknesses,
    archetypeEvolution,
    deliveryProfile,
    starPattern,
    linguisticProfile,
    categoryPerformance,
    topPriorities: sortedPriorities,
    llmContext,
  };
}

// ---------------------------------------------------------------------------
// LLM context builder — compact, actionable text for model injection
// ---------------------------------------------------------------------------

function buildLLMContext(p: {
  totalAttempts: number;
  firstAttemptTs: number | null;
  overallTrajectory: { allTimeAvg: number | null; recentAvg: number | null; peakScore: number | null; trend: string; trendStrength: string };
  improvementPatterns: ImprovementPattern[];
  strengthPatterns: StrengthPattern[];
  resolvedWeaknesses: string[];
  dimensionProfile: DimensionTrend[];
  archetypeEvolution: ArchetypeEvolution;
  deliveryProfile: DeliveryProfile;
  starPattern: StarPattern;
  linguisticProfile: LinguisticProfile;
  topPriorities: CoachingPriority[];
}): string {
  const lines: string[] = [];

  lines.push(`=== CANDIDATE COACHING PROFILE (${p.totalAttempts} total sessions) ===`);

  // Overall
  const traj = p.overallTrajectory;
  if (traj.allTimeAvg !== null) {
    const trendDesc = traj.trend === "improving" ? `IMPROVING (${traj.trendStrength})`
      : traj.trend === "declining" ? `DECLINING (${traj.trendStrength})`
      : "PLATEAU";
    lines.push(`Overall: all-time avg ${traj.allTimeAvg}/100, recent avg ${traj.recentAvg ?? "n/a"}/100, peak ${traj.peakScore ?? "n/a"}/100 — ${trendDesc}`);
  }

  // Persistent weaknesses still present
  const persistentActive = p.improvementPatterns.filter(
    (x) => x.recentlyFlagged && x.allTimeFrequency >= 0.2
  ).slice(0, 5);

  if (persistentActive.length > 0) {
    lines.push("");
    lines.push("Persistent weaknesses (recently active — must address):");
    for (const w of persistentActive) {
      const pct = Math.round(w.allTimeFrequency * 100);
      const urgency = pct >= 50 ? "CRITICAL" : pct >= 30 ? "HIGH" : "MEDIUM";
      lines.push(`  - ${w.key}: ${w.totalCount}/${p.totalAttempts} sessions (${pct}%) [${urgency}]${w.trend === "improving" ? " — showing recent improvement" : w.trend === "worsening" ? " — WORSENING" : ""}`);
    }
  }

  // Resolved weaknesses — acknowledge if this answer continues the improvement
  if (p.resolvedWeaknesses.length > 0) {
    lines.push("");
    lines.push(`Resolved weaknesses (were persistent, NOT seen in last 3 sessions — acknowledge if this answer maintains the improvement): ${p.resolvedWeaknesses.join(", ")}`);
  }

  // Consistent strengths
  const persistentStrengths = p.strengthPatterns.filter((x) => x.consistent && x.allTimeFrequency >= 0.4).slice(0, 3);
  if (persistentStrengths.length > 0) {
    lines.push("");
    lines.push(`Consistent strengths: ${persistentStrengths.map((s) => `${s.key} (${Math.round(s.allTimeFrequency * 100)}%)`).join(", ")}`);
    lines.push("  Do NOT suggest improving areas that are already consistent strengths.");
  }

  // Dimension gaps
  const gapDims = p.dimensionProfile.filter((d) =>
    d.classification === "persistent_gap" || d.classification === "gap"
  ).slice(0, 3);
  const strengthDims = p.dimensionProfile.filter((d) =>
    d.classification === "persistent_strength" || d.classification === "strength"
  ).slice(0, 2);

  if (gapDims.length > 0 || strengthDims.length > 0) {
    lines.push("");
    lines.push("Communication dimensions:");
    for (const d of gapDims) {
      lines.push(`  - ${d.label}: avg ${d.allTimeAvg}/10 [GAP]${d.trend === "improving" ? " — improving" : d.trend === "declining" ? " — declining" : ""}`);
    }
    for (const d of strengthDims) {
      lines.push(`  - ${d.label}: avg ${d.allTimeAvg}/10 [STRENGTH]`);
    }
  }

  // STAR pattern
  if (p.starPattern.behavioralAttemptCount >= 3 && p.starPattern.avgResult !== null) {
    lines.push("");
    const starParts = [
      p.starPattern.avgSituation !== null ? `S:${p.starPattern.avgSituation}` : null,
      p.starPattern.avgTask !== null ? `T:${p.starPattern.avgTask}` : null,
      p.starPattern.avgAction !== null ? `A:${p.starPattern.avgAction}` : null,
      p.starPattern.avgResult !== null ? `R:${p.starPattern.avgResult}` : null,
    ].filter(Boolean).join("  ");
    lines.push(`STAR pattern (${p.starPattern.behavioralAttemptCount} behavioral): ${starParts}`);
    if (p.starPattern.weakestComponent) {
      lines.push(`  Weakest: ${p.starPattern.weakestComponent.toUpperCase()} — ${p.starPattern.weakestComponent === "result" ? "typically stops after action without a quantified outcome" : `consistently scores lowest`}`);
    }
  }

  // Delivery
  const delParts: string[] = [];
  if (p.deliveryProfile.avgWpm !== null) {
    delParts.push(`${p.deliveryProfile.avgWpm} WPM (${p.deliveryProfile.wpmCategory})`);
  }
  if (p.deliveryProfile.avgFillersPer100 !== null) {
    delParts.push(`${p.deliveryProfile.avgFillersPer100} fillers/100w (${p.deliveryProfile.fillerCategory}${p.deliveryProfile.fillerTrend === "improving" ? ", improving" : p.deliveryProfile.fillerTrend === "declining" ? ", worsening" : ""})`);
  }
  if (p.deliveryProfile.monotoneCategory) {
    delParts.push(`vocal variety: ${p.deliveryProfile.monotoneCategory}`);
  }
  if (p.deliveryProfile.eyeContactCategory) {
    delParts.push(`eye contact: ${p.deliveryProfile.eyeContactCategory}`);
  }
  if (p.deliveryProfile.gestureCategory) {
    delParts.push(`gesture expressiveness: ${p.deliveryProfile.gestureCategory} (avg ${p.deliveryProfile.avgGestureScore}/100)`);
  }
  if (p.deliveryProfile.fidgetCategory && p.deliveryProfile.fidgetCategory !== "composed") {
    delParts.push(`fidgeting: ${p.deliveryProfile.fidgetCategory} (avg ${p.deliveryProfile.avgFidgetScore}/100)`);
  }
  if (p.deliveryProfile.faceTouchFlag) {
    delParts.push(`face touching: consistent pattern (avg ${p.deliveryProfile.avgFaceTouchRate} events/session) — nervous habit`);
  }
  if (delParts.length > 0) {
    lines.push("");
    lines.push(`Delivery: ${delParts.join(" | ")}`);
  }

  // Archetype
  if (p.archetypeEvolution.dominant) {
    lines.push("");
    const archFreqPct = Math.round(p.archetypeEvolution.dominantFrequency * 100);
    lines.push(`Communication archetype: dominant "${p.archetypeEvolution.dominant}" (${archFreqPct}% of sessions)${p.archetypeEvolution.evolutionNote ? ` — ${p.archetypeEvolution.evolutionNote}` : ""}`);
  }

  // Coaching instruction
  lines.push("");
  lines.push("=== COACHING INSTRUCTION ===");

  if (persistentActive.length > 0) {
    const topKeys = persistentActive.slice(0, 2).map((w) => w.key).join(" and ");
    lines.push(`This candidate's most reliable growth lever is: ${topKeys}.`);
  }

  lines.push("For THIS answer:");
  lines.push("  1. If a persistent weakness appears in the transcript, cite the EXACT moment (quote or paraphrase) — do not give generic advice.");
  lines.push("  2. If a persistent weakness is NOT present in this answer, acknowledge the improvement explicitly in trajectory_note.");
  lines.push("  3. Do NOT suggest fixes for areas that are consistent strengths.");
  lines.push("  4. Do NOT repeat improvement suggestions that are not grounded in this specific transcript.");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Empty profile (returned when history is empty)
// ---------------------------------------------------------------------------

function buildEmptyProfile(): UserCoachingProfile {
  return {
    totalAttempts: 0,
    firstAttemptTs: null,
    overallTrajectory: {
      allTimeAvg: null,
      recentAvg: null,
      peakScore: null,
      trend: "plateau",
      trendStrength: "slight",
    },
    dimensionProfile: [],
    improvementPatterns: [],
    strengthPatterns: [],
    resolvedWeaknesses: [],
    archetypeEvolution: {
      dominant: null,
      dominantFrequency: 0,
      dominantCount: 0,
      distribution: [],
      recentArchetype: null,
      evolutionNote: null,
    },
    deliveryProfile: {
      avgWpm: null,
      wpmCategory: null,
      wpmTrend: null,
      avgFillersPer100: null,
      fillerCategory: null,
      fillerTrend: null,
      avgMonotone: null,
      monotoneCategory: null,
      avgEyeContact: null,
      eyeContactCategory: null,
      avgGestureScore: null,
      gestureCategory: null,
      avgFidgetScore: null,
      fidgetCategory: null,
      avgFaceTouchRate: null,
      faceTouchFlag: false,
    },
    starPattern: {
      behavioralAttemptCount: 0,
      avgSituation: null,
      avgTask: null,
      avgAction: null,
      avgResult: null,
      weakestComponent: null,
      strongestComponent: null,
      resultTrend: null,
    },
    linguisticProfile: {
      avgHedgingScore: null,
      avgCognitiveComplexity: null,
      avgBehavioralIndicator: null,
      hedgingTrend: null,
    },
    categoryPerformance: [],
    topPriorities: [],
    llmContext: "",
  };
}
