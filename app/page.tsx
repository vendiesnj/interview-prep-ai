// app/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Reveal from "@/app/components/Reveal";

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
  aria-label="Interview Performance Coach"
  style={{
    display: "inline-flex",
    textDecoration: "none",
  }}
>
  <div
    style={{
      width: 340,                 // wider
      height: 90,                 // slightly taller
      borderRadius: 22,

      background:
        "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
      border: "1px solid rgba(255,255,255,0.18)",
      boxShadow: "0 25px 70px rgba(0,0,0,0.55)",
      backdropFilter: "blur(12px)",

      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}
  >
    <img
  src="/logo.png"
  alt="Interview Performance Coach"
  style={{
    width: "92%",
    height: "auto",
    display: "block",

    /* vertical centering correction */
    transform: "translateY(6px)",
  }}
/>
  </div>
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
                alignItems: "start",   // 👈 aligns tops perfectly
              }}
            >
           
            <div>

              <Reveal delayMs={80}>
              <div
  className="ipc-fade-up ipc-d1"
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
</Reveal>
          <Reveal delayMs={160}>
              <h1
  className="ipc-fade-up ipc-d2"
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
</Reveal>
        <Reveal delayMs={240}>
              <p
  className="ipc-fade-up ipc-d3"
  style={{
    marginTop: 14,
    fontSize: 16,
    lineHeight: 1.7,
    color: "#9CA3AF",
    maxWidth: 620,
  }}
>
  Get instant STAR breakdowns, clarity & communication scoring, confidence signals, and job-description keyword alignment —
  so you know exactly what to improve before the real thing.
</p>
</Reveal>

        <Reveal delayMs={320}>
            <div
  className="ipc-fade-up ipc-d4"
  style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}
>
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
              </Reveal>

              <div style={{ marginTop: 18, display: "flex", gap: 14, flexWrap: "wrap", color: "#9CA3AF", fontSize: 12 }}>
                <span>✓ 2 minutes to start</span>
                <span>✓ No fluff, just signal</span>
                <span>✓ Built for real interviews</span>
              </div>
            </div>
              

              {/* Hero visual card */}
<Reveal delayMs={420}>
<div
  className="ipc-fade-up ipc-d5"
  style={{
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.12)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
    boxShadow: "0 35px 110px rgba(0,0,0,0.55)",
    overflow: "hidden",
    position: "relative",
  }}
>
  {/* subtle glow */}
  <div
    style={{
      position: "absolute",
      inset: -2,
      background:
        "radial-gradient(500px 220px at 20% 0%, rgba(34,211,238,0.18), transparent 60%), radial-gradient(420px 200px at 90% 10%, rgba(99,102,241,0.14), transparent 55%)",
      pointerEvents: "none",
    }}
  />

  <div style={{ position: "relative" }}>
    <div style={{ padding: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 900, letterSpacing: 0.7 }}>
          SAMPLE FEEDBACK
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 950,
            color: "#A5F3FC",
            border: "1px solid rgba(34,211,238,0.25)",
            background: "rgba(34,211,238,0.08)",
            padding: "6px 10px",
            borderRadius: 999,
          }}
        >
          Overall: 7.6 / 10
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 14, color: "#E5E7EB", fontWeight: 900 }}>
        “Tell me about a time you handled a difficult stakeholder.”
      </div>
    </div>

    <div style={{ padding: 16, display: "grid", gap: 14 }}>
      {/* Metric bars */}
      <BarMetric label="STAR structure" value={7.2} hint="Action strong • Result weak" />
      <BarMetric label="Clarity (comm.)" value={7.8} hint="Clear flow, tighten sentences" />
      <BarMetric label="Confidence" value={6.4} hint="Use more ownership language" />

      {/* Mini trend chart */}
      <div
        style={{
          marginTop: 2,
          padding: 14,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div style={{ color: "#E5E7EB", fontWeight: 950, fontSize: 12 }}>Progress trend</div>
          <div style={{ color: "#9CA3AF", fontSize: 12, fontWeight: 900 }}>Last 5 attempts</div>
        </div>

        <svg viewBox="0 0 320 90" width="100%" height="90" style={{ marginTop: 10, display: "block" }}>
          {/* grid */}
          <path
            d="M0 15 H320 M0 45 H320 M0 75 H320"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
            fill="none"
          />
          {/* line */}
          <path
            d="M10 65 L80 58 L150 52 L220 44 L300 34"
            stroke="rgba(34,211,238,0.75)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* dots */}
          {[
            { x: 10, y: 65 },
            { x: 80, y: 58 },
            { x: 150, y: 52 },
            { x: 220, y: 44 },
            { x: 300, y: 34 },
          ].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="rgba(34,211,238,0.95)" />
          ))}
          {/* glow dots */}
          {[
            { x: 10, y: 65 },
            { x: 80, y: 58 },
            { x: 150, y: 52 },
            { x: 220, y: 44 },
            { x: 300, y: 34 },
          ].map((p, i) => (
            <circle key={`g${i}`} cx={p.x} cy={p.y} r="9" fill="rgba(34,211,238,0.10)" />
          ))}
        </svg>

        <div style={{ marginTop: 8, color: "#9CA3AF", fontSize: 12, lineHeight: 1.6 }}>
          Upward trend. Biggest lift comes from ending with a measurable result.
        </div>
      </div>

      {/* Keyword block */}
      <div
        style={{
          marginTop: 0,
          padding: 12,
          borderRadius: 16,
          border: "1px solid rgba(34,211,238,0.20)",
          background: "rgba(34,211,238,0.07)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ color: "#A5F3FC", fontWeight: 950, fontSize: 12 }}>Keyword alignment</div>
          <div style={{ color: "#9CA3AF", fontWeight: 900, fontSize: 12 }}>Missing: 2</div>
        </div>

        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Chip>forecasting</Chip>
          <Chip>risk mitigation</Chip>
          <Chip kind="ok">stakeholder alignment</Chip>
          <Chip kind="ok">cross-functional</Chip>
        </div>
      </div>

      {/* Next rep */}
      <div
        style={{
          padding: 12,
          borderRadius: 16,
          border: "1px solid rgba(99,102,241,0.20)",
          background: "rgba(99,102,241,0.08)",
          color: "#E5E7EB",
          fontSize: 12,
          lineHeight: 1.7,
        }}
      >
        <span style={{ color: "#C7D2FE", fontWeight: 950 }}>Next rep:</span>{" "}
        lead with the metric, name the constraint, and end with a measurable outcome.
      </div>
    </div>
  </div>
</div>

</Reveal>
          </div>
        </div>
      </section>

      {/* ===== LIGHT SECTIONS (FRESH) ===== */}

      <Reveal durationMs={1100}>
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
            <Reveal delayMs={0} durationMs={900}>
            <LightCard
              title="STAR breakdown"
              body="Situation, Task, Action, Result scored separately so you know exactly what’s missing."
            />
            </Reveal>
            <Reveal delayMs={120} durationMs={900}>
            <LightCard
              title="Clarity + confidence"
              body="Separate signals: structure and clarity vs. ownership language and assertiveness."
            />
            </Reveal>
            <Reveal delayMs={240} durationMs={900}>
            <LightCard
              title="Keyword alignment"
              body="Matches your answer to the job description so you speak the employer’s language."
            />
            </Reveal>
          </div>
        </div>
      </section>
      </Reveal>
      

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

function BarMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: number; // 0-10
  hint: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div style={{ color: "#E5E7EB", fontWeight: 950, fontSize: 12 }}>{label}</div>
        <div style={{ color: "#A5F3FC", fontWeight: 950, fontSize: 12 }}>{value.toFixed(1)}</div>
      </div>

      <div
        style={{
          marginTop: 10,
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background:
              "linear-gradient(90deg, rgba(34,211,238,0.9), rgba(99,102,241,0.75))",
          }}
        />
      </div>

      <div style={{ marginTop: 8, color: "#9CA3AF", fontSize: 12, lineHeight: 1.6 }}>{hint}</div>
    </div>
  );
}

function Chip({ children, kind }: { children: React.ReactNode; kind?: "ok" | "bad" }) {
  const ok = kind === "ok";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "7px 10px",
        borderRadius: 999,
        border: ok ? "1px solid rgba(34,211,238,0.25)" : "1px solid rgba(251,113,133,0.25)",
        background: ok ? "rgba(34,211,238,0.08)" : "rgba(251,113,133,0.10)",
        color: ok ? "#A5F3FC" : "#FDA4AF",
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: 0.2,
      }}
    >
      {children}
    </span>
  );
}