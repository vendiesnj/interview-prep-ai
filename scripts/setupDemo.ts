import path from "path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function run() {
  const { prisma } = await import("../app/lib/prisma");

  // 1. Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-college" },
    update: { themeKey: "demoCollege" },
    create: {
      name: "Riverside Community College",
      slug: "demo-college",
      themeKey: "demoCollege",
    },
  });
  console.log("Tenant:", tenant.id, `(${tenant.name})`);

  // 2. Create admin user
  const adminHash = await bcrypt.hash("DemoAdmin2025!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo-college.edu" },
    update: {},
    create: {
      email: "admin@demo-college.edu",
      name: "Career Center Admin",
      passwordHash: adminHash,
      tenantId: tenant.id,
      freeAttemptCap: 999,
    },
  });
  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: admin.id } },
    update: { role: "tenant_admin" },
    create: { tenantId: tenant.id, userId: admin.id, role: "tenant_admin", status: "active" },
  });
  console.log("Admin:", admin.email);

  // 3. Create demo students
  const students = [
    { name: "Maria Santos", email: "maria@demo-college.edu" },
    { name: "James Okafor", email: "james@demo-college.edu" },
    { name: "Priya Nair", email: "priya@demo-college.edu" },
    { name: "Derek Williams", email: "derek@demo-college.edu" },
    { name: "Ashley Chen", email: "ashley@demo-college.edu" },
  ];
  const studentHash = await bcrypt.hash("Student2025!", 12);
  for (const s of students) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        name: s.name,
        passwordHash: studentHash,
        tenantId: tenant.id,
        freeAttemptCap: 999,
      },
    });
    await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      update: {},
      create: { tenantId: tenant.id, userId: user.id, role: "student", status: "active" },
    });
    console.log("Student:", s.email);
  }

  await prisma.$disconnect();
  console.log("\nSetup complete. Run `npx tsx scripts/seedAttempts.ts` next.");
}

run().catch(async (e) => {
  console.error("Setup failed:", e);
  process.exit(1);
});
