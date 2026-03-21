"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PremiumShell from "@/app/components/PremiumShell";

// ── Types ─────────────────────────────────────────────────────────────────────
type Category = "T" | "C" | "H" | "B" | "S";

type Question = {
  question: string;
  options: { label: string; category: Category }[];
};

type Result = {
  category: Category;
  title: string;
  icon: string;
  color: string;
  majors: string[];
  desc: string;
  salaryRange: string;
  careers: string[];
};

// ── Questions ─────────────────────────────────────────────────────────────────
const QUESTIONS: Question[] = [
  {
    question: "What kind of work energizes you most?",
    options: [
      { label: "Solving complex technical problems", category: "T" },
      { label: "Creating something from scratch", category: "C" },
      { label: "Helping or caring for others", category: "H" },
      { label: "Leading a team or running something", category: "B" },
      { label: "Understanding people and society", category: "S" },
    ],
  },
  {
    question: "Which class do you naturally look forward to?",
    options: [
      { label: "Math or Science", category: "T" },
      { label: "Art, Music, or Creative Writing", category: "C" },
      { label: "Biology or Health class", category: "H" },
      { label: "Economics or Business", category: "B" },
      { label: "History, English, or Social Studies", category: "S" },
    ],
  },
  {
    question: "When you have a free afternoon, you're most likely to...",
    options: [
      { label: "Build, code, or fix something", category: "T" },
      { label: "Draw, write, make music, or design", category: "C" },
      { label: "Volunteer, help a friend, or mentor someone", category: "H" },
      { label: "Plan, organize, or start a side project", category: "B" },
      { label: "Read, research, or watch a documentary", category: "S" },
    ],
  },
  {
    question: "In a group project, your role tends to be...",
    options: [
      { label: "The one who figures out how things work", category: "T" },
      { label: "The one who makes it look good and creative", category: "C" },
      { label: "The one who keeps the team together", category: "H" },
      { label: "The one who leads and delegates", category: "B" },
      { label: "The one who researches and builds the case", category: "S" },
    ],
  },
  {
    question: "Which outcome matters most to you?",
    options: [
      { label: "Building something that actually works", category: "T" },
      { label: "Making something beautiful or meaningful", category: "C" },
      { label: "Improving someone's health or wellbeing", category: "H" },
      { label: "Growing revenue, a team, or an organization", category: "B" },
      { label: "Changing minds or influencing policy", category: "S" },
    ],
  },
  {
    question: "What type of environment sounds best to you?",
    options: [
      { label: "Lab, tech company, or engineering firm", category: "T" },
      { label: "Studio, agency, or on a film set", category: "C" },
      { label: "Hospital, clinic, or school", category: "H" },
      { label: "Office, startup, or conference room", category: "B" },
      { label: "Nonprofit, government, or university", category: "S" },
    ],
  },
  {
    question: "What's most satisfying about learning something new?",
    options: [
      { label: "Understanding exactly how it works under the hood", category: "T" },
      { label: "Finding a new way to express or visualize it", category: "C" },
      { label: "Being able to share it with someone who needs it", category: "H" },
      { label: "Figuring out how to use it to make an impact", category: "B" },
      { label: "Connecting it to bigger historical or social patterns", category: "S" },
    ],
  },
  {
    question: "Which skill do you most want to develop?",
    options: [
      { label: "Coding, data analysis, or engineering", category: "T" },
      { label: "Design, storytelling, or performance", category: "C" },
      { label: "Patient care, counseling, or teaching", category: "H" },
      { label: "Strategy, leadership, or finance", category: "B" },
      { label: "Writing, research, or public policy", category: "S" },
    ],
  },
  {
    question: "What kind of problem excites you most?",
    options: [
      { label: "Technical - there's a right answer if you dig deep enough", category: "T" },
      { label: "Creative - it's about finding something that hasn't been done before", category: "C" },
      { label: "Human - understanding why people do what they do", category: "H" },
      { label: "Strategic - how to allocate resources for the best outcome", category: "B" },
      { label: "Ethical or social - what's fair, just, or historically true", category: "S" },
    ],
  },
  {
    question: "How do you want people to describe your work in 10 years?",
    options: [
      { label: "'She built something that changed how we do X'", category: "T" },
      { label: "'That was genuinely original and beautiful'", category: "C" },
      { label: "'She helped me through the hardest time of my life'", category: "H" },
      { label: "'She grew that team or company from the ground up'", category: "B" },
      { label: "'Her research or teaching actually mattered to people'", category: "S" },
    ],
  },
];

// ── Results data ──────────────────────────────────────────────────────────────
const RESULTS: Record<Category, Result> = {
  T: {
    category: "T",
    title: "Technical & STEM",
    icon: "💻",
    color: "#2563EB",
    majors: ["Computer Science", "Software Engineering", "Data Science", "Electrical Engineering", "Mathematics", "Cybersecurity"],
    desc: "You gravitate toward systems, logic, and building. You're energized by hard problems with real answers. Technical fields reward this - and the career paths are among the most in-demand and highest-compensated in the market.",
    salaryRange: "$85k - $130k+ starting salary",
    careers: ["Software Engineer", "Data Scientist", "Systems Architect", "Machine Learning Engineer", "Product Manager (technical)"],
  },
  C: {
    category: "C",
    title: "Creative & Design",
    icon: "🎨",
    color: "#8B5CF6",
    majors: ["Graphic Design", "UX/UI Design", "Film & Media", "Architecture", "Creative Writing", "Music", "Communications"],
    desc: "You lead with creative instinct and want your work to be felt, not just functional. Creative fields are more competitive, but people who commit fully to craft and build strong portfolios thrive. The UX and design market especially rewards both aesthetic and analytical thinking.",
    salaryRange: "$55k - $110k+ starting salary",
    careers: ["UX Designer", "Art Director", "Film Producer", "Architect", "Creative Strategist", "Content Creator"],
  },
  H: {
    category: "H",
    title: "Healthcare & Human Sciences",
    icon: "⚕️",
    color: "#10B981",
    majors: ["Pre-Medicine", "Nursing", "Psychology", "Biology", "Public Health", "Physical Therapy", "Social Work"],
    desc: "You're drawn to the human side of any situation. You want to make a direct, tangible difference in individual lives. Healthcare and helping professions require patience, empathy, and long training paths - but they offer unmatched stability, meaning, and scope of impact.",
    salaryRange: "$50k - $120k+ starting (varies widely by specialization)",
    careers: ["Physician", "Registered Nurse", "Clinical Psychologist", "Physical Therapist", "Public Health Analyst", "Counselor"],
  },
  B: {
    category: "B",
    title: "Business & Leadership",
    icon: "📊",
    color: "#F59E0B",
    majors: ["Business Administration", "Finance", "Accounting", "Marketing", "Entrepreneurship", "Economics", "Operations"],
    desc: "You think in systems, strategies, and outcomes. You want to build, lead, or own something. Business is the broadest major category - the key is to specialize early (finance vs. marketing vs. operations are very different tracks) and gain real-world experience through internships every year.",
    salaryRange: "$60k - $120k+ starting salary",
    careers: ["Financial Analyst", "Marketing Manager", "Consultant", "Product Manager", "Startup Founder", "Investment Banker"],
  },
  S: {
    category: "S",
    title: "Social Sciences & Humanities",
    icon: "🌐",
    color: "#0EA5E9",
    majors: ["Political Science", "Sociology", "History", "Education", "Philosophy", "International Relations", "Journalism"],
    desc: "You want to understand the world - how it got here, how it works, and how it could be better. Humanities and social science majors develop strong research, writing, and analytical skills that transfer to law, policy, nonprofit leadership, journalism, and more. The path is less linear, but highly meaningful.",
    salaryRange: "$45k - $90k+ starting (graduate school often unlocks higher ranges)",
    careers: ["Policy Analyst", "Journalist", "Teacher", "Lawyer (requires law school)", "Nonprofit Director", "Researcher"],
  },
};

// ── Score calculator ──────────────────────────────────────────────────────────
function scoreAnswers(answers: Category[]): [Category, Category] {
  const counts: Record<Category, number> = { T: 0, C: 0, H: 0, B: 0, S: 0 };
  answers.forEach((a) => counts[a]++);
  const sorted = (Object.entries(counts) as [Category, number][]).sort((a, b) => b[1] - a[1]);
  return [sorted[0][0], sorted[1][0]];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AptitudePage() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "pre-college";

  const backHref = from === "during-college" ? "/during-college" : "/pre-college";
  const backLabel = from === "during-college" ? "← During College" : "← Pre-College";

  const [step, setStep] = useState<"intro" | "quiz" | "results">("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Category | null>(null);

  function selectOption(cat: Category) {
    setSelected(cat);
  }

  function nextQuestion() {
    if (!selected) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);
    if (currentQ + 1 < QUESTIONS.length) {
      setCurrentQ(currentQ + 1);
    } else {
      setStep("results");
    }
  }

  function prevQuestion() {
    if (currentQ === 0) {
      setStep("intro");
      setAnswers([]);
      setSelected(null);
      return;
    }
    setCurrentQ(currentQ - 1);
    setAnswers(answers.slice(0, -1));
    setSelected(answers[currentQ - 1] ?? null);
  }

  function restart() {
    setStep("intro");
    setCurrentQ(0);
    setAnswers([]);
    setSelected(null);
  }

  const q = QUESTIONS[currentQ];
  const progress = ((currentQ + (selected ? 1 : 0)) / QUESTIONS.length) * 100;

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (step === "intro") {
    return (
      <PremiumShell hideHeader>
        <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 80 }}>
          <div style={{ marginBottom: 12 }}>
            <Link href={backHref} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontWeight: 700 }}>{backLabel}</Link>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 99, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", marginBottom: 14 }}>
              <span style={{ fontSize: 16 }}>🧭</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#8B5CF6", letterSpacing: 0.5 }}>APTITUDE QUIZ</span>
            </div>
            <h1 style={{ margin: "0 0 10px", fontSize: 30, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.7, lineHeight: 1.2 }}>
              {from === "during-college" ? "Find your career direction." : "Find your major and career fit."}
            </h1>
            <p style={{ margin: 0, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.7 }}>
              {from === "during-college"
                ? "10 questions. No right answers. Based on your responses, we'll surface 2 career tracks that fit how you think and what you value."
                : "10 questions. No right answers. Based on your responses, we'll surface 2 majors and career paths that fit how you think and what you value."}
            </p>
          </div>

          <div style={{ padding: "24px 28px", borderRadius: 16, border: "1px solid var(--card-border)", background: "var(--card-bg)", marginBottom: 24 }}>
            <div style={{ display: "grid", gap: 16 }}>
              {[
                { icon: "⏱️", text: "About 5 minutes" },
                { icon: "🎯", text: "No wrong answers - pick what feels most true" },
                { icon: "📊", text: "Results show your top 2 fits, with majors and career examples" },
                { icon: "🔄", text: "Retake anytime - your answers aren't saved" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep("quiz")}
            style={{ width: "100%", padding: "14px 24px", borderRadius: 12, background: "#8B5CF6", color: "#fff", fontWeight: 950, fontSize: 16, border: "none", cursor: "pointer", letterSpacing: -0.3 }}
          >
            Start quiz
          </button>
        </div>
      </PremiumShell>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  if (step === "results") {
    const [first, second] = scoreAnswers(answers);
    const primary = RESULTS[first];
    const secondary = RESULTS[second];

    return (
      <PremiumShell hideHeader>
        <div style={{ maxWidth: 720, margin: "0 auto", paddingBottom: 80 }}>
          <div style={{ marginBottom: 12 }}>
            <Link href={backHref} style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontWeight: 700 }}>{backLabel}</Link>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 99, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", marginBottom: 14 }}>
              <span style={{ fontSize: 16 }}>🎯</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#8B5CF6", letterSpacing: 0.5 }}>YOUR RESULTS</span>
            </div>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 950, color: "var(--text-primary)", letterSpacing: -0.5 }}>
              Your top fits
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
              Based on your answers - not a definitive answer, but a strong signal.
            </p>
          </div>

          {/* Primary result */}
          <div style={{ padding: "24px 28px", borderRadius: 18, border: `2px solid ${primary.color}40`, background: primary.color + "08", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: primary.color + "20", border: `1px solid ${primary.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{primary.icon}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.6, color: primary.color, textTransform: "uppercase", marginBottom: 3 }}>Strong match</div>
                <div style={{ fontSize: 20, fontWeight: 950, color: "var(--text-primary)" }}>{primary.title}</div>
              </div>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7 }}>{primary.desc}</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: primary.color, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
                  {from === "during-college" ? "Specializations" : "Majors to consider"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {primary.majors.map((m) => (
                    <span key={m} style={{ fontSize: 12, fontWeight: 700, color: primary.color, background: primary.color + "15", padding: "4px 10px", borderRadius: 99 }}>{m}</span>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: primary.color, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Career examples</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {primary.careers.map((c) => (
                    <div key={c} style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: primary.color, fontSize: 10 }}>●</span>{c}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: "10px 14px", borderRadius: 10, background: primary.color + "12", fontSize: 13, fontWeight: 800, color: primary.color }}>
              {primary.salaryRange}
            </div>
          </div>

          {/* Secondary result */}
          <div style={{ padding: "24px 28px", borderRadius: 18, border: `1px solid ${secondary.color}30`, background: "var(--card-bg)", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: secondary.color + "15", border: `1px solid ${secondary.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{secondary.icon}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.6, color: secondary.color, textTransform: "uppercase", marginBottom: 3 }}>Secondary match</div>
                <div style={{ fontSize: 17, fontWeight: 950, color: "var(--text-primary)" }}>{secondary.title}</div>
              </div>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>{secondary.desc}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {secondary.majors.slice(0, 4).map((m) => (
                <span key={m} style={{ fontSize: 12, fontWeight: 700, color: secondary.color, background: secondary.color + "12", padding: "4px 10px", borderRadius: 99 }}>{m}</span>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{ marginBottom: 24, padding: "14px 18px", borderRadius: 12, background: "var(--card-border-soft)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>
            This quiz is a starting point, not a prediction. Many people who thrive in a career didn't major in the obvious subject. Use this to explore - not to decide.
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={restart} style={{ padding: "11px 22px", borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>
              Retake quiz
            </button>
            <Link href={`/career-guide/career-paths?from=${from}`} style={{ padding: "11px 22px", borderRadius: 10, background: "#8B5CF6", color: "#fff", fontWeight: 900, fontSize: 14, textDecoration: "none" }}>
              Explore career paths →
            </Link>
          </div>
        </div>
      </PremiumShell>
    );
  }

  // ── Quiz ───────────────────────────────────────────────────────────────────
  return (
    <PremiumShell hideHeader>
      <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 80 }}>

        {/* Progress */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)" }}>Question {currentQ + 1} of {QUESTIONS.length}</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: "#8B5CF6" }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #8B5CF6, #0EA5E9)", borderRadius: 99, transition: "width 0.3s ease" }} />
          </div>
        </div>

        {/* Question */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 950, color: "var(--text-primary)", lineHeight: 1.3, letterSpacing: -0.4 }}>
            {q.question}
          </h2>
          <div style={{ display: "grid", gap: 10 }}>
            {q.options.map((opt) => {
              const isSelected = selected === opt.category;
              return (
                <button
                  key={opt.category}
                  onClick={() => selectOption(opt.category)}
                  style={{
                    padding: "16px 20px", borderRadius: 14, textAlign: "left", cursor: "pointer",
                    border: `2px solid ${isSelected ? "#8B5CF6" : "var(--card-border)"}`,
                    background: isSelected ? "rgba(139,92,246,0.08)" : "var(--card-bg)",
                    color: isSelected ? "#8B5CF6" : "var(--text-primary)",
                    fontWeight: isSelected ? 900 : 700, fontSize: 14,
                    transition: "all 150ms",
                    display: "flex", alignItems: "center", gap: 14,
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${isSelected ? "#8B5CF6" : "var(--card-border)"}`,
                    background: isSelected ? "#8B5CF6" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isSelected && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>}
                  </div>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <button
            onClick={prevQuestion}
            style={{ padding: "11px 22px", borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-muted)", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
          >
            Back
          </button>
          <button
            onClick={nextQuestion}
            disabled={!selected}
            style={{
              flex: 1, padding: "11px 22px", borderRadius: 10, fontWeight: 900, fontSize: 14,
              background: selected ? "#8B5CF6" : "var(--card-border-soft)",
              color: selected ? "#fff" : "var(--text-muted)",
              border: "none", cursor: selected ? "pointer" : "not-allowed",
              transition: "all 150ms",
            }}
          >
            {currentQ + 1 === QUESTIONS.length ? "See my results" : "Next"}
          </button>
        </div>
      </div>
    </PremiumShell>
  );
}
