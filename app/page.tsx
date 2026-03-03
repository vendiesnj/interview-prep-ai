import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Logged-in users skip marketing page
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main
      style={{
        background: "#0B1020",
        color: "#E5E7EB",
        padding: "60px 24px",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* HERO */}
        <section style={{ marginBottom: 80 }}>
          <h1 style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.2 }}>
            AI Interview Practice with Structured STAR Feedback
          </h1>

          <p style={{ marginTop: 20, fontSize: 18, color: "#9CA3AF", lineHeight: 1.6 }}>
            Practice real interview questions and receive instant, structured
            feedback. Improve clarity, communication, and confidence using
            measurable STAR-based evaluation.
          </p>

          <div style={{ marginTop: 30, display: "flex", gap: 16 }}>
            <Link
              href="/signup"
              style={{
                padding: "14px 22px",
                borderRadius: 12,
                background: "rgba(34,211,238,0.14)",
                border: "1px solid rgba(34,211,238,0.35)",
                color: "#A5F3FC",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Start Free Practice
            </Link>

            <Link
              href="/login"
              style={{
                padding: "14px 22px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#E5E7EB",
                textDecoration: "none",
              }}
            >
              Log In
            </Link>
          </div>
        </section>

        {/* PROBLEM */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900 }}>
            Interview Preparation Should Be Structured
          </h2>

          <p style={{ marginTop: 20, color: "#9CA3AF", lineHeight: 1.7 }}>
            Most interview practice lacks objective evaluation. Practicing alone
            doesn’t highlight structural gaps. Traditional mock interviews can
            be expensive and inconsistent.
          </p>

          <p style={{ marginTop: 16, color: "#9CA3AF", lineHeight: 1.7 }}>
            Interview Performance Coach evaluates your answers using STAR
            methodology, communication scoring, confidence analysis, and job
            description keyword alignment.
          </p>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900 }}>
            How AI Mock Interview Practice Works
          </h2>

          <div style={{ marginTop: 30, display: "grid", gap: 24 }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800 }}>
                1. Answer Real Interview Questions
              </h3>
              <p style={{ color: "#9CA3AF", lineHeight: 1.7 }}>
                Record or paste your response to behavioral or role-specific
                questions.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800 }}>
                2. Receive STAR Breakdown & Scoring
              </h3>
              <p style={{ color: "#9CA3AF", lineHeight: 1.7 }}>
                Get detailed scoring for Situation, Task, Action, and Result,
                along with communication and confidence insights.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800 }}>
                3. Improve with Actionable Feedback
              </h3>
              <p style={{ color: "#9CA3AF", lineHeight: 1.7 }}>
                Identify missing structure, filler words, unclear results, and
                weak ownership language to continuously improve.
              </p>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900 }}>
            Built for Measurable Interview Improvement
          </h2>

          <ul style={{ marginTop: 20, color: "#9CA3AF", lineHeight: 1.9 }}>
            <li>✔ AI interview feedback engine</li>
            <li>✔ STAR method scoring</li>
            <li>✔ Communication clarity analysis</li>
            <li>✔ Confidence & ownership evaluation</li>
            <li>✔ Keyword alignment with job descriptions</li>
            <li>✔ Progress tracking across sessions</li>
          </ul>
        </section>

        {/* INSTITUTIONAL POSITIONING */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900 }}>
            Designed for Professionals and Career Centers
          </h2>

          <p style={{ marginTop: 20, color: "#9CA3AF", lineHeight: 1.7 }}>
            Interview Performance Coach supports structured communication
            development across behavioral, leadership, and technical interviews.
            The framework enables repeatable evaluation and measurable skill
            progression.
          </p>
        </section>

        {/* CTA */}
        <section style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900 }}>
            Practice with Structure. Interview with Confidence.
          </h2>

          <div style={{ marginTop: 30 }}>
            <Link
              href="/signup"
              style={{
                padding: "16px 28px",
                borderRadius: 14,
                background: "rgba(34,211,238,0.14)",
                border: "1px solid rgba(34,211,238,0.35)",
                color: "#A5F3FC",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Create Free Account
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}