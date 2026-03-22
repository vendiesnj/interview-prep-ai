"use client";

import Link from "next/link";
import { useState } from "react";
import PremiumShell from "@/app/components/PremiumShell";
import ChecklistSection, { type ChecklistProgressEntry } from "@/app/components/ChecklistSection";
import MiniCalendar, { type ScheduledItem } from "@/app/components/MiniCalendar";
import StreakBanner from "@/app/components/StreakBanner";

// ── To-Do items (interactive tools) ──────────────────────────────────────────
const TODOS = [
  {
    id: "ps_elevator",
    icon: "🎤",
    label: "Elevator Pitch",
    desc: "60-second intro you'll use at orientation, club fairs, and first-day meetings.",
    href: "/public-speaking",
    color: "#8B5CF6",
    time: "~10 min",
  },
  {
    id: "interview_basics",
    icon: "🎙️",
    label: "Practice Interview Questions",
    desc: "Get comfortable answering questions before college interviews or scholarship panels.",
    href: "/practice",
    color: "#2563EB",
    time: "~15 min",
  },
  {
    id: "networking_intro",
    icon: "🤝",
    label: "Networking Pitch",
    desc: "How to introduce yourself to professors, advisors, and peers from day one.",
    href: "/networking",
    color: "#0EA5E9",
    time: "~10 min",
  },
  {
    id: "college_aptitude",
    icon: "🧭",
    label: "Major & Career Aptitude Quiz",
    desc: "Not sure what to study? Answer a few questions to find directions that fit you.",
    href: "/aptitude?from=pre-college",
    color: "#10B981",
    time: "~5 min",
  },
];

// ── Checklist items ───────────────────────────────────────────────────────────
const CHECKLIST = [
  { id: "fafsa_done",        label: "Complete FAFSA or renewal",                   desc: "Priority #1 - opens October 1 each year. File as early as possible - aid is first-come, first-served at many schools. You'll need your (and your parents') tax returns, Social Security numbers, and bank info.", linkHref: "https://studentaid.gov/h/apply-for-aid/fafsa", linkLabel: "Apply on StudentAid.gov" },
  { id: "aid_letter",        label: "Review your financial aid award letter",       desc: "Your award letter breaks down what you owe and what help you're getting. Grants and scholarships are free money - never repaid. Work-Study is a part-time job program. Loans must be repaid with interest. If the gap is too large, call the financial aid office and ask for a reassessment - it works more often than people think.", linkHref: "/career-guide/finances?from=pre-college", linkLabel: "Understanding grants vs. loans" },
  { id: "orientation",       label: "Sign up for orientation",                     desc: "Many schools require registration and charge a fee. Don't miss the deadline - orientation is how you meet your advisor, learn campus systems, and get your class registration access. It's genuinely useful." },
  { id: "housing",           label: "Submit housing application",                  desc: "On-campus deadlines are often months before you arrive. Living on campus your first year is strongly recommended - you'll build relationships and access resources faster. See our housing guide for what to expect.", linkHref: "/career-guide/housing?from=pre-college", linkLabel: "On-campus vs. off-campus guide" },
  { id: "email_setup",       label: "Set up your student email",                   desc: "Your .edu address unlocks free or discounted software (Microsoft 365, Adobe, Notion), streaming services, and campus portals. Check it daily - financial aid notices, advisor messages, and registration deadlines all arrive here." },
  { id: "budget_first",      label: "Build your first college budget",             desc: "Map out your semester: tuition balance after aid, housing, meal plan, books (~$500-800/semester), transportation, and personal spending. Most students underestimate books and overestimate how far their aid check goes. Build the budget before the money arrives.", linkHref: "/financial-literacy", linkLabel: "Financial Literacy tools" },
  { id: "credit_card",       label: "Consider a student credit card",              desc: "Getting a card at 18-19 with a low limit ($500-1000) and paying it off monthly builds a credit history you'll need for apartments, car loans, and eventually a mortgage. Look for no annual fee, rewards, and a low APR. Never carry a balance.", linkHref: "https://www.nerdwallet.com/best/credit-cards/student", linkLabel: "Compare student cards on NerdWallet" },
  { id: "advisor_meeting",   label: "Book a meeting with your academic advisor",   desc: "Do this in week 1 before you need them. Advisors help you plan your course sequence, avoid requirements gaps that delay graduation, and navigate add/drop periods. Build the relationship early - they also write letters of recommendation." },
  { id: "campus_resources",  label: "Find tutoring, mental health & career center",desc: "Physically walk to each one before you need them. Tutoring centers, writing labs, counseling services, and the career center are all typically free and funded by your tuition. Most students don't use them until they're already in crisis. Don't be that student." },
  { id: "linkedin_setup",    label: "Create or update your LinkedIn profile",      desc: "Add your school, expected graduation year, a professional headshot (or clean photo), and your hometown. You don't need work experience yet - your profile signals you're career-aware. Recruiters search for students by school and graduation year starting sophomore year.", linkHref: "https://www.linkedin.com", linkLabel: "Set up LinkedIn" },
];

// ── Resource links ────────────────────────────────────────────────────────────
const RESOURCES = [
  { icon: "📋", label: "Understanding FAFSA & Financial Aid", href: "/career-guide/finances?from=pre-college", tag: "Finance" },
  { icon: "💳", label: "Building Credit Before You Graduate",  href: "/career-guide/finances?from=pre-college", tag: "Finance" },
  { icon: "🗺️", label: "How to Choose a Major",               href: "/career-guide/career-paths?from=pre-college", tag: "Career" },
  { icon: "🏠", label: "On-Campus vs. Off-Campus Housing",     href: "/career-guide/housing?from=pre-college", tag: "Life" },
  { icon: "📈", label: "First-Gen College Student Guide",      href: "/career-guide/first-year?from=pre-college", tag: "Life" },
  { icon: "🧾", label: "Student Taxes: What You Need to Know", href: "/career-guide/finances?from=pre-college", tag: "Finance" },
];

const TAG_COLORS: Record<string, string> = {
  Finance: "#10B981",
  Career: "#2563EB",
  Life: "#8B5CF6",
};

export default function PreCollegePage() {
  const [progress, setProgress] = useState<ChecklistProgressEntry[]>([]);

  const scheduledItems: ScheduledItem[] = CHECKLIST.map(item => {
    const entry = progress.find(p => p.itemId === item.id);
    return {
      itemId: item.id,
      label: item.label,
      stage: "pre_college",
      done: entry?.done ?? false,
      scheduledDate: entry?.scheduledDate ?? null,
    };
  });

  function handleSchedule(itemId: string, date: string | null) {
    setProgress(prev => {
      const existing = prev.find(p => p.itemId === itemId);
      if (existing) {
        return prev.map(p => p.itemId === itemId ? { ...p, scheduledDate: date } : p);
      }
      return [...prev, { itemId, done: false, scheduledDate: date }];
    });
  }

  return (
    <PremiumShell hideHeader>
      <div style={{ maxWidth: 1120, margin: "0 auto", paddingBottom: 80 }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 99, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>🎓</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: "#10B981", letterSpacing: 0.5 }}>PRE-COLLEGE</span>
          </div>
          <h1 style={{ margin: "0 0 10px", fontSize: 32, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.7, lineHeight: 1.2 }}>
            Get ready for what's next.
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 600 }}>
            Whether you're heading to college in a few months or just starting to think about it — this is your launchpad. Schedule tasks on your calendar, complete the checklist, and use the guides when you need them.
          </p>
        </div>

        <StreakBanner />

        {/* ── Two-column layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 28, alignItems: "start" }}>

          {/* ── LEFT: main content ── */}
          <div>
            {/* To-Do's */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#10B981", textTransform: "uppercase", marginBottom: 16 }}>Practice & Tools</div>
              <div style={{ display: "grid", gap: 12 }}>
                {TODOS.map((todo) => (
                  <div key={todo.id} style={{ padding: "18px 20px", borderRadius: 16, border: "1px solid var(--card-border)", background: "var(--card-bg)", display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: todo.color + "18", border: `1px solid ${todo.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                      {todo.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 950, color: "var(--text-primary)" }}>{todo.label}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{todo.time}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>{todo.desc}</p>
                    </div>
                    <Link href={todo.href} style={{ flexShrink: 0, padding: "9px 18px", borderRadius: 10, background: todo.color, color: "#fff", fontWeight: 900, fontSize: 13, textDecoration: "none" }}>
                      Start →
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div style={{ marginBottom: 48 }}>
              <ChecklistSection
                stage="pre_college"
                items={CHECKLIST}
                accentColor="#10B981"
                onProgressChange={setProgress}
              />
            </div>

            {/* Resources */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#10B981", textTransform: "uppercase", marginBottom: 16 }}>Guides & Resources</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {RESOURCES.map((r) => (
                  <Link key={r.label} href={r.href} style={{ textDecoration: "none" }}>
                    <div style={{ padding: "16px 18px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", display: "flex", gap: 12, alignItems: "flex-start", transition: "border-color 150ms" }}>
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

          {/* ── RIGHT: calendar ── */}
          <MiniCalendar
            items={scheduledItems}
            accentColor="#10B981"
            stage="pre_college"
            onSchedule={handleSchedule}
          />

        </div>
      </div>
    </PremiumShell>
  );
}
