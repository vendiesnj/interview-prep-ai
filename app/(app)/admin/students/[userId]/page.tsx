import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";
import {
  asOverall100,
  asTenPoint,
  displayOverall100,
  displayTenPointAs100,
  avgOverall100,
  avgTenPoint,
} from "@/app/lib/scoreScale";


function num(v: any): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function feedbackObj(a: any): any {
  return a?.feedback && typeof a.feedback === "object" ? a.feedback : null;
}

function prosodyObj(a: any): any {
  return a?.prosody && typeof a.prosody === "object" ? a.prosody : null;
}

function deliveryMetricsObj(a: any): any {
  return a?.deliveryMetrics && typeof a.deliveryMetrics === "object"
    ? a.deliveryMetrics
    : null;
}

function avg(values: number[]) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round1(value: number | null) {
  return value === null ? null : Math.round(value * 10) / 10;
}



function getAttemptComm(a: any) {
  const feedback = feedbackObj(a);
  return num(a.communicationScore ?? feedback?.communication_score);
}

function getAttemptConf(a: any) {
  const feedback = feedbackObj(a);
  return num(a.confidenceScore ?? feedback?.confidence_score);
}

function getAttemptFillers(a: any) {
  const feedback = feedbackObj(a);
  const deliveryMetrics = deliveryMetricsObj(a);

  return (
    num(feedback?.filler?.per100) ??
    num(deliveryMetrics?.fillersPer100) ??
    null
  );
}

function getAttemptMonotone(a: any) {
  const prosody = prosodyObj(a);
  const deliveryMetrics = deliveryMetricsObj(a);

  return (
    num(prosody?.monotoneScore) ??
    num(deliveryMetrics?.acoustics?.monotoneScore) ??
    null
  );
}

function getAttemptClosing(a: any) {
  const feedback = feedbackObj(a);
  return num(feedback?.star?.result);
}

function GlowCard({
  children,
  padding = 20,
  radius = 22,
}: {
  children: React.ReactNode;
  padding?: number;
  radius?: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: radius,
        padding: 1,
        background:
          "linear-gradient(135deg, var(--accent-strong), var(--accent-2), var(--accent))",
        boxShadow: "var(--shadow-glow)",
      }}
    >
      <div
        style={{
          borderRadius: radius - 1,
          padding,
          background:
            "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))",
          border: "1px solid var(--card-border-soft)",
          backdropFilter: "blur(8px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <GlowCard padding={18} radius={20}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 0.7,
          color: "var(--text-muted)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 30,
          fontWeight: 950,
          letterSpacing: -0.5,
          color: "var(--text-primary)",
          lineHeight: 1.08,
          marginBottom: 2,
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          color: "var(--text-muted)",
          lineHeight: 1.65,
          maxWidth: 220,
        }}
      >
        {subtext}
      </div>
    </GlowCard>
  );
}

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Not authorized</div>;
  }

  const { userId } = await params;

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      tenantId: true,
    },
  });

  if (!currentUser) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Not authorized</div>;
  }

  const student = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId: currentUser.tenantId ?? null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      tenantId: true,
    },
  });

  if (!student) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Student not found</div>;
  }

  const attempts = await prisma.attempt.findMany({
    where: {
      userId: student.id,
      tenantId: currentUser.tenantId ?? null,
      deletedAt: null,
    },
    select: {
      id: true,
      ts: true,
      question: true,
      questionCategory: true,
      score: true,
      communicationScore: true,
      confidenceScore: true,
      wpm: true,
      inputMethod: true,
      feedback: true,
      prosody: true,
      deliveryMetrics: true,
      jobProfileTitle: true,
      jobProfileCompany: true,
      jobProfileRoleType: true,
    },
    orderBy: {
      ts: "desc",
    },
  });
  const overallScores = attempts
    .map((a) => {
      const feedback = feedbackObj(a);
      return asOverall100(a.score ?? feedback?.score);
    })
    .filter((v): v is number => v !== null);

  const comms = attempts
    .map((a) => {
      const feedback = feedbackObj(a);
      return asTenPoint(a.communicationScore ?? feedback?.communication_score);
    })
    .filter((v): v is number => v !== null);

  const confs = attempts
    .map((a) => {
      const feedback = feedbackObj(a);
      return asTenPoint(a.confidenceScore ?? feedback?.confidence_score);
    })
    .filter((v): v is number => v !== null);

  const wpms = attempts
    .map((a) => num(a.wpm))
    .filter((v): v is number => v !== null);

  const fillers = attempts
    .map(getAttemptFillers)
    .filter((v): v is number => v !== null);

  const monotones = attempts
    .map(getAttemptMonotone)
    .filter((v): v is number => v !== null);

  const closings = attempts
    .map((a) => {
      const feedback = feedbackObj(a);
      return asTenPoint(feedback?.star?.result);
    })
    .filter((v): v is number => v !== null);

  const avgScore = avgOverall100(overallScores);
  const avgComm = avgTenPoint(comms);
  const avgConf = avgTenPoint(confs);
  const avgWpm = round1(avg(wpms));
  const avgFillers = round1(avg(fillers));
  const avgMonotone = round1(avg(monotones));
  const avgClosing = avgTenPoint(closings);

  const strongestRole =
    attempts.find((a) => a.jobProfileTitle)?.jobProfileTitle ?? "No role data yet";

  return (
    <PremiumShell
      title="Student Drilldown"
      subtitle="Review one student’s practice volume, interview quality, voice delivery, and recent role targeting."
    >
      <div style={{ marginTop: 8, display: "grid", gap: 18 }}>
        <div>
          <Link
            href="/admin"
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
              color: "var(--text-primary)",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            ← Back to Admin Dashboard
          </Link>
        </div>

        <GlowCard padding={24} radius={24}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 0.8,
              color: "var(--accent)",
              textTransform: "uppercase",
            }}
          >
            Student Profile
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 34,
              fontWeight: 950,
              letterSpacing: -0.8,
              color: "var(--text-primary)",
              lineHeight: 1.05,
            }}
          >
            {student.name || (student.email ? student.email.split("@")[0] : "Student")}
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.7,
            }}
          >
            {student.email}
          </div>
        </GlowCard>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          <StatCard
            label="Attempts"
            value={String(attempts.length)}
            subtext="Total interview attempts by this student."
          />
                    <StatCard
            label="Avg Score"
            value={displayOverall100(avgScore)}
            subtext="Average overall interview score."
          />
                    <StatCard
            label="Avg Communication"
            value={displayTenPointAs100(avgComm)}
            subtext="Average communication quality."
          />
                    <StatCard
            label="Avg Confidence"
            value={displayTenPointAs100(avgConf)}
            subtext="Average confidence signal."
          />
          <StatCard
            label="Avg WPM"
            value={avgWpm !== null ? String(Math.round(avgWpm)) : "—"}
            subtext="Average speaking pace."
          />
          <StatCard
            label="Top Role"
            value={strongestRole}
            subtext="Most visible target role in attempts."
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
          }}
        >
          <GlowCard padding={18} radius={22}>
            <div style={{ fontSize: 18, fontWeight: 950, color: "var(--text-primary)" }}>
              Voice Metrics
            </div>
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <div style={{ color: "var(--text-muted)" }}>
                Filler Rate:{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {avgFillers !== null ? `${avgFillers}/100` : "—"}
                </strong>
              </div>
              <div style={{ color: "var(--text-muted)" }}>
                Monotone Risk:{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {avgMonotone !== null ? `${avgMonotone}/10` : "—"}
                </strong>
              </div>
                            <div style={{ color: "var(--text-muted)" }}>
                Closing Impact:{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {displayTenPointAs100(avgClosing)}
                </strong>
              </div>
            </div>
          </GlowCard>

          <GlowCard padding={18} radius={22}>
            <div style={{ fontSize: 18, fontWeight: 950, color: "var(--text-primary)" }}>
              Student Summary
            </div>
            <div
              style={{
                marginTop: 14,
                color: "var(--text-muted)",
                fontSize: 13,
                lineHeight: 1.8,
              }}
            >
              This page lets school admins review one student's practice volume,
              score quality, voice delivery, and recent role targeting in more
              detail than the high-level dashboard.
            </div>
          </GlowCard>

          <GlowCard padding={18} radius={22}>
            <div style={{ fontSize: 18, fontWeight: 950, color: "var(--text-primary)" }}>
              Next Expansion
            </div>
            <div
              style={{
                marginTop: 14,
                color: "var(--text-muted)",
                fontSize: 13,
                lineHeight: 1.8,
              }}
            >
              Next we can add per-attempt drilldown, score trend charts, and a
              stronger role readiness summary for this student.
            </div>
          </GlowCard>
        </div>

        <GlowCard padding={18} radius={22}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 950,
              color: "var(--text-primary)",
            }}
          >
            Recent Attempts
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {attempts.length > 0 ? (
              attempts.slice(0, 12).map((attempt) => (
                <div
                  key={attempt.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 120px 120px 120px 140px",
                    gap: 12,
                    alignItems: "center",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid var(--card-border-soft)",
                    background: "var(--card-bg)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: "var(--text-primary)",
                      }}
                    >
                      {attempt.question || "Practice attempt"}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      {attempt.questionCategory || "other"} ·{" "}
                      {attempt.jobProfileTitle || "General Target Role"}
                    </div>
                  </div>

                                   <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 800 }}>
                    {displayOverall100(
  asOverall100(attempt.score ?? feedbackObj(attempt)?.score)
)}
                  </div>

                                   <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 800 }}>
                   {displayTenPointAs100(
  asTenPoint(
    attempt.communicationScore ?? feedbackObj(attempt)?.communication_score
  )
)}
                  </div>

                                   <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 800 }}>
                    {displayTenPointAs100(
  asTenPoint(
    attempt.confidenceScore ?? feedbackObj(attempt)?.confidence_score
  )
)}
                  </div>

                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 800 }}>
                    {attempt.ts ? new Date(attempt.ts).toLocaleDateString() : "—"}
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid var(--card-border-soft)",
                  background: "var(--card-bg)",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                No attempts available for this student yet.
              </div>
            )}
          </div>
        </GlowCard>
      </div>
    </PremiumShell>
  );
}