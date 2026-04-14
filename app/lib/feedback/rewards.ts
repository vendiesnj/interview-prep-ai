// ---------------------------------------------------------------------------
// Reward / Metric Improvement Detection
// Compares the current feedback attempt to the previous history entry.
// Returns unlocks only when improvement clearly exceeds noise thresholds.
// ---------------------------------------------------------------------------

export type RewardUnlock = {
  metricKey: string;
  metric: string;
  prevValue: number;
  currValue: number;
  deltaLabel: string;
  celebrationLine: string;
  direction: "up" | "down"; // "down" is good for fillers/pace
};

// Thresholds - improvement must exceed these to count as a real unlock
const THRESHOLDS: Record<string, number> = {
  score:          4,     // points on 0–100 scale
  communication:  0.6,   // points on 0–10
  confidence:     0.6,
  star_result:    0.8,
  filler_rate:    1.5,   // fillers per 100 words (lower = better)
  pitch_range:    10,    // Hz
  monotone:       0.8,   // monotoneScore (lower = better)
  wpm:            0,     // special case - reward for entering 130–165 range
  eye_contact:    0.15,  // 0–1
};

const CELEBRATION: Record<string, (delta: string, curr: string) => string> = {
  score:          (d) => `Overall score up ${d} points - a clear step forward.`,
  communication:  (d) => `Communication +${d} - cleaner structure and easier to follow.`,
  confidence:     (d) => `Confidence +${d} - stronger ownership language coming through.`,
  star_result:    (d) => `Closing impact improved ${d} pts - your Result section is landing harder.`,
  filler_rate:    (d, curr) => `Filler rate down ${d}/100 words (now ${curr}) - noticeably cleaner delivery.`,
  pitch_range:    (d) => `Vocal variety up ${d} Hz - less monotone, more dynamic presence.`,
  monotone:       (d) => `Monotone score down ${d} - more pitch variation detected this attempt.`,
  wpm:            (_d, curr) => `Pace dialed in at ${curr} wpm - in the ideal 130–165 range now.`,
  eye_contact:    (d) => `Eye contact up ${d} - stronger camera presence detected.`,
};

function fmt(n: number, decimals = 1) {
  return n.toFixed(decimals);
}

function wpmInRange(w: number) {
  return w >= 130 && w <= 165;
}

export function computeRewards(
  prevEntry: any | null,
  currFeedback: any,
  currFillersPer100: number,
  currWpm: number | null,
): RewardUnlock[] {
  if (!prevEntry || !currFeedback) return [];

  const unlocks: RewardUnlock[] = [];

  // Helper - push only if improvement exceeds threshold
  function check(
    key: string,
    label: string,
    prev: number | null | undefined,
    curr: number | null | undefined,
    direction: "up" | "down" = "up",
  ) {
    if (prev == null || curr == null || !isFinite(prev) || !isFinite(curr)) return;
    const threshold = THRESHOLDS[key] ?? 0;
    const delta = direction === "up" ? curr - prev : prev - curr;
    if (delta < threshold) return;
    const deltaLabel = direction === "up"
      ? `+${fmt(delta)}`
      : `↓${fmt(delta)}`;
    unlocks.push({
      metricKey: key,
      metric: label,
      prevValue: prev,
      currValue: curr,
      deltaLabel,
      celebrationLine: CELEBRATION[key]?.(fmt(delta), fmt(curr)) ?? `${label} improved.`,
      direction,
    });
  }

  // Score (0–100 scale)
  const prevScore100 = typeof prevEntry.score === "number"
    ? (prevEntry.score > 10 ? prevEntry.score : prevEntry.score * 10)
    : null;
  const currScore100 = typeof currFeedback.score === "number"
    ? (currFeedback.score > 10 ? currFeedback.score : currFeedback.score * 10)
    : null;
  check("score", "Signal Score", prevScore100, currScore100, "up");

  // Communication + Confidence (0–10)
  check("communication", "Communication", prevEntry.communication_score, currFeedback.communication_score, "up");
  check("confidence", "Confidence", prevEntry.confidence_score, currFeedback.confidence_score, "up");

  // STAR result sub-score
  const prevStarResult = prevEntry.feedback?.star?.result ?? prevEntry.star?.result ?? null;
  const currStarResult = currFeedback.star?.result ?? null;
  check("star_result", "Closing Impact", prevStarResult, currStarResult, "up");

  // Filler rate (lower is better)
  const prevFiller = prevEntry.feedback?.filler?.per100
    ?? prevEntry.filler_rate
    ?? prevEntry.fillersPer100
    ?? null;
  check("filler_rate", "Filler Rate", prevFiller, currFillersPer100, "down");

  // Vocal variety - pitchRange (higher is better)
  const prevPitchRange = prevEntry.prosody?.pitchRange
    ?? prevEntry.deliveryMetrics?.acoustics?.pitchRange
    ?? null;
  const currPitchRange = currFeedback.delivery_metrics?.acoustics?.pitchRange
    ?? currFeedback.deliveryMetrics?.acoustics?.pitchRange
    ?? null;
  check("pitch_range", "Vocal Variety", prevPitchRange, currPitchRange, "up");

  // Monotone score (lower is better)
  const prevMonotone = prevEntry.prosody?.monotoneScore
    ?? prevEntry.deliveryMetrics?.acoustics?.monotoneScore
    ?? null;
  const currMonotone = currFeedback.delivery_metrics?.acoustics?.monotoneScore
    ?? currFeedback.deliveryMetrics?.acoustics?.monotoneScore
    ?? null;
  check("monotone", "Vocal Dynamics", prevMonotone, currMonotone, "down");

  // Pace - reward for moving INTO the ideal range (not just any change)
  const prevWpm = prevEntry.wpm ?? prevEntry.deliveryMetrics?.wpm ?? null;
  if (
    currWpm !== null && prevWpm !== null &&
    wpmInRange(currWpm) && !wpmInRange(prevWpm) &&
    Math.abs(currWpm - prevWpm) > 8
  ) {
    unlocks.push({
      metricKey: "wpm",
      metric: "Pace",
      prevValue: prevWpm,
      currValue: currWpm,
      deltaLabel: `${fmt(prevWpm, 0)} → ${fmt(currWpm, 0)} wpm`,
      celebrationLine: CELEBRATION.wpm("", fmt(currWpm, 0)),
      direction: "up",
    });
  }

  // Eye contact (higher is better)
  const prevEye = prevEntry.deliveryMetrics?.face?.eyeContact ?? null;
  const currEye = currFeedback.face_metrics?.eyeContact
    ?? currFeedback.deliveryMetrics?.face?.eyeContact
    ?? null;
  check("eye_contact", "Eye Contact", prevEye, currEye, "up");

  // Cap at 3 - prioritize the highest-impact metrics
  const PRIORITY = ["score", "star_result", "filler_rate", "communication", "confidence", "pitch_range", "monotone", "wpm", "eye_contact"];
  unlocks.sort((a, b) => PRIORITY.indexOf(a.metricKey) - PRIORITY.indexOf(b.metricKey));

  return unlocks.slice(0, 3);
}
