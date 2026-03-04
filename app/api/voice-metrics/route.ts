import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type DeliveryMetrics = {
  pauseCount: number;
  avgPauseMs: number;
  maxPauseMs: number;
  longPauseCount: number; // e.g. >= 900ms
  words: number;
  durationMs?: number;
  fillers?: Array<{ text: string; start: number; end: number }>;
};

function computePausesFromWords(words: Array<{ start: number; end: number }>) {
  // AssemblyAI word timings are ms
  const gaps: number[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const gap = words[i + 1].start - words[i].end;
    if (gap > 0) gaps.push(gap);
  }

  // Define what you consider a "pause"
  const PAUSE_MS = 350;
  const LONG_PAUSE_MS = 900;

  const pauses = gaps.filter((g) => g >= PAUSE_MS);
  const longPauses = gaps.filter((g) => g >= LONG_PAUSE_MS);

  const pauseCount = pauses.length;
  const avgPauseMs =
    pauseCount > 0 ? Math.round(pauses.reduce((a, b) => a + b, 0) / pauseCount) : 0;
  const maxPauseMs = pauseCount > 0 ? Math.max(...pauses) : 0;

  return { pauseCount, avgPauseMs, maxPauseMs, longPauseCount: longPauses.length };
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ASSEMBLYAI_API_KEY" }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get("audio");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "audio file missing" }, { status: 400 });
    }

    // 1) Upload audio to AssemblyAI
    const uploadResp = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: Buffer.from(await file.arrayBuffer()),
    });

    if (!uploadResp.ok) {
      const t = await uploadResp.text();
      return NextResponse.json({ error: "Upload failed", raw: t }, { status: 502 });
    }

    const { upload_url } = (await uploadResp.json()) as { upload_url: string }; // :contentReference[oaicite:2]{index=2}

    // 2) Request transcript with disfluencies + word timestamps
    // disfluencies flag enables filler/disfluency detection :contentReference[oaicite:3]{index=3}
    const submitResp = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: upload_url,
        punctuate: true,
        format_text: true,
        disfluencies: true, // :contentReference[oaicite:4]{index=4}
      }),
    });

    if (!submitResp.ok) {
      const t = await submitResp.text();
      return NextResponse.json({ error: "Transcript submit failed", raw: t }, { status: 502 });
    }

    const { id } = (await submitResp.json()) as { id: string }; // submit endpoint :contentReference[oaicite:5]{index=5}

    // 3) Poll until completed
    let status = "queued";
    let result: any = null;

    for (let i = 0; i < 60; i++) {
      const r = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: { Authorization: apiKey },
      });

      if (!r.ok) {
        const t = await r.text();
        return NextResponse.json({ error: "Transcript fetch failed", raw: t }, { status: 502 });
      }

      result = await r.json();
      status = result.status;

      if (status === "completed") break;
      if (status === "error") {
        return NextResponse.json({ error: "Transcript error", raw: result }, { status: 502 });
      }

      await sleep(750);
    }

    if (status !== "completed") {
      return NextResponse.json({ error: "Transcript timeout" }, { status: 504 });
    }

    // 4) Compute delivery metrics from word timings + disfluencies
    const words = Array.isArray(result.words) ? result.words : [];
    const wordTimings = words
      .filter((w: any) => typeof w?.start === "number" && typeof w?.end === "number")
      .map((w: any) => ({ start: w.start, end: w.end }));

    const pauseStats = computePausesFromWords(wordTimings);

    const fillers =
      Array.isArray(result.disfluencies)
        ? result.disfluencies
            .filter((d: any) => typeof d?.start === "number" && typeof d?.end === "number")
            .slice(0, 50)
            .map((d: any) => ({ text: String(d.text ?? "").trim(), start: d.start, end: d.end }))
        : [];

    const metrics: DeliveryMetrics = {
      ...pauseStats,
      words: wordTimings.length,
      fillers,
      durationMs: typeof result.audio_duration === "number" ? Math.round(result.audio_duration * 1000) : undefined,
    };

    return NextResponse.json({ metrics }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}