"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Mic, DollarSign, Shield, BookOpen,
  BarChart2, CheckSquare, FileText, Home, BarChart, RefreshCw,
  TrendingUp, Brain, Target, CheckCircle2, Circle, Flame,
  ChevronRight, ChevronLeft, Plus, X, Clock, Heart,
  Gamepad2, Zap,
} from "lucide-react";
import PremiumShell from "@/app/components/PremiumShell";
import StreakBanner from "@/app/components/StreakBanner";
import ChecklistSection, { type ChecklistProgressEntry } from "@/app/components/ChecklistSection";
import { matchOccupations } from "@/app/lib/onet-occupations";
import DailyGamesWidget from "@/app/components/DailyGamesWidget";
import JourneySidebar from "@/app/components/JourneySidebar";

// ── Stage-specific checklist items ────────────────────────────────────────────

const PRE_COLLEGE_CHECKLIST = [
  { id: "fafsa_done",       label: "Complete FAFSA or renewal",                desc: "Priority #1 — opens October 1 each year. File as early as possible. Aid is first-come, first-served at many schools.", linkHref: "https://studentaid.gov/h/apply-for-aid/fafsa", linkLabel: "Apply on StudentAid.gov" },
  { id: "aid_letter",       label: "Review your financial aid award letter",   desc: "Your award letter breaks down grants (free), work-study (job program), and loans (repaid with interest).", linkHref: "/career-guide/finances?from=pre-college", linkLabel: "Understanding grants vs. loans" },
  { id: "orientation",      label: "Sign up for orientation",                  desc: "Many schools require registration and charge a fee. Don't miss the deadline — orientation is how you meet your advisor and get class registration access." },
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
  { id: "internship_apps",  label: "Apply to at least 3 internships",             desc: "Start in September for summer internships — many Fortune 500 recruiting cycles close by November.", linkHref: "https://www.linkedin.com/jobs/", linkLabel: "Browse internships on LinkedIn" },
  { id: "taxes_filed",      label: "File your taxes (every April)",               desc: "If you earned income from a job, work-study, or freelance work, you need to file by April 15.", linkHref: "https://apps.irs.gov/app/freeFile/", linkLabel: "IRS Free File" },
  { id: "fafsa_renewed",    label: "Renew FAFSA each year",                       desc: "FAFSA does not auto-renew. You must reapply each October 1 for the following academic year.", linkHref: "https://studentaid.gov/h/apply-for-aid/fafsa", linkLabel: "Renew on StudentAid.gov" },
  { id: "advisor_semester", label: "Meet with advisor each semester",             desc: "Before registration each semester, review your degree audit to catch missing requirements early." },
  { id: "career_fair",      label: "Attend at least one career fair",             desc: "Come with printed resumes (10+ copies), professional clothes, and a practiced 30-second pitch." },
  { id: "rec_letter",       label: "Ask a professor for a recommendation letter", desc: "Ask professors who know you from office hours or projects. Ask at least 6 weeks before any deadline." },
  { id: "gpa_check",        label: "Check internship/grad school GPA requirements", desc: "Many competitive programs list minimum GPAs of 3.0–3.5. Know what you're working toward now." },
  { id: "emergency_fund",   label: "Start a $500 emergency fund",                desc: "Before buying anything discretionary, build a $500 buffer in a separate savings account.", linkHref: "/financial-literacy", linkLabel: "Financial Literacy tools" },
];

const POST_COLLEGE_CHECKLIST = [
  { id: "401k_enrolled",    label: "Enroll in your 401(k)",                          desc: "Do this in your first 30 days — you cannot retroactively contribute to months missed. If your employer matches, enroll immediately.", linkHref: "https://investor.gov/financial-tools-calculators/calculators/compound-interest-calculator", linkLabel: "See compound growth calculator" },
  { id: "contribution_set", label: "Set your 401(k) contribution rate",              desc: "Contribute at minimum whatever percentage your employer matches — that's a 100% instant return.", linkHref: "/career-guide/retirement?from=post-college", linkLabel: "See your retirement projection" },
  { id: "benefits_reviewed",label: "Review all your benefits (health, dental, FSA)", desc: "You typically have 30 days from your start date to enroll. Compare PPO vs HDHP carefully.", linkHref: "/career-guide/finances?from=post-college", linkLabel: "Benefits 101 guide" },
  { id: "w4_set",           label: "Set up your W-4 correctly",                      desc: "The W-4 tells your employer how much federal tax to withhold. Use the IRS Withholding Estimator to dial it in.", linkHref: "https://apps.irs.gov/app/tax-withholding-estimator", linkLabel: "IRS Withholding Estimator" },
  { id: "paycheck_review",  label: "Understand your first paycheck",                 desc: "Your gross salary ÷ pay periods = gross per check. Build your budget from net (take-home), not gross.", linkHref: "/career-guide/finances?from=post-college", linkLabel: "Understanding your paycheck" },
  { id: "loans_plan",       label: "Set up your student loan repayment plan",        desc: "Log into StudentAid.gov to see your balance. Income-driven repayment plans cap payments at 5–10% of discretionary income.", linkHref: "https://studentaid.gov/manage-loans/repayment", linkLabel: "Explore federal repayment options" },
  { id: "emergency_3mo",    label: "Build a 3-month emergency fund",                 desc: "Before investing beyond your 401k match, build 3 months of essential expenses in a high-yield savings account (4–5% APY)." },
  { id: "renter_insurance", label: "Get renter's insurance",                         desc: "Usually $15–20/month. Covers your belongings if stolen or damaged. Your landlord's insurance only covers the building.", linkHref: "https://www.nerdwallet.com/best/insurance/renters", linkLabel: "Compare renters insurance" },
  { id: "credit_report",   label: "Check your credit report",                       desc: "One free report per bureau per year at AnnualCreditReport.com. Review for errors — they're more common than you think.", linkHref: "https://www.annualcreditreport.com", linkLabel: "Get your free report" },
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
            <div key={key} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const raw = e.dataTransfer.getData("text/plain"); if (raw) onDropTask(raw, key); }} style={{ borderLeft: "1px solid var(--card-border)", padding: "3px 4px", minHeight: 28 }}>
              {items.slice(0, 2).map(item => {
                const c = CATEGORY_COLORS[item.category ?? "Career"] ?? ACCENT_CAREER;
                return <div key={item.itemId} draggable onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData("text/plain", item.itemId); }} onClick={e => { e.stopPropagation(); onEditTask(item); }} title={item.label} style={{ fontSize: 9, fontWeight: 600, color: item.done ? "var(--text-muted)" : c, background: c + "15", borderLeft: `2px solid ${c}`, padding: "1px 4px", borderRadius: "0 3px 3px 0", marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: item.done ? "line-through" : "none", cursor: "pointer" }}>{item.label}</div>;
              })}
              {items.length > 2 && <div style={{ fontSize: 9, color: "var(--text-muted)" }}>+{items.length - 2}</div>}
            </div>
          );
        })}
      </div>

      {/* Time grid — scrollable */}
      <div style={{ overflowY: "auto", maxHeight: 520 }}>
        {HOURS.map(hour => (
          <div key={hour} style={{ display: "grid", gridTemplateColumns: `56px ${weekDays.map(() => "1fr").join(" ")}`, borderBottom: "1px solid var(--card-border)", minHeight: 52 }}>
            <div style={{ padding: "6px 8px 0", fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textAlign: "right", flexShrink: 0 }}>{fmtHour(hour)}</div>
            {weekDays.map(({ key }) => {
              const items = getItemsAt(key, hour);
              return (
                <div
                  key={key}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const raw = e.dataTransfer.getData("text/plain"); if (raw) onDropTask(raw, key, `${hour.toString().padStart(2, "0")}:00`); }}
                  onClick={() => onAddAtTime(key, `${hour.toString().padStart(2, "0")}:00`)}
                  style={{ borderLeft: "1px solid var(--card-border)", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column" }}
                >
                  {items.map(item => {
                    const c = CATEGORY_COLORS[item.category ?? "Career"] ?? ACCENT_CAREER;
                    return <div key={item.itemId} draggable onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData("text/plain", item.itemId); }} onClick={e => { e.stopPropagation(); onEditTask(item); }} title={item.label} style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 5px", fontSize: 10, fontWeight: 700, color: item.done ? "var(--text-muted)" : "#fff", background: item.done ? "var(--card-border)" : c, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: item.done ? "line-through" : "none", cursor: "pointer", width: "100%", boxSizing: "border-box", minHeight: 50 }}>{item.label}</div>;
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
  completeness: number;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData]       = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ChecklistProgressEntry[]>([]);
  const [scheduled, setScheduled] = useState<ScheduleItem[]>([]);
  const [activeTab, setActiveTab] = useState<"tasks" | "habits" | "goals">("tasks");
  const [calView, setCalView] = useState<"month" | "week" | "day">("month");
  const [addModal, setAddModal] = useState<{ date: string; time: string; existing?: ScheduleItem } | null>(null);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    fetch("/api/student-profile")
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setScheduled(readSchedule());
  }, []);

  const stage       = (session as any)?.user?.demoPersona as string | undefined;
  const stageConfig = stage ? STAGE_MAP[stage] : null;

  const firstName     = data?.profile?.name?.split(" ")[0] || "there";
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

  function handleDropTask(taskIdOrTitle: string, date: string, time?: string) {
    setScheduled(prev => {
      const existing = prev.find(i => i.itemId === taskIdOrTitle || i.label === taskIdOrTitle);
      let updated: ScheduleItem[];
      if (existing) {
        updated = prev.map(i =>
          (i.itemId === taskIdOrTitle || i.label === taskIdOrTitle)
            ? { ...i, date, ...(time ? { scheduledTime: time } : {}) }
            : i
        );
      } else {
        const newItem: ScheduleItem = {
          itemId: "drop_" + Date.now(),
          label: taskIdOrTitle,
          date,
          done: false,
          category: "Career",
          scheduledTime: time,
          custom: true,
        };
        updated = [...prev, newItem];
      }
      writeSchedule(updated);
      return updated;
    });
  }

  function handleAddTask(item: ScheduleItem) {
    const next = [...scheduled, item];
    writeSchedule(next);
    setScheduled(next);
  }

  function handleUpdateTask(item: ScheduleItem) {
    setScheduled(prev => {
      const next = prev.map(i => i.itemId === item.itemId ? item : i);
      writeSchedule(next);
      return next;
    });
  }

  function handleDeleteTask(itemId: string) {
    const next = scheduled.filter(i => i.itemId !== itemId);
    writeSchedule(next);
    setScheduled(next);
  }

  function openEditModal(item: ScheduleItem) {
    setAddModal({ date: item.date, time: item.scheduledTime ?? "", existing: item });
  }

  const TABS = [
    { id: "tasks"  as const, label: "Tasks" },
    { id: "habits" as const, label: "Habits" },
    { id: "goals"  as const, label: "Goals" },
  ];

  const finScore    = data?.financialReadinessScore ?? 0;
  const finColor    = finScore >= 70 ? "#16A34A" : finScore >= 40 ? "#D97706" : "#EF4444";
  const riasecProfile = data?.aptitude?.scores?.riasecProfile ?? data?.aptitude?.primary ?? null;
  const topMatches    = riasecProfile ? matchOccupations(riasecProfile, { limit: 3 }) : [];
  const totalSessions = data
    ? data.speaking.interview.count + data.speaking.networking.count + data.speaking.publicSpeaking.count
    : null;
  const todayScheduled = scheduled.filter(i => i.date === todayStr() && !i.done).length;

  return (
    <PremiumShell hideHeader>
      <div style={{ maxWidth: 1280, margin: "0 auto", paddingBottom: 80 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.4 }}>
              {greeting}, {firstName}.
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          {!loading && signalScore !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: 12, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
              <div style={{ fontSize: 24, fontWeight: 950, color: signalColor, lineHeight: 1 }}>{signalScore}</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Signal Score</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{totalSessions} sessions · {data?.completeness ?? 0}% profile</div>
              </div>
              <Link href="/my-journey" style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textDecoration: "none", marginLeft: 6 }}>Details →</Link>
            </div>
          )}
          {!loading && signalScore === null && (
            <div style={{ padding: "8px 16px", borderRadius: 12, border: "1px dashed var(--card-border)", background: "var(--card-bg)", fontSize: 12, color: "var(--text-muted)" }}>
              Complete sessions to build your Signal Score
            </div>
          )}
        </div>

        <StreakBanner />
        <DailyGamesWidget />

        {/* ── Reassessment nudge ── */}
        {needsReassessment && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 16px", borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", marginTop: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RefreshCw size={18} color="#92400E" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#92400E" }}>Time to retake your Career Assessment</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Interests shift over time — see if your profile has evolved.</div>
              </div>
            </div>
            <Link href="/aptitude" style={{ padding: "7px 16px", borderRadius: 8, background: "#F59E0B", color: "#fff", fontWeight: 900, fontSize: 12, textDecoration: "none", flexShrink: 0 }}>Retake →</Link>
          </div>
        )}

        {/* ── Personalized path ── */}
        {!loading && hasAptitude && riasecProfile && (
          <div style={{ marginTop: 16, padding: "18px 22px", borderRadius: 16, border: "1px solid var(--card-border-soft)", background: "linear-gradient(135deg, var(--card-bg-strong), var(--card-bg))" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 280px" }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5 }}>Your Path</div>
                <div style={{ fontSize: 14, fontWeight: 950, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 6 }}>
                  {industry
                    ? <>You're a <span style={{ color: "var(--accent)" }}>{riasecDescription(riasecProfile)}</span> type in <span style={{ color: "var(--accent)" }}>{industry}</span>.</>
                    : <>You're a <span style={{ color: "var(--accent)" }}>{riasecDescription(riasecProfile)}</span> type — here are your strongest matches.</>
                  }
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: "0 0 auto" }}>
                {topMatches.map(occ => (
                  <Link key={occ.id} href={`/career-guide/career-paths/${occ.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--card-bg)", minWidth: 130 }}>
                      <div style={{ fontSize: 11, fontWeight: 950, color: "var(--text-primary)", marginBottom: 2 }}>{occ.title}</div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{occ.category}</div>
                      <div style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: "#10B981" }}>${occ.salary[0]}K–${occ.salary[1]}K</div>
                    </div>
                  </Link>
                ))}
                <Link href="/career-guide/career-paths" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "9px 12px", borderRadius: 10, border: "1px dashed var(--card-border)", background: "transparent", fontSize: 12, fontWeight: 700, color: "var(--accent)", textDecoration: "none", minWidth: 72 }}>
                  All →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !hasAptitude && !hasAnySessions && (
          <div style={{ marginTop: 16, padding: "28px 24px", borderRadius: 16, border: "1px dashed var(--card-border)", background: "var(--card-bg)", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><BarChart2 size={36} color="var(--text-muted)" /></div>
            <div style={{ fontSize: 16, fontWeight: 950, color: "var(--text-primary)", marginBottom: 6 }}>Start with your Career Assessment</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 440, margin: "0 auto 18px" }}>
              Answer 60 questions to discover your RIASEC profile and get personalized career matches.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/aptitude"  style={{ padding: "10px 22px", borderRadius: 10, background: "var(--accent)", color: "#fff", fontWeight: 900, fontSize: 13, textDecoration: "none" }}>Take Career Assessment →</Link>
              <Link href="/practice"  style={{ padding: "10px 22px", borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontWeight: 900, fontSize: 13, textDecoration: "none" }}>Practice Interview →</Link>
            </div>
          </div>
        )}

        {/* ── Practice quick-links ── */}
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Interview Prep",    sub: "~15 min",  href: "/practice",              color: ACCENT_CAREER,   Icon: Mic },
            { label: "Public Speaking",   sub: "~10 min",  href: "/public-speaking",       color: ACCENT_LEARNING, Icon: Zap },
            { label: "Career Assessment", sub: "~15 min",  href: "/aptitude",              color: ACCENT_MINDSET,  Icon: Target },
            { label: "Career of the Day", sub: "daily",    href: "/games/career-of-the-day", color: ACCENT_PERSONAL, Icon: Gamepad2 },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${item.color}25`, background: item.color + "08", display: "flex", alignItems: "center", gap: 10, transition: "background 120ms" }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: item.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <item.Icon size={17} color={item.color} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)" }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{item.sub}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Compass: Calendar + Tabs ── */}
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>

          {/* Calendar with view toggle */}
          <div>
            {/* View toggle */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12, width: "fit-content" }}>
              {(["day","week","month"] as const).map(v => (
                <button key={v} type="button" onClick={() => setCalView(v)} style={{ padding: "5px 14px", borderRadius: 7, border: "1px solid var(--card-border)", background: calView === v ? "var(--accent)" : "var(--card-bg)", color: calView === v ? "#fff" : "var(--text-muted)", fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "capitalize", transition: "all 120ms" }}>
                  {v}
                </button>
              ))}
              <button type="button" onClick={() => setAddModal({ date: todayStr(), time: "" })} style={{ marginLeft: 8, padding: "5px 14px", borderRadius: 7, border: "none", background: ACCENT_CAREER, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <Plus size={13} /> Add task
              </button>
            </div>

            {calView === "month" && <FullMonthCalendar scheduled={scheduled} onDropTask={handleDropTask} onEditTask={openEditModal} />}
            {calView === "week" && <WeekView scheduled={scheduled} onDropTask={handleDropTask} onAddAtTime={(date, time) => setAddModal({ date, time })} onEditTask={openEditModal} />}
            {calView === "day"  && <DayView  scheduled={scheduled} onDropTask={handleDropTask} onAddAtTime={(date, time) => setAddModal({ date, time })} onEditTask={openEditModal} />}
          </div>

          {/* Right panel: Tasks / Habits / Goals */}
          <div>
            {/* Tab bar */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16, padding: "4px", borderRadius: 10, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1, padding: "7px 10px", borderRadius: 7, border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 800,
                    background: activeTab === tab.id ? "var(--accent)" : "transparent",
                    color: activeTab === tab.id ? "#fff" : "var(--text-muted)",
                    transition: "background 150ms, color 150ms",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "tasks" && (
              <div>
                <PersonalTasksSection scheduled={scheduled} />
                {stageConfig ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.7, color: stageConfig.accent, textTransform: "uppercase" }}>Stage Checklist</div>
                      <Link href={stageConfig.guideHref} style={{ fontSize: 11, fontWeight: 700, color: stageConfig.accent, textDecoration: "none" }}>{stageConfig.guideLabel} →</Link>
                    </div>
                    <ChecklistSection
                      stage={stageConfig.stageKey}
                      items={checklistItems}
                      accentColor={stageConfig.accent}
                      onProgressChange={setProgress}
                    />
                  </div>
                ) : null}
              </div>
            )}

            {activeTab === "habits" && <HabitsTab />}
            {activeTab === "goals"  && <GoalsTab />}
          </div>
        </div>

        {/* ── Three Pillars ── */}
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 14 }}>
            Practice & Explore
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {PILLARS.map(pillar => (
              <div key={pillar.id} style={{ padding: "18px 20px", borderRadius: 14, border: "1px solid var(--card-border)", background: pillar.bg }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <pillar.Icon size={20} color={pillar.color} />
                  <div style={{ fontSize: 13, fontWeight: 950, color: "var(--text-primary)" }}>{pillar.title}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {pillar.actions.map(action => (
                    <Link key={action.href} href={action.href} style={{ textDecoration: "none" }}>
                      <div style={{ padding: "8px 11px", borderRadius: 9, background: "var(--card-bg)", border: "1px solid var(--card-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{action.label}</span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{action.time}</span>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href={pillar.guideHref} style={{ display: "block", marginTop: 10, textAlign: "center", fontSize: 11, fontWeight: 900, color: pillar.color, textDecoration: "none" }}>
                  {pillar.guideLabel} →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* ── NACE mini bars ── */}
        {data && data.naceScores.some(n => n.score !== null) && (
          <div style={{ padding: "16px 20px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase" }}>NACE Career Readiness</div>
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

        {/* ── Next recommended action ── */}
        {data?.nextAction && (
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 20px", borderRadius: 14, background: "rgba(37,99,235,0.05)", border: "1px solid rgba(37,99,235,0.15)", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>Recommended next step</div>
              <div style={{ fontSize: 14, fontWeight: 950, color: "var(--text-primary)" }}>{data.nextAction.label}</div>
            </div>
            <Link href={data.nextAction.href} style={{ padding: "8px 18px", borderRadius: 9, background: "var(--accent)", color: "#fff", fontWeight: 900, fontSize: 13, textDecoration: "none", flexShrink: 0 }}>
              Start →
            </Link>
          </div>
        )}

        {/* ── Quick links ── */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>Quick Access</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { Icon: BarChart2,   label: "My Journey",         href: "/my-journey",               color: "#2563EB" },
              { Icon: CheckSquare, label: "Career Check-In",    href: "/career-checkin",           color: "#10B981" },
              { Icon: FileText,    label: "Resume Analyzer",    href: "/resume-gap",               color: "#F59E0B" },
              { Icon: Home,        label: "Housing Guide",      href: "/career-guide/housing",     color: "#0EA5E9" },
              { Icon: BarChart,    label: "Salary Benchmarks",  href: "/career-guide/benchmarks",  color: "#EC4899" },
              { Icon: BookOpen,    label: "Financial Literacy", href: "/financial-literacy",       color: "#8B5CF6" },
            ].map(item => (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 9, border: "1px solid var(--card-border)", background: "var(--card-bg)", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                  <item.Icon size={13} color={item.color} />
                  {item.label}
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>

      {/* Add / edit task modal */}
      {addModal && (
        <TaskModal
          initialDate={addModal.date}
          initialTime={addModal.time}
          existing={addModal.existing}
          onSave={handleAddTask}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          onClose={() => setAddModal(null)}
        />
      )}

    </PremiumShell>
  );
}
