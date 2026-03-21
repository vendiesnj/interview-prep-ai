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

const CHECKLIST_SECTIONS = [
  {
    phase: "Week 1",
    color: "var(--accent)",
    items: [
      { key: "w1_badge", label: "Get your badge, access cards, and equipment set up" },
      { key: "w1_accounts", label: "Activate all work accounts (email, Slack, tools, VPN)" },
      { key: "w1_manager", label: "Schedule a 1:1 with your manager — ask about their communication preferences" },
      { key: "w1_team", label: "Introduce yourself to your immediate team — name, where you're from, what you'll be working on" },
      { key: "w1_benefits_deadline", label: "Find out your benefits enrollment deadline (often 30 days from start)" },
      { key: "w1_handbook", label: "Read the employee handbook — especially PTO policy and expense reimbursement" },
      { key: "w1_org_chart", label: "Get the org chart — understand who reports to who above and around you" },
    ],
  },
  {
    phase: "Month 1",
    color: "#10B981",
    items: [
      { key: "m1_401k", label: "Enroll in your 401k — don't skip the employer match, it's free money" },
      { key: "m1_health", label: "Select your health insurance plan (PPO vs HDHP — see Finances guide)" },
      { key: "m1_direct_deposit", label: "Set up direct deposit with your routing and account number" },
      { key: "m1_w4", label: "Review your W-4 withholding — most new grads use Single/0 allowances" },
      { key: "m1_emergency_fund", label: "Start an emergency fund — goal is 3 months of expenses" },
      { key: "m1_wins", label: "Document your first visible win — email it to your manager in a recap" },
      { key: "m1_lunch", label: "Have lunch with at least 3 people outside your immediate team" },
      { key: "m1_30_60_90", label: "Write a personal 30/60/90 day plan and share it with your manager" },
    ],
  },
  {
    phase: "Month 3",
    color: "#8B5CF6",
    items: [
      { key: "m3_feedback", label: "Ask your manager for informal feedback — 'What's one thing I could do better?'" },
      { key: "m3_peers", label: "Identify 2–3 peers who are excellent at your job and learn from them specifically" },
      { key: "m3_contribution", label: "Have a clear answer to: 'What have I shipped or contributed so far?'" },
      { key: "m3_network", label: "Connect with 5+ colleagues on LinkedIn while their faces are still fresh" },
      { key: "m3_budget", label: "Build a monthly budget — income, rent, food, savings, subscriptions" },
      { key: "m3_roth", label: "Consider opening a Roth IRA if your income is under the limit (~$161k in 2024)" },
      { key: "m3_review_prep", label: "Find out when your first performance review is and start a brag doc now" },
    ],
  },
];

const TIPS = [
  {
    title: "Ask more questions than you think is normal",
    body: "No one expects you to know everything in your first 90 days. Asking thoughtful questions signals engagement, not ignorance. The employees who struggle are usually the ones who didn't ask.",
  },
  {
    title: "Write everything down",
    body: "Processes, logins, acronyms, people's names — take notes constantly. You'll reference them more than you expect, and it prevents repeating the same questions twice.",
  },
  {
    title: "Show up to optional things",
    body: "Team lunches, optional all-hands, informal coffees — these feel low stakes but are how you build the informal relationships that accelerate your career.",
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

export default function FirstYearPage() {
  const searchParams = useSearchParams();
  const { href: backHref, label: backLabel } = backNav(searchParams.get("from"));

  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("ipc_career_checklist_v1") ?? "{}");
    } catch {
      return {};
    }
  });

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("ipc_career_checklist_v1", JSON.stringify(next));
      return next;
    });
  };

  const totalItems = CHECKLIST_SECTIONS.flatMap((s) => s.items).length;
  const completedItems = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((completedItems / totalItems) * 100);

  return (
    <PremiumShell title="Your First 90 Days" subtitle="Checklists and priorities for your first job">
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
        {CHECKLIST_SECTIONS.map(({ phase, color, items }) => {
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
          <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.8, color: "var(--accent)", marginBottom: 16 }}>THINGS NOBODY TELLS YOU</div>
          <div style={{ display: "grid", gap: 12 }}>
            {TIPS.map(({ title, body }) => (
              <div key={title} style={{ padding: 18, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))" }}>
                <div style={{ fontSize: 14, fontWeight: 950, color: "var(--text-primary)", marginBottom: 6 }}>{title}</div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>{body}</p>
              </div>
            ))}
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
