import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";

function backNav(from: string | undefined) {
  if (from === "pre-college") return { href: "/pre-college", label: "← Pre-College" };
  if (from === "during-college") return { href: "/during-college", label: "← During College" };
  if (from === "post-college") return { href: "/post-college", label: "← Post-College" };
  return { href: "/career-guide", label: "← Career Guide" };
}

const POST_COLLEGE_SECTIONS = [
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

const PRE_COLLEGE_SECTIONS = [
  {
    id: "fafsa",
    icon: "📋",
    title: "FAFSA & Financial Aid",
    color: "#10B981",
    content: [
      {
        heading: "What FAFSA is and why it matters",
        body: "FAFSA (Free Application for Federal Student Aid) is the form that determines your eligibility for federal grants, loans, and work-study. It's filed annually starting October 1. Filing early matters — many states and schools award aid on a first-come, first-served basis until funds run out.",
      },
      {
        heading: "Understanding your Student Aid Report (SAR)",
        body: "After filing FAFSA, you receive a SAR that includes your Expected Family Contribution (EFC) — now called the Student Aid Index (SAI). Schools use this to calculate how much need-based aid you qualify for. A lower SAI = more potential aid.",
      },
      {
        heading: "Types of federal aid",
        body: "Pell Grant (free money, no repayment, for undergrads with financial need — up to $7,395/year in 2024), Federal Work-Study (part-time jobs on campus, earnings are yours to keep), Subsidized Loans (government pays interest while you're in school), Unsubsidized Loans (interest accrues from day one — only borrow what you truly need).",
      },
      {
        heading: "Reading your financial aid award letter",
        body: "Schools present aid in ways that can be confusing — they often bundle loans with grants to make the package look larger. Identify what's free money (grants, scholarships) vs. what you repay (loans). The 'net price' is tuition minus grants and scholarships only.",
      },
    ],
  },
  {
    id: "grants-loans",
    icon: "🎓",
    title: "Grants, Scholarships & Loans",
    color: "#2563EB",
    content: [
      {
        heading: "The difference between grants and loans",
        body: "Grants are free money — you don't repay them. Loans must be repaid with interest. Federal subsidized loans are the best loans available (interest paid by government while enrolled). Avoid private loans unless you've exhausted all federal options.",
      },
      {
        heading: "Finding scholarships",
        body: "Your school's financial aid office has local scholarships many students never apply for. Also check Fastweb, Scholarships.com, your state's higher education agency, your parents' employers, and professional associations in your intended field. Apply to 10+ — most students dramatically underestimate how many they could get.",
      },
      {
        heading: "Work-Study: what it actually means",
        body: "Work-Study is a funding source, not a job offer. You still have to apply for on-campus jobs. The benefit: your earnings don't count against next year's FAFSA calculation the way regular income does. Typical on-campus jobs: library aide, dining hall, rec center, research assistant.",
      },
      {
        heading: "Loan limits and what to actually borrow",
        body: "Federal loan limits for freshmen: $5,500 ($3,500 subsidized if eligible). Don't borrow more than your expected first-year salary after graduation in total across four years. A general rule: total loan debt at graduation should be less than your starting annual salary.",
      },
    ],
  },
  {
    id: "budget",
    icon: "💰",
    title: "Your First College Budget",
    color: "#F59E0B",
    content: [
      {
        heading: "The four categories that matter",
        body: "Tuition/housing (usually fixed), food (variable — your meal plan decisions matter), transportation, and personal spending. Build your budget around what you actually have after aid, not what you wish you had.",
      },
      {
        heading: "Meal plan math",
        body: "Most meal plans are priced at a premium vs. cooking yourself, but cooking takes time you may not have as a freshman. Calculate the per-meal cost of your plan vs. campus dining prices. Many schools let you adjust your plan tier — review it after week two when you know your actual habits.",
      },
      {
        heading: "The apps that make student budgeting easier",
        body: "YNAB (best for intentional budgeting), Mint (best for tracking), or just a Google Sheet. The tool matters less than the habit of checking it weekly. Most students who overspend don't realize it until their account is already negative.",
      },
      {
        heading: "The emergency fund mindset from day one",
        body: "Even $200-300 set aside changes how stressful a flat tire or broken laptop feels. If your aid covers it, treat a small portion as untouchable. This habit, started early, compounds into financial resilience.",
      },
    ],
  },
  {
    id: "credit",
    icon: "💳",
    title: "Building Credit as a Student",
    color: "#8B5CF6",
    content: [
      {
        heading: "Why starting at 18-19 matters more than you think",
        body: "Credit history is measured in years. Someone who opens a responsible credit card at 19 will have a 7-year credit history by 26 — when they're renting their first apartment, buying a car, or eventually a home. Starting later means starting that clock later.",
      },
      {
        heading: "Student credit cards: how to use them correctly",
        body: "Discover it Student Cash Back, Capital One Quicksilver Student, and Chase Freedom Student are solid options with no annual fee. Use it for one recurring expense (Netflix, groceries once a week), pay the full balance every month. Never carry a balance. Never spend money you don't already have.",
      },
      {
        heading: "What actually builds your credit score",
        body: "Payment history (35% of score) — pay on time, every time. Credit utilization (30%) — keep spending below 30% of your credit limit. Length of history (15%) — don't close old accounts. Hard inquiries (10%) — don't apply for multiple cards in a short period.",
      },
      {
        heading: "What to avoid",
        body: "Store credit cards (high APR, tempting spending). Co-signing for someone else. Missing payments — a single 30-day late payment can drop your score 60-110 points and stays on your report for 7 years.",
      },
    ],
  },
];

const DURING_COLLEGE_SECTIONS = [
  {
    id: "taxes-first",
    icon: "🧾",
    title: "Filing Taxes for the First Time",
    color: "#10B981",
    content: [
      {
        heading: "Do you even need to file?",
        body: "If you earned more than $13,850 in 2023 (the standard deduction for single filers), you're required to file. Even if you earned less, you should file if any federal taxes were withheld from your paychecks — you'll likely get a refund. Scholarship money used for room and board (not tuition/fees) is taxable income.",
      },
      {
        heading: "The forms you'll receive",
        body: "W-2 from your employer (wages and taxes withheld), 1098-T from your school (tuition paid — relevant for education tax credits), 1099 forms if you did freelance or gig work (you owe taxes on this even without withholding), 1098-E if you paid student loan interest (deductible up to $2,500).",
      },
      {
        heading: "Free filing options for students",
        body: "IRS Free File (free for income under $79,000), VITA (Volunteer Income Tax Assistance — free in-person help from IRS-certified volunteers, often on campus), TurboTax Free Edition (federal only, simple returns), H&R Block Free Online. Do not pay to file a simple return.",
      },
      {
        heading: "Education tax credits worth knowing",
        body: "American Opportunity Tax Credit (up to $2,500/year for the first 4 years of college, partially refundable), Lifetime Learning Credit (up to $2,000/year, not refundable). You or your parent can claim these — coordinate to avoid double-claiming.",
      },
    ],
  },
  {
    id: "internship-income",
    icon: "💼",
    title: "Internship Income & Taxes",
    color: "#2563EB",
    content: [
      {
        heading: "Your internship income is taxable",
        body: "Whether you're paid hourly, salaried, or on a stipend basis, internship income is ordinary income. Federal and state income taxes apply. Make sure your employer has you fill out a W-4 — this determines withholding.",
      },
      {
        heading: "The W-4: don't just write '0' or 'exempt'",
        body: "Use the IRS withholding calculator to figure out the right withholding for your income level. Students often under-withhold and face a tax bill in April, or over-withhold and give the government an interest-free loan. Get it right from the first paycheck.",
      },
      {
        heading: "Stipend internships and self-employment tax",
        body: "Some internships pay via stipend rather than as an employee — you may receive a 1099-NEC instead of a W-2. This means no taxes were withheld and you may owe both income tax AND self-employment tax (15.3%). Set aside 25-30% of stipend payments for taxes.",
      },
      {
        heading: "Deductible expenses for internships",
        body: "If your internship is unpaid or you had work-related expenses, some costs may be deductible (job search expenses, professional association dues, required equipment). Keep receipts and consult a tax resource — rules vary.",
      },
    ],
  },
  {
    id: "student-budget",
    icon: "💰",
    title: "Managing Money on a Student Income",
    color: "#F59E0B",
    content: [
      {
        heading: "The 50/30/20 rule adapted for students",
        body: "With a part-time income, 50% needs (rent share, food, transportation), 20% wants (entertainment, dining out), 30% savings/debt payment sounds backwards — but prioritize building even a $500 buffer before discretionary spending. Adjust based on your actual income.",
      },
      {
        heading: "Grocery strategy on a tight budget",
        body: "ALDI, Trader Joe's, and store-brand items at any major grocery store can cut food costs 30-40% vs. name brands. Meal prep Sunday. Learn 5-7 cheap, high-protein meals. The amount students spend on DoorDash vs. what they could spend cooking is usually shocking when they actually track it.",
      },
      {
        heading: "Student discounts that add up",
        body: "Spotify/Apple Music student pricing ($5-6/month vs. $11), Amazon Prime Student (6-month free trial then half price), Adobe Creative Cloud (60% off), Microsoft 365 (often free through your university), museum memberships, transit passes, movie theaters. Always ask if there's a student rate before paying full price.",
      },
      {
        heading: "Starting to invest even as a student",
        body: "If you have $25-50/month after expenses and a small emergency cushion, consider a Roth IRA. Contributions are after-tax but grow tax-free. The contribution limit is $7,000/year (2024) but you can only contribute up to your earned income. Starting at 20 vs. 30 can mean $200,000+ difference at retirement due to compounding.",
      },
    ],
  },
];

export default function FinancesPage({ searchParams }: { searchParams: { from?: string } }) {
  const from = searchParams?.from ?? "";
  const { href: backHref, label: backLabel } = backNav(from);

  const isPreCollege = from === "pre-college";
  const isDuringCollege = from === "during-college";

  const SECTIONS = isPreCollege
    ? PRE_COLLEGE_SECTIONS
    : isDuringCollege
    ? DURING_COLLEGE_SECTIONS
    : POST_COLLEGE_SECTIONS;

  const title = isPreCollege
    ? "Financial Aid & Student Finances"
    : isDuringCollege
    ? "Taxes, Income & Budgeting in College"
    : "Money & Benefits 101";
  const subtitle = isPreCollege
    ? "FAFSA, grants, loans, budgeting, and building credit"
    : isDuringCollege
    ? "What to know about taxes, internship income, and managing money"
    : "Everything HR assumes you already know";

  return (
    <PremiumShell title={title} subtitle={subtitle}>
      <div style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 48 }}>

        <div style={{ marginBottom: 20 }}>
          <Link href={backHref} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontWeight: 700 }}>{backLabel}</Link>
        </div>

        <div style={{ marginBottom: 28, padding: 18, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--text-primary)" }}>Note:</strong> This is general educational information, not financial advice. For decisions that significantly impact your finances, consider speaking with a certified financial planner (CFP).
        </div>

        {/* Quick nav */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
          {SECTIONS.map(({ id, icon, title: sTitle, color }) => (
            <a key={id} href={`#${id}`} style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid var(--card-border)", background: "var(--card-bg)", color, fontSize: 13, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{icon}</span>{sTitle.split(":")[0]}
            </a>
          ))}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          {SECTIONS.map(({ id, icon, title: sTitle, color, content }) => (
            <div key={id} id={id} style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))", overflow: "hidden" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--card-border-soft)", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>{icon}</span>
                <div style={{ fontSize: 17, fontWeight: 950, color }}>{sTitle}</div>
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
