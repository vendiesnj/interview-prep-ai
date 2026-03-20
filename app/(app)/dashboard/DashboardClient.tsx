"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";
import PremiumShell from "../../components/PremiumShell";

// ── Track definitions ─────────────────────────────────────────────────────────

type TrackItem = {
  id: string;
  icon: string;
  label: string;
  desc: string;
  href: string;
  color: string;
  time: string;
  comingSoon?: boolean;
  guideOnly?: boolean; // mark-as-done items (no tool behind them yet)
};

const TRACKS: Record<string, TrackItem[]> = {
  pre_college: [
    { id: "public_speaking_1", icon: "🎤", label: "First Public Speaking Session", desc: "Practice a 60-second intro speech and get AI feedback on your delivery.", href: "/public-speaking", color: "#8B5CF6", time: "~10 min" },
    { id: "interview_prep_1", icon: "🎙️", label: "Practice Interview Questions", desc: "Get comfortable with common questions before college interviews or orientation.", href: "/practice", color: "#2563EB", time: "~15 min" },
    { id: "networking_1", icon: "🤝", label: "Networking Pitch Practice", desc: "Learn to introduce yourself at orientation, fairs, and campus events.", href: "/networking", color: "#0EA5E9", time: "~10 min" },
    { id: "fafsa_guide", icon: "📋", label: "FAFSA & Financial Aid", desc: "Understanding your award letter, deadlines, and what to do next.", href: "/career-guide/finances", color: "#F59E0B", time: "5 min read", guideOnly: true },
    { id: "credit_guide", icon: "💳", label: "Building Credit Early", desc: "Why starting now matters and how to do it safely as a student.", href: "/career-guide/finances", color: "#F59E0B", time: "5 min read", guideOnly: true },
    { id: "college_ready", icon: "🎓", label: "College Ready Assessment", desc: "A guided checklist to prepare for your first semester.", href: "/college-ready", color: "#10B981", time: "~20 min", comingSoon: true },
  ],
  during_college: [
    { id: "interview_prep_1", icon: "🎙️", label: "Interview Prep Session", desc: "Practice behavioral questions for internship and job interviews.", href: "/practice", color: "#2563EB", time: "~15 min" },
    { id: "networking_1", icon: "🤝", label: "Networking Pitch Practice", desc: "Career fair cold approaches, coffee chats, and LinkedIn outreach.", href: "/networking", color: "#0EA5E9", time: "~10 min" },
    { id: "public_speaking_1", icon: "🎤", label: "Public Speaking Session", desc: "Class presentations, club pitches, and panel prep.", href: "/public-speaking", color: "#8B5CF6", time: "~10 min" },
    { id: "career_checkin", icon: "✅", label: "Career Check-In", desc: "Log your current role, salary goals, and financial snapshot.", href: "/career-checkin", color: "#10B981", time: "~5 min" },
    { id: "taxes_guide", icon: "🧾", label: "Filing Taxes for the First Time", desc: "W-2s, 1098-Ts, and free filing options for students.", href: "/career-guide/finances", color: "#F59E0B", time: "7 min read", guideOnly: true },
    { id: "internship_guide", icon: "💼", label: "Making the Most of an Internship", desc: "How to network, deliver, and convert to a return offer.", href: "/career-guide/first-year", color: "#F59E0B", time: "5 min read", guideOnly: true },
  ],
  post_college: [
    { id: "career_checkin", icon: "✅", label: "Career Check-In", desc: "Log your current role, salary, savings, and loan balance.", href: "/career-checkin", color: "#10B981", time: "~5 min" },
    { id: "retirement_proj", icon: "📈", label: "Retirement Projection", desc: "See when you could retire based on your current trajectory.", href: "/career-guide/retirement", color: "#8B5CF6", time: "~3 min" },
    { id: "interview_prep_1", icon: "🎙️", label: "Interview Prep Session", desc: "Practice for your next role or promotion conversation.", href: "/practice", color: "#2563EB", time: "~15 min" },
    { id: "networking_1", icon: "🤝", label: "Networking Pitch Practice", desc: "Industry events, LinkedIn outreach, and informational interviews.", href: "/networking", color: "#0EA5E9", time: "~10 min" },
    { id: "401k_guide", icon: "🏦", label: "401k & Benefits Enrollment", desc: "Contribution rates, employer match, and fund selection basics.", href: "/career-guide/retirement", color: "#F59E0B", time: "6 min read", guideOnly: true },
    { id: "paycheck_guide", icon: "💰", label: "Understanding Your Paycheck", desc: "Gross vs net, withholdings, and how to adjust your W-4.", href: "/career-guide/finances", color: "#F59E0B", time: "5 min read", guideOnly: true },
  ],
};

// ── Track item component ───────────────────────────────────────────────────────

function TrackStep({
  item,
  index,
  done,
  isLast,
  onMarkDone,
  interviewDone,
}: {
  item: TrackItem;
  done: boolean;
  isLast: boolean;
  onMarkDone: (id: string) => void;
  interviewDone: boolean;
}) {
  const isDone = done || (item.id === "interview_prep_1" && interviewDone);

  return (
    <div style={{ display: "flex", gap: 16, position: "relative" }}>
      {/* Connector line */}
      {!isLast && (
        <div style={{
          position: "absolute", left: 19, top: 44, width: 2, bottom: -24,
          background: isDone ? item.color + "60" : "var(--card-border-soft)",
        }} />
      )}

      {/* Step indicator */}
      <div style={{ flexShrink: 0, marginTop: 4 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: isDone ? item.color + "20" : item.comingSoon ? "var(--card-bg)" : "var(--card-bg-strong)",
          border: `2px solid ${isDone ? item.color : item.comingSoon ? "var(--card-border-soft)" : "var(--card-border)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: isDone ? 16 : 18,
        }}>
          {isDone ? "✓" : item.icon}
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, paddingBottom: isLast ? 0 : 24,
        padding: "14px 18px", borderRadius: 16,
        border: `1px solid ${isDone ? item.color + "40" : "var(--card-border)"}`,
        background: isDone ? item.color + "08" : "var(--card-bg)",
        marginBottom: isLast ? 0 : 8,
        opacity: item.comingSoon ? 0.5 : 1,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 950, color: isDone ? item.color : "var(--text-primary)" }}>
                {item.label}
              </span>
              {isDone && (
                <span style={{ fontSize: 11, fontWeight: 900, color: item.color, background: item.color + "18", padding: "2px 8px", borderRadius: 99 }}>
                  Done
                </span>
              )}
              {item.comingSoon && (
                <span style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", background: "var(--card-border-soft)", padding: "2px 8px", borderRadius: 99 }}>
                  Coming soon
                </span>
              )}
              {item.guideOnly && !isDone && (
                <span style={{ fontSize: 11, fontWeight: 800, color: "#F59E0B", background: "rgba(245,158,11,0.12)", padding: "2px 8px", borderRadius: 99 }}>
                  Guide
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{item.desc}</p>
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-muted)", fontWeight: 800 }}>{item.time}</div>
          </div>

          {!item.comingSoon && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
              <Link
                href={item.href}
                style={{
                  padding: "8px 16px", borderRadius: 10,
                  background: isDone ? "transparent" : item.color,
                  border: isDone ? `1px solid ${item.color}` : "none",
                  color: isDone ? item.color : "#fff",
                  fontWeight: 900, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap",
                }}
              >
                {isDone ? "Do again →" : item.guideOnly ? "Read →" : "Start →"}
              </Link>
              {item.guideOnly && !isDone && (
                <button
                  onClick={() => onMarkDone(item.id)}
                  style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                >
                  Mark as done
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Attempt = { id?: string; score?: number | null; };

function safeJSONParse<T>(raw: string | null, fallback: T): T {
  try { if (!raw) return fallback; return JSON.parse(raw) as T; } catch { return fallback; }
}

export default function DashboardPage() {
  const [history, setHistory] = useState<Attempt[]>([]);
  const [doneItems, setDoneItems] = useState<Set<string>>(new Set());
  const [stageSaving, setStageSaving] = useState(false);
  const { data: session, status, update } = useSession();

  const HISTORY_KEY = userScopedKey("ipc_history", session);
  const DONE_KEY = userScopedKey("signal_track_done", session);
  const firstName = (session?.user?.name ?? "").split(" ")[0] || "there";
  const persona: string = (session?.user as any)?.demoPersona ?? "during_college";
  const track = TRACKS[persona] ?? TRACKS.during_college;
  const doneCount = track.filter((item) => doneItems.has(item.id) || (item.id === "interview_prep_1" && history.length > 0)).length;

  // Load history + done state
  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;

    (async () => {
      // Load interview history
      try {
        if (session?.user) {
          const res = await fetch("/api/attempts?limit=1", { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) setHistory(Array.isArray(data?.attempts) ? data.attempts : []);
          }
        } else {
          const saved = safeJSONParse<Attempt[]>(localStorage.getItem(HISTORY_KEY), []);
          if (!cancelled) setHistory(Array.isArray(saved) ? saved : []);
        }
      } catch {
        const saved = safeJSONParse<Attempt[]>(localStorage.getItem(HISTORY_KEY), []);
        if (!cancelled) setHistory(Array.isArray(saved) ? saved : []);
      }

      // Load done items from localStorage
      const saved = safeJSONParse<string[]>(localStorage.getItem(DONE_KEY), []);
      if (!cancelled) setDoneItems(new Set(Array.isArray(saved) ? saved : []));
    })();

    return () => { cancelled = true; };
  }, [status, session?.user, HISTORY_KEY, DONE_KEY]);

  function markDone(id: string) {
    setDoneItems((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(DONE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  async function switchStage(newPersona: string) {
    if (newPersona === persona || stageSaving) return;
    setStageSaving(true);
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demoPersona: newPersona }),
    });
    await update();
    setStageSaving(false);
  }

  const STAGES = [
    { id: "pre_college", label: "Pre-College", icon: "🎓", color: "#10B981" },
    { id: "during_college", label: "During College", icon: "📚", color: "#2563EB" },
    { id: "post_college", label: "Post-College", icon: "🚀", color: "#8B5CF6" },
  ] as const;

  return (
    <PremiumShell title="Signal" subtitle="Your communication & career platform">
      <div style={{ maxWidth: 720, paddingBottom: 48 }}>

        {/* ── Stage switcher ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          {STAGES.map((s) => {
            const active = persona === s.id;
            return (
              <button
                key={s.id}
                onClick={() => switchStage(s.id)}
                disabled={stageSaving}
                style={{
                  padding: "8px 16px", borderRadius: 99,
                  border: `1px solid ${active ? s.color : "var(--card-border)"}`,
                  background: active ? s.color + "18" : "var(--card-bg)",
                  color: active ? s.color : "var(--text-muted)",
                  fontWeight: active ? 950 : 800, fontSize: 13,
                  cursor: stageSaving ? "wait" : "pointer", transition: "all 150ms",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <span>{s.icon}</span>{s.label}
              </button>
            );
          })}
        </div>

        {/* ── Greeting + progress ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.5 }}>
            Good morning, {firstName} 👋
          </h1>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-muted)" }}>
            {persona === "pre_college"
              ? "Let's get you ready for college and beyond."
              : persona === "post_college"
              ? "Keep growing — your career and finances, all in one place."
              : "Your platform for interviews, speaking, and career growth."}
          </p>

          {/* Progress bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99, transition: "width 0.5s ease",
                width: `${Math.round((doneCount / track.length) * 100)}%`,
                background: "linear-gradient(90deg, #2563EB, #0EA5E9)",
              }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              {doneCount} / {track.length} done
            </div>
          </div>
        </div>

        {/* ── Track ── */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {track.map((item, i) => (
            <TrackStep
              key={item.id}
              item={item}
              done={doneItems.has(item.id)}
              isLast={i === track.length - 1}
              onMarkDone={markDone}
              interviewDone={history.length > 0}
            />
          ))}
        </div>

      </div>
    </PremiumShell>
  );
}
