"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";

// ── Module definitions ──────────────────────────────────────────────────────

type ModuleStep = { id: string; text: string };
type Module = {
  id: string;
  icon: string;
  title: string;
  eyebrow: string;
  color: string;
  summary: string;
  keyPoints: string[];
  steps: ModuleStep[];
  resourceLink?: { href: string; label: string };
};

const MODULES: Module[] = [
  {
    id: "budgeting",
    icon: "💳",
    title: "Budgeting Basics",
    eyebrow: "Foundation",
    color: "#10B981",
    summary: "The 50/30/20 rule is the simplest starting point: 50% needs, 30% wants, 20% savings and debt. Most people overspend on wants and underinvest in savings without a system.",
    keyPoints: [
      "Track every dollar for one full month before building a budget - surprises are common.",
      "Fixed expenses (rent, insurance, subscriptions) should be your first line items.",
      "Automate savings on payday so it disappears before you can spend it.",
      "A budget isn't a restriction - it's a permission slip for guilt-free spending.",
    ],
    steps: [
      { id: "list_income", text: "List all monthly income sources (after tax)" },
      { id: "list_fixed", text: "List all fixed monthly expenses" },
      { id: "track_variable", text: "Track variable spending for 2 weeks" },
      { id: "apply_50_30_20", text: "Apply the 50/30/20 rule to your numbers" },
      { id: "automate_savings", text: "Set up automatic transfer on payday" },
    ],
  },
  {
    id: "emergency_fund",
    icon: "🛡️",
    title: "Emergency Fund",
    eyebrow: "Safety Net",
    color: "#0EA5E9",
    summary: "An emergency fund is the most impactful financial move for someone starting out. Without it, every unexpected expense becomes debt. With it, most short-term crises are manageable.",
    keyPoints: [
      "Start with $500–$1,000 as a starter fund. Full fund = 3–6 months of expenses.",
      "Keep it in a high-yield savings account (HYSA) - 4–5% APY beats checking accounts.",
      "This fund is not for sales, vacations, or 'almost emergencies.' Guard it.",
      "Replenish immediately after using it - treat that as a bill.",
    ],
    steps: [
      { id: "open_hysa", text: "Open a high-yield savings account (separate from checking)" },
      { id: "starter_500", text: "Save your first $500 starter fund" },
      { id: "calculate_target", text: "Calculate your 3-month expense target" },
      { id: "automate_ef", text: "Automate a fixed amount monthly toward the fund" },
      { id: "reach_1_month", text: "Reach 1 month of expenses saved" },
    ],
  },
  {
    id: "student_loans",
    icon: "🎓",
    title: "Student Loan Strategy",
    eyebrow: "Debt Management",
    color: "#8B5CF6",
    summary: "Student loans are the single largest financial decision most graduates make without financial education. Understanding repayment options can save tens of thousands of dollars.",
    keyPoints: [
      "Federal loans offer income-driven repayment (IDR) - monthly payment caps at 5–10% of discretionary income.",
      "PSLF forgives federal loans after 10 years of public sector payments. Non-negotiable to know if you work for government or nonprofit.",
      "Refinancing federal loans to private = losing IDR and forgiveness options permanently.",
      "Pay more than the minimum on high-interest private loans first (avalanche method).",
    ],
    steps: [
      { id: "list_loans", text: "List all loans, balances, interest rates, and servicers" },
      { id: "check_repayment", text: "Review available repayment plans at studentaid.gov" },
      { id: "check_pslf", text: "Check PSLF eligibility if in public/nonprofit sector" },
      { id: "set_autopay", text: "Enroll in autopay (0.25% rate reduction on federal loans)" },
      { id: "extra_payments", text: "Make one extra payment toward highest-rate loan this month" },
    ],
    resourceLink: { href: "https://studentaid.gov/manage-loans/repayment", label: "studentaid.gov repayment plans" },
  },
  {
    id: "credit",
    icon: "📈",
    title: "Building Credit",
    eyebrow: "Credit Score",
    color: "#F59E0B",
    summary: "Your credit score determines your mortgage rate, apartment approvals, and sometimes job offers. Building it early and intentionally takes less effort than most people think.",
    keyPoints: [
      "Payment history is 35% of your FICO score - one missed payment can drop it 50–100 points.",
      "Credit utilization is 30% - keep balances below 30% of your limit (below 10% is ideal).",
      "Length of history matters - don't close your oldest card even if you don't use it.",
      "Check your free credit report annually at AnnualCreditReport.com - errors are common.",
    ],
    steps: [
      { id: "check_report", text: "Pull your free credit report at AnnualCreditReport.com" },
      { id: "get_card", text: "Get a starter or secured credit card if you have no credit" },
      { id: "autopay_minimum", text: "Set up autopay for at least the minimum balance" },
      { id: "under_30_pct", text: "Keep utilization below 30% each billing cycle" },
      { id: "monitor_score", text: "Enable free credit monitoring (Credit Karma, bank app, etc.)" },
    ],
  },
  {
    id: "investing",
    icon: "📊",
    title: "Investing Basics",
    eyebrow: "Wealth Building",
    color: "#2563EB",
    summary: "Compound interest rewards people who start early more than people who invest more later. The math is dramatic: $200/mo at 22 beats $500/mo starting at 32.",
    keyPoints: [
      "Always contribute enough to get your full employer 401k match - it's an instant 50–100% return.",
      "Roth IRA is tax-free growth. Contribute after-tax dollars now, pay no tax on withdrawal in retirement.",
      "Index funds (S&P 500) outperform actively managed funds over 90% of the time at lower fees.",
      "Don't try to time the market. Time in market > timing the market.",
    ],
    steps: [
      { id: "enroll_401k", text: "Enroll in your employer 401k and meet the full match" },
      { id: "open_roth", text: "Open a Roth IRA (Fidelity, Vanguard, or Schwab)" },
      { id: "choose_index", text: "Choose a low-fee total market or S&P 500 index fund" },
      { id: "automate_invest", text: "Set up automatic monthly contributions" },
      { id: "increase_pct", text: "Increase contribution rate by 1% next pay raise" },
    ],
  },
  {
    id: "insurance",
    icon: "🏥",
    title: "Insurance 101",
    eyebrow: "Risk Protection",
    color: "#EC4899",
    summary: "Insurance is the financial tool that prevents a single bad event from wiping out everything you've built. Most young professionals are underinsured on what matters and overinsured on what doesn't.",
    keyPoints: [
      "Health insurance: understand your deductible, out-of-pocket max, and in-network providers before you need them.",
      "Renter's insurance covers your belongings and liability for ~$15/month. Non-negotiable if renting.",
      "Disability insurance: 1 in 4 workers will be disabled before retirement. Your employer likely offers short-term coverage.",
      "Life insurance is only necessary if someone depends on your income. Term life, not whole life.",
    ],
    steps: [
      { id: "read_health_plan", text: "Read and understand your health insurance plan summary" },
      { id: "get_renters", text: "Get renter's insurance if you rent (< $20/mo)" },
      { id: "check_disability", text: "Check if employer offers short-term disability coverage" },
      { id: "hsa_if_eligible", text: "Open and contribute to an HSA if on a high-deductible plan" },
    ],
  },
  {
    id: "taxes",
    icon: "🧾",
    title: "Tax Basics",
    eyebrow: "Compliance & Optimization",
    color: "#6B7280",
    summary: "Most people overpay taxes simply by not knowing what they're entitled to deduct. Taxes are the largest single expense in most people's lives - understanding them is worth the effort.",
    keyPoints: [
      "W-4 withholding: if you owe a large amount or get a large refund, adjust your W-4 for the next year.",
      "Student loan interest is deductible (up to $2,500) even if you don't itemize.",
      "401k and HSA contributions reduce your taxable income - contribute pre-tax where possible.",
      "File by April 15 or request an extension - penalties for late filing are steep.",
    ],
    steps: [
      { id: "understand_w4", text: "Review and update your W-4 withholding" },
      { id: "track_deductions", text: "Track deductible expenses throughout the year" },
      { id: "file_on_time", text: "File your federal and state returns by April 15" },
      { id: "free_file", text: "Use IRS Free File if income < $79K" },
      { id: "contribute_pretax", text: "Maximize pre-tax contributions to reduce taxable income" },
    ],
    resourceLink: { href: "https://www.irs.gov/filing/free-file-do-your-federal-taxes-for-free", label: "IRS Free File" },
  },
  {
    id: "salary_negotiation",
    icon: "💼",
    title: "Salary & Benefits Negotiation",
    eyebrow: "Earning More",
    color: "#EF4444",
    summary: "Most people leave $5,000–$20,000 on the table by not negotiating. The data is clear: employers expect negotiation and the worst realistic outcome is that they say no.",
    keyPoints: [
      "Research market rate at Levels.fyi, Glassdoor, LinkedIn Salary, and Bureau of Labor Statistics before any negotiation.",
      "The first number anchors the conversation - never give a number first if you can avoid it.",
      "Benefits have real dollar value: PTO, remote work, signing bonus, equity, 401k match. Negotiate the full package.",
      "A 5% salary increase at 25 compounds to $80K+ in additional lifetime earnings.",
    ],
    steps: [
      { id: "research_market", text: "Research your market rate on 3+ sources" },
      { id: "know_your_number", text: "Define your target, acceptable, and walk-away numbers" },
      { id: "practice_script", text: "Practice your negotiation response out loud" },
      { id: "negotiate_offer", text: "Negotiate your next job offer or at annual review" },
      { id: "review_benefits", text: "Calculate the total dollar value of your benefits package" },
    ],
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function FinancialLiteracyPage() {
  const [completedSteps, setCompletedSteps] = useState<Record<string, Set<string>>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load all module progress from DB
  useEffect(() => {
    Promise.all(
      MODULES.map((m) =>
        fetch(`/api/checklist?stage=finlit_${m.id}`)
          .then((r) => r.json())
          .then((data) => ({ id: m.id, progress: data.progress ?? [] }))
          .catch(() => ({ id: m.id, progress: [] }))
      )
    ).then((results) => {
      const map: Record<string, Set<string>> = {};
      for (const { id, progress } of results) {
        map[id] = new Set(progress.filter((p: any) => p.done).map((p: any) => p.itemId));
      }
      setCompletedSteps(map);
      setLoaded(true);
    });
  }, []);

  function toggleStep(moduleId: string, stepId: string) {
    setCompletedSteps((prev) => {
      const moduleSet = new Set(prev[moduleId] ?? []);
      const nowDone = !moduleSet.has(stepId);
      if (nowDone) moduleSet.add(stepId); else moduleSet.delete(stepId);
      fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: `finlit_${moduleId}`, itemId: stepId, done: nowDone }),
      }).catch(() => {});
      return { ...prev, [moduleId]: moduleSet };
    });
  }

  const totalSteps = MODULES.reduce((s, m) => s + m.steps.length, 0);
  const completedTotal = MODULES.reduce((s, m) => s + (completedSteps[m.id]?.size ?? 0), 0);
  const overallPct = Math.round((completedTotal / totalSteps) * 100);

  return (
    <PremiumShell
      title="Financial Literacy"
      subtitle="8 essential money modules. Work through them at your own pace - each one builds on the last."
    >
      <div style={{ maxWidth: 860 }}>

        {/* Overall progress */}
        <div style={{
          padding: "20px 24px", borderRadius: "var(--radius-xl)", marginBottom: 28,
          border: "1px solid var(--card-border-soft)", background: "var(--card-bg)",
          display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>Overall Progress</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)" }}>{completedTotal} / {totalSteps} steps</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${overallPct}%`, background: "linear-gradient(90deg, #10B981, #2563EB)", borderRadius: 99, transition: "width 0.5s ease" }} />
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#10B981", minWidth: 56, textAlign: "right" }}>
            {overallPct}%
          </div>
        </div>

        {/* Module grid */}
        <div style={{ display: "grid", gap: 12 }}>
          {MODULES.map((mod) => {
            const done = completedSteps[mod.id] ?? new Set();
            const modPct = Math.round((done.size / mod.steps.length) * 100);
            const isOpen = expanded === mod.id;
            const isComplete = modPct === 100;

            return (
              <div
                key={mod.id}
                style={{
                  borderRadius: "var(--radius-xl)",
                  border: `1px solid ${isComplete ? mod.color + "40" : "var(--card-border-soft)"}`,
                  background: isComplete ? mod.color + "06" : "var(--card-bg)",
                  overflow: "hidden",
                }}
              >
                {/* Header row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : mod.id)}
                  style={{ display: "flex", gap: 14, alignItems: "center", padding: "16px 20px", cursor: "pointer" }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: "var(--radius-lg)", flexShrink: 0,
                    background: mod.color + "18", border: `1px solid ${mod.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                  }}>
                    {mod.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: mod.color, textTransform: "uppercase", letterSpacing: 0.5 }}>{mod.eyebrow}</span>
                      {isComplete && <span style={{ fontSize: 10, fontWeight: 900, color: mod.color, background: mod.color + "18", padding: "2px 7px", borderRadius: 99, border: `1px solid ${mod.color}30` }}>Complete ✓</span>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text-primary)", marginBottom: 5 }}>{mod.title}</div>
                    <div style={{ height: 4, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${modPct}%`, background: mod.color, borderRadius: 99, transition: "width 0.4s ease" }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)" }}>{done.size}/{mod.steps.length}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: 14, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>▾</span>
                  </div>
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--card-border-soft)", padding: "20px 20px 20px 78px" }}>
                    <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.75 }}>
                      {mod.summary}
                    </p>

                    {/* Key points */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>Key Takeaways</div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {mod.keyPoints.map((pt, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <div style={{ width: 20, height: 20, borderRadius: 99, background: mod.color + "18", border: `1px solid ${mod.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, color: mod.color, fontWeight: 900, marginTop: 1 }}>{i + 1}</div>
                            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{pt}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action steps */}
                    <div style={{ marginBottom: mod.resourceLink ? 16 : 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>Action Steps</div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {mod.steps.map((step) => {
                          const checked = loaded && done.has(step.id);
                          return (
                            <div
                              key={step.id}
                              onClick={() => toggleStep(mod.id, step.id)}
                              style={{
                                display: "flex", gap: 12, alignItems: "center",
                                padding: "10px 12px", borderRadius: "var(--radius-md)", cursor: "pointer",
                                border: `1px solid ${checked ? mod.color + "35" : "var(--card-border)"}`,
                                background: checked ? mod.color + "06" : "var(--card-bg)",
                                transition: "all 150ms",
                              }}
                            >
                              <div style={{
                                width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                                border: `2px solid ${checked ? mod.color : "var(--card-border)"}`,
                                background: checked ? mod.color : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, color: "#fff", transition: "all 150ms",
                              }}>
                                {checked ? "✓" : ""}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: checked ? "var(--text-muted)" : "var(--text-primary)", textDecoration: checked ? "line-through" : "none" }}>
                                {step.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {mod.resourceLink && (
                      <a href={mod.resourceLink.href} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: mod.color, textDecoration: "none", marginTop: 4 }}>
                        {mod.resourceLink.label} ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PremiumShell>
  );
}
