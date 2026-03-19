// app/api/voice-metrics/route.ts
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

type Word = { start?: number; end?: number; text?: string };

type AcousticSeries = {
  t: number[];
  energy: number[];
  pitch: number[];
};

type AcousticMetrics = {
  pitchMean: number | null;
  pitchStd: number | null;
  pitchRange: number | null;
  monotoneScore?: number | null;

  energyMean: number | null;
  energyStd: number | null;
  energyVariation?: number | null;

  tempo: number | null;
  tempoDynamics?: number | null;

  sampleRate?: number | null;
  durationSec?: number | null;

  series?: AcousticSeries | null;
};

async function fetchAcoustics(audio: File, timeoutMs = 120_000): Promise<AcousticMetrics | null> {
  const base = process.env.ACOUSTICS_URL;
  if (!base) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fd = new FormData();
    fd.set("audio", audio, audio.name);

    const res = await fetch(`${base.replace(/\/$/, "")}/analyze`, {
      method: "POST",
      body: fd,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("ACOUSTICS ERROR:", res.status, text);
      return null;
    }
    const json = (await res.json()) as AcousticMetrics;
    return json ?? null;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      console.error("ACOUSTICS TIMEOUT after", timeoutMs, "ms");
    } else {
      console.error("ACOUSTICS FETCH EXCEPTION:", e);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function computePauseMetrics(words: Word[]) {
  const w = (words || [])
    .filter((x) => typeof x?.start === "number" && typeof x?.end === "number")
    .sort((a, b) => (a.start as number) - (b.start as number));

  let pauseCount = 0;
  let longPauseCount = 0;
  let sum = 0;
  let max = 0;

  for (let i = 0; i < w.length - 1; i++) {
    const gap = (w[i + 1].start as number) - (w[i].end as number);
    if (gap >= 300) pauseCount += 1;
    if (gap >= 900) longPauseCount += 1;
    if (gap > 0) {
      sum += gap;
      if (gap > max) max = gap;
    }
  }

  const avg = pauseCount > 0 ? Math.round(sum / pauseCount) : 0;

  return {
    pauseCount,
    longPauseCount,
    avgPauseMs: avg,
    maxPauseMs: Math.round(max),
  };
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}


const numOrNull = (v: any): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const normalizeSeries = (raw: any): AcousticSeries | null => {
  if (!raw) return null;

  const t = Array.isArray(raw.t) ? raw.t.map(Number) : [];
  const energy = Array.isArray(raw.energy) ? raw.energy.map(Number) : [];
  const pitch = Array.isArray(raw.pitch) ? raw.pitch.map(Number) : [];

  const n = Math.min(t.length, energy.length, pitch.length);
  if (n < 2) return null;

  return {
    t: t.slice(0, n),
    energy: energy.slice(0, n),
    pitch: pitch.slice(0, n),
  };
};

// If pitchRange is missing, derive from series.pitch (ignoring zeros)
const derivePitchRangeFromSeries = (s: AcousticSeries | null): number | null => {
  if (!s) return null;
  const voiced = s.pitch.filter((x) => typeof x === "number" && Number.isFinite(x) && x > 0);
  if (voiced.length < 5) return null;
  const min = Math.min(...voiced);
  const max = Math.max(...voiced);
  const range = max - min;
  return Number.isFinite(range) ? range : null;
};

// If tempoDynamics missing, derive a simple 0–10 score from pause dispersion (fallback)
// (This isn’t “true tempo dynamics”, but it gives you a useful signal until your Python provides it.)
const deriveTempoDynamicsFromPauses = (avgPauseMs: number, maxPauseMs: number): number | null => {
  if (!Number.isFinite(avgPauseMs) || !Number.isFinite(maxPauseMs) || avgPauseMs <= 0) return null;
  const ratio = maxPauseMs / avgPauseMs; // higher = more variability
  // ratio ~1.2..3.0 -> map to 0..10
  const score = clamp(((ratio - 1.2) / (3.0 - 1.2)) * 10, 0, 10);
  return Number.isFinite(score) ? Math.round(score * 100) / 100 : null;
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { metrics: null, vendorError: "Missing ASSEMBLYAI_API_KEY" },
        { status: 500 }
      );
    }

    // ✅ Accept multipart form-data with "audio"
    const form = await req.formData().catch(() => null);
    const audio = form?.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { metrics: null, vendorError: 'Missing "audio" file in form-data' },
        { status: 400 }
      );
    }

    // Read bytes ONCE, then reuse for both vendors.
// This avoids "stream already read" / partial body issues with File in Node.
const buf = Buffer.from(await audio.arrayBuffer());

// Create a fresh File for the acoustics service (so it gets a clean readable body)
const acousticsFile = new File(
  [buf],
  audio.name && audio.name.length ? audio.name : "audio.webm",
  { type: audio.type || "audio/webm" }
);

// Kick off acoustics in parallel (safe now; it uses a cloned File)
const acousticsPromise = fetchAcoustics(acousticsFile);

// 0) Upload audio to AssemblyAI (use the same buf)
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "content-type": "application/octet-stream",
      },
      body: buf,
    });

    const uploadText = await uploadRes.text();
    let uploadJson: any = null;
    try {
      uploadJson = JSON.parse(uploadText);
    } catch {
      uploadJson = null;
    }

    if (!uploadRes.ok) {
      return NextResponse.json(
        {
          metrics: null,
          vendorError: "Audio Upload Failed",
          vendorStatus: uploadRes.status,
          vendorBody: uploadJson ?? uploadText,
        },
        { status: 502 }
      );
    }

    const audioUrl = uploadJson?.upload_url;
    if (typeof audioUrl !== "string" || audioUrl.length < 10) {
      return NextResponse.json(
        {
          metrics: null,
          vendorError: "Audio Upload Failed (no upload_url returned)",
          vendorBody: uploadJson ?? uploadText,
        },
        { status: 502 }
      );
    }

    // 1) Create transcript
    const createRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speech_models: ["universal-2"], // ✅ required by your account right now
        punctuate: true,
        format_text: true,
        disfluencies: true,
      }),
    });

    const createText = await createRes.text();
    let createJson: any = null;
    try {
      createJson = JSON.parse(createText);
    } catch {
      createJson = null;
    }

    if (!createRes.ok) {
      return NextResponse.json(
        {
          metrics: null,
          vendorError: "Transcript Submit Failed",
          vendorStatus: createRes.status,
          vendorBody: createJson ?? createText,
          audioUrl,
        },
        { status: 502 }
      );
    }

    const transcriptId = createJson?.id;
    if (!transcriptId) {
      return NextResponse.json(
        {
          metrics: null,
          vendorError: "Transcript Submit Failed (no id returned)",
          vendorBody: createJson ?? createText,
          audioUrl,
        },
        { status: 502 }
      );
    }

    // 2) Poll until completed/failed
    const started = Date.now();
    while (Date.now() - started < 120_000) {
      const pollRes = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: { authorization: apiKey } }
      );

      const pollText = await pollRes.text();
      let pollJson: any = null;
      try {
        pollJson = JSON.parse(pollText);
      } catch {
        pollJson = null;
      }

      if (!pollRes.ok) {
        return NextResponse.json(
          {
            metrics: null,
            vendorError: "Transcript Poll Failed",
            vendorStatus: pollRes.status,
            vendorBody: pollJson ?? pollText,
            transcriptId,
          },
          { status: 502 }
        );
      }

      const status = pollJson?.status;

      if (status === "completed") {
  const words: Word[] = Array.isArray(pollJson?.words) ? pollJson.words : [];
  const pauses = computePauseMetrics(words);

  const disfluencies = Array.isArray(pollJson?.disfluencies)
    ? pollJson.disfluencies
    : [];

  const acousticsRaw = await acousticsPromise;
  // Helpful when diagnosing prod: confirms whether series exists
 console.log("acoustics keys:", acousticsRaw ? Object.keys(acousticsRaw as any) : null);

  // Normalize acoustics so Results UI always gets what it expects
  const series = normalizeSeries((acousticsRaw as any)?.series);

  const pitchStd = numOrNull((acousticsRaw as any)?.pitchStd) ?? numOrNull((acousticsRaw as any)?.pitchStdHz);
  const energyStd = numOrNull((acousticsRaw as any)?.energyStd);

  // If energyVariation missing but energyStd exists, create a 0–10 score so the UI bar is meaningful
  const energyVariation =
    numOrNull((acousticsRaw as any)?.energyVariation) ??
    (energyStd === null ? null : clamp((energyStd / 0.12) * 10, 0, 10));

  // If pitchRange missing, derive it from the series
  const pitchRange =
    numOrNull((acousticsRaw as any)?.pitchRange) ?? derivePitchRangeFromSeries(series);

  // If tempoDynamics missing, derive a fallback from pause variability
  const tempoDynamics =
    numOrNull((acousticsRaw as any)?.tempoDynamics) ??
    deriveTempoDynamicsFromPauses(pauses.avgPauseMs, pauses.maxPauseMs);

  const acoustics: AcousticMetrics | null = acousticsRaw
    ? {
        pitchMean: numOrNull((acousticsRaw as any)?.pitchMean),
        pitchStd,
        pitchRange,
        monotoneScore: numOrNull((acousticsRaw as any)?.monotoneScore),

        energyMean: numOrNull((acousticsRaw as any)?.energyMean),
        energyStd,
        energyVariation,

        tempo: numOrNull((acousticsRaw as any)?.tempo),
        tempoDynamics,

        sampleRate: numOrNull((acousticsRaw as any)?.sampleRate),
        durationSec: numOrNull((acousticsRaw as any)?.durationSec),

        series,
      }
    : null;

  return NextResponse.json({
    metrics: {
      transcriptId,
      words: words.length,
      pauseCount: pauses.pauseCount,
      longPauseCount: pauses.longPauseCount,
      avgPauseMs: pauses.avgPauseMs,
      maxPauseMs: pauses.maxPauseMs,
      acoustics,
      fillers: disfluencies.map((d: any) => ({
        text: d?.text ?? "",
        start: d?.start ?? null,
        end: d?.end ?? null,
      })),
    },
    vendorError: null,
  });
}

      if (status === "error" || status === "failed") {
        return NextResponse.json(
          {
            metrics: null,
            vendorError: "Transcript Failed",
            vendorBody: pollJson,
            transcriptId,
          },
          { status: 502 }
        );
      }

      await sleep(1200);
    }

    return NextResponse.json(
      { metrics: null, vendorError: "Transcript Timeout (poll exceeded 120s)" },
      { status: 504 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { metrics: null, vendorError: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}