import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";

const SECTIONS = [
  {
    id: "401k",
    icon: "📈",
    title: "401(k): Do this before anything else",
    color: "var(--accent)",
    content: [
      {
        heading: "What it is",
        body: "A 401(k) is a tax-advantaged retirement account offered through your employer. You contribute pre-tax money from each paycheck — which lowers your taxable income now — and it grows until retirement.",
      },
      {
        heading: "The employer match is free money — never leave it on the table",
        body: "If your employer matches 4% of your salary and you contribute at least 4%, they add that same amount for free. On a $60k salary, that's $2,400/year added to your account at no cost to you. Not contributing enough to get the full match is one of the most common and costly financial mistakes new employees make.",
      },
      {
        heading: "Traditional vs Roth 401(k)",
        body: "Traditional: contributions are pre-tax (you pay taxes on withdrawal in retirement). Roth: contributions are post-tax (withdrawals in retirement are tax-free). Early in your career, when your income and tax rate are typically lower, a Roth often makes more sense — you pay taxes now at a lower rate and let it grow tax-free.",
      },
      {
        heading: "What to invest in",
        body: "If your plan offers a Target Date Fund (e.g., 'Target 2060 Fund'), that's a solid default. It automatically adjusts from growth-focused to conservative as you approach retirement. Don't leave it in the default money market or stable value fund — those barely outpace inflation.",
      },
      {
        heading: "How much to contribute",
        body: "Start with at least whatever your employer matches. If you can afford it, aim for 10–15% of your income. The 2024 IRS limit is $23,000/year for 401(k) contributions.",
      },
    ],
  },
  {
    id: "health",
    icon: "🏥",
    title: "Health insurance: PPO vs HDHP",
    color: "#10B981",
    content: [
      {
        heading: "PPO (Preferred Provider Organization)",
        body: "Higher monthly premium, lower deductible. You pay more every paycheck but less when you actually use healthcare. Best if you have ongoing prescriptions, regular doctor visits, or expect significant healthcare use.",
      },
      {
        heading: "HDHP (High Deductible Health Plan)",
        body: "Lower monthly premium, higher deductible. You pay less each paycheck but more out of pocket when you use healthcare. Best if you're generally healthy and rarely see a doctor. The trade-off: a surprise medical bill can be expensive.",
      },
      {
        heading: "HSA — the hidden benefit of HDHPs",
        body: "If you choose an HDHP, you're eligible for a Health Savings Account (HSA). Contributions are triple tax-advantaged: pre-tax in, grows tax-free, tax-free out for medical expenses. In 2024, you can contribute $4,150 (individual). Unused funds roll over every year — it's not a use-it-or-lose-it account. Some people use it as a secondary retirement account.",
      },
      {
        heading: "FSA (Flexible Spending Account)",
        body: "Available with PPO plans. Similar to HSA but use-it-or-lose-it — unspent funds typically expire at year end. Use it for predictable expenses: glasses, dental work, prescriptions.",
      },
      {
        heading: "What most people get wrong",
        body: "Choosing the cheapest premium without reading the deductible. One ER visit, surgery, or specialist referral can cost $2,000–$10,000 out of pocket on an HDHP. Know your deductible before you need it.",
      },
    ],
  },
  {
    id: "taxes",
    icon: "📋",
    title: "Taxes: W-4 and what to expect",
    color: "#F59E0B",
    content: [
      {
        heading: "What the W-4 does",
        body: "Your W-4 tells your employer how much federal tax to withhold from each paycheck. More withholding = smaller paycheck + likely refund. Less withholding = bigger paycheck + possible bill in April.",
      },
      {
        heading: "Single, no dependents",
        body: "If you're single with no dependents or side income, filing as Single on the W-4 typically gets you close to correct withholding. You'll likely get a small refund or owe a small amount.",
      },
      {
        heading: "State taxes",
        body: "Most states have their own income tax. You'll also fill out a state withholding form. Nine states have no income tax (FL, TX, WA, NV, WY, SD, AK, TN, NH).",
      },
      {
        heading: "FICA taxes",
        body: "Social Security (6.2%) and Medicare (1.45%) are automatically withheld — you don't choose these. Your employer matches them. On a $60k salary, you pay about $4,590/year in FICA.",
      },
      {
        heading: "Your first April",
        body: "File by April 15. Use free software (FreeTaxUSA, Cash App Taxes) if your taxes are straightforward — W-2 income only. Save all your tax documents: W-2 from employer, 1099s for any side income, student loan interest form (1098-E).",
      },
    ],
  },
  {
    id: "budget",
    icon: "💳",
    title: "Building your first real budget",
    color: "#8B5CF6",
    content: [
      {
        heading: "The 50/30/20 rule as a starting point",
        body: "50% needs (rent, food, utilities, transport, minimum loan payments), 30% wants (dining out, entertainment, travel, subscriptions), 20% savings and debt payoff. This is a framework, not a law — adjust based on your city's cost of living.",
      },
      {
        heading: "Rent: the 30% rule is outdated in most cities",
        body: "The classic advice is to spend no more than 30% of gross income on rent. In New York, SF, Boston, or Seattle, that's nearly impossible at entry-level salaries. A more realistic target: 35–40% of take-home pay (not gross), including utilities.",
      },
      {
        heading: "Emergency fund before investing",
        body: "Before investing beyond your 401k match, build 3–6 months of essential expenses in a high-yield savings account (HYSA). In 2024, HYSAs pay 4–5% interest — far better than a traditional savings account.",
      },
      {
        heading: "Student loans",
        body: "If you have federal loans, you're automatically on the Standard Repayment Plan (10 years). Consider income-driven repayment (IDR) if payments are too high. Don't ignore the loans — interest accrues daily.",
      },
      {
        heading: "Roth IRA",
        body: "If you're under the income limit (~$161k single in 2024) and have extra savings after the 401k match + emergency fund, open a Roth IRA. Contribute up to $7,000/year (2024 limit). Fidelity and Vanguard are the standard options — low fees, index funds.",
      },
    ],
  },
];

export default function FinancesPage() {
  return (
    <PremiumShell title="Money & Benefits 101" subtitle="Everything HR assumes you already know">
      <div style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 48 }}>

        <div style={{ marginBottom: 20 }}>
          <Link href="/career-guide" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontWeight: 700 }}>← Career Guide</Link>
        </div>

        <div style={{ marginBottom: 28, padding: 18, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--text-primary)" }}>Note:</strong> This is general educational information, not financial advice. For decisions that significantly impact your finances, consider speaking with a certified financial planner (CFP).
        </div>

        {/* Quick nav */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
          {SECTIONS.map(({ id, icon, title, color }) => (
            <a key={id} href={`#${id}`} style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid var(--card-border)", background: "var(--card-bg)", color, fontSize: 13, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{icon}</span>{title.split(":")[0]}
            </a>
          ))}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          {SECTIONS.map(({ id, icon, title, color, content }) => (
            <div key={id} id={id} style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))", overflow: "hidden" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--card-border-soft)", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>{icon}</span>
                <div style={{ fontSize: 17, fontWeight: 950, color }}>{title}</div>
              </div>
              <div style={{ padding: 24, display: "grid", gap: 20 }}>
                {content.map(({ heading, body }) => (
                  <div key={heading}>
                    <div style={{ fontSize: 13, fontWeight: 950, color: "var(--text-primary)", marginBottom: 6 }}>{heading}</div>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.75 }}>{body}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PremiumShell>
  );
}
