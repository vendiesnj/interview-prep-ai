// app/api/voice-metrics/route.ts
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

type Word = { start?: number; end?: number; text?: string };

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

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { metrics: null, vendorError: "Missing ASSEMBLYAI_API_KEY" },
        { status: 500 }
      );
    }

 const contentType = req.headers.get("content-type") || "";

// Prefer multipart/form-data (your client sends FormData)
let audioUrl: string | null = null;

if (contentType.includes("multipart/form-data")) {
  const form = await req.formData();
  const file = form.get("audio");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { metrics: null, vendorError: "Missing audio file (field name must be 'audio')" },
      { status: 400 }
    );
  }

  // Upload bytes to AssemblyAI
  const buf = Buffer.from(await file.arrayBuffer());

  const upRes = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "content-type": "application/octet-stream",
    },
    body: buf,
  });

  const upText = await upRes.text();
  let upJson: any = null;
  try {
    upJson = JSON.parse(upText);
  } catch {
    upJson = null;
  }

  if (!upRes.ok) {
    return NextResponse.json(
      {
        metrics: null,
        vendorError: "Upload Failed",
        vendorStatus: upRes.status,
        vendorBody: upJson ?? upText,
      },
      { status: 502 }
    );
  }

  audioUrl = upJson?.upload_url ?? null;
} else {
  // Backwards compatible: allow JSON {audioUrl}
  const body = await req.json().catch(() => null);
  audioUrl = body?.audioUrl ?? body?.audio_url ?? null;
}

if (typeof audioUrl !== "string" || audioUrl.trim().length < 10) {
  return NextResponse.json(
    { metrics: null, vendorError: "Missing audio (send FormData field 'audio' or JSON audioUrl)" },
    { status: 400 }
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
      const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { authorization: apiKey },
      });

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

        // disfluencies can vary by plan; keep safe
        const disfluencies = Array.isArray(pollJson?.disfluencies) ? pollJson.disfluencies : [];

        return NextResponse.json({
          metrics: {
            transcriptId,
            words: words.length,
            pauseCount: pauses.pauseCount,
            longPauseCount: pauses.longPauseCount,
            avgPauseMs: pauses.avgPauseMs,
            maxPauseMs: pauses.maxPauseMs,
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

      // queued / processing
      await new Promise((r) => setTimeout(r, 1200));
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