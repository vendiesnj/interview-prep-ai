import path from "path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function run() {
  const { prisma } = await import("../app/lib/prisma");

  // 1. Create Roosevelt tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "roosevelt" },
    update: { themeKey: "roosevelt", name: "Roosevelt University" },
    create: {
      name: "Roosevelt University",
      slug: "roosevelt",
      themeKey: "roosevelt",
      emailDomains: ["roosevelt.edu"],
    },
  });
  console.log("Tenant:", tenant.id, `(${tenant.name})`);

  // 2. Create admin — career center director
  const adminHash = await bcrypt.hash("RooseveltAdmin2026!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "careers@roosevelt.edu" },
    update: {},
    create: {
      email: "careers@roosevelt.edu",
      name: "Career Center Director",
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

  // 3. Demo students — diverse Chicago-relevant roster
  const students = [
    // Post-grad, placed at Northern Trust → compelling success story
    { name: "Marcus Johnson",  email: "marcus@roosevelt.edu",  demoPersona: "post_college_placed" },
    // Senior, actively interviewing at Deloitte/Accenture — strong communicator
    { name: "Aaliyah Washington", email: "aaliyah@roosevelt.edu", demoPersona: "senior_consulting" },
    // Junior, CS, targeting Motorola Solutions / Outcome Health — improving fast
    { name: "Diego Reyes",    email: "diego@roosevelt.edu",    demoPersona: "junior_cs" },
    // Senior, Psychology → HR at Hyatt — plateau, needs coaching
    { name: "Sophie Park",    email: "sophie@roosevelt.edu",   demoPersona: "plateau_hr" },
    // Sophomore, first-gen, early stage — lots of room to grow
    { name: "Jordan Taylor",  email: "jordan@roosevelt.edu",   demoPersona: "early_first_gen" },
  ];

  const studentHash = await bcrypt.hash("Student2026!", 12);
  for (const s of students) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { passwordHash: studentHash, tenantId: tenant.id, demoPersona: s.demoPersona },
      create: {
        email: s.email,
        name: s.name,
        passwordHash: studentHash,
        tenantId: tenant.id,
        freeAttemptCap: 999,
        demoPersona: s.demoPersona,
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
  console.log("\nRoosevelt setup complete.");
  console.log("Admin login:   careers@roosevelt.edu / RooseveltAdmin2026!");
  console.log("Student login: marcus@roosevelt.edu  / Student2026!");
  console.log("\nNext: npx tsx scripts/seedRoosevelt.ts");
}

run().catch(async (e) => {
  console.error("Setup failed:", e);
  process.exit(1);
});
