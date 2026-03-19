import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function run() {
  const { prisma } = await import("../app/lib/prisma");

  const tenant = await prisma.tenant.findUnique({ where: { slug: "demo-college" } });
  if (!tenant) { console.error("Demo tenant not found!"); process.exit(1); }

  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id },
    select: { name: true, email: true },
  });

  const attempts = await prisma.attempt.groupBy({
    by: ["userId"],
    where: { tenantId: tenant.id },
    _count: { id: true },
    _min: { score: true },
    _max: { score: true },
  });

  const roles = await prisma.attempt.findMany({
    where: { tenantId: tenant.id },
    select: { jobProfileTitle: true, jobProfileCompany: true },
    distinct: ["jobProfileTitle"],
  });

  console.log(`\nTenant: ${tenant.name} (${tenant.id})`);
  console.log(`\nUsers (${users.length}):`);
  for (const u of users) console.log(`  - ${u.name} <${u.email}>`);
  console.log(`\nAttempt counts per user:`);
  for (const a of attempts) console.log(`  userId ${a.userId}: ${a._count.id} attempts, score ${a._min.score}–${a._max.score}`);
  console.log(`\nRoles in seed data:`);
  for (const r of roles) console.log(`  - ${r.jobProfileTitle} @ ${r.jobProfileCompany}`);

  await prisma.$disconnect();
}

run().catch(console.error);
