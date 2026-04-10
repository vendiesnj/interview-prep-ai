import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/app/lib/authServer";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const row = await prisma.lifeBuddyData.findUnique({ where: { userId } });
    if (!row) return NextResponse.json({ exists: false });
    return NextResponse.json({
      exists: true,
      calendarEvents:  row.calendarEvents,
      budgetLines:     row.budgetLines,
      budgetIncome:    row.budgetIncome,
      oneTimeExpenses: row.oneTimeExpenses,
      retireState:     row.retireState,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const body = await req.json();

    await prisma.lifeBuddyData.upsert({
      where:  { userId },
      create: { userId, ...sanitize(body) },
      update: sanitize(body),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

function sanitize(body: any) {
  return {
    ...(body.calendarEvents  !== undefined && { calendarEvents:  body.calendarEvents  }),
    ...(body.budgetLines     !== undefined && { budgetLines:     body.budgetLines     }),
    ...(body.budgetIncome    !== undefined && { budgetIncome:    Number(body.budgetIncome) }),
    ...(body.oneTimeExpenses !== undefined && { oneTimeExpenses: body.oneTimeExpenses }),
    ...(body.retireState     !== undefined && { retireState:     body.retireState     }),
  };
}
