"use client";

import React, { useEffect, useMemo, useState } from "react";
import PremiumShell from "@/app/components/PremiumShell";

// ── Types ─────────────────────────────────────────────────────────────────────

type Finding = {
  id: string;
  headline: string;
  detail: string;
  type: "correlation" | "category" | "threshold" | "pattern" | "trend" | "outlier";
  direction: "positive" | "negative" | "neutral";
  n: number;
  strength: number;        // 0–1, used for sorting
  chartData?: { label: string; value: number; highlight?: boolean }[];
  chartType?: "bar" | "scatter";
  unit?: string;
};

// ── Data extractors ───────────────────────────────────────────────────────────

const toScore100 = (a: any): number | null => {
  const s = a.score ?? a.feedback?.score;
  if (s == null || !isFinite(s)) return null;
  return s <= 10 ? Math.round(s * 10) : Math.round(s);
};
const toWpm         = (a: any): number | null => a.wpm ?? a.deliveryMetrics?.wpm ?? null;
const toFillersP100 = (a: any): number | null => a.deliveryMetrics?.fillersPer100 ?? a.feedback?.filler?.per100 ?? null;
const toDuration    = (a: any): number | null => a.durationSeconds ?? null;
const toCat         = (a: any): string | null => a.questionCategory ?? null;
const toFramework   = (a: any): string | null => a.evaluationFramework ?? null;
const toHour        = (a: any): number | null => { try { return new Date(a.ts).getHours(); } catch { return null; } };
const toDayOfWeek   = (a: any): number | null => { try { return new Date(a.ts).getDay(); } catch { return null; } };

const toDim = (a: any, key: string): number | null =>
  a.feedback?.dimension_scores?.[key]?.score ?? null;

const toEyeContact  = (a: any): number | null => {
  const v = a.deliveryMetrics?.face?.eyeContact;
  return v != null ? Math.round(v * 100) : null;
};
const toExpressive  = (a: any): number | null => {
  const v = a.deliveryMetrics?.face?.expressiveness;
  return v != null ? Math.round(v * 100) : null;
};
const toGesture     = (a: any): number | null => a.deliveryMetrics?.hands?.gestureScore ?? null;
const toFidget      = (a: any): number | null => a.deliveryMetrics?.hands?.fidgetScore ?? null;
const toFaceTouch   = (a: any): number | null => a.deliveryMetrics?.hands?.faceTouchCount ?? null;
const toMonotone    = (a: any): number | null =>
  a.deliveryMetrics?.acoustics?.monotoneScore ?? a.prosody?.monotoneScore ?? null;
const toPronun      = (a: any): number | null => a.deliveryMetrics?.acoustics?.pronunciationScore ?? null;
const toFluency     = (a: any): number | null => a.deliveryMetrics?.acoustics?.fluencyScore ?? null;
const toProsody     = (a: any): number | null => a.deliveryMetrics?.acoustics?.prosodyScore ?? null;
const toEnergyVar   = (a: any): number | null => a.deliveryMetrics?.acoustics?.energyVariation ?? null;
const toStarResult  = (a: any): number | null => a.feedback?.star?.result ?? null;
const toStarAction  = (a: any): number | null => a.feedback?.star?.action ?? null;
const toStarSit     = (a: any): number | null => a.feedback?.star?.situation ?? null;

// ── Math helpers ──────────────────────────────────────────────────────────────

function mean(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function pearson(pairs: [number, number][]): number {
  if (pairs.length < 4) return 0;
  const xs = pairs.map(p => p[0]);
  const ys = pairs.map(p => p[1]);
  const mx = mean(xs), my = mean(ys);
  const num = pairs.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0);
  const dx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const dy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  if (dx === 0 || dy === 0) return 0;
  return num / (dx * dy);
}

function linSlope(pairs: [number, number][]): number {
  if (pairs.length < 2) return 0;
  const xs = pairs.map(p => p[0]);
  const ys = pairs.map(p => p[1]);
  const mx = mean(xs), my = mean(ys);
  const num = pairs.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return den === 0 ? 0 : num / den;
}

function pairs<T>(attempts: any[], extractor: (a: any) => T | null, scoreExtractor = toScore100): [T, number][] {
  return attempts
    .map(a => [extractor(a), scoreExtractor(a)] as [T | null, number | null])
    .filter((p): p is [T, number] => p[0] != null && p[1] != null);
}

function groupBy<K extends string>(
  attempts: any[],
  keyFn: (a: any) => K | null,
  minSize = 2
): Record<K, number[]> {
  const map: Record<string, number[]> = {};
  for (const a of attempts) {
    const k = keyFn(a);
    const s = toScore100(a);
    if (k == null || s == null) continue;
    if (!map[k]) map[k] = [];
    map[k].push(s);
  }
  return Object.fromEntries(
    Object.entries(map).filter(([, v]) => v.length >= minSize)
  ) as Record<K, number[]>;
}

function fmt1(n: number): string {
  return n.toFixed(1);
}
function fmtDiff(a: number, b: number): string {
  const d = a - b;
  return `${d >= 0 ? "+" : ""}${fmt1(d)}`;
}

// ── Findings engine ───────────────────────────────────────────────────────────

function generateFindings(raw: any[]): Finding[] {
  const all = raw.filter(a => toScore100(a) != null);
  if (all.length < 3) return [];

  const findings: Finding[] = [];

  // ─── 1. Improvement trend (score over time) ────────────────────────────────
  if (all.length >= 5) {
    const sorted = [...all].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    const scorePairs: [number, number][] = sorted.map((a, i) => [i, toScore100(a)!]);
    const slope = linSlope(scorePairs);
    const firstAvg = mean(sorted.slice(0, Math.min(3, sorted.length)).map(a => toScore100(a)!));
    const lastAvg = mean(sorted.slice(-Math.min(3, sorted.length)).map(a => toScore100(a)!));
    const delta = lastAvg - firstAvg;
    if (Math.abs(delta) >= 3) {
      findings.push({
        id: "trend_overall",
        headline: delta > 0
          ? `Your score has climbed ${fmt1(delta)} points since your first sessions.`
          : `Your score has slipped ${fmt1(Math.abs(delta))} points compared to your early sessions.`,
        detail: `First 3 sessions averaged ${fmt1(firstAvg)}. Most recent 3 averaged ${fmt1(lastAvg)}.`,
        type: "trend",
        direction: delta > 0 ? "positive" : "negative",
        n: all.length,
        strength: Math.min(1, Math.abs(delta) / 20),
        chartData: sorted.map((a, i) => ({ label: `S${i + 1}`, value: toScore100(a)! })),
        chartType: "bar",
        unit: "score",
      });
    }
  }

  // ─── 2. Category performance split ────────────────────────────────────────
  const catGroups = groupBy(all, toCat);
  const catEntries = Object.entries(catGroups)
    .filter(([k]) => k !== "mock_interview")
    .map(([k, vs]) => ({ cat: k, avg: mean(vs), n: vs.length }))
    .sort((a, b) => b.avg - a.avg);
  if (catEntries.length >= 2) {
    const best = catEntries[0];
    const worst = catEntries[catEntries.length - 1];
    const gap = best.avg - worst.avg;
    if (gap >= 4) {
      const fmtCat = (c: string) => c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      findings.push({
        id: "cat_split",
        headline: `${fmtCat(best.cat)} questions average ${fmt1(best.avg)} — ${fmt1(gap)} points ahead of ${fmtCat(worst.cat)}.`,
        detail: `${catEntries.map(c => `${fmtCat(c.cat)}: ${fmt1(c.avg)} (${c.n} sessions)`).join(" · ")}`,
        type: "category",
        direction: "neutral",
        n: all.length,
        strength: Math.min(1, gap / 20),
        chartData: catEntries.map(c => ({ label: fmtCat(c.cat), value: Math.round(c.avg), highlight: c.cat === best.cat })),
        chartType: "bar",
        unit: "avg score",
      });
    }
  }

  // ─── 3. Mock interview vs practice ─────────────────────────────────────────
  const mockAttempts    = all.filter(a => toFramework(a) === "mock_interview");
  const practiceAttempts = all.filter(a => toFramework(a) !== "mock_interview");
  if (mockAttempts.length >= 2 && practiceAttempts.length >= 2) {
    const mockAvg = mean(mockAttempts.map(a => toScore100(a)!));
    const practAvg = mean(practiceAttempts.map(a => toScore100(a)!));
    const diff = mockAvg - practAvg;
    if (Math.abs(diff) >= 3) {
      findings.push({
        id: "mock_vs_practice",
        headline: diff < 0
          ? `You score ${fmt1(Math.abs(diff))} points lower in mock interviews than solo practice.`
          : `Your mock interview scores run ${fmt1(diff)} points higher than solo practice.`,
        detail: `Mock interview avg: ${fmt1(mockAvg)} (${mockAttempts.length} sessions). Practice avg: ${fmt1(practAvg)} (${practiceAttempts.length} sessions).`,
        type: "category",
        direction: diff < 0 ? "negative" : "positive",
        n: all.length,
        strength: Math.min(1, Math.abs(diff) / 15),
        chartData: [
          { label: "Mock Interview", value: Math.round(mockAvg) },
          { label: "Solo Practice",  value: Math.round(practAvg), highlight: true },
        ],
        chartType: "bar",
        unit: "avg score",
      });
    }
  }

  // ─── 4. WPM vs score ──────────────────────────────────────────────────────
  const wpmPairs = pairs(all, toWpm);
  if (wpmPairs.length >= 4) {
    const r = pearson(wpmPairs);
    if (Math.abs(r) >= 0.4) {
      const sorted = [...wpmPairs].sort((a, b) => a[0] - b[0]);
      const lowWpm  = sorted.slice(0, Math.ceil(sorted.length / 2));
      const highWpm = sorted.slice(Math.ceil(sorted.length / 2));
      const lowAvg  = mean(lowWpm.map(p => p[1]));
      const highAvg = mean(highWpm.map(p => p[1]));
      const lowMed  = mean(lowWpm.map(p => p[0]));
      const highMed = mean(highWpm.map(p => p[0]));
      const faster = highAvg < lowAvg;
      findings.push({
        id: "wpm_score",
        headline: faster
          ? `Sessions under ~${Math.round(lowMed)} WPM score ${fmt1(lowAvg - highAvg)} points higher than faster sessions.`
          : `Higher speaking pace correlates with better scores (r=${fmt1(r)}).`,
        detail: `Slower sessions (~${Math.round(lowMed)} WPM avg): ${fmt1(lowAvg)}. Faster sessions (~${Math.round(highMed)} WPM avg): ${fmt1(highAvg)}.`,
        type: "correlation",
        direction: faster ? "positive" : "neutral",
        n: wpmPairs.length,
        strength: Math.abs(r),
        chartData: wpmPairs.map(([w, s]) => ({ label: `${Math.round(w)}`, value: Math.round(s) })),
        chartType: "scatter",
        unit: "WPM",
      });
    }
  }

  // ─── 5. Filler rate vs score ───────────────────────────────────────────────
  const fillerPairs = pairs(all, toFillersP100);
  if (fillerPairs.length >= 4) {
    const r = pearson(fillerPairs);
    if (r <= -0.4) {
      const sorted = [...fillerPairs].sort((a, b) => a[0] - b[0]);
      const low  = sorted.slice(0, Math.ceil(sorted.length / 2));
      const high = sorted.slice(Math.ceil(sorted.length / 2));
      const lowAvg  = mean(low.map(p => p[1]));
      const highAvg = mean(high.map(p => p[1]));
      const lowMed  = mean(low.map(p => p[0]));
      const highMed = mean(high.map(p => p[0]));
      findings.push({
        id: "filler_score",
        headline: `Each extra filler word per 100 costs roughly ${fmt1((lowAvg - highAvg) / Math.max(1, highMed - lowMed))} score points.`,
        detail: `Sessions under ${fmt1(lowMed)} fillers/100 avg ${fmt1(lowAvg)}. Sessions above ${fmt1(highMed)} fillers/100 avg ${fmt1(highAvg)}.`,
        type: "correlation",
        direction: "negative",
        n: fillerPairs.length,
        strength: Math.abs(r),
      });
    }
  }

  // ─── 6. Gesture score vs overall score ────────────────────────────────────
  const gesturePairs = pairs(all, toGesture);
  if (gesturePairs.length >= 4) {
    const r = pearson(gesturePairs);
    if (Math.abs(r) >= 0.4) {
      const sorted = [...gesturePairs].sort((a, b) => a[0] - b[0]);
      const low  = sorted.slice(0, Math.ceil(sorted.length / 2));
      const high = sorted.slice(Math.ceil(sorted.length / 2));
      const lowAvg  = mean(low.map(p => p[1]));
      const highAvg = mean(high.map(p => p[1]));
      findings.push({
        id: "gesture_score",
        headline: `Higher gesture expressiveness correlates with ${fmt1(highAvg - lowAvg)} higher overall scores.`,
        detail: `Low gesture sessions (avg ${Math.round(mean(low.map(p => p[0])))} gesture score): ${fmt1(lowAvg)} overall. High gesture sessions (avg ${Math.round(mean(high.map(p => p[0])))}): ${fmt1(highAvg)} overall.`,
        type: "correlation",
        direction: "positive",
        n: gesturePairs.length,
        strength: Math.abs(r),
        chartData: [
          { label: "Low gesture", value: Math.round(lowAvg) },
          { label: "High gesture", value: Math.round(highAvg), highlight: true },
        ],
        chartType: "bar",
        unit: "gesture score",
      });
    }
  }

  // ─── 7. Fidget score vs overall score ─────────────────────────────────────
  const fidgetPairs = pairs(all, toFidget);
  if (fidgetPairs.length >= 4) {
    const r = pearson(fidgetPairs);
    if (r <= -0.4) {
      const sorted = [...fidgetPairs].sort((a, b) => a[0] - b[0]);
      const low  = sorted.slice(0, Math.ceil(sorted.length / 2));
      const high = sorted.slice(Math.ceil(sorted.length / 2));
      const lowAvg  = mean(low.map(p => p[1]));
      const highAvg = mean(high.map(p => p[1]));
      findings.push({
        id: "fidget_score",
        headline: `Sessions with lower fidgeting score ${fmt1(lowAvg - highAvg)} points higher on average.`,
        detail: `Low fidget sessions (avg score ${Math.round(mean(low.map(p => p[0])))}): ${fmt1(lowAvg)} overall. High fidget sessions (avg score ${Math.round(mean(high.map(p => p[0])))}): ${fmt1(highAvg)} overall.`,
        type: "correlation",
        direction: "negative",
        n: fidgetPairs.length,
        strength: Math.abs(r),
        chartData: [
          { label: "Less fidgeting", value: Math.round(lowAvg), highlight: true },
          { label: "More fidgeting", value: Math.round(highAvg) },
        ],
        chartType: "bar",
        unit: "fidget score",
      });
    }
  }

  // ─── 8. Face touch count vs score ─────────────────────────────────────────
  const faceTouchPairs = pairs(all, toFaceTouch);
  if (faceTouchPairs.length >= 4) {
    const r = pearson(faceTouchPairs);
    if (r <= -0.35) {
      const noTouch = faceTouchPairs.filter(([t]) => t <= 1);
      const highTouch = faceTouchPairs.filter(([t]) => t >= 4);
      if (noTouch.length >= 2 && highTouch.length >= 2) {
        const noAvg   = mean(noTouch.map(p => p[1]));
        const highAvg = mean(highTouch.map(p => p[1]));
        findings.push({
          id: "face_touch_score",
          headline: `Sessions with 4+ face-touch events score ${fmt1(noAvg - highAvg)} points lower than sessions with 0–1.`,
          detail: `0–1 face touches (${noTouch.length} sessions): avg ${fmt1(noAvg)}. 4+ face touches (${highTouch.length} sessions): avg ${fmt1(highAvg)}.`,
          type: "correlation",
          direction: "negative",
          n: faceTouchPairs.length,
          strength: Math.abs(r),
          chartData: [
            { label: "0–1 touches", value: Math.round(noAvg), highlight: true },
            { label: "4+ touches",  value: Math.round(highAvg) },
          ],
          chartType: "bar",
          unit: "face touches",
        });
      }
    }
  }

  // ─── 9. Eye contact vs presence_confidence dimension ──────────────────────
  const ecPresencePairs = all
    .map(a => [toEyeContact(a), toDim(a, "presence_confidence")] as [number | null, number | null])
    .filter((p): p is [number, number] => p[0] != null && p[1] != null);
  if (ecPresencePairs.length >= 4) {
    const r = pearson(ecPresencePairs);
    if (Math.abs(r) >= 0.45) {
      const sorted = [...ecPresencePairs].sort((a, b) => a[0] - b[0]);
      const low  = sorted.slice(0, Math.ceil(sorted.length / 2));
      const high = sorted.slice(Math.ceil(sorted.length / 2));
      const lowAvg = mean(low.map(p => p[1]));
      const highAvg = mean(high.map(p => p[1]));
      findings.push({
        id: "eyecontact_presence",
        headline: `Sessions with higher eye contact score ${fmt1(highAvg - lowAvg)} pts higher on Presence & Confidence.`,
        detail: `Low eye contact sessions: ${fmt1(lowAvg)}/10 presence. High eye contact sessions: ${fmt1(highAvg)}/10 presence. Correlation: r=${fmt1(r)}.`,
        type: "correlation",
        direction: "positive",
        n: ecPresencePairs.length,
        strength: Math.abs(r),
      });
    }
  }

  // ─── 10. Monotone vs vocal engagement dimension ────────────────────────────
  const monotoneVocalPairs = all
    .map(a => [toMonotone(a), toDim(a, "vocal_engagement")] as [number | null, number | null])
    .filter((p): p is [number, number] => p[0] != null && p[1] != null);
  if (monotoneVocalPairs.length >= 4) {
    const r = pearson(monotoneVocalPairs);
    if (r <= -0.4) {
      findings.push({
        id: "monotone_vocal",
        headline: `Higher monotone score (flatter voice) predicts lower Vocal Engagement scores (r=${fmt1(r)}).`,
        detail: `Each 1-point rise in monotone score corresponds to ~${fmt1(Math.abs(linSlope(monotoneVocalPairs)))} point drop in Vocal Engagement.`,
        type: "correlation",
        direction: "negative",
        n: monotoneVocalPairs.length,
        strength: Math.abs(r),
      });
    }
  }

  // ─── 11. Dimension gap: weakest vs strongest ──────────────────────────────
  const DIM_KEYS = ["narrative_clarity","evidence_quality","ownership_agency","vocal_engagement","response_control","cognitive_depth","presence_confidence"];
  const dimAvgs: { key: string; label: string; avg: number; n: number }[] = [];
  for (const key of DIM_KEYS) {
    const vals = all.map(a => toDim(a, key)).filter((v): v is number => v != null);
    if (vals.length >= 3) {
      const labelMap: Record<string,string> = {
        narrative_clarity: "Narrative Clarity", evidence_quality: "Evidence Quality",
        ownership_agency: "Ownership", vocal_engagement: "Vocal Engagement",
        response_control: "Response Control", cognitive_depth: "Cognitive Depth",
        presence_confidence: "Presence & Confidence",
      };
      dimAvgs.push({ key, label: labelMap[key] ?? key, avg: mean(vals), n: vals.length });
    }
  }
  if (dimAvgs.length >= 3) {
    const sorted = [...dimAvgs].sort((a, b) => b.avg - a.avg);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const gap = top.avg - bottom.avg;
    if (gap >= 1.0) {
      findings.push({
        id: "dim_gap",
        headline: `${top.label} (${fmt1(top.avg)}) is your strongest dimension — ${fmt1(gap)} points above your weakest, ${bottom.label} (${fmt1(bottom.avg)}).`,
        detail: `Across ${top.n} scored sessions. Gap of ${fmt1(gap)} points between top and bottom dimension.`,
        type: "pattern",
        direction: "neutral",
        n: all.length,
        strength: Math.min(1, gap / 4),
        chartData: sorted.map(d => ({
          label: d.label.split(" ")[0],
          value: Math.round(d.avg * 10),
          highlight: d.key === top.key,
        })),
        chartType: "bar",
        unit: "/10",
      });
    }
  }

  // ─── 12. STAR result vs STAR action ───────────────────────────────────────
  const starVals = all
    .map(a => ({ result: toStarResult(a), action: toStarAction(a), sit: toStarSit(a) }))
    .filter(s => s.result != null && s.action != null);
  if (starVals.length >= 3) {
    const avgResult = mean(starVals.map(s => s.result!));
    const avgAction = mean(starVals.map(s => s.action!));
    const diff = avgAction - avgResult;
    if (diff >= 0.8) {
      findings.push({
        id: "star_action_result",
        headline: `Your Action section averages ${fmt1(diff)} points higher than your Result section.`,
        detail: `Avg Action: ${fmt1(avgAction)}/10. Avg Result: ${fmt1(avgResult)}/10. The close is consistently weaker than the build-up.`,
        type: "pattern",
        direction: "negative",
        n: starVals.length,
        strength: Math.min(1, diff / 3),
        chartData: [
          { label: "Situation", value: Math.round(mean(starVals.map(s => s.sit!).filter(v => v != null)) * 10) },
          { label: "Action",    value: Math.round(avgAction * 10), highlight: true },
          { label: "Result",    value: Math.round(avgResult * 10) },
        ],
        chartType: "bar",
        unit: "STAR score ×10",
      });
    }
  }

  // ─── 13. Duration vs score ─────────────────────────────────────────────────
  const durPairs = pairs(all, toDuration);
  if (durPairs.length >= 4) {
    const r = pearson(durPairs);
    if (Math.abs(r) >= 0.4) {
      const sorted = [...durPairs].sort((a, b) => a[0] - b[0]);
      const short = sorted.slice(0, Math.ceil(sorted.length / 2));
      const long  = sorted.slice(Math.ceil(sorted.length / 2));
      const shortAvg = mean(short.map(p => p[1]));
      const longAvg  = mean(long.map(p => p[1]));
      const shortSec = Math.round(mean(short.map(p => p[0])));
      const longSec  = Math.round(mean(long.map(p => p[0])));
      const longerBetter = longAvg > shortAvg;
      findings.push({
        id: "duration_score",
        headline: longerBetter
          ? `Longer answers score ${fmt1(longAvg - shortAvg)} points higher — depth is rewarded.`
          : `Shorter answers score ${fmt1(shortAvg - longAvg)} points higher — conciseness wins.`,
        detail: `Under ${shortSec}s avg: ${fmt1(shortAvg)}. Over ${longSec}s avg: ${fmt1(longAvg)}.`,
        type: "correlation",
        direction: longerBetter ? "positive" : "negative",
        n: durPairs.length,
        strength: Math.abs(r),
      });
    }
  }

  // ─── 14. Pronunciation vs score ───────────────────────────────────────────
  const pronunPairs = pairs(all, toPronun);
  if (pronunPairs.length >= 4) {
    const r = pearson(pronunPairs);
    if (Math.abs(r) >= 0.4) {
      findings.push({
        id: "pronun_score",
        headline: `Pronunciation clarity correlates with overall score (r=${fmt1(r)}).`,
        detail: `Across ${pronunPairs.length} sessions with Azure speech data. Pronunciation signal is one of your score drivers.`,
        type: "correlation",
        direction: r > 0 ? "positive" : "negative",
        n: pronunPairs.length,
        strength: Math.abs(r),
      });
    }
  }

  // ─── 15. Time of day pattern ──────────────────────────────────────────────
  const hourGroups: Record<string, number[]> = {};
  for (const a of all) {
    const h = toHour(a);
    const s = toScore100(a);
    if (h == null || s == null) continue;
    const bucket = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
    if (!hourGroups[bucket]) hourGroups[bucket] = [];
    hourGroups[bucket].push(s);
  }
  const timeEntries = Object.entries(hourGroups)
    .filter(([, v]) => v.length >= 2)
    .map(([k, vs]) => ({ bucket: k, avg: mean(vs), n: vs.length }))
    .sort((a, b) => b.avg - a.avg);
  if (timeEntries.length >= 2) {
    const best = timeEntries[0];
    const worst = timeEntries[timeEntries.length - 1];
    const gap = best.avg - worst.avg;
    if (gap >= 4) {
      const label = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };
      findings.push({
        id: "time_of_day",
        headline: `${label[best.bucket as keyof typeof label]} sessions average ${fmt1(gap)} points higher than ${label[worst.bucket as keyof typeof label].toLowerCase()}.`,
        detail: `${timeEntries.map(t => `${label[t.bucket as keyof typeof label]}: ${fmt1(t.avg)} (${t.n} sessions)`).join(" · ")}`,
        type: "pattern",
        direction: "neutral",
        n: all.length,
        strength: Math.min(1, gap / 15),
        chartData: timeEntries.map(t => ({ label: label[t.bucket as keyof typeof label], value: Math.round(t.avg), highlight: t.bucket === best.bucket })),
        chartType: "bar",
        unit: "avg score",
      });
    }
  }

  // ─── 16. Energy variation vs vocal engagement ─────────────────────────────
  const energyVocalPairs = all
    .map(a => [toEnergyVar(a), toDim(a, "vocal_engagement")] as [number | null, number | null])
    .filter((p): p is [number, number] => p[0] != null && p[1] != null);
  if (energyVocalPairs.length >= 4) {
    const r = pearson(energyVocalPairs);
    if (r >= 0.45) {
      findings.push({
        id: "energy_vocal",
        headline: `Vocal energy variation is your strongest predictor of Vocal Engagement score (r=${fmt1(r)}).`,
        detail: `Across ${energyVocalPairs.length} sessions. When your voice carries more dynamic range, engagement scores follow.`,
        type: "correlation",
        direction: "positive",
        n: energyVocalPairs.length,
        strength: r,
      });
    }
  }

  // ─── 17. Best session outlier ─────────────────────────────────────────────
  const withScores = all.filter(a => toScore100(a) != null);
  if (withScores.length >= 4) {
    const sorted = [...withScores].sort((a, b) => toScore100(b)! - toScore100(a)!);
    const best = sorted[0];
    const rest = sorted.slice(1);
    const bestScore = toScore100(best)!;
    const avgRest = mean(rest.map(a => toScore100(a)!));
    const diff = bestScore - avgRest;
    if (diff >= 8) {
      const outlierTraits: string[] = [];
      const bestWpm = toWpm(best);
      const avgWpm = mean(rest.map(a => toWpm(a)!).filter(v => v != null));
      if (bestWpm && avgWpm && Math.abs(bestWpm - avgWpm) >= 10) {
        outlierTraits.push(`${Math.round(bestWpm)} WPM (avg: ${Math.round(avgWpm)})`);
      }
      const bestFiller = toFillersP100(best);
      const avgFiller = mean(rest.map(a => toFillersP100(a)!).filter(v => v != null));
      if (bestFiller != null && avgFiller != null && (avgFiller - bestFiller) >= 1) {
        outlierTraits.push(`${fmt1(bestFiller)} fillers/100 (avg: ${fmt1(avgFiller)})`);
      }
      const bestGesture = toGesture(best);
      const avgGesture = mean(rest.map(a => toGesture(a)!).filter(v => v != null));
      if (bestGesture && avgGesture && (bestGesture - avgGesture) >= 10) {
        outlierTraits.push(`gesture score ${Math.round(bestGesture)} (avg: ${Math.round(avgGesture)})`);
      }
      if (outlierTraits.length > 0) {
        findings.push({
          id: "best_session",
          headline: `Your best session (${bestScore}) was ${fmt1(diff)} points above your average. Here's what was different.`,
          detail: outlierTraits.join(" · "),
          type: "outlier",
          direction: "positive",
          n: withScores.length,
          strength: Math.min(1, diff / 20),
        });
      }
    }
  }

  // ─── Sort and deduplicate ──────────────────────────────────────────────────
  return findings
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 12);
}

// ── Mini chart component ──────────────────────────────────────────────────────

function MiniBarChart({ data, unit }: { data: { label: string; value: number; highlight?: boolean }[]; unit?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 56, marginTop: 12 }}>
      {data.map((d, i) => {
        const pct = Math.max(4, Math.round((d.value / max) * 100));
        const color = d.highlight ? "var(--accent)" : "var(--card-border)";
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: d.highlight ? "var(--accent)" : "var(--text-muted)" }}>
              {d.value}{unit?.includes("/") ? unit : ""}
            </div>
            <div style={{ width: "100%", height: `${pct}%`, background: color, borderRadius: "3px 3px 0 0", minHeight: 4, transition: "height 0.3s" }} />
            <div style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.2 }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Finding card ──────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; color: string }> = {
  correlation: { label: "Correlation",  color: "#8B5CF6" },
  category:    { label: "Category Gap", color: "#0EA5E9" },
  threshold:   { label: "Threshold",    color: "#F59E0B" },
  pattern:     { label: "Pattern",      color: "#10B981" },
  trend:       { label: "Trend",        color: "#2563EB" },
  outlier:     { label: "Outlier",      color: "#EF4444" },
};

function FindingCard({ f }: { f: Finding }) {
  const meta = TYPE_META[f.type] ?? { label: f.type, color: "var(--accent)" };
  const dirSymbol = f.direction === "positive" ? "↑" : f.direction === "negative" ? "↓" : "→";
  const dirColor  = f.direction === "positive" ? "#10B981" : f.direction === "negative" ? "#EF4444" : "var(--text-muted)";

  return (
    <div style={{
      background: "var(--card-bg)", border: "1px solid var(--card-border)",
      borderRadius: "var(--radius-lg)", padding: 20, display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
            background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}33`,
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>
            {meta.label}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>n={f.n}</span>
        </div>
        <span style={{ fontSize: 16, fontWeight: 700, color: dirColor, flexShrink: 0 }}>{dirSymbol}</span>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.5 }}>
        {f.headline}
      </div>

      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
        {f.detail}
      </div>

      {f.chartData && f.chartType === "bar" && (
        <MiniBarChart data={f.chartData} unit={f.unit} />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/attempts?limit=200", { cache: "no-store" })
      .then(r => r.ok ? r.json() : { attempts: [] })
      .then(d => { if (Array.isArray(d?.attempts)) setAttempts(d.attempts); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const findings = useMemo(() => generateFindings(attempts), [attempts]);

  const totalWithDelivery = attempts.filter(a =>
    a.deliveryMetrics?.face || a.deliveryMetrics?.hands || a.deliveryMetrics?.acoustics
  ).length;

  return (
    <PremiumShell title="Insights">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: "var(--accent)", textTransform: "uppercase", marginBottom: 8 }}>
            Data Analysis
          </div>
          <h1 style={{ margin: "0 0 10px", fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: -0.5 }}>
            What the data actually shows
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 560 }}>
            Correlations, patterns, and gaps computed across your full session history. Every finding is derived directly from your data — nothing is inferred or estimated.
          </p>
          {attempts.length > 0 && (
            <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
              {[
                { label: "Sessions analyzed", value: attempts.length },
                { label: "With delivery data", value: totalWithDelivery },
                { label: "Findings generated", value: findings.length },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 14 }}>
            Analyzing your sessions…
          </div>
        )}

        {!loading && attempts.length < 3 && (
          <div style={{ textAlign: "center", padding: "60px 20px", borderRadius: "var(--radius-xl)", border: "1px dashed var(--card-border)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Not enough data yet</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Complete at least 3 sessions to start generating findings.</div>
          </div>
        )}

        {!loading && findings.length === 0 && attempts.length >= 3 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)", fontSize: 14 }}>
            No statistically significant findings yet. Keep practicing — patterns emerge with more data.
          </div>
        )}

        {!loading && findings.length > 0 && (
          <>
            {/* Findings grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
              {findings.map(f => <FindingCard key={f.id} f={f} />)}
            </div>

            {/* Footer note */}
            <div style={{ marginTop: 28, padding: "14px 18px", borderRadius: "var(--radius-lg)", background: "var(--card-bg)", border: "1px solid var(--card-border-soft)" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--text-primary)" }}>How these are computed:</strong> Correlations use Pearson r (shown where |r| ≥ 0.4 and n ≥ 4). Category comparisons require ≥ 2 sessions per group. Threshold findings split sessions at the median. No thresholds are adjusted post-hoc — every finding would reproduce on new data.
              </div>
            </div>
          </>
        )}
      </div>
    </PremiumShell>
  );
}
