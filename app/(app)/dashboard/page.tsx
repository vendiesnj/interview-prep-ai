"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Mic, DollarSign, Shield, BookOpen,
  BarChart2, CheckSquare, FileText, Home, BarChart, RefreshCw,
  TrendingUp, Brain, Target, CheckCircle2, Circle, Flame,
  ChevronRight, ChevronLeft, Plus, X, Clock, Heart,
  Gamepad2, Zap, Map, Briefcase, Library, Users,
} from "lucide-react";
import PremiumShell from "@/app/components/PremiumShell";
import StreakBanner from "@/app/components/StreakBanner";
import ChecklistSection, { type ChecklistProgressEntry } from "@/app/components/ChecklistSection";
import { matchOccupations } from "@/app/lib/onet-occupations";
import JourneySidebar from "@/app/components/JourneySidebar";
import TasksPanel, { type Task as DbTask } from "@/app/components/TasksPanel";
import { useIsUniversity } from "@/app/hooks/usePlan";
import RoleClusterSection from "@/app/components/RoleClusterSection";

// ── Stage-specific checklist items ────────────────────────────────────────────

const PRE_COLLEGE_CHECKLIST = [
  { id: "fafsa_done",       label: "Complete FAFSA or renewal",                desc: "Priority #1 - opens October 1 each year. File as early as possible. Aid is first-come, first-served at many schools.", linkHref: "https://studentaid.gov/h/apply-for-aid/fafsa", linkLabel: "Apply on StudentAid.gov" },
  { id: "aid_letter",       label: "Review your financial aid award letter",   desc: "Your award letter breaks down grants (free), work-study (job program), and loans (repaid with interest).", linkHref: "/career-guide/finances?from=pre-college", linkLabel: "Understanding grants vs. loans" },
  { id: "orientation",      label: "Sign up for orientation",                  desc: "Many schools require registration and charge a fee. Don't miss the deadline - orientation is how you meet your advisor and get class registration access." },
  { id: "housing",          label: "Submit housing application",               desc: "On-campus deadlines are often months before you arrive. Living on campus your first year is strongly recommended.", linkHref: "/career-guide/housing?from=pre-college", linkLabel: "On-campus vs. off-campus guide" },
  { id: "email_setup",      label: "Set up your student email",                desc: "Your .edu address unlocks free software (Microsoft 365, Adobe, Notion), discounts, and campus portals. Check it daily." },
  { id: "budget_first",     label: "Build your first college budget",          desc: "Map out your semester: tuition balance after aid, housing, meal plan, books (~$500–800), transportation.", linkHref: "/financial-literacy", linkLabel: "Financial Literacy tools" },
  { id: "credit_card",      label: "Consider a student credit card",           desc: "Getting a card at 18–19 with a low limit and paying it off monthly builds the credit history you'll need for apartments and car loans.", linkHref: "https://www.nerdwallet.com/best/credit-cards/student", linkLabel: "Compare student cards on NerdWallet" },
  { id: "advisor_meeting",  label: "Book a meeting with your academic advisor",desc: "Do this in week 1 before you need them. Advisors help you plan your course sequence and avoid requirements gaps that delay graduation." },
  { id: "campus_resources", label: "Find tutoring, mental health & career center", desc: "Physically walk to each one before you need them. All typically free and funded by your tuition." },
  { id: "linkedin_setup",   label: "Create or update your LinkedIn profile",   desc: "Add your school, expected graduation year, a professional headshot, and your hometown. Recruiters search students by school + graduation year.", linkHref: "https://www.linkedin.com", linkLabel: "Set up LinkedIn" },
];

const DURING_COLLEGE_CHECKLIST = [
  { id: "resume",           label: "Build your first resume",                      desc: "One page, reverse chronological, action verbs, quantified results where possible.", linkHref: "/resume-gap", linkLabel: "Analyze your resume with AI" },
  { id: "linkedin",         label: "Set up or update LinkedIn",                    desc: "Add your university, graduation year, a clean headshot, a 2–3 sentence summary, and any clubs, research, or volunteer work.", linkHref: "https://www.linkedin.com", linkLabel: "Open LinkedIn" },
  { id: "internship_apps",  label: "Apply to at least 3 internships",             desc: "Start in September for summer internships - many Fortune 500 recruiting cycles close by November.", linkHref: "https://www.linkedin.com/jobs/", linkLabel: "Browse internships on LinkedIn" },
  { id: "taxes_filed",      label: "File your taxes (every April)",               desc: "If you earned income from a job, work-study, or freelance work, you need to file by April 15.", linkHref: "https://apps.irs.gov/app/freeFile/", linkLabel: "IRS Free File" },
  { id: "fafsa_renewed",    label: "Renew FAFSA each year",                       desc: "FAFSA does not auto-renew. You must reapply each October 1 for the following academic year.", linkHref: "https://studentaid.gov/h/apply-for-aid/fafsa", linkLabel: "Renew on StudentAid.gov" },
  { id: "advisor_semester", label: "Meet with advisor each semester",             desc: "Before registration each semester, review your degree audit to catch missing requirements early." },
  { id: "career_fair",      label: "Attend at least one career fair",             desc: "Come with printed resumes (10+ copies), professional clothes, and a practiced 30-second pitch." },
  { id: "rec_letter",       label: "Ask a professor for a recommendation letter", desc: "Ask professors who know you from office hours or projects. Ask at least 6 weeks before any deadline." },
  { id: "gpa_check",        label: "Check internship/grad school GPA requirements", desc: "Many competitive programs list minimum GPAs of 3.0–3.5. Know what you're working toward now." },
  { id: "emergency_fund",   label: "Start a $500 emergency fund",                desc: "Before buying anything discretionary, build a $500 buffer in a separate savings account.", linkHref: "/financial-literacy", linkLabel: "Financial Literacy tools" },
];

const POST_COLLEGE_CHECKLIST = [
  { id: "401k_enrolled",    label: "Enroll in your 401(k)",                          desc: "Do this in your first 30 days - you cannot retroactively contribute to months missed. If your employer matches, enroll immediately.", linkHref: "https://investor.gov/financial-tools-calculators/calculators/compound-interest-calculator", linkLabel: "See compound growth calculator" },
  { id: "contribution_set", label: "Set your 401(k) contribution rate",              desc: "Contribute at minimum whatever percentage your employer matches - that's a 100% instant return.", linkHref: "/career-guide/retirement?from=post-college", linkLabel: "See your retirement projection" },
  { id: "benefits_reviewed",label: "Review all your benefits (health, dental, FSA)", desc: "You typically have 30 days from your start date to enroll. Compare PPO vs HDHP carefully.", linkHref: "/career-guide/finances?from=post-college", linkLabel: "Benefits 101 guide" },
  { id: "w4_set",           label: "Set up your W-4 correctly",                      desc: "The W-4 tells your employer how much federal tax to withhold. Use the IRS Withholding Estimator to dial it in.", linkHref: "https://apps.irs.gov/app/tax-withholding-estimator", linkLabel: "IRS Withholding Estimator" },
  { id: "paycheck_review",  label: "Understand your first paycheck",                 desc: "Your gross salary ÷ pay periods = gross per check. Build your budget from net (take-home), not gross.", linkHref: "/career-guide/finances?from=post-college", linkLabel: "Understanding your paycheck" },
  { id: "loans_plan",       label: "Set up your student loan repayment plan",        desc: "Log into StudentAid.gov to see your balance. Income-driven repayment plans cap payments at 5–10% of discretionary income.", linkHref: "https://studentaid.gov/manage-loans/repayment", linkLabel: "Explore federal repayment options" },
  { id: "emergency_3mo",    label: "Build a 3-month emergency fund",                 desc: "Before investing beyond your 401k match, build 3 months of essential expenses in a high-yield savings account (4–5% APY)." },
  { id: "renter_insurance", label: "Get renter's insurance",                         desc: "Usually $15–20/month. Covers your belongings if stolen or damaged. Your landlord's insurance only covers the building.", linkHref: "https://www.nerdwallet.com/best/insurance/renters", linkLabel: "Compare renters insurance" },
  { id: "credit_report",   label: "Check your credit report",                       desc: "One free report per bureau per year at AnnualCreditReport.com. Review for errors - they're more common than you think.", linkHref: "https://www.annualcreditreport.com", linkLabel: "Get your free report" },
  { id: "budget_post",     label: "Build a post-grad budget (50/30/20 rule)",       desc: "50% needs, 30% wants, 20% savings and extra debt paydown. Build from take-home pay, not salary.", linkHref: "/financial-literacy", linkLabel: "Financial Literacy tools" },
];

const STAGE_MAP: Record<string, {
  accent: string;
  stageKey: string;
  guideHref: string;
  guideLabel: string;
  checklist: typeof PRE_COLLEGE_CHECKLIST;
}> = {
  pre_college:    { accent: "#10B981", stageKey: "pre_college",    guideHref: "/pre-college",    guideLabel: "Pre-College Guide",    checklist: PRE_COLLEGE_CHECKLIST },
  during_college: { accent: "#2563EB", stageKey: "during_college", guideHref: "/during-college", guideLabel: "During-College Guide", checklist: DURING_COLLEGE_CHECKLIST },
  post_college:   { accent: "#8B5CF6", stageKey: "post_college",   guideHref: "/post-college",   guideLabel: "Post-College Guide",   checklist: POST_COLLEGE_CHECKLIST },
};

const RIASEC_LABELS: Record<string, string> = {
  R: "Realistic", I: "Investigative", A: "Artistic",
  S: "Social", E: "Enterprising", C: "Conventional",
};

function riasecDescription(code: string): string {
  return code.split("").map(c => RIASEC_LABELS[c] ?? c).join("-");
}

const PILLARS = [
  {
    id: "career", Icon: Mic, title: "Career Readiness", color: "#2563EB", bg: "rgba(37,99,235,0.07)",
    actions: [
      { label: "Interview Prep",    href: "/practice",        time: "~15 min" },
      { label: "Networking Pitch",  href: "/networking",      time: "~10 min" },
      { label: "Public Speaking",   href: "/public-speaking", time: "~10 min" },
    ],
    guideHref: "/career-guide", guideLabel: "Career Guide",
  },
  {
    id: "financial", Icon: DollarSign, title: "Financial Literacy", color: "#10B981", bg: "rgba(16,185,129,0.07)",
    actions: [
      { label: "Budget Builder",         href: "/career-guide/budget",      time: "~5 min" },
      { label: "Retirement Projection",  href: "/career-guide/retirement",  time: "~3 min" },
      { label: "Financial Literacy",     href: "/financial-literacy",       time: "~10 min" },
    ],
    guideHref: "/career-guide", guideLabel: "Financial Guide",
  },
  {
    id: "futureproof", Icon: Shield, title: "AI Resilience", color: "#EF4444", bg: "rgba(239,68,68,0.07)",
    actions: [
      { label: "Future-Proof Guide",  href: "/future-proof",              time: "~10 min" },
      { label: "Career Assessment",   href: "/aptitude",                  time: "~15 min" },
      { label: "Career Paths",        href: "/career-guide/career-paths", time: "~5 min" },
    ],
    guideHref: "/future-proof", guideLabel: "AI Guide",
  },
];

// ── Planner types & constants ────────────────────────────────────────────────

type ScheduleItem = {
  itemId: string;
  label: string;
  date: string;
  done: boolean;
  category?: string;
  timeEstimate?: string;
  scheduledTime?: string; // HH:mm, e.g. "09:00"
  notes?: string;
  custom?: boolean;
  stage?: string;
};

type HabitRecord  = { habitId: string; dates: string[] };
type GoalItem     = { id: string; label: string; done: boolean; custom?: boolean };
type GoalCategory = { id: string; label: string; color: string; goals: GoalItem[] };
type HabitDef     = { id: string; label: string; category: string; streak?: number; custom?: boolean };
type PersonalTask = { id: string; label: string; done: boolean; scheduledDate: string | null };

const SCHED_KEY        = "ipc_schedule_v1";
const HABITS_KEY       = "ipc_habits_v1";
const HABITS_CUSTOM_KEY= "ipc_habits_custom_v1";
const GOALS_KEY        = "ipc_goals_v1";
const PERSONAL_KEY     = "ipc_personal_tasks_v1";

const ACCENT_CAREER   = "#2563EB";
const ACCENT_FINANCE  = "#10B981";
const ACCENT_LEARNING = "#8B5CF6";
const ACCENT_MINDSET  = "#F59E0B";
const ACCENT_PERSONAL = "#EC4899";

const CATEGORY_COLORS: Record<string, string> = {
  Career: ACCENT_CAREER, Finance: ACCENT_FINANCE,
  Learning: ACCENT_LEARNING, Mindset: ACCENT_MINDSET, Personal: ACCENT_PERSONAL,
};

const DAY_LABELS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const DEFAULT_HABITS: HabitDef[] = [
  { id: "practice",   label: "Practice session",              category: "Career" },
  { id: "budget_check",label: "Budget check-in",             category: "Finance" },
  { id: "networking", label: "Networking practice",           category: "Career" },
  { id: "read_guide", label: "Read a guide or module",        category: "Learning" },
  { id: "journal",    label: "Career journal entry",          category: "Mindset" },
  { id: "linkedin",   label: "LinkedIn activity",             category: "Career" },
  { id: "savings_check",label: "Check savings goal",         category: "Finance" },
  { id: "apply_job",  label: "Job application or follow-up", category: "Career" },
];

const DEFAULT_GOAL_CATEGORIES: GoalCategory[] = [
  { id: "career",    label: "Career Goals",    color: ACCENT_CAREER,
    goals: [
      { id: "cg1", label: "Complete 10 practice sessions", done: false },
      { id: "cg2", label: "Land an internship",            done: false },
      { id: "cg3", label: "Update resume",                 done: false },
    ],
  },
  { id: "financial", label: "Financial Goals", color: ACCENT_FINANCE,
    goals: [
      { id: "fg1", label: "Build $500 emergency fund", done: false },
      { id: "fg2", label: "Set up budget tracker",     done: false },
      { id: "fg3", label: "Enroll in 401(k)",          done: false },
    ],
  },
  { id: "skills",    label: "Skills",          color: ACCENT_LEARNING,
    goals: [
      { id: "sk1", label: "Take Career Assessment",                done: false },
      { id: "sk2", label: "Complete financial literacy module",    done: false },
    ],
  },
  { id: "future_proof", label: "Future-Proof", color: ACCENT_MINDSET,
    goals: [
      { id: "fp1", label: "Read AI resilience guide",    done: false },
      { id: "fp2", label: "Identify side hustle match",  done: false },
    ],
  },
];

// ── Utilities ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string { return d.toISOString().split("T")[0]; }
function todayStr(): string { return toDateStr(new Date()); }

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const today = todayStr();
  let streak = 0;
  const cursor = new Date(today);
  for (const d of sorted) {
    const cursorStr = toDateStr(cursor);
    if (d === cursorStr) { streak++; cursor.setDate(cursor.getDate() - 1); }
    else if (d < cursorStr) break;
  }
  return streak;
}

function getLast28Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(toDateStr(d));
  }
  return days;
}

function readSchedule(): ScheduleItem[] {
  try { const raw = localStorage.getItem(SCHED_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

function writeSchedule(items: ScheduleItem[]) {
  try { localStorage.setItem(SCHED_KEY, JSON.stringify(items)); } catch {}
}

// ── CategoryIcon ──────────────────────────────────────────────────────────────

function CategoryIcon({ category, size = 14 }: { category: string; size?: number }) {
  const color = CATEGORY_COLORS[category] ?? ACCENT_CAREER;
  const props = { size, color, strokeWidth: 2.2 };
  if (category === "Career")   return <TrendingUp {...props} />;
  if (category === "Finance")  return <DollarSign {...props} />;
  if (category === "Learning") return <BookOpen {...props} />;
  if (category === "Mindset")  return <Brain {...props} />;
  if (category === "Personal") return <Heart {...props} />;
  return <Target {...props} />;
}

// ── Time helpers ─────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am–10pm

function fmtHour(h: number): string {
  if (h === 0) return "12am";
  if (h < 12)  return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const disp   = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${disp}${suffix}` : `${disp}:${m.toString().padStart(2, "0")}${suffix}`;
}

function fmtScheduledLabel(date: string, time?: string): string {
  const d = new Date(date + "T12:00:00");
  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return time ? `Scheduled for ${dateStr} at ${fmtTime(time)}` : `Scheduled for ${dateStr}`;
}

// ── WeekView ─────────────────────────────────────────────────────────────────

function WeekView({
  scheduled,
  onDropTask,
  onAddAtTime,
  onEditTask,
}: {
  scheduled: ScheduleItem[];
  onDropTask: (taskIdOrTitle: string, date: string, time?: string) => void;
  onAddAtTime: (date: string, time: string) => void;
  onEditTask: (item: ScheduleItem) => void;
}) {
  const today = new Date();
  const todayKey = toDateStr(today);

  // Start of current week (Sun)
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay());
    return d;
  });
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  const weekDays: { date: Date; key: string }[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return { date: d, key: toDateStr(d) };
  });

  function navWeek(dir: -1 | 1) {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  }

  const startLabel = weekDays[0].date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel   = weekDays[6].date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  function getItemsAt(dateKey: string, hour: number): ScheduleItem[] {
    return scheduled.filter(i => {
      if (i.date !== dateKey) return false;
      if (!i.scheduledTime) return false;
      const h = parseInt(i.scheduledTime.split(":")[0], 10);
      return h === hour;
    });
  }

  function getUnscheduledItems(dateKey: string): ScheduleItem[] {
    return scheduled.filter(i => i.date === dateKey && !i.scheduledTime);
  }

  const COL_WIDTH = "calc((100% - 56px) / 7)";

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 16, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--card-border)" }}>
        <button type="button" onClick={() => navWeek(-1)} style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: 8, cursor: "pointer", color: "var(--text-muted)", padding: "5px 8px", display: "flex", alignItems: "center" }}><ChevronLeft size={16} /></button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
          {startLabel} – {endLabel}
        </div>
        <button type="button" onClick={() => { const d = new Date(); const s = new Date(d); s.setDate(d.getDate() - d.getDay()); setWeekStart(s); }} style={{ fontSize: 12, fontWeight: 700, color: ACCENT_CAREER, background: ACCENT_CAREER + "12", border: `1px solid ${ACCENT_CAREER}30`, borderRadius: 7, padding: "5px 12px", cursor: "pointer" }}>
          Today
        </button>
        <button type="button" onClick={() => navWeek(1)} style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: 8, cursor: "pointer", color: "var(--text-muted)", padding: "5px 8px", display: "flex", alignItems: "center" }}><ChevronRight size={16} /></button>
      </div>

      {/* Day column headers */}
      <div style={{ display: "grid", gridTemplateColumns: `56px ${weekDays.map(() => "1fr").join(" ")}`, borderBottom: "1px solid var(--card-border)" }}>
        <div />
        {weekDays.map(({ date, key }) => {
          const isToday = key === todayKey;
          const dayNum  = date.getDate();
          const dayName = DAY_LABELS_SHORT[date.getDay()];
          return (
            <div key={key} style={{ textAlign: "center", padding: "8px 4px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? ACCENT_CAREER : "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{dayName}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: isToday ? "#fff" : "var(--text-primary)", background: isToday ? ACCENT_CAREER : "transparent", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", margin: "2px auto 0" }}>{dayNum}</div>
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      <div style={{ display: "grid", gridTemplateColumns: `56px ${weekDays.map(() => "1fr").join(" ")}`, borderBottom: "1px solid var(--card-border)", minHeight: 32 }}>
        <div style={{ padding: "4px 8px", fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center" }}>All day</div>
        {weekDays.map(({ key }) => {
          const items = getUnscheduledItems(key);
          return (
            <div key={key} onDragOver={e => { e.preventDefault(); setDragOverCell(`allday_${key}`); }} onDragLeave={() => setDragOverCell(null)} onDrop={e => { e.preventDefault(); setDragOverCell(null); const raw = e.dataTransfer.getData("text/plain"); if (raw) onDropTask(raw, key); }} style={{ borderLeft: "1px solid var(--card-border)", padding: "3px 4px", minHeight: 28, background: dragOverCell === `allday_${key}` ? "rgba(37,99,235,0.10)" : "transparent", transition: "background 80ms", overflow: "hidden", minWidth: 0 }}>
              {items.slice(0, 2).map(item => {
                const c = CATEGORY_COLORS[item.category ?? "Career"] ?? ACCENT_CAREER;
                return <div key={item.itemId} draggable onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData("text/plain", item.itemId); }} onClick={e => { e.stopPropagation(); onEditTask(item); }} title={item.label} style={{ fontSize: 9, fontWeight: 600, color: item.done ? "var(--text-muted)" : c, background: c + "15", borderLeft: `2px solid ${c}`, padding: "1px 4px", borderRadius: "0 3px 3px 0", marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: item.done ? "line-through" : "none", cursor: "pointer" }}>{item.label}</div>;
              })}
              {items.length > 2 && <div style={{ fontSize: 9, color: "var(--text-muted)" }}>+{items.length - 2}</div>}
            </div>
          );
        })}
      </div>

      {/* Time grid - scrollable */}
      <div style={{ overflowY: "auto", maxHeight: 520 }}>
        {HOURS.map(hour => (
          <div key={hour} style={{ display: "grid", gridTemplateColumns: `56px ${weekDays.map(() => "1fr").join(" ")}`, borderBottom: "1px solid var(--card-border)", minHeight: 52 }}>
            <div style={{ padding: "6px 8px 0", fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textAlign: "right", flexShrink: 0 }}>{fmtHour(hour)}</div>
            {weekDays.map(({ key }) => {
              const items = getItemsAt(key, hour);
              return (
                <div
                  key={key}
                  onDragOver={e => { e.preventDefault(); setDragOverCell(`${key}_${hour}`); }}
                  onDragLeave={() => setDragOverCell(null)}
                  onDrop={e => { e.preventDefault(); setDragOverCell(null); const raw = e.dataTransfer.getData("text/plain"); if (raw) onDropTask(raw, key, `${hour.toString().padStart(2, "0")}:00`); }}
                  onClick={() => onAddAtTime(key, `${hour.toString().padStart(2, "0")}:00`)}
                  style={{ borderLeft: "1px solid var(--card-border)", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", background: dragOverCell === `${key}_${hour}` ? "rgba(37,99,235,0.10)" : "transparent", transition: "background 80ms", overflow: "hidden", minWidth: 0 }}
                >
                  {items.map(item => {
                    const c = CATEGORY_COLORS[item.category ?? "Career"] ?? ACCENT_CAREER;
                    return <div key={item.itemId} draggable onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData("text/plain", item.itemId); }} onClick={e => { e.stopPropagation(); onEditTask(item); }} title={item.label} style={{ display: "flex", alignItems: "center", padding: "4px 6px", fontSize: 10, fontWeight: 700, color: item.done ? "var(--text-muted)" : "#fff", background: item.done ? "var(--card-border)" : c, overflow: "hidden", textDecoration: item.done ? "line-through" : "none", cursor: "pointer", minHeight: 46, borderRadius: 4, margin: "1px 2px" }}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{item.label}</span></div>;
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DayView ───────────────────────────────────────────────────────────────────

function DayView({
  scheduled,
  onDropTask,
  onAddAtTime,
  onEditTask,
}: {
  scheduled: ScheduleItem[];
  onDropTask: (taskIdOrTitle: string, date: string, time?: string) => void;
  onAddAtTime: (date: string, time: string) => void;
  onEditTask: (item: ScheduleItem) => void;
}) {
  const today = new Date();
  const [viewDate, setViewDate] = useState<Date>(new Date(today));
  const dateKey = toDateStr(viewDate);
  const isToday = dateKey === toDateStr(today);

  function navDay(dir: -1 | 1) {
    setViewDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + dir); return d; });
  }

  const dateLabel = viewDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  function getItemsAt(hour: number): ScheduleItem[] {
    return scheduled.filter(i => {
      if (i.date !== dateKey) return false;
      if (!i.scheduledTime) return false;
      return parseInt(i.scheduledTime.split(":")[0], 10) === hour;
    });
  }

  const allDay = scheduled.filter(i => i.date === dateKey && !i.scheduledTime);

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 16, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--card-border)" }}>
        <button type="button" onClick={() => navDay(-1)} style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: 8, cursor: "pointer", color: "var(--text-muted)", padding: "5px 8px", display: "flex", alignItems: "center" }}><ChevronLeft size={16} /></button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{dateLabel}</span>
          {isToday && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: ACCENT_CAREER, background: ACCENT_CAREER + "15", padding: "2px 7px", borderRadius: 5 }}>Today</span>}
        </div>
        <button type="button" onClick={() => setViewDate(new Date(today))} style={{ fontSize: 12, fontWeight: 700, color: ACCENT_CAREER, background: ACCENT_CAREER + "12", border: `1px solid ${ACCENT_CAREER}30`, borderRadius: 7, padding: "5px 12px", cursor: "pointer" }}>Today</button>
        <button type="button" onClick={() => navDay(1)} style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: 8, cursor: "pointer", color: "var(--text-muted)", padding: "5px 8px", display: "flex", alignItems: "center" }}><ChevronRight size={16} /></button>
      </div>

      {/* All-day */}
      {allDay.length > 0 && (
        <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--card-border)", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", marginRight: 4 }}>All day</span>
          {allDay.map(item => {
            const c = CATEGORY_COLORS[item.category ?? "Career"] ?? ACCENT_CAREER;
            return <span key={item.itemId} draggable onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData("text/plain", item.itemId); }} onClick={e => { e.stopPropagation(); onEditTask(item); }} style={{ fontSize: 11, fontWeight: 600, color: item.done ? "var(--text-muted)" : c, background: c + "18", padding: "2px 9px", borderRadius: 5, border: `1px solid ${c}25`, textDecoration: item.done ? "line-through" : "none", cursor: "pointer" }}>{item.label}</span>;
          })}
        </div>
      )}

      {/* Time grid */}
      <div style={{ overflowY: "auto", maxHeight: 520 }}>
        {HOURS.map(hour => {
          const items = getItemsAt(hour);
          return (
            <div key={hour} style={{ display: "grid", gridTemplateColumns: "72px 1fr", borderBottom: "1px solid var(--card-border)", minHeight: 60 }}>
              <div style={{ padding: "8px 12px 0", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textAlign: "right" }}>{fmtHour(hour)}</div>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const raw = e.dataTransfer.getData("text/plain"); if (raw) onDropTask(raw, dateKey, `${hour.toString().padStart(2, "0")}:00`); }}
                onClick={() => onAddAtTime(dateKey, `${hour.toString().padStart(2, "0")}:00`)}
                style={{ borderLeft: "1px solid var(--card-border)", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column" }}
              >
                {items.map(item => {
                  const c = CATEGORY_COLORS[item.category ?? "Career"] ?? ACCENT_CAREER;
                  return (
                    <div key={item.itemId} draggable onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData("text/plain", item.itemId); }} onClick={e => { e.stopPropagation(); onEditTask(item); }} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", minHeight: 58, background: item.done ? "var(--card-bg-strong)" : c, color: item.done ? "var(--text-muted)" : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: item.done ? "line-through" : "none", width: "100%", boxSizing: "border-box" }}>
                      <div style={{ width: 3, alignSelf: "stretch", background: "rgba(255,255,255,0.4)", borderRadius: 2, flexShrink: 0, marginTop: 8, marginBottom: 8 }} />
                      {item.scheduledTime && <span style={{ opacity: 0.8, fontSize: 10, flexShrink: 0 }}>{fmtTime(item.scheduledTime)}</span>}
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                    </div>
                  );
                })}
                {items.length === 0 && <div style={{ minHeight: 58 }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TaskModal (add + edit) ─────────────────────────────────────────────────────

function TaskModal({
  initialDate,
  initialTime,
  existing,
  onSave,
  onUpdate,
  onDelete,
  onClose,
}: {
  initialDate: string;
  initialTime: string;
  existing?: ScheduleItem;
  onSave:   (item: ScheduleItem) => void;
  onUpdate: (item: ScheduleItem) => void;
  onDelete: (itemId: string) => void;
  onClose:  () => void;
}) {
  const isEdit = !!existing;
  const [label,    setLabel]    = useState(existing?.label    ?? "");
  const [date,     setDate]     = useState(existing?.date     ?? initialDate);
  const [time,     setTime]     = useState(existing?.scheduledTime ?? initialTime);
  const [category, setCategory] = useState(existing?.category ?? "Career");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function commit() {
    const trimmed = label.trim();
    if (!trimmed) return;
    const item: ScheduleItem = {
      itemId:        existing?.itemId ?? "custom_" + Date.now(),
      label:         trimmed,
      date,
      done:          existing?.done ?? false,
      category,
      scheduledTime: time || undefined,
      custom:        true,
    };
    isEdit ? onUpdate(item) : onSave(item);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 16, padding: 24, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }}>
          {isEdit ? "Edit Task" : "Add Task"}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") onClose(); }}
          placeholder="Task name..."
          style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid var(--card-border)", background: "var(--app-bg, #F9FAFB)", color: "var(--text-primary)", fontSize: 14, outline: "none", marginBottom: 12, boxSizing: "border-box" }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--app-bg, #F9FAFB)", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>Time (optional)</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--app-bg, #F9FAFB)", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>Category</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["Career","Finance","Learning","Mindset","Personal"] as const).map(cat => {
              const color = CATEGORY_COLORS[cat];
              return <button key={cat} type="button" onClick={() => setCategory(cat)} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${category === cat ? color : "var(--card-border)"}`, background: category === cat ? color + "20" : "transparent", color: category === cat ? color : "var(--text-muted)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{cat}</button>;
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isEdit && (
            <button type="button" onClick={() => { onDelete(existing!.itemId); onClose(); }} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #EF444430", background: "#EF444408", color: "#EF4444", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Delete
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button type="button" onClick={commit} disabled={!label.trim()} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: label.trim() ? ACCENT_CAREER : "var(--card-border)", color: label.trim() ? "#fff" : "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: label.trim() ? "pointer" : "not-allowed" }}>
            {isEdit ? "Save" : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FullMonthCalendar ─────────────────────────────────────────────────────────

function FullMonthCalendar({
  scheduled,
  onDropTask,
  onEditTask,
}: {
  scheduled: ScheduleItem[];
  onDropTask: (taskIdOrTitle: string, date: string) => void;
  onEditTask: (item: ScheduleItem) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [highlightDay, setHighlightDay] = useState<string | null>(null);

  const todayKey = toDateStr(today);
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const lastOfMonth  = new Date(viewYear, viewMonth + 1, 0);
  const startPad     = firstOfMonth.getDay();
  const totalCells   = Math.ceil((startPad + lastOfMonth.getDate()) / 7) * 7;

  const cells: { dateKey: string; inMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(viewYear, viewMonth, 1 - startPad + i);
    cells.push({ dateKey: toDateStr(d), inMonth: d.getMonth() === viewMonth });
  }

  function navMonth(dir: -1 | 1) {
    setViewMonth(prev => {
      const m = prev + dir;
      if (m < 0)  { setViewYear(y => y - 1); return 11; }
      if (m > 11) { setViewYear(y => y + 1); return 0; }
      return m;
    });
  }

  function handleDrop(e: React.DragEvent, dateKey: string) {
    e.preventDefault();
    setDragOverDay(null);
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    onDropTask(raw, dateKey);
    setHighlightDay(dateKey);
    setTimeout(() => setHighlightDay(null), 800);
  }

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 16, overflow: "hidden", width: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--card-border)" }}>
        <button type="button" onClick={() => navMonth(-1)} style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: 8, cursor: "pointer", color: "var(--text-muted)", padding: "5px 8px", display: "flex", alignItems: "center" }}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.3 }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
        </div>
        <button type="button" onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }} style={{ fontSize: 12, fontWeight: 700, color: ACCENT_CAREER, background: ACCENT_CAREER + "12", border: `1px solid ${ACCENT_CAREER}30`, borderRadius: 7, padding: "5px 12px", cursor: "pointer" }}>
          Today
        </button>
        <button type="button" onClick={() => navMonth(1)} style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: 8, cursor: "pointer", color: "var(--text-muted)", padding: "5px 8px", display: "flex", alignItems: "center" }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--card-border)" }}>
        {DAY_LABELS_SHORT.map(d => (
          <div key={d} style={{ textAlign: "center", padding: "8px 0", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map(({ dateKey, inMonth }, idx) => {
          const isToday    = dateKey === todayKey;
          const isDragOver = dragOverDay === dateKey;
          const isHighlight= highlightDay === dateKey;
          const dayItems   = scheduled.filter(i => i.date === dateKey);
          const dayNum     = parseInt(dateKey.split("-")[2], 10);
          const isLastRow  = idx >= cells.length - 7;
          const isLastCol  = idx % 7 === 6;

          return (
            <div
              key={dateKey}
              onDragOver={e => { e.preventDefault(); setDragOverDay(dateKey); }}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={e => handleDrop(e, dateKey)}
              style={{
                minHeight: 90,
                padding: "8px 6px 6px",
                borderRight:  !isLastCol ? "1px solid var(--card-border)" : "none",
                borderBottom: !isLastRow ? "1px solid var(--card-border)" : "none",
                background: isHighlight ? ACCENT_CAREER + "20" : isDragOver ? ACCENT_CAREER + "10" : isToday ? ACCENT_CAREER + "06" : "transparent",
                transition: "background 150ms",
              }}
            >
              <div style={{ textAlign: "right", marginBottom: 4 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 24, height: 24, borderRadius: "50%",
                  fontSize: 11, fontWeight: isToday ? 900 : inMonth ? 600 : 400,
                  color: isToday ? "#fff" : inMonth ? "var(--text-primary)" : "var(--text-muted)",
                  background: isToday ? ACCENT_CAREER : "transparent",
                  opacity: inMonth ? 1 : 0.3,
                }}>
                  {dayNum}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {dayItems.slice(0, 3).map(item => {
                  const catColor = item.category ? (CATEGORY_COLORS[item.category] ?? ACCENT_CAREER) : ACCENT_CAREER;
                  return (
                    <div key={item.itemId} title={item.label} onClick={e => { e.stopPropagation(); onEditTask(item); }} draggable onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData("text/plain", item.itemId); }} style={{ fontSize: 10, fontWeight: 600, color: item.done ? "var(--text-muted)" : catColor, background: catColor + "15", borderLeft: `2px solid ${catColor}`, padding: "1px 5px", borderRadius: "0 4px 4px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: item.done ? "line-through" : "none", cursor: "pointer" }}>
                      {item.label}
                    </div>
                  );
                })}
                {dayItems.length > 3 && (
                  <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, paddingLeft: 4 }}>+{dayItems.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Personal Tasks Section ────────────────────────────────────────────────────

function PersonalTasksSection({ scheduled }: { scheduled: ScheduleItem[] }) {
  const [tasks, setTasks]     = useState<PersonalTask[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding]   = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(PERSONAL_KEY); if (raw) setTasks(JSON.parse(raw)); } catch {}
  }, []);

  function getScheduledEntry(label: string): ScheduleItem | undefined {
    return scheduled.find(i => i.label === label);
  }

  function save(next: PersonalTask[]) {
    setTasks(next);
    try { localStorage.setItem(PERSONAL_KEY, JSON.stringify(next)); } catch {}
  }

  function addTask() {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    save([...tasks, { id: "pt_" + Date.now(), label: trimmed, done: false, scheduledDate: null }]);
    setNewLabel("");
    setAdding(false);
  }

  function toggleTask(id: string) {
    save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function deleteTask(id: string) {
    save(tasks.filter(t => t.id !== id));
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.7, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>Personal Tasks</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {tasks.map(task => {
          const entry = getScheduledEntry(task.label);
          const isScheduled = !!entry;
          const scheduledBg   = task.done ? "rgba(134,239,172,0.18)" : "rgba(254,243,199,0.7)";
          const scheduledBorder = task.done ? "rgba(34,197,94,0.35)" : "rgba(234,179,8,0.45)";
          return (
            <div key={task.id} draggable onDragStart={e => e.dataTransfer.setData("text/plain", task.label)} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", borderRadius: 9, background: isScheduled ? scheduledBg : task.done ? "transparent" : "var(--card-bg)", border: `1px solid ${isScheduled ? scheduledBorder : task.done ? "var(--card-border-soft)" : "var(--card-border)"}`, cursor: "grab" }}>
              <button type="button" onClick={() => toggleTask(task.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", flexShrink: 0, marginTop: 1 }}>
                {task.done ? <CheckCircle2 size={15} color={ACCENT_FINANCE} strokeWidth={2.2} /> : <Circle size={15} color="var(--text-muted)" strokeWidth={2} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: task.done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: task.done ? "line-through" : "none" }}>{task.label}</span>
                {isScheduled && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <Clock size={9} color={task.done ? "#16A34A" : "#92400E"} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: task.done ? "#16A34A" : "#92400E" }}>
                      {fmtScheduledLabel(entry!.date, entry!.scheduledTime)}
                    </span>
                  </div>
                )}
              </div>
              <button type="button" onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", opacity: 0.4, flexShrink: 0, marginTop: 1 }}>
                <X size={12} color="var(--text-muted)" />
              </button>
            </div>
          );
        })}
      </div>
      {adding ? (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input
            autoFocus
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addTask(); if (e.key === "Escape") { setAdding(false); setNewLabel(""); } }}
            placeholder="Add a personal task..."
            style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
          />
          <button type="button" onClick={addTask} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ACCENT_CAREER, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Add</button>
          <button type="button" onClick={() => { setAdding(false); setNewLabel(""); }} style={{ padding: "7px 9px", borderRadius: 8, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}><X size={14} /></button>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, background: "transparent", border: "1px dashed var(--card-border)", borderRadius: 8, padding: "6px 12px", color: ACCENT_CAREER, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          <Plus size={13} /> Add task
        </button>
      )}
    </div>
  );
}

// ── Habits Tab ────────────────────────────────────────────────────────────────

function MiniHabitGrid({ completedDates, color }: { completedDates: string[]; color: string }) {
  const days = getLast28Days();
  const set = new Set(completedDates);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(28, 1fr)", gap: 2, flex: 1 }}>
      {days.map(d => {
        const done = set.has(d);
        return <div key={d} title={d} style={{ height: 10, borderRadius: 2, background: done ? color : "var(--card-border)", opacity: done ? 1 : 0.35, transition: "background 100ms" }} />;
      })}
    </div>
  );
}

function HabitRow({ habit, completedDates, onToggle }: { habit: HabitDef; completedDates: string[]; onToggle: (id: string) => void }) {
  const today     = todayStr();
  const doneToday = completedDates.includes(today);
  const streak    = computeStreak(completedDates);
  const catColor  = CATEGORY_COLORS[habit.category] ?? ACCENT_CAREER;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, height: 48, padding: "0 12px 0 0", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--card-border)", overflow: "hidden" }}>
      <div style={{ width: 3, height: "100%", background: catColor, flexShrink: 0, borderRadius: "10px 0 0 10px" }} />
      <div style={{ width: 26, height: 26, borderRadius: 6, background: catColor + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <CategoryIcon category={habit.category} size={12} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: "0 0 auto", maxWidth: 180 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{habit.label}</span>
      </div>
      {streak > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "1px 6px", borderRadius: 5, background: "#F59E0B18", border: "1px solid #F59E0B25", flexShrink: 0 }}>
          <Flame size={10} color="#F59E0B" strokeWidth={2.2} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#F59E0B" }}>{streak}</span>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, padding: "0 4px" }}>
        <MiniHabitGrid completedDates={completedDates} color={catColor} />
      </div>
      <button type="button" onClick={() => onToggle(habit.id)} style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}>
        {doneToday ? <CheckCircle2 size={20} color={ACCENT_FINANCE} strokeWidth={2.2} /> : <Circle size={20} color="var(--text-muted)" strokeWidth={1.8} />}
      </button>
    </div>
  );
}

function HabitsTab() {
  const [habits, setHabits]       = useState<HabitDef[]>(DEFAULT_HABITS);
  const [habitData, setHabitData] = useState<HabitRecord[]>([]);
  const [addingHabit, setAddingHabit] = useState(false);
  const [newHabitLabel, setNewHabitLabel] = useState("");

  useEffect(() => {
    try { const raw = localStorage.getItem(HABITS_KEY); if (raw) setHabitData(JSON.parse(raw)); } catch {}
    try {
      const rawH = localStorage.getItem(HABITS_CUSTOM_KEY);
      if (rawH) setHabits([...DEFAULT_HABITS, ...(JSON.parse(rawH) as HabitDef[])]);
    } catch {}
  }, []);

  function saveHabitData(next: HabitRecord[]) {
    setHabitData(next);
    try { localStorage.setItem(HABITS_KEY, JSON.stringify(next)); } catch {}
  }

  function handleToggle(habitId: string) {
    const today = todayStr();
    const next  = [...habitData];
    const idx   = next.findIndex(r => r.habitId === habitId);
    if (idx === -1) {
      next.push({ habitId, dates: [today] });
    } else {
      const record = { ...next[idx] };
      record.dates = record.dates.includes(today) ? record.dates.filter(d => d !== today) : [...record.dates, today];
      next[idx] = record;
    }
    saveHabitData(next);
  }

  function getCompletedDates(habitId: string): string[] {
    return habitData.find(r => r.habitId === habitId)?.dates ?? [];
  }

  function handleAddHabit() {
    const trimmed = newHabitLabel.trim();
    if (!trimmed) return;
    const newH: HabitDef = { id: "custom_" + Date.now(), label: trimmed, category: "Learning", streak: 0, custom: true };
    const next = [...habits, newH];
    setHabits(next);
    try { localStorage.setItem(HABITS_CUSTOM_KEY, JSON.stringify(next.filter(h => h.custom))); } catch {}
    setNewHabitLabel("");
    setAddingHabit(false);
  }

  const today     = todayStr();
  const doneCount = habits.filter(h => getCompletedDates(h.id).includes(today)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Daily Habits</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{doneCount} of {habits.length} today</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 80, height: 5, borderRadius: 3, background: "var(--card-border)", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${habits.length === 0 ? 0 : Math.round((doneCount / habits.length) * 100)}%`, background: ACCENT_FINANCE, borderRadius: 3, transition: "width 300ms" }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT_FINANCE }}>{habits.length === 0 ? 0 : Math.round((doneCount / habits.length) * 100)}%</span>
        </div>
      </div>

      {habits.map(habit => <HabitRow key={habit.id} habit={habit} completedDates={getCompletedDates(habit.id)} onToggle={handleToggle} />)}

      {addingHabit ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <input autoFocus type="text" value={newHabitLabel} onChange={e => setNewHabitLabel(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAddHabit(); if (e.key === "Escape") { setAddingHabit(false); setNewHabitLabel(""); } }} placeholder="New habit name..." style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--card-border)", background: "var(--app-bg)", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
          <button type="button" onClick={handleAddHabit} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: ACCENT_CAREER, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Add</button>
          <button type="button" onClick={() => { setAddingHabit(false); setNewHabitLabel(""); }} style={{ padding: "6px", borderRadius: 8, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}><X size={14} /></button>
        </div>
      ) : (
        <button type="button" onClick={() => setAddingHabit(true)} style={{ display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start", background: "var(--card-bg)", border: "1px dashed var(--card-border)", borderRadius: 10, padding: "7px 12px", color: ACCENT_CAREER, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          <Plus size={13} />Add habit
        </button>
      )}
    </div>
  );
}

// ── Goals Tab ─────────────────────────────────────────────────────────────────

function GoalCategoryBlock({
  category,
  onToggleGoal,
  onAddGoal,
}: {
  category: GoalCategory;
  onToggleGoal: (catId: string, goalId: string) => void;
  onAddGoal: (catId: string, label: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const doneCount = category.goals.filter(g => g.done).length;
  const total     = category.goals.length;
  const pct       = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  function handleAdd() {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    onAddGoal(category.id, trimmed);
    setNewLabel("");
    setAdding(false);
  }

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: category.color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)", flex: 1 }}>{category.label}</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{doneCount}/{total}</span>
        <div style={{ width: 60, height: 4, borderRadius: 3, background: "var(--card-border)", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: category.color, borderRadius: 3, transition: "width 300ms" }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: category.color, minWidth: 24, textAlign: "right" }}>{pct}%</span>
      </div>
      <div style={{ padding: "4px 0" }}>
        {category.goals.map((goal, idx) => (
          <label key={goal.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", cursor: "pointer", borderBottom: idx < category.goals.length - 1 ? "1px solid var(--card-border)" : "none" }}>
            <input type="checkbox" checked={goal.done} onChange={() => onToggleGoal(category.id, goal.id)} style={{ accentColor: category.color, width: 14, height: 14, cursor: "pointer", flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: goal.done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: goal.done ? "line-through" : "none", flex: 1 }}>{goal.label}</span>
            {goal.done && <CheckCircle2 size={13} color={ACCENT_FINANCE} strokeWidth={2} />}
          </label>
        ))}
      </div>
      <div style={{ padding: "6px 14px", borderTop: "1px solid var(--card-border)" }}>
        {adding ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input autoFocus type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewLabel(""); } }} placeholder="New goal..." style={{ flex: 1, padding: "5px 9px", borderRadius: 7, border: "1px solid var(--card-border)", background: "var(--app-bg)", color: "var(--text-primary)", fontSize: 12, outline: "none" }} />
            <button type="button" onClick={handleAdd} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: category.color, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Add</button>
            <button type="button" onClick={() => { setAdding(false); setNewLabel(""); }} style={{ padding: "5px", borderRadius: 7, border: "1px solid var(--card-border)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}><X size={13} /></button>
          </div>
        ) : (
          <button type="button" onClick={() => setAdding(true)} style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", color: category.color, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "1px 0" }}><Plus size={12} />Add goal</button>
        )}
      </div>
    </div>
  );
}

function GoalsTab() {
  const [categories, setCategories] = useState<GoalCategory[]>(DEFAULT_GOAL_CATEGORIES);

  useEffect(() => {
    try { const raw = localStorage.getItem(GOALS_KEY); if (raw) setCategories(JSON.parse(raw)); } catch {}
  }, []);

  function save(next: GoalCategory[]) {
    setCategories(next);
    try { localStorage.setItem(GOALS_KEY, JSON.stringify(next)); } catch {}
  }

  function handleToggleGoal(catId: string, goalId: string) {
    save(categories.map(cat => cat.id !== catId ? cat : { ...cat, goals: cat.goals.map(g => g.id === goalId ? { ...g, done: !g.done } : g) }));
  }

  function handleAddGoal(catId: string, label: string) {
    save(categories.map(cat => cat.id !== catId ? cat : { ...cat, goals: [...cat.goals, { id: "g_" + Date.now(), label, done: false, custom: true }] }));
  }

  const totalGoals  = categories.reduce((s, c) => s + c.goals.length, 0);
  const doneGoals   = categories.reduce((s, c) => s + c.goals.filter(g => g.done).length, 0);
  const overallPct  = totalGoals === 0 ? 0 : Math.round((doneGoals / totalGoals) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Milestone Goals</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{doneGoals} of {totalGoals} goals complete</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 90, height: 5, borderRadius: 3, background: "var(--card-border)", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${overallPct}%`, background: ACCENT_FINANCE, borderRadius: 3, transition: "width 300ms" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: ACCENT_FINANCE, minWidth: 28, textAlign: "right" }}>{overallPct}%</span>
        </div>
      </div>
      {categories.map(cat => <GoalCategoryBlock key={cat.id} category={cat} onToggleGoal={handleToggleGoal} onAddGoal={handleAddGoal} />)}
    </div>
  );
}

// ── Signal data types ─────────────────────────────────────────────────────────

interface SignalData {
  signalScore: number | null;
  naceScores: Array<{ key: string; shortLabel: string; score: number | null }>;
  profile: { name?: string; graduationYear?: string; stage?: string; targetIndustry?: string };
  speaking: { interview: { count: number; avgScore: number | null }; networking: { count: number }; publicSpeaking: { count: number } };
  completeness: number;
  nextAction: { label: string; href: string; naceKey?: string; currentScore?: number | null } | null;
  aptitude: {
    primary: string;
    secondary?: string;
    scores?: { riasecProfile?: string; [key: string]: unknown };
    completedAt?: string;
  } | null;
  careerCheckIn: { salaryRange?: string; industry?: string; has401k?: boolean | null; employmentStatus?: string; currentSavingsRange?: string | null; studentLoanRange?: string | null } | null;
  financialReadinessScore: number;
  checklist: { preCollege: { total: number; done: number }; duringCollege: { total: number; done: number }; postCollege: { total: number; done: number }; financialLiteracy: { total: number; done: number } };
  resumeHistory: { id: string }[];
  interviewPipeline: { total: number; offers: number; accepted: number };
  instincts: { totalXp: number };
}

// ── Career Assessment Card ────────────────────────────────────────────────────

const RIASEC_FULL: Record<string, string> = {
  R: "Realistic", I: "Investigative", A: "Artistic",
  S: "Social", E: "Enterprising", C: "Conventional",
};

function CareerAssessmentCard({ aptitude }: { aptitude: NonNullable<SignalData["aptitude"]> }) {
  const scores = aptitude.scores as any;
  const profile = scores?.riasecProfile ?? aptitude.primary ?? null;
  const riasecScores: Record<string, number> = scores?.riasecScores ?? {};
  const workValues: Record<string, number> = scores?.workValues ?? {};
  const topValue = Object.entries(workValues).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const VALUE_LABELS: Record<string, string> = {
    achievement: "Achievement", independence: "Independence", recognition: "Recognition",
    relationships: "Relationships", support: "Social Impact", conditions: "Work-Life Balance",
  };

  const topDims = Object.entries(riasecScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const maxScore = Math.max(...topDims.map(d => d[1]), 1);

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Brain size={15} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Career Assessment</span>
        </div>
        <Link href="/aptitude" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Retake →</Link>
      </div>

      {profile && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "var(--accent)", letterSpacing: -1, lineHeight: 1 }}>{profile}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
            {profile.split("").map((c: string) => RIASEC_FULL[c] ?? c).join(" · ")}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: topValue ? 12 : 0 }}>
        {topDims.map(([dim, score]) => (
          <div key={dim} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", width: 14 }}>{dim}</span>
            <div style={{ flex: 1, height: 5, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99, background: "var(--accent)", width: `${(score / maxScore) * 100}%`, transition: "width 0.5s ease" }} />
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 24, textAlign: "right" }}>{score}</span>
          </div>
        ))}
      </div>

      {topValue && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "var(--card-bg-strong)", border: "1px solid var(--card-border-soft)" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Core value:</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{VALUE_LABELS[topValue] ?? topValue}</span>
        </div>
      )}
    </div>
  );
}

// ── Last Mock Interview Card ───────────────────────────────────────────────────

function LastMockInterviewCard({ attempt }: { attempt: any }) {
  const feedback = attempt.feedback as any;
  const score = Math.round((feedback?.score ?? 0) * 10);
  const readiness: string = feedback?.readiness_level ?? "developing";
  const readinessColor: Record<string, string> = {
    strong: "#10B981", ready: "#10B981", developing: "#F59E0B", not_ready: "#EF4444",
  };
  const color = readinessColor[readiness] ?? "#F59E0B";
  const readinessLabel: Record<string, string> = {
    strong: "Strong", ready: "Ready", developing: "Developing", not_ready: "Not Ready",
  };

  const role = attempt.question?.replace("Mock Interview — ", "") ?? "Mock Interview";
  const dateStr = attempt.ts ? new Date(attempt.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

  const qBreakdowns: Array<{ question: string; competency: string; score: number; note: string }> =
    feedback?.question_breakdowns?.slice(0, 3) ?? [];

  const dimScores = feedback?.dimension_scores as Record<string, { score: number; label: string }> | null;
  const topDims = dimScores
    ? Object.entries(dimScores).sort((a, b) => b[1].score - a[1].score).slice(0, 3)
    : [];

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={15} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Last Mock Interview</span>
        </div>
        <Link href="/mock-interview" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>New →</Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>/100</div>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${color}18`, color }}>{readinessLabel[readiness]}</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{role}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{dateStr}</div>
        </div>
      </div>

      {feedback?.coaching_summary && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 12, padding: "8px 10px", background: "var(--card-bg-strong)", borderRadius: 8, borderLeft: "2px solid var(--accent)" }}>
          {feedback.coaching_summary.slice(0, 180)}{feedback.coaching_summary.length > 180 ? "..." : ""}
        </div>
      )}

      {topDims.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: qBreakdowns.length > 0 ? 12 : 0 }}>
          {topDims.map(([key, dim]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dim.label ?? key}</span>
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, background: "var(--accent)", width: `${(dim.score / 10) * 100}%` }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", minWidth: 24, textAlign: "right" }}>{dim.score}</span>
            </div>
          ))}
        </div>
      )}

      {qBreakdowns.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Questions</div>
          {qBreakdowns.map((qb, i) => {
            const qc = qb.score >= 70 ? "#10B981" : qb.score >= 50 ? "#F59E0B" : "#EF4444";
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: qc, minWidth: 24 }}>{qb.score}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{qb.question.slice(0, 70)}{qb.question.length > 70 ? "..." : ""}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData]           = useState<SignalData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [progress, setProgress]   = useState<ChecklistProgressEntry[]>([]);
  const [tasks, setTasks]         = useState<DbTask[]>([]);
  const [activeTab, setActiveTab] = useState<"tasks" | "habits" | "goals">("tasks");
  const [lastMockInterview, setLastMockInterview] = useState<any | null>(null);
  const [calView, setCalView]     = useState<"month" | "week" | "day">("week");
  const [calAddDate, setCalAddDate] = useState<string | null>(null);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [checklistKey, setChecklistKey] = useState(0);
  const [dashView, setDashView]   = useState<"dashboard" | "planner">("dashboard");
  const { data: session } = useSession();
  const isUniversity = useIsUniversity();

  useEffect(() => {
    fetch("/api/student-profile")
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function refreshTasks() {
    try {
      const res = await fetch("/api/tasks");
      const json = await res.json();
      if (Array.isArray(json)) setTasks(json);
    } catch {}
  }

  useEffect(() => { refreshTasks(); }, []);

  useEffect(() => {
    if (!isUniversity) return;
    fetch("/api/mock-interview")
      .then(r => r.json())
      .then(d => setLastMockInterview(d?.attempt ?? null))
      .catch(() => {});
  }, [isUniversity]);

  // Map DB tasks to ScheduleItem[] for calendar display (only tasks with scheduledAt)
  const scheduled: ScheduleItem[] = tasks
    .filter(t => !!t.scheduledAt)
    .map(t => ({
      itemId: t.id,
      label:  t.title,
      date:   t.scheduledAt!.split("T")[0],
      done:   !!t.completedAt,
      category: t.category ?? "Career",
      scheduledTime: t.scheduledAt!.includes("T") && t.scheduledAt!.split("T")[1].length >= 5
        ? t.scheduledAt!.split("T")[1].slice(0, 5)
        : undefined,
      notes: t.notes ?? undefined,
    }));

  const stage       = (session as any)?.user?.demoPersona as string | undefined;
  const stageConfig = stage ? STAGE_MAP[stage] : null;

  const sessionName   = (session as any)?.user?.name as string | undefined;
  const rawFirst      = data?.profile?.name?.split(" ")[0] || sessionName?.split(" ")[0] || "";
  const firstName     = rawFirst ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase() : "";
  const totalSessions = data ? data.speaking.interview.count + data.speaking.networking.count + data.speaking.publicSpeaking.count : null;

  const signalScore = data?.signalScore ?? null;
  const signalColor = signalScore === null ? "var(--text-muted)" : signalScore >= 60 ? "#10B981" : signalScore >= 35 ? "#F59E0B" : "#EF4444";

  const hour    = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const riasecProfile = data?.aptitude?.scores?.riasecProfile ?? data?.aptitude?.primary ?? null;
  const industry      = data?.careerCheckIn?.industry ?? data?.profile?.targetIndustry ?? null;
  const topMatches    = riasecProfile ? matchOccupations(riasecProfile, { limit: 3 }) : [];

  const needsReassessment = (() => {
    if (!data?.aptitude?.completedAt) return false;
    return (Date.now() - new Date(data.aptitude.completedAt).getTime()) / (1000 * 60 * 60 * 24 * 30) >= 11;
  })();

  const hasAptitude    = !!data?.aptitude;
  const hasAnySessions = totalSessions !== null && totalSessions > 0;
  const checklistItems = stageConfig?.checklist ?? [];

  async function handleDropTask(raw: string, date: string, time?: string) {
    // Check if this is a checklist item drop (JSON payload) vs an existing task ID
    let parsed: { type: "checklist"; id: string; label: string } | null = null;
    try { const j = JSON.parse(raw); if (j?.type === "checklist") parsed = j; } catch {}

    if (parsed) {
      // Schedule the checklist item itself - don't create a task
      const stage = stageConfig?.stageKey;
      if (!stage) return;
      await fetch("/api/checklist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, itemId: parsed.id, scheduledDate: date }),
      });
      setChecklistKey(k => k + 1); // force ChecklistSection to re-fetch and show the date badge
    } else {
      const scheduledAt = time ? `${date}T${time}:00.000Z` : `${date}T00:00:00.000Z`;
      await fetch(`/api/tasks/${raw}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      });
      refreshTasks();
    }
  }

  function openEditModal(_item: ScheduleItem) {
    // Task editing handled inline in TasksPanel
  }

  const TABS = [
    { id: "tasks"  as const, label: "Tasks" },
    { id: "habits" as const, label: "Habits" },
    { id: "goals"  as const, label: "Goals" },
  ];

  const finScore       = data?.financialReadinessScore ?? 0;
  const finColor       = finScore >= 70 ? "#16A34A" : finScore >= 40 ? "#D97706" : "#EF4444";
  const todayStr_      = new Date().toISOString().split("T")[0];
  const todayScheduled = tasks.filter(t => !t.completedAt && t.dueDate?.startsWith(todayStr_)).length;

  return (
    <PremiumShell hideHeader>
      <div style={{ maxWidth: 1280, margin: "0 auto", paddingBottom: 80 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 2px", fontSize: 24, fontWeight: 700, color: "var(--text-primary)", letterSpacing: -0.3 }}>
              {greeting}{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Dashboard / Planner toggle — university only */}
            {isUniversity && (
              <div style={{ display: "flex", padding: "3px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
                {(["dashboard", "planner"] as const).map(v => (
                  <button key={v} type="button" onClick={() => setDashView(v)} style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: dashView === v ? "var(--accent)" : "transparent", color: dashView === v ? "#fff" : "var(--text-muted)", fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "capitalize", transition: "all 140ms" }}>
                    {v === "dashboard" ? "Overview" : "Planner"}
                  </button>
                ))}
              </div>
            )}
            {!loading && isUniversity && signalScore !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: signalColor, lineHeight: 1 }}>{signalScore}</div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", lineHeight: 1 }}>Signal Score</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{data?.completeness ?? 0}% complete</div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setJourneyOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
            >
              My Journey →
            </button>
          </div>
        </div>

        {isUniversity && <StreakBanner />}

        {/* ── OVERVIEW VIEW (university) ── */}
        {isUniversity && dashView === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>

            {/* Quick actions row */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { Icon: Mic,      label: "Practice",      href: "/practice",        color: ACCENT_CAREER },
                { Icon: Users,    label: "Mock Interview", href: "/mock-interview",  color: "#8B5CF6" },
                { Icon: BarChart2,label: "My Progress",   href: "/progress",        color: "#0EA5E9" },
                { Icon: FileText, label: "Resume",        href: "/resume-gap",      color: "#F59E0B" },
                { Icon: Map,      label: "Career Guide",  href: "/career-guide",    color: "#10B981" },
              ].map(item => (
                <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "1px solid var(--card-border)", background: "var(--card-bg)", fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", transition: "border-color 150ms" }}>
                    <item.Icon size={13} color={item.color} />
                    {item.label}
                  </div>
                </Link>
              ))}
            </div>

            {needsReassessment && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 16px", borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <RefreshCw size={16} color="#92400E" />
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>Time to retake your Career Assessment</div>
                </div>
                <Link href="/aptitude" style={{ padding: "6px 14px", borderRadius: 8, background: "#F59E0B", color: "#fff", fontWeight: 700, fontSize: 12, textDecoration: "none" }}>Retake →</Link>
              </div>
            )}

            {/* Role cluster readiness */}
            <RoleClusterSection accentColor="var(--accent)" />

            {/* Career assessment + last mock interview — clickable through to full views */}
            {(data?.aptitude || lastMockInterview) && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
                {data?.aptitude && (
                  <Link href="/aptitude?view=results" style={{ textDecoration: "none", color: "inherit" }}>
                    <CareerAssessmentCard aptitude={data.aptitude} />
                  </Link>
                )}
                {lastMockInterview && (
                  <Link href="/mock-interview?view=results" style={{ textDecoration: "none", color: "inherit" }}>
                    <LastMockInterviewCard attempt={lastMockInterview} />
                  </Link>
                )}
              </div>
            )}

            {/* Onboarding nudge */}
            {!loading && data && !hasAptitude && !hasAnySessions && (
              <div style={{ padding: "14px 18px", borderRadius: 12, background: "linear-gradient(135deg, rgba(37,99,235,0.07), rgba(139,92,246,0.07))", border: "1px solid rgba(37,99,235,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>Welcome to Signal — let's get you set up</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Start with the Career Assessment to unlock your Signal Score, career matches, and personalized plan.</div>
                </div>
                <Link href="/aptitude" style={{ padding: "8px 18px", borderRadius: 9, background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap" }}>Take Career Assessment →</Link>
              </div>
            )}
          </div>
        )}

        {/* ── Consumer dashboard: interview-focused tiles ── */}
        {!isUniversity && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>

            <RoleClusterSection accentColor="var(--accent)" />

            {/* Featured: Interview Practice */}
            <Link href="/practice" style={{ textDecoration: "none" }}>
              <div style={{
                padding: "28px 32px",
                borderRadius: "var(--radius-lg, 12px)",
                background: "linear-gradient(135deg, rgba(37,99,235,0.22) 0%, rgba(14,165,233,0.10) 100%)",
                border: "1px solid rgba(37,99,235,0.30)",
                boxShadow: "0 4px 24px rgba(37,99,235,0.15)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 24, flexWrap: "wrap" as const,
                cursor: "pointer",
                position: "relative" as const, overflow: "hidden" as const,
              }}>
                <div style={{
                  position: "absolute", top: -30, right: 60,
                  width: 200, height: 200, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(37,99,235,0.20), transparent 70%)",
                  pointerEvents: "none" as const,
                }} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(37,99,235,0.25)", border: "1px solid rgba(37,99,235,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Mic size={18} color="#93C5FD" />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#93C5FD", letterSpacing: 0.4 }}>Most popular</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, letterSpacing: -0.2 }}>Interview Practice</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, maxWidth: 500 }}>
                    AI-powered mock interviews with real-time scoring across 7 communication dimensions, vocal analysis, and facial feedback.
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" as const }}>
                    {["7 dimensions", "Vocal analysis", "Eye contact", "Coaching plan"].map(t => (
                      <span key={t} style={{ padding: "3px 10px", borderRadius: 5, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", fontSize: 11, color: "var(--text-muted)" }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <div style={{ padding: "12px 28px", borderRadius: 10, background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 14, boxShadow: "0 4px 20px rgba(37,99,235,0.4)", whiteSpace: "nowrap" as const }}>
                    Start practicing →
                  </div>
                </div>
              </div>
            </Link>

            {/* Regular tiles grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {[
                { Icon: Users,     title: "Mock Interview", desc: "Full conversational interview with a GPT-4o hiring manager. Scored across 7 dimensions.",      href: "/mock-interview" },
                { Icon: BarChart2, title: "My Progress",    desc: "Track scores, vocal patterns, eye contact, and improvement over time.",                        href: "/progress"       },
                { Icon: FileText,  title: "Resume Analysis",desc: "Upload your resume for ATS scoring, gap analysis, and top action items.",                      href: "/resume-gap"     },
                { Icon: BookOpen,  title: "Question Bank",  desc: "Browse and filter hundreds of interview questions by type and role.",                          href: "/question-bank"  },
                { Icon: Target,    title: "Job Profiles",   desc: "Practice for specific roles with tailored question sets.",                                     href: "/job-profiles"   },
                { Icon: Briefcase, title: "Job Tracker",    desc: "Track applications, monitor your funnel, and stay organized through every stage.",             href: "/job-tracker"    },
                { Icon: Library,   title: "Experience Log", desc: "Build your library of career stories. Refine the STAR structure and practice until fluent.",   href: "/experience-log" },
                { Icon: Home,      title: "Life Buddy",     desc: "Plan your week, track your budget, and project your retirement, all in one place.",            href: "/life-buddy"     },
              ].map(item => (
                <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                  <div style={{
                    padding: "18px 20px",
                    borderRadius: "var(--radius-md, 10px)",
                    border: "1px solid var(--card-border)",
                    background: "linear-gradient(145deg, var(--card-bg-strong) 0%, var(--card-bg) 100%)",
                    boxShadow: "var(--shadow-card)",
                    display: "flex", flexDirection: "column", gap: 10,
                    cursor: "pointer",
                    height: "100%",
                  }}>
                    <item.Icon size={18} color="var(--text-muted)" />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── PLANNER VIEW: Calendar + Tasks/Habits/Goals (university only) ── */}
        {isUniversity && dashView === "planner" && <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 400px", gap: 24, alignItems: "start" }}>

          {/* Calendar */}
          <div>
            <div style={{ display: "flex", gap: 4, marginBottom: 12, width: "fit-content" }}>
              {(["day","week","month"] as const).map(v => (
                <button key={v} type="button" onClick={() => setCalView(v)} style={{ padding: "5px 14px", borderRadius: 7, border: "1px solid var(--card-border)", background: calView === v ? "var(--accent)" : "var(--card-bg)", color: calView === v ? "#fff" : "var(--text-muted)", fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "capitalize", transition: "all 120ms" }}>
                  {v}
                </button>
              ))}
              <button type="button" onClick={() => { setActiveTab("tasks"); setCalAddDate(todayStr_); }} style={{ marginLeft: 8, padding: "5px 14px", borderRadius: 7, border: "none", background: ACCENT_CAREER, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <Plus size={13} /> Add task
              </button>
            </div>
            {calView === "month" && <FullMonthCalendar scheduled={scheduled} onDropTask={handleDropTask} onEditTask={openEditModal} />}
            {calView === "week"  && <WeekView scheduled={scheduled} onDropTask={handleDropTask} onAddAtTime={(date) => { setActiveTab("tasks"); setCalAddDate(date); }} onEditTask={openEditModal} />}
            {calView === "day"   && <DayView  scheduled={scheduled} onDropTask={handleDropTask} onAddAtTime={(date) => { setActiveTab("tasks"); setCalAddDate(date); }} onEditTask={openEditModal} />}
          </div>

          {/* Right panel: Tasks / Habits / Goals */}
          <div>
            <div style={{ display: "flex", gap: 4, marginBottom: 16, padding: "4px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              {TABS.map(tab => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, background: activeTab === tab.id ? "var(--accent)" : "transparent", color: activeTab === tab.id ? "#fff" : "var(--text-muted)", transition: "background 150ms, color 150ms" }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "tasks" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {tasks.length === 0 && !stageConfig && (
                  <div style={{ textAlign: "center", padding: "28px 16px", borderRadius: 12, border: "1px dashed var(--card-border)", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>📋</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>No tasks yet</div>
                    <div style={{ fontSize: 12 }}>Add a task below or drag a checklist item onto the calendar.</div>
                  </div>
                )}
                <TasksPanel tasks={tasks} onRefresh={refreshTasks} defaultDate={calAddDate ?? undefined} />
                {stageConfig && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.7, color: stageConfig.accent, textTransform: "uppercase" }}>Stage Checklist</div>
                      <Link href={stageConfig.guideHref} style={{ fontSize: 11, fontWeight: 700, color: stageConfig.accent, textDecoration: "none" }}>{stageConfig.guideLabel} →</Link>
                    </div>
                    <ChecklistSection key={checklistKey} stage={stageConfig.stageKey} items={checklistItems} accentColor={stageConfig.accent} onProgressChange={setProgress} />
                  </div>
                )}
              </div>
            )}
            {activeTab === "habits" && <HabitsTab />}
            {activeTab === "goals"  && <GoalsTab />}
          </div>
        </div>}

        {/* ── NACE snapshot (university only) ── */}
        {isUniversity && data && data.naceScores.some(n => n.score !== null) && (
          <div style={{ padding: "14px 18px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase" }}>NACE Career Readiness</span>
              <Link href="/my-journey?tab=nace" style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>Full breakdown →</Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "7px 18px" }}>
              {data.naceScores.filter(n => n.key !== "equity_inclusion" && n.score !== null).map(ns => (
                <div key={ns.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{ns.shortLabel}</span>
                    <span style={{ fontSize: 10, fontWeight: 900, color: ns.score! >= 50 ? "#10B981" : "var(--text-muted)" }}>{ns.score}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${ns.score}%`, borderRadius: 99, background: "var(--accent)", transition: "width 0.6s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <JourneySidebar open={journeyOpen} onClose={() => setJourneyOpen(false)} data={data} isUniversity={isUniversity} />

      </div>

    </PremiumShell>
  );
}
