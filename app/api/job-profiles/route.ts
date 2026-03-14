import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireUser } from "@/app/lib/authServer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);

if (!auth.tenantId) {
  return NextResponse.json(
    { ok: false, error: "NO_TENANT" },
    { status: 400 }
  );
}

const profiles = await prisma.jobProfile.findMany({
  where: {
    userId: auth.userId,
    tenantId: auth.tenantId,
    deletedAt: null,
    isArchived: false,
  },
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        company: true,
        roleType: true,
        jobDescription: true,
        competencyWeights: true,
        targetTraits: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      profiles,
    });
  } catch (err: any) {
    const message = err?.message ?? "UNKNOWN_ERROR";
    const status = message === "UNAUTHORIZED" ? 401 : 500;

    return NextResponse.json(
      { ok: false, error: message },
      { status }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);

    if (!auth.tenantId) {
      return NextResponse.json(
        { ok: false, error: "NO_TENANT" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const title =
      typeof body?.title === "string" ? body.title.trim() : "";
    const company =
      typeof body?.company === "string" ? body.company.trim() : "";
    const roleType =
      typeof body?.roleType === "string" ? body.roleType.trim() : "";
    const jobDescription =
      typeof body?.jobDescription === "string" ? body.jobDescription.trim() : "";

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "TITLE_REQUIRED" },
        { status: 400 }
      );
    }

    if (!jobDescription) {
      return NextResponse.json(
        { ok: false, error: "JOB_DESCRIPTION_REQUIRED" },
        { status: 400 }
      );
    }

    const profile = await prisma.jobProfile.create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId,
        title,
        company: company || null,
        roleType: roleType || null,
        jobDescription,
      },
      select: {
        id: true,
        title: true,
        company: true,
        roleType: true,
        jobDescription: true,
        competencyWeights: true,
        targetTraits: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      profile,
    });
  } catch (err: any) {
    const message = err?.message ?? "UNKNOWN_ERROR";
    const status = message === "UNAUTHORIZED" ? 401 : 500;

    return NextResponse.json(
      { ok: false, error: message },
      { status }
    );
  }
}
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireUser(req);

    if (!auth.tenantId) {
      return NextResponse.json(
        { ok: false, error: "NO_TENANT" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "ID_REQUIRED" },
        { status: 400 }
      );
    }

    const existing = await prisma.jobProfile.findFirst({
      where: {
        id,
        userId: auth.userId,
        tenantId: auth.tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    await prisma.jobProfile.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isArchived: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const message = err?.message ?? "UNKNOWN_ERROR";
    const status = message === "UNAUTHORIZED" ? 401 : 500;

    return NextResponse.json(
      { ok: false, error: message },
      { status }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireUser(req);

    if (!auth.tenantId) {
      return NextResponse.json(
        { ok: false, error: "NO_TENANT" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const company = typeof body?.company === "string" ? body.company.trim() : "";
    const roleType = typeof body?.roleType === "string" ? body.roleType.trim() : "";
    const jobDescription =
      typeof body?.jobDescription === "string" ? body.jobDescription.trim() : "";

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "ID_REQUIRED" },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "TITLE_REQUIRED" },
        { status: 400 }
      );
    }

    if (!jobDescription) {
      return NextResponse.json(
        { ok: false, error: "JOB_DESCRIPTION_REQUIRED" },
        { status: 400 }
      );
    }

    const existing = await prisma.jobProfile.findFirst({
      where: {
        id,
        userId: auth.userId,
        tenantId: auth.tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const profile = await prisma.jobProfile.update({
      where: { id },
      data: {
        title,
        company: company || null,
        roleType: roleType || null,
        jobDescription,
      },
      select: {
        id: true,
        title: true,
        company: true,
        roleType: true,
        jobDescription: true,
        competencyWeights: true,
        targetTraits: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      profile,
    });
  } catch (err: any) {
    const message = err?.message ?? "UNKNOWN_ERROR";
    const status = message === "UNAUTHORIZED" ? 401 : 500;

    return NextResponse.json(
      { ok: false, error: message },
      { status }
    );
  }
}