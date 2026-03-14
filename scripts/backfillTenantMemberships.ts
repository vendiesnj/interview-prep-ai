import "dotenv/config";
import { prisma } from "../app/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    where: {
      tenantId: { not: null },
    },
    select: {
      id: true,
      tenantId: true,
      email: true,
    },
  });

  console.log(`Found ${users.length} users with tenantId`);

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.tenantId) {
      skipped += 1;
      continue;
    }

    const existing = await prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: user.tenantId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.tenantMembership.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        role: "student",
        status: "active",
        isDefault: true,
      },
    });

    created += 1;
  }

  console.log({ created, skipped, total: users.length });
}

main()
  .catch((err) => {
    console.error("BACKFILL_TENANT_MEMBERSHIPS_FAILED", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });