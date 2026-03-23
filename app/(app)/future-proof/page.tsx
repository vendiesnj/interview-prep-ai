"use client";

import Link from "next/link";
import { useState } from "react";
import PremiumShell from "@/app/components/PremiumShell";
import OCCUPATIONS, { aiRiskLabel, matchOccupations } from "@/app/lib/onet-occupations";

// ── Static content ─────────────────────────────────────────────────────────────

const AI_RESISTANT_SKILLS = [
  {
    icon: "🗣️",
    title: "Human Communication",
    score_key: "communication",
    desc: "Empathy, nuance, persuasion, reading a room. AI can generate words but cannot build authentic trust.",
    why: "Language models produce text. They don't negotiate, inspire, de-escalate, or make someone feel heard.",
  },
  {
    icon: "🧠",
    title: "Critical Judgment",
    score_key: "critical_thinking",
    desc: "Knowing when the data is wrong, when the plan doesn't account for human behavior, when the \"correct\" answer is actually a mistake.",
    why: "AI optimizes within given parameters. Setting the right parameters — and knowing when to override them — requires human judgment.",
  },
  {
    icon: "🤝",
    title: "Leadership & Influence",
    score_key: "leadership",
    desc: "Motivating people through uncertainty, building trust over time, making decisions that affect real lives.",
    why: "Leadership is fundamentally relational. No model can be accountable for a team, a culture, or a difficult call.",
  },
  {
    icon: "⚙️",
    title: "Physical Craft & Trades",
    score_key: null,
    desc: "Wiring buildings, diagnosing engines, welding structural steel — work that requires dexterous hands in unpredictable environments.",
    why: "Robots exist in highly controlled environments. A master electrician diagnosing a 100-year-old building is not a robot job.",
  },
  {
    icon: "💡",
    title: "Original Creativity",
    score_key: null,
    desc: "Generating ideas that haven't existed before — cultural relevance, emotional resonance, aesthetic taste.",
    why: "AI remixes the past. True originality — work that changes culture — requires a human perspective and a stake in the outcome.",
  },
  {
    icon: "🌱",
    title: "Adaptability",
    score_key: null,
    desc: "The ability to learn new domains, pivot careers, and build skills across multiple fields as industries evolve.",
    why: "The most future-proof attribute isn't one skill — it's the capacity to keep acquiring new ones.",
  },
];

const AI_RISK_TIERS = [
  {
    label: "High risk (60–90%)",
    color: "#EF4444",
    examples: ["Data entry clerk", "Bookkeeper", "Tax preparer", "Medical coder", "Telemarketer", "Loan officer", "Paralegal"],
    message: "These roles involve highly repetitive, rule-based tasks that AI can already do faster and cheaper. If you're in or targeting one of these, diversifying your skill set now is critical.",
  },
  {
    label: "Moderate risk (30–60%)",
    color: "#F59E0B",
    examples: ["Financial analyst", "Accountant", "Supply chain analyst", "Social media manager", "Copywriter", "Radiologist"],
    message: "Parts of these roles are automatable, but human judgment, client relationships, and creative direction keep them viable. Leaning into the high-value human components matters.",
  },
  {
    label: "Low risk (under 30%)",
    color: "#10B981",
    examples: ["Surgeon", "Electrician", "Nurse practitioner", "Therapist", "Teacher", "Software engineer", "Entrepreneur", "UX researcher"],
    message: "These roles require physical dexterity in unpredictable environments, deep human relationships, or creative/strategic judgment that remains difficult for AI to replicate.",
  },
];

const ADAPTABILITY_ACTIONS = [
  { icon: "📚", action: "Build a skill in an adjacent field", detail: "If you're in finance, learn data analysis. If you're in healthcare, learn health tech. Adjacent skills create career pivots, not dead ends." },
  { icon: "🤝", action: "Invest in human relationships", detail: "Your professional network is your most AI-proof asset. People hire people they trust — and AI can't build that trust for you." },
  { icon: "💼", action: "Develop a consulting or freelance skill", detail: "The ability to sell a skill independently gives you income resilience that no employer restructuring can take away." },
  { icon: "🚀", action: "Practice leadership at every level", detail: "Volunteer to lead projects, mentor peers, or run initiatives. Leadership experience is hard to fake and impossible to automate." },
  { icon: "🔧", action: "Consider a skilled trade or technical cert", detail: "Trades have some of the lowest AI automation risk in the economy. A side certification could be your most recession-proof move." },
  { icon: "💰", action: "Build multiple income streams", detail: "A single employer means a single point of failure. Side income — even small — makes you financially resilient when industries shift." },
];

const SCENARIO_PLANNING = [
  {
    scenario: "What if AI automates 50% of your target industry?",
    response: "The roles that survive consolidation are the ones AI can't do: managing AI tools, client relationships, quality oversight, and judgment calls. Position yourself as the human who runs the AI, not the one who competes with it.",
  },
  {
    scenario: "What if the job market stays uncertain for 5+ years?",
    response: "Diversified income, a strong network, and marketable skills in multiple domains create stability that a single job title can't. This is the case for side hustles, certifications, and ongoing skill building.",
  },
  {
    scenario: "What if your current field shrinks dramatically?",
    response: "Your transferable skills — communication, analysis, project management, relationship building — are more portable than your job title. Identify which of your skills map to growing industries and lean into those.",
  },
];

// ── Low-AI-risk occupations to highlight ───────────────────────────────────────
const LOW_RISK_SPOTLIGHT = OCCUPATIONS
  .filter(o => o.aiRisk <= 22)
  .sort((a, b) => a.aiRisk - b.aiRisk)
  .slice(0, 9);

// ── Component ─────────────────────────────────────────────────────────────────

export default function FutureProofPage() {
  const [openScenario, setOpenScenario] = useState<number | null>(null);
  const [openSkill, setOpenSkill] = useState<number | null>(null);

  return (
    <PremiumShell hideHeader>
      <div style={{ maxWidth: 1080, margin: "0 auto", paddingBottom: 80 }}>

        {/* ── Hero ── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 99, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", marginBottom: 16 }}>
            <span style={{ fontSize: 16 }}>🤖</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: "#EF4444", letterSpacing: 0.5 }}>AI & FUTURE OF WORK</span>
          </div>
          <h1 style={{ margin: "0 0 14px", fontSize: 36, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.8, lineHeight: 1.15 }}>
            Future-proof your career.
          </h1>
          <p style={{ margin: "0 0 20px", fontSize: 16, color: "var(--text-muted)", lineHeight: 1.75, maxWidth: 680 }}>
            AI is changing work — but not in the way most headlines suggest. The careers at risk aren't the hard ones. They're the ones built on repetitive, rule-based tasks. The careers that survive — and thrive — are built on human judgment, craft, creativity, and connection.
          </p>
          <p style={{ margin: 0, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.75, maxWidth: 680 }}>
            This section helps you understand where you stand, what to build, and how to think about the next 10–20 years of your working life with clarity — not fear.
          </p>
        </div>

        {/* ── AI Risk by Sector ── */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader number="01" title="Understanding AI automation risk" />
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 680 }}>
            Research from Brookings, McKinsey, and Oxford University has quantified what percentage of tasks in each occupation can be automated. Here's the honest breakdown:
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            {AI_RISK_TIERS.map((tier) => (
              <div key={tier.label} style={{ padding: "20px 24px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: tier.color, flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text-primary)", marginBottom: 6 }}>{tier.label}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {tier.examples.map(ex => (
                      <span key={ex} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99, background: tier.color + "15", color: tier.color, fontWeight: 700 }}>{ex}</span>
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>{tier.message}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Skills AI Can't Replace ── */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader number="02" title="The skills AI can't replace" />
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 680 }}>
            These aren't soft skills — they're the hardest skills to develop and the most valuable in an automated world. Click each to understand why they're AI-resistant.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {AI_RESISTANT_SKILLS.map((skill, i) => {
              const isOpen = openSkill === i;
              return (
                <div
                  key={skill.title}
                  onClick={() => setOpenSkill(isOpen ? null : i)}
                  className="ipc-card-lift"
                  style={{ padding: "18px 20px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{skill.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 900, color: "var(--text-primary)" }}>{skill.title}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{skill.desc}</p>
                  {isOpen && (
                    <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: "#10B981", marginBottom: 4, letterSpacing: 0.5 }}>WHY IT'S AI-RESISTANT</div>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>{skill.why}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Low-Risk Career Spotlight ── */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader number="03" title="Careers with the lowest automation risk" />
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 680 }}>
            These occupations score under 22% automation risk — meaning the vast majority of what these professionals do cannot be replicated by current or near-future AI systems.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {LOW_RISK_SPOTLIGHT.map(occ => {
              const risk = aiRiskLabel(occ.aiRisk);
              return (
                <Link key={occ.id} href={`/career-guide/career-paths/${occ.id}`} style={{ textDecoration: "none" }}>
                  <div
                    className="ipc-card-lift"
                    style={{ padding: "16px 18px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", height: "100%" }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 900, color: risk.color, marginBottom: 6, letterSpacing: 0.5 }}>
                      {occ.aiRisk}% AI risk
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text-primary)", marginBottom: 4, lineHeight: 1.3 }}>{occ.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>{occ.category}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#10B981" }}>${occ.salary[0]}K–${occ.salary[1]}K</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Adaptability Actions ── */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader number="04" title="6 moves that make you harder to replace" />
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 680 }}>
            Regardless of your field or career stage, these moves build long-term career resilience.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {ADAPTABILITY_ACTIONS.map((item, i) => (
              <div key={i} style={{ padding: "16px 20px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text-primary)", marginBottom: 4 }}>{item.action}</div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Scenario Planning ── */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader number="05" title="Scenario planning — thinking through the uncertainty" />
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 680 }}>
            The uncertainty is real. Here's how to think clearly through the scenarios most people are anxious about.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {SCENARIO_PLANNING.map((item, i) => {
              const isOpen = openScenario === i;
              return (
                <div
                  key={i}
                  onClick={() => setOpenScenario(isOpen ? null : i)}
                  style={{ padding: "18px 22px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text-primary)" }}>{item.scenario}</div>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 16, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                  {isOpen && (
                    <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>{item.response}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Side Hustles / Entrepreneurship CTA ── */}
        <section style={{ marginBottom: 48 }}>
          <SectionHeader number="06" title="Side income & entrepreneurship" />
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 680 }}>
            One of the most powerful ways to future-proof your life is to build income that doesn't depend on a single employer. This isn't just for risk mitigation — for many people, the side business becomes the main business.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: "22px 24px", borderRadius: 16, border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>💼</div>
              <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text-primary)", marginBottom: 8 }}>Find your side hustle</div>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>
                Based on your career aptitude profile, we can match side income opportunities that align with your skills and interests — from freelancing to product businesses to trade work.
              </p>
              <Link href="/aptitude" style={{ display: "inline-block", padding: "9px 18px", borderRadius: 10, background: "var(--accent)", color: "#fff", fontWeight: 900, fontSize: 13, textDecoration: "none" }}>
                Take Career Assessment →
              </Link>
            </div>
            <div style={{ padding: "22px 24px", borderRadius: 16, border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>🚀</div>
              <div style={{ fontSize: 15, fontWeight: 950, color: "var(--text-primary)", marginBottom: 8 }}>Entrepreneurship track</div>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>
                For students and graduates with high autonomy drive and risk tolerance, the entrepreneurship track maps business models, funding paths, and early-stage skills to your profile.
              </p>
              <Link href="/career-guide/career-paths" style={{ display: "inline-block", padding: "9px 18px", borderRadius: 10, background: "var(--card-bg)", color: "var(--accent)", border: "1px solid var(--accent)", fontWeight: 900, fontSize: 13, textDecoration: "none" }}>
                Explore career paths →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Practice CTA ── */}
        <div style={{ padding: "24px 28px", borderRadius: 16, border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 950, color: "var(--accent)", marginBottom: 4 }}>
              Build the skills AI can't replace — starting today
            </div>
            <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 520 }}>
              Communication, critical thinking, and leadership are your highest-value investments. Practice them here — interview prep, networking pitches, and public speaking sessions all build your AI-resistant skill stack.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
            <Link href="/practice" style={{ padding: "10px 18px", borderRadius: 10, background: "var(--accent)", color: "#fff", fontWeight: 900, fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}>
              Start practicing →
            </Link>
            <Link href="/networking" style={{ padding: "10px 18px", borderRadius: 10, background: "transparent", color: "var(--accent)", border: "1px solid var(--accent)", fontWeight: 900, fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}>
              Networking pitch →
            </Link>
          </div>
        </div>

      </div>
    </PremiumShell>
  );
}

// ── Helper ─────────────────────────────────────────────────────────────────────

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
      <span style={{ fontSize: 11, fontWeight: 900, color: "var(--accent)", letterSpacing: 1, opacity: 0.6 }}>{number}</span>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.4 }}>{title}</h2>
    </div>
  );
}
