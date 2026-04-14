import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const ONET_BASE = "https://services.onetcenter.org/ws";

function onetAuth(): string {
  const user = process.env.ONET_USERNAME ?? "";
  const pass = process.env.ONET_PASSWORD ?? "";
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

// GET /api/onet/search?q=supply+chain+planner&start=1&end=20
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const start = req.nextUrl.searchParams.get("start") ?? "1";
  const end = req.nextUrl.searchParams.get("end") ?? "20";

  if (!q || q.length < 2) {
    return NextResponse.json({ occupations: [], total: 0 });
  }

  const username = process.env.ONET_USERNAME;
  const password = process.env.ONET_PASSWORD;
  if (!username || !password) {
    return NextResponse.json(
      { error: "O*NET credentials not configured. Set ONET_USERNAME and ONET_PASSWORD in .env.local." },
      { status: 503 }
    );
  }

  const url = `${ONET_BASE}/online/search?keyword=${encodeURIComponent(q)}&start=${start}&end=${end}&client=signalhq`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: onetAuth(),
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("O*NET search error:", res.status, body);
      return NextResponse.json({ error: "O*NET API error", status: res.status }, { status: 502 });
    }

    const data = await res.json() as {
      keyword: string;
      start: number;
      end: number;
      total: number;
      occupation?: Array<{ code: string; title: string; tags?: { bright_outlook?: boolean; green?: boolean } }>;
    };

    const occupations = (data.occupation ?? []).map((o) => ({
      code: o.code,
      title: o.title,
      slug: titleToSlug(o.title),
      brightOutlook: o.tags?.bright_outlook ?? false,
    }));

    return NextResponse.json({
      occupations,
      total: data.total ?? 0,
      start: data.start ?? 1,
      end: data.end ?? 20,
    });
  } catch (err) {
    console.error("O*NET fetch failed:", err);
    return NextResponse.json({ error: "Failed to reach O*NET" }, { status: 502 });
  }
}

/** Convert "Supply Chain Manager" → "supply_chain_manager" */
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}
