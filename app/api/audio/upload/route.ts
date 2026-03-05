import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = (token as any)?.sub || (token as any)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("audio");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    // Optional client can pass attemptId; if not, we’ll generate a filename with timestamp
    const attemptId = String(form.get("attemptId") || "");
    const ext = file.name?.split(".").pop() || "wav";
    const safeAttempt = attemptId || `attempt_${Date.now()}`;
    const path = `${userId}/${safeAttempt}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabaseAdmin.storage
      .from("recordings")
      .upload(path, buffer, {
        contentType: file.type || "audio/wav",
        upsert: true,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return the storage path your DB should store
    return NextResponse.json({ audioPath: path }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}