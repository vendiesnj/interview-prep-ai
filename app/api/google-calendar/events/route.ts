import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import {
  listUpcomingEvents,
  createCalendarEvent,
  hasGoogleCalendarAccess,
} from "@/app/lib/googleCalendar";

async function getUser(email: string) {
  return prisma.user.findUnique({ where: { email }, select: { id: true } });
}

// GET /api/google-calendar/events - fetch upcoming events
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUser(session.user.email);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const connected = await hasGoogleCalendarAccess(user.id);
  if (!connected) return NextResponse.json({ connected: false, events: [] });

  const events = await listUpcomingEvents(user.id, 90);
  return NextResponse.json({ connected: true, events });
}

// POST /api/google-calendar/events - create an event
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUser(session.user.email);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { summary, dateKey, description } = await req.json();
  if (!summary || !dateKey) return NextResponse.json({ error: "summary and dateKey required" }, { status: 400 });

  const result = await createCalendarEvent(user.id, summary, dateKey, description);
  if (!result) return NextResponse.json({ error: "Failed to create event - calendar not connected" }, { status: 400 });

  return NextResponse.json(result);
}
