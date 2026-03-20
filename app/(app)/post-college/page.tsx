"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";
import PremiumShell from "@/app/components/PremiumShell";

const TODOS = [
  { id: "career_checkin",   icon: "✅", label: "Career Check-In",           desc: "Log your current role, salary, savings, and loan balance for a full financial snapshot.",         href: "/career-checkin",         color: "#10B981", time: "~5 min" },
  { id: "retirement_proj",  icon: "📈", label: "Retirement Projection",      desc: "See when you could retire based on your salary, savings rate, and loan payoff timeline.",         href: "/career-guide/retirement", color: "#8B5CF6", time: "~3 min" },
  { id: "interview_prep",   icon: "🎙️", label: "Interview Prep Session",     desc: "Practice for your next role, promotion conversation, or internal opportunity.",                   href: "/practice",               color: "#2563EB", time: "~15 min" },
  { id: "networking",       icon: "🤝", label: "Networking Pitch Practice",  desc: "Industry events, LinkedIn cold outreach, and informational interviews with senior leaders.",       href: "/networking",             color: "#0EA5E9", time: "~10 min" },
  { id: "salary_bench",     icon: "📊", label: "Peer Salary Benchmarks",     desc: "See where your compensation sits relative to peers with similar experience and background.",       href: "/career-guide/benchmarks", color: "#F59E0B", time: "~3 min" },
];

const CHECKLIST = [
  { id: "401k_enrolled",    label: "Enroll in your 401(k)",                        desc: "Do this in your first 30 days — especially if your employer matches contributions." },
  { id: "contribution_set", label: "Set your 401(k) contribution rate",            desc: "Aim for at least enough to get the full employer match. Increase 1% per year." },
  { id: "benefits_reviewed", label: "Review all your benefits (health, dental, FSA)", desc: "Open enrollment windows close — missing them means waiting a full year." },
  { id: "w4_set",           label: "Set up your W-4 correctly",                    desc: "Getting this wrong means a surprise tax bill or unnecessary withholding." },
  { id: "paycheck_review",  label: "Understand your first paycheck",               desc: "Gross vs. net, FICA, state taxes, and what you can actually spend." },
  { id: "loans_plan",       label: "Set up your student loan repayment plan",      desc: "Federal loans have income-driven options. Private loans should be refinanced at the right time." },
  { id: "emergency_3mo",    label: "Build a 3-month emergency fund",               desc: "Before aggressively investing — this prevents going into debt during job transitions." },
  { id: "renter_insurance",  label: "Get renter's insurance",                      desc: "Usually $15-20/month. Protects your belongings and provides liability coverage." },
  { id: "credit_report",    label: "Check your credit report",                     desc: "Free at annualcreditreport.com. Dispute any errors — they're more common than you think." },
  { id: "budget_post",      label: "Build a post-grad budget (50/30/20 rule)",     desc: "50% needs, 30% wants, 20% savings + debt paydown. Adjust based on your debt load." },
];

const RESOURCES = [
  { icon: "🏦", label: "401k & Retirement Basics",          href: "/career-guide/retirement", tag: "Finance" },
  { icon: "💰", label: "Understanding Your Paycheck",        href: "/career-guide/finances",   tag: "Finance" },
  { icon: "📋", label: "Student Loan Repayment Options",     href: "/career-guide/finances",   tag: "Finance" },
  { icon: "📈", label: "Salary Negotiation Guide",           href: "/career-guide/first-year", tag: "Career" },
  { icon: "🏠", label: "Renting vs. Buying Your First Home", href: "/career-guide/housing",    tag: "Life" },
  { icon: "🗺️", label: "Career Progression & Paths",         href: "/career-guide/career-paths", tag: "Career" },
];

const TAG_COLORS: Record<string, string> = { Finance: "#10B981", Career: "#8B5CF6", Life: "#0EA5E9" };

function safeJSONParse<T>(raw: string | null, fallback: T): T {
  try { if (!raw) return fallback; return JSON.parse(raw) as T; } catch { return fallback; }
}

export default function PostCollegePage() {
  const { data: session, status } = useSession();
  const DONE_KEY = userScopedKey("signal_post_done", session);
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "loading") return;
    const saved = safeJSONParse<string[]>(localStorage.getItem(DONE_KEY), []);
    setDone(new Set(saved));
  }, [status, DONE_KEY]);

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem(DONE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  const checklistDone = CHECKLIST.filter((c) => done.has(c.id)).length;

  return (
    <PremiumShell hideHeader>
      <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 80 }}>

        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 99, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>🚀</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: "#8B5CF6", letterSpacing: 0.5 }}>POST-COLLEGE</span>
          </div>
          <h1 style={{ margin: "0 0 10px", fontSize: 32, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.7, lineHeight: 1.2 }}>
            Own your career and your finances.
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 600 }}>
            The first few years after graduation shape the next decade. Stay sharp on communication, get your financial foundation right, and keep building toward where you actually want to go.
          </p>
        </div>

        {/* To-Do's */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#8B5CF6", textTransform: "uppercase", marginBottom: 16 }}>Practice & Tools</div>
          <div style={{ display: "grid", gap: 12 }}>
            {TODOS.map((todo) => (
              <div key={todo.id} style={{ padding: "18px 20px", borderRadius: 16, border: "1px solid var(--card-border)", background: "var(--card-bg)", display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: todo.color + "18", border: `1px solid ${todo.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{todo.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 950, color: "var(--text-primary)" }}>{todo.label}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{todo.time}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>{todo.desc}</p>
                </div>
                <Link href={todo.href} style={{ flexShrink: 0, padding: "9px 18px", borderRadius: 10, background: todo.color, color: "#fff", fontWeight: 900, fontSize: 13, textDecoration: "none" }}>Start →</Link>
              </div>
            ))}
          </div>
        </div>

        {/* Checklist */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#8B5CF6", textTransform: "uppercase" }}>Your Checklist</div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)" }}>{checklistDone} / {CHECKLIST.length}</div>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden", marginBottom: 18 }}>
            <div style={{ height: "100%", width: `${Math.round((checklistDone / CHECKLIST.length) * 100)}%`, background: "linear-gradient(90deg, #8B5CF6, #0EA5E9)", borderRadius: 99, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {CHECKLIST.map((item) => {
              const checked = done.has(item.id);
              return (
                <div key={item.id} onClick={() => toggle(item.id)} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", borderRadius: 14, border: `1px solid ${checked ? "rgba(139,92,246,0.35)" : "var(--card-border)"}`, background: checked ? "rgba(139,92,246,0.06)" : "var(--card-bg)", cursor: "pointer", transition: "all 150ms" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? "#8B5CF6" : "var(--card-border)"}`, background: checked ? "#8B5CF6" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontSize: 13, color: "#fff", transition: "all 150ms" }}>{checked ? "✓" : ""}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: checked ? "var(--text-muted)" : "var(--text-primary)", textDecoration: checked ? "line-through" : "none" }}>{item.label}</div>
                    {!checked && <div style={{ marginTop: 3, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{item.desc}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resources */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#8B5CF6", textTransform: "uppercase", marginBottom: 16 }}>Guides & Resources</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
            {RESOURCES.map((r) => (
              <Link key={r.label} href={r.href} style={{ textDecoration: "none" }}>
                <div style={{ padding: "16px 18px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{r.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.4 }}>{r.label}</div>
                    <div style={{ marginTop: 5, display: "inline-block", fontSize: 10, fontWeight: 900, color: TAG_COLORS[r.tag] ?? "var(--accent)", background: (TAG_COLORS[r.tag] ?? "var(--accent)") + "18", padding: "2px 8px", borderRadius: 99 }}>{r.tag}</div>
                  </div>
                  <span style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 2 }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </PremiumShell>
  );
}
