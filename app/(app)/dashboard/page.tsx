"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Mic, DollarSign, Shield, GraduationCap, BookOpen, Rocket, Calendar, BarChart2, CheckSquare, FileText, Home, BarChart, Zap, RefreshCw } from "lucide-react";
import PremiumShell from "@/app/components/PremiumShell";
import StreakBanner from "@/app/components/StreakBanner";
import ChecklistSection, { type ChecklistProgressEntry } from "@/app/components/ChecklistSection";
import MiniCalendar, { type ScheduledItem } from "@/app/components/MiniCalendar";
import { matchOccupations } from "@/app/lib/onet-occupations";

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

// ── Stage config map ───────────────────────────────────────────────────────────

const STAGE_MAP: Record<string, {
  accent: string;
  stageKey: string;
  guideHref: string;
  guideLabel: string;
  checklist: typeof PRE_COLLEGE_CHECKLIST;
}> = {
  pre_college: {
    accent: "#10B981",
    stageKey: "pre_college",
    guideHref: "/pre-college",
    guideLabel: "Pre-College Guide",
    checklist: PRE_COLLEGE_CHECKLIST,
  },
  during_college: {
    accent: "#2563EB",
    stageKey: "during_college",
    guideHref: "/during-college",
    guideLabel: "During-College Guide",
    checklist: DURING_COLLEGE_CHECKLIST,
  },
  post_college: {
    accent: "#8B5CF6",
    stageKey: "post_college",
    guideHref: "/post-college",
    guideLabel: "Post-College Guide",
    checklist: POST_COLLEGE_CHECKLIST,
  },
};

// ── RIASEC labels ─────────────────────────────────────────────────────────────

const RIASEC_LABELS: Record<string, string> = {
  R: "Realistic", I: "Investigative", A: "Artistic",
  S: "Social", E: "Enterprising", C: "Conventional",
};

function riasecDescription(code: string): string {
  const labels = code.split("").map(c => RIASEC_LABELS[c] ?? c);
  return labels.join("-");
}

// ── Three pillars ─────────────────────────────────────────────────────────────

const PILLARS = [
  {
    id: "career", Icon: Mic, title: "Career Readiness", color: "#2563EB", bg: "rgba(37,99,235,0.07)",
    actions: [
      { label: "Interview Prep", href: "/practice", time: "~15 min" },
      { label: "Networking Pitch", href: "/networking", time: "~10 min" },
      { label: "Public Speaking", href: "/public-speaking", time: "~10 min" },
    ],
    guideHref: "/career-guide", guideLabel: "Career Guide",
  },
  {
    id: "financial", Icon: DollarSign, title: "Financial Literacy", color: "#10B981", bg: "rgba(16,185,129,0.07)",
    actions: [
      { label: "Budget Builder", href: "/career-guide/budget", time: "~5 min" },
      { label: "Retirement Projection", href: "/career-guide/retirement", time: "~3 min" },
      { label: "Financial Literacy", href: "/financial-literacy", time: "~10 min" },
    ],
    guideHref: "/career-guide", guideLabel: "Financial Guide",
  },
  {
    id: "futureproof", Icon: Shield, title: "AI Resilience", color: "#EF4444", bg: "rgba(239,68,68,0.07)",
    actions: [
      { label: "Future-Proof Guide", href: "/future-proof", time: "~10 min" },
      { label: "Career Assessment", href: "/aptitude", time: "~15 min" },
      { label: "Career Paths", href: "/career-guide/career-paths", time: "~5 min" },
    ],
    guideHref: "/future-proof", guideLabel: "AI Guide",
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface SignalData {
  signalScore: number | null;
  naceScores: Array<{ key: string; shortLabel: string; score: number | null }>;
  profile: { name?: string; graduationYear?: string; stage?: string; targetIndustry?: string };
  speaking: { interview: { count: number; avgScore: number | null }; networking: { count: number }; publicSpeaking: { count: number } };
  completeness: number;
  nextAction: { label: string; href: string; reason: string } | null;
  aptitude: {
    primary: string;
    secondary?: string;
    scores?: { riasecProfile?: string; [key: string]: unknown };
    completedAt?: string;
  } | null;
  careerCheckIn: { salaryRange?: string; industry?: string } | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ChecklistProgressEntry[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    fetch("/api/student-profile")
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stage = (session as any)?.user?.demoPersona as string | undefined;
  const stageConfig = stage ? STAGE_MAP[stage] : null;

  const firstName = data?.profile?.name?.split(" ")[0] || "there";
  const totalSessions = data
    ? data.speaking.interview.count + data.speaking.networking.count + data.speaking.publicSpeaking.count
    : null;

  const signalScore = data?.signalScore ?? null;
  const signalColor = signalScore === null ? "var(--text-muted)"
    : signalScore >= 60 ? "#10B981"
    : signalScore >= 35 ? "#F59E0B"
    : "#EF4444";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Aptitude + personalization
  const riasecProfile = data?.aptitude?.scores?.riasecProfile ?? data?.aptitude?.primary ?? null;
  const industry = data?.careerCheckIn?.industry ?? data?.profile?.targetIndustry ?? null;
  const topMatches = riasecProfile ? matchOccupations(riasecProfile, { limit: 3 }) : [];

  // Annual reassessment nudge
  const needsReassessment = (() => {
    if (!data?.aptitude?.completedAt) return false;
    const months = (Date.now() - new Date(data.aptitude.completedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return months >= 11;
  })();

  const hasAptitude = !!data?.aptitude;
  const hasAnySessions = totalSessions !== null && totalSessions > 0;

  // Checklist + Calendar wiring
  const checklistItems = stageConfig?.checklist ?? [];
  const scheduledItems: ScheduledItem[] = checklistItems.map(item => {
    const entry = progress.find(p => p.itemId === item.id);
    return {
      itemId: item.id,
      label: item.label,
      stage: stageConfig?.stageKey ?? "pre_college",
      done: entry?.done ?? false,
      scheduledDate: entry?.scheduledDate ?? null,
    };
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

        {/* ── Header row ── */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.4 }}>
              {greeting}, {firstName}.
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>

          {/* Compact Signal Score */}
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

        {/* ── Annual reassessment nudge ── */}
        {needsReassessment && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            padding: "10px 16px", borderRadius: 12,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
            marginTop: 16, marginBottom: 0, flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RefreshCw size={18} color="#92400E" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#92400E" }}>Time to retake your Career Assessment</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Interests shift over time — see if your profile has evolved and get updated career matches.</div>
              </div>
            </div>
            <Link href="/aptitude" style={{ padding: "7px 16px", borderRadius: 8, background: "#F59E0B", color: "#fff", fontWeight: 900, fontSize: 12, textDecoration: "none", flexShrink: 0 }}>
              Retake Assessment →
            </Link>
          </div>
        )}

        {/* ── Personalized path ── */}
        {!loading && hasAptitude && riasecProfile && (
          <div style={{
            marginTop: 16,
            padding: "18px 22px",
            borderRadius: 16,
            border: "1px solid var(--card-border-soft)",
            background: "linear-gradient(135deg, var(--card-bg-strong), var(--card-bg))",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 300px" }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5 }}>
                  Your Path
                </div>
                <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 6 }}>
                  {industry
                    ? <>Because you're a <span style={{ color: "var(--accent)" }}>{riasecDescription(riasecProfile)}</span> type interested in <span style={{ color: "var(--accent)" }}>{industry}</span>, here's your direction.</>
                    : <>Because you're a <span style={{ color: "var(--accent)" }}>{riasecDescription(riasecProfile)}</span> type, here are your strongest career matches.</>
                  }
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Profile: <strong>{riasecProfile}</strong> · Top type: {RIASEC_LABELS[riasecProfile[0]] ?? riasecProfile[0]}
                  {data?.aptitude?.scores?.riasecProfile && (
                    <> · <Link href="/aptitude" style={{ color: "var(--accent)", textDecoration: "none" }}>Retake to update</Link></>
                  )}
                </div>
              </div>

              {/* Top 3 career matches */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flex: "0 0 auto" }}>
                {topMatches.map(occ => (
                  <Link key={occ.id} href={`/career-guide/career-paths/${occ.id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      padding: "10px 14px", borderRadius: 12, border: "1px solid var(--card-border)",
                      background: "var(--card-bg)", minWidth: 140,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 950, color: "var(--text-primary)", marginBottom: 2 }}>{occ.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{occ.category}</div>
                      <div style={{ marginTop: 5, fontSize: 10, fontWeight: 700, color: "#10B981" }}>${occ.salary[0]}K–${occ.salary[1]}K</div>
                    </div>
                  </Link>
                ))}
                <Link href="/career-guide/career-paths" style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "10px 14px", borderRadius: 12, border: "1px dashed var(--card-border)",
                  background: "transparent", fontSize: 12, fontWeight: 700, color: "var(--accent)", textDecoration: "none", minWidth: 80,
                }}>
                  View all →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Empty state: no aptitude, no sessions ── */}
        {!loading && !hasAptitude && !hasAnySessions && (
          <div style={{
            marginTop: 16,
            padding: "28px 24px",
            borderRadius: 16,
            border: "1px dashed var(--card-border)",
            background: "var(--card-bg)",
            textAlign: "center",
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <BarChart2 size={36} color="var(--text-muted)" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 950, color: "var(--text-primary)", marginBottom: 6 }}>Start with your Career Assessment</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 440, margin: "0 auto 18px" }}>
              Answer 60 questions to discover your RIASEC profile and get personalized career matches, side hustle ideas, and your path forward.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/aptitude" style={{ padding: "10px 22px", borderRadius: 10, background: "var(--accent)", color: "#fff", fontWeight: 900, fontSize: 13, textDecoration: "none" }}>
                Take Career Assessment →
              </Link>
              <Link href="/practice" style={{ padding: "10px 22px", borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontWeight: 900, fontSize: 13, textDecoration: "none" }}>
                Practice Interview →
              </Link>
            </div>
          </div>
        )}

        {/* ── Main two-column: checklist + calendar ── */}
        {stageConfig ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start", marginTop: 24 }}>

            {/* Left: checklist */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: stageConfig.accent, textTransform: "uppercase" }}>
                  Your Stage Checklist
                </div>
                <Link href={stageConfig.guideHref} style={{ fontSize: 12, fontWeight: 700, color: stageConfig.accent, textDecoration: "none" }}>
                  {stageConfig.guideLabel} →
                </Link>
              </div>
              <ChecklistSection
                stage={stageConfig.stageKey}
                items={checklistItems}
                accentColor={stageConfig.accent}
                onProgressChange={setProgress}
              />
            </div>

            {/* Right: calendar */}
            <MiniCalendar
              items={scheduledItems}
              accentColor={stageConfig.accent}
              stage={stageConfig.stageKey}
              onSchedule={handleSchedule}
            />
          </div>
        ) : (
          /* No stage configured — show quick access to stage guides */
          !loading && (
            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                { label: "Starting Your Journey", sub: "Pre-College",    href: "/pre-college",    Icon: GraduationCap, color: "#10B981" },
                { label: "Building Your Future",  sub: "During College", href: "/during-college", Icon: BookOpen,      color: "#2563EB" },
                { label: "Developing Your Career",sub: "Post-College",   href: "/post-college",   Icon: Rocket,        color: "#8B5CF6" },
              ].map(s => (
                <Link key={s.href} href={s.href} style={{ textDecoration: "none" }}>
                  <div style={{ padding: "18px 20px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <s.Icon size={20} color={s.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 950, color: "var(--text-primary)" }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>{s.sub}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

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
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.5, textTransform: "uppercase" }}>
                NACE Career Readiness
              </div>
              <Link href="/my-journey?tab=nace" style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
                Full breakdown →
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "7px 18px" }}>
              {data.naceScores.filter(n => n.key !== "equity_inclusion" && n.score !== null).map(ns => (
                <div key={ns.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{ns.shortLabel}</span>
                    <span style={{ fontSize: 10, fontWeight: 900, color: ns.score! >= 50 ? "#10B981" : "var(--text-muted)" }}>{ns.score}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${ns.score}%`, borderRadius: 99, background: ns.score! >= 50 ? "#10B981" : "#F59E0B", transition: "width 0.6s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Next recommended action ── */}
        {data?.nextAction && (
          <div style={{
            marginTop: 16,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
            padding: "14px 20px", borderRadius: 14,
            background: "rgba(37,99,235,0.05)", border: "1px solid rgba(37,99,235,0.15)",
            flexWrap: "wrap",
          }}>
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
              { Icon: Calendar,    label: "Planner",           href: "/planner",                  color: "#8B5CF6" },
              { Icon: BarChart2,   label: "My Journey",         href: "/my-journey",               color: "#2563EB" },
              { Icon: CheckSquare, label: "Career Check-In",    href: "/career-checkin",           color: "#10B981" },
              { Icon: FileText,    label: "Resume Analyzer",    href: "/resume-gap",               color: "#F59E0B" },
              { Icon: Home,        label: "Housing Guide",      href: "/career-guide/housing",     color: "#0EA5E9" },
              { Icon: BarChart,    label: "Salary Benchmarks",  href: "/career-guide/benchmarks",  color: "#EC4899" },
              { Icon: Zap,         label: "Career Instincts",   href: "/career-instincts",         color: "#EF4444" },
            ].map(tool => (
              <Link key={tool.href} href={tool.href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 14px", borderRadius: 10,
                  border: "1px solid var(--card-border)", background: "var(--card-bg)",
                }}>
                  <tool.Icon size={14} color={tool.color} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)" }}>{tool.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </PremiumShell>
  );
}

