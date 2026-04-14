"use client";

import Link from "next/link";
import { useState } from "react";
import PremiumShell from "@/app/components/PremiumShell";
import { CheckSquare, TrendingUp, Mic, Users, BarChart, CreditCard, Rocket, DollarSign, Home, Map, FileText } from "lucide-react";
import ChecklistSection, { type ChecklistProgressEntry } from "@/app/components/ChecklistSection";
import MiniCalendar, { type ScheduledItem } from "@/app/components/MiniCalendar";
import StreakBanner from "@/app/components/StreakBanner";
import RoleClusterSection from "@/app/components/RoleClusterSection";

const TODOS = [
  { id: "career_checkin",  Icon: CheckSquare, label: "Career Check-In",           desc: "Log your current role, salary, savings, and loan balance for a full financial snapshot.",         href: "/career-checkin",          color: "#10B981", time: "~5 min" },
  { id: "retirement_proj", Icon: TrendingUp,  label: "Retirement Projection",      desc: "See when you could retire based on your salary, savings rate, and loan payoff timeline.",         href: "/career-guide/retirement",  color: "#8B5CF6", time: "~3 min" },
  { id: "interview_prep",  Icon: Mic,         label: "Interview Prep Session",     desc: "Practice for your next role, promotion conversation, or internal opportunity.",                   href: "/practice",                color: "#2563EB", time: "~15 min" },
  { id: "networking",      Icon: Users,       label: "Networking Pitch Practice",  desc: "Industry events, LinkedIn cold outreach, and informational interviews with senior leaders.",       href: "/networking",              color: "#0EA5E9", time: "~10 min" },
  { id: "salary_bench",    Icon: BarChart,    label: "Peer Salary Benchmarks",     desc: "See where your compensation sits relative to peers with similar experience and background.",       href: "/career-guide/benchmarks",  color: "#F59E0B", time: "~3 min" },
  { id: "budget_tool",     Icon: CreditCard,  label: "Monthly Budget Builder",     desc: "Enter your take-home pay and expenses to see your 50/30/20 breakdown and monthly surplus in real time.", href: "/career-guide/budget", color: "#10B981", time: "~5 min" },
];

const CHECKLIST = [
  { id: "401k_enrolled",    label: "Enroll in your 401(k)",                        desc: "Do this in your first 30 days - you cannot retroactively contribute to the months you missed. Find your HR portal or benefits platform (often Fidelity, Vanguard, or Empower) and complete enrollment. If your employer matches and you don't enroll, you're leaving part of your compensation on the table.", linkHref: "https://investor.gov/financial-tools-calculators/calculators/compound-interest-calculator", linkLabel: "See compound growth calculator" },
  { id: "contribution_set", label: "Set your 401(k) contribution rate",            desc: "Contribute at minimum whatever percentage your employer matches - that's a 100% instant return. If they match 4%, you contribute 4%. Target 10-15% of income total over time. Set a calendar reminder to increase your rate by 1% each January - you'll barely notice the paycheck difference.", linkHref: "/career-guide/retirement?from=post-college", linkLabel: "See your retirement projection" },
  { id: "benefits_reviewed", label: "Review all your benefits (health, dental, FSA)", desc: "You typically have 30 days from your start date to enroll. Miss this window and you wait until open enrollment (usually October-November). Compare health plans carefully: PPO (flexible, higher premium) vs HDHP (lower premium, higher deductible + qualifies for HSA). If your employer offers an HSA match, that's free money too.", linkHref: "/career-guide/finances?from=post-college", linkLabel: "Benefits 101 guide" },
  { id: "w4_set",           label: "Set up your W-4 correctly",                    desc: "The W-4 tells your employer how much federal tax to withhold. Single with one job: claim Single/0 allowances for safe over-withholding (you'll get a refund). Use the IRS Withholding Estimator to dial it in precisely if you want larger paychecks without an April surprise.", linkHref: "https://apps.irs.gov/app/tax-withholding-estimator", linkLabel: "IRS Withholding Estimator" },
  { id: "paycheck_review",  label: "Understand your first paycheck",               desc: "Your gross salary ÷ pay periods = gross per check. Deductions include: federal tax, state tax, Social Security (6.2%), Medicare (1.45%), health insurance premium, and 401k contribution. What remains is net (take-home). Many new grads are shocked by how much disappears. Build your budget from net, not gross.", linkHref: "/career-guide/finances?from=post-college", linkLabel: "Understanding your paycheck" },
  { id: "loans_plan",       label: "Set up your student loan repayment plan",      desc: "Federal loans: log into StudentAid.gov to see your balance, servicer, and repayment options. Income-driven repayment (IDR) plans cap payments at 5-10% of discretionary income. Public Service Loan Forgiveness (PSLF) forgives remaining balances after 10 years of government/nonprofit work. Private loans don't have these options - consider refinancing when your credit is strong.", linkHref: "https://studentaid.gov/manage-loans/repayment", linkLabel: "Explore federal repayment options" },
  { id: "emergency_3mo",    label: "Build a 3-month emergency fund",               desc: "Before aggressively paying down low-interest debt or investing beyond your 401k match, build 3 months of essential expenses (rent + food + minimums) in a high-yield savings account (4-5% APY). This fund is what prevents a job loss or medical bill from becoming a debt spiral." },
  { id: "renter_insurance",  label: "Get renter's insurance",                      desc: "Usually $15-20/month (under $200/year). Covers your belongings if stolen or damaged by fire or water, and provides liability coverage if someone is injured in your apartment. Your landlord's insurance only covers the building - not your stuff. Most policies also cover theft outside your home.", linkHref: "https://www.nerdwallet.com/best/insurance/renters", linkLabel: "Compare renters insurance on NerdWallet" },
  { id: "credit_report",    label: "Check your credit report",                     desc: "You're entitled to one free report per bureau (Equifax, Experian, TransUnion) per year at AnnualCreditReport.com. Review for accounts you don't recognize, incorrect late payments, or debts that should have aged off (7 years for most negatives). Dispute errors in writing - they're more common than you think and can significantly lower your score.", linkHref: "https://www.annualcreditreport.com", linkLabel: "Get your free report" },
  { id: "budget_post",      label: "Build a post-grad budget (50/30/20 rule)",     desc: "50% needs (rent, utilities, groceries, loan minimums, insurance), 30% wants (dining, entertainment, subscriptions, travel), 20% savings and extra debt paydown. If your debt load is heavy, shift 10% from wants to debt paydown. Build your budget from your take-home pay, not your salary.", linkHref: "/financial-literacy", linkLabel: "Financial Literacy tools" },
];

const RESOURCES = [
  {
    Icon: Rocket,
    label: "Your First 90 Days",
    desc: "Week 1, Month 1, and Month 3 checklist for your first job - benefits enrollment, 401k, building relationships.",
    href: "/career-guide/first-year?from=post-college",
    tag: "Life",
  },
  {
    Icon: DollarSign,
    label: "Money & Benefits 101",
    desc: "401k enrollment, PPO vs HDHP health plans, HSA vs FSA, W-4 setup, and first-paycheck reality check.",
    href: "/career-guide/finances?from=post-college",
    tag: "Finance",
  },
  {
    Icon: CreditCard,
    label: "Monthly Budget Builder",
    desc: "Interactive 50/30/20 budget tool - see your surplus or deficit in real time and adjust instantly.",
    href: "/career-guide/budget",
    tag: "Finance",
  },
  {
    Icon: TrendingUp,
    label: "Retirement Projection",
    desc: "See when you could retire based on your salary, 401k rate, and savings. Conservative vs. aggressive scenarios.",
    href: "/career-guide/retirement?from=post-college",
    tag: "Finance",
  },
  {
    Icon: Home,
    label: "Renting Your First Apartment",
    desc: "Budget before you browse, reading every line of the lease, renter's insurance, and landlord red flags.",
    href: "/career-guide/housing?from=post-college",
    tag: "Life",
  },
  {
    Icon: Map,
    label: "Career Progression Paths",
    desc: "Where do people go from entry-level? Tech, finance, consulting, trades, healthcare - with salary ranges.",
    href: "/career-guide/career-paths?from=post-college",
    tag: "Career",
  },
  {
    Icon: BarChart,
    label: "Peer Salary & Career Benchmarks",
    desc: "Anonymous, aggregated outcomes from your cohort - employment rate, salary distribution, satisfaction scores.",
    href: "/career-guide/benchmarks?from=post-college",
    tag: "Career",
  },
  {
    Icon: FileText,
    label: "Resume Gap Analyzer",
    desc: "Paste a job description and your resume to instantly identify missing keywords, skill gaps, and how to close them.",
    href: "/resume-gap",
    tag: "Career",
  },
];

const TAG_COLORS: Record<string, string> = { Finance: "#10B981", Career: "#8B5CF6", Life: "#0EA5E9" };

export default function PostCollegePage() {
  const [progress, setProgress] = useState<ChecklistProgressEntry[]>([]);

  const scheduledItems: ScheduledItem[] = CHECKLIST.map(item => {
    const entry = progress.find(p => p.itemId === item.id);
    return { itemId: item.id, label: item.label, stage: "post_college", done: entry?.done ?? false, scheduledDate: entry?.scheduledDate ?? null };
  });

  function handleSchedule(itemId: string, date: string | null) {
    setProgress(prev => {
      const existing = prev.find(p => p.itemId === itemId);
      if (existing) return prev.map(p => p.itemId === itemId ? { ...p, scheduledDate: date } : p);
      return [...prev, { itemId, done: false, scheduledDate: date }];
    });
  }

  return (
    <PremiumShell hideHeader>
      <div style={{ maxWidth: 1120, margin: "0 auto", paddingBottom: 80 }}>

        <div style={{ marginBottom: 36 }}>
          <h1 style={{ margin: "0 0 10px", fontSize: 32, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.7, lineHeight: 1.2 }}>
            Own your career and your finances.
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 600 }}>
            The first few years after graduation shape the next decade. Schedule tasks, stay sharp on communication, and keep building toward where you actually want to go.
          </p>
        </div>

        <StreakBanner />

        <RoleClusterSection accentColor="#8B5CF6" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 28, alignItems: "start" }}>
          <div>
            {/* To-Do's */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#8B5CF6", textTransform: "uppercase", marginBottom: 16 }}>Practice & Tools</div>
              <div style={{ display: "grid", gap: 12 }}>
                {TODOS.map((todo) => (
                  <div key={todo.id} style={{ padding: "18px 20px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "var(--radius-lg)", background: todo.color + "18", border: `1px solid ${todo.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <todo.Icon size={22} color={todo.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>{todo.label}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{todo.time}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>{todo.desc}</p>
                    </div>
                    <Link href={todo.href} style={{ flexShrink: 0, padding: "9px 18px", borderRadius: "var(--radius-md)", background: todo.color, color: "#fff", fontWeight: 900, fontSize: 13, textDecoration: "none" }}>Start →</Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div style={{ marginBottom: 48 }}>
              <ChecklistSection stage="post_college" items={CHECKLIST} accentColor="#8B5CF6" onProgressChange={setProgress} />
            </div>

            {/* Resources */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#8B5CF6", textTransform: "uppercase", marginBottom: 16 }}>Guides & Resources</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {RESOURCES.map((r) => (
                  <Link key={r.label} href={r.href} style={{ textDecoration: "none" }}>
                    <div style={{ padding: "16px 18px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <r.Icon size={22} color={TAG_COLORS[r.tag] ?? "var(--accent)"} style={{ flexShrink: 0, marginTop: 1 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.4 }}>{r.label}</div>
                        {r.desc && <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, marginTop: 3 }}>{r.desc}</div>}
                        <div style={{ marginTop: 5, display: "inline-block", fontSize: 10, fontWeight: 900, color: TAG_COLORS[r.tag] ?? "var(--accent)", background: (TAG_COLORS[r.tag] ?? "var(--accent)") + "18", padding: "2px 8px", borderRadius: 99 }}>{r.tag}</div>
                      </div>
                      <span style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 2 }}>→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <MiniCalendar items={scheduledItems} accentColor="#8B5CF6" stage="post_college" onSchedule={handleSchedule} />
        </div>

      </div>
    </PremiumShell>
  );
}
