import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { ReactNode } from "react";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";
import CreateAssignmentForm from "@/app/components/CreateAssignmentForm";
import { BulkEnrollForm } from "@/app/components/BulkEnrollForm";

import {
  asOverall100,
  asTenPoint,
  avgOverall100,
  avgTenPoint,
  displayOverall100,
  displayTenPointAs100,
} from "@/app/lib/scoreScale";


type AttemptRow = {
  id: string;
  userId: string;
  tenantId: string | null;
  ts: Date;
  score: number | null;
  communicationScore: number | null;
  confidenceScore: number | null;
  questionCategory: string | null;
  question: string | null;
  jobProfileId: string | null;
  jobProfileTitle: string | null;
  jobProfileCompany: string | null;
  jobProfileRoleType: string | null;
  inputMethod: string | null;
  wpm: number | null;
  feedback: any | null;
  prosody: any | null;
  deliveryMetrics: any | null;
};



type RoleFamily =
  | "finance"
  | "operations"
  | "research"
  | "consulting"
  | "general";

  type CohortFilter = "all" | "high" | "mid" | "low";

function getCohortFromScore(score: number | null): CohortFilter {
  if (score === null) return "low";
  if (score >= 80) return "high";
  if (score >= 60) return "mid";
  return "low";
}

function num(v: any): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function avg(values: number[]) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round1(value: number | null) {
  return value === null ? null : Math.round(value * 10) / 10;
}

function pctFrom10(value: number | null) {
  if (value === null) return null;
  return Math.round(value * 10);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}


function safeLabel(value: string | null | undefined, fallback: string) {
  if (!value || !value.trim()) return fallback;
  return value;
}

function titleCaseLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferRoleFamily(input: {
  label?: string | null;
  roleType?: string | null;
}): RoleFamily {
  const text = `${input.label ?? ""} ${input.roleType ?? ""}`.toLowerCase();

  if (
    text.includes("finance") ||
    text.includes("financial") ||
    text.includes("fp&a") ||
    text.includes("accounting") ||
    text.includes("investment")
  ) {
    return "finance";
  }

  if (
    text.includes("operations") ||
    text.includes("supply chain") ||
    text.includes("logistics") ||
    text.includes("procurement") ||
    text.includes("planning")
  ) {
    return "operations";
  }

  if (
    text.includes("research") ||
    text.includes("science") ||
    text.includes("laboratory") ||
    text.includes("associate")
  ) {
    return "research";
  }

  if (text.includes("consulting") || text.includes("strategy")) {
    return "consulting";
  }

  return "general";
}

function normalizePaceScore(wpm: number | null) {
  if (wpm === null) return null;
  if (wpm < 100) return 5.8;
  if (wpm <= 145) return 8.4;
  if (wpm <= 165) return 7.1;
  return 5.9;
}

function normalizeFillerScore(fillers: number | null) {
  if (fillers === null) return null;
  if (fillers <= 1.5) return 8.5;
  if (fillers < 3) return 7.2;
  if (fillers < 4.5) return 6.1;
  return 5.2;
}

function normalizeMonotoneScore(monotone: number | null) {
  if (monotone === null) return null;
  if (monotone <= 4) return 8.2;
  if (monotone <= 6) return 7.0;
  return 5.8;
}

function getRoleWeights(roleFamily: RoleFamily) {
  switch (roleFamily) {
    case "finance":
      return {
        communication: 0.26,
        confidence: 0.18,
        closingImpact: 0.24,
        paceControl: 0.12,
        polish: 0.10,
        vocalDelivery: 0.10,
      };
    case "operations":
      return {
        communication: 0.22,
        confidence: 0.20,
        closingImpact: 0.18,
        paceControl: 0.15,
        polish: 0.10,
        vocalDelivery: 0.15,
      };
    case "research":
      return {
        communication: 0.20,
        confidence: 0.14,
        closingImpact: 0.16,
        paceControl: 0.12,
        polish: 0.14,
        vocalDelivery: 0.08,
      };
    case "consulting":
      return {
        communication: 0.28,
        confidence: 0.22,
        closingImpact: 0.20,
        paceControl: 0.12,
        polish: 0.10,
        vocalDelivery: 0.08,
      };
    default:
      return {
        communication: 0.24,
        confidence: 0.18,
        closingImpact: 0.20,
        paceControl: 0.14,
        polish: 0.12,
        vocalDelivery: 0.12,
      };
  }
}

function getRoleExpectations(roleFamily: RoleFamily) {
  switch (roleFamily) {
    case "finance":
      return {
        communication: 7.6,
        confidence: 7.2,
        closingImpact: 7.8,
        paceControl: 7.0,
        polish: 7.0,
        vocalDelivery: 6.8,
      };
    case "operations":
      return {
        communication: 7.3,
        confidence: 7.2,
        closingImpact: 7.2,
        paceControl: 7.2,
        polish: 6.8,
        vocalDelivery: 7.0,
      };
    case "research":
      return {
        communication: 7.0,
        confidence: 6.8,
        closingImpact: 6.8,
        paceControl: 6.8,
        polish: 7.0,
        vocalDelivery: 6.4,
      };
    case "consulting":
      return {
        communication: 7.8,
        confidence: 7.6,
        closingImpact: 7.4,
        paceControl: 7.2,
        polish: 7.2,
        vocalDelivery: 7.0,
      };
    default:
      return {
        communication: 7.2,
        confidence: 7.0,
        closingImpact: 7.1,
        paceControl: 7.0,
        polish: 6.9,
        vocalDelivery: 6.8,
      };
  }
}

function getAttemptScore(a: AttemptRow) {
  return asOverall100(num(a.score ?? a.feedback?.score));
}

function getAttemptComm(a: AttemptRow) {
  return asTenPoint(num(a.communicationScore ?? a.feedback?.communication_score));
}

function getAttemptConf(a: AttemptRow) {
  return asTenPoint(num(a.confidenceScore ?? a.feedback?.confidence_score));
}

function getAttemptFillers(a: AttemptRow) {
  return (
    num(a.feedback?.filler?.per100) ??
    num(a.deliveryMetrics?.fillersPer100) ??
    null
  );
}

function getAttemptMonotone(a: AttemptRow) {
  return (
    num(a.prosody?.monotoneScore) ??
    num(a.deliveryMetrics?.acoustics?.monotoneScore) ??
    null
  );
}

function getAttemptStarResult(a: AttemptRow) {
  return asTenPoint(num(a.feedback?.star?.result));
}

function getWeaknessBuckets(attempts: AttemptRow[]) {
  const counts = new Map<string, number>();

  function bump(key: string) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (const a of attempts) {
    const score = getAttemptScore(a);
    const comm = getAttemptComm(a);
    const conf = getAttemptConf(a);
    const fillers = getAttemptFillers(a);
    const monotone = getAttemptMonotone(a);
    const result = getAttemptStarResult(a);
    const wpm = num(a.wpm);

    if (result !== null && result < 6.5) bump("Weak closing impact");
    if (fillers !== null && fillers >= 3) bump("Filler-heavy delivery");
    if (monotone !== null && monotone >= 6) bump("Flat vocal delivery");
    if (wpm !== null && wpm > 165) bump("Rushed pace");
    if (wpm !== null && wpm < 100) bump("Slow pace");
    if (comm !== null && comm < 6.8) bump("Weak communication structure");
    if (conf !== null && conf < 6.8) bump("Low confidence signal");
    if (score !== null && score < 65) bump("Low overall readiness");
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
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
        borderRadius: radius,
        padding,
        background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))",
        border: "1px solid var(--card-border-soft)",
        boxShadow: "var(--shadow-card-soft)",
        backdropFilter: "blur(8px)",
      }}
    >
      {children}
    </div>
  );
}

function KpiCard({
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

function Panel({
  title,
  eyebrow,
  children,
  minHeight,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  minHeight?: number;
}) {
  return (
    <GlowCard padding={18} radius={22}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          minHeight: minHeight ?? 0,
        }}
      >
        {eyebrow ? (
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 0.7,
              color: "var(--accent)",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
        ) : null}

        <div
          style={{
            fontSize: 18,
            fontWeight: 950,
            color: "var(--text-primary)",
            letterSpacing: -0.25,
          }}
        >
          {title}
        </div>

        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </GlowCard>
  );
}

function SmallMetric({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: "1px solid var(--card-border-soft)",
        background: "var(--card-bg)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 0.55,
          color: "var(--text-muted)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 24,
          fontWeight: 950,
          color: "var(--text-primary)",
          letterSpacing: -0.35,
        }}
      >
        {value}
      </div>

      {subtext ? (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "var(--text-muted)",
            lineHeight: 1.5,
          }}
        >
          {subtext}
        </div>
      ) : null}
    </div>
  );
}

function MetricPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 14,
        border: "1px solid var(--card-border-soft)",
        background: "var(--card-bg)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 0.55,
          color: "var(--text-muted)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 16,
          fontWeight: 900,
          color: "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ListRows({
  items,
}: {
  items: { label: string; detail?: string; value?: string }[];
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((item, index) => (
        <div
          key={`${item.label}-${item.value ?? ""}-${index}`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
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
              {item.label}
            </div>
            {item.detail ? (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "var(--text-muted)",
                  lineHeight: 1.45,
                }}
              >
                {item.detail}
              </div>
            ) : null}
          </div>

          {item.value ? (
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
              }}
            >
              {item.value}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function MiniBar({
  label,
  value,
  max = 100,
  suffix = "",
  tone = "default",
}: {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  tone?: "default" | "good" | "warn";
}) {
  const pct = clamp((value / max) * 100, 0, 100);
  const gradient =
    tone === "good"
      ? "linear-gradient(90deg, var(--accent), var(--accent-2))"
      : tone === "warn"
      ? "linear-gradient(90deg, var(--accent), var(--accent-2))"
      : "linear-gradient(90deg, var(--accent-2), var(--accent))";

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid var(--card-border-soft)",
        background: "var(--card-bg)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "baseline",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "var(--text-primary)",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            color: "var(--text-muted)",
          }}
        >
          {Math.round(value)}
          {suffix}
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          height: 8,
          borderRadius: 999,
          background: "var(--card-border-soft)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, var(--accent-2-soft), var(--accent-soft))",
boxShadow: "none",
          }}
        />
      </div>
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ cohort?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Not authorized</div>;
  }

    const resolvedSearchParams = searchParams ? await searchParams : {};
  const cohortParam = resolvedSearchParams?.cohort;

  const activeCohort: CohortFilter =
    cohortParam === "high" || cohortParam === "mid" || cohortParam === "low"
      ? cohortParam
      : "all";

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      tenantId: true,
    },
  });

  if (!currentUser) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Not authorized</div>;
  }

  // Only include users who are enrolled as students (excludes tenant_admin accounts)
  const studentMemberships = currentUser.tenantId
    ? await prisma.tenantMembership.findMany({
        where: {
          tenantId: currentUser.tenantId,
          role: "student",
          status: "active",
        },
        select: { userId: true },
      })
    : [];
  const studentUserIds: string[] = studentMemberships.map((m) => m.userId);

  const tenantUsers = await prisma.user.findMany({
    where: {
      tenantId: currentUser.tenantId ?? null,
      id: { in: studentUserIds },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Career outcome data
  const careerCheckIns = currentUser.tenantId
    ? await prisma.careerCheckIn.findMany({
        where: { tenantId: currentUser.tenantId },
        select: {
          userId: true,
          employmentStatus: true,
          industry: true,
          salaryRange: true,
          satisfactionScore: true,
          jobTitle: true,
          graduationYear: true,
          monthsSinceGrad: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // One check-in per user (most recent)
  const latestCheckInByUser = new Map<string, typeof careerCheckIns[0]>();
  for (const ci of careerCheckIns) {
    if (!latestCheckInByUser.has(ci.userId)) latestCheckInByUser.set(ci.userId, ci);
  }
  const uniqueCheckIns = Array.from(latestCheckInByUser.values());
  const employedCount = uniqueCheckIns.filter((c) => c.employmentStatus === "employed" || c.employmentStatus === "employed_part").length;
  const checkInCount = uniqueCheckIns.length;
  const employmentRate = checkInCount > 0 ? Math.round((employedCount / checkInCount) * 100) : null;
  const avgSatisfaction = uniqueCheckIns.filter((c) => c.satisfactionScore).length > 0
    ? (uniqueCheckIns.reduce((sum, c) => sum + (c.satisfactionScore ?? 0), 0) / uniqueCheckIns.filter((c) => c.satisfactionScore).length).toFixed(1)
    : null;

  const industryCounts: Record<string, number> = {};
  for (const ci of uniqueCheckIns) {
    if (ci.industry) industryCounts[ci.industry] = (industryCounts[ci.industry] ?? 0) + 1;
  }
  const topIndustries = Object.entries(industryCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const attempts: AttemptRow[] = await prisma.attempt.findMany({
    where: {
      tenantId: currentUser.tenantId ?? null,
      deletedAt: null,
    },
    select: {
      id: true,
      userId: true,
      tenantId: true,
      ts: true,
      score: true,
      communicationScore: true,
      confidenceScore: true,
      questionCategory: true,
      question: true,
      jobProfileId: true,
      jobProfileTitle: true,
      jobProfileCompany: true,
      jobProfileRoleType: true,
      inputMethod: true,
      wpm: true,
      feedback: true,
      prosody: true,
      deliveryMetrics: true,
    },
    orderBy: {
      ts: "desc",
    },
    take: 1000,
  });

  const totalStudents = tenantUsers.length;

   const studentsWithStats = tenantUsers.map((user) => {
    const userAttempts = attempts.filter((a) => a.userId === user.id);

    const userScore = round1(
      avg(
        userAttempts
          .map(getAttemptScore)
          .filter((v): v is number => v !== null)
      )
    );

    const userScore100 = userScore !== null ? Math.round(userScore) : null;
    const cohort = getCohortFromScore(userScore100);

    const latest = userAttempts[0]?.ts ?? null;

    // Improvement trend: avg of first 3 vs avg of last 3 scored attempts
    const scoredAttempts = [...userAttempts]
      .filter((a) => getAttemptScore(a) !== null)
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    const first3Avg = scoredAttempts.length >= 3
      ? avg(scoredAttempts.slice(0, 3).map(getAttemptScore).filter((v): v is number => v !== null))
      : null;
    const last3Avg = scoredAttempts.length >= 4
      ? avg(scoredAttempts.slice(-3).map(getAttemptScore).filter((v): v is number => v !== null))
      : null;
    const trendDelta = (first3Avg !== null && last3Avg !== null)
      ? Math.round(last3Avg - first3Avg)
      : null;

    return {
      id: user.id,
      name: user.name || (user.email ? user.email.split("@")[0] : "Student"),
      email: user.email,
      attempts: userAttempts.length,
      avgScore: userScore,
      avgScore100: userScore100,
      latest,
      trendDelta,
      cohort,
      attemptsRaw: userAttempts,
    };
  });

  const filteredStudents =
    activeCohort === "all"
      ? studentsWithStats
      : studentsWithStats.filter((s) => s.cohort === activeCohort);

  const filteredStudentIds = new Set(filteredStudents.map((s) => s.id));

  const filteredAttempts = attempts.filter((a) => filteredStudentIds.has(a.userId));

  const attemptsByUser = [...filteredStudents]
    .sort((a, b) => {
      if (b.attempts !== a.attempts) return b.attempts - a.attempts;
      return (b.avgScore ?? -1) - (a.avgScore ?? -1);
    });
  const totalAttempts = filteredAttempts.length;

    const scoreVals = filteredAttempts
    .map(getAttemptScore)
    .filter((v): v is number => v !== null);
    const commVals = filteredAttempts
    .map(getAttemptComm)
    .filter((v): v is number => v !== null);
    const confVals = filteredAttempts
    .map(getAttemptConf)
    .filter((v): v is number => v !== null);

  const avgScore = round1(avg(scoreVals));
  const avgCommunication = round1(avg(commVals));
  const avgConfidence = round1(avg(confVals));

  const attemptsPerStudent =
    filteredStudents.length > 0
      ? (totalAttempts / filteredStudents.length).toFixed(1)
      : "0";

    const spokenAttempts = filteredAttempts.filter(
    (a) =>
      a.inputMethod === "spoken" ||
      a.wpm !== null ||
      a.prosody !== null ||
      a.deliveryMetrics !== null
  );

  const avgWpm = round1(
    avg(
      spokenAttempts
        .map((a) => num(a.wpm))
        .filter((v): v is number => v !== null)
    )
  );

  const avgFillers = round1(
    avg(
      spokenAttempts
        .map(getAttemptFillers)
        .filter((v): v is number => v !== null)
    )
  );

  const avgMonotone = round1(
    avg(
      spokenAttempts
        .map(getAttemptMonotone)
        .filter((v): v is number => v !== null)
    )
  );

  const avgResultImpact = round1(
    avg(
            filteredAttempts
        .map(getAttemptStarResult)
        .filter((v): v is number => v !== null)
    )
  );

    const weaknessRows = getWeaknessBuckets(filteredAttempts).slice(0, 5);

  const categoryMap = new Map<string, number>();
    for (const a of filteredAttempts) {
    const raw = safeLabel(a.questionCategory, "other");
    const label = titleCaseLabel(raw);
    categoryMap.set(label, (categoryMap.get(label) ?? 0) + 1);
  }

  const questionMix = Array.from(categoryMap.entries())
    .map(([label, count]) => ({
      label,
      count,
      pct: totalAttempts > 0 ? Math.round((count / totalAttempts) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  

  const roleGroups = new Map<
    string,
    {
      key: string;
      label: string;
      company: string | null;
      roleType: string | null;
      attempts: AttemptRow[];
    }
  >();

    for (const a of filteredAttempts) {
    const key =
      a.jobProfileId ?? `${a.jobProfileTitle ?? ""}::${a.jobProfileRoleType ?? ""}`;
    const label = a.jobProfileTitle ?? "General Target Role";
    if (!key.trim()) continue;

    if (!roleGroups.has(key)) {
      roleGroups.set(key, {
        key,
        label,
        company: a.jobProfileCompany ?? null,
        roleType: a.jobProfileRoleType ?? null,
        attempts: [],
      });
    }

    roleGroups.get(key)!.attempts.push(a);
  }

  const roleRows = Array.from(roleGroups.values())
    .map((group) => {
      const avgCommRole = round1(
        avg(group.attempts.map(getAttemptComm).filter((v): v is number => v !== null))
      );
      const avgConfRole = round1(
        avg(group.attempts.map(getAttemptConf).filter((v): v is number => v !== null))
      );
      const avgResultRole = round1(
        avg(group.attempts.map(getAttemptStarResult).filter((v): v is number => v !== null))
      );
      const avgFillersRole = round1(
        avg(group.attempts.map(getAttemptFillers).filter((v): v is number => v !== null))
      );
      const avgPaceRole = round1(
        avg(group.attempts.map((a) => num(a.wpm)).filter((v): v is number => v !== null))
      );
      const avgMonotoneRole = round1(
        avg(group.attempts.map(getAttemptMonotone).filter((v): v is number => v !== null))
      );
      const avgScoreRole = round1(
        avg(group.attempts.map(getAttemptScore).filter((v): v is number => v !== null))
      );

      const roleFamily = inferRoleFamily({
        label: group.label,
        roleType: group.roleType,
      });

      const weights = getRoleWeights(roleFamily);
      const expectations = getRoleExpectations(roleFamily);
      const overall10 = asTenPoint(avgScoreRole) ?? 6.8;

      const candidateScores = {
        communication: avgCommRole ?? overall10,
        confidence: avgConfRole ?? overall10,
        closingImpact: avgResultRole ?? overall10,
        paceControl: normalizePaceScore(avgPaceRole) ?? overall10,
        polish: normalizeFillerScore(avgFillersRole) ?? overall10,
        vocalDelivery: normalizeMonotoneScore(avgMonotoneRole) ?? overall10,
      };

      const weightedFit =
        candidateScores.communication * weights.communication +
        candidateScores.confidence * weights.confidence +
        candidateScores.closingImpact * weights.closingImpact +
        candidateScores.paceControl * weights.paceControl +
        candidateScores.polish * weights.polish +
        candidateScores.vocalDelivery * weights.vocalDelivery;

      const fitScore = round1(weightedFit);

      const competencyMap = [
        {
          key: "communication",
          label: "clear communication",
          actual: candidateScores.communication,
          expected: expectations.communication,
        },
        {
          key: "confidence",
          label: "credible tone",
          actual: candidateScores.confidence,
          expected: expectations.confidence,
        },
        {
          key: "closingImpact",
          label: "strong result statements",
          actual: candidateScores.closingImpact,
          expected: expectations.closingImpact,
        },
        {
          key: "paceControl",
          label: "controlled pace",
          actual: candidateScores.paceControl,
          expected: expectations.paceControl,
        },
        {
          key: "polish",
          label: "polished delivery",
          actual: candidateScores.polish,
          expected: expectations.polish,
        },
        {
          key: "vocalDelivery",
          label: "vocal emphasis",
          actual: candidateScores.vocalDelivery,
          expected: expectations.vocalDelivery,
        },
      ];

      const matched = competencyMap
        .filter((c) => c.actual >= c.expected)
        .sort((a, b) => b.actual - a.actual)
        .map((c) => c.label)
        .slice(0, 2);

      const gaps = competencyMap
        .map((c) => ({
          ...c,
          gap: c.expected - c.actual,
        }))
        .filter((c) => c.gap > 0.35)
        .sort((a, b) => b.gap - a.gap)
        .map((c) => {
          if (c.key === "closingImpact") return "sharper measurable outcomes";
          if (c.key === "communication") return "cleaner structure";
          if (c.key === "confidence") return "stronger ownership";
          if (c.key === "paceControl") return "better pace control";
          if (c.key === "polish") return "fewer filler words";
          if (c.key === "vocalDelivery") return "more vocal emphasis";
          return c.label;
        })
        .slice(0, 2);

      return {
        label: group.label,
        company: group.company,
        roleType: group.roleType,
        fitScore,
        matched,
        gaps,
      };
    })
    .sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1))
    .slice(0, 5);

  const spokenRate =
    totalAttempts > 0 ? Math.round((spokenAttempts.length / totalAttempts) * 100) : 0;

    const atRiskStudents = filteredStudents.filter((s) => (s.avgScore100 ?? 0) < 60).length;
const atRiskPct =
  filteredStudents.length > 0
    ? Math.round((atRiskStudents / filteredStudents.length) * 100)
    : 0;

const atRiskStudentRows = filteredStudents
  .filter((s) => (s.avgScore100 ?? 0) < 60)
  .slice(0, 6);

function getIntervention(s: { avgScore: number | null; attemptsRaw: AttemptRow[] }): string {
  const avgS = s.avgScore ?? 0;
  const fillerVals = s.attemptsRaw
    .map((a) => getAttemptFillers(a))
    .filter((v): v is number => v !== null);
  const avgFillersVal =
    fillerVals.length > 0 ? fillerVals.reduce((a, b) => a + b, 0) / fillerVals.length : 0;

  if (avgFillersVal > 6)
    return "Assign 2 behavioral questions with focus on filler reduction - practice replacing 'um/like' with a 1-second pause.";
  if (avgS < 50)
    return "Start with 1 simple behavioral question per day to build baseline confidence and structure.";
  if (avgS < 60)
    return "Focus on adding one measurable result to each answer - specificity is the fastest path to score improvement.";
  return "Schedule a 1:1 coaching session to identify the specific structural gap limiting this student's score.";
}

function getTopWeakness(s: { attemptsRaw: AttemptRow[]; avgScore: number | null }): string {
  const fillerVals = s.attemptsRaw
    .map((a) => getAttemptFillers(a))
    .filter((v): v is number => v !== null);
  const avgFillersVal =
    fillerVals.length > 0 ? fillerVals.reduce((a, b) => a + b, 0) / fillerVals.length : 0;

  const commVals = s.attemptsRaw
    .map((a) => getAttemptComm(a))
    .filter((v): v is number => v !== null);
  const avgCommVal =
    commVals.length > 0 ? commVals.reduce((a, b) => a + b, 0) / commVals.length : null;

  const confVals = s.attemptsRaw
    .map((a) => getAttemptConf(a))
    .filter((v): v is number => v !== null);
  const avgConfVal =
    confVals.length > 0 ? confVals.reduce((a, b) => a + b, 0) / confVals.length : null;

  if (avgFillersVal > 6) return "Filler-heavy delivery";
  if (avgCommVal !== null && avgCommVal < 6.0) return "Weak communication structure";
  if (avgConfVal !== null && avgConfVal < 6.0) return "Low confidence signal";
  return "Low overall readiness";
}

// Weekly trend for last 12 weeks
const now = new Date();
const weeklyTrend = Array.from({ length: 12 }, (_, i) => {
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - (11 - i) * 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
  const weekAttempts = filteredAttempts.filter(
    (a) => new Date(a.ts) >= weekStart && new Date(a.ts) < weekEnd
  );
  const scores = weekAttempts
    .map((a) => asOverall100(a.score))
    .filter((v): v is number => v !== null);
  return {
    label,
    avg: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    count: weekAttempts.length,
  };
});

const trendWeeksWithData = weeklyTrend.filter((w) => w.avg !== null);
const firstDataAvg = trendWeeksWithData[0]?.avg ?? null;
const lastDataAvg = trendWeeksWithData[trendWeeksWithData.length - 1]?.avg ?? null;
const overallTrendDelta =
  firstDataAvg !== null && lastDataAvg !== null ? lastDataAvg - firstDataAvg : null;
const overallTrendLabel =
  overallTrendDelta === null
    ? "No data yet"
    : overallTrendDelta > 3
    ? `↑ +${overallTrendDelta} pts over 12 weeks`
    : overallTrendDelta < -3
    ? `↓ ${overallTrendDelta} pts over 12 weeks`
    : "→ Stable over 12 weeks";

const stalledStudents = filteredStudents.filter(
  (s) =>
    s.attempts > 0 &&
    s.latest !== null &&
    Date.now() - new Date(s.latest).getTime() > 14 * 24 * 60 * 60 * 1000
).length;
const stalledPct =
  filteredStudents.length > 0
    ? Math.round((stalledStudents / filteredStudents.length) * 100)
    : 0;

  const avgScoreDisplay = avgScore !== null ? avgScore.toFixed(0) : " - ";
  const avgCommunicationDisplay =
    avgCommunication !== null ? `${pctFrom10(avgCommunication)}%` : " - ";
  const avgConfidenceDisplay =
    avgConfidence !== null ? `${pctFrom10(avgConfidence)}%` : " - ";

  const assignments = await prisma.assignment.findMany({
    where: { tenantId: currentUser.tenantId ?? undefined, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const assignmentStats = assignments.map((a) => {
    const since = a.createdAt;
    const cats = a.questionCategories;
    const completedStudents = studentsWithStats.filter((s) => {
      const matchingAttempts = s.attemptsRaw.filter((att: AttemptRow) => {
        const ts = new Date(att.ts);
        if (ts < since) return false;
        if (cats.length > 0 && !cats.includes(att.questionCategory ?? "")) return false;
        return true;
      });
      return matchingAttempts.length >= a.minAttempts;
    }).length;
    return {
      ...a,
      completedCount: completedStudents,
      totalStudents: filteredStudents.length,
      completionPct:
        filteredStudents.length > 0
          ? Math.round((completedStudents / filteredStudents.length) * 100)
          : 0,
    };
  });

  return (
    <PremiumShell
      title="Admin Dashboard"
      subtitle="Monitor student engagement, coaching outcomes, voice delivery quality, and role-readiness signals across your school."
    >
      <div style={{ marginTop: 8, display: "grid", gap: 18 }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
              color: "var(--text-primary)",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Tenant Scope
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
              color: "var(--text-muted)",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Live Analytics
          </div>

          <Link href="/admin/roster" style={{ textDecoration: "none" }}>
            <div style={{
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
              color: "var(--text-muted)",
              fontSize: 12,
              fontWeight: 800,
            }}>
              Roster Management
            </div>
          </Link>

          <Link href="/admin/compliance" style={{ textDecoration: "none" }}>
            <div style={{
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid rgba(22,163,74,0.25)",
              background: "rgba(22,163,74,0.06)",
              color: "#16A34A",
              fontSize: 12,
              fontWeight: 800,
            }}>
              FERPA Compliance
            </div>
          </Link>
        </div>

           <div
  style={{
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
  }}
>
         <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
  {[
    { key: "all", label: "All Students" },
    { key: "high", label: "High-performing students" },
    { key: "mid", label: "Mid-performing students" },
    { key: "low", label: "Students needing support" },
  ].map((item) => {
    const active = activeCohort === item.key;

    return (
      <Link
        key={item.key}
        href={item.key === "all" ? "/admin" : `/admin?cohort=${item.key}`}
        style={{ textDecoration: "none" }}
      >
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 999,
            border: active
              ? "1px solid var(--accent-strong)"
              : "1px solid var(--card-border)",
            background: active ? "var(--accent-soft)" : "var(--card-bg)",
            color: active ? "var(--accent)" : "var(--text-primary)",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {item.label}
        </div>
      </Link>
    );
  })}
</div>

<a
  href="/api/admin/export"
  style={{
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid var(--accent-strong)",
    background: "var(--accent-soft)",
    color: "var(--accent)",
    fontSize: 12,
    fontWeight: 900,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
  }}
>
  Export Excel
</a>
        </div>

        <BulkEnrollForm />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          <KpiCard
  label="Students"
  value={String(filteredStudents.length)}
  subtext={
    activeCohort === "all"
      ? "Users in the current tenant."
      : "Students in the selected cohort."
  }
/>
<KpiCard
  label="Attempts"
  value={String(totalAttempts)}
  subtext="Interview reps captured across this school."
/>
<KpiCard
  label="At-Risk Students"
  value={`${atRiskPct}%`}
  subtext="Students currently needing coaching support."
/>
<KpiCard
  label="Student Readiness"
  value={avgScoreDisplay}
  subtext="Average interview score across all attempts."
/>
<KpiCard
  label="Avg Attempts / Student"
  value={attemptsPerStudent}
  subtext="practice volume"
/>
<KpiCard
  label="Stalled Students"
  value={`${stalledStudents} (${stalledPct}%)`}
  subtext="no practice in 14+ days"
/>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.35fr 1fr",
            gap: 18,
          }}
        >
          <Panel eyebrow="Overview" title="Engagement Overview" minHeight={300}>
            <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  }}
>
              
              <SmallMetric
                label="Spoken Attempts"
                value={`${spokenRate}%`}
                subtext="Share of attempts with speaking data."
              />
              <SmallMetric
                label="Readiness Baseline"
                value={avgScoreDisplay}
                subtext="Average overall interview score."
              />
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 18,
                borderRadius: 18,
                border: "1px solid var(--card-border-soft)",
                background:
                  "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: "var(--text-muted)",
                  letterSpacing: 0.55,
                  textTransform: "uppercase",
                }}
              >
                Admin Summary
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 14,
                  color: "var(--text-primary)",
                  lineHeight: 1.8,
                }}
              >

            
                {activeCohort === "all" ? "All students" : `The ${activeCohort} cohort`} currently average{" "}
<strong>{avgScoreDisplay}</strong> overall, with communication at{" "}
<strong>{avgCommunicationDisplay}</strong> and confidence at{" "}
<strong>{avgConfidenceDisplay}</strong>.{" "}
{atRiskPct === 0
  ? "No students are currently below the readiness target - the cohort is on track."
  : <><strong>{atRiskPct}%</strong> of students in this view are currently below the readiness target and may benefit from targeted coaching support.</>
}
              </div>
            </div>
          </Panel>

          <Panel eyebrow="Voice Analytics" title="Speaking Metrics" minHeight={300}>
            <div style={{ display: "grid", gap: 12 }}>
              <MiniBar
                label="Average WPM"
                value={avgWpm ?? 0}
                max={200}
              />
              <MiniBar
                label="Average Filler Rate"
                value={avgFillers ?? 0}
                max={6}
                suffix="/100"
              />
              <MiniBar
                label="Monotone Risk"
                value={avgMonotone ?? 0}
                max={10}
                suffix="/10"
              />
              
            </div>
          </Panel>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 18,
          }}
        >
          <Panel eyebrow="Insights" title="Top Weaknesses" minHeight={280}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
  Most common areas where students struggle during interviews
</div>
            <ListRows
              items={
                weaknessRows.length > 0
                  ? weaknessRows.map((row) => ({
                      label: row.label,
                      detail: "Most common coaching issue across current attempts.",
                      value: `${row.count}`,
                    }))
                  : [
                      {
                        label: "No weakness data yet",
                        detail: "Complete more attempts to surface school-wide weakness patterns.",
                      },
                    ]
              }
            />
          </Panel>

          <Panel eyebrow="Question Mix" title="Question Category Demand" minHeight={280}>
            <ListRows
              items={
                questionMix.length > 0
                  ? questionMix.map((row) => ({
                      label: row.label,
                      detail: `${row.count} attempts in this category.`,
                      value: `${row.pct}%`,
                    }))
                  : [
                      {
                        label: "No category data yet",
                        detail: "Question category analytics will appear once attempts are available.",
                      },
                    ]
              }
            />
          </Panel>

          <Panel eyebrow="Role Matching" title="Role Readiness" minHeight={280}>
            <ListRows
              items={
                roleRows.length > 0
                  ? roleRows.map((row) => ({
                      label: row.label,
                      detail: [
                        row.company,
                        row.roleType,
                        row.matched.length
                          ? `best on ${row.matched.join(" + ")}`
                          : row.gaps.length
                          ? `gap: ${row.gaps[0]}`
                          : "signals still emerging",
                      ]
                        .filter(Boolean)
                        .join(" · "),
                      value:
                        row.fitScore !== null
                          ? `${pctFrom10(row.fitScore)}%`
                          : " - ",
                    }))
                  : [
                      {
                        label: "No role readiness yet",
                        detail: "Create job profiles and complete attempts to unlock role matching.",
                      },
                    ]
              }
            />
          </Panel>
        </div>

        {/* Score Trend + At-Risk panels */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 18,
          }}
        >
          <Panel eyebrow="Analytics" title="Score Trend (12 weeks)">
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color:
                  overallTrendDelta === null
                    ? "var(--text-muted)"
                    : overallTrendDelta > 3
                    ? "var(--chart-positive)"
                    : overallTrendDelta < -3
                    ? "var(--chart-critical)"
                    : "var(--text-muted)",
                marginBottom: 14,
              }}
            >
              {overallTrendLabel}
            </div>

            <div style={{ position: "relative", height: 120 }}>
              {/* SVG bar chart */}
              <svg
                width="100%"
                height="120"
                viewBox="0 0 660 120"
                preserveAspectRatio="none"
                style={{ display: "block" }}
              >
                {weeklyTrend.map((week, i) => {
                  const barWidth = 44;
                  const gap = 11;
                  const x = i * (barWidth + gap);
                  const chartH = 90;
                  const barH = week.avg !== null ? Math.round((week.avg / 100) * chartH) : 0;
                  const y = chartH - barH;

                  return (
                    <g key={i}>
                      {week.avg !== null ? (
                        <>
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barH}
                            rx={4}
                            fill="var(--accent)"
                            opacity="0.85"
                          />
                          <text
                            x={x + barWidth / 2}
                            y={y - 4}
                            textAnchor="middle"
                            fontSize="9"
                            fill="var(--text-muted)"
                            fontWeight="800"
                          >
                            {week.avg}
                          </text>
                        </>
                      ) : (
                        <rect
                          x={x}
                          y={0}
                          width={barWidth}
                          height={chartH}
                          rx={4}
                          fill="none"
                          stroke="var(--card-border-soft)"
                          strokeWidth="1"
                          strokeDasharray="3 3"
                          opacity="0.5"
                        />
                      )}
                      {i % 3 === 0 && (
                        <text
                          x={x + barWidth / 2}
                          y={110}
                          textAnchor="middle"
                          fontSize="9"
                          fill="var(--text-muted)"
                          fontWeight="700"
                        >
                          {week.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </Panel>

          <Panel eyebrow="Interventions" title="At-Risk Students">
            {atRiskStudentRows.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {atRiskStudentRows.map((s) => {
                  const weakness = getTopWeakness(s);
                  const intervention = getIntervention(s);
                  return (
                    <div
                      key={s.id}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 14,
                        border: "1px solid var(--card-border-soft)",
                        background: "var(--card-bg)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 10,
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
                            {s.name}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                              marginTop: 2,
                            }}
                          >
                            {s.email}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 4,
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              padding: "3px 8px",
                              borderRadius: 999,
                              background: "var(--chart-critical-soft, var(--accent-soft))",
                              color: "var(--chart-critical, var(--accent))",
                              fontSize: 11,
                              fontWeight: 900,
                            }}
                          >
                            {s.avgScore !== null ? `${Math.round(s.avgScore)}/100` : " - "}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: "var(--text-muted)",
                              textAlign: "right",
                            }}
                          >
                            {weakness}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          color: "var(--text-muted)",
                          fontStyle: "italic",
                          lineHeight: 1.6,
                        }}
                      >
                        {intervention}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid var(--card-border-soft)",
                  background: "var(--card-bg)",
                  fontSize: 13,
                  color: "var(--text-muted)",
                }}
              >
                No at-risk students in this cohort.
              </div>
            )}
          </Panel>
        </div>

        {/* Full Student Roster */}
        <GlowCard padding={22} radius={22}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.7, color: "var(--accent)", textTransform: "uppercase", marginBottom: 4 }}>
                Student Roster
              </div>
              <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: -0.3, color: "var(--text-primary)" }}>
                {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
                {activeCohort !== "all" ? ` · ${activeCohort} cohort` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 10 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--chart-positive)", display: "inline-block" }} />
                  High ≥80
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--chart-neutral)", display: "inline-block" }} />
                  Mid 60–79
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--chart-critical)", display: "inline-block" }} />
                  At-Risk &lt;60
                </span>
              </div>
            </div>
          </div>

          {/* Header row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 80px 80px 80px 80px 100px 110px 36px",
            gap: 12,
            padding: "0 14px 10px 14px",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 0.6,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            borderBottom: "1px solid var(--card-border-soft)",
            marginBottom: 8,
          }}>
            <div>Student</div>
            <div>Score</div>
            <div>Comm</div>
            <div>Conf</div>
            <div>Trend</div>
            <div>Attempts</div>
            <div>Last Active</div>
            <div />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            {attemptsByUser.length > 0 ? attemptsByUser.map((row) => {
              const cohortColor =
                row.cohort === "high"
                  ? "var(--chart-positive)"
                  : row.cohort === "mid"
                  ? "var(--chart-neutral)"
                  : "var(--chart-critical)";
              const cohortBg =
                row.cohort === "high"
                  ? "rgba(22,163,74,0.08)"
                  : row.cohort === "mid"
                  ? "rgba(245,158,11,0.09)"
                  : "rgba(239,68,68,0.08)";
              const cohortLabel =
                row.cohort === "high" ? "High" : row.cohort === "mid" ? "Mid" : "At-Risk";

              const userAttempts = row.attemptsRaw;
              const commAvg = round1(avg(userAttempts.map(getAttemptComm).filter((v): v is number => v !== null)));
              const confAvg = round1(avg(userAttempts.map(getAttemptConf).filter((v): v is number => v !== null)));

              const daysSince = row.latest
                ? Math.floor((Date.now() - new Date(row.latest).getTime()) / (1000 * 60 * 60 * 24))
                : null;
              const lastActiveLabel = daysSince === null ? " - "
                : daysSince === 0 ? "Today"
                : daysSince === 1 ? "Yesterday"
                : daysSince <= 7 ? `${daysSince}d ago`
                : row.latest ? new Date(row.latest).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : " - ";
              const lastActiveColor = daysSince !== null && daysSince > 14 ? "var(--chart-critical)" : "var(--text-muted)";

              return (
                <Link key={row.id} href={`/admin/students/${row.id}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1.6fr 80px 80px 80px 80px 100px 110px 36px",
                    gap: 12,
                    alignItems: "center",
                    padding: "11px 14px",
                    borderRadius: 14,
                    border: "1px solid var(--card-border-soft)",
                    background: "var(--card-bg)",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}>
                    <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        background: `linear-gradient(135deg, ${cohortColor}22, ${cohortColor}44)`,
                        border: `1.5px solid ${cohortColor}55`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 900, color: cohortColor,
                      }}>
                        {(row.name || "?")[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {row.name}
                        </div>
                        <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-muted)" }}>
                          {row.email}
                        </div>
                      </div>
                    </div>

                    {/* Score with cohort pill */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)" }}>
                        {row.avgScore100 !== null ? `${row.avgScore100}` : " - "}
                      </div>
                      <div style={{ padding: "2px 6px", borderRadius: 999, background: cohortBg, color: cohortColor, fontSize: 10, fontWeight: 900, display: "inline-block" }}>
                        {cohortLabel}
                      </div>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                      {commAvg !== null ? `${pctFrom10(commAvg)}%` : " - "}
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                      {confAvg !== null ? `${pctFrom10(confAvg)}%` : " - "}
                    </div>

                    <div style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: row.trendDelta === null ? "var(--text-muted)"
                        : row.trendDelta > 3 ? "var(--chart-positive)"
                        : row.trendDelta < -3 ? "var(--chart-critical)"
                        : "var(--text-muted)",
                    }}>
                      {row.trendDelta === null ? " - "
                        : row.trendDelta > 0 ? `↑ +${row.trendDelta}`
                        : row.trendDelta < 0 ? `↓ ${row.trendDelta}`
                        : "→ 0"}
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                      {row.attempts} rep{row.attempts !== 1 ? "s" : ""}
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 800, color: lastActiveColor }}>
                      {lastActiveLabel}
                    </div>

                    <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}>→</div>
                  </div>
                </Link>
              );
            }) : (
              <div style={{ padding: "24px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                No students found. Seed demo data or invite students to get started.
              </div>
            )}
          </div>
        </GlowCard>

        {/* Coaching Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12 }}>
          <MetricPill label="Communication" value={avgCommunicationDisplay} />
          <MetricPill label="Confidence" value={avgConfidenceDisplay} />
          <MetricPill label="Spoken Attempts" value={`${spokenRate}%`} />
          <MetricPill label="Most Common Gap" value={weaknessRows[0]?.label ?? "Still emerging"} />
          <MetricPill label="Avg Result Impact" value={avgResultImpact !== null ? String(avgResultImpact) : " - "} />
        </div>

        {/* Assignments Panel */}
        <Panel eyebrow="Course Assignments" title="Active Assignments">
          <div style={{ display: "grid", gap: 14 }}>
            <CreateAssignmentForm />

            {assignmentStats.length === 0 ? (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid var(--card-border-soft)",
                  background: "var(--card-bg)",
                  fontSize: 13,
                  color: "var(--text-muted)",
                }}
              >
                No active assignments yet. Use the form above to create one.
              </div>
            ) : (
              (assignmentStats as Array<{
                id: string;
                title: string;
                description: string | null;
                dueDate: Date | null;
                questionCategories: string[];
                minAttempts: number;
                completedCount: number;
                totalStudents: number;
                completionPct: number;
              }>).map((a) => {
                const dueDateDisplay = a.dueDate
                  ? new Date(a.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : null;

                const categoryLabel =
                  a.questionCategories.length > 0
                    ? a.questionCategories.join(", ")
                    : "any category";

                return (
                  <div
                    key={a.id}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 14,
                      border: "1px solid var(--card-border-soft)",
                      background: "var(--card-bg)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
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
                          {a.title}
                        </div>
                        {a.description && (
                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 12,
                              color: "var(--text-muted)",
                              lineHeight: 1.5,
                            }}
                          >
                            {a.description}
                          </div>
                        )}
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 11,
                            color: "var(--text-muted)",
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <span>
                            Required: {a.minAttempts} attempts in {categoryLabel}
                          </span>
                          {dueDateDisplay && (
                            <span style={{ color: "var(--accent)" }}>
                              Due {dueDateDisplay}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          flexShrink: 0,
                          fontSize: 13,
                          fontWeight: 900,
                          color: "var(--text-primary)",
                          textAlign: "right",
                        }}
                      >
                        {a.completedCount}/{a.totalStudents}
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--text-muted)",
                          }}
                        >
                          {a.completionPct}% complete
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div
                      style={{
                        marginTop: 10,
                        height: 6,
                        borderRadius: 999,
                        background: "var(--card-border-soft)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${a.completionPct}%`,
                          height: "100%",
                          borderRadius: 999,
                          background: "var(--accent)",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        {/* ── CAREER OUTCOMES ───────────────────────────────────────────── */}
        <Panel eyebrow="Post-Graduation" title="Career Outcomes">
          {checkInCount === 0 ? (
            <div style={{ padding: "28px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
              <div style={{ fontWeight: 900, color: "var(--text-primary)", marginBottom: 6 }}>No career check-ins yet</div>
              <div style={{ maxWidth: 400, margin: "0 auto", lineHeight: 1.7 }}>
                Students submit career check-ins from the Career Guide section. Once they do, you&apos;ll see employment rates, salary distributions, and industry placement data here.
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {/* Summary stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div style={{ padding: 16, borderRadius: 14, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)", textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 950, color: "var(--accent)" }}>{checkInCount}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, marginTop: 4 }}>Check-ins submitted</div>
                </div>
                <div style={{ padding: 16, borderRadius: 14, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)", textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 950, color: "#10B981" }}>{employmentRate !== null ? `${employmentRate}%` : " - "}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, marginTop: 4 }}>Employment rate</div>
                </div>
                <div style={{ padding: 16, borderRadius: 14, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)", textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 950, color: "#F59E0B" }}>{avgSatisfaction ?? " - "}<span style={{ fontSize: 14 }}>/5</span></div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700, marginTop: 4 }}>Avg satisfaction</div>
                </div>
              </div>

              {/* Employment status breakdown */}
              <div style={{ padding: 16, borderRadius: 14, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                <div style={{ fontSize: 12, fontWeight: 950, color: "var(--text-primary)", marginBottom: 12 }}>Employment status breakdown</div>
                {(["employed", "employed_part", "job_searching", "graduate_school", "freelance", "other"] as const).map((status) => {
                  const count = uniqueCheckIns.filter((c) => c.employmentStatus === status).length;
                  if (count === 0) return null;
                  const pct = Math.round((count / checkInCount) * 100);
                  const label: Record<string, string> = {
                    employed: "Employed full-time",
                    employed_part: "Part-time / contract",
                    job_searching: "Job searching",
                    graduate_school: "Graduate school",
                    freelance: "Freelance",
                    other: "Other",
                  };
                  const color: Record<string, string> = {
                    employed: "#10B981",
                    employed_part: "#6EE7B7",
                    job_searching: "#F59E0B",
                    graduate_school: "var(--accent)",
                    freelance: "#8B5CF6",
                    other: "var(--text-muted)",
                  };
                  return (
                    <div key={status} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
                        <span>{label[status]}</span><span>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color[status], borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Top industries */}
              {topIndustries.length > 0 && (
                <div style={{ padding: 16, borderRadius: 14, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                  <div style={{ fontSize: 12, fontWeight: 950, color: "var(--text-primary)", marginBottom: 10 }}>Top industries</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {topIndustries.map(([industry, count]) => (
                      <div key={industry} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                        <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{industry}</span>
                        <span style={{ color: "var(--accent)", fontWeight: 900, fontSize: 12 }}>{count} student{count !== 1 ? "s" : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                Data is self-reported by students via the Career Guide check-in. Encourage students to complete their check-in for more accurate cohort outcomes.
              </div>
            </div>
          )}
        </Panel>
      </div>
    </PremiumShell>
  );
}