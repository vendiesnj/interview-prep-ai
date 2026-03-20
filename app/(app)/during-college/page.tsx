"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";
import PremiumShell from "@/app/components/PremiumShell";

const TODOS = [
  { id: "interview_prep",  icon: "🎙️", label: "Interview Prep Session",    desc: "Practice behavioral and situational questions for internships and full-time roles.", href: "/practice",       color: "#2563EB", time: "~15 min" },
  { id: "networking",      icon: "🤝", label: "Networking Pitch Practice",  desc: "Career fair cold approaches, LinkedIn outreach, and alumni coffee chats.",             href: "/networking",     color: "#0EA5E9", time: "~10 min" },
  { id: "public_speaking", icon: "🎤", label: "Public Speaking Session",    desc: "Class presentations, club pitches, and leadership panel prep.",                        href: "/public-speaking", color: "#8B5CF6", time: "~10 min" },
  { id: "career_checkin",  icon: "✅", label: "Career Check-In",            desc: "Log your GPA, internship status, salary goals, and financial snapshot.",               href: "/career-checkin",  color: "#10B981", time: "~5 min" },
  { id: "aptitude",        icon: "🧭", label: "Job Fit & Aptitude Quiz",    desc: "Answer questions about your strengths and interests to surface career directions.",     href: "#",               color: "#F59E0B", time: "~8 min", comingSoon: true },
];

const CHECKLIST = [
  { id: "resume",           label: "Build your first resume",                       desc: "One page, action verbs, quantified results. Less is more." },
  { id: "linkedin",         label: "Set up or update LinkedIn",                     desc: "Add your education, a headshot, and 2-3 skills. Recruiters search for students." },
  { id: "internship_apps",  label: "Apply to at least 3 internships",              desc: "Start early — many internship apps open 6-9 months in advance." },
  { id: "taxes_filed",      label: "File your taxes (every April)",                desc: "If you worked or have a scholarship, you likely need to file. Free options exist." },
  { id: "fafsa_renewed",    label: "Renew FAFSA each year",                        desc: "Aid doesn't auto-renew. File October 1 each year you're enrolled." },
  { id: "advisor_semester", label: "Meet with advisor each semester",              desc: "Stay on track for graduation requirements and catch issues early." },
  { id: "career_fair",      label: "Attend at least one career fair",              desc: "Bring resumes, dress professionally, and practice your pitch beforehand." },
  { id: "rec_letter",       label: "Ask a professor for a recommendation letter",  desc: "Build the relationship early — don't ask the week before a deadline." },
  { id: "gpa_check",        label: "Check internship/grad school GPA requirements", desc: "Many programs have minimums. Know where you stand each semester." },
  { id: "emergency_fund",   label: "Start a $500 emergency fund",                 desc: "Before extra spending — this prevents going into debt for unexpected costs." },
];

const RESOURCES = [
  { icon: "💼", label: "Landing Your First Internship",        href: "/career-guide/first-year",   tag: "Career" },
  { icon: "🧾", label: "Filing Taxes for the First Time",      href: "/career-guide/finances",     tag: "Finance" },
  { icon: "📊", label: "Peer Salary & Career Benchmarks",      href: "/career-guide/benchmarks",   tag: "Career" },
  { icon: "🗺️", label: "Exploring Career Paths & Specialties", href: "/career-guide/career-paths", tag: "Career" },
  { icon: "💳", label: "Student Credit & Building History",    href: "/career-guide/finances",     tag: "Finance" },
  { icon: "🏠", label: "Off-Campus Housing Guide",             href: "/career-guide/housing",      tag: "Life" },
];

const TAG_COLORS: Record<string, string> = { Finance: "#10B981", Career: "#2563EB", Life: "#8B5CF6" };

function safeJSONParse<T>(raw: string | null, fallback: T): T {
  try { if (!raw) return fallback; return JSON.parse(raw) as T; } catch { return fallback; }
}

export default function DuringCollegePage() {
  const { data: session, status } = useSession();
  const DONE_KEY = userScopedKey("signal_during_done", session);
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
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 99, background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.3)", marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>📚</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: "#2563EB", letterSpacing: 0.5 }}>DURING COLLEGE</span>
          </div>
          <h1 style={{ margin: "0 0 10px", fontSize: 32, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.7, lineHeight: 1.2 }}>
            Build skills that land opportunities.
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 600 }}>
            College is the time to practice, explore, and build the foundation your career sits on. Use these tools and guides to stay ahead — not just in class, but in the real world.
          </p>
        </div>

        {/* To-Do's */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#2563EB", textTransform: "uppercase", marginBottom: 16 }}>Practice & Tools</div>
          <div style={{ display: "grid", gap: 12 }}>
            {TODOS.map((todo) => (
              <div key={todo.id} style={{ padding: "18px 20px", borderRadius: 16, border: `1px solid ${todo.comingSoon ? "var(--card-border-soft)" : "var(--card-border)"}`, background: "var(--card-bg)", display: "flex", gap: 16, alignItems: "center", opacity: todo.comingSoon ? 0.55 : 1 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: todo.color + "18", border: `1px solid ${todo.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{todo.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 950, color: "var(--text-primary)" }}>{todo.label}</span>
                    {todo.comingSoon && <span style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", background: "var(--card-border-soft)", padding: "2px 8px", borderRadius: 99 }}>Coming soon</span>}
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{todo.time}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>{todo.desc}</p>
                </div>
                {!todo.comingSoon && (
                  <Link href={todo.href} style={{ flexShrink: 0, padding: "9px 18px", borderRadius: 10, background: todo.color, color: "#fff", fontWeight: 900, fontSize: 13, textDecoration: "none" }}>Start →</Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Checklist */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#2563EB", textTransform: "uppercase" }}>Your Checklist</div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)" }}>{checklistDone} / {CHECKLIST.length}</div>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden", marginBottom: 18 }}>
            <div style={{ height: "100%", width: `${Math.round((checklistDone / CHECKLIST.length) * 100)}%`, background: "linear-gradient(90deg, #2563EB, #0EA5E9)", borderRadius: 99, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {CHECKLIST.map((item) => {
              const checked = done.has(item.id);
              return (
                <div key={item.id} onClick={() => toggle(item.id)} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", borderRadius: 14, border: `1px solid ${checked ? "rgba(37,99,235,0.35)" : "var(--card-border)"}`, background: checked ? "rgba(37,99,235,0.06)" : "var(--card-bg)", cursor: "pointer", transition: "all 150ms" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? "#2563EB" : "var(--card-border)"}`, background: checked ? "#2563EB" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontSize: 13, color: "#fff", transition: "all 150ms" }}>{checked ? "✓" : ""}</div>
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
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#2563EB", textTransform: "uppercase", marginBottom: 16 }}>Guides & Resources</div>
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
