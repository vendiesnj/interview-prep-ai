"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PremiumShell from "@/app/components/PremiumShell";

function backNav(from: string | null) {
  if (from === "pre-college") return { href: "/pre-college", label: "← Pre-College" };
  if (from === "during-college") return { href: "/during-college", label: "← During College" };
  if (from === "post-college") return { href: "/post-college", label: "← Post-College" };
  return { href: "/career-guide", label: "← Career Guide" };
}

// ── Types ─────────────────────────────────────────────────────────────────────
type CheckIn = {
  salaryRange?: string | null;
  salaryExact?: number | null;
  contribution401kPct?: number | null;
  currentSavingsRange?: string | null;
  currentSavingsExact?: number | null;
  studentLoanRange?: string | null;
  studentLoanExact?: number | null;
  retirementGoalAge?: number | null;
  graduationYear?: number | null;
  age?: number | null;
  employmentStatus?: string | null;
};

// ── Salary midpoints ──────────────────────────────────────────────────────────
const SALARY_MIDPOINTS: Record<string, number> = {
  under_40k: 36000,
  "40_50k": 45000,
  "50_60k": 55000,
  "60_75k": 67500,
  "75_90k": 82500,
  "90_110k": 100000,
  "110_130k": 120000,
  over_130k: 150000,
};

// ── Savings midpoints ─────────────────────────────────────────────────────────
const SAVINGS_MIDPOINTS: Record<string, number> = {
  under_5k: 2500,
  "5_15k": 10000,
  "15_30k": 22500,
  "30_60k": 45000,
  "60_100k": 80000,
  over_100k: 120000,
};

// ── Loan midpoints ────────────────────────────────────────────────────────────
const LOAN_MIDPOINTS: Record<string, number> = {
  none: 0,
  under_10k: 5000,
  "10_30k": 20000,
  "30_60k": 45000,
  "60_100k": 80000,
  over_100k: 120000,
};

// ── Compound FV helper ────────────────────────────────────────────────────────
function futureValue(pv: number, pmt: number, r: number, n: number): number {
  if (r === 0) return pv + pmt * n;
  return pv * Math.pow(1 + r, n) + pmt * ((Math.pow(1 + r, n) - 1) / r);
}

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v).toLocaleString()}`;
}

// ── Projection engine ─────────────────────────────────────────────────────────
function buildProjection(
  checkIn: CheckIn,
  aggressive: boolean
): {
  currentAge: number;
  retirementAge: number;
  yearsToRetirement: number;
  projectedNest: number;
  monthly401k: number;
  annualReturn: number;
  currentSavings: number;
  annualSalary: number;
  studentDebt: number;
} {
  const currentYear = new Date().getFullYear();
  const gradYear = checkIn.graduationYear ?? currentYear - 2;
  const derivedAge = Math.max(22, currentYear - gradYear + 22);
  const currentAge = checkIn.age ?? derivedAge;
  const retirementAge = checkIn.retirementGoalAge ?? 65;
  const yearsToRetirement = Math.max(1, retirementAge - currentAge);

  // Prefer exact values; fall back to range midpoints
  const annualSalary = checkIn.salaryExact ?? SALARY_MIDPOINTS[checkIn.salaryRange ?? ""] ?? 60000;
  const contribPct = checkIn.contribution401kPct ?? 6;
  const annual401k = annualSalary * (contribPct / 100);
  const monthly401k = annual401k / 12;
  const currentSavings = checkIn.currentSavingsExact ?? SAVINGS_MIDPOINTS[checkIn.currentSavingsRange ?? ""] ?? 5000;
  const studentDebt = checkIn.studentLoanExact ?? LOAN_MIDPOINTS[checkIn.studentLoanRange ?? ""] ?? 0;

  // Employer typically matches up to 3-6%; assume 3% match
  const matchPct = 0.03;
  const totalAnnual401k = annual401k + annualSalary * matchPct;

  // Rate: conservative 6%, aggressive 8%
  const annualReturn = aggressive ? 0.08 : 0.06;
  const monthlyReturn = annualReturn / 12;
  const monthsToRetirement = yearsToRetirement * 12;

  const projectedNest = futureValue(
    currentSavings,
    totalAnnual401k / 12,
    monthlyReturn,
    monthsToRetirement
  );

  return {
    currentAge,
    retirementAge,
    yearsToRetirement,
    projectedNest: Math.max(0, projectedNest),
    monthly401k,
    annualReturn,
    currentSavings,
    annualSalary,
    studentDebt,
  };
}

// ── Fast-track levers ─────────────────────────────────────────────────────────
function buildLevers(base: ReturnType<typeof buildProjection>): Array<{
  title: string;
  desc: string;
  impact: string;
  tag: string;
  tagColor: string;
}> {
  const levers = [];

  if ((base as any)._contribPct < 10) {
    levers.push({
      title: "Increase 401k contribution to 10%",
      desc: `You're currently contributing ${(base as any)._contribPct ?? 6}%. Bumping to 10% grows your nest egg significantly with pre-tax dollars.`,
      impact: formatCurrency(
        futureValue(base.currentSavings, base.annualSalary * 0.10 / 12, base.annualReturn / 12, base.yearsToRetirement * 12) -
        futureValue(base.currentSavings, base.monthly401k, base.annualReturn / 12, base.yearsToRetirement * 12)
      ) + " more",
      tag: "High Impact",
      tagColor: "#10B981",
    });
  }

  levers.push({
    title: "Capture the full employer match",
    desc: "Most employers match 3–6% of your salary. If you're not contributing at least the match threshold, you're leaving free money behind.",
    impact: formatCurrency(base.annualSalary * 0.03 * base.yearsToRetirement) + " total match over career",
    tag: "Free money",
    tagColor: "#2563EB",
  });

  levers.push({
    title: "Open a Roth IRA",
    desc: "Contribute up to $7,000/yr after-tax. Roth grows tax-free — withdrawals in retirement are completely untaxed.",
    impact: formatCurrency(futureValue(0, 7000 / 12, 0.07 / 12, base.yearsToRetirement * 12)) + " projected",
    tag: "Tax-free growth",
    tagColor: "#8B5CF6",
  });

  if (base.studentDebt > 20000) {
    levers.push({
      title: "Accelerate loan payoff first",
      desc: `Your student loan balance is significant (~${formatCurrency(base.studentDebt)}). Paying it off aggressively frees up hundreds per month for investing.`,
      impact: "Reduce total interest paid by $5–15K+",
      tag: "Debt-first",
      tagColor: "#F59E0B",
    });
  }

  levers.push({
    title: "Build a 3–6 month emergency fund",
    desc: "Keep 3–6 months of expenses in a high-yield savings account (4–5% APY). This prevents you from raiding your retirement accounts.",
    impact: "Protects $10–30K in penalty-free growth",
    tag: "Safety net",
    tagColor: "#0EA5E9",
  });

  levers.push({
    title: "Negotiate your next salary",
    desc: "Every raise compounds. A $10K raise invested over 30 years at 7% is worth $76K+ extra at retirement.",
    impact: formatCurrency(futureValue(0, 10000 / 12, 0.07 / 12, base.yearsToRetirement * 12)) + " per $10K raise",
    tag: "Salary leverage",
    tagColor: "#EC4899",
  });

  return levers;
}

// ── Gauge bar ─────────────────────────────────────────────────────────────────
function GaugeBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 950, color }}>{formatCurrency(value)}</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RetirementPage() {
  const searchParams = useSearchParams();
  const { href: backHref, label: backLabel } = backNav(searchParams.get("from"));

  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [aggressive, setAggressive] = useState(false);

  useEffect(() => {
    fetch("/api/career-checkin")
      .then((r) => r.json())
      .then((data) => {
        const latest = data?.checkIns?.[0] ?? null;
        setCheckIn(latest);
      })
      .catch(() => setCheckIn(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PremiumShell title="Retirement Projection" subtitle="Your path to financial independence">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, color: "var(--text-muted)", fontSize: 15 }}>
          Loading your data…
        </div>
      </PremiumShell>
    );
  }

  if (!checkIn) {
    return (
      <PremiumShell title="Retirement Projection" subtitle="Your path to financial independence">
        <div style={{ maxWidth: 600, margin: "60px auto", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: 22, fontWeight: 950, color: "var(--text-primary)", marginBottom: 10 }}>
            Complete your career check-in first
          </div>
          <p style={{ fontSize: 15, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 28 }}>
            Your retirement projection is personalized based on your salary, 401k contributions, current savings, and retirement goal age. Complete the 2-minute check-in to see your numbers.
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
            Complete check-in →
          </Link>
        </div>
      </PremiumShell>
    );
  }

  const proj = buildProjection(checkIn, aggressive);
  // Inject contribPct for lever calc
  (proj as any)._contribPct = checkIn.contribution401kPct ?? 6;
  const levers = buildLevers(proj);

  // Milestone values for progress bar
  const milestones = [
    { label: "Starter\n$10K", value: 10_000 },
    { label: "Emergency\nFund", value: 15_000 },
    { label: "100K\nClub", value: 100_000 },
    { label: "Half\nMillion", value: 500_000 },
    { label: "Millionaire", value: 1_000_000 },
    { label: "Goal", value: proj.projectedNest },
  ];

  const nestLabel = formatCurrency(proj.projectedNest);
  const currentPct = proj.currentSavings > 0 ? Math.min(100, (proj.currentSavings / proj.projectedNest) * 100) : 0;

  const VIVID = aggressive ? "#10B981" : "var(--accent)";

  return (
    <PremiumShell title="Retirement Projection" subtitle="Your path to financial independence">
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 60px" }}>

        {/* Back */}
        <Link href={backHref} style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
          {backLabel}
        </Link>

        {/* Scenario toggle */}
        <div style={{ display: "flex", gap: 10, marginBottom: 32, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-muted)" }}>Scenario:</span>
          {[false, true].map((agg) => (
            <button
              key={String(agg)}
              onClick={() => setAggressive(agg)}
              style={{
                padding: "6px 16px",
                borderRadius: 8,
                border: "1px solid var(--card-border)",
                background: aggressive === agg ? VIVID : "var(--card-bg)",
                color: aggressive === agg ? "#fff" : "var(--text-primary)",
                fontWeight: 900,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {agg ? "Aggressive (8% return)" : "Conservative (6% return)"}
            </button>
          ))}
        </div>

        {/* Hero number */}
        <div style={{
          padding: "32px 36px",
          borderRadius: "var(--radius-xl)",
          border: `1px solid ${VIVID}`,
          background: `linear-gradient(135deg, var(--card-bg-strong), var(--card-bg))`,
          boxShadow: "var(--shadow-card-soft)",
          marginBottom: 24,
          display: "flex",
          alignItems: "flex-start",
          gap: 28,
          flexWrap: "wrap",
        }}>
          <div style={{ flex: "1 1 260px" }}>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.8, color: VIVID, textTransform: "uppercase", marginBottom: 8 }}>
              Projected nest egg at {proj.retirementAge}
            </div>
            <div style={{ fontSize: 56, fontWeight: 950, color: "var(--text-primary)", lineHeight: 1, marginBottom: 6 }}>
              {nestLabel}
            </div>
            <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Based on {proj.yearsToRetirement} years of contributions at {(proj.annualReturn * 100).toFixed(0)}% avg annual return,
              starting with {formatCurrency(proj.currentSavings)} in savings.
            </div>
          </div>

          <div style={{ flex: "1 1 220px", display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 2 }}>Current age (est.)</div>
              <div style={{ fontSize: 22, fontWeight: 950, color: "var(--text-primary)" }}>{proj.currentAge}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 2 }}>Monthly 401k contribution</div>
              <div style={{ fontSize: 22, fontWeight: 950, color: "var(--text-primary)" }}>{formatCurrency(proj.monthly401k)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 2 }}>Annual salary (est.)</div>
              <div style={{ fontSize: 22, fontWeight: 950, color: "var(--text-primary)" }}>{formatCurrency(proj.annualSalary)}</div>
            </div>
          </div>
        </div>

        {/* Progress snapshot */}
        <div style={{
          padding: "24px 28px",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--card-border)",
          background: "var(--card-bg)",
          boxShadow: "var(--shadow-card-soft)",
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text-primary)", marginBottom: 18 }}>Where you stand today</div>
          <GaugeBar label="Current savings" value={proj.currentSavings} max={proj.projectedNest} color={VIVID} />
          <GaugeBar label="Projected nest egg" value={proj.projectedNest} max={proj.projectedNest} color={VIVID} />
          {proj.studentDebt > 0 && (
            <GaugeBar label="Student loan balance" value={proj.studentDebt} max={Math.max(proj.projectedNest, proj.studentDebt * 2)} color="#F59E0B" />
          )}
          <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: "var(--accent-soft)", fontSize: 13, color: "var(--accent)", fontWeight: 800 }}>
            You're {(currentPct).toFixed(1)}% of the way to your projected retirement goal. Small actions now compound dramatically over time.
          </div>
        </div>

        {/* Fast-track levers */}
        <div style={{ fontSize: 20, fontWeight: 950, color: "var(--text-primary)", marginBottom: 14 }}>
          Fast-track levers 🚀
        </div>
        <div style={{ display: "grid", gap: 14, marginBottom: 36 }}>
          {levers.map((lever, i) => (
            <div
              key={i}
              style={{
                padding: "20px 22px",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--card-border)",
                background: "var(--card-bg)",
                boxShadow: "var(--shadow-card-soft)",
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text-primary)" }}>{lever.title}</div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: 0.5,
                    color: lever.tagColor,
                    background: lever.tagColor + "18",
                    padding: "2px 8px",
                    borderRadius: 6,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}>{lever.tag}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>{lever.desc}</p>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase" }}>Impact</div>
                <div style={{ fontSize: 14, fontWeight: 950, color: lever.tagColor, marginTop: 2 }}>{lever.impact}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div style={{ padding: "16px 20px", borderRadius: 12, background: "var(--card-border-soft)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>
          <strong>Disclaimer:</strong> These projections are for educational purposes only. They use simplified compound interest models and midpoint estimates from salary/savings ranges. Actual results will differ based on investment allocation, market performance, inflation, tax changes, and life events. Consult a licensed financial advisor for personalized advice.
        </div>
      </div>
    </PremiumShell>
  );
}
