import "dotenv/config";
import { prisma } from "../app/lib/prisma";
import crypto from "crypto";

function normalize(value: string | null | undefined) {
  return (value ?? "").trim();
}

function makeFallbackProfileId(input: {
  userId: string;
  tenantId: string;
  title: string;
  company: string;
  roleType: string;
}) {
  const raw = `${input.tenantId}::${input.userId}::${input.title}::${input.company}::${input.roleType}`;
  const hash = crypto.createHash("sha1").update(raw).digest("hex").slice(0, 20);
  return `profile_${hash}`;
}

async function main() {
  const attempts = await prisma.attempt.findMany({
    where: {
      deletedAt: null,
      tenantId: { not: null },
      OR: [
        { jobProfileId: { not: null } },
        { jobProfileTitle: { not: null } },
        { jobProfileCompany: { not: null } },
        { jobProfileRoleType: { not: null } },
      ],
    },
    select: {
      id: true,
      userId: true,
      tenantId: true,
      jobProfileId: true,
      jobProfileTitle: true,
      jobProfileCompany: true,
      jobProfileRoleType: true,
      jobDesc: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${attempts.length} attempts with profile metadata`);

  const groups = new Map<
    string,
    {
      tenantId: string;
      userId: string;
      profileId: string;
      title: string;
      company: string;
      roleType: string;
      jobDescription: string;
    }
  >();

  for (const attempt of attempts) {
    if (!attempt.tenantId) continue;

    const title = normalize(attempt.jobProfileTitle);
    const company = normalize(attempt.jobProfileCompany);
    const roleType = normalize(attempt.jobProfileRoleType);
    const jobDescription = normalize(attempt.jobDesc);

    if (!title && !company && !roleType) continue;

    const profileId =
      normalize(attempt.jobProfileId) ||
      makeFallbackProfileId({
        tenantId: attempt.tenantId,
        userId: attempt.userId,
        title,
        company,
        roleType,
      });

    const key = `${attempt.tenantId}::${attempt.userId}::${profileId}`;

    if (!groups.has(key)) {
      groups.set(key, {
        tenantId: attempt.tenantId,
        userId: attempt.userId,
        profileId,
        title: title || "Untitled Profile",
        company: company || "",
        roleType: roleType || "",
        jobDescription:
          jobDescription && jobDescription !== "SEEDED_DEMO_DATA"
            ? jobDescription
            : "Imported from existing attempt history.",
      });
    }
  }

  console.log(`Prepared ${groups.size} distinct job profiles`);

  let createdProfiles = 0;
  let skippedProfiles = 0;

  for (const group of groups.values()) {
    const existing = await prisma.jobProfile.findUnique({
      where: { id: group.profileId },
    });

    if (existing) {
      skippedProfiles += 1;
      continue;
    }

    await prisma.jobProfile.create({
      data: {
        id: group.profileId,
        tenantId: group.tenantId,
        userId: group.userId,
        title: group.title,
        company: group.company || null,
        roleType: group.roleType || null,
        jobDescription: group.jobDescription,
      },
    });

    createdProfiles += 1;
  }

  console.log({
    createdProfiles,
    skippedProfiles,
    totalGroups: groups.size,
  });
}

main()
  .catch((err) => {
    console.error("BACKFILL_JOB_PROFILES_FAILED", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });