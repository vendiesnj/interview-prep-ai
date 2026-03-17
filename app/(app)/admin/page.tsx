import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { ReactNode } from "react";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";

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

function normalizeOverallTo10(value: number | null) {
  if (value === null) return null;
  return value > 10 ? value / 10 : value;
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
  return num(a.score ?? a.feedback?.score);
}

function getAttemptComm(a: AttemptRow) {
  return num(a.communicationScore ?? a.feedback?.communication_score);
}

function getAttemptConf(a: AttemptRow) {
  return num(a.confidenceScore ?? a.feedback?.confidence_score);
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
  return num(a.feedback?.star?.result);
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
  children: ReactNode;
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
            background: gradient,
            boxShadow: "var(--shadow-glow)",
          }}
        />
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <div style={{ padding: 40, color: "var(--text-primary)" }}>Not authorized</div>;
  }

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

  const tenantUsers = await prisma.user.findMany({
    where: {
      tenantId: currentUser.tenantId ?? null,
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
  const totalAttempts = attempts.length;

  const scoreVals = attempts
    .map(getAttemptScore)
    .filter((v): v is number => v !== null);
  const commVals = attempts
    .map(getAttemptComm)
    .filter((v): v is number => v !== null);
  const confVals = attempts
    .map(getAttemptConf)
    .filter((v): v is number => v !== null);

  const avgScore = round1(avg(scoreVals));
  const avgCommunication = round1(avg(commVals));
  const avgConfidence = round1(avg(confVals));

  const attemptsPerStudent =
    totalStudents > 0 ? (totalAttempts / totalStudents).toFixed(1) : "0";

  const spokenAttempts = attempts.filter(
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
      attempts
        .map(getAttemptStarResult)
        .filter((v): v is number => v !== null)
    )
  );

  const weaknessRows = getWeaknessBuckets(attempts).slice(0, 5);

  const categoryMap = new Map<string, number>();
  for (const a of attempts) {
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

  const attemptsByUser = tenantUsers
    .map((user) => {
      const userAttempts = attempts.filter((a) => a.userId === user.id);
      const userScore = round1(
        avg(
          userAttempts
            .map(getAttemptScore)
            .filter((v): v is number => v !== null)
        )
      );

      const latest = userAttempts[0]?.ts ?? null;

      return {
        id: user.id,
        name: user.name || (user.email ? user.email.split("@")[0] : "Student"),
        email: user.email,
        attempts: userAttempts.length,
        avgScore: userScore,
        latest,
      };
    })
    .sort((a, b) => {
      if (b.attempts !== a.attempts) return b.attempts - a.attempts;
      return (b.avgScore ?? -1) - (a.avgScore ?? -1);
    })
    .slice(0, 6);

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

  for (const a of attempts) {
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
      const overall10 = normalizeOverallTo10(avgScoreRole) ?? 6.8;

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

  const avgScoreDisplay = avgScore !== null ? avgScore.toFixed(0) : "—";
  const avgCommunicationDisplay =
    avgCommunication !== null ? `${pctFrom10(avgCommunication)}%` : "—";
  const avgConfidenceDisplay =
    avgConfidence !== null ? `${pctFrom10(avgConfidence)}%` : "—";

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
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          <KpiCard
            label="Students"
            value={String(totalStudents)}
            subtext="Users in the current tenant."
          />
          <KpiCard
            label="Attempts"
            value={String(totalAttempts)}
            subtext="Interview reps captured across this school."
          />
          <KpiCard
            label="Attempts / Student"
            value={attemptsPerStudent}
            subtext="Average practice frequency."
          />
          <KpiCard
            label="Avg Overall Score"
            value={avgScoreDisplay}
            subtext="Average interview score across all attempts."
          />
          <KpiCard
            label="Avg Communication"
            value={avgCommunicationDisplay}
            subtext="Average communication quality."
          />
          <KpiCard
            label="Avg Confidence"
            value={avgConfidenceDisplay}
            subtext="Average confidence signal."
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.35fr 1fr",
            gap: 16,
          }}
        >
          <Panel eyebrow="Overview" title="Engagement Overview" minHeight={300}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <SmallMetric
                label="Practice Volume"
                value={attemptsPerStudent}
                subtext="Average attempts per student."
              />
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
                padding: 16,
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
                Students are averaging <strong>{attemptsPerStudent}</strong> attempts
                each, with an overall interview score of <strong>{avgScoreDisplay}</strong>.
                Communication and confidence are currently at{" "}
                <strong>{avgCommunicationDisplay}</strong> and{" "}
                <strong>{avgConfidenceDisplay}</strong>, giving you a strong baseline
                for school-wide readiness reporting.
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
                label="Closing Impact"
                value={pctFrom10(avgResultImpact) ?? 0}
                max={100}
                suffix="%"
              />
            </div>
          </Panel>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
          }}
        >
          <Panel eyebrow="Insights" title="Top Weaknesses" minHeight={280}>
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
                          : "—",
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            gap: 16,
          }}
        >
          <Panel eyebrow="Student View" title="Student Activity Preview" minHeight={320}>
            <div style={{ display: "grid", gap: 10 }}>
              {attemptsByUser.length > 0 ? (
                attemptsByUser.map((row) => (
                  <Link
                    key={row.id}
                    href={`/admin/students/${row.id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 14,
                        alignItems: "center",
                        padding: "12px 14px",
                        borderRadius: 14,
                        border: "1px solid var(--card-border-soft)",
                        background: "var(--card-bg)",
                        cursor: "pointer",
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
                          {row.name}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: "var(--text-muted)",
                            lineHeight: 1.45,
                          }}
                        >
                          {row.attempts} attempts · avg score{" "}
                          {row.avgScore !== null ? Math.round(row.avgScore) : "—"}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 900,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.latest ? row.latest.toLocaleDateString() : "—"}
                      </div>
                    </div>
                  </Link>
                ))
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
                  Student-level activity will appear once attempts exist.
                </div>
              )}
            </div>
          </Panel>

          <Panel eyebrow="School Summary" title="Coaching Outcome Summary" minHeight={320}>
            <div style={{ display: "grid", gap: 12 }}>
              <MetricPill
                label="Communication Baseline"
                value={avgCommunicationDisplay}
              />
              <MetricPill
                label="Confidence Baseline"
                value={avgConfidenceDisplay}
              />
              <MetricPill
                label="Speaking Coverage"
                value={`${spokenRate}% spoken attempts`}
              />
              <MetricPill
                label="Most Common Focus"
                value={weaknessRows[0]?.label ?? "Still emerging"}
              />
              <div
                style={{
                  marginTop: 4,
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid var(--card-border-soft)",
                  background: "var(--card-bg)",
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "var(--text-muted)",
                }}
              >
                This dashboard reflects real platform usage, actual speaking metrics,
                and role-readiness signals based on the same score, delivery, and
                profile data already powering your student-facing Insights and Results pages.
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </PremiumShell>
  );
}