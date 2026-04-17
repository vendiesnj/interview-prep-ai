// app/api/voice-metrics/route.ts
// Audio analysis via Azure Speech (pronunciation assessment + prosody + word timestamps)
// Python acoustics service kept for series visualization data only.
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

// ── Types ─────────────────────────────────────────────────────────────────────

type Word = { start?: number; end?: number; text?: string };

type MumbleMetrics = {
  mumbleIndex: number;        // 0–100, higher = more mumbling
  avgWordAccuracy: number;    // mean per-word accuracy 0–100
  mumbledWordRate: number;    // % of words with AccuracyScore < 60
  omissionRate: number;       // % of words with ErrorType "Omission"
  mispronunciationRate: number; // % of words with ErrorType "Mispronunciation"
};

type AcousticSeries = {
  t: number[];
  energy: number[];
  pitch: number[];
};

// Python acoustics service returns these (we only use series now)
type AcousticsResponse = {
  pitchMean?: number | null;
  pitchStd?: number | null;
  pitchRange?: number | null;
  monotoneScore?: number | null;
  energyMean?: number | null;
  energyStd?: number | null;
  energyVariation?: number | null;
  tempo?: number | null;
  tempoDynamics?: number | null;
  sampleRate?: number | null;
  durationSec?: number | null;
  series?: AcousticSeries | null;
  [k: string]: unknown;
};

// Azure pronunciation assessment word
type AzureWord = {
  Word?: string;
  Offset?: number;   // 100-nanosecond units
  Duration?: number; // 100-nanosecond units
  Confidence?: number;
  PronunciationAssessment?: {
    AccuracyScore?: number;
    ErrorType?: string; // "None" | "Mispronunciation" | "Omission" | "Insertion" | "UnexpectedBreak" | "MissingBreak" | "Monotone"
  };
};

type AzureResponse = {
  RecognitionStatus?: string;
  DisplayText?: string;
  NBest?: Array<{
    Confidence?: number;
    Display?: string;
    Words?: AzureWord[];
    PronunciationAssessment?: {
      AccuracyScore?: number;
      FluencyScore?: number;
      CompletenessScore?: number;
      PronScore?: number;
    };
    ProsodyScore?: {
      ProsodyScore?: number;
      Monotone?: {
        MonotonePitch?: number;
        MonotoneLoudness?: number;
      };
    };
  }>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const numOrNull = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Known filler words — Azure doesn't flag these explicitly, so we detect by word match
const FILLER_WORDS = new Set([
  "um", "uh", "uhh", "umm", "hmm", "er", "ah", "ahh",
  "like", "basically", "literally", "actually", "honestly",
  "you know", "i mean", "right", "okay", "so", "anyway",
  "kind of", "sort of", "just", "very",
]);

function computeFillerStats(words: AzureWord[]): { fillers: { text: string; start: number | null; end: number | null }[]; fillersPer100Words: number; total: number; wordCount: number } {
  const total = words.length;
  const fillers: { text: string; start: number | null; end: number | null }[] = [];

  for (const w of words) {
    const text = (w.Word ?? "").toLowerCase().trim();
    if (FILLER_WORDS.has(text)) {
      fillers.push({
        text: w.Word ?? "",
        start: w.Offset != null ? Math.round(w.Offset / 10000) : null,
        end: w.Offset != null && w.Duration != null ? Math.round((w.Offset + w.Duration) / 10000) : null,
      });
    }
  }

  const fillersPer100 = total > 0 ? (fillers.length / total) * 100 : 0;
  return { fillers, fillersPer100Words: fillersPer100, total: fillers.length, wordCount: total };
}

function computePauseMetrics(words: AzureWord[]) {
  // Convert Azure 100-ns timestamps to milliseconds
  const w = words
    .filter(x => typeof x.Offset === "number" && typeof x.Duration === "number")
    .map(x => ({
      start: Math.round((x.Offset as number) / 10000),
      end: Math.round(((x.Offset as number) + (x.Duration as number)) / 10000),
    }))
    .sort((a, b) => a.start - b.start);

  let pauseCount = 0;
  let longPauseCount = 0;
  let sum = 0;
  let max = 0;

  for (let i = 0; i < w.length - 1; i++) {
    const gap = w[i + 1].start - w[i].end;
    if (gap >= 300) pauseCount += 1;
    if (gap >= 900) longPauseCount += 1;
    if (gap > 0) {
      sum += gap;
      if (gap > max) max = gap;
    }
  }

  const avg = pauseCount > 0 ? Math.round(sum / pauseCount) : 0;
  return { pauseCount, longPauseCount, avgPauseMs: avg, maxPauseMs: Math.round(max) };
}

function computeMumbleMetrics(words: AzureWord[]): MumbleMetrics | null {
  // Need per-word pronunciation assessment; require ≥5 assessed words for reliability
  const assessed = words.filter(w => w.PronunciationAssessment != null);
  if (assessed.length < 5) return null;

  // Per-word accuracy — how clearly each word was pronounced (0–100)
  const accuracyScores = assessed
    .map(w => w.PronunciationAssessment!.AccuracyScore)
    .filter((s): s is number => typeof s === "number");

  const avgWordAccuracy =
    accuracyScores.length > 0
      ? Math.round(accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length)
      : 100;

  // Words with accuracy below 60 — clear signal of unclear articulation
  const lowAccuracyCount = accuracyScores.filter(s => s < 60).length;
  const mumbledWordRate =
    accuracyScores.length > 0 ? Math.round((lowAccuracyCount / accuracyScores.length) * 100) : 0;

  // Omissions: word sounds present in text but not audibly produced (swallowed endings, dropped syllables)
  const omissionCount = assessed.filter(
    w => w.PronunciationAssessment?.ErrorType === "Omission"
  ).length;
  const omissionRate = Math.round((omissionCount / assessed.length) * 100);

  // Mispronunciations: sounds that don't match expected phonemes (unclear consonants, blended words)
  const mispronunciationCount = assessed.filter(
    w => w.PronunciationAssessment?.ErrorType === "Mispronunciation"
  ).length;
  const mispronunciationRate = Math.round((mispronunciationCount / assessed.length) * 100);

  // Composite mumble index (0–100):
  //   50% weight — mumbled word rate (core articulatory clarity signal)
  //   30% weight — omission rate, capped contribution at 100% (max 30 pts)
  //   20% weight — mispronunciation rate, capped at 100% (max 20 pts)
  const mumbleIndex = clamp(
    Math.round(
      (mumbledWordRate / 100) * 50 +
      Math.min(omissionRate / 100, 1) * 30 +
      Math.min(mispronunciationRate / 100, 1) * 20
    ),
    0,
    100
  );

  return { mumbleIndex, avgWordAccuracy, mumbledWordRate, omissionRate, mispronunciationRate };
}

// Map Azure MonotonePitch (0–100, higher=more monotone) to our monotoneScore scale
// Our scale: 0–10, higher=more monotone (to match existing dimensions.ts conventions)
function azureMonotonePitchToScore(val: number | null | undefined): number | null {
  const v = numOrNull(val);
  if (v === null) return null;
  return clamp(v / 10, 0, 10); // 100 → 10 (fully monotone), 0 → 0 (fully varied)
}

// Map Azure MonotoneLoudness (0–100, higher=more monotone) to energyVariation scale
// Our scale: 0–3+, where 0.8–2.0 is ideal (matching existing dimensions.ts thresholds)
// MonotoneLoudness=0 (very dynamic) → ~2.2 (good), 100 (fully monotone) → ~0.1 (flat)
function azureMonotoneLoudnessToEnergyVar(val: number | null | undefined): number | null {
  const v = numOrNull(val);
  if (v === null) return null;
  return clamp((1 - v / 100) * 2.4 + 0.1, 0.05, 3.0);
}

// Derive WPM from word count and total audio duration
function computeWpm(words: AzureWord[], azureDurationNs: number | null): number | null {
  if (words.length < 10) return null;
  let durationSec: number | null = null;
  if (azureDurationNs && azureDurationNs > 0) {
    durationSec = azureDurationNs / 10_000_000;
  } else {
    // Estimate from last word offset + duration
    const last = words[words.length - 1];
    if (last.Offset != null && last.Duration != null) {
      durationSec = (last.Offset + last.Duration) / 10_000_000;
    }
  }
  if (!durationSec || durationSec < 1) return null;
  return Math.round((words.length / durationSec) * 60);
}

// ── Python acoustics (series only) ───────────────────────────────────────────

const normalizeSeries = (raw: unknown): AcousticSeries | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const t = Array.isArray(r.t) ? r.t.map(Number) : [];
  const energy = Array.isArray(r.energy) ? r.energy.map(Number) : [];
  const pitch = Array.isArray(r.pitch) ? r.pitch.map(Number) : [];
  const n = Math.min(t.length, energy.length, pitch.length);
  if (n < 2) return null;
  return { t: t.slice(0, n), energy: energy.slice(0, n), pitch: pitch.slice(0, n) };
};

async function fetchAcoustics(audio: File, timeoutMs = 120_000): Promise<AcousticsResponse | null> {
  const base = process.env.ACOUSTICS_URL;
  if (!base) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fd = new FormData();
    fd.set("audio", audio, audio.name);
    const res = await fetch(`${base.replace(/\/$/, "")}/analyze`, {
      method: "POST", body: fd, signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as AcousticsResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── Azure Speech ──────────────────────────────────────────────────────────────

async function callAzureSpeech(
  audioBuffer: Buffer,
  contentType: string,
  timeoutMs = 120_000,
): Promise<AzureResponse | null> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION ?? "eastus";

  if (!key) {
    console.warn("AZURE_SPEECH_KEY not set — skipping Azure Speech analysis");
    return null;
  }

  const paConfig = {
    ReferenceText: "",
    GradingSystem: "HundredMark",
    Dimension: "Comprehensive",
    EnableMiscue: false,
    EnableProsodyAssessment: true,
  };
  const paHeader = Buffer.from(JSON.stringify(paConfig)).toString("base64");

  const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": contentType,
        "Pronunciation-Assessment": paHeader,
      },
      body: audioBuffer as unknown as BodyInit,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("AZURE_SPEECH ERROR:", res.status, text.slice(0, 500));
      return null;
    }

    return (await res.json()) as AzureResponse;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      console.error("AZURE_SPEECH TIMEOUT after", timeoutMs, "ms");
    } else {
      console.error("AZURE_SPEECH EXCEPTION:", e);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData().catch(() => null);
    const audio = form?.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { metrics: null, vendorError: 'Missing "audio" file in form-data' },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await audio.arrayBuffer());
    const contentType = audio.type || "audio/webm;codecs=opus";

    // ── Kick off both calls in parallel ──────────────────────────────────────
    const acousticsFile = new File([buf], audio.name || "audio.webm", { type: contentType });

    const [azureResult, acousticsRaw] = await Promise.all([
      callAzureSpeech(buf, contentType),
      fetchAcoustics(acousticsFile),
    ]);

    // ── Parse Azure result ────────────────────────────────────────────────────
    const best = azureResult?.NBest?.[0] ?? null;
    const azureWords: AzureWord[] = Array.isArray(best?.Words) ? best!.Words! : [];
    const paScore = best?.PronunciationAssessment ?? null;
    const prosodyScore = best?.ProsodyScore ?? null;
    const monotone = prosodyScore?.Monotone ?? null;

    const pauses = computePauseMetrics(azureWords);
    const fillerStats = computeFillerStats(azureWords);

    // WPM from Azure word count + total duration
    const azureDurationNs = numOrNull((azureResult as any)?.Duration);
    const wpm = computeWpm(azureWords, azureDurationNs);

    // Stutter detection: count words with ErrorType UnexpectedBreak
    const unexpectedBreaks = azureWords.filter(
      w => w.PronunciationAssessment?.ErrorType === "UnexpectedBreak",
    ).length;

    // Mumble / articulation clarity detection
    const mumbleMetrics = computeMumbleMetrics(azureWords);

    // Map Azure monotone → existing score scales
    const monotoneScore = azureMonotonePitchToScore(monotone?.MonotonePitch);
    const energyVariation = azureMonotoneLoudnessToEnergyVar(monotone?.MonotoneLoudness);

    // Pronunciation + fluency scores (Azure 0–100 → store as-is; resolveAcoustics normalizes)
    const pronunciationScore = numOrNull(paScore?.PronScore);
    const fluencyScore = numOrNull(paScore?.FluencyScore);
    const prosodyScoreVal = numOrNull(prosodyScore?.ProsodyScore);

    // Python series (visualization only)
    const series = normalizeSeries((acousticsRaw as any)?.series ?? null);

    // ── Build metrics object ──────────────────────────────────────────────────
    return NextResponse.json({
      metrics: {
        // Pause / pacing (computed from Azure word timestamps)
        words: azureWords.length,
        pauseCount: pauses.pauseCount,
        longPauseCount: pauses.longPauseCount,
        avgPauseMs: pauses.avgPauseMs,
        maxPauseMs: pauses.maxPauseMs,
        wpm,

        // Filler words (detected from Azure word list)
        fillers: fillerStats.fillers,

        // Azure pronunciation + prosody (new signals)
        pronunciationScore,
        fluencyScore,
        prosodyScore: prosodyScoreVal,
        unexpectedBreaks,

        // Mumble / articulation clarity (derived from per-word AccuracyScore + ErrorType)
        mumbleIndex: mumbleMetrics?.mumbleIndex ?? null,
        avgWordAccuracy: mumbleMetrics?.avgWordAccuracy ?? null,
        mumbledWordRate: mumbleMetrics?.mumbledWordRate ?? null,
        omissionRate: mumbleMetrics?.omissionRate ?? null,
        mispronunciationRate: mumbleMetrics?.mispronunciationRate ?? null,

        // Acoustics object (downstream resolveAcoustics() reads these)
        acoustics: {
          monotoneScore,       // 0–10, higher=more monotone (mapped from Azure MonotonePitch)
          energyVariation,     // 0–3+, optimal 0.8–2.0 (mapped from Azure MonotoneLoudness)
          pronunciationScore,
          fluencyScore,
          prosodyScore: prosodyScoreVal,
          unexpectedBreaks,
          // Mumble signals — passed into acoustics so resolveAcoustics() can normalize them
          mumbleIndex: mumbleMetrics?.mumbleIndex ?? null,
          avgWordAccuracy: mumbleMetrics?.avgWordAccuracy ?? null,
          mumbledWordRate: mumbleMetrics?.mumbledWordRate ?? null,
          omissionRate: mumbleMetrics?.omissionRate ?? null,
          mispronunciationRate: mumbleMetrics?.mispronunciationRate ?? null,
          // Python series stays for Results page visualizations
          series,
          // Python acoustics fallbacks (if service available)
          pitchMean: numOrNull((acousticsRaw as any)?.pitchMean) ?? null,
          pitchStd: numOrNull((acousticsRaw as any)?.pitchStd ?? (acousticsRaw as any)?.pitchStdHz) ?? null,
          pitchRange: numOrNull((acousticsRaw as any)?.pitchRange) ?? null,
          energyMean: numOrNull((acousticsRaw as any)?.energyMean) ?? null,
          energyStd: numOrNull((acousticsRaw as any)?.energyStd) ?? null,
          tempo: numOrNull((acousticsRaw as any)?.tempo) ?? null,
          tempoDynamics: numOrNull((acousticsRaw as any)?.tempoDynamics) ?? null,
          durationSec: numOrNull((acousticsRaw as any)?.durationSec) ?? null,
        },
      },
      vendorError: azureResult === null ? "Azure Speech unavailable — metrics limited" : null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ metrics: null, vendorError: msg }, { status: 500 });
  }
}
