"use client";

import React from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "ipc_help_panel_v1";

type Tab = "start" | "tips" | "results" | "faq";

const TABS: { id: Tab; label: string }[] = [
  { id: "start", label: "Getting Started" },
  { id: "tips", label: "Practice Tips" },
  { id: "results", label: "Reading Results" },
  { id: "faq", label: "FAQ" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 0.7,
          color: "var(--accent)",
          textTransform: "uppercase" as const,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "var(--accent-soft)",
          border: "1px solid var(--accent-strong)",
          color: "var(--accent)",
          fontSize: 11,
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
          marginTop: 1,
        }}
      >
        {n}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        marginBottom: 10,
        padding: "10px 12px",
        borderRadius: 10,
        background: "var(--card-bg)",
        border: "1px solid var(--card-border-soft)",
      }}
    >
      <span style={{ color: "var(--accent)", fontSize: 13, flex: "0 0 auto", marginTop: 1 }}>→</span>
      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

function MetricRow({ label, what }: { label: string; what: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, marginTop: 2 }}>{what}</div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--card-border-soft)", paddingBottom: 10, marginBottom: 10 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textAlign: "left" as const,
          gap: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4 }}>{q}</span>
        <span style={{ fontSize: 16, color: "var(--text-muted)", flex: "0 0 auto" }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{a}</div>
      )}
    </div>
  );
}

function TabContent({ tab, onGoToPractice }: { tab: Tab; onGoToPractice: () => void }) {
  if (tab === "start") {
    return (
      <>
        <Section title="How it works">
          <Step n={1} text="Set up a Job Profile with the role you're targeting. Paste a real job description for the most relevant questions." />
          <Step n={2} text="Go to Practice and answer an interview question by speaking or typing your response." />
          <Step n={3} text="Review your Results — you'll get STAR scoring, communication feedback, delivery analysis, and a stronger-answer rewrite." />
          <Step n={4} text="Track your Progress over time. Repeat for different question types and profiles." />
        </Section>

        <Section title="Start here">
          <Tip>Set your first job profile before practicing — it unlocks tailored questions and better keyword scoring.</Tip>
          <Tip>Try the Question Bank to pick a specific behavioral or technical question to work on.</Tip>
        </Section>

        <button
          onClick={onGoToPractice}
          style={{
            width: "100%",
            marginTop: 4,
            padding: "13px 16px",
            borderRadius: 12,
            border: "1px solid var(--accent-strong)",
            background: "linear-gradient(135deg, var(--accent-2-soft), var(--accent-soft))",
            color: "var(--accent)",
            fontWeight: 950,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          Go to Practice →
        </button>
      </>
    );
  }

  if (tab === "tips") {
    return (
      <>
        <Section title="Answer structure">
          <Tip>Use STAR: Situation → Task → Action → Result. Keep Situation and Task brief — the Action and Result are what interviewers remember.</Tip>
          <Tip>End every answer with a specific, measurable result. "The team met the deadline" is weak. "We shipped 2 weeks early and reduced bug reports by 40%" is strong.</Tip>
          <Tip>Use "I" not "we" — interviewers want to know what you specifically did, not what the group accomplished.</Tip>
        </Section>

        <Section title="Delivery">
          <Tip>Speak at 130–160 WPM. Much faster sounds rushed; slower can sound unsure. Your results page shows your actual WPM.</Tip>
          <Tip>Replace filler words (um, uh, like) with a 1-second pause. Silence sounds more confident than filler.</Tip>
          <Tip>Vary your energy when you get to the result — the outcome line should land with more weight than the setup.</Tip>
        </Section>

        <Section title="Practice habits">
          <Tip>Do at least 3 attempts per question type to see meaningful score improvement.</Tip>
          <Tip>Practice out loud, not in your head. Reading an answer silently doesn't train your delivery.</Tip>
          <Tip>Review the "Better Answer" rewrite in your results — it shows exactly what the ideal version sounds like for your role.</Tip>
        </Section>
      </>
    );
  }

  if (tab === "results") {
    return (
      <>
        <Section title="Score tabs">
          <MetricRow label="Overview" what="Your overall score, headline strengths, and top improvement areas at a glance." />
          <MetricRow label="Relevance" what="How directly your answer addressed the question — scored on directness, completeness, and on-topic focus." />
          <MetricRow label="Structure" what="STAR breakdown with evidence excerpts from your transcript and per-component scores (S / T / A / R)." />
          <MetricRow label="Delivery" what="Speech pace (WPM), filler rate, monotone risk, energy variation, and pitch dynamics from your audio." />
          <MetricRow label="Coaching" what="Why you scored what you scored, what the next attempt should focus on, and a rewritten stronger answer." />
          <MetricRow label="Transcript" what="Full text of what you said, with keyword highlights." />
        </Section>

        <Section title="Key metrics">
          <MetricRow label="STAR avg" what="Average of your Situation, Task, Action, and Result scores — the core structural quality signal." />
          <MetricRow label="Communication" what="How clearly and fluently you expressed your ideas, independent of content quality." />
          <MetricRow label="Confidence" what="Ownership language, assertive phrasing, and avoidance of hedging — not how you felt, but how you sounded." />
          <MetricRow label="Closing Impact" what="How strong your Result statement was — the single highest-leverage thing to improve in most answers." />
          <MetricRow label="Monotone Risk" what="Higher = flatter delivery. Aim below 5/10. Raise energy especially on your result line." />
        </Section>
      </>
    );
  }

  // faq
  return (
    <>
      <FaqItem
        q="Does my audio get recorded?"
        a="Yes, when you practice by speaking, audio is recorded to generate delivery analytics (pace, fillers, vocal variety). Recordings are accessible in your results and not shared."
      />
      <FaqItem
        q="What's a good overall score?"
        a="Scores above 70/100 indicate a solid, structured answer. Scores of 80+ are strong. Most first attempts land between 45–65 — improvement after feedback is common and expected."
      />
      <FaqItem
        q="What is STAR scoring?"
        a="STAR (Situation, Task, Action, Result) is the standard structure for behavioral interview answers. Each component is scored separately so you can see exactly where your answer breaks down."
      />
      <FaqItem
        q="Can I practice without a job profile?"
        a="Yes — you can answer general behavioral questions without a profile. Adding a profile unlocks role-tailored questions and better keyword alignment scoring."
      />
      <FaqItem
        q="How do I improve my Confidence score?"
        a="Use first-person ownership language ('I decided', 'I led', 'my approach was'), avoid hedging phrases ('kind of', 'sort of', 'I think maybe'), and slow your pace on key sentences."
      />
      <FaqItem
        q="What does 'Closing Impact' measure?"
        a="It scores how strong your Result statement was. A strong close names a specific, preferably quantified outcome. This is the single highest-leverage improvement for most candidates."
      />
    </>
  );
}

export default function HelpPanel() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<Tab>("start");
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setOpen(true);
        localStorage.setItem(STORAGE_KEY, "1");
      }
    } catch {}
    setInitialized(true);
  }, []);

  function handleGoToPractice() {
    setOpen(false);
    router.push("/practice");
  }

  if (!initialized) return null;

  return (
    <>
      {/* Floating trigger button when collapsed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Help & Guide"
          style={{
            position: "fixed",
            right: 20,
            bottom: 24,
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "1px solid var(--accent-strong)",
            background: "var(--accent-soft)",
            color: "var(--accent)",
            fontSize: 18,
            fontWeight: 950,
            cursor: "pointer",
            boxShadow: "var(--shadow-glow)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ?
        </button>
      )}

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          right: open ? 0 : -380,
          top: 0,
          width: 360,
          height: "100vh",
          background: "var(--card-bg-strong)",
          borderLeft: "1px solid var(--card-border-soft)",
          boxShadow: open ? "-8px 0 32px rgba(0,0,0,0.12)" : "none",
          display: "flex",
          flexDirection: "column",
          zIndex: 300,
          transition: "right 240ms cubic-bezier(0.4,0,0.2,1)",
          overflowY: "auto",
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
            position: "sticky",
            top: 0,
            background: "var(--card-bg-strong)",
            zIndex: 1,
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.7, color: "var(--accent)", textTransform: "uppercase" as const }}>
              Help & Guide
            </div>
            <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text-primary)", marginTop: 2 }}>
              How to get the most out of IPC
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "0 0 auto",
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "10px 14px",
            borderBottom: "1px solid var(--card-border-soft)",
            flexWrap: "wrap",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: tab === t.id ? "1px solid var(--accent-strong)" : "1px solid var(--card-border-soft)",
                background: tab === t.id ? "var(--accent-soft)" : "transparent",
                color: tab === t.id ? "var(--accent)" : "var(--text-muted)",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer",
                whiteSpace: "nowrap" as const,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "16px 18px", flex: 1 }}>
          <TabContent tab={tab} onGoToPractice={handleGoToPractice} />
        </div>
      </div>
    </>
  );
}
