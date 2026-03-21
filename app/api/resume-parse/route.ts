import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = file.name?.toLowerCase() ?? "";

    if (file.type === "application/pdf" || filename.endsWith(".pdf")) {
      // pdf-parse may ship as CJS or ESM depending on bundler; handle both shapes
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParseModule = await import("pdf-parse");
      const pdfParse =
        typeof (pdfParseModule as any).default === "function"
          ? (pdfParseModule as any).default
          : (pdfParseModule as any);
      const data = await pdfParse(buffer);
      return NextResponse.json({ text: data.text });
    }

    if (filename.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return NextResponse.json({ text: result.value });
    }

    if (filename.endsWith(".txt") || file.type === "text/plain") {
      return NextResponse.json({ text: buffer.toString("utf-8") });
    }

    return NextResponse.json(
      { error: "Unsupported file type. Please upload a PDF, DOCX, or TXT file." },
      { status: 400 }
    );
  } catch (e: any) {
    console.error("[resume-parse] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to parse file." },
      { status: 500 }
    );
  }
}
