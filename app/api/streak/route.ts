import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// GET /api/streak
// Returns: { current: number, longest: number, lastActiveDate: string | null, activeDays: string[] }
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Gather all activity timestamps from all three tables
  const [attempts, instinctSessions, checklistItems] = await Promise.all([
    prisma.attempt.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { ts: true },
      orderBy: { ts: "desc" },
    }),
    prisma.instinctSession.findMany({
      where: { userId: user.id },
      select: { createdAt: true },
    }),
    prisma.checklistProgress.findMany({
      where: { userId: user.id, done: true },
      select: { updatedAt: true },
    }),
  ]);

  // Collect all active day keys
  const daySet = new Set<string>();
  for (const a of attempts) daySet.add(toDateKey(new Date(a.ts)));
  for (const s of instinctSessions) daySet.add(toDateKey(new Date(s.createdAt)));
  for (const c of checklistItems) daySet.add(toDateKey(new Date(c.updatedAt)));

  const activeDays = Array.from(daySet).sort();

  if (activeDays.length === 0) {
    return NextResponse.json({ current: 0, longest: 0, lastActiveDate: null, activeDays: [] });
  }

  // Compute current streak (consecutive days ending today or yesterday)
  const todayKey = toDateKey(new Date());
  const yesterdayKey = toDateKey(new Date(Date.now() - 86400000));

  let current = 0;
  const sortedDesc = [...activeDays].reverse();
  const mostRecent = sortedDesc[0];

  if (mostRecent === todayKey || mostRecent === yesterdayKey) {
    // Walk backwards counting consecutive days
    let cursor = new Date(mostRecent + "T12:00:00");
    for (let i = 0; i < sortedDesc.length; i++) {
      const expected = toDateKey(cursor);
      if (sortedDesc[i] === expected) {
        current++;
        cursor = new Date(cursor.getTime() - 86400000);
      } else {
        break;
      }
    }
  }

  // Compute longest streak
  let longest = 0;
  let run = 1;
  for (let i = 1; i < activeDays.length; i++) {
    const prev = new Date(activeDays[i - 1] + "T12:00:00");
    const curr = new Date(activeDays[i] + "T12:00:00");
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }
  if (run > longest) longest = run;
  if (longest === 0 && activeDays.length > 0) longest = 1;

  return NextResponse.json({
    current,
    longest,
    lastActiveDate: mostRecent,
    activeDays,
    totalActiveDays: activeDays.length,
  });
}
