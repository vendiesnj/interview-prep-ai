import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: "var(--radius-xl)",
      border: "1px solid var(--card-border-soft)",
      background: "var(--card-bg)",
      padding: "20px 22px",
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75 }}>
        {children}
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 700,
      background: color + "18",
      color,
      marginLeft: 8,
    }}>
      {label}
    </span>
  );
}

export default async function FerpaCompliancePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Not authorized</div>;
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, tenantId: true, name: true, email: true },
  });

  if (!currentUser) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Not authorized</div>;
  }

  const membershipCheck = currentUser.tenantId
    ? await prisma.tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId: currentUser.tenantId, userId: currentUser.id } },
        select: { role: true },
      })
    : null;

  const isAdmin = membershipCheck?.role === "tenant_admin" ||
    membershipCheck?.role === "career_coach" ||
    membershipCheck?.role === "super_admin";

  if (!isAdmin) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Not authorized</div>;
  }

  const studentCount = currentUser.tenantId
    ? await prisma.tenantMembership.count({
        where: { tenantId: currentUser.tenantId, role: "student", status: "active" },
      })
    : 0;

  const attemptCount = currentUser.tenantId
    ? await prisma.attempt.count({
        where: { tenantId: currentUser.tenantId, deletedAt: null },
      })
    : 0;

  const auditLogs = await prisma.auditLog.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, action: true, createdAt: true, meta: true },
  });

  return (
    <PremiumShell
      title="FERPA Compliance"
      subtitle="Data privacy, student rights, and access controls for your institution."
    >
      <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>

        {/* Status bar */}
        <div style={{
          padding: "14px 20px",
          borderRadius: 14,
          background: "rgba(22,163,74,0.07)",
          border: "1px solid rgba(22,163,74,0.20)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{ fontSize: 18 }}>✓</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>FERPA Compliant</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Student data is isolated by institution, access-controlled by role, and never shared across tenants.
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Active students", value: String(studentCount), sub: "in your institution" },
            { label: "Practice records", value: String(attemptCount), sub: "interview attempts stored" },
            { label: "Retention period", value: "2 years", sub: "then auto-deleted" },
          ].map((item) => (
            <div key={item.label} style={{
              padding: "16px 18px",
              borderRadius: 14,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{item.value}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginTop: 2 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Data collected */}
        <Section title="What data is collected">
          <div style={{ display: "grid", gap: 8 }}>
            {[
              { field: "Name & email", source: "Enrollment CSV or self-signup", sensitivity: "PII", color: "#F59E0B" },
              { field: "Practice transcripts", source: "Interview session recordings (text only)", sensitivity: "Educational record", color: "#2563EB" },
              { field: "Interview scores", source: "AI-generated feedback (0-100 scale)", sensitivity: "Educational record", color: "#2563EB" },
              { field: "Voice delivery metrics", source: "WPM, filler rate, monotone score from spoken attempts", sensitivity: "Educational record", color: "#2563EB" },
              { field: "Job profile data", source: "Job descriptions saved by students", sensitivity: "Non-PII", color: "#10B981" },
              { field: "Career check-in", source: "Self-reported employment, salary, satisfaction", sensitivity: "Sensitive PII", color: "#EF4444" },
              { field: "Login & session data", source: "NextAuth sessions, last active timestamps", sensitivity: "System data", color: "#8B5CF6" },
            ].map((item) => (
              <div key={item.field} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--card-border-soft)",
                background: "var(--card-bg)",
                gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{item.field}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{item.source}</div>
                </div>
                <Badge label={item.sensitivity} color={item.color} />
              </div>
            ))}
          </div>
        </Section>

        {/* Access controls */}
        <Section title="Access controls">
          <div style={{ display: "grid", gap: 8 }}>
            {[
              { role: "Student", access: "Can view and delete only their own data. Cannot see other students.", color: "#10B981" },
              { role: "Career Coach", access: "Can view aggregated data for students in their tenant only.", color: "#2563EB" },
              { role: "Tenant Admin", access: "Can view all student data within their institution. Cannot access other institutions.", color: "#8B5CF6" },
              { role: "Super Admin", access: "Internal system access only. Governed by Anthropic and internal SOC 2 controls.", color: "#F59E0B" },
            ].map((item) => (
              <div key={item.role} style={{
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--card-border-soft)",
                background: "var(--card-bg)",
              }}>
                <Badge label={item.role} color={item.color} />
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{item.access}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Student rights */}
        <Section title="Student rights under FERPA">
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
            <li><strong style={{ color: "var(--text-primary)" }}>Right to inspect:</strong> Students can view all of their own educational records within the platform via the History and Progress pages.</li>
            <li><strong style={{ color: "var(--text-primary)" }}>Right to request amendment:</strong> Students can contact your institution to request corrections to inaccurate records.</li>
            <li><strong style={{ color: "var(--text-primary)" }}>Right to restrict disclosure:</strong> Student data is never shared outside your institution without explicit consent. No third-party data selling.</li>
            <li><strong style={{ color: "var(--text-primary)" }}>Right to deletion:</strong> Students can delete individual sessions from their History page. Admins can process full deletion requests via the Roster page.</li>
            <li><strong style={{ color: "var(--text-primary)" }}>Right to file a complaint:</strong> Students may file complaints with the U.S. Department of Education&apos;s Family Policy Compliance Office.</li>
          </ul>
        </Section>

        {/* Data retention */}
        <Section title="Data retention & deletion">
          <div style={{ display: "grid", gap: 10 }}>
            <div>Practice transcripts and scores are retained for <strong style={{ color: "var(--text-primary)" }}>2 years</strong> from the date of creation, then permanently deleted.</div>
            <div>Career check-in data is retained for <strong style={{ color: "var(--text-primary)" }}>5 years</strong> (used for longitudinal outcomes reporting).</div>
            <div>If a student account is deleted, all associated practice records, scores, and check-ins are permanently deleted within <strong style={{ color: "var(--text-primary)" }}>30 days</strong>.</div>
            <div style={{ marginTop: 6 }}>
              To process a student data deletion request, navigate to{" "}
              <Link href="/admin/roster" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
                Roster Management
              </Link>{" "}
              and use the disable or remove action on the student&apos;s record, then submit a deletion request via your account manager.
            </div>
          </div>
        </Section>

        {/* Third-party processors */}
        <Section title="Third-party data processors">
          <div style={{ display: "grid", gap: 8 }}>
            {[
              { name: "Anthropic (Claude API)", purpose: "AI-powered interview feedback generation", dpa: true },
              { name: "Vercel", purpose: "Application hosting and CDN", dpa: true },
              { name: "Neon / PostgreSQL", purpose: "Primary database storage", dpa: true },
              { name: "Stripe", purpose: "Billing and payment processing (no student PII shared)", dpa: true },
            ].map((item) => (
              <div key={item.name} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--card-border-soft)",
                background: "var(--card-bg)",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{item.purpose}</div>
                </div>
                {item.dpa && <Badge label="DPA signed" color="#10B981" />}
              </div>
            ))}
          </div>
        </Section>

        {/* Recent admin access log */}
        <Section title="Your recent access log">
          {auditLogs.length === 0 ? (
            <div>No audit log entries yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {auditLogs.map((log) => (
                <div key={log.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--card-border-soft)",
                  background: "var(--card-bg)",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{log.action}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7, paddingTop: 4 }}>
          This page reflects current platform data practices. For a Data Processing Agreement (DPA), Business Associate Agreement (BAA), or institution-specific compliance documentation, contact your account manager.
          Last updated: March 2026.
        </div>

      </div>
    </PremiumShell>
  );
}
