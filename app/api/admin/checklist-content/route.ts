import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

function isAdmin(session: any) {
  return (
    session?.user &&
    ["tenant_admin", "super_admin"].includes((session.user as any).tenantRole)
  );
}

// GET /api/admin/checklist-content?stage=during_college
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = (session!.user as any).tenantId;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const stage = req.nextUrl.searchParams.get("stage") ?? undefined;
  const items = await prisma.checklistItemContent.findMany({
    where: { tenantId, ...(stage ? { stage } : {}) },
  });
  return NextResponse.json(items);
}

// PUT /api/admin/checklist-content  { stage, itemId, body, linkHref?, linkLabel? }
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = (session!.user as any).tenantId;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const { stage, itemId, body, linkHref, linkLabel } = await req.json();
  if (!stage || !itemId || !body)
    return NextResponse.json({ error: "stage, itemId, body required" }, { status: 400 });

  const item = await prisma.checklistItemContent.upsert({
    where: { tenantId_stage_itemId: { tenantId, stage, itemId } },
    create: { tenantId, stage, itemId, body, linkHref: linkHref || null, linkLabel: linkLabel || null },
    update: { body, linkHref: linkHref || null, linkLabel: linkLabel || null },
  });

  return NextResponse.json(item);
}
