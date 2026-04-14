"use client";

import { Suspense, useState } from "react";
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
    phase: "Week 1 - Navigate the New Environment",
    color: "#10B981",
    items: [
      { key: "pc_w1_orientation", label: "Attend orientation fully - the information matters, and so does showing up" },
      { key: "pc_w1_neighbors", label: "Introduce yourself to your RA and 2-3 neighbors by name" },
      { key: "pc_w1_resources", label: "Physically walk to: tutoring center, writing lab, career center, and counseling services" },
      { key: "pc_w1_classes", label: "Find your classrooms before the first day - don't walk in late and anxious" },
      { key: "pc_w1_portal", label: "Set up your student email and learn your university portal (Canvas, Blackboard, etc.)" },
      { key: "pc_w1_finaid_disbursement", label: "Find out when and how your financial aid disbursement arrives - and budget it before spending any" },
    ],
  },
  {
    phase: "Month 1 - Build Your Foundation",
    color: "#2563EB",
    items: [
      { key: "pc_m1_advisor", label: "Meet with your academic advisor before your second semester registration" },
      { key: "pc_m1_officehours", label: "Go to at least one professor's office hours - even if you don't have a question yet" },
      { key: "pc_m1_clubs", label: "Join 1-2 clubs or organizations - not 5. Quality over quantity." },
      { key: "pc_m1_schedule", label: "Establish a study routine before midterms, not after your first bad grade" },
      { key: "pc_m1_career_center", label: "Visit the career center - even in freshman year, they can help with resume and planning" },
      { key: "pc_m1_support", label: "Identify one person on campus you could call if something went wrong - RA, advisor, campus counselor" },
    ],
  },
  {
    phase: "First Semester - Set Your Trajectory",
    color: "#8B5CF6",
    items: [
      { key: "pc_s1_professor", label: "Build a real relationship with one professor - attend office hours, engage, follow up after class" },
      { key: "pc_s1_degree", label: "Understand your degree requirements and map a rough 4-year plan with your advisor" },
      { key: "pc_s1_workstudy", label: "Apply for work-study or campus jobs if you have the award or need income" },
      { key: "pc_s1_summer", label: "Research summer opportunities in December - internship and research program apps open early" },
      { key: "pc_s1_gpa", label: "Know the GPA requirements for any scholarships you received - some have minimums to maintain" },
      { key: "pc_s1_brag_doc", label: "Start a running list of things you've done, learned, and contributed - you'll use this later" },
    ],
  },
];

const PRE_COLLEGE_TIPS = [
  {
    title: "You're not behind - you just haven't been taught the unwritten rules yet",
    body: "First-gen students often arrive without knowing things their classmates take for granted: how to email a professor, what office hours are actually for, that advisors exist to help not gatekeep, or that asking questions is respected not embarrassing. None of this means you're less prepared. It means you're navigating systems that weren't designed to explain themselves. You'll learn them, and quickly.",
  },
  {
    title: "Code-switching is real - and it's a skill, not a betrayal",
    body: "You may find yourself speaking differently in class, in professional settings, or around certain groups than you do at home. This is normal. Many first-gen students feel guilt about it - like changing how you present yourself means leaving your identity behind. It doesn't. Learning to move between environments is a professional skill. The version of you at home and the version of you in a board room are both real. You don't have to choose.",
  },
  {
    title: "Imposter syndrome will feel like a fact, not a feeling",
    body: "At some point you'll look around and think everyone else belongs here and you're the mistake. That thought is a liar. Every student in that room has their own version of it. First-gen students often carry an extra layer because you don't have a parent who went through this to tell you it's normal. So here it is: it's normal. The discomfort doesn't mean you're wrong to be there. It means you're growing.",
  },
  {
    title: "Family may not understand - and that's hard, but real",
    body: "Your family may have limited frame of reference for what college actually involves. They may not understand why you need to stay for finals week, why networking is part of your education, or why you're stressed about something that 'just sounds like school.' They love you and have no context. You may need to explain yourself more than you expected. That's a real emotional cost. Find people on campus - professors, advisors, counselors, other first-gen students - who get it without explanation.",
  },
  {
    title: "Using resources isn't charity - it's strategy",
    body: "Tutoring, counseling, writing centers, financial aid assistance, career coaching - these exist because your tuition and fees fund them. Using them isn't a sign of weakness or need. It's what students who succeed do. The students who max out every resource aren't the ones who struggled most - they're often the ones who ended up strongest. Treat campus resources like equipment in a gym. They're there. Use them.",
  },
  {
    title: "Relationships with professors change everything",
    body: "Professors write recommendation letters that open graduate school and job doors. They know researchers who have lab openings. They connect students to fellowships, scholarships, and opportunities that never get posted publicly. You access all of this by going to office hours before you need something - just to talk about ideas, ask questions, share what you're working on. First-gen students often underuse this. Don't.",
  },
  {
    title: "Your financial reality is different - plan accordingly",
    body: "If you're on financial aid, work-study, or managing costs your classmates aren't thinking about, budget your aid disbursement the moment it arrives. Know your refund schedule. Know whether your scholarship requires maintaining a certain GPA or credit load. Know that the financial aid office will work with you if something changes at home - a parent's job loss, a family emergency - but only if you tell them. They can't help what they don't know about.",
  },
];

// Override to use styled tips (title+body format)
const PRE_COLLEGE_TIPS_STYLED = true;

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
        borderRadius: "var(--radius-xs)",
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
  tips: string[] | { title: string; body: string }[];
  tipsStyled?: boolean;
};

function getContent(from: string | null): StageContent {
  if (from === "pre-college") {
    return {
      shellTitle: "First-Gen College Student Guide",
      shellSubtitle: "The unwritten rules, cultural shifts, and practical steps for navigating college when no one in your family has done it before",
      tipsHeading: "THINGS NOBODY TELLS FIRST-GEN STUDENTS",
      sections: PRE_COLLEGE_SECTIONS,
      tips: PRE_COLLEGE_TIPS,
      tipsStyled: PRE_COLLEGE_TIPS_STYLED,
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

function FirstYearContent() {
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
            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--accent)" }}>{completedItems} / {totalItems} completed</span>
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
                <div style={{ fontSize: 15, fontWeight: 800, color, display: "flex", alignItems: "center", gap: 8 }}>
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
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.8, color: "var(--accent)", marginBottom: 16 }}>{content.tipsHeading}</div>
          <div style={{ display: "grid", gap: 12 }}>
            {content.tipsStyled
              ? (content.tips as unknown as { title: string; body: string }[]).map(({ title, body }) => (
                  <div key={title} style={{ padding: 18, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>{title}</div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>{body}</p>
                  </div>
                ))
              : (content.tips as string[]).map((tip, i) => (
                  <div key={i} style={{ padding: 18, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>{tip}</p>
                  </div>
                ))
            }
          </div>
        </div>

        <div style={{ marginTop: 28, padding: "18px 22px", borderRadius: "var(--radius-xl)", border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Ready to log your career status and benchmark your salary against peers?</div>
          <Link href="/career-checkin" style={{ padding: "10px 16px", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" }}>
            Career check-in →
          </Link>
        </div>
      </div>
    </PremiumShell>
  );
}

export default function FirstYearPage() {
  return (
    <Suspense>
      <FirstYearContent />
    </Suspense>
  );
}
