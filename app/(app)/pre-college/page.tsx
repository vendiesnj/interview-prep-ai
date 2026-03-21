"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";
import PremiumShell from "@/app/components/PremiumShell";

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
  { id: "fafsa_done",        label: "Complete FAFSA or renewal",                   desc: "Priority #1 - opens October 1 each year. Earlier = more aid." },
  { id: "aid_letter",        label: "Review your financial aid award letter",       desc: "Understand grants (free money) vs. loans (money you repay)." },
  { id: "orientation",       label: "Sign up for orientation",                     desc: "Many schools require registration - don't miss the deadline." },
  { id: "housing",           label: "Submit housing application",                  desc: "On-campus deadlines are often earlier than you think." },
  { id: "email_setup",       label: "Set up your student email",                   desc: "Your .edu email unlocks free software, discounts, and campus resources." },
  { id: "budget_first",      label: "Build your first college budget",             desc: "Map out tuition, housing, food, and spending money per semester." },
  { id: "credit_card",       label: "Consider a student credit card",              desc: "Starting credit at 18-19 sets you up for apartments and loans later." },
  { id: "advisor_meeting",   label: "Book a meeting with your academic advisor",   desc: "Do this in week 1 - they help you pick courses and plan your degree." },
  { id: "campus_resources",  label: "Find tutoring, mental health & career center",desc: "Know where they are before you need them." },
  { id: "linkedin_setup",    label: "Create or update your LinkedIn profile",      desc: "Internship recruiters will look you up before sophomore year." },
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

function safeJSONParse<T>(raw: string | null, fallback: T): T {
  try { if (!raw) return fallback; return JSON.parse(raw) as T; } catch { return fallback; }
}

const TAG_COLORS: Record<string, string> = {
  Finance: "#10B981",
  Career: "#2563EB",
  Life: "#8B5CF6",
};

export default function PreCollegePage() {
  const { data: session, status } = useSession();
  const DONE_KEY = userScopedKey("signal_pre_done", session);
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
            Whether you're heading to college in a few months or just starting to think about it - this is your launchpad. Complete the to-do's, work through the checklist, and use the guides when you need them.
          </p>
        </div>

        {/* ── To-Do's ── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#10B981", textTransform: "uppercase", marginBottom: 16 }}>Practice & Tools</div>
          <div style={{ display: "grid", gap: 12 }}>
            {TODOS.map((todo) => (
              <div key={todo.id} style={{ padding: "18px 20px", borderRadius: 16, border: `1px solid ${todo.comingSoon ? "var(--card-border-soft)" : "var(--card-border)"}`, background: "var(--card-bg)", display: "flex", gap: 16, alignItems: "center", opacity: todo.comingSoon ? 0.55 : 1 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: todo.color + "18", border: `1px solid ${todo.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                  {todo.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 950, color: "var(--text-primary)" }}>{todo.label}</span>
                    {todo.comingSoon && <span style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", background: "var(--card-border-soft)", padding: "2px 8px", borderRadius: 99 }}>Coming soon</span>}
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{todo.time}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>{todo.desc}</p>
                </div>
                {!todo.comingSoon && (
                  <Link href={todo.href} style={{ flexShrink: 0, padding: "9px 18px", borderRadius: 10, background: todo.color, color: "#fff", fontWeight: 900, fontSize: 13, textDecoration: "none" }}>
                    Start →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Checklist ── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#10B981", textTransform: "uppercase" }}>Your Checklist</div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)" }}>{checklistDone} / {CHECKLIST.length}</div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 5, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden", marginBottom: 18 }}>
            <div style={{ height: "100%", width: `${Math.round((checklistDone / CHECKLIST.length) * 100)}%`, background: "linear-gradient(90deg, #10B981, #0EA5E9)", borderRadius: 99, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {CHECKLIST.map((item) => {
              const checked = done.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", borderRadius: 14, border: `1px solid ${checked ? "rgba(16,185,129,0.35)" : "var(--card-border)"}`, background: checked ? "rgba(16,185,129,0.06)" : "var(--card-bg)", cursor: "pointer", transition: "all 150ms" }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? "#10B981" : "var(--card-border)"}`, background: checked ? "#10B981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontSize: 13, color: "#fff", transition: "all 150ms" }}>
                    {checked ? "✓" : ""}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: checked ? "var(--text-muted)" : "var(--text-primary)", textDecoration: checked ? "line-through" : "none" }}>{item.label}</div>
                    {!checked && <div style={{ marginTop: 3, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{item.desc}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Resources ── */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#10B981", textTransform: "uppercase", marginBottom: 16 }}>Guides & Resources</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
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
    </PremiumShell>
  );
}
