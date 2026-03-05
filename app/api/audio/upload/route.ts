import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    console.log("[api/audio/upload] hit");
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = (token as any)?.sub || (token as any)?.id;
    console.log("[api/audio/upload] userId:", userId ? "yes" : "no");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("audio");
    console.log("[api/audio/upload] has file:", file instanceof File);

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

        const supabaseAdmin = getSupabaseAdmin();
        console.log("[api/audio/upload] supabaseAdmin:", supabaseAdmin ? "ok" : "missing");

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server misconfigured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing" },
        { status: 500 }
      );
    }

    const { error } = await supabaseAdmin.storage
      .from("recordings")
      .upload(path, buffer, {
        contentType: file.type || "audio/wav",
        upsert: true,
      });

    if (error) {
      console.log("[api/audio/upload] storage error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.log("[api/audio/upload] success path:", path);
    // Return the storage path your DB should store
        return NextResponse.json({ audioPath: path, path }, { status: 200 });
  } catch (e: any) {
    console.log("[api/audio/upload] exception:", e?.message ?? e);
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}