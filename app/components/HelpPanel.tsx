"use client";

import React, { useState } from "react";
import {
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  User,
  ClipboardList,
  LayoutDashboard,
  CheckSquare,
  Grid,
  Mic,
  Activity,
  Zap,
  Calendar,
  CalendarDays,
  BookOpen,
  Sunrise,
  TrendingUp,
  Gamepad2,
  Layers,
  Monitor,
  Settings,
  Lock,
  Briefcase,
  Library,
  FileText,
  BarChart2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type HelpItem = {
  icon: React.ReactNode;
  title: string;
  body: string;
};

type HelpSection = {
  heading: string;
  items: HelpItem[];
};

// ── University content ────────────────────────────────────────────────────────

const UNIVERSITY_SECTIONS: HelpSection[] = [
  {
    heading: "GETTING STARTED",
    items: [
      {
        icon: <Sparkles size={15} />,
        title: "What is Signal?",
        body: "Signal is your career readiness platform - built to help you land the right job with the right skills. It tracks your interview practice, career clarity, and financial health in one place, then gives you a single score to show how ready you are.",
      },
      {
        icon: <User size={15} />,
        title: "Setting up your profile",
        body: "Head to Settings to choose your career stage (Pre-College, During College, or Post-College). Your stage personalizes your checklist, career guide content, and Signal Score weights so everything you see is relevant to where you actually are.",
      },
      {
        icon: <ClipboardList size={15} />,
        title: "Taking the Career Assessment",
        body: "The Career Assessment uses the RIASEC model to map your personality to career paths. Complete it from the Dashboard or from Career Assessment in the nav. Your results set your career clarity baseline and feed directly into your Signal Score.",
      },
    ],
  },
  {
    heading: "YOUR DASHBOARD",
    items: [
      {
        icon: <LayoutDashboard size={15} />,
        title: "Signal Score - what it means",
        body: "Your Signal Score (0–100) combines Interview Readiness, Financial Health, and Career Clarity. It updates as you practice, complete assessments, and check off tasks. Think of it as your career fitness level - not a grade, but a direction.",
      },
      {
        icon: <CheckSquare size={15} />,
        title: "The checklist - stage-specific tasks",
        body: "The checklist shows the highest-impact actions for your current stage. Items are grouped by priority, and completing them moves your Signal Score. It refreshes as you progress and unlock new milestones.",
      },
      {
        icon: <Grid size={15} />,
        title: "Quick Access tiles",
        body: "The dashboard tiles let you jump straight into Mock Interviews, the Planner, Daily Games, and more. They also surface your streak, recent scores, and upcoming calendar items so nothing slips through the cracks.",
      },
    ],
  },
  {
    heading: "PRACTICE & TOOLS",
    items: [
      {
        icon: <Mic size={15} />,
        title: "Mock Interviews - how scoring works",
        body: "Record or type your answer to a behavioral question. You get a STAR breakdown (Situation / Task / Action / Result), a Communication score, a Confidence score, and a rewritten stronger answer. Scores improve with practice - most people jump 10–15 points by attempt three.",
      },
      {
        icon: <Activity size={15} />,
        title: "Vocal Analysis - what the signals mean",
        body: "After a spoken answer, Signal analyzes your pace (WPM), filler word rate, vocal energy, and monotone risk. Aim for 130–160 WPM, a filler rate under 5%, and a monotone risk below 5/10. These signals show how your delivery lands - not just what you said.",
      },
      {
        icon: <Zap size={15} />,
        title: "Career Assessment - RIASEC explained",
        body: "RIASEC stands for Realistic, Investigative, Artistic, Social, Enterprising, Conventional - six personality types that map to career families. Your top two or three types are used to surface matching career paths, job profiles, and learning priorities in your career guide.",
      },
    ],
  },
  {
    heading: "PLANNING",
    items: [
      {
        icon: <Calendar size={15} />,
        title: "Planner - Today, Habits, Goals tabs",
        body: "The Planner has three layers: Today (tasks due now), Habits (recurring actions like daily practice), and Goals (long-term milestones). Completing daily tasks builds your streak and keeps your Signal Score moving.",
      },
      {
        icon: <CalendarDays size={15} />,
        title: "Scheduling tasks on the calendar",
        body: "Any task in the Planner can be assigned a date. It will appear on the calendar view for that day. Tap any date on the MiniCalendar to see what's scheduled, and drag tasks to reschedule if plans change.",
      },
      {
        icon: <CalendarDays size={15} />,
        title: "MiniCalendar on the dashboard",
        body: "The MiniCalendar widget on the dashboard shows a compact month view with dot indicators on days that have tasks. Click any date to expand that day's agenda without leaving the dashboard.",
      },
    ],
  },
  {
    heading: "CAREER TOOLS",
    items: [
      {
        icon: <BookOpen size={15} />,
        title: "Career Guide & paths",
        body: "The Career Guide organizes financial literacy, job profiles, budget tools, and career paths in one place. Career Paths surface RIASEC-matched occupations with salary ranges, growth outlooks, and skill requirements so you can explore with real data.",
      },
      {
        icon: <Sunrise size={15} />,
        title: "Career of the Day",
        body: "Every day a new career is featured with a short profile - what the job involves, typical salary, required skills, and growth outlook. It's a quick way to stumble onto paths you might not have considered.",
      },
      {
        icon: <TrendingUp size={15} />,
        title: "My Journey - tracking progress",
        body: "My Journey is your personal history log. It shows your practice sessions over time, score trends, streaks, and milestones. Use it to see how far you've come and identify which areas still need work.",
      },
    ],
  },
  {
    heading: "DAILY GAMES",
    items: [
      {
        icon: <Gamepad2 size={15} />,
        title: "Hustle (Wordle) - daily word game",
        body: "Hustle is a career-themed word game in the style of Wordle. One new puzzle per day. It takes about two minutes and keeps your vocabulary sharp. Your streak is tracked on the Games dashboard.",
      },
      {
        icon: <Layers size={15} />,
        title: "Career Connections - group the tiles",
        body: "Career Connections challenges you to find the hidden groupings among 16 career-related tiles. It's inspired by the NYT Connections format. One puzzle per day - harder groups are worth more to your streak.",
      },
      {
        icon: <Sunrise size={15} />,
        title: "Career of the Day",
        body: "Find the Career of the Day in the Daily Games section as well as the Career Guide. It's the same featured career - a bite-sized career exploration that takes under a minute to read.",
      },
    ],
  },
  {
    heading: "WORKSPACE",
    items: [
      {
        icon: <Monitor size={15} />,
        title: "Tracked browser sessions explained",
        body: "Workspace lets you open a monitored browser window for job searching or career research. Sessions are timestamped and logged to My Journey so you can track how much time you're investing in your search - without any content being recorded.",
      },
    ],
  },
  {
    heading: "ACCOUNT & SETTINGS",
    items: [
      {
        icon: <Settings size={15} />,
        title: "Changing your stage",
        body: "Your career stage (Pre-College, During College, Post-College) controls which checklist items, career guide sections, and Signal Score weights apply to you. Change it anytime in Settings - your history is preserved and your checklist will update immediately.",
      },
      {
        icon: <Lock size={15} />,
        title: "Privacy & tracking policy",
        body: "Audio from practice sessions is processed to generate delivery analytics and is accessible only to you. Workspace sessions log timestamps, not content. No interview audio or browser content is shared with third parties or used for advertising.",
      },
    ],
  },
];

// ── Consumer content ──────────────────────────────────────────────────────────

const CONSUMER_SECTIONS: HelpSection[] = [
  {
    heading: "GETTING STARTED",
    items: [
      {
        icon: <Sparkles size={15} />,
        title: "What is Signal?",
        body: "Signal is an AI-powered interview coaching platform. It analyzes how you communicate - your structure, delivery, language patterns, and ownership signals - then gives you specific, actionable feedback to help you interview better and land the role.",
      },
      {
        icon: <Mic size={15} />,
        title: "Your first practice session",
        body: "Head to Interview Prep to record or type your answer to a behavioral question. You'll get an overall score, a STAR breakdown, a communication archetype, and a stronger rewritten version of your answer. Most people see meaningful score improvement by their third attempt.",
      },
    ],
  },
  {
    heading: "INTERVIEW SCORING",
    items: [
      {
        icon: <BarChart2 size={15} />,
        title: "The 7 dimensions explained",
        body: "Every answer is scored across seven dimensions: Narrative Clarity (structure), Evidence Quality (specifics & metrics), Ownership & Agency (I-language), Vocal Engagement (pace & energy), Response Control (focus), Cognitive Depth (complexity of thinking), and Presence & Confidence (assertiveness). Your dimension profile is shown on the results page.",
      },
      {
        icon: <Zap size={15} />,
        title: "Communication archetypes",
        body: "After enough scored answers, Signal assigns you a communication archetype - a pattern that describes how you interview. Examples include The Rusher (fast but thin on results), The Hedger (good content softened by uncertainty language), and The Polished Performer (strong across all dimensions). Archetypes come with specific coaching to break the pattern.",
      },
      {
        icon: <Activity size={15} />,
        title: "Vocal Analysis - what the signals mean",
        body: "Spoken answers also get delivery analysis: pace (WPM), filler word rate, vocal energy variation, and monotone risk. Aim for 130–160 WPM, a filler rate under 5%, and a monotone risk below 5/10. These signals show how your delivery lands - not just what you said.",
      },
    ],
  },
  {
    heading: "YOUR TOOLS",
    items: [
      {
        icon: <FileText size={15} />,
        title: "Resume Analysis",
        body: "Upload your resume to get an ATS compatibility score, an AI gap analysis comparing your experience to a target role, and a prioritized action list. Use it before applying to make sure your resume clears the first filter.",
      },
      {
        icon: <Library size={15} />,
        title: "Experience Log",
        body: "The Experience Log is your personal library of career stories. Add each strong experience you want to be able to reference in interviews - refine the STAR structure, write stronger versions, and practice until the story is fluent under pressure.",
      },
      {
        icon: <Briefcase size={15} />,
        title: "Job Tracker",
        body: "Track every application you submit. The Job Tracker shows your pipeline stage, response rate, and offer funnel so you can stay organized and identify where applications are stalling.",
      },
      {
        icon: <TrendingUp size={15} />,
        title: "My Progress (Insights)",
        body: "The Insights page shows your performance patterns across question types, job profiles, and delivery metrics. As you practice more, it surfaces your top strengths, biggest gaps, dimension trends, and a pre-interview brief you can review before any real interview.",
      },
    ],
  },
  {
    heading: "ACCOUNT & SETTINGS",
    items: [
      {
        icon: <Settings size={15} />,
        title: "Plan & billing",
        body: "Free accounts include 3 scored practice sessions to get started. Pro unlocks unlimited practice, full dimension analytics, archetype tracking, and all delivery signals. Manage your plan from the Settings page.",
      },
      {
        icon: <Lock size={15} />,
        title: "Privacy policy",
        body: "Audio from practice sessions is processed to generate delivery analytics and is accessible only to you. No interview audio is stored long-term, and nothing is shared with third parties or used for advertising.",
      },
    ],
  },
];

// ── Accordion item ─────────────────────────────────────────────────────────

function AccordionItem({ item }: { item: HelpItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--card-border-soft)",
        background: open ? "var(--card-bg)" : "transparent",
        marginBottom: 6,
        overflow: "hidden",
        transition: "background 120ms",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ color: "var(--accent)", flex: "0 0 auto", display: "flex" }}>
          {item.icon}
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 800,
            color: "var(--text-primary)",
            lineHeight: 1.4,
          }}
        >
          {item.title}
        </span>
        <span style={{ color: "var(--text-muted)", flex: "0 0 auto", display: "flex" }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "0 12px 12px 37px",
            fontSize: 13,
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          {item.body}
        </div>
      )}
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────

function SectionHeading({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: 0.8,
        color: "var(--accent)",
        textTransform: "uppercase" as const,
        padding: "16px 0 6px",
      }}
    >
      {label}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  isUniversity?: boolean;
}

export default function HelpPanel({ open, onClose, isUniversity = false }: HelpPanelProps) {
  const sections = isUniversity ? UNIVERSITY_SECTIONS : CONSUMER_SECTIONS;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 290,
          }}
        />
      )}

      {/* Slide-in panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 360,
          height: "100vh",
          background: "var(--card-bg-strong)",
          borderLeft: "1px solid var(--card-border-soft)",
          boxShadow: open ? "-8px 0 40px rgba(0,0,0,0.18)" : "none",
          display: "flex",
          flexDirection: "column",
          zIndex: 300,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 260ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 18px 12px",
            borderBottom: "1px solid var(--card-border-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            background: "var(--card-bg-strong)",
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 0.8,
                color: "var(--accent)",
                textTransform: "uppercase" as const,
              }}
            >
              Help &amp; Guide
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>
              {isUniversity ? "Everything in Signal" : "How Signal works"}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close help panel"
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "0 0 auto",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 18px 32px" }}>
          {sections.map((section) => (
            <div key={section.heading}>
              <SectionHeading label={section.heading} />
              {section.items.map((item) => (
                <AccordionItem key={item.title} item={item} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
