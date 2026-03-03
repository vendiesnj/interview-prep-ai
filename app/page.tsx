// app/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function HomePage() {
  // If user is logged in, send them straight into the app
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    redirect("/dashboard");
  }

  return (
    <main style={{ width: "100%", minHeight: "100vh" }}>
      {/* ===== HERO (DARK) ===== */}
      <section
        style={{
          width: "100%",
          padding: "84px 24px 64px",
          background:
            "radial-gradient(1100px 700px at 18% 0%, rgba(34,211,238,0.18), transparent 55%), radial-gradient(900px 600px at 78% 10%, rgba(99,102,241,0.12), transparent 60%), rgba(3,7,18,1)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          {/* Top bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 42,
            }}
          >
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                color: "#E5E7EB",
                fontWeight: 950,
                letterSpacing: 0.2,
              }}
            >
              {/* Optional: put your logo at /public/logo.png */}
              {/* <img src="/logo.png" alt="Interview Performance Coach" style={{ width: 34, height: 34 }} /> */}
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 950,
                }}
              >
                IPC
              </div>
              <span style={{ fontSize: 14, opacity: 0.95 }}>Interview Performance Coach</span>
            </Link>

            <div style={{ display: "flex", gap: 10 }}>
              <Link
                href="/login"
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#E5E7EB",
                  textDecoration: "none",
                  fontWeight: 900,
                }}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(34,211,238,0.35)",
                  background: "rgba(34,211,238,0.14)",
                  color: "#A5F3FC",
                  textDecoration: "none",
                  fontWeight: 950,
                }}
              >
                Start free
              </Link>
            </div>
          </div>

          {/* Hero grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.15fr 0.85fr",
              gap: 28,
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#9CA3AF",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 0.3,
                }}
              >
                STAR feedback • Confidence scoring • Keyword alignment
              </div>

              <h1
                style={{
                  marginTop: 14,
                  fontSize: 52,
                  lineHeight: 1.02,
                  letterSpacing: -1.2,
                  fontWeight: 1000 as any,
                  color: "#E5E7EB",
                }}
              >
                Practice interviews with structured, measurable feedback.
              </h1>

              <p style={{ marginTop: 14, fontSize: 16, lineHeight: 1.7, color: "#9CA3AF", maxWidth: 620 }}>
                Get instant STAR breakdowns, clarity & communication scoring, confidence signals, and job-description keyword alignment —
                so you know exactly what to improve before the real thing.
              </p>

              <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link
                  href="/signup"
                  style={{
                    padding: "12px 16px",
                    borderRadius: 14,
                    border: "1px solid rgba(34,211,238,0.35)",
                    background: "rgba(34,211,238,0.14)",
                    color: "#A5F3FC",
                    textDecoration: "none",
                    fontWeight: 950,
                    minWidth: 170,
                    textAlign: "center",
                  }}
                >
                  Start Free Practice
                </Link>

                <Link
                  href="/login"
                  style={{
                    padding: "12px 16px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#E5E7EB",
                    textDecoration: "none",
                    fontWeight: 900,
                    minWidth: 120,
                    textAlign: "center",
                  }}
                >
                  Log in
                </Link>
              </div>

              <div style={{ marginTop: 18, display: "flex", gap: 14, flexWrap: "wrap", color: "#9CA3AF", fontSize: 12 }}>
                <span>✓ 2 minutes to start</span>
                <span>✓ No fluff, just signal</span>
                <span>✓ Built for real interviews</span>
              </div>
            </div>

            {/* Hero visual card */}
            <div
              style={{
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
                boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 900, letterSpacing: 0.7 }}>SAMPLE FEEDBACK</div>
                <div style={{ marginTop: 8, fontSize: 14, color: "#E5E7EB", fontWeight: 900 }}>
                  “Tell me about a time you handled a difficult stakeholder.”
                </div>
              </div>

              <div style={{ padding: 16, display: "grid", gap: 12 }}>
                <MiniRow label="Overall score" value="7.6 / 10" />
                <MiniRow label="STAR structure" value="Action is strong • Result is weak" />
                <MiniRow label="Confidence" value="More ownership language needed" />
                <MiniRow label="Keywords" value="Missing: forecasting, risk mitigation" />

                <div
                  style={{
                    marginTop: 6,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(34,211,238,0.25)",
                    background: "rgba(34,211,238,0.07)",
                    color: "#A5F3FC",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  Next rep: lead with the metric, name the constraint, and end with a measurable outcome.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== LIGHT SECTIONS (FRESH) ===== */}
      <section
        style={{
          width: "100%",
          background: "#FFFFFF",
          color: "#0B1220",
          padding: "72px 24px",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.8, color: "#2563EB" }}>WHY IT WORKS</div>
            <h2 style={{ marginTop: 10, fontSize: 40, lineHeight: 1.1, letterSpacing: -0.8, fontWeight: 950 }}>
              Interview prep should be structured.
            </h2>
            <p style={{ marginTop: 12, fontSize: 16, lineHeight: 1.75, color: "#475569" }}>
              Most practice is subjective. IPC gives you repeatable scoring and specific next steps, so every attempt moves you closer to a
              crisp, high-signal answer.
            </p>
          </div>

          <div
            style={{
              marginTop: 28,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            <LightCard
              title="STAR breakdown"
              body="Situation, Task, Action, Result scored separately so you know exactly what’s missing."
            />
            <LightCard
              title="Clarity + confidence"
              body="Separate signals: structure and clarity vs. ownership language and assertiveness."
            />
            <LightCard
              title="Keyword alignment"
              body="Matches your answer to the job description so you speak the employer’s language."
            />
          </div>
        </div>
      </section>

      {/* ===== DARK STRIPE (RHYTHM) ===== */}
      <section
        style={{
          width: "100%",
          padding: "72px 24px",
          background: "rgba(3,7,18,1)",
          color: "#E5E7EB",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div
            style={{
              padding: 18,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ fontWeight: 950, marginBottom: 8 }}>For job seekers</div>
            <div style={{ color: "#9CA3AF", lineHeight: 1.7 }}>
              Practice on your schedule, track progress, and walk into interviews with answers that are structured and confident.
            </div>
          </div>

          <div
            style={{
              padding: 18,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ fontWeight: 950, marginBottom: 8 }}>For colleges (coming soon)</div>
            <div style={{ color: "#9CA3AF", lineHeight: 1.7 }}>
              Cohorts, reporting, and outcomes-ready metrics for career centers and programs.
            </div>
          </div>
        </div>
      </section>

      {/* ===== LIGHT CTA ===== */}
      <section style={{ width: "100%", background: "#F8FAFC", color: "#0B1220", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div
            style={{
              borderRadius: 22,
              border: "1px solid rgba(2,6,23,0.08)",
              background: "#FFFFFF",
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              boxShadow: "0 20px 60px rgba(2,6,23,0.08)",
            }}
          >
            <div style={{ maxWidth: 680 }}>
              <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.8, color: "#0EA5E9" }}>GET STARTED</div>
              <div style={{ marginTop: 8, fontSize: 26, fontWeight: 950, letterSpacing: -0.4 }}>
                Start practicing in minutes.
              </div>
              <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
                Create an account, paste a job description, and run your first rep.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Link
                href="/signup"
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "1px solid rgba(14,165,233,0.35)",
                  background: "rgba(14,165,233,0.12)",
                  color: "#0369A1",
                  textDecoration: "none",
                  fontWeight: 950,
                  minWidth: 170,
                  textAlign: "center",
                }}
              >
                Start Free Practice
              </Link>
              <Link
                href="/login"
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "1px solid rgba(2,6,23,0.12)",
                  background: "#FFFFFF",
                  color: "#0B1220",
                  textDecoration: "none",
                  fontWeight: 900,
                  minWidth: 120,
                  textAlign: "center",
                }}
              >
                Log in
              </Link>
            </div>
          </div>

          <footer style={{ marginTop: 22, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ color: "#64748B", fontSize: 12 }}>
              © {new Date().getFullYear()} Interview Performance Coach
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
              <Link href="/privacy" style={{ color: "#64748B", textDecoration: "none", fontWeight: 800 }}>
                Privacy
              </Link>
              <Link href="/terms" style={{ color: "#64748B", textDecoration: "none", fontWeight: 800 }}>
                Terms
              </Link>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
      <div style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 900 }}>{label}</div>
      <div style={{ color: "#E5E7EB", fontSize: 12, fontWeight: 900, textAlign: "right" }}>{value}</div>
    </div>
  );
}

function LightCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        border: "1px solid rgba(2,6,23,0.10)",
        background: "#FFFFFF",
        boxShadow: "0 18px 50px rgba(2,6,23,0.06)",
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 14 }}>{title}</div>
      <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7, fontSize: 14 }}>{body}</div>
    </div>
  );
}