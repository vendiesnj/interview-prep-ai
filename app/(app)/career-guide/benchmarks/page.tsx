import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import PremiumShell from "@/app/components/PremiumShell";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peer Benchmarks | Career Guide",
};

// ── Salary labels ─────────────────────────────────────────────────────────────
const SALARY_LABELS: Record<string, string> = {
  under_40k: "< $40K",
  "40_50k": "$40–50K",
  "50_60k": "$50–60K",
  "60_75k": "$60–75K",
  "75_90k": "$75–90K",
  "90_110k": "$90–110K",
  "110_130k": "$110–130K",
  over_130k: "$130K+",
};

const SALARY_ORDER = Object.keys(SALARY_LABELS);

const STATUS_LABELS: Record<string, string> = {
  employed: "Employed",
  job_searching: "Job Searching",
  graduate_school: "Graduate School",
  freelance: "Freelance / Contract",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  employed: "#10B981",
  job_searching: "#F59E0B",
  graduate_school: "#8B5CF6",
  freelance: "#0EA5E9",
  other: "#6B7280",
};

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

function BarRow({
  label,
  count,
  total,
  color,
  suffix = "",
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  suffix?: string;
}) {
  const p = pct(count, total);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
          {label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 950, color }}>
          {p}%{suffix && ` · ${suffix}`}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${p}%`,
            background: color,
            borderRadius: 99,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: "22px 24px",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--card-border)",
        background: "var(--card-bg)",
        boxShadow: "var(--shadow-card-soft)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 0.7,
          color: color ?? "var(--accent)",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 950, color: "var(--text-primary)", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function backNav(from?: string) {
  if (from === "pre-college") return { href: "/pre-college", label: "← Pre-College" };
  if (from === "during-college") return { href: "/during-college", label: "← During College" };
  if (from === "post-college") return { href: "/post-college", label: "← Post-College" };
  return { href: "/career-guide", label: "← Career Guide" };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function BenchmarksPage({ searchParams }: { searchParams?: { from?: string } }) {
  const session = await getServerSession(authOptions);

  const user = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, tenantId: true },
      })
    : null;

  // Fetch all check-ins for this tenant (or all if no tenant)
  const whereClause = user?.tenantId ? { tenantId: user.tenantId } : {};
  const allCheckIns = await prisma.careerCheckIn.findMany({
    where: whereClause,
    select: {
      userId: true,
      employmentStatus: true,
      salaryRange: true,
      industry: true,
      satisfactionScore: true,
      has401k: true,
      contribution401kPct: true,
      currentSavingsRange: true,
      studentLoanRange: true,
      universitySatisfaction: true,
      wouldChooseSameUniversity: true,
      universityName: true,
      retirementGoalAge: true,
      monthlyRent: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Deduplicate: take most recent per user
  const seen = new Set<string>();
  const checkIns = allCheckIns.filter((c) => {
    if (seen.has(c.userId)) return false;
    seen.add(c.userId);
    return true;
  });

  const total = checkIns.length;

  const hasData = total >= 3; // Only show real data when we have at least 3 responses

  // ── Compute aggregates ──────────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {};
  const salaryCounts: Record<string, number> = {};
  const industryCounts: Record<string, number> = {};
  let satisfactionSum = 0;
  let satisfactionCount = 0;
  let has401kCount = 0;
  let wouldChooseSameCount = 0;
  let uniSatisfactionSum = 0;
  let uniSatisfactionCount = 0;
  let avgRetirementGoal = 0;
  let retirementGoalCount = 0;
  let avgMonthlyRent = 0;
  let rentCount = 0;
  let avgContrib401k = 0;
  let contrib401kCount = 0;

  for (const c of checkIns) {
    if (c.employmentStatus) statusCounts[c.employmentStatus] = (statusCounts[c.employmentStatus] ?? 0) + 1;
    if (c.salaryRange) salaryCounts[c.salaryRange] = (salaryCounts[c.salaryRange] ?? 0) + 1;
    if (c.industry) industryCounts[c.industry] = (industryCounts[c.industry] ?? 0) + 1;
    if (c.satisfactionScore != null) { satisfactionSum += c.satisfactionScore; satisfactionCount++; }
    if (c.has401k) has401kCount++;
    if (c.wouldChooseSameUniversity) wouldChooseSameCount++;
    if (c.universitySatisfaction != null) { uniSatisfactionSum += c.universitySatisfaction; uniSatisfactionCount++; }
    if (c.retirementGoalAge != null) { avgRetirementGoal += c.retirementGoalAge; retirementGoalCount++; }
    if (c.monthlyRent != null) { avgMonthlyRent += c.monthlyRent; rentCount++; }
    if (c.contribution401kPct != null) { avgContrib401k += c.contribution401kPct; contrib401kCount++; }
  }

  const avgSatisfaction = satisfactionCount ? (satisfactionSum / satisfactionCount).toFixed(1) : null;
  const avgUniSatisfaction = uniSatisfactionCount ? (uniSatisfactionSum / uniSatisfactionCount).toFixed(1) : null;
  const avgRetirement = retirementGoalCount ? Math.round(avgRetirementGoal / retirementGoalCount) : null;
  const avgRent = rentCount ? Math.round(avgMonthlyRent / rentCount) : null;
  const avgContrib = contrib401kCount ? (avgContrib401k / contrib401kCount).toFixed(1) : null;

  const topIndustries = Object.entries(industryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const salaryRows = SALARY_ORDER.filter((k) => salaryCounts[k]);

  const employmentRate = statusCounts["employed"]
    ? Math.round(((statusCounts["employed"]) / total) * 100)
    : 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <PremiumShell title="Peer Benchmarks" subtitle="How your cohort is doing">
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 60px" }}>

        {/* Back */}
        {(() => { const { href, label } = backNav(searchParams?.from); return (
          <Link
            href={href}
            style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}
          >
            {label}
          </Link>
        ); })()}

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 950, letterSpacing: -0.5, color: "var(--text-primary)", margin: "0 0 8px" }}>
            Career Outcomes: Your Cohort
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.7 }}>
            Aggregated, anonymous data from users who completed the career check-in.
            {total > 0 && ` Showing results from ${total} response${total !== 1 ? "s" : ""}.`}
          </p>
        </div>

        {!hasData ? (
          /* ── Empty state ── */
          <div>
            <div style={{
              padding: "48px 36px",
              borderRadius: "var(--radius-xl)",
              border: "1px dashed var(--card-border)",
              background: "var(--card-bg)",
              textAlign: "center",
              marginBottom: 28,
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <div style={{ fontSize: 20, fontWeight: 950, color: "var(--text-primary)", marginBottom: 10 }}>
                Not enough data yet
              </div>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.75, maxWidth: 520, margin: "0 auto 28px" }}>
                Peer benchmarks appear once enough users have completed the career check-in.
                Be one of the first to contribute - your data helps everyone see how the cohort is doing.
              </p>
              <Link
                href="/career-checkin"
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--accent)",
                  color: "#fff",
                  textDecoration: "none",
                  fontWeight: 950,
                  fontSize: 15,
                }}
              >
                Complete your check-in →
              </Link>
            </div>

            {/* Preview of what they'll see */}
            <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 14 }}>
              When enough responses come in, you'll see:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {[
                { icon: "💼", label: "Employment rate", desc: "% employed, searching, or in grad school" },
                { icon: "💰", label: "Salary distribution", desc: "Salary range breakdown across your cohort" },
                { icon: "😊", label: "Career satisfaction", desc: "Average satisfaction score 1–5" },
                { icon: "📈", label: "401k participation", desc: "% enrolled in a 401k" },
                { icon: "🏭", label: "Top industries", desc: "Where your cohort is landing" },
                { icon: "🏠", label: "Housing costs", desc: "Average monthly rent in your group" },
              ].map(({ icon, label, desc }) => (
                <div
                  key={label}
                  style={{
                    padding: "18px 20px",
                    borderRadius: "var(--radius-xl)",
                    border: "1px solid var(--card-border)",
                    background: "var(--card-bg)",
                    opacity: 0.6,
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 950, color: "var(--text-primary)", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Live data ── */
          <div style={{ display: "grid", gap: 24 }}>

            {/* Top stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
              <StatCard label="Employment rate" value={`${employmentRate}%`} sub={`${total} responses total`} color="#10B981" />
              {avgSatisfaction && (
                <StatCard label="Avg satisfaction" value={`${avgSatisfaction}/5`} sub="Career satisfaction score" color="var(--accent)" />
              )}
              {avgUniSatisfaction && (
                <StatCard label="University sat." value={`${avgUniSatisfaction}/5`} sub="Would choose same school" color="#8B5CF6" />
              )}
              {avgRent && (
                <StatCard label="Avg monthly rent" value={`$${avgRent.toLocaleString()}`} sub="Housing cost" color="#F59E0B" />
              )}
              {avgContrib && (
                <StatCard label="Avg 401k contrib" value={`${avgContrib}%`} sub={`${Math.round((has401kCount / total) * 100)}% enrolled`} color="#0EA5E9" />
              )}
              {avgRetirement && (
                <StatCard label="Retirement goal" value={`Age ${avgRetirement}`} sub="Avg retirement target" color="#EC4899" />
              )}
            </div>

            {/* Employment status breakdown */}
            <div style={{ padding: "24px 28px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow-card-soft)" }}>
              <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text-primary)", marginBottom: 18 }}>Employment status</div>
              {Object.entries(statusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <BarRow
                    key={status}
                    label={STATUS_LABELS[status] ?? status}
                    count={count}
                    total={total}
                    color={STATUS_COLORS[status] ?? "#6B7280"}
                    suffix={`${count} people`}
                  />
                ))}
            </div>

            {/* Salary distribution */}
            {salaryRows.length > 0 && (
              <div style={{ padding: "24px 28px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow-card-soft)" }}>
                <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text-primary)", marginBottom: 18 }}>Salary distribution</div>
                {salaryRows.map((key) => (
                  <BarRow
                    key={key}
                    label={SALARY_LABELS[key] ?? key}
                    count={salaryCounts[key] ?? 0}
                    total={total}
                    color="var(--accent)"
                    suffix={`${salaryCounts[key]} people`}
                  />
                ))}
              </div>
            )}

            {/* Top industries */}
            {topIndustries.length > 0 && (
              <div style={{ padding: "24px 28px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow-card-soft)" }}>
                <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text-primary)", marginBottom: 18 }}>Top industries</div>
                {topIndustries.map(([industry, count]) => (
                  <BarRow
                    key={industry}
                    label={industry}
                    count={count}
                    total={total}
                    color="#8B5CF6"
                    suffix={`${count} people`}
                  />
                ))}
              </div>
            )}

            {/* Privacy note */}
            <div style={{ padding: "14px 18px", borderRadius: 12, background: "var(--card-border-soft)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>
              All data is anonymized and aggregated. Individual responses are never shown. Minimum 3 responses are required before any data is displayed.
            </div>
          </div>
        )}
      </div>
    </PremiumShell>
  );
}
