import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { ReactNode } from "react";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";
import CreateAssignmentForm from "@/app/components/CreateAssignmentForm";
import { BulkEnrollForm } from "@/app/components/BulkEnrollForm";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Mic,
  Briefcase,
  ClipboardList,
  TrendingUp,
} from "lucide-react";

import {
  asOverall100,
  asTenPoint,
  avgOverall100,
  avgTenPoint,
  displayOverall100,
  displayTenPointAs100,
} from "@/app/lib/scoreScale";
import {
  computeNaceCohortAverages,
  NACE_META,
  naceScoreColor,
  naceScoreLabel,
  type NaceKey,
} from "@/app/lib/nace";
import { computeProductivity, productivityGrade } from "@/app/lib/productivity";


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
  evaluationFramework: string | null;
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

function getAttemptPitchStd(a: AttemptRow) {
  return (
    num(a.deliveryMetrics?.acoustics?.pitchStd) ??
    num(a.prosody?.pitchStdHz) ??
    null
  );
}

function getAttemptEnergyVariation(a: AttemptRow) {
  return (
    num(a.deliveryMetrics?.acoustics?.energyVariation) ??
    null
  );
}

function getAttemptAvgPauseMs(a: AttemptRow) {
  return (
    num(a.deliveryMetrics?.avgPauseMs) ??
    num(a.deliveryMetrics?.avg_pause_ms) ??
    null
  );
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
    <div
      style={{
        borderRadius: 20,
        padding: 18,
        background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))",
        border: "1px solid var(--card-border-soft)",
        boxShadow: "var(--shadow-card-soft)",
        backdropFilter: "blur(8px)",
        borderLeft: "3px solid var(--accent)",
      }}
    >
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
    </div>
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
  searchParams?: Promise<{ cohort?: string; tab?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Not authorized</div>;
  }

    const resolvedSearchParams = searchParams ? await searchParams : {};
  const cohortParam = resolvedSearchParams?.cohort;
  const activeTab = resolvedSearchParams?.tab ?? "overview";

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
      graduationYear: true,
      major: true,
      targetRole: true,
      targetIndustry: true,
      createdAt: true,
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
          salaryExact: true,
          satisfactionScore: true,
          jobTitle: true,
          company: true,
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

  // Salary bands (mid-point mapping for avg estimate)
  const SALARY_MIDPOINTS: Record<string, number> = {
    under_40k: 35000, "40_50k": 45000, "50_60k": 55000,
    "60_75k": 67500, "75_90k": 82500, "90_110k": 100000,
    "110_130k": 120000, over_130k: 145000,
  };
  const salaryVals = uniqueCheckIns
    .filter((c) => c.employmentStatus === "employed")
    .flatMap((c) => {
      if (c.salaryExact) return [c.salaryExact];
      if (c.salaryRange && SALARY_MIDPOINTS[c.salaryRange]) return [SALARY_MIDPOINTS[c.salaryRange]];
      return [];
    });
  const avgSalary = salaryVals.length
    ? Math.round(salaryVals.reduce((a, b) => a + b, 0) / salaryVals.length)
    : null;

  const salaryBandCounts: Record<string, number> = {};
  for (const ci of uniqueCheckIns) {
    if (ci.salaryRange) salaryBandCounts[ci.salaryRange] = (salaryBandCounts[ci.salaryRange] ?? 0) + 1;
  }
  const salaryBands = Object.entries(salaryBandCounts).sort((a, b) => b[1] - a[1]);

  // Top employers
  const companyCounts: Record<string, number> = {};
  for (const ci of uniqueCheckIns) {
    if (ci.company) companyCounts[ci.company] = (companyCounts[ci.company] ?? 0) + 1;
  }
  const topEmployers = Object.entries(companyCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Placement velocity: % employed within 6mo of grad
  const recentGrads = uniqueCheckIns.filter((c) => c.monthsSinceGrad !== null && (c.monthsSinceGrad ?? 999) <= 6);
  const recentGradsEmployed = recentGrads.filter((c) => c.employmentStatus === "employed").length;
  const earlyPlacementRate = recentGrads.length > 0
    ? Math.round((recentGradsEmployed / recentGrads.length) * 100)
    : null;

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
      evaluationFramework: true,
    },
    orderBy: {
      ts: "desc",
    },
    take: 1000,
  });

  // Profile completeness data: aptitude, checklist, interview activity, skills, tasks
  const [aptitudeByUser, checklistByUser, interviewActivityByUser, skillsByUser, tasksByUser, checklistProgressForProductivity] = await Promise.all([
    prisma.aptitudeResult.findMany({
      where: { tenantId: currentUser.tenantId ?? null },
      select: { userId: true },
    }),
    prisma.checklistProgress.findMany({
      where: { tenantId: currentUser.tenantId ?? null, done: true },
      select: { userId: true },
    }),
    prisma.interviewActivity.findMany({
      where: { tenantId: currentUser.tenantId ?? null },
      select: { userId: true },
    }),
    prisma.studentSkill.findMany({
      where: { tenantId: currentUser.tenantId ?? null },
      select: { userId: true, skill: true, category: true, confidence: true },
    }),
    // For productivity scoring
    prisma.task.findMany({
      where: { tenantId: currentUser.tenantId ?? null },
      select: { userId: true, scheduledAt: true, completedAt: true, dueDate: true, createdAt: true },
    }),
    prisma.checklistProgress.findMany({
      where: { tenantId: currentUser.tenantId ?? null },
      select: { userId: true, scheduledDate: true, dueDate: true, completedAt: true, done: true },
    }),
  ]);

  const aptitudeUserIds = new Set(aptitudeByUser.map((a) => a.userId));
  const checklistCountByUser = new Map<string, number>();
  for (const c of checklistByUser) checklistCountByUser.set(c.userId, (checklistCountByUser.get(c.userId) ?? 0) + 1);
  const interviewActivityUserIds = new Set(interviewActivityByUser.map((a) => a.userId));
  const skillCountByUser = new Map<string, number>();
  for (const s of skillsByUser) skillCountByUser.set(s.userId, (skillCountByUser.get(s.userId) ?? 0) + 1);

  // Cohort-wide skill inventory
  const allSkillCounts: Record<string, { count: number; category: string }> = {};
  for (const s of skillsByUser) {
    if (!allSkillCounts[s.skill]) allSkillCounts[s.skill] = { count: 0, category: s.category };
    allSkillCounts[s.skill].count++;
  }
  const topCohortSkills = Object.entries(allSkillCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([skill, { count, category }]) => ({ skill, count, category }));

  const totalStudents = tenantUsers.length;
  const checkInCoverage = totalStudents > 0 ? Math.round((checkInCount / totalStudents) * 100) : null;

  // Build per-user productivity scores from task + checklist data
  const productivityByUser = new Map<string, ReturnType<typeof computeProductivity>>();
  const userIdsWithData = new Set([
    ...tasksByUser.map((t) => t.userId),
    ...checklistProgressForProductivity.map((c) => c.userId),
  ]);
  for (const uid of userIdsWithData) {
    const userTasks = tasksByUser.filter((t) => t.userId === uid);
    const userChecklist = checklistProgressForProductivity.filter((c) => c.userId === uid);
    productivityByUser.set(
      uid,
      computeProductivity({ tasks: userTasks, checklist: userChecklist }),
    );
  }

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

    // Split attempts by module type
    const interviewAttempts = userAttempts.filter((a) =>
      !a.evaluationFramework || !["networking_pitch", "public_speaking"].includes(a.evaluationFramework)
    );
    const networkingAttempts = userAttempts.filter((a) => a.evaluationFramework === "networking_pitch");
    const psAttempts = userAttempts.filter((a) => a.evaluationFramework === "public_speaking");

    // Networking pitch style distribution
    const pitchStyles: Record<string, number> = {};
    for (const a of networkingAttempts) {
      const style = (a.feedback as any)?.pitchStyle;
      if (style) pitchStyles[style] = (pitchStyles[style] ?? 0) + 1;
    }
    const topPitchStyle = Object.entries(pitchStyles).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Public speaking archetype
    const archetypes: Record<string, number> = {};
    for (const a of psAttempts) {
      const arch = (a.feedback as any)?.deliveryArchetype;
      if (arch) archetypes[arch] = (archetypes[arch] ?? 0) + 1;
    }
    const topArchetype = Object.entries(archetypes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Profile completeness score (0–100)
    let completeness = 0;
    if (user.graduationYear) completeness += 10;
    if (user.major) completeness += 10;
    if (user.targetRole) completeness += 10;
    if (user.targetIndustry) completeness += 10;
    if (interviewAttempts.length >= 5) completeness += 15;
    else if (interviewAttempts.length >= 1) completeness += 5;
    if (networkingAttempts.length >= 1) completeness += 5;
    if (psAttempts.length >= 1) completeness += 5;
    if (aptitudeUserIds.has(user.id)) completeness += 10;
    if (latestCheckInByUser.has(user.id)) completeness += 10;
    if ((checklistCountByUser.get(user.id) ?? 0) >= 3) completeness += 5;
    if (interviewActivityUserIds.has(user.id)) completeness += 5;
    if ((skillCountByUser.get(user.id) ?? 0) >= 3) completeness += 5;

    // Days since last active
    const daysSinceActive = latest
      ? Math.floor((Date.now() - new Date(latest).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      id: user.id,
      name: user.name || (user.email ? user.email.split("@")[0] : "Student"),
      email: user.email,
      graduationYear: user.graduationYear,
      major: user.major,
      targetRole: user.targetRole,
      targetIndustry: user.targetIndustry,
      attempts: userAttempts.length,
      avgScore: userScore,
      avgScore100: userScore100,
      latest,
      trendDelta,
      cohort,
      attemptsRaw: userAttempts,
      completeness,
      daysSinceActive,
      hasAptitude: aptitudeUserIds.has(user.id),
      hasCheckIn: latestCheckInByUser.has(user.id),
      hasInterview: interviewActivityUserIds.has(user.id),
      skillCount: skillCountByUser.get(user.id) ?? 0,
      checklistCount: checklistCountByUser.get(user.id) ?? 0,
      interviewAttemptCount: interviewAttempts.length,
      networkingAttemptCount: networkingAttempts.length,
      psAttemptCount: psAttempts.length,
      topPitchStyle,
      topArchetype,
      productivity: productivityByUser.get(user.id) ?? null,
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

  // Framework-split attempt counts for admin display
  const filteredInterviewAttempts = filteredAttempts.filter(
    (a) => !a.evaluationFramework || !["networking_pitch", "public_speaking"].includes(a.evaluationFramework)
  );
  const filteredNetworkingAttempts = filteredAttempts.filter((a) => a.evaluationFramework === "networking_pitch");
  const filteredPsAttempts = filteredAttempts.filter((a) => a.evaluationFramework === "public_speaking");

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

  const avgPitchStd = round1(
    avg(
      spokenAttempts
        .map(getAttemptPitchStd)
        .filter((v): v is number => v !== null)
    )
  );

  const avgEnergyVariation = round1(
    avg(
      spokenAttempts
        .map(getAttemptEnergyVariation)
        .filter((v): v is number => v !== null)
    )
  );

  const avgPauseMs = round1(
    avg(
      spokenAttempts
        .map(getAttemptAvgPauseMs)
        .filter((v): v is number => v !== null)
    )
  );

  const naceCohort = computeNaceCohortAverages(
    filteredAttempts.map((a) => ({
      score: num(a.score),
      communicationScore: num(a.communicationScore),
      confidenceScore: num(a.confidenceScore),
      wpm: num(a.wpm),
      feedback: a.feedback,
      prosody: a.prosody,
      deliveryMetrics: a.deliveryMetrics,
      questionCategory: a.questionCategory,
    }))
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

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const activeThisWeek = filteredAttempts.filter(
  (a) => new Date(a.ts) >= sevenDaysAgo
).length;

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

        {/* ── Tab navigation ─────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Primary tabs with icons */}
          <div style={{
            display: "flex",
            gap: 3,
            padding: "5px",
            borderRadius: 16,
            border: "1px solid var(--card-border-soft)",
            background: "var(--card-bg)",
            flexWrap: "wrap",
          }}>
            {[
              { key: "overview",    label: "Overview",          Icon: LayoutDashboard },
              { key: "students",    label: "Students",          Icon: Users },
              { key: "profiles",    label: "Student Profiles",  Icon: UserCircle },
              { key: "practice",    label: "Speaking & Delivery", Icon: Mic },
              { key: "jobs",        label: "Job Profiles",      Icon: Briefcase },
              { key: "assignments", label: "Assignments",       Icon: ClipboardList },
              { key: "outcomes",    label: "Outcomes",          Icon: TrendingUp },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              const cohortSuffix = activeCohort !== "all" ? `&cohort=${activeCohort}` : "";
              return (
                <Link
                  key={tab.key}
                  href={`/admin?tab=${tab.key}${cohortSuffix}`}
                  style={{ textDecoration: "none", flex: "0 0 auto" }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 11,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: isActive ? "var(--accent)" : "transparent",
                    color: isActive ? "#fff" : "var(--text-muted)",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                  }}>
                    <tab.Icon size={14} />
                    {tab.label}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Secondary controls: cohort filter + quick links + export */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Cohort
              </span>
              {[
                { key: "all", label: "All" },
                { key: "high", label: "High-performing" },
                { key: "mid", label: "Mid-tier" },
                { key: "low", label: "Needs support" },
              ].map((item) => {
                const active = activeCohort === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.key === "all" ? `/admin?tab=${activeTab}` : `/admin?cohort=${item.key}&tab=${activeTab}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div style={{
                      padding: "5px 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      border: active ? "1px solid var(--accent-strong)" : "1px solid var(--card-border-soft)",
                      background: active ? "var(--accent-soft)" : "transparent",
                      color: active ? "var(--accent)" : "var(--text-muted)",
                      cursor: "pointer",
                    }}>
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Link href="/admin/roster" style={{ textDecoration: "none" }}>
                <div style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, border: "1px solid var(--card-border-soft)", color: "var(--text-muted)", cursor: "pointer" }}>
                  Roster
                </div>
              </Link>
              <Link href="/admin/compliance" style={{ textDecoration: "none" }}>
                <div style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, border: "1px solid rgba(22,163,74,0.25)", background: "rgba(22,163,74,0.05)", color: "#16A34A", cursor: "pointer" }}>
                  FERPA
                </div>
              </Link>
              <a href="/api/admin/export" style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", color: "var(--accent)", textDecoration: "none" }}>
                Export
              </a>
            </div>
          </div>
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gap: 28 }}>

            {/* ── Section 1: AT A GLANCE ──────────────────────────────── */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 14 }}>
                At a Glance
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 20,
                }}
              >
                <KpiCard
                  label="Students Enrolled"
                  value={String(filteredStudents.length)}
                  subtext={
                    activeCohort === "all"
                      ? "Total students in this tenant."
                      : "Students in the selected cohort."
                  }
                />
                <KpiCard
                  label="Total Sessions"
                  value={String(totalAttempts)}
                  subtext={`Interview: ${filteredInterviewAttempts.length} · Networking: ${filteredNetworkingAttempts.length} · Speaking: ${filteredPsAttempts.length}`}
                />
                <KpiCard
                  label="Avg Score"
                  value={avgScoreDisplay}
                  subtext="Average speaking score across all practice modules."
                />
                <KpiCard
                  label="Active This Week"
                  value={String(activeThisWeek)}
                  subtext="Sessions completed in the last 7 days."
                />
              </div>
            </div>

            {/* ── Section 2: ENGAGEMENT SIGNALS ───────────────────────── */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 14 }}>
                Engagement Signals
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr",
                  gap: 22,
                }}
              >
                {/* Score Trend */}
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

                {/* Engagement Funnel */}
                {(() => {
                  const total = filteredStudents.length;
                  const funnelSteps = [
                    { label: "Enrolled", count: total, desc: "Total students in this cohort" },
                    { label: "Started", count: filteredStudents.filter((s) => s.attempts > 0).length, desc: "Completed at least 1 attempt" },
                    { label: "Building habit", count: filteredStudents.filter((s) => s.attempts >= 3).length, desc: "3 or more attempts" },
                    { label: "Active", count: filteredStudents.filter((s) => s.attempts >= 10).length, desc: "10 or more attempts" },
                    { label: "High-performing", count: filteredStudents.filter((s) => (s.avgScore100 ?? 0) >= 80).length, desc: "Avg score 80+ (interview-ready)" },
                  ];
                  return (
                    <Panel eyebrow="Student Journey" title="Engagement Funnel">
                      <div style={{ display: "grid", gap: 8 }}>
                        {funnelSteps.map((step, i) => {
                          const pct = total > 0 ? Math.round((step.count / total) * 100) : 0;
                          const opacity = 1 - i * 0.12;
                          return (
                            <div key={step.label} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{step.label}</div>
                                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{step.desc}</div>
                                </div>
                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>{step.count}</div>
                                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{pct}%</div>
                                </div>
                              </div>
                              <div style={{ height: 5, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 99, opacity }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Panel>
                  );
                })()}
              </div>
            </div>

            {/* ── Section 3: NEEDS ATTENTION ──────────────────────────── */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 14 }}>
                Needs Attention
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
                {/* At-Risk Students */}
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

                {/* Category Performance */}
                {(() => {
                  const catScoreMap = new Map<string, number[]>();
                  for (const a of filteredAttempts) {
                    const raw = safeLabel(a.questionCategory, "other");
                    const label = titleCaseLabel(raw);
                    const score = getAttemptScore(a);
                    if (score !== null) {
                      if (!catScoreMap.has(label)) catScoreMap.set(label, []);
                      catScoreMap.get(label)!.push(score);
                    }
                  }
                  const catPerf = Array.from(catScoreMap.entries())
                    .map(([label, scores]) => ({
                      label,
                      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
                      count: scores.length,
                    }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 6);

                  return (
                    <Panel eyebrow="Skill Breakdown" title="Category Performance">
                      {catPerf.length === 0 ? (
                        <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                          No scored attempts yet. Category performance data will appear once students practice.
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {catPerf.map((cat) => {
                            const color = cat.avg >= 75 ? "#10B981" : cat.avg >= 60 ? "#F59E0B" : "var(--chart-critical)";
                            return (
                              <div key={cat.label} style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{cat.label}</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{cat.count} attempts</span>
                                    <span style={{ fontSize: 14, fontWeight: 700, color }}>{cat.avg}</span>
                                  </div>
                                </div>
                                <div style={{ height: 5, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${cat.avg}%`, background: color, borderRadius: 99 }} />
                                </div>
                              </div>
                            );
                          })}
                          <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, paddingTop: 4 }}>
                            Scores shown as 0–100 average per category. Categories below 60 suggest cohort-wide coaching opportunity.
                          </div>
                        </div>
                      )}
                    </Panel>
                  );
                })()}
              </div>
            </div>

          </div>
        )}

        {/* ── STUDENTS TAB ─────────────────────────────────────────────── */}
        {activeTab === "students" && (
          <div style={{ display: "grid", gap: 22 }}>
            <BulkEnrollForm />

            {/* Full Student Roster */}
            <GlowCard padding={24} radius={22}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>
                    Student Roster
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: -0.3, color: "var(--text-primary)" }}>
                    {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
                    {activeCohort !== "all" ? ` · ${activeCohort} cohort` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 12 }}>
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
                gridTemplateColumns: "1.6fr 80px 80px 80px 80px 80px 100px 110px 36px",
                gap: 12,
                padding: "0 16px 10px 16px",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.6,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                borderBottom: "1px solid var(--card-border-soft)",
                marginBottom: 4,
              }}>
                <div>Student</div>
                <div>Score</div>
                <div>Comm</div>
                <div>Conf</div>
                <div>Trend</div>
                <div>Productivity</div>
                <div>Attempts</div>
                <div>Last Active</div>
                <div />
              </div>

              <div style={{ display: "grid", gap: 0 }}>
                {attemptsByUser.length > 0 ? attemptsByUser.map((row, rowIndex) => {
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
                        gridTemplateColumns: "1.6fr 80px 80px 80px 80px 80px 100px 110px 36px",
                        gap: 12,
                        alignItems: "center",
                        padding: "11px 16px",
                        borderRadius: 12,
                        border: "1px solid var(--card-border-soft)",
                        background: rowIndex % 2 === 0 ? "var(--card-bg)" : "var(--card-bg-strong)",
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

                        {/* Productivity cell */}
                        {(() => {
                          const prod = row.productivity;
                          if (!prod) return <div style={{ fontSize: 11, color: "var(--text-muted)" }}> - </div>;
                          const grade = productivityGrade(prod.score);
                          const missedColor = prod.missedDeadlines > 0 ? "#EF4444" : "var(--text-muted)";
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <div style={{ fontSize: 12, fontWeight: 900, color: prod.color }}>{grade}</div>
                              {prod.missedDeadlines > 0 && (
                                <div style={{ fontSize: 10, fontWeight: 700, color: missedColor }}>
                                  {prod.missedDeadlines} missed
                                </div>
                              )}
                              {prod.avgDaysScheduledInAdvance !== null && (
                                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                                  {prod.avgDaysScheduledInAdvance}d ahead
                                </div>
                              )}
                            </div>
                          );
                        })()}

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

            {/* Top Movers */}
            {(() => {
              const topMovers = filteredStudents
                .filter((s) => s.trendDelta !== null && s.trendDelta > 0)
                .sort((a, b) => (b.trendDelta ?? 0) - (a.trendDelta ?? 0))
                .slice(0, 5);
              if (topMovers.length === 0) return null;
              return (
                <Panel eyebrow="Progress" title="Top Movers">
                  <div style={{ display: "grid", gap: 8 }}>
                    {topMovers.map((s) => (
                      <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)" }}>{s.name}</div>
                          <div style={{ marginTop: 3, fontSize: 11, color: "var(--text-muted)" }}>{s.attempts} rep{s.attempts !== 1 ? "s" : ""} · Score: {s.avgScore100 ?? " - "}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: "var(--chart-positive)", whiteSpace: "nowrap" }}>
                          ↑ +{s.trendDelta} pts
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              );
            })()}

            {/* ── Cohort Productivity Panel ─────────────────────────────── */}
            {(() => {
              const withProd = filteredStudents.filter((s) => s.productivity !== null);
              if (withProd.length === 0) return null;

              // KPI aggregates
              const avgScore = Math.round(
                withProd.reduce((sum, s) => sum + s.productivity!.score, 0) / withProd.length
              );
              const totalMissed = withProd.reduce((sum, s) => sum + s.productivity!.missedDeadlines, 0);
              const studentsWithMissed = withProd.filter((s) => s.productivity!.missedDeadlines > 0).length;

              const advanceValues = withProd
                .map((s) => s.productivity!.avgDaysScheduledInAdvance)
                .filter((v): v is number => v !== null);
              const avgAdvance = advanceValues.length
                ? Math.round((advanceValues.reduce((a, b) => a + b, 0) / advanceValues.length) * 10) / 10
                : null;

              const earlyValues = withProd
                .map((s) => s.productivity!.avgDaysEarlyOnCompletion)
                .filter((v): v is number => v !== null);
              const avgEarly = earlyValues.length
                ? Math.round((earlyValues.reduce((a, b) => a + b, 0) / earlyValues.length) * 10) / 10
                : null;

              const labelCounts = { "Excellent": 0, "Strong": 0, "Building": 0, "Getting Started": 0 };
              for (const s of withProd) labelCounts[s.productivity!.label]++;

              // Students with most missed deadlines - for intervention list
              const missedLeaderboard = [...withProd]
                .filter((s) => s.productivity!.missedDeadlines > 0)
                .sort((a, b) => b.productivity!.missedDeadlines - a.productivity!.missedDeadlines)
                .slice(0, 5);

              return (
                <Panel eyebrow="Productivity" title="Cohort Productivity">

                  {/* Top KPIs */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>
                    {[
                      { label: "Avg Score", value: `${avgScore}`, sub: "composite" },
                      { label: "Missed Deadlines", value: `${totalMissed}`, sub: `${studentsWithMissed} student${studentsWithMissed !== 1 ? "s" : ""}`, color: totalMissed > 0 ? "#EF4444" : undefined },
                      { label: "Avg Days Scheduled Ahead", value: avgAdvance !== null ? `${avgAdvance}d` : "-", sub: "before due date" },
                      { label: "Avg Time on Completion", value: avgEarly !== null ? (avgEarly >= 0 ? `${avgEarly}d early` : `${Math.abs(avgEarly)}d late`) : "-", sub: "vs deadline", color: avgEarly !== null && avgEarly < 0 ? "#EF4444" : avgEarly !== null && avgEarly >= 1 ? "#10B981" : undefined },
                    ].map((kpi) => (
                      <div key={kpi.label} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--card-border-soft)" }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: kpi.color ?? "var(--text-primary)" }}>{kpi.value}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>{kpi.label}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{kpi.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Missed deadlines leaderboard */}
                  {missedLeaderboard.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.5, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                        Most Missed Deadlines
                      </div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {missedLeaderboard.map((s) => (
                          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                            <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{s.name}</span>
                            <span style={{ color: "#EF4444", fontWeight: 900 }}>{s.productivity!.missedDeadlines} missed</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tier breakdown */}
                  <div style={{ display: "grid", gap: 6 }}>
                    {(["Excellent", "Strong", "Building", "Getting Started"] as const).map((label) => {
                      const count = labelCounts[label];
                      const pct = withProd.length > 0 ? Math.round((count / withProd.length) * 100) : 0;
                      const color = label === "Excellent" ? "#10B981" : label === "Strong" ? "#2563EB" : label === "Building" ? "#F59E0B" : "#6B7280";
                      return (
                        <div key={label}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>
                            <span>{label}</span>
                            <span style={{ color }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 999, background: "var(--card-border-soft)" }}>
                            <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: color, transition: "width 0.3s" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              );
            })()}
          </div>
        )}

        {/* ── PROFILES TAB ─────────────────────────────────────────────── */}
        {activeTab === "profiles" && (() => {
          const atRisk = studentsWithStats.filter(
            (s) => s.completeness < 30 || (s.daysSinceActive !== null && s.daysSinceActive > 30 && s.attempts < 5)
          );
          const avgCompleteness = studentsWithStats.length
            ? Math.round(studentsWithStats.reduce((sum, s) => sum + s.completeness, 0) / studentsWithStats.length)
            : 0;
          const fullyProfiled = studentsWithStats.filter((s) => s.completeness >= 80).length;
          const majorCounts: Record<string, number> = {};
          const roleCounts: Record<string, number> = {};
          const industryCounts2: Record<string, number> = {};
          for (const s of studentsWithStats) {
            if (s.major) majorCounts[s.major] = (majorCounts[s.major] ?? 0) + 1;
            if (s.targetRole) roleCounts[s.targetRole] = (roleCounts[s.targetRole] ?? 0) + 1;
            if (s.targetIndustry) industryCounts2[s.targetIndustry] = (industryCounts2[s.targetIndustry] ?? 0) + 1;
          }
          const topMajors = Object.entries(majorCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
          const topRoles = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
          const topIndustries2 = Object.entries(industryCounts2).sort((a, b) => b[1] - a[1]).slice(0, 6);

          const COMPLETENESS_COLS = [
            { key: "graduationYear", label: "Grad Year" },
            { key: "major", label: "Major" },
            { key: "targetRole", label: "Target Role" },
            { key: "targetIndustry", label: "Industry" },
            { key: "attempts5", label: "Interview" },
            { key: "networking1", label: "Networking" },
            { key: "ps1", label: "Pub. Speaking" },
            { key: "hasAptitude", label: "Aptitude" },
            { key: "hasCheckIn", label: "Check-In" },
            { key: "hasInterview", label: "Pipeline" },
          ] as const;

          return (
            <div style={{ display: "grid", gap: 18 }}>

              {/* KPI row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                {[
                  { label: "Avg Completeness", value: `${avgCompleteness}%`, sub: "across all students" },
                  { label: "Fully Profiled", value: `${fullyProfiled}`, sub: "≥80% complete" },
                  { label: "At-Risk Students", value: `${atRisk.length}`, sub: "need outreach" },
                  { label: "Skills Extracted", value: `${skillsByUser.length}`, sub: "across cohort" },
                ].map((kpi) => (
                  <GlowCard key={kpi.label} padding={20} radius={18}>
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>{kpi.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.5 }}>{kpi.value}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{kpi.sub}</div>
                  </GlowCard>
                ))}
              </div>

              {/* Profile completeness heatmap */}
              <GlowCard padding={22} radius={22}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.7, color: "var(--accent)", textTransform: "uppercase", marginBottom: 4 }}>Profile Completeness</div>
                <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: -0.3, color: "var(--text-primary)", marginBottom: 16 }}>Student-by-Category Heatmap</div>

                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: `180px repeat(${COMPLETENESS_COLS.length}, 1fr) 80px`, gap: 4, marginBottom: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase" }}>Student</div>
                  {COMPLETENESS_COLS.map((col) => (
                    <div key={col.key} style={{ fontSize: 9, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", textAlign: "center", lineHeight: 1.3 }}>{col.label}</div>
                  ))}
                  <div style={{ fontSize: 10, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", textAlign: "center" }}>Score</div>
                </div>

                <div style={{ display: "grid", gap: 3 }}>
                  {studentsWithStats.sort((a, b) => b.completeness - a.completeness).map((s) => {
                    const cells = [
                      !!s.graduationYear,
                      !!s.major,
                      !!s.targetRole,
                      !!s.targetIndustry,
                      s.interviewAttemptCount >= 5,
                      s.networkingAttemptCount >= 1,
                      s.psAttemptCount >= 1,
                      s.hasAptitude,
                      s.hasCheckIn,
                      s.hasInterview,
                    ];
                    const completenessColor = s.completeness >= 80 ? "#10B981" : s.completeness >= 50 ? "#F59E0B" : "#EF4444";
                    return (
                      <div key={s.id} style={{ display: "grid", gridTemplateColumns: `180px repeat(${COMPLETENESS_COLS.length}, 1fr) 80px`, gap: 4, alignItems: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                        {cells.map((filled, i) => (
                          <div key={i} style={{ height: 20, borderRadius: 4, background: filled ? "#10B98130" : "var(--card-border-soft)", border: `1px solid ${filled ? "#10B98150" : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: filled ? "#10B981" : "transparent" }}>
                            {filled ? "✓" : ""}
                          </div>
                        ))}
                        <div style={{ textAlign: "center", fontSize: 12, fontWeight: 900, color: completenessColor }}>{s.completeness}%</div>
                      </div>
                    );
                  })}
                </div>
              </GlowCard>

              {/* At-risk students */}
              {atRisk.length > 0 && (
                <GlowCard padding={22} radius={22}>
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.7, color: "#EF4444", textTransform: "uppercase", marginBottom: 4 }}>Needs Outreach</div>
                  <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: -0.3, color: "var(--text-primary)", marginBottom: 16 }}>At-Risk Students ({atRisk.length})</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {atRisk.map((s) => {
                      const reasons: string[] = [];
                      if (s.completeness < 30) reasons.push("profile incomplete");
                      if (s.daysSinceActive !== null && s.daysSinceActive > 30) reasons.push(`inactive ${s.daysSinceActive}d`);
                      if (s.attempts < 5) reasons.push(`only ${s.attempts} session${s.attempts !== 1 ? "s" : ""}`);
                      return (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)" }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.email}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {reasons.map((r) => (
                              <span key={r} style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>{r}</span>
                            ))}
                            <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "var(--card-bg-strong)", color: "var(--text-muted)" }}>{s.completeness}% complete</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GlowCard>
              )}

              {/* Cohort demographics */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                {[
                  { title: "Top Majors", data: topMajors },
                  { title: "Target Roles", data: topRoles },
                  { title: "Target Industries", data: topIndustries2 },
                ].map(({ title, data }) => (
                  <GlowCard key={title} padding={20} radius={18}>
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>{title}</div>
                    {data.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No data yet</div>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {data.map(([label, count]) => {
                          const pct = Math.round((count / studentsWithStats.length) * 100);
                          return (
                            <div key={label}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{label}</span>
                                <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{count}</span>
                              </div>
                              <div style={{ height: 6, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: "var(--accent)" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </GlowCard>
                ))}
              </div>

              {/* Cohort skills inventory */}
              {/* Networking + Public Speaking cohort breakdown */}
              {(() => {
                const networkingStudents = studentsWithStats.filter((s) => s.networkingAttemptCount > 0);
                const psStudents = studentsWithStats.filter((s) => s.psAttemptCount > 0);
                const pitchStyleCounts: Record<string, number> = {};
                const archetypeCounts: Record<string, number> = {};
                for (const s of studentsWithStats) {
                  if (s.topPitchStyle) pitchStyleCounts[s.topPitchStyle] = (pitchStyleCounts[s.topPitchStyle] ?? 0) + 1;
                  if (s.topArchetype) archetypeCounts[s.topArchetype] = (archetypeCounts[s.topArchetype] ?? 0) + 1;
                }
                if (networkingStudents.length === 0 && psStudents.length === 0) return null;
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <GlowCard padding={20} radius={18}>
                      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Networking</div>
                      <div style={{ fontSize: 16, fontWeight: 950, color: "var(--text-primary)", marginBottom: 12 }}>
                        {networkingStudents.length} student{networkingStudents.length !== 1 ? "s" : ""} practiced · {attempts.filter((a) => a.evaluationFramework === "networking_pitch").length} total pitches
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>Pitch Style Distribution</div>
                      {Object.keys(pitchStyleCounts).length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No data yet</div>
                      ) : (
                        <div style={{ display: "grid", gap: 6 }}>
                          {Object.entries(pitchStyleCounts).sort((a, b) => b[1] - a[1]).map(([style, count]) => (
                            <div key={style} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" }}>{style.replace(/_/g, " ")}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 80, height: 6, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                                  <div style={{ width: `${Math.round((count / networkingStudents.length) * 100)}%`, height: "100%", background: "#2563EB", borderRadius: 99 }} />
                                </div>
                                <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 16, textAlign: "right" }}>{count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </GlowCard>
                    <GlowCard padding={20} radius={18}>
                      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Public Speaking</div>
                      <div style={{ fontSize: 16, fontWeight: 950, color: "var(--text-primary)", marginBottom: 12 }}>
                        {psStudents.length} student{psStudents.length !== 1 ? "s" : ""} practiced · {attempts.filter((a) => a.evaluationFramework === "public_speaking").length} total sessions
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>Delivery Archetype Distribution</div>
                      {Object.keys(archetypeCounts).length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No data yet</div>
                      ) : (
                        <div style={{ display: "grid", gap: 6 }}>
                          {Object.entries(archetypeCounts).sort((a, b) => b[1] - a[1]).map(([arch, count]) => (
                            <div key={arch} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" }}>{arch}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 80, height: 6, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                                  <div style={{ width: `${Math.round((count / psStudents.length) * 100)}%`, height: "100%", background: "#8B5CF6", borderRadius: 99 }} />
                                </div>
                                <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 16, textAlign: "right" }}>{count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </GlowCard>
                  </div>
                );
              })()}

              {topCohortSkills.length > 0 && (
                <GlowCard padding={22} radius={22}>
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.7, color: "var(--accent)", textTransform: "uppercase", marginBottom: 4 }}>AI-Extracted</div>
                  <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: -0.3, color: "var(--text-primary)", marginBottom: 16 }}>Cohort Skills Inventory</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {topCohortSkills.map(({ skill, count, category }) => {
                      const catColors: Record<string, string> = {
                        technical: "#2563EB", communication: "#10B981", leadership: "#8B5CF6",
                        analytical: "#F59E0B", interpersonal: "#EC4899", domain: "#0EA5E9",
                      };
                      const color = catColors[category] ?? "#6B7280";
                      return (
                        <div key={skill} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 99, border: `1px solid ${color}30`, background: `${color}10` }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color }}>{skill}</span>
                          <span style={{ fontSize: 10, fontWeight: 900, color, opacity: 0.7 }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)" }}>
                    Skills are automatically extracted from student interview transcripts via AI. Run "Extract Skills" from a student's profile to update.
                  </div>
                </GlowCard>
              )}

            </div>
          );
        })()}

        {/* ── PRACTICE TAB ─────────────────────────────────────────────── */}
        {activeTab === "practice" && (
          <div style={{ display: "grid", gap: 18 }}>
            {/* Module breakdown row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { label: "Interview Prep", count: filteredInterviewAttempts.length, color: "#2563EB", icon: "🎤", desc: "Behavioral & STAR practice" },
                { label: "Networking", count: filteredNetworkingAttempts.length, color: "#10B981", icon: "🤝", desc: "Elevator pitch sessions" },
                { label: "Public Speaking", count: filteredPsAttempts.length, color: "#8B5CF6", icon: "📢", desc: "Presentation & speaking" },
              ].map(({ label, count, color, icon, desc }) => (
                <div key={label} style={{ padding: "16px 18px", borderRadius: 14, border: `1px solid ${color}25`, background: `${color}08` }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 950, color: "var(--text-primary)", lineHeight: 1 }}>{count}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{desc}</div>
                </div>
              ))}
            </div>

            {/* Engagement Overview + Speaking Metrics */}
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
                    label="Sessions w/ Voice Data"
                    value={`${spokenRate}%`}
                    subtext="Share of sessions with speaking analytics."
                  />
                  <SmallMetric
                    label="Avg Speaking Score"
                    value={avgScoreDisplay}
                    subtext="Across all speaking modules."
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
                    {activeCohort === "all" ? "All students" : `The ${activeCohort} cohort`} average{" "}
                    <strong>{avgScoreDisplay}</strong> across speaking sessions, with communication at{" "}
                    <strong>{avgCommunicationDisplay}</strong> and confidence at{" "}
                    <strong>{avgConfidenceDisplay}</strong>.{" "}
                    Sessions break down as: <strong>{filteredInterviewAttempts.length}</strong> interview,{" "}
                    <strong>{filteredNetworkingAttempts.length}</strong> networking, and{" "}
                    <strong>{filteredPsAttempts.length}</strong> public speaking.{" "}
                    {atRiskPct === 0
                      ? "No students are currently below the readiness target."
                      : <><strong>{atRiskPct}%</strong> of students may benefit from targeted coaching support.</>
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
                  <MiniBar
                    label="Pitch Variety (Hz std dev)"
                    value={avgPitchStd ?? 0}
                    max={80}
                    suffix=" Hz"
                  />
                  <MiniBar
                    label="Energy Variation"
                    value={avgEnergyVariation ?? 0}
                    max={1}
                    suffix=""
                  />
                  <MiniBar
                    label="Avg Pause Duration"
                    value={avgPauseMs ? Math.round(avgPauseMs / 100) / 10 : 0}
                    max={3}
                    suffix=" s"
                  />
                </div>
              </Panel>
            </div>

            {/* NACE Competency Cohort Panel */}
            <Panel eyebrow="NACE Career Readiness" title="Competency Scores - Cohort Average" minHeight={280}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.6 }}>
                Average student performance across the 8 NACE career readiness competencies, computed from interview, networking, and public speaking sessions.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(Object.keys(NACE_META) as NaceKey[]).map((key) => {
                  const score = naceCohort[key];
                  const color = naceScoreColor(score);
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                        background: score !== null ? color + "18" : "var(--card-bg-strong)",
                        border: `1px solid ${score !== null ? color + "40" : "var(--card-border)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 900, color: score !== null ? color : "var(--text-muted)",
                      }}>
                        {score ?? "-"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-primary)", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {NACE_META[key].shortLabel}
                        </div>
                        <div style={{ height: 4, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${score ?? 0}%`, background: color, borderRadius: 99 }} />
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                          {naceScoreLabel(score)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* Top Weaknesses + Question Category Demand + Role Readiness */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 18,
              }}
            >
              <Panel eyebrow="Insights" title="Top Weaknesses" minHeight={280}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
                  Most common areas where students struggle across speaking sessions
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

            {/* Coaching Summary pills */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12 }}>
              <MetricPill label="Communication" value={avgCommunicationDisplay} />
              <MetricPill label="Confidence" value={avgConfidenceDisplay} />
              <MetricPill label="Spoken Attempts" value={`${spokenRate}%`} />
              <MetricPill label="Most Common Gap" value={weaknessRows[0]?.label ?? "Still emerging"} />
              <MetricPill label="Avg Result Impact" value={avgResultImpact !== null ? String(avgResultImpact) : " - "} />
            </div>

            {/* Practice Frequency + Score Distribution */}
            {(() => {
              const total = filteredStudents.length;
              const freqBands = [
                { label: "Not started", min: 0, max: 0 },
                { label: "Just started", min: 1, max: 2 },
                { label: "Building habit", min: 3, max: 5 },
                { label: "Active", min: 6, max: 10 },
                { label: "Power user", min: 11, max: Infinity },
              ].map((band) => {
                const count = filteredStudents.filter(
                  (s) => s.attempts >= band.min && s.attempts <= band.max
                ).length;
                return { ...band, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
              });

              const scoreBands = [
                { label: "Not attempted", color: "var(--text-muted)" },
                { label: "Needs support", color: "var(--chart-critical)" },
                { label: "Developing", color: "#F59E0B" },
                { label: "Ready", color: "var(--accent)" },
                { label: "High performer", color: "var(--chart-positive)" },
              ].map((band, i) => {
                const count = filteredStudents.filter((s) => {
                  if (i === 0) return s.avgScore100 === null;
                  if (i === 1) return s.avgScore100 !== null && s.avgScore100 < 50;
                  if (i === 2) return s.avgScore100 !== null && s.avgScore100 >= 50 && s.avgScore100 < 65;
                  if (i === 3) return s.avgScore100 !== null && s.avgScore100 >= 65 && s.avgScore100 < 80;
                  return s.avgScore100 !== null && s.avgScore100 >= 80;
                }).length;
                return { ...band, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
              });

              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <Panel eyebrow="Engagement" title="Practice Frequency">
                    <div style={{ display: "grid", gap: 8 }}>
                      {freqBands.map((band) => (
                        <div key={band.label} style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)" }}>{band.label}</div>
                            <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)" }}>{band.count} ({band.pct}%)</div>
                          </div>
                          <div style={{ height: 7, borderRadius: 999, background: "var(--card-border-soft)", overflow: "hidden" }}>
                            <div style={{ width: `${band.pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, var(--accent-2-soft), var(--accent-soft))" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel eyebrow="Performance" title="Score Distribution">
                    <div style={{ display: "flex", height: 18, borderRadius: 999, overflow: "hidden", marginBottom: 14 }}>
                      {scoreBands.map((band) =>
                        band.pct > 0 ? (
                          <div key={band.label} title={`${band.label}: ${band.pct}%`} style={{ width: `${band.pct}%`, background: band.color, transition: "width 0.3s ease" }} />
                        ) : null
                      )}
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {scoreBands.map((band) => (
                        <div key={band.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 12, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 999, background: band.color, flexShrink: 0 }} />
                            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)" }}>{band.label}</div>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)" }}>{band.count} ({band.pct}%)</div>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── JOBS TAB ─────────────────────────────────────────────────── */}
        {activeTab === "jobs" && (
          <div style={{ display: "grid", gap: 18 }}>
            {(() => {
              const roleList = Array.from(roleGroups.values())
                .map((g) => ({
                  label: g.label,
                  company: g.company,
                  roleType: g.roleType,
                  studentCount: new Set(g.attempts.map((a) => a.userId)).size,
                  attemptCount: g.attempts.length,
                }))
                .sort((a, b) => b.attemptCount - a.attemptCount)
                .slice(0, 6);

              return (
                <Panel eyebrow="Targeting" title="Job Profile Targeting">
                  {roleList.length === 0 ? (
                    <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                      No job profiles in use yet. Students can select a target role when practicing.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {roleList.map((r) => (
                        <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)" }}>{r.label}</div>
                            {(r.company || r.roleType) && (
                              <div style={{ marginTop: 3, fontSize: 11, color: "var(--text-muted)" }}>
                                {[r.company, r.roleType].filter(Boolean).join(" · ")}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)" }}>{r.studentCount} student{r.studentCount !== 1 ? "s" : ""}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>{r.attemptCount} attempt{r.attemptCount !== 1 ? "s" : ""}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              );
            })()}
          </div>
        )}

        {/* ── ASSIGNMENTS TAB ──────────────────────────────────────────── */}
        {activeTab === "assignments" && (
          <div style={{ display: "grid", gap: 18 }}>
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
          </div>
        )}

        {/* ── OUTCOMES TAB ─────────────────────────────────────────────── */}
        {activeTab === "outcomes" && (
          <div style={{ display: "grid", gap: 18 }}>
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
                  {/* KPI row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                    {[
                      { label: "Check-ins submitted", value: `${checkInCount}`, sub: `${checkInCoverage ?? "-"}% of cohort`, color: "var(--accent)" },
                      { label: "Employment rate", value: employmentRate !== null ? `${employmentRate}%` : "-", sub: "full-time", color: "#10B981" },
                      { label: "6-mo placement", value: earlyPlacementRate !== null ? `${earlyPlacementRate}%` : "-", sub: "within 6 mo of grad", color: "#0EA5E9" },
                      { label: "Avg starting salary", value: avgSalary ? `$${Math.round(avgSalary / 1000)}K` : "-", sub: "employed students", color: "#F59E0B" },
                      { label: "Avg satisfaction", value: avgSatisfaction ? `${avgSatisfaction}/5` : "-", sub: "career satisfaction", color: "#8B5CF6" },
                    ].map((stat) => (
                      <div key={stat.label} style={{ padding: "14px 16px", borderRadius: 14, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)", textAlign: "center" }}>
                        <div style={{ fontSize: 26, fontWeight: 950, color: stat.color }}>{stat.value}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginTop: 4 }}>{stat.label}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{stat.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {/* Employment status breakdown */}
                    <div style={{ padding: 16, borderRadius: 14, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                      <div style={{ fontSize: 12, fontWeight: 950, color: "var(--text-primary)", marginBottom: 12 }}>Employment status</div>
                      {(["employed", "employed_part", "job_searching", "graduate_school", "freelance", "other"] as const).map((status) => {
                        const count = uniqueCheckIns.filter((c) => c.employmentStatus === status).length;
                        if (count === 0) return null;
                        const pct = Math.round((count / checkInCount) * 100);
                        const labels: Record<string, string> = { employed: "Employed full-time", employed_part: "Part-time / contract", job_searching: "Job searching", graduate_school: "Graduate school", freelance: "Freelance", other: "Other" };
                        const colors: Record<string, string> = { employed: "#10B981", employed_part: "#6EE7B7", job_searching: "#F59E0B", graduate_school: "var(--accent)", freelance: "#8B5CF6", other: "var(--text-muted)" };
                        return (
                          <div key={status} style={{ marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
                              <span>{labels[status]}</span><span>{count} ({pct}%)</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: colors[status], borderRadius: 99 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Salary distribution */}
                    <div style={{ padding: 16, borderRadius: 14, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                      <div style={{ fontSize: 12, fontWeight: 950, color: "var(--text-primary)", marginBottom: 12 }}>Salary distribution</div>
                      {salaryBands.length === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No salary data yet.</div>
                      ) : salaryBands.map(([band, count]) => {
                        const labels: Record<string, string> = { under_40k: "Under $40K", "40_50k": "$40–50K", "50_60k": "$50–60K", "60_75k": "$60–75K", "75_90k": "$75–90K", "90_110k": "$90–110K", "110_130k": "$110–130K", over_130k: "$130K+" };
                        const pct = Math.round((count / checkInCount) * 100);
                        return (
                          <div key={band} style={{ marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>
                              <span>{labels[band] ?? band}</span><span>{count} ({pct}%)</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: "#F59E0B", borderRadius: 99 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {/* Top industries */}
                    {topIndustries.length > 0 && (
                      <div style={{ padding: 16, borderRadius: 14, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                        <div style={{ fontSize: 12, fontWeight: 950, color: "var(--text-primary)", marginBottom: 10 }}>Top industries</div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {topIndustries.map(([industry, count]) => {
                            const pct = Math.round((count / checkInCount) * 100);
                            return (
                              <div key={industry}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 3 }}>
                                  <span>{industry}</span><span>{count} ({pct}%)</span>
                                </div>
                                <div style={{ height: 5, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 99 }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Top employers */}
                    {topEmployers.length > 0 && (
                      <div style={{ padding: 16, borderRadius: 14, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                        <div style={{ fontSize: 12, fontWeight: 950, color: "var(--text-primary)", marginBottom: 10 }}>Top employers</div>
                        <div style={{ display: "grid", gap: 6 }}>
                          {topEmployers.map(([company, count]) => (
                            <div key={company} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                              <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{company}</span>
                              <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "rgba(37,99,235,0.1)", color: "var(--accent)" }}>{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                    Data is self-reported by students via the Career Guide check-in. {checkInCoverage !== null && checkInCoverage < 60 && `Only ${checkInCoverage}% of students have submitted a check-in - encourage more submissions for accurate cohort data.`}
                  </div>
                </div>
              )}
            </Panel>
          </div>
        )}

      </div>
    </PremiumShell>
  );
}