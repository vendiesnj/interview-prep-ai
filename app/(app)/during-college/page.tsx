"use client";

import Link from "next/link";
import { useState } from "react";
import PremiumShell from "@/app/components/PremiumShell";
import ChecklistSection, { type ChecklistProgressEntry } from "@/app/components/ChecklistSection";
import MiniCalendar, { type ScheduledItem } from "@/app/components/MiniCalendar";
import StreakBanner from "@/app/components/StreakBanner";

const TODOS = [
  { id: "interview_prep",  icon: "🎙️", label: "Interview Prep Session",    desc: "Practice behavioral and situational questions for internships and full-time roles.", href: "/practice",       color: "#2563EB", time: "~15 min" },
  { id: "networking",      icon: "🤝", label: "Networking Pitch Practice",  desc: "Career fair cold approaches, LinkedIn outreach, and alumni coffee chats.",             href: "/networking",     color: "#0EA5E9", time: "~10 min" },
  { id: "public_speaking", icon: "🎤", label: "Public Speaking Session",    desc: "Class presentations, club pitches, and leadership panel prep.",                        href: "/public-speaking", color: "#8B5CF6", time: "~10 min" },
  { id: "career_checkin",  icon: "✅", label: "Career Check-In",            desc: "Log your GPA, internship status, salary goals, and financial snapshot.",               href: "/career-checkin",  color: "#10B981", time: "~5 min" },
  { id: "aptitude",        icon: "🧭", label: "Career Assessment",           desc: "Answer questions about your strengths and interests to surface career directions.",     href: "/aptitude?from=during-college", color: "#F59E0B", time: "~5 min" },
  { id: "budget_tool", icon: "💳", label: "Monthly Budget Builder", desc: "Track internship income, rent, groceries, and subscriptions to see where your money goes in real time.", href: "/career-guide/budget", color: "#10B981", time: "~5 min" },
];

const CHECKLIST = [
  { id: "resume",           label: "Build your first resume",                       desc: "One page, reverse chronological, action verbs (led, built, reduced, increased), quantified results where possible. Your education goes at the top until you have 2+ years of experience. Have the campus writing center or career center review it - free and underused.", linkHref: "/resume-gap", linkLabel: "Analyze your resume with AI" },
  { id: "linkedin",         label: "Set up or update LinkedIn",                     desc: "Add your university, graduation year, a clean headshot, a 2-3 sentence summary, and any clubs, research, or volunteer work. Connect with classmates, professors, and people from internships while their names are fresh. Recruiters actively search for students by school and grad year.", linkHref: "https://www.linkedin.com", linkLabel: "Open LinkedIn" },
  { id: "internship_apps",  label: "Apply to at least 3 internships",              desc: "Start in September for summer internships - many Fortune 500 recruiting cycles close by November. Apply to a mix: 1-2 reach companies, 2-3 realistic targets, and 1-2 safety options. Track each application in a spreadsheet with company, date, contact, and status.", linkHref: "https://www.linkedin.com/jobs/", linkLabel: "Browse internships on LinkedIn" },
  { id: "taxes_filed",      label: "File your taxes (every April)",                desc: "If you earned income from a job, work-study, or freelance work, you need to file by April 15. Even if you earned less than the threshold, file if taxes were withheld - you'll likely get a refund. IRS Free File is free for income under $79k. Your school's VITA program offers free in-person help.", linkHref: "https://apps.irs.gov/app/freeFile/", linkLabel: "IRS Free File" },
  { id: "fafsa_renewed",    label: "Renew FAFSA each year",                        desc: "FAFSA does not auto-renew. You must reapply each October 1 for the following academic year. Your aid amount can change based on your family's income - if your situation changed significantly (parent job loss, divorce, etc.), contact financial aid directly, don't just submit the form.", linkHref: "https://studentaid.gov/h/apply-for-aid/fafsa", linkLabel: "Renew on StudentAid.gov" },
  { id: "advisor_semester", label: "Meet with advisor each semester",              desc: "Before registration each semester, meet with your advisor to review your degree audit - a document showing which requirements you've completed and which remain. Catching a missing requirement senior year means an extra semester. Don't let that happen." },
  { id: "career_fair",      label: "Attend at least one career fair",              desc: "Come with printed resumes (10+ copies), professional clothes, and a practiced 30-second pitch. Research 5-10 companies beforehand so you can ask specific questions. Follow up with every recruiter you spoke with within 48 hours on LinkedIn." },
  { id: "rec_letter",       label: "Ask a professor for a recommendation letter",  desc: "Ask professors who actually know you - from office hours, a project, or a class where you were engaged. Ask at least 6 weeks before any deadline. Provide them with your resume, the opportunity you're applying for, and key points you'd like them to emphasize." },
  { id: "gpa_check",        label: "Check internship/grad school GPA requirements", desc: "Many competitive internship programs (consulting, finance, federal government) list minimum GPAs of 3.0-3.5. Graduate programs often require 3.0+. Check requirements for your target roles now, not senior year. Know what you're working toward." },
  { id: "emergency_fund",   label: "Start a $500 emergency fund",                 desc: "Before buying anything discretionary, build a $500 buffer in a separate savings account. This is your flat tire, medical copay, or last-minute travel fund. It prevents $500 problems from becoming $500 of credit card debt.", linkHref: "/financial-literacy", linkLabel: "Financial Literacy tools" },
];

const RESOURCES = [
  {
    icon: "💼",
    label: "Landing Your First Internship",
    desc: "Before you start, first two weeks, mid-internship, and how to get a return offer — full checklist.",
    href: "/career-guide/first-year?from=during-college",
    tag: "Career",
  },
  {
    icon: "🧾",
    label: "Filing Taxes for the First Time",
    desc: "Do you need to file? W-2 vs. 1099 internships, education credits, and free filing options.",
    href: "/career-guide/finances?from=during-college",
    tag: "Finance",
  },
  {
    icon: "💰",
    label: "Managing Money on a Student Income",
    desc: "50/30/20 adapted for students, grocery strategy, student discounts, and starting a Roth IRA early.",
    href: "/career-guide/finances?from=during-college",
    tag: "Finance",
  },
  {
    icon: "💳",
    label: "Building Credit During College",
    desc: "Best student cards, what actually moves your score, and monitoring your credit for free.",
    href: "/career-guide/finances?from=during-college",
    tag: "Finance",
  },
  {
    icon: "🗺️",
    label: "Career Paths & Specialization",
    desc: "How to specialize within your major, grad school vs. work, and the internship-to-offer pipeline.",
    href: "/career-guide/career-paths?from=during-college",
    tag: "Career",
  },
  {
    icon: "🏠",
    label: "Off-Campus Housing Guide",
    desc: "Finding listings, understanding your first lease, splitting costs with roommates, and getting your deposit back.",
    href: "/career-guide/housing?from=during-college",
    tag: "Life",
  },
  {
    icon: "📊",
    label: "Peer Salary & Career Benchmarks",
    desc: "See how your cohort is doing — employment rate, salary distribution, industry breakdown.",
    href: "/career-guide/benchmarks?from=during-college",
    tag: "Career",
  },
  {
    icon: "📄",
    label: "Resume Gap Analyzer",
    desc: "Paste a job description and your resume to instantly identify missing keywords and skill gaps.",
    href: "/resume-gap",
    tag: "Career",
  },
];

const TAG_COLORS: Record<string, string> = { Finance: "#10B981", Career: "#2563EB", Life: "#8B5CF6" };

export default function DuringCollegePage() {
  const [progress, setProgress] = useState<ChecklistProgressEntry[]>([]);

  const scheduledItems: ScheduledItem[] = CHECKLIST.map(item => {
    const entry = progress.find(p => p.itemId === item.id);
    return { itemId: item.id, label: item.label, stage: "during_college", done: entry?.done ?? false, scheduledDate: entry?.scheduledDate ?? null };
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
          <h1 style={{ margin: "0 0 10px", fontSize: 32, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.7, lineHeight: 1.2 }}>
            Build skills that land opportunities.
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 600 }}>
            College is the time to practice, explore, and build the foundation your career sits on. Schedule tasks on your calendar, stay ahead — not just in class, but in the real world.
          </p>
        </div>

        <StreakBanner />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 28, alignItems: "start" }}>
          <div>
            {/* To-Do's */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#2563EB", textTransform: "uppercase", marginBottom: 16 }}>Practice & Tools</div>
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
              <ChecklistSection stage="during_college" items={CHECKLIST} accentColor="#2563EB" onProgressChange={setProgress} />
            </div>

            {/* Resources */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#2563EB", textTransform: "uppercase", marginBottom: 16 }}>Guides & Resources</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {RESOURCES.map((r) => (
                  <Link key={r.label} href={r.href} style={{ textDecoration: "none" }}>
                    <div style={{ padding: "16px 18px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{r.icon}</span>
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

          <MiniCalendar items={scheduledItems} accentColor="#2563EB" stage="during_college" onSchedule={handleSchedule} />
        </div>

      </div>
    </PremiumShell>
  );
}
