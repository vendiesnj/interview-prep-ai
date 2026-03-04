// app/api/voice-metrics/route.ts
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

type Word = { start?: number; end?: number; text?: string };

type AcousticMetrics = {
  pitchMean: number;
  pitchStd: number;
  pitchRange: number;
  monotoneScore?: number;
  energyMean: number;
  energyStd: number;
  energyVariation?: number;
  tempo: number;
  tempoDynamics?: number;
  sampleRate?: number;
  durationSec?: number;
};

async function fetchAcoustics(audio: File): Promise<AcousticMetrics | null> {
  const base = process.env.ACOUSTICS_URL;
  if (!base) return null;

  try {
    const fd = new FormData();
    fd.set("audio", audio, audio.name);

    const res = await fetch(`${base.replace(/\/$/, "")}/analyze`, {
      method: "POST",
      body: fd,
    });

    if (!res.ok) return null;

    const json = (await res.json()) as AcousticMetrics;
    return json ?? null;
  } catch {
    return null;
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

    // Kick off acoustics in parallel (do not block polling)
const acousticsPromise = fetchAcoustics(audio);
    // 0) Upload audio to AssemblyAI
    const buf = Buffer.from(await audio.arrayBuffer());

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
    while (Date.now() - started < 45_000) {
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

  const acoustics = await acousticsPromise;

  return NextResponse.json({
    metrics: {
      transcriptId,
      words: words.length,
      pauseCount: pauses.pauseCount,
      longPauseCount: pauses.longPauseCount,
      avgPauseMs: pauses.avgPauseMs,
      maxPauseMs: pauses.maxPauseMs,
      acoustics, // <-- NEW: either metrics object or null
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
      { metrics: null, vendorError: "Transcript Timeout (poll exceeded 45s)" },
      { status: 504 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { metrics: null, vendorError: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}