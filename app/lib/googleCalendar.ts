import { prisma } from "./prisma";

const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

async function getValidToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: { access_token: true, refresh_token: true, expires_at: true },
  });

  if (!account?.access_token) return null;

  // If token is still valid (expires_at is in seconds since epoch)
  const nowSec = Math.floor(Date.now() / 1000);
  if (account.expires_at && account.expires_at > nowSec + 60) {
    return account.access_token;
  }

  // Refresh the token
  if (!account.refresh_token) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: account.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();

    await prisma.account.updateMany({
      where: { userId, provider: "google" },
      data: {
        access_token: data.access_token,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      },
    });

    return data.access_token;
  } catch {
    return null;
  }
}

export type GCalEvent = {
  id: string;
  summary: string;
  start: string; // date or dateTime
  end: string;
  colorId?: string;
  htmlLink?: string;
};

export async function listUpcomingEvents(userId: string, days = 60): Promise<GCalEvent[]> {
  const token = await getValidToken(userId);
  if (!token) return [];

  const now = new Date();
  const future = new Date(now.getTime() + days * 86400000);

  const params = new URLSearchParams({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });

  const res = await fetch(`${CALENDAR_BASE}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];
  const data = await res.json();

  return (data.items ?? []).map((e: any) => ({
    id: e.id,
    summary: e.summary ?? "(No title)",
    start: e.start?.date ?? e.start?.dateTime?.slice(0, 10) ?? "",
    end: e.end?.date ?? e.end?.dateTime?.slice(0, 10) ?? "",
    colorId: e.colorId,
    htmlLink: e.htmlLink,
  }));
}

export async function createCalendarEvent(
  userId: string,
  summary: string,
  dateKey: string, // "2026-03-22"
  description?: string,
): Promise<{ id: string; htmlLink: string } | null> {
  const token = await getValidToken(userId);
  if (!token) return null;

  // Next day for all-day end date
  const endDate = new Date(dateKey + "T12:00:00");
  endDate.setDate(endDate.getDate() + 1);
  const endKey = endDate.toISOString().slice(0, 10);

  const res = await fetch(`${CALENDAR_BASE}/calendars/primary/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary,
      description: description ?? "Scheduled via Career Readiness checklist",
      start: { date: dateKey },
      end: { date: endKey },
      colorId: "2", // sage green
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return { id: data.id, htmlLink: data.htmlLink };
}

export async function deleteCalendarEvent(userId: string, eventId: string): Promise<boolean> {
  const token = await getValidToken(userId);
  if (!token) return false;

  const res = await fetch(`${CALENDAR_BASE}/calendars/primary/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.ok || res.status === 404;
}

export async function hasGoogleCalendarAccess(userId: string): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: { access_token: true, scope: true },
  });
  return !!(account?.access_token && account.scope?.includes("calendar"));
}
