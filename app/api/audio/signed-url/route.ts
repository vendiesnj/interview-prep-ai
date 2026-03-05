import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userId = (token as any)?.sub || (token as any)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  // Basic safety: ensure the user can only request their own files
  if (!path.startsWith(`${userId}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from("recordings")
    .createSignedUrl(path, 60 * 30); // 30 minutes

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Could not sign URL" }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl }, { status: 200 });
}