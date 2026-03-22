import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

function formatIcsDate(dateKey: string): string {
  // dateKey = "2026-03-22"  →  "20260322"
  return dateKey.replace(/-/g, "");
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// GET /api/checklist/ics?stage=pre_college  — returns .ics file with all scheduled items
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return new NextResponse("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return new NextResponse("Not found", { status: 404 });

  const stage = req.nextUrl.searchParams.get("stage");

  const where: any = { userId: user.id, scheduledDate: { not: null } };
  if (stage) where.stage = stage;

  const scheduled = await prisma.checklistProgress.findMany({ where });

  if (scheduled.length === 0) {
    return new NextResponse("No scheduled items", { status: 404 });
  }

  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z/, "Z");

  const events = scheduled.map((item) => {
    const dateKey = item.scheduledDate!.toISOString().slice(0, 10);
    const start = formatIcsDate(dateKey);
    // All-day event: DTEND is the next day
    const endDate = new Date(dateKey + "T12:00:00");
    endDate.setDate(endDate.getDate() + 1);
    const end = formatIcsDate(endDate.toISOString().slice(0, 10));

    const stageLabel = item.stage === "pre_college" ? "Pre-College"
      : item.stage === "during_college" ? "During College"
      : "Post-College";

    return [
      "BEGIN:VEVENT",
      `UID:${item.id}@careerreadiness`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${escapeIcs(item.itemId.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()))}`,
      `DESCRIPTION:${escapeIcs(`Career Readiness checklist — ${stageLabel}`)}`,
      `CATEGORIES:${escapeIcs(stageLabel)}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Career Readiness//Checklist//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Career Readiness Checklist",
    "X-WR-TIMEZONE:America/New_York",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="career-checklist.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
