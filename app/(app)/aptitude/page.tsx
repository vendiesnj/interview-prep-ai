"use client";

import { useState } from "react";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";
import {
  ACTIVITY_QUESTIONS,
  SCENARIO_QUESTIONS,
  WORK_VALUES_QUESTIONS,
  ENTREPRENEUR_QUESTIONS,
  scoreRiasec,
  scoreWorkValues,
  scoreEntrepreneurship,
  riasecProfileString,
  DIMENSION_LABELS,
  DIMENSION_DESCRIPTIONS,
  VALUE_LABELS,
  type RiasecDimension,
  type WorkValue,
  type RiasecScores,
  type WorkValueScores,
  type EntrepreneurProfile,
} from "@/app/lib/riasec-questions";
import {
  matchOccupations,
  matchSideHustles,
  matchEntrepreneurPaths,
  aiRiskLabel,
  educationLabel,
  type Occupation,
} from "@/app/lib/onet-occupations";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Answers {
  activities: Record<string, number>;
  scenarios: Record<string, string>;
  values: Record<string, WorkValue>;
  entrepreneurship: Record<string, number>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_SECTIONS = 4;

// Activities: 36 questions, 6 per page = 6 pages
const ACTIVITY_PAGES = 6;
const ACTIVITY_PER_PAGE = 6;

// Scenarios: 8 questions, 2 per page = 4 pages
const SCENARIO_PAGES = 4;
const SCENARIO_PER_PAGE = 2;

const SECTION_INTROS = [
  {
    title: "Activities",
    subtitle: "How much would you enjoy doing each of these things?",
    desc: "Rate each activity honestly - there are no right or wrong answers. Think about how you actually feel, not what sounds impressive.",
  },
  {
    title: "Scenarios",
    subtitle: "Which option sounds most like you?",
    desc: "For each scenario, pick the one choice that genuinely resonates. Go with your gut - your first instinct is usually the most accurate.",
  },
  {
    title: "Work Values",
    subtitle: "What actually matters to you in a career?",
    desc: "Four quick questions about what drives you. Be honest - this shapes which careers will actually make you happy long-term.",
  },
  {
    title: "Entrepreneurship",
    subtitle: "How do you relate to risk, autonomy, and side income?",
    desc: "These questions help us figure out whether an entrepreneur or side-income track is a strong fit for you.",
  },
];

const SCALE_LABELS = ["Strongly Dislike", "Dislike", "Neutral", "Enjoy", "Strongly Enjoy"];

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ section, subStep, totalSubSteps }: { section: number; subStep: number; totalSubSteps: number }) {
  const overallProgress = ((section - 1) / TOTAL_SECTIONS) + (subStep / totalSubSteps / TOTAL_SECTIONS);
  const pct = Math.round(overallProgress * 100);
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
          Section {section} of {TOTAL_SECTIONS}: {SECTION_INTROS[section - 1].title}
        </span>
        <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: TOTAL_SECTIONS }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 5, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              borderRadius: 99,
              background: "var(--accent)",
              width: i < section - 1 ? "100%" : i === section - 1 ? `${(subStep / totalSubSteps) * 100}%` : "0%",
              transition: "width 0.4s ease",
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionIntro({ sectionIdx, onContinue }: { sectionIdx: number; onContinue: () => void }) {
  const info = SECTION_INTROS[sectionIdx];
  return (
    <div style={{ textAlign: "center", padding: "32px 0 24px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
        Section {sectionIdx + 1} of {TOTAL_SECTIONS}
      </div>
      <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 10 }}>{info.title}</h2>
      <p style={{ fontSize: 16, fontWeight: 500, color: "var(--text-muted)", marginBottom: 8 }}>{info.subtitle}</p>
      <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 480, margin: "0 auto 28px" }}>{info.desc}</p>
      <button onClick={onContinue} style={{
        background: "var(--accent)", color: "#fff", border: "none", borderRadius: 10,
        padding: "12px 32px", fontSize: 15, fontWeight: 600, cursor: "pointer",
      }}>
        Let's go →
      </button>
    </div>
  );
}

function ScaleRow({ prompt, value, onChange }: { prompt: string; value: number | undefined; onChange: (v: number) => void }) {
  return (
    <div style={{
      padding: "16px 20px",
      borderRadius: 12,
      border: `1px solid var(--card-border)`,
      background: "var(--card-bg)",
      marginBottom: 10,
    }}>
      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, lineHeight: 1.5 }}>{prompt}</p>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", minWidth: 90 }}>Strongly Dislike</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              width: 40, height: 40, borderRadius: "50%", border: `2px solid ${value === n ? "var(--accent)" : "var(--card-border)"}`,
              background: value === n ? "var(--accent)" : "transparent",
              color: value === n ? "#fff" : "var(--text-muted)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0,
              transition: "all 0.15s",
            }}
            title={SCALE_LABELS[n - 1]}
          >
            {n}
          </button>
        ))}
        <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", minWidth: 90, textAlign: "right" }}>Strongly Enjoy</span>
      </div>
    </div>
  );
}

function ChoiceRow({ prompt, options, value, onChange }: {
  prompt: string;
  options: Array<{ label: string; dimension?: string; value?: string }>;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{
      padding: "20px", borderRadius: 14, border: `1px solid var(--card-border)`, background: "var(--card-bg)", marginBottom: 16,
    }}>
      <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, lineHeight: 1.5 }}>{prompt}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map((opt, i) => {
          const key = (opt as { dimension?: string; value?: string }).dimension ?? (opt as { value?: string }).value ?? String(i);
          const selected = value === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              style={{
                textAlign: "left", padding: "11px 16px", borderRadius: 10,
                border: `2px solid ${selected ? "var(--accent)" : "var(--card-border)"}`,
                background: selected ? "rgba(var(--accent-rgb, 99,102,241),0.08)" : "transparent",
                color: selected ? "var(--accent)" : "inherit",
                fontSize: 14, cursor: "pointer", fontWeight: selected ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Mini bar for results ──────────────────────────────────────────────────────

function MiniBar({ label, value, max = 100, color = "var(--accent)" }: { label: string; value: number; max?: number; color?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{value}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "var(--card-border)" }}>
        <div style={{ height: "100%", borderRadius: 99, background: color, width: `${(value / max) * 100}%`, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

// ── Occupation card ───────────────────────────────────────────────────────────

function OccupationCard({ occ }: { occ: Occupation }) {
  const risk = aiRiskLabel(occ.aiRisk);
  return (
    <div style={{
      border: "1px solid var(--card-border)", background: "var(--card-bg)", borderRadius: 14,
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{occ.title}</h4>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99,
          background: "rgba(99,102,241,0.1)", color: "var(--accent)", whiteSpace: "nowrap",
        }}>{occ.category}</span>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>{occ.description}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#10B981" }}>${occ.salary[0]}K–${occ.salary[1]}K</span>
        <span style={{ color: "var(--card-border)" }}>·</span>
        <span style={{ fontSize: 12, color: risk.color, fontWeight: 500 }}>{risk.label}</span>
        <span style={{ color: "var(--card-border)" }}>·</span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{educationLabel(occ.education)}</span>
      </div>
      <Link href={`/career-guide/career-paths/${occ.id}`} style={{
        marginTop: 4, fontSize: 13, fontWeight: 600, color: "var(--accent)", textDecoration: "none",
      }}>
        View Path →
      </Link>
    </div>
  );
}

// ── Results Component ─────────────────────────────────────────────────────────

function Results({ answers }: { answers: Answers }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const riasecScores = scoreRiasec(answers);
  const workValueScores = scoreWorkValues(answers);
  const entrepreneurProfile = scoreEntrepreneurship(answers);
  const profileString = riasecProfileString(riasecScores);

  const sorted = (Object.entries(riasecScores) as [RiasecDimension, number][]).sort((a, b) => b[1] - a[1]);
  const topDimension = sorted[0][0];
  const secondDimension = sorted[1][0];

  const topOccupations = matchOccupations(profileString, { limit: 10 });
  const sideHustles = matchSideHustles(profileString);
  const entrepreneurPaths = matchEntrepreneurPaths(profileString);

  const topValue = (Object.entries(workValueScores) as [WorkValue, number][]).sort((a, b) => b[1] - a[1])[0][0];

  const VALUE_EXPLANATIONS: Record<WorkValue, string> = {
    achievement: "You want to grow, master things, and be genuinely excellent at what you do. Look for roles with a steep learning curve and real intellectual challenge.",
    independence: "You need autonomy. Micromanagement will drain you fast. Aim for roles where you own your work - or consider building something yourself.",
    recognition: "You're motivated by visibility and advancement. High-growth companies, client-facing roles, and meritocratic environments will bring out your best.",
    relationships: "You thrive when surrounded by people you respect and care about. Team culture and collaboration matter as much as the work itself.",
    support: "Meaning is non-negotiable for you. You need to know your work is making a positive difference in people's lives.",
    conditions: "You value stability, predictability, and a life that isn't consumed by work. That's a smart priority - seek roles with strong benefits and clear boundaries.",
  };

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/aptitude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary: topDimension,
          secondary: secondDimension,
          riasecProfile: profileString,
          riasecScores,
          workValues: workValueScores,
          entrepreneurProfile,
        }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Header */}
      <div style={{ textAlign: "center", paddingBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
          Your RIASEC Profile
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>{profileString}</h2>
        <p style={{ fontSize: 15, color: "var(--text-muted)" }}>
          {DIMENSION_LABELS[topDimension]} · {DIMENSION_LABELS[secondDimension]} · {DIMENSION_LABELS[sorted[2][0]]}
        </p>
      </div>

      {/* RIASEC Profile Card */}
      <div style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)", borderRadius: 16, padding: "24px 28px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Your Personality Profile</h3>
        {sorted.slice(0, 3).map(([dim, score]) => (
          <MiniBar key={dim} label={`${dim} - ${DIMENSION_LABELS[dim as RiasecDimension]}`} value={score} />
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
          {[topDimension, secondDimension].map((dim) => (
            <div key={dim} style={{ background: "rgba(99,102,241,0.05)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>{DIMENSION_LABELS[dim]}</div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>{DIMENSION_DESCRIPTIONS[dim]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Career Matches */}
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Top Career Matches</h3>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 18 }}>Based on your RIASEC profile, these careers are the strongest fits.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {topOccupations.map((occ) => <OccupationCard key={occ.id} occ={occ} />)}
        </div>
      </div>

      {/* Side Hustles */}
      <div style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)", borderRadius: 16, padding: "24px 28px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Side Hustles & Side Income</h3>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 18 }}>Income ideas that align with your strengths and interests.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {sideHustles.slice(0, 10).map((hustle, i) => (
            <div key={i} style={{
              padding: "10px 14px", borderRadius: 10, border: "1px solid var(--card-border)",
              fontSize: 13, fontWeight: 500, background: "var(--card-bg)",
            }}>
              {hustle}
            </div>
          ))}
        </div>
      </div>

      {/* Entrepreneurship */}
      <div style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)", borderRadius: 16, padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Entrepreneurship Profile</h3>
          {entrepreneurProfile.overall >= 50 && (
            <span style={{
              fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99,
              background: "rgba(16,185,129,0.12)", color: "#10B981",
            }}>
              Entrepreneur Track
            </span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <MiniBar label="Risk Tolerance" value={entrepreneurProfile.riskTolerance} color="#F59E0B" />
            <MiniBar label="Autonomy Drive" value={entrepreneurProfile.autonomyDrive} color="#8B5CF6" />
            <MiniBar label="Execution Bias" value={entrepreneurProfile.executionBias} color="#10B981" />
            <MiniBar label="Side Income Interest" value={entrepreneurProfile.sideIncomeInterest} color="var(--accent)" />
            <MiniBar label="Overall Score" value={entrepreneurProfile.overall} color="#EF4444" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Paths that match your profile:</p>
            {entrepreneurPaths.slice(0, 8).map((path, i) => (
              <div key={i} style={{
                fontSize: 13, padding: "6px 0", borderBottom: i < Math.min(7, entrepreneurPaths.length - 1) ? "1px solid var(--card-border)" : "none",
                color: "var(--text-muted)",
              }}>
                {path}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Work Values */}
      <div style={{ border: "1px solid var(--card-border)", background: "var(--card-bg)", borderRadius: 16, padding: "24px 28px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Your Core Work Value</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{
            fontSize: 15, fontWeight: 700, padding: "6px 14px", borderRadius: 99,
            background: "rgba(99,102,241,0.1)", color: "var(--accent)",
          }}>
            {VALUE_LABELS[topValue]}
          </span>
        </div>
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          {VALUE_EXPLANATIONS[topValue]}
        </p>
      </div>

      {/* Save Button */}
      <div style={{ textAlign: "center", paddingBottom: 16 }}>
        {saved ? (
          <div style={{
            display: "inline-block", padding: "12px 28px", borderRadius: 12,
            background: "rgba(16,185,129,0.12)", color: "#10B981", fontSize: 15, fontWeight: 600,
          }}>
            Results saved to your profile.
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: "var(--accent)", color: "#fff", border: "none", borderRadius: 12,
              padding: "13px 36px", fontSize: 15, fontWeight: 600, cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving..." : "Save Results to Profile"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AptitudePage() {
  const [answers, setAnswers] = useState<Answers>({
    activities: {},
    scenarios: {},
    values: {},
    entrepreneurship: {},
  });

  // section: 1-4, step: intro | 0..N-1 (page within section)
  const [section, setSection] = useState(1);
  const [step, setStep] = useState<"intro" | number>("intro");
  const [done, setDone] = useState(false);

  // ── Navigation helpers ──────────────────────────────────────────────────────

  function totalStepsForSection(s: number) {
    if (s === 1) return ACTIVITY_PAGES;
    if (s === 2) return SCENARIO_PAGES;
    if (s === 3) return 1;
    if (s === 4) return 1;
    return 1;
  }

  function currentSubStep() {
    if (step === "intro") return 0;
    return (step as number) + 1;
  }

  function advance() {
    const total = totalStepsForSection(section);
    if (step === "intro") {
      setStep(0);
      return;
    }
    const s = step as number;
    if (s < total - 1) {
      setStep(s + 1);
    } else {
      if (section < TOTAL_SECTIONS) {
        setSection(section + 1);
        setStep("intro");
      } else {
        setDone(true);
      }
    }
  }

  function back() {
    if (step === "intro") {
      if (section > 1) {
        const prevSection = section - 1;
        setSection(prevSection);
        setStep(totalStepsForSection(prevSection) - 1);
      }
    } else if (step === 0) {
      setStep("intro");
    } else {
      setStep((step as number) - 1);
    }
  }

  // ── Answer helpers ──────────────────────────────────────────────────────────

  function setActivity(id: string, val: number) {
    setAnswers((a) => ({ ...a, activities: { ...a.activities, [id]: val } }));
  }

  function setScenario(id: string, dim: string) {
    setAnswers((a) => ({ ...a, scenarios: { ...a.scenarios, [id]: dim } }));
  }

  function setValue(id: string, val: WorkValue) {
    setAnswers((a) => ({ ...a, values: { ...a.values, [id]: val } }));
  }

  function setEntrepreneur(id: string, val: number) {
    setAnswers((a) => ({ ...a, entrepreneurship: { ...a.entrepreneurship, [id]: val } }));
  }

  // ── Can advance? ────────────────────────────────────────────────────────────

  function canAdvance(): boolean {
    if (step === "intro") return true;
    const s = step as number;
    if (section === 1) {
      const qs = ACTIVITY_QUESTIONS.slice(s * ACTIVITY_PER_PAGE, (s + 1) * ACTIVITY_PER_PAGE);
      return qs.every((q) => answers.activities[q.id] !== undefined);
    }
    if (section === 2) {
      const qs = SCENARIO_QUESTIONS.slice(s * SCENARIO_PER_PAGE, (s + 1) * SCENARIO_PER_PAGE);
      return qs.every((q) => answers.scenarios[q.id] !== undefined);
    }
    if (section === 3) {
      return WORK_VALUES_QUESTIONS.every((q) => answers.values[q.id] !== undefined);
    }
    if (section === 4) {
      return ENTREPRENEUR_QUESTIONS.every((q) => answers.entrepreneurship[q.id] !== undefined);
    }
    return true;
  }

  // ── Render content ──────────────────────────────────────────────────────────

  function renderContent() {
    if (step === "intro") {
      return <SectionIntro sectionIdx={section - 1} onContinue={advance} />;
    }

    const s = step as number;

    if (section === 1) {
      const qs = ACTIVITY_QUESTIONS.slice(s * ACTIVITY_PER_PAGE, (s + 1) * ACTIVITY_PER_PAGE);
      const dim = qs[0].dimension!;
      const dimNames: Record<string, string> = { R: "Realistic", I: "Investigative", A: "Artistic", S: "Social", E: "Enterprising", C: "Conventional" };
      return (
        <div>
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Group {s + 1} of {ACTIVITY_PAGES} - {dimNames[dim]}
            </span>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
              Rate how much you'd enjoy each activity (1 = strongly dislike, 5 = strongly enjoy):
            </p>
          </div>
          {qs.map((q) => (
            <ScaleRow key={q.id} prompt={q.prompt} value={answers.activities[q.id]} onChange={(v) => setActivity(q.id, v)} />
          ))}
        </div>
      );
    }

    if (section === 2) {
      const qs = SCENARIO_QUESTIONS.slice(s * SCENARIO_PER_PAGE, (s + 1) * SCENARIO_PER_PAGE);
      return (
        <div>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>
            Questions {s * SCENARIO_PER_PAGE + 1}–{Math.min((s + 1) * SCENARIO_PER_PAGE, SCENARIO_QUESTIONS.length)} of {SCENARIO_QUESTIONS.length}
          </p>
          {qs.map((q) => (
            <ChoiceRow
              key={q.id}
              prompt={q.prompt}
              options={(q.options ?? []).map((o) => ({ label: o.label, dimension: o.dimension }))}
              value={answers.scenarios[q.id]}
              onChange={(dim) => setScenario(q.id, dim)}
            />
          ))}
        </div>
      );
    }

    if (section === 3) {
      return (
        <div>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>
            Pick the option that resonates most with you for each question.
          </p>
          {WORK_VALUES_QUESTIONS.map((q) => (
            <ChoiceRow
              key={q.id}
              prompt={q.prompt}
              options={q.options.map((o) => ({ label: o.label, value: o.value }))}
              value={answers.values[q.id]}
              onChange={(v) => setValue(q.id, v as WorkValue)}
            />
          ))}
        </div>
      );
    }

    if (section === 4) {
      return (
        <div>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>
            Rate each statement from 1 (strongly disagree) to 5 (strongly agree):
          </p>
          {ENTREPRENEUR_QUESTIONS.map((q) => (
            <ScaleRow
              key={q.id}
              prompt={q.prompt}
              value={answers.entrepreneurship[q.id]}
              onChange={(v) => setEntrepreneur(q.id, v)}
            />
          ))}
        </div>
      );
    }

    return null;
  }

  const showNavButtons = step !== "intro";
  const totalSteps = totalStepsForSection(section);

  return (
    <PremiumShell>
      <div style={{ maxWidth: 740, margin: "0 auto", padding: "32px 20px 80px" }}>
        {done ? (
          <>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Your Career Profile</h1>
              <p style={{ color: "var(--text-muted)", fontSize: 15 }}>Here's what your answers reveal about you.</p>
            </div>
            <Results answers={answers} />
          </>
        ) : (
          <>
            {step !== "intro" && (
              <ProgressBar section={section} subStep={currentSubStep()} totalSubSteps={totalSteps} />
            )}

            <div style={{ marginBottom: showNavButtons ? 24 : 0 }}>
              {step === "intro" && (
                <div style={{ textAlign: "center", marginBottom: 8 }}>
                  <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Career Assessment</h1>
                  <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 480, margin: "0 auto" }}>
                    4 sections · ~8 minutes · Based on the RIASEC model used by O*NET and career researchers worldwide
                  </p>
                </div>
              )}
              {renderContent()}
            </div>

            {showNavButtons && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid var(--card-border)" }}>
                <button
                  onClick={back}
                  disabled={section === 1 && step === 0}
                  style={{
                    background: "transparent", border: "1px solid var(--card-border)", borderRadius: 10,
                    padding: "10px 24px", fontSize: 14, fontWeight: 500, cursor: section === 1 && step === 0 ? "default" : "pointer",
                    opacity: section === 1 && step === 0 ? 0.4 : 1, color: "inherit",
                  }}
                >
                  ← Back
                </button>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {(step as number) + 1} / {totalSteps}
                </span>
                <button
                  onClick={advance}
                  disabled={!canAdvance()}
                  style={{
                    background: canAdvance() ? "var(--accent)" : "var(--card-border)",
                    color: canAdvance() ? "#fff" : "var(--text-muted)",
                    border: "none", borderRadius: 10, padding: "10px 28px",
                    fontSize: 14, fontWeight: 600, cursor: canAdvance() ? "pointer" : "default",
                    transition: "background 0.2s",
                  }}
                >
                  {section === TOTAL_SECTIONS && (step as number) === totalSteps - 1 ? "See Results →" : "Next →"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PremiumShell>
  );
}
