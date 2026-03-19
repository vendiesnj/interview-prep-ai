import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from "bcryptjs";

// bcryptjs is required: ensure it is installed via `npm install bcryptjs`
// and `npm install --save-dev @types/bcryptjs`

export const runtime = "nodejs";

type EnrollRow = {
  name: string;
  email: string;
  cohort?: string; // optional, ignored for now
};

function parseCSV(text: string): EnrollRow[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return []; // need header + at least 1 row

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const nameIdx = headers.findIndex(
    (h) => h === "name" || h === "full name" || h === "student name"
  );
  const emailIdx = headers.findIndex(
    (h) => h === "email" || h === "email address"
  );

  if (nameIdx === -1 || emailIdx === -1) {
    throw new Error("CSV must have 'name' and 'email' columns");
  }

  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
      return {
        name: cols[nameIdx] ?? "",
        email: (cols[emailIdx] ?? "").toLowerCase(),
      };
    })
    .filter((r) => r.name && r.email && r.email.includes("@"));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve tenantId: prefer session claim, fall back to DB lookup
  let tenantId = (session!.user as any).tenantId as string | undefined;

  if (!tenantId) {
    const currentUser = await prisma.user.findUnique({
      where: { email: (session!.user as any).email ?? "" },
      select: { tenantId: true },
    });
    tenantId = currentUser?.tenantId ?? undefined;
  }

  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const defaultPassword =
    (formData.get("defaultPassword") as string) || "InterviewPrep2025!";

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();

  let rows: EnrollRow[];
  try {
    rows = parseCSV(text);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found in CSV" },
      { status: 400 }
    );
  }
  if (rows.length > 500) {
    return NextResponse.json(
      { error: "Maximum 500 students per upload" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const results = {
    created: 0,
    alreadyExists: 0,
    errors: [] as string[],
  };

  for (const row of rows) {
    try {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: row.email },
      });

      if (existing) {
        // Ensure they have an active membership in this tenant
        await prisma.tenantMembership.upsert({
          where: {
            tenantId_userId: { tenantId: tenantId!, userId: existing.id },
          },
          create: {
            tenantId: tenantId!,
            userId: existing.id,
            role: "student",
            status: "active",
          },
          update: { status: "active" },
        });
        results.alreadyExists++;
      } else {
        // Create new user
        const user = await prisma.user.create({
          data: {
            email: row.email,
            name: row.name,
            passwordHash,
            tenantId: tenantId!,
            freeAttemptCap: 999, // unlimited for enrolled students
          },
        });
        // Create membership
        await prisma.tenantMembership.create({
          data: {
            tenantId: tenantId!,
            userId: user.id,
            role: "student",
            status: "active",
          },
        });
        results.created++;
      }
    } catch (e: any) {
      results.errors.push(`${row.email}: ${e.message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    created: results.created,
    alreadyExists: results.alreadyExists,
    errors: results.errors.slice(0, 10), // limit error list
    total: rows.length,
  });
}
