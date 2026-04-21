// Shared cross-signal findings engine for the My Coach data tab.
// All findings compare signals from different domains (no score vs score).

export type Finding = {
  id: string;
  headline: string;
  detail: string;
  type: "cross_signal" | "inverse" | "pattern" | "threshold" | "dimension";
  n: number;
  r?: number;
  strength: number;
  chartData?: { label: string; value: number; highlight?: boolean }[];
};

// ── Extractors ────────────────────────────────────────────────────────────────

const s100  = (a: any): number | null => { const s = a.score ?? a.feedback?.score; if (s == null || !isFinite(s)) return null; return s <= 10 ? s * 10 : s; };
const wpmX  = (a: any): number | null => a.wpm ?? a.deliveryMetrics?.wpm ?? null;
const durX  = (a: any): number | null => a.durationSeconds ?? null;
const fwX   = (a: any): string | null => a.evaluationFramework ?? null;
const hourX = (a: any): number | null => { try { return new Date(a.ts).getHours(); } catch { return null; } };

const eyeContactX   = (a: any): number | null => { const v = a.deliveryMetrics?.face?.eyeContact;    return v != null ? v * 100 : null; };
const headStabX     = (a: any): number | null => { const v = a.deliveryMetrics?.face?.headStability;  return v != null ? v * 100 : null; };
const smileRateX    = (a: any): number | null => { const v = a.deliveryMetrics?.face?.smileRate;      return v != null ? v * 100 : null; };
const blinkRateX    = (a: any): number | null => a.deliveryMetrics?.face?.blinkRate ?? null;
const browEngageX   = (a: any): number | null => { const v = a.deliveryMetrics?.face?.browEngagement; return v != null ? v * 100 : null; };
const lookAwayX     = (a: any): number | null => { const v = a.deliveryMetrics?.face?.lookAwayRate;   return v != null ? v * 100 : null; };

const fistRateX     = (a: any): number | null => { const v = a.deliveryMetrics?.hands?.fistRate;        return v != null ? v * 100 : null; };
const gestEnergyX   = (a: any): number | null => { const v = a.deliveryMetrics?.hands?.gestureEnergy;   return v != null ? v * 100 : null; };
const twoHandX      = (a: any): number | null => { const v = a.deliveryMetrics?.hands?.twoHandRate;     return v != null ? v * 100 : null; };
const chestZoneX    = (a: any): number | null => { const v = a.deliveryMetrics?.hands?.chestZoneRate;   return v != null ? v * 100 : null; };
const pointingX     = (a: any): number | null => { const v = a.deliveryMetrics?.hands?.pointingRate;    return v != null ? v * 100 : null; };
const neckTouchX    = (a: any): number | null => a.deliveryMetrics?.hands?.neckTouchCount ?? null;

const pitchRangeX   = (a: any): number | null => a.deliveryMetrics?.acoustics?.pitchRange ?? null;
const tempoDynX     = (a: any): number | null => a.deliveryMetrics?.acoustics?.tempoDynamics ?? null;
const mumbleX       = (a: any): number | null => a.deliveryMetrics?.acoustics?.mumbleIndex ?? null;

const dimX = (a: any, k: string): number | null => a.feedback?.dimension_scores?.[k]?.score ?? null;
const dimNarr  = (a: any) => dimX(a, "narrative_clarity");
const dimEvid  = (a: any) => dimX(a, "evidence_quality");
const dimOwn   = (a: any) => dimX(a, "ownership_agency");
const dimVocal = (a: any) => dimX(a, "vocal_engagement");
const dimCtrl  = (a: any) => dimX(a, "response_control");
const dimCog   = (a: any) => dimX(a, "cognitive_depth");
const dimPres  = (a: any) => dimX(a, "presence_confidence");
const dimAud   = (a: any) => dimX(a, "audience_awareness");

// ── Math ──────────────────────────────────────────────────────────────────────

function mean(xs: number[]) { return xs.reduce((a, b) => a + b, 0) / xs.length; }

function pearson(pairs: [number, number][]): number {
  if (pairs.length < 4) return 0;
  const xs = pairs.map(p => p[0]), ys = pairs.map(p => p[1]);
  const mx = mean(xs), my = mean(ys);
  const num = pairs.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0);
  const dx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const dy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  return (dx === 0 || dy === 0) ? 0 : num / (dx * dy);
}

function slopeFn(pairs: [number, number][]): number {
  if (pairs.length < 2) return 0;
  const xs = pairs.map(p => p[0]), ys = pairs.map(p => p[1]);
  const mx = mean(xs), my = mean(ys);
  const num = pairs.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return den === 0 ? 0 : num / den;
}

function xypairs(attempts: any[], xFn: (a: any) => number | null, yFn: (a: any) => number | null): [number, number][] {
  return attempts
    .map(a => [xFn(a), yFn(a)] as [number | null, number | null])
    .filter((p): p is [number, number] => p[0] != null && p[1] != null);
}

function splitHalves(pairs: [number, number][]) {
  const sorted = [...pairs].sort((a, b) => a[0] - b[0]);
  const mid = Math.ceil(sorted.length / 2);
  const lo = sorted.slice(0, mid), hi = sorted.slice(mid);
  return {
    loXAvg: mean(lo.map(p => p[0])), hiXAvg: mean(hi.map(p => p[0])),
    loYAvg: mean(lo.map(p => p[1])), hiYAvg: mean(hi.map(p => p[1])),
    loN: lo.length, hiN: hi.length,
  };
}

const f1 = (n: number) => n.toFixed(1);
const f0 = (n: number) => Math.round(n).toString();

// ── Engine ────────────────────────────────────────────────────────────────────

export function generateFindings(raw: any[]): Finding[] {
  const all = raw.filter(a => s100(a) != null);
  if (all.length < 5) return [];

  const findings: Finding[] = [];

  function tryCorr(
    id: string,
    xFn: (a: any) => number | null,
    yFn: (a: any) => number | null,
    minR: number,
    build: (r: number, ps: [number, number][], h: ReturnType<typeof splitHalves>) => Finding | null
  ) {
    const ps = xypairs(all, xFn, yFn);
    if (ps.length < 4) return;
    const r = pearson(ps);
    if (Math.abs(r) < minR) return;
    const f = build(r, ps, splitHalves(ps));
    if (f) findings.push(f);
  }

  // ── Head stability → Cognitive Depth ──────────────────────────────────────
  tryCorr("head_cog", headStabX, dimCog, 0.38, (r, ps, h) => ({
    id: "head_cog",
    headline: `The stiller your head, the deeper your answers score on Cognitive Depth (r=${f1(r)}).`,
    detail: `Sessions in the top half of head stability avg ${f1(h.hiYAvg)}/10 on Cognitive Depth vs ${f1(h.loYAvg)} in the bottom half. Physical stillness appears to free cognitive bandwidth — when you're not self-monitoring posture, the reasoning gets richer.`,
    type: "cross_signal",
    n: ps.length, r, strength: Math.abs(r),
    chartData: [
      { label: "Less stable", value: Math.round(h.loYAvg * 10) },
      { label: "More stable", value: Math.round(h.hiYAvg * 10), highlight: true },
    ],
  }));

  // ── Brow engagement → Ownership ───────────────────────────────────────────
  tryCorr("brow_own", browEngageX, dimOwn, 0.38, (r, ps, h) => ({
    id: "brow_own",
    headline: `Sessions with more brow movement score ${f1(Math.abs(h.hiYAvg - h.loYAvg))} pts ${r > 0 ? "higher" : "lower"} on Ownership & Agency.`,
    detail: `Brow engagement ${f1(h.loXAvg)}% vs ${f1(h.hiXAvg)}% of frames. When your face is more expressive, your language tends to follow — more "I decided" and fewer hedged "we sort of" constructions.`,
    type: "cross_signal",
    n: ps.length, r, strength: Math.abs(r),
  }));

  // ── Look-away → Cognitive Depth (counter-intuitive positive) ──────────────
  tryCorr("lookaway_cog", lookAwayX, dimCog, 0.30, (r, ps, h) => {
    if (r <= 0) return null;
    return {
      id: "lookaway_cog",
      headline: `Looking away from camera slightly correlates with higher Cognitive Depth (r=${f1(r)}).`,
      detail: `Sessions with ${f1(h.hiXAvg)}% look-away rate score ${f1(Math.abs(h.hiYAvg - h.loYAvg))} pts higher on depth. Breaking eye contact to access memory or construct a complex argument reads differently than nervous distraction — the scores seem to pick that up.`,
      type: "inverse",
      n: ps.length, r, strength: Math.abs(r) * 0.9,
    };
  });

  // ── Pointing gestures → Evidence Quality ──────────────────────────────────
  tryCorr("pointing_evid", pointingX, dimEvid, 0.35, (r, ps, h) => ({
    id: "pointing_evid",
    headline: `Pointing gestures correlate with ${r > 0 ? "higher" : "lower"} Evidence Quality scores (r=${f1(r)}).`,
    detail: `High-pointing sessions (${f1(h.hiXAvg)}% of frames): Evidence Quality ${f1(h.hiYAvg)}/10. Low-pointing sessions: ${f1(h.loYAvg)}/10. The claim-making gesture and the specific evidence appear to arrive together.`,
    type: "cross_signal",
    n: ps.length, r, strength: Math.abs(r),
  }));

  // ── Two-hand use → Narrative Clarity ──────────────────────────────────────
  tryCorr("twohands_narr", twoHandX, dimNarr, 0.35, (r, ps, h) => ({
    id: "twohands_narr",
    headline: `Sessions where you use both hands score ${f1(Math.abs(h.hiYAvg - h.loYAvg))} pts ${r > 0 ? "higher" : "lower"} on Narrative Clarity.`,
    detail: `Two-hand rate ${f1(h.loXAvg)}% vs ${f1(h.hiXAvg)}% of frames. Using both hands to physically map a story — this side, then that — tends to run parallel with cleaner chronological structure in the words.`,
    type: "cross_signal",
    n: ps.length, r, strength: Math.abs(r),
  }));

  // ── Fist rate → Ownership (negative expected) ─────────────────────────────
  tryCorr("fist_own", fistRateX, dimOwn, 0.35, (r, ps, h) => {
    if (r >= 0) return null;
    return {
      id: "fist_own",
      headline: `Higher fist rate predicts lower Ownership & Agency scores (r=${f1(r)}).`,
      detail: `High-fist sessions (${f1(h.hiXAvg)}% of frames): ${f1(h.hiYAvg)}/10 Ownership. Low-fist: ${f1(h.loYAvg)}/10. Tension in the hands appears in the same sessions where ownership language softens — 'we' creep, hedges, passive constructions.`,
      type: "cross_signal",
      n: ps.length, r, strength: Math.abs(r),
    };
  });

  // ── Chest-zone position → Presence ────────────────────────────────────────
  tryCorr("chest_pres", chestZoneX, dimPres, 0.35, (r, ps, h) => ({
    id: "chest_pres",
    headline: `Keeping hands in the chest zone correlates with ${f1(Math.abs(h.hiYAvg - h.loYAvg))} pts ${r > 0 ? "higher" : "lower"} Presence scores.`,
    detail: `Chest-zone rate ${f1(h.loXAvg)}% vs ${f1(h.hiXAvg)}% of frames. Hands at chest height — vs hidden below waist or above shoulders — tracks with grounded, composed speaker presence scores.`,
    type: "cross_signal",
    n: ps.length, r, strength: Math.abs(r),
    chartData: [
      { label: "Hands low/high", value: Math.round(h.loYAvg * 10) },
      { label: "Chest zone",     value: Math.round(h.hiYAvg * 10), highlight: r > 0 },
    ],
  }));

  // ── Smile rate → Vocal Engagement ─────────────────────────────────────────
  tryCorr("smile_vocal", smileRateX, dimVocal, 0.35, (r, ps, h) => ({
    id: "smile_vocal",
    headline: `Sessions where you smile more score ${f1(Math.abs(h.hiYAvg - h.loYAvg))} pts ${r > 0 ? "higher" : "lower"} on Vocal Engagement.`,
    detail: `Smile rate ${f1(h.loXAvg)}% vs ${f1(h.hiXAvg)}% of frames. Smiling while speaking changes resonance and raises the soft palate — the correlation suggests vocal variety and facial warmth are produced by the same underlying state.`,
    type: "cross_signal",
    n: ps.length, r, strength: Math.abs(r),
  }));

  // ── Gesture energy → Narrative Clarity ────────────────────────────────────
  tryCorr("energy_narr", gestEnergyX, dimNarr, 0.30, (r, ps, h) => {
    const diff = Math.abs(h.hiYAvg - h.loYAvg);
    if (diff < 0.4) return null;
    return {
      id: "energy_narr",
      headline: r < 0
        ? `More erratic hand movement correlates with lower Narrative Clarity — the hands and the story are getting tangled.`
        : `Faster gesture movement correlates with ${f1(diff)} pts higher Narrative Clarity — energy is organized, not scattered.`,
      detail: `Gesture energy ${f1(h.loXAvg)} vs ${f1(h.hiXAvg)}. Clarity scores: ${f1(h.loYAvg)} vs ${f1(h.hiYAvg)}. r=${f1(r)}.`,
      type: r < 0 ? "inverse" : "cross_signal",
      n: ps.length, r, strength: Math.abs(r),
    };
  });

  // ── Neck touch → Response Control ─────────────────────────────────────────
  tryCorr("neck_ctrl", neckTouchX, dimCtrl, 0.30, (r, ps, h) => {
    if (r >= 0) return null;
    return {
      id: "neck_ctrl",
      headline: `Neck/chest touching correlates with lower Response Control — self-soothing and structural breakdown peak together.`,
      detail: `Sessions with ${f0(h.hiXAvg)}+ neck-touch events avg ${f1(h.hiYAvg)}/10 on Response Control vs ${f1(h.loYAvg)} in low-touch sessions.`,
      type: "cross_signal",
      n: ps.length, r, strength: Math.abs(r),
    };
  });

  // ── Blink rate outlier → Presence ─────────────────────────────────────────
  {
    const bp = xypairs(all, blinkRateX, dimPres);
    if (bp.length >= 4) {
      const inRange  = bp.filter(([b]) => b >= 12 && b <= 20);
      const outRange = bp.filter(([b]) => b < 12 || b > 20);
      if (inRange.length >= 2 && outRange.length >= 2) {
        const inAvg = mean(inRange.map(p => p[1]));
        const outAvg = mean(outRange.map(p => p[1]));
        const diff = inAvg - outAvg;
        if (Math.abs(diff) >= 0.4) {
          findings.push({
            id: "blink_presence",
            headline: `Sessions with a normal blink rate (12–20/min) score ${f1(Math.abs(diff))} pts ${diff > 0 ? "higher" : "lower"} on Presence than outlier sessions.`,
            detail: `In-range (${inRange.length} sessions): ${f1(inAvg)}/10 presence. Out-of-range (${outRange.length} sessions): ${f1(outAvg)}/10. Both very high (anxiety) and very low (stare) blink rates register as lower presence — the normal range is the sweet spot.`,
            type: "threshold",
            n: bp.length, strength: Math.min(1, Math.abs(diff) / 2),
          });
        }
      }
    }
  }

  // ── Pitch range → Audience Awareness ──────────────────────────────────────
  tryCorr("pitch_aud", pitchRangeX, dimAud, 0.35, (r, ps, h) => ({
    id: "pitch_aud",
    headline: `Wider pitch range predicts ${f1(Math.abs(h.hiYAvg - h.loYAvg))} pts ${r > 0 ? "higher" : "lower"} Audience Awareness scores.`,
    detail: `Pitch range ${f0(h.loXAvg)}Hz vs ${f0(h.hiXAvg)}Hz. Audience Awareness: ${f1(h.loYAvg)} vs ${f1(h.hiYAvg)}/10. Pitch variation signals active calibration of emphasis — the dimension score tracks it.`,
    type: "cross_signal",
    n: ps.length, r, strength: Math.abs(r),
  }));

  // ── Tempo dynamics → Evidence Quality ─────────────────────────────────────
  tryCorr("tempo_evid", tempoDynX, dimEvid, 0.35, (r, ps, h) => ({
    id: "tempo_evid",
    headline: `${r > 0 ? "More varied" : "Flatter"} speaking tempo correlates with ${f1(Math.abs(h.hiYAvg - h.loYAvg))} pts ${r > 0 ? "higher" : "lower"} Evidence Quality.`,
    detail: `Tempo dynamics ${f1(h.loXAvg)} vs ${f1(h.hiXAvg)} (0–10 scale). Evidence Quality: ${f1(h.loYAvg)} vs ${f1(h.hiYAvg)}/10. Slowing before a specific claim — a number, a date — may be the mechanism. The pause sells the proof.`,
    type: "cross_signal",
    n: ps.length, r, strength: Math.abs(r),
  }));

  // ── Head stability vs Vocal Engagement (inverse) ──────────────────────────
  tryCorr("head_vocal", headStabX, dimVocal, 0.30, (r, ps, h) => {
    if (r >= 0) return null;
    return {
      id: "head_vocal",
      headline: `Sessions with more head movement score ${f1(Math.abs(h.loYAvg - h.hiYAvg))} pts higher on Vocal Engagement.`,
      detail: `Head stability ${f1(h.loXAvg)}% (less stable) vs ${f1(h.hiXAvg)}% (more stable). Vocal Engagement: ${f1(h.loYAvg)} vs ${f1(h.hiYAvg)}/10. When physical energy disappears from the head, it drains from the voice too — they aren't independent.`,
      type: "inverse",
      n: ps.length, r, strength: Math.abs(r) * 0.85,
    };
  });

  // ── Duration → Cognitive Depth more than overall ──────────────────────────
  {
    const dc = xypairs(all, durX, dimCog);
    const ds = xypairs(all, durX, s100);
    if (dc.length >= 4 && ds.length >= 4) {
      const rCog = pearson(dc), rScore = pearson(ds);
      if (Math.abs(rCog) >= 0.4 && Math.abs(rCog) - Math.abs(rScore) >= 0.15) {
        const h = splitHalves(dc);
        findings.push({
          id: "dur_cog",
          headline: `Longer answers move Cognitive Depth more than any other dimension.`,
          detail: `Duration correlates ${f1(rCog)} with Cognitive Depth but only ${f1(rScore)} with overall score. More time isn't buying everything equally — it's specifically buying depth of reasoning, not structure or delivery.`,
          type: "dimension",
          n: dc.length, r: rCog,
          strength: Math.abs(rCog) - Math.abs(rScore),
          chartData: [
            { label: "Short sessions", value: Math.round(h.loYAvg * 10) },
            { label: "Long sessions",  value: Math.round(h.hiYAvg * 10), highlight: rCog > 0 },
          ],
        });
      }
    }
  }

  // ── Time of day → specific dimension ──────────────────────────────────────
  {
    const wh = all.filter(a => hourX(a) != null);
    if (wh.length >= 6) {
      const dims2 = [
        { fn: dimCog, key: "Cognitive Depth" }, { fn: dimVocal, key: "Vocal Engagement" },
        { fn: dimPres, key: "Presence" },        { fn: dimNarr,  key: "Narrative Clarity" },
      ];
      let bestF: Finding | null = null, bestGap = 0;
      for (const { fn, key } of dims2) {
        const buckets = [
          { label: "Morning",   vals: wh.filter(a => { const h2 = hourX(a)!; return h2 >= 7 && h2 < 12; }).map(fn).filter((v): v is number => v != null) },
          { label: "Afternoon", vals: wh.filter(a => { const h2 = hourX(a)!; return h2 >= 12 && h2 < 17; }).map(fn).filter((v): v is number => v != null) },
          { label: "Evening",   vals: wh.filter(a => { const h2 = hourX(a)!; return h2 >= 17 && h2 < 23; }).map(fn).filter((v): v is number => v != null) },
        ].filter(b => b.vals.length >= 2);
        if (buckets.length < 2) continue;
        const avgs = buckets.map(b => ({ label: b.label, avg: mean(b.vals), n: b.vals.length }));
        const top = avgs.reduce((a, b) => a.avg > b.avg ? a : b);
        const bot = avgs.reduce((a, b) => a.avg < b.avg ? a : b);
        const gap = top.avg - bot.avg;
        if (gap >= 0.6 && gap > bestGap) {
          bestGap = gap;
          bestF = {
            id: `time_dim`,
            headline: `${top.label} sessions score ${f1(gap)} pts higher on ${key} than ${bot.label.toLowerCase()}.`,
            detail: `${avgs.map(b => `${b.label}: ${f1(b.avg)}/10 (${b.n} sessions)`).join(" · ")}. The effect is specific to ${key} — not all dimensions shift equally by time of day.`,
            type: "pattern",
            n: wh.length, strength: Math.min(1, gap / 2),
            chartData: avgs.map(b => ({ label: b.label, value: Math.round(b.avg * 10), highlight: b.label === top.label })),
          };
        }
      }
      if (bestF) findings.push(bestF);
    }
  }

  // ── Mock vs practice: which dimension shifts most ─────────────────────────
  {
    const mock = all.filter(a => fwX(a) === "mock_interview");
    const prac = all.filter(a => fwX(a) !== "mock_interview");
    if (mock.length >= 2 && prac.length >= 2) {
      const dims2 = [
        { fn: dimNarr, key: "Narrative Clarity" }, { fn: dimEvid, key: "Evidence Quality" },
        { fn: dimOwn,  key: "Ownership" },          { fn: dimVocal, key: "Vocal Engagement" },
        { fn: dimCtrl, key: "Response Control" },   { fn: dimCog,  key: "Cognitive Depth" },
        { fn: dimPres, key: "Presence" },
      ];
      let bigGap = 0, bigKey = "", mAvg = 0, pAvg = 0;
      for (const { fn, key } of dims2) {
        const mv = mock.map(fn).filter((v): v is number => v != null);
        const pv = prac.map(fn).filter((v): v is number => v != null);
        if (mv.length < 2 || pv.length < 2) continue;
        const gap = Math.abs(mean(mv) - mean(pv));
        if (gap > bigGap) { bigGap = gap; bigKey = key; mAvg = mean(mv); pAvg = mean(pv); }
      }
      if (bigGap >= 0.5) {
        const lower = mAvg < pAvg ? "mock interviews" : "solo practice";
        findings.push({
          id: "mock_dim_gap",
          headline: `${bigKey} drops ${f1(bigGap)} pts in ${lower} — your biggest format-specific gap.`,
          detail: `Mock avg: ${f1(mAvg)}/10. Practice avg: ${f1(pAvg)}/10. Other dimensions shift much less between formats. Something specific about ${bigKey.toLowerCase()} breaks down under the live interview dynamic.`,
          type: "dimension",
          n: mock.length + prac.length, strength: Math.min(1, bigGap / 2),
          chartData: [
            { label: "Mock",     value: Math.round(mAvg * 10), highlight: mAvg < pAvg },
            { label: "Practice", value: Math.round(pAvg * 10), highlight: pAvg < mAvg },
          ],
        });
      }
    }
  }

  // ── Mumble index → Response Control ───────────────────────────────────────
  tryCorr("mumble_ctrl", mumbleX, dimCtrl, 0.35, (r, ps, h) => {
    if (r >= 0) return null;
    return {
      id: "mumble_ctrl",
      headline: `Higher mumble index hurts Response Control more than any other dimension (r=${f1(r)}).`,
      detail: `Mumble index ${f0(h.loXAvg)} vs ${f0(h.hiXAvg)}. Response Control: ${f1(h.loYAvg)} vs ${f1(h.hiYAvg)}/10. Swallowing sentence endings — the primary mumble signal — co-occurs with answers that feel structurally incomplete.`,
      type: "dimension",
      n: ps.length, r, strength: Math.abs(r),
    };
  });

  return findings
    .filter(f => f.n >= 4)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 10);
}
