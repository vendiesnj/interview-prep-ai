import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";
import RosterActions from "./RosterActions";

export default async function RosterPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Not authorized</div>;
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, tenantId: true },
  });

  if (!currentUser?.tenantId) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Not authorized</div>;
  }

  const membershipCheck = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: currentUser.tenantId, userId: currentUser.id } },
    select: { role: true },
  });

  const isAdmin = membershipCheck?.role === "tenant_admin" ||
    membershipCheck?.role === "career_coach" ||
    membershipCheck?.role === "super_admin";

  if (!isAdmin) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Not authorized</div>;
  }

  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId: currentUser.tenantId, role: "student" },
    include: {
      user: {
        select: { id: true, name: true, email: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Attempt counts per user
  const attemptCounts = await prisma.attempt.groupBy({
    by: ["userId"],
    where: {
      tenantId: currentUser.tenantId,
      deletedAt: null,
      userId: { in: memberships.map((m) => m.userId) },
    },
    _count: { id: true },
  });

  const countByUser = new Map(attemptCounts.map((a) => [a.userId, a._count.id]));

  const students = memberships.map((m) => ({
    userId: m.userId,
    name: m.user.name || (m.user.email ? m.user.email.split("@")[0] : "Student"),
    email: m.user.email,
    status: m.status,
    enrolledAt: m.createdAt,
    attempts: countByUser.get(m.userId) ?? 0,
  }));

  const activeCount = students.filter((s) => s.status === "active").length;
  const disabledCount = students.filter((s) => s.status === "disabled").length;
  const invitedCount = students.filter((s) => s.status === "invited").length;

  return (
    <PremiumShell
      title="Roster Management"
      subtitle="View enrolled students, manage access, and maintain your institutional roster."
    >
      <div style={{ display: "grid", gap: 16, maxWidth: 1000 }}>

        {/* Nav links */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/admin" style={{ textDecoration: "none" }}>
            <div style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
              fontSize: 12,
              fontWeight: 800,
              color: "var(--text-muted)",
            }}>
              ← Admin Dashboard
            </div>
          </Link>
          <Link href="/admin/compliance" style={{ textDecoration: "none" }}>
            <div style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid rgba(22,163,74,0.25)",
              background: "rgba(22,163,74,0.06)",
              fontSize: 12,
              fontWeight: 800,
              color: "#16A34A",
            }}>
              FERPA Compliance
            </div>
          </Link>
        </div>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Total enrolled", value: String(students.length), color: "var(--accent)" },
            { label: "Active", value: String(activeCount), color: "#10B981" },
            { label: "Invited", value: String(invitedCount), color: "#F59E0B" },
            { label: "Disabled", value: String(disabledCount), color: "var(--danger)" },
          ].map((item) => (
            <div key={item.label} style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Enrollment note */}
        <div style={{
          padding: "12px 16px",
          borderRadius: "var(--radius-lg)",
          background: "rgba(37,99,235,0.06)",
          border: "1px solid rgba(37,99,235,0.15)",
          fontSize: 13,
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}>
          To enroll new students, use the <Link href="/admin" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>CSV upload tool</Link> on the Admin Dashboard.
          Disabling a student prevents login while preserving their practice history.
        </div>

        {/* Student table */}
        <div style={{
          borderRadius: 18,
          border: "1px solid var(--card-border-soft)",
          background: "var(--card-bg)",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.8fr 1.2fr 80px 90px 120px 100px",
            gap: 12,
            padding: "12px 18px",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 0.6,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            borderBottom: "1px solid var(--card-border-soft)",
          }}>
            <div>Student</div>
            <div>Email</div>
            <div>Sessions</div>
            <div>Status</div>
            <div>Enrolled</div>
            <div>Actions</div>
          </div>

          {/* Rows */}
          {students.length === 0 ? (
            <div style={{ padding: "32px 18px", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
              No students enrolled yet. Upload a CSV from the Admin Dashboard to get started.
            </div>
          ) : (
            <div>
              {students.map((student, i) => (
                <div key={student.userId} style={{
                  display: "grid",
                  gridTemplateColumns: "1.8fr 1.2fr 80px 90px 120px 100px",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 18px",
                  borderBottom: i < students.length - 1 ? "1px solid var(--card-border-soft)" : "none",
                  background: student.status === "disabled" ? "rgba(220,38,38,0.03)" : "transparent",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: student.status === "disabled"
                        ? "rgba(220,38,38,0.10)"
                        : "rgba(37,99,235,0.10)",
                      color: student.status === "disabled" ? "var(--danger)" : "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 900,
                      flexShrink: 0,
                    }}>
                      {(student.name || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <Link href={`/admin/students/${student.userId}`} style={{ textDecoration: "none" }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 900,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {student.name}
                        </div>
                      </Link>
                    </div>
                  </div>

                  <div style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {student.email ?? " - "}
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                    {student.attempts}
                  </div>

                  <div>
                    <span style={{
                      display: "inline-block",
                      padding: "3px 9px",
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 900,
                      background: student.status === "active"
                        ? "rgba(22,163,74,0.10)"
                        : student.status === "invited"
                        ? "rgba(245,158,11,0.10)"
                        : "rgba(220,38,38,0.10)",
                      color: student.status === "active" ? "#16A34A"
                        : student.status === "invited" ? "#D97706"
                        : "var(--danger)",
                    }}>
                      {student.status === "active" ? "Active"
                        : student.status === "invited" ? "Invited"
                        : "Disabled"}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {new Date(student.enrolledAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>

                  <RosterActions
                    userId={student.userId}
                    currentStatus={student.status}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
          Disabling a student prevents them from logging in but preserves all practice history for reporting.
          To permanently delete a student&apos;s data, submit a request via your account manager in accordance with your institution&apos;s{" "}
          <Link href="/admin/compliance" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 700 }}>FERPA obligations</Link>.
        </div>

      </div>
    </PremiumShell>
  );
}
