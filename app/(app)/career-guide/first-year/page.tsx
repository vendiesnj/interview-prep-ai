"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PremiumShell from "@/app/components/PremiumShell";

function backNav(from: string | null) {
  if (from === "pre-college") return { href: "/pre-college", label: "← Pre-College" };
  if (from === "during-college") return { href: "/during-college", label: "← During College" };
  if (from === "post-college") return { href: "/post-college", label: "← Post-College" };
  return { href: "/career-guide", label: "← Career Guide" };
}

// ── POST-COLLEGE (default) ────────────────────────────────────────────────────

const POST_COLLEGE_SECTIONS = [
  {
    phase: "Week 1",
    color: "var(--accent)",
    items: [
      { key: "w1_badge", label: "Get your badge, access cards, and equipment set up" },
      { key: "w1_accounts", label: "Activate all work accounts (email, Slack, tools, VPN)" },
      { key: "w1_manager", label: "Schedule a 1:1 with your manager - ask about their communication preferences" },
      { key: "w1_team", label: "Introduce yourself to your immediate team - name, where you're from, what you'll be working on" },
      { key: "w1_benefits_deadline", label: "Find out your benefits enrollment deadline (often 30 days from start)" },
      { key: "w1_handbook", label: "Read the employee handbook - especially PTO policy and expense reimbursement" },
      { key: "w1_org_chart", label: "Get the org chart - understand who reports to who above and around you" },
    ],
  },
  {
    phase: "Month 1",
    color: "#10B981",
    items: [
      { key: "m1_401k", label: "Enroll in your 401k - don't skip the employer match, it's free money" },
      { key: "m1_health", label: "Select your health insurance plan (PPO vs HDHP - see Finances guide)" },
      { key: "m1_direct_deposit", label: "Set up direct deposit with your routing and account number" },
      { key: "m1_w4", label: "Review your W-4 withholding - most new grads use Single/0 allowances" },
      { key: "m1_emergency_fund", label: "Start an emergency fund - goal is 3 months of expenses" },
      { key: "m1_wins", label: "Document your first visible win - email it to your manager in a recap" },
      { key: "m1_lunch", label: "Have lunch with at least 3 people outside your immediate team" },
      { key: "m1_30_60_90", label: "Write a personal 30/60/90 day plan and share it with your manager" },
    ],
  },
  {
    phase: "Month 3",
    color: "#8B5CF6",
    items: [
      { key: "m3_feedback", label: "Ask your manager for informal feedback - 'What's one thing I could do better?'" },
      { key: "m3_peers", label: "Identify 2–3 peers who are excellent at your job and learn from them specifically" },
      { key: "m3_contribution", label: "Have a clear answer to: 'What have I shipped or contributed so far?'" },
      { key: "m3_network", label: "Connect with 5+ colleagues on LinkedIn while their faces are still fresh" },
      { key: "m3_budget", label: "Build a monthly budget - income, rent, food, savings, subscriptions" },
      { key: "m3_roth", label: "Consider opening a Roth IRA if your income is under the limit (~$161k in 2024)" },
      { key: "m3_review_prep", label: "Find out when your first performance review is and start a brag doc now" },
    ],
  },
];

const POST_COLLEGE_TIPS = [
  {
    title: "Ask more questions than you think is normal",
    body: "No one expects you to know everything in your first 90 days. Asking thoughtful questions signals engagement, not ignorance. The employees who struggle are usually the ones who didn't ask.",
  },
  {
    title: "Write everything down",
    body: "Processes, logins, acronyms, people's names - take notes constantly. You'll reference them more than you expect, and it prevents repeating the same questions twice.",
  },
  {
    title: "Show up to optional things",
    body: "Team lunches, optional all-hands, informal coffees - these feel low stakes but are how you build the informal relationships that accelerate your career.",
  },
  {
    title: "Separate your first impression from your actual performance",
    body: "People form opinions in weeks. Being present, responsive, and positive in month one shapes how your work is perceived for months after. It's not fair, but it's real.",
  },
  {
    title: "Track every win, no matter how small",
    body: "Start a 'brag doc' on day one. Bullet points of things you did, shipped, fixed, improved. You'll need it for reviews, raises, and future job applications.",
  },
];

// ── PRE-COLLEGE ───────────────────────────────────────────────────────────────

const PRE_COLLEGE_SECTIONS = [
  {
    phase: "Week 1",
    color: "#10B981",
    items: [
      { key: "pc_w1_orientation", label: "Attend orientation fully (it's worth it)" },
      { key: "pc_w1_neighbors", label: "Introduce yourself to your RA and at least 3 neighbors" },
      { key: "pc_w1_resources", label: "Locate the library, tutoring center, career center, and counseling center" },
      { key: "pc_w1_classes", label: "Find out where your classes are before the first day" },
      { key: "pc_w1_portal", label: "Set up your student email and university portal" },
    ],
  },
  {
    phase: "Month 1",
    color: "#2563EB",
    items: [
      { key: "pc_m1_advisor", label: "Meet with your academic advisor" },
      { key: "pc_m1_clubs", label: "Join 1-2 clubs or organizations (not 5)" },
      { key: "pc_m1_schedule", label: "Establish a study schedule before midterms" },
      { key: "pc_m1_finaid", label: "Figure out how your financial aid disbursement works" },
      { key: "pc_m1_officehours", label: "Find at least one professor whose office hours you'll actually attend" },
    ],
  },
  {
    phase: "First Semester",
    color: "#8B5CF6",
    items: [
      { key: "pc_s1_professor", label: "Build a relationship with at least one professor (rec letters come from these)" },
      { key: "pc_s1_degree", label: "Understand your degree requirements and 4-year plan" },
      { key: "pc_s1_workstudy", label: "Apply for any work-study jobs if you have the award" },
      { key: "pc_s1_summer", label: "Start thinking about summer - research programs and internships open early" },
      { key: "pc_s1_gpa", label: "Check your GPA threshold for any scholarships you received" },
    ],
  },
];

const PRE_COLLEGE_TIPS = [
  "Office hours aren't just for struggling - they're how you get to know professors who write you recommendations",
  "Your advisor is your GPS - meet every semester, not just when something is wrong",
  "The career center is useful from freshman year, not just senior year",
  "Asking for help isn't weakness - the students who thrive are the ones who use every resource",
  "Everyone feels out of place freshman year - even the ones who look confident",
];

// ── DURING-COLLEGE ────────────────────────────────────────────────────────────

const DURING_COLLEGE_SECTIONS = [
  {
    phase: "Before You Start",
    color: "#2563EB",
    items: [
      { key: "dc_pre_research", label: "Research the company, team, and your manager on LinkedIn" },
      { key: "dc_pre_contact", label: "Reach out to your contact with any onboarding questions" },
      { key: "dc_pre_questions", label: "Prepare questions to ask in your first 1-on-1" },
      { key: "dc_pre_accounts", label: "Set up any required accounts or software" },
      { key: "dc_pre_commute", label: "Plan your commute/schedule so day one isn't chaotic" },
    ],
  },
  {
    phase: "First Two Weeks",
    color: "#0EA5E9",
    items: [
      { key: "dc_w2_intros", label: "Introduce yourself to everyone on the team by name" },
      { key: "dc_w2_success", label: "Ask your manager what success looks like for this internship" },
      { key: "dc_w2_schedule", label: "Schedule time with people outside your immediate team" },
      { key: "dc_w2_notes", label: "Take notes on everything - processes, acronyms, systems" },
      { key: "dc_w2_questions", label: "Ask at least one smart question per week in meetings" },
    ],
  },
  {
    phase: "Mid-Internship",
    color: "#8B5CF6",
    items: [
      { key: "dc_mid_feedback", label: "Request informal feedback - 'what's one thing I can do better?'" },
      { key: "dc_mid_own", label: "Identify one project you can own and see through to completion" },
      { key: "dc_mid_document", label: "Document your work and impact as you go" },
      { key: "dc_mid_linkedin", label: "Connect with other interns and full-time employees on LinkedIn" },
      { key: "dc_mid_returnoffer", label: "Ask about the return offer process and timeline" },
    ],
  },
  {
    phase: "Toward the End",
    color: "#10B981",
    items: [
      { key: "dc_end_summary", label: "Prepare a concise summary of your contributions" },
      { key: "dc_end_thankyou", label: "Send thank-you notes to your manager and key mentors" },
      { key: "dc_end_nextsteps", label: "Ask directly about next steps for a return offer if you want one" },
      { key: "dc_end_network", label: "Stay connected - the intern network is valuable for years" },
    ],
  },
];

const DURING_COLLEGE_TIPS = [
  "They make their manager's life easier, not harder. Proactive updates, no hand-holding.",
  "They treat every meeting like it matters - no phones, real engagement",
  "They ask one good question: 'Is there anything you need from me that I haven't thought of?'",
  "They document wins as they happen. 'I helped' is weak. 'I built X that reduced Y by Z' gets return offers.",
  "They build relationships laterally - peers remember you when they're hiring in 5 years",
];

// ── Component ─────────────────────────────────────────────────────────────────

function CheckItem({ id, label, checked, onToggle }: { id: string; label: string; checked: boolean; onToggle: (id: string) => void }) {
  return (
    <div
      onClick={() => onToggle(id)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "10px 12px",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        background: checked ? "var(--accent-soft)" : "transparent",
        transition: "background 150ms",
      }}
    >
      <div style={{
        width: 20,
        height: 20,
        borderRadius: 6,
        border: `2px solid ${checked ? "var(--accent)" : "var(--card-border)"}`,
        background: checked ? "var(--accent)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 1,
        transition: "all 150ms",
      }}>
        {checked && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>}
      </div>
      <span style={{ fontSize: 14, color: checked ? "var(--text-muted)" : "var(--text-primary)", lineHeight: 1.5, textDecoration: checked ? "line-through" : "none" }}>
        {label}
      </span>
    </div>
  );
}

type StageContent = {
  shellTitle: string;
  shellSubtitle: string;
  tipsHeading: string;
  sections: { phase: string; color: string; items: { key: string; label: string }[] }[];
  tips: string[];
  tipsStyled?: boolean;
};

function getContent(from: string | null): StageContent {
  if (from === "pre-college") {
    return {
      shellTitle: "Starting College on the Right Foot",
      shellSubtitle: "Academic habits, campus resources, and getting ahead from week one",
      tipsHeading: "THINGS FIRST-GEN STUDENTS WISH THEY KNEW",
      sections: PRE_COLLEGE_SECTIONS,
      tips: PRE_COLLEGE_TIPS,
    };
  }
  if (from === "during-college") {
    return {
      shellTitle: "Landing and Leveraging Your Internship",
      shellSubtitle: "From application to return offer - everything that actually matters",
      tipsHeading: "WHAT INTERNS WHO GET RETURN OFFERS DO DIFFERENTLY",
      sections: DURING_COLLEGE_SECTIONS,
      tips: DURING_COLLEGE_TIPS,
    };
  }
  // post-college default
  return {
    shellTitle: "Your First 90 Days",
    shellSubtitle: "Checklists and priorities for your first job",
    tipsHeading: "THINGS NOBODY TELLS YOU",
    sections: POST_COLLEGE_SECTIONS,
    tips: POST_COLLEGE_TIPS,
    tipsStyled: true,
  };
}

export default function FirstYearPage() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const { href: backHref, label: backLabel } = backNav(from);
  const content = getContent(from);

  const storageKey = from === "pre-college"
    ? "ipc_career_checklist_precollege_v1"
    : from === "during-college"
    ? "ipc_career_checklist_duringcollege_v1"
    : "ipc_career_checklist_v1";

  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    } catch {
      return {};
    }
  });

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const totalItems = content.sections.flatMap((s) => s.items).length;
  const completedItems = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((completedItems / totalItems) * 100);

  return (
    <PremiumShell title={content.shellTitle} subtitle={content.shellSubtitle}>
      <div style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 48 }}>

        <div style={{ marginBottom: 8 }}>
          <Link href={backHref} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontWeight: 700 }}>{backLabel}</Link>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 32, padding: 20, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: "var(--text-primary)" }}>Overall progress</span>
            <span style={{ fontSize: 14, fontWeight: 950, color: "var(--accent)" }}>{completedItems} / {totalItems} completed</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 99, transition: "width 300ms" }} />
          </div>
        </div>

        {/* Checklist sections */}
        {content.sections.map(({ phase, color, items }) => {
          const sectionComplete = items.filter((i) => checked[i.key]).length;
          return (
            <div key={phase} style={{ marginBottom: 24, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--card-border-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 15, fontWeight: 950, color, display: "flex", alignItems: "center", gap: 8 }}>
                  {phase}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>
                  {sectionComplete}/{items.length}
                </div>
              </div>
              <div style={{ padding: "8px 8px" }}>
                {items.map(({ key, label }) => (
                  <CheckItem key={key} id={key} label={label} checked={!!checked[key]} onToggle={toggle} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Tips */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.8, color: "var(--accent)", marginBottom: 16 }}>{content.tipsHeading}</div>
          <div style={{ display: "grid", gap: 12 }}>
            {content.tipsStyled
              ? (content.tips as unknown as { title: string; body: string }[]).map(({ title, body }) => (
                  <div key={title} style={{ padding: 18, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))" }}>
                    <div style={{ fontSize: 14, fontWeight: 950, color: "var(--text-primary)", marginBottom: 6 }}>{title}</div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>{body}</p>
                  </div>
                ))
              : content.tips.map((tip) => (
                  <div key={tip} style={{ padding: 18, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>{tip}</p>
                  </div>
                ))
            }
          </div>
        </div>

        <div style={{ marginTop: 28, padding: "18px 22px", borderRadius: "var(--radius-xl)", border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Ready to log your career status and benchmark your salary against peers?</div>
          <Link href="/career-checkin" style={{ padding: "10px 16px", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "#fff", textDecoration: "none", fontWeight: 950, fontSize: 13, whiteSpace: "nowrap" }}>
            Career check-in →
          </Link>
        </div>
      </div>
    </PremiumShell>
  );
}
