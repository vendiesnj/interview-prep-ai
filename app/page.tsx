import Link from "next/link";
import Reveal from "@/app/components/Reveal";
import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Interview Performance Coach | STAR Scoring + Acoustic Speech Analysis",
  description:
    "The only interview practice tool that analyzes how you sound — not just what you say. Get STAR scoring, filler word tracking, pitch analysis, pace measurement, and delivery archetypes from your recorded answers.",
  keywords:
    "interview practice, STAR method, speech analysis, behavioral interview, mock interview, interview coaching, vocal delivery, filler words, interview prep tool, acoustic analysis",
  openGraph: {
    title: "Interview Performance Coach — Hears What Interviewers Hear",
    description:
      "Other tools read your transcript. IPC analyzes your actual voice — pace, pitch, energy, fillers, and monotone risk — and gives you a named delivery archetype with one coaching lever to pull.",
    type: "website",
  },
};

export default function HomePage() {
  const isAuthed = false;
  const firstName = "there";

  return (
    <main style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font-manrope, var(--font-inter))" }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          width: "100%",
          padding: "34px 24px 84px",
          background: `
            radial-gradient(1000px 500px at 10% -10%, var(--accent-2-soft), transparent 60%),
            radial-gradient(900px 420px at 95% 0%, var(--accent-soft), transparent 60%),
            var(--bg)
          `,
          borderBottom: "1px solid var(--card-border-soft)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          {/* Top nav */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              marginBottom: 52,
              flexWrap: "wrap",
            }}
          >
            <Link href="/" aria-label="Interview Performance Coach" style={{ display: "inline-flex", textDecoration: "none" }}>
              <div
                className="ipc-logo-box"
                style={{
                  width: 320,
                  height: 84,
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--card-border)",
                  background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))",
                  boxShadow: "var(--shadow-card)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  backdropFilter: "blur(10px)",
                }}
              >
                <img src="/logo.png" alt="Interview Performance Coach" style={{ width: "90%", height: "auto", display: "block", transform: "translateY(4px)" }} />
              </div>
            </Link>

            <nav style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {isAuthed ? (
                <>
                  <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontWeight: 900, whiteSpace: "nowrap" }}>
                    Welcome, {firstName}
                  </div>
                  <Link href="/dashboard" style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", color: "var(--accent)", textDecoration: "none", fontWeight: 950, whiteSpace: "nowrap", boxShadow: "var(--shadow-glow)" }}>
                    Open app
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="ipc-nav-login-hide" style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", textDecoration: "none", fontWeight: 900 }}>
                    Log in
                  </Link>
                  <Link href="/signup" style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", color: "var(--accent)", textDecoration: "none", fontWeight: 950, boxShadow: "var(--shadow-glow)" }}>
                    Start free
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Hero content */}
          <div className="ipc-hero-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 28, alignItems: "start" }}>
            <div>
              <Reveal delayMs={80}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 999, border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", color: "var(--accent)", fontSize: 12, fontWeight: 900, letterSpacing: 0.3 }}>
                  The only interview tool that analyzes how you sound — not just what you say
                </div>
              </Reveal>

              <Reveal delayMs={160}>
                <h1 className="ipc-hero-h1" style={{ marginTop: 16, fontSize: 58, lineHeight: 1.02, letterSpacing: -1.4, fontWeight: 1000 as any, color: "var(--text-primary)", maxWidth: 760, fontFamily: "var(--font-manrope)" }}>
                  The only interview coach that hears <span style={{ color: "var(--accent)" }}>what interviewers hear.</span>
                </h1>
              </Reveal>

              <Reveal delayMs={240}>
                <p style={{ marginTop: 16, fontSize: 17, lineHeight: 1.75, color: "var(--text-muted)", maxWidth: 700 }}>
                  Other tools read your transcript and call it analysis. IPC records your actual voice and measures pace, pitch variation, filler rate, vocal energy, and monotone risk — the signals interviewers feel in real time, whether they name them or not.
                </p>
              </Reveal>

              <Reveal delayMs={320}>
                <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {isAuthed ? (
                    <>
                      <Link href="/practice" style={{ padding: "13px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", color: "var(--accent)", textDecoration: "none", fontWeight: 950, minWidth: 180, textAlign: "center", boxShadow: "var(--shadow-glow)" }}>
                        Practice now
                      </Link>
                      <Link href="/question-bank" style={{ padding: "13px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", textDecoration: "none", fontWeight: 900, minWidth: 170, textAlign: "center" }}>
                        Open question bank
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/signup" style={{ padding: "13px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", color: "var(--accent)", textDecoration: "none", fontWeight: 950, minWidth: 190, textAlign: "center", boxShadow: "var(--shadow-glow)" }}>
                        Start free practice
                      </Link>
                      <Link href="/login" style={{ padding: "13px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", textDecoration: "none", fontWeight: 900, minWidth: 120, textAlign: "center" }}>
                        Log in
                      </Link>
                    </>
                  )}
                </div>
              </Reveal>

              <div style={{ marginTop: 18, display: "flex", gap: 14, flexWrap: "wrap", color: "var(--text-muted)", fontSize: 12 }}>
                <span style={{ color: "var(--accent)", fontWeight: 700 }}>✓</span><span>Acoustic voice analysis — not just transcription</span>
                <span style={{ color: "var(--accent)", fontWeight: 700 }}>✓</span><span>STAR scoring with per-component evidence</span>
                <span style={{ color: "var(--accent)", fontWeight: 700 }}>✓</span><span>First rep in under 3 minutes</span>
              </div>
            </div>

            <Reveal delayMs={420}>
              <div className="ipc-hero-preview ipc-glow-border" style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))", boxShadow: "var(--shadow-card)", overflow: "hidden", position: "relative" }}>
                <div style={{ position: "absolute", inset: -1, background: `radial-gradient(500px 240px at 20% 0%, var(--accent-2-soft), transparent 60%), radial-gradient(420px 220px at 90% 10%, var(--accent-soft), transparent 55%)`, pointerEvents: "none" }} />
                <div style={{ position: "relative" }}>
                  <div style={{ padding: 16, borderBottom: "1px solid var(--card-border-soft)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 900, letterSpacing: 0.7 }}>SAMPLE INSIGHT</div>
                      <div style={{ fontSize: 12, fontWeight: 950, color: "var(--accent)", border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", padding: "6px 10px", borderRadius: 999 }}>
                        Overall: 7.8 / 10
                      </div>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 14, color: "var(--text-primary)", fontWeight: 900, lineHeight: 1.6 }}>
                      "Tell me about a time you handled a difficult stakeholder."
                    </div>
                  </div>

                  <div style={{ padding: 16, display: "grid", gap: 14 }}>
                    <BarMetric label="STAR structure" value={7.2} hint="Action is strong. Result needs a clearer metric." />
                    <BarMetric label="Communication" value={7.8} hint="Clear overall flow — tighten the setup." />
                    <BarMetric label="Confidence" value={6.4} hint="Use more ownership language and assertive phrasing." />

                    <div style={{ padding: 14, borderRadius: "var(--radius-lg)", border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                        <div style={{ color: "var(--text-primary)", fontWeight: 950, fontSize: 12 }}>Progress trend</div>
                        <div style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 900 }}>Last 5 attempts</div>
                      </div>
                      <svg viewBox="0 0 320 90" width="100%" height="90" style={{ marginTop: 10, display: "block" }}>
                        <path d="M0 15 H320 M0 45 H320 M0 75 H320" stroke="var(--card-border-soft)" strokeWidth="1" fill="none" />
                        <path d="M10 65 L80 58 L150 52 L220 44 L300 34" stroke="var(--accent)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        {[10, 80, 150, 220, 300].map((x, i) => {
                          const ys = [65, 58, 52, 44, 34];
                          return <circle key={i} cx={x} cy={ys[i]} r="4.5" fill="var(--accent)" />;
                        })}
                      </svg>
                      <div style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>
                        Upward trend. Biggest lift comes from ending with a measurable result.
                      </div>
                    </div>

                    <div style={{ padding: 12, borderRadius: "var(--radius-lg)", border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <div style={{ color: "var(--text-primary)", fontWeight: 950, fontSize: 12 }}>Keyword alignment</div>
                        <div style={{ color: "var(--text-muted)", fontWeight: 900, fontSize: 12 }}>Missing: 2</div>
                      </div>
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <Chip>forecasting</Chip>
                        <Chip>risk mitigation</Chip>
                        <Chip kind="ok">stakeholder alignment</Chip>
                        <Chip kind="ok">cross-functional</Chip>
                      </div>
                    </div>

                    <div style={{ padding: 12, borderRadius: "var(--radius-lg)", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 12, lineHeight: 1.7 }}>
                      <span style={{ color: "var(--accent)", fontWeight: 950 }}>Next rep:</span>{" "}
                      lead with the metric, name the constraint, and end with a measurable outcome.
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────────── */}
      <section style={{ width: "100%", padding: "20px 24px", background: "var(--card-bg)", borderBottom: "1px solid var(--card-border-soft)" }}>
        <div className="ipc-stats-bar" style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "wrap" }}>
          {[
            { stat: "48+", label: "Question categories", d: "ipc-stat-pop-d1" },
            { stat: "6", label: "Delivery signals tracked", d: "ipc-stat-pop-d2" },
            { stat: "STAR", label: "Evidence-based scoring", d: "ipc-stat-pop-d3" },
            { stat: "< 3 min", label: "To your first rep", d: "ipc-stat-pop-d4" },
          ].map(({ stat, label, d }, i, arr) => (
            <div key={label} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ textAlign: "center", padding: "10px 28px" }}>
                <div className={`ipc-stat-pop ${d}`} style={{ fontSize: 36, fontWeight: 950, letterSpacing: -1, color: "var(--accent)", lineHeight: 1 }}>{stat}</div>
                <div style={{ marginTop: 4, fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}>{label}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: 2, height: 44, background: "var(--card-border)", opacity: 0.6, flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="ipc-section" style={{ width: "100%", padding: "76px 24px", background: "var(--bg)", borderBottom: "1px solid var(--card-border-soft)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ maxWidth: 640, marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.8, color: "var(--accent)" }}>THE PROCESS</div>
            <h2 className="ipc-section-h2" style={{ marginTop: 10, fontSize: 38, lineHeight: 1.1, letterSpacing: -0.8, fontWeight: 950, color: "var(--text-primary)", fontFamily: "var(--font-manrope)" }}>
              Four steps. Zero guesswork.
            </h2>
            <p style={{ marginTop: 12, fontSize: 16, lineHeight: 1.75, color: "var(--text-muted)" }}>
              Most interview prep is passive — reading tips, watching videos, thinking through answers. IPC makes practice active, scored, and repeatable.
            </p>
          </div>

          <div style={{ display: "grid", gap: 0 }}>
            {[
              { n: "01", title: "Set your target role", body: "Paste a job description or pick from saved profiles. IPC uses it to generate relevant questions and score keyword alignment in your answers." },
              { n: "02", title: "Answer a question", body: "Speak your answer aloud or type it. Audio responses unlock full delivery analytics — pace, fillers, pitch dynamics, and vocal energy." },
              { n: "03", title: "Get structured feedback", body: "Receive STAR scoring, communication and confidence signals, keyword gaps, delivery analysis, and a rewritten stronger answer within seconds." },
              { n: "04", title: "Track your progress", body: "See performance trends by question type, job profile, and time. Identify your strongest areas and the patterns dragging your score down." },
            ].map(({ n, title, body }) => (
              <Reveal key={n} delayMs={parseInt(n) * 80}>
                <div className="ipc-process-step" style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 28, alignItems: "start", padding: "32px 0", borderTop: "1px solid var(--card-border-soft)", position: "relative" }}>
                  <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "flex-start" }}>
                    <div style={{ fontSize: 80, fontWeight: 950, letterSpacing: -3, color: "var(--accent)", opacity: 0.08, lineHeight: 1, userSelect: "none", position: "absolute", top: -10, left: -4 }}>{n}</div>
                    <div style={{ fontSize: 13, fontWeight: 950, color: "var(--accent)", letterSpacing: 0.6, marginTop: 4, position: "relative", zIndex: 1 }}>{n}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 950, color: "var(--text-primary)", lineHeight: 1.2, fontFamily: "var(--font-manrope)" }}>{title}</div>
                    <p style={{ marginTop: 10, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.75, marginBottom: 0, maxWidth: 680 }}>{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ───────────────────────────────────────────────────── */}
      <section className="ipc-section" style={{ width: "100%", padding: "76px 24px", background: "var(--surface)", borderBottom: "1px solid var(--card-border-soft)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ maxWidth: 680, marginBottom: 44 }}>
            <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.8, color: "var(--accent)" }}>WHY IT&apos;S DIFFERENT</div>
            <h2 className="ipc-section-h2" style={{ marginTop: 10, fontSize: 40, lineHeight: 1.1, letterSpacing: -0.8, fontWeight: 950, color: "var(--text-primary)", fontFamily: "var(--font-manrope)" }}>
              Every other tool reads your transcript.<br />IPC listens to your delivery.
            </h2>
            <p style={{ marginTop: 12, fontSize: 16, lineHeight: 1.75, color: "var(--text-muted)" }}>
              Transcription-based scoring misses the signals interviewers actually notice — pace, energy, pitch flatness, and how your voice sounds under pressure. Those signals live in the audio, not the text.
            </p>
          </div>

          <div className="ipc-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Other tools col */}
            <Reveal delayMs={100}>
              <div style={{ padding: 24, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow-card-soft)" }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--text-muted)", marginBottom: 16, textTransform: "uppercase" as const }}>Other interview tools</div>
                <div style={{ display: "grid", gap: 12 }}>
                  {[
                    "Record your answer",
                    "Transcribe audio → send text to AI",
                    "Return generic feedback on content",
                    "No insight into how you sound",
                    "No delivery signals tracked",
                    "No archetype or pattern diagnosis",
                  ].map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>
                      <span style={{ color: "var(--text-soft)", marginTop: 1, flex: "0 0 auto" }}>✗</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* IPC col */}
            <Reveal delayMs={200}>
              <div style={{ padding: 24, borderRadius: "var(--radius-xl)", border: "1px solid var(--accent-strong)", background: "linear-gradient(160deg, var(--accent-soft) 0%, var(--card-bg) 60%)", boxShadow: "0 0 0 1px var(--accent-strong), var(--shadow-card)" }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--accent)", marginBottom: 16, textTransform: "uppercase" as const }}>Interview Performance Coach</div>
                <div style={{ display: "grid", gap: 12 }}>
                  {[
                    "Record your answer",
                    "Analyze raw audio acoustics directly",
                    "Score STAR structure with component evidence",
                    "Measure pace, pitch, energy, fillers from the waveform",
                    "Track 6 delivery signals across every rep",
                    "Assign a delivery archetype and targeted coaching lever",
                  ].map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5, fontWeight: 500 }}>
                      <span style={{ color: "var(--accent)", marginTop: 1, flex: "0 0 auto", fontWeight: 900 }}>✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── ACOUSTIC SHOWCASE ─────────────────────────────────────────────── */}
      <section className="ipc-section" style={{ width: "100%", padding: "76px 24px", background: "var(--bg)", borderBottom: "1px solid var(--card-border-soft)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ maxWidth: 680, marginBottom: 44 }}>
            <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.8, color: "var(--accent)" }}>ACOUSTIC ANALYSIS</div>
            <h2 className="ipc-section-h2" style={{ marginTop: 10, fontSize: 38, lineHeight: 1.1, letterSpacing: -0.8, fontWeight: 950, color: "var(--text-primary)", fontFamily: "var(--font-manrope)" }}>
              Six signals. One delivery profile. Coaching that's actually specific.
            </h2>
            <p style={{ marginTop: 12, fontSize: 16, lineHeight: 1.75, color: "var(--text-muted)" }}>
              IPC measures six acoustic signals from your recorded answer and combines them into a named delivery archetype — so instead of "speak slower," you get a diagnosis like <em>Flat Articulate</em> or <em>Measured Authority</em> and a single lever to pull.
            </p>
          </div>

          <div className="ipc-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginBottom: 28 }}>
            {[
              { signal: "Pace", detail: "Words per minute — too fast signals nerves; too slow loses the room. IPC shows your WPM and flags the risk zone.", icon: "⏱" },
              { signal: "Filler rate", detail: "Um, uh, like, you know — counted per 100 words. Visible every rep so you see the number fall as you practice.", icon: "🔇" },
              { signal: "Monotone risk", detail: "Pitch flatness score. High monotone collapses differently depending on your pace and energy — IPC reads the combination.", icon: "〰" },
              { signal: "Pitch variation", detail: "How much your pitch moves across the answer. Natural variation signals engagement and authority.", icon: "🎵" },
              { signal: "Vocal energy", detail: "Volume and amplitude dynamics over time. Energy drops at the end of sentences are a common credibility leak.", icon: "⚡" },
              { signal: "Tempo shifts", detail: "Whether your pace stays flat or varies strategically. Practiced speakers slow down at key moments.", icon: "📈" },
            ].map(({ signal, detail, icon }) => (
              <Reveal key={signal} delayMs={80}>
                <div className="ipc-card-lift" style={{ padding: 20, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))", boxShadow: "var(--shadow-card-soft)" }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 950, color: "var(--text-primary)", marginBottom: 6 }}>{signal}</div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>{detail}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delayMs={120}>
            <div style={{ padding: "20px 24px", borderRadius: "var(--radius-xl)", border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 950, color: "var(--accent)" }}>9 named delivery archetypes</div>
                <div style={{ marginTop: 4, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  Controlled &amp; Clear · Measured Authority · Flat Articulate · Enthusiastic Rush · Quiet Credibility · and four more — each with a specific coaching lever, not generic tips.
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 900, whiteSpace: "nowrap" as const }}>Assigned after every recorded rep →</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CORE FEATURES ────────────────────────────────────────────────── */}
      <section className="ipc-section" style={{ width: "100%", padding: "76px 24px", background: "var(--bg)", borderBottom: "1px solid var(--card-border-soft)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ maxWidth: 760 }}>
            <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.8, color: "var(--accent)" }}>WHAT'S INSIDE</div>
            <h2 className="ipc-section-h2" style={{ marginTop: 10, fontSize: 38, lineHeight: 1.1, letterSpacing: -0.8, fontWeight: 950, color: "var(--text-primary)", fontFamily: "var(--font-manrope)" }}>
              Built for the full practice loop — not just one rep.
            </h2>
          </div>

          <div className="ipc-grid-2" style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <FeatureCard
                eyebrow="Practice"
                title="Role-based interview practice"
                body="Paste a job description or use a saved profile to generate tailored questions for the role you actually want."
                bullets={["Question bank for 48+ saved prompts", "Behavioral, technical, and role-specific practice", "Custom questions for full control"]}
              />
            </div>
            <FeatureCard
              eyebrow="Results"
              title="Single-attempt analysis that feels actionable"
              body="Every attempt gets structured feedback, delivery breakdowns, and coaching that tells you exactly what to improve on your next rep."
              bullets={["STAR scoring with per-component evidence excerpts", "Confidence and communication scoring", "Keyword alignment and stronger-answer rewrites"]}
            />
            <FeatureCard
              eyebrow="Delivery"
              title="Speech analytics beyond the transcript"
              body="Improve how you sound, not just what you say — with pace, fillers, monotone risk, pitch variety, and energy analysis."
              bullets={["WPM and filler rate tracking", "Vocal presence and rhythm scoring", "Timeline view of speech dynamics"]}
            />
            <FeatureCard
              eyebrow="Insights"
              title="Track progress over time"
              body="See where you're strongest, where you struggle, and how performance changes across categories and job profiles."
              bullets={["Performance by question type and role", "Score trajectory and trend detection", "Weak-spot identification across sessions"]}
            />
          </div>
        </div>
      </section>

      {/* ── STAR METHOD EXPLAINER (SEO) ───────────────────────────────────── */}
      <section className="ipc-section" style={{ width: "100%", padding: "80px 24px", background: "var(--surface)", borderBottom: "1px solid var(--card-border-soft)" }}>
        <div className="ipc-star-grid" style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.8, color: "var(--accent)" }}>THE STAR METHOD</div>
            <h2 className="ipc-section-h2" style={{ marginTop: 10, fontSize: 36, lineHeight: 1.15, letterSpacing: -0.7, fontWeight: 950, color: "var(--text-primary)", fontFamily: "var(--font-manrope)" }}>
              Why STAR structure is the most reliable interview framework — and how IPC scores it.
            </h2>
            <p style={{ marginTop: 14, fontSize: 15, lineHeight: 1.8, color: "var(--text-muted)" }}>
              The STAR method (Situation, Task, Action, Result) is the standard structure for behavioral interview answers. Interviewers at every level — from entry-level to executive roles — use it to evaluate whether candidates can communicate clearly, show ownership, and deliver measurable impact.
            </p>
            <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.8, color: "var(--text-muted)" }}>
              IPC scores each STAR component separately so you can see exactly where your answer breaks down. Most candidates are weakest on Result — they describe what they did but not what changed as a consequence. That single fix is often worth 10–15 points on your overall score.
            </p>
            <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.8, color: "var(--text-muted)" }}>
              Beyond STAR, IPC also evaluates relevance (did you answer the actual question?), keyword alignment with the job description, confidence signals in your language, and the full acoustic profile of your delivery.
            </p>
            <Link
              href={isAuthed ? "/practice" : "/signup"}
              style={{ display: "inline-block", marginTop: 20, padding: "12px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", color: "var(--accent)", textDecoration: "none", fontWeight: 950, boxShadow: "var(--shadow-glow)" }}
            >
              Try STAR scoring now →
            </Link>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {[
              { letter: "S", label: "Situation", desc: "Set the scene in one to two sentences. Name the context, stakes, or constraint — but keep it brief. Interviewers don't need backstory; they need enough to follow the rest.", d: "ipc-slide-in-d1" },
              { letter: "T", label: "Task", desc: "State your specific role or responsibility in the situation. Use first-person language — 'I was responsible for…', 'My task was to…'. Make it clear what you personally owned.", d: "ipc-slide-in-d2" },
              { letter: "A", label: "Action", desc: "Describe what you did, step by step. This is where most of your answer should live. Use strong verbs and be specific — what decision did you make, what did you build, who did you influence?", d: "ipc-slide-in-d3" },
              { letter: "R", label: "Result", desc: "Close with a specific outcome. Quantify if you can — percentages, dollars, time saved, retention rates. If you can't quantify, describe the concrete change: what improved, what was prevented, what was unlocked.", d: "ipc-slide-in-d4" },
            ].map(({ letter, label, desc, d }) => (
              <div key={letter} className={`ipc-slide-in ipc-card-lift ${d}`} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: 18, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))", boxShadow: "var(--shadow-card-soft)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-soft)", border: "1px solid var(--accent-strong)", color: "var(--accent)", fontSize: 16, fontWeight: 950, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
                  {letter}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 950, color: "var(--text-primary)" }}>{label}</div>
                  <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65, marginBottom: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────────────────── */}
      <section className="ipc-section" style={{ width: "100%", padding: "72px 24px", background: "var(--bg)", borderBottom: "1px solid var(--card-border-soft)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.8, color: "var(--accent)", marginBottom: 32, textAlign: "center" }}>IN THEIR WORDS</div>

          {/* Featured quote — full width */}
          <blockquote className="ipc-card-lift" style={{ margin: "0 0 16px 0", padding: "28px 32px", borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))", boxShadow: "var(--shadow-card-soft)", position: "relative", borderLeft: "3px solid var(--accent)", paddingLeft: 32 }}>
            <div style={{ fontSize: 72, fontWeight: 950, color: "var(--accent)", opacity: 0.15, lineHeight: 1, position: "absolute", top: 12, left: 20, fontFamily: "Georgia, serif", userSelect: "none" }}>"</div>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: "var(--text-primary)", fontStyle: "italic", margin: 0, position: "relative", zIndex: 1 }}>
              "Our career center needed a tool that could give students structured feedback without requiring a human coach for every session. IPC does that — scored, consistent, and detailed enough to act on."
            </p>
            <footer style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)" }}>Career Advisor</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>University Career Center</div>
            </footer>
          </blockquote>

          {/* Two equal quotes below */}
          <div className="ipc-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { quote: "I went from rambling answers with no structure to clean STAR responses in about two weeks. The Result score feedback was the thing that clicked — I kept ending on the action and not the outcome.", name: "Marketing Manager", context: "Switched roles after 6 years" },
              { quote: "The filler word tracking was humbling. I didn't realize I was saying 'um' 14 times per answer. Seeing the exact count every rep made it impossible to ignore, and I fixed it faster than I expected.", name: "Software Engineer", context: "Preparing for senior-level interviews" },
            ].map(({ quote, name, context }) => (
              <blockquote key={name} className="ipc-card-lift" style={{ margin: 0, padding: 22, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))", boxShadow: "var(--shadow-card-soft)" }}>
                <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text-primary)", fontStyle: "italic", margin: 0 }}>"{quote}"</p>
                <footer style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)" }}>{name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{context}</div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* ── AUDIENCE STRIP ───────────────────────────────────────────────── */}
      <section className="ipc-section" style={{ width: "100%", padding: "72px 24px", background: "var(--surface)", borderBottom: "1px solid var(--card-border-soft)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.8, color: "var(--accent)", marginBottom: 16 }}>BUILT FOR</div>
          <h2 className="ipc-section-h2" style={{ marginTop: 0, marginBottom: 28, fontSize: 36, lineHeight: 1.15, letterSpacing: -0.7, fontWeight: 950, color: "var(--text-primary)", fontFamily: "var(--font-manrope)" }}>
            Two paths. Same goal: walk in prepared.
          </h2>
          <div className="ipc-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <AudienceCard
              title="Job seekers"
              body="Practice on your own schedule, build stronger structured answers, and walk into interviews with the confidence that comes from reps — not just reading tips."
              bullets={["Behavioral, technical, and situational question types", "Role-specific questions from your job description", "Voice delivery coaching alongside content scoring"]}
            />
            <AudienceCard
              title="Universities and career centers"
              body="Give every student access to structured, scored practice without requiring a human coach for every session. Track cohort-level progress, identify at-risk students, and demonstrate placement outcomes."
              bullets={["Admin dashboard with student roster and progress data", "Cohort-level scoring and delivery analytics", "White-label theming for institutional branding"]}
            />
          </div>
        </div>
      </section>

      {/* ── INTERVIEW TIPS (SEO ARTICLES) ────────────────────────────────── */}
      <section className="ipc-section" style={{ width: "100%", padding: "80px 24px", background: "var(--bg)", borderBottom: "1px solid var(--card-border-soft)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.8, color: "var(--accent)" }}>GUIDES</div>
          <h2 className="ipc-section-h2" style={{ marginTop: 10, fontSize: 36, lineHeight: 1.15, letterSpacing: -0.7, fontWeight: 950, color: "var(--text-primary)", maxWidth: 760, fontFamily: "var(--font-manrope)" }}>
            What actually moves the needle in interview prep.
          </h2>
          <p style={{ marginTop: 12, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.75, maxWidth: 720 }}>
            The most common interview mistakes are fixable with the right framework. Here's what the research and patterns from thousands of practice sessions show actually moves the needle.
          </p>

          <div className="ipc-grid-3" style={{ marginTop: 36, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            <article className="ipc-card-lift" style={{ padding: 22, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))", boxShadow: "var(--shadow-card-soft)" }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.7, color: "var(--accent)", textTransform: "uppercase" as const, marginBottom: 10 }}>Delivery</div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 950, color: "var(--text-primary)", lineHeight: 1.3, fontFamily: "var(--font-manrope)" }}>
                How to reduce filler words in interview answers
              </h3>
              <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75 }}>
                Filler words (um, uh, like, you know) are the single most visible delivery problem in interview practice — and one of the fastest to fix. The key is not trying to suppress them but replacing them with something deliberate: a pause.
              </p>
              <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75 }}>
                A one-beat silence after a sentence sounds more confident than any transition word. Interviewers perceive pauses as thoughtfulness, not hesitation. IPC tracks your filler rate per 100 words across every rep so you can see the number fall as you practice.
              </p>
              <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75 }}>
                Target: under 5 fillers per 100 words. Most candidates start at 10–20. Three to five focused practice sessions with feedback is enough to cut that in half.
              </p>
            </article>

            <article className="ipc-card-lift" style={{ padding: 22, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))", boxShadow: "var(--shadow-card-soft)" }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.7, color: "var(--accent)", textTransform: "uppercase" as const, marginBottom: 10 }}>Structure</div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 950, color: "var(--text-primary)", lineHeight: 1.3, fontFamily: "var(--font-manrope)" }}>
                The most common STAR method mistakes — and how to fix them
              </h3>
              <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75 }}>
                Most candidates understand the STAR framework in theory but struggle to apply it under pressure. The most common mistakes: spending too long on Situation and Task (setup), underdelivering on Action (what you specifically did), and skipping or rushing the Result.
              </p>
              <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75 }}>
                A well-structured STAR answer allocates roughly 10% to Situation, 10% to Task, 60% to Action, and 20% to Result. The Result is where the answer lands — it's what the interviewer walks away remembering. If it's vague or missing, the whole answer loses impact regardless of how strong the Action was.
              </p>
              <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75 }}>
                IPC shows you per-component STAR scores with evidence excerpts from your own transcript so you can see exactly which element is dragging your score down.
              </p>
            </article>

            <article className="ipc-card-lift" style={{ padding: 22, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))", boxShadow: "var(--shadow-card-soft)" }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.7, color: "var(--accent)", textTransform: "uppercase" as const, marginBottom: 10 }}>Confidence</div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 950, color: "var(--text-primary)", lineHeight: 1.3, fontFamily: "var(--font-manrope)" }}>
                How to sound more confident in interviews without faking it
              </h3>
              <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75 }}>
                Confidence in an interview isn't a personality trait — it's a set of language and delivery patterns that can be practiced. The biggest signals interviewers pick up on: first-person ownership language, assertive phrasing, pace control, and vocal variety on key sentences.
              </p>
              <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75 }}>
                Hedging language ("I kind of led", "we sort of figured out", "I think I helped with") is the most common confidence leak. Every hedged phrase signals uncertainty about your own contribution. Replace hedges with direct ownership: "I led", "I decided", "my approach was".
              </p>
              <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.75 }}>
                Vocal confidence compounds with structure. When you know where your answer is going (STAR), your pace slows naturally, your voice steadies, and your delivery sounds more assured — not because you're performing confidence, but because you're not hunting for the next sentence.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ── FAQ (SEO) ─────────────────────────────────────────────────────── */}
      <section className="ipc-section-narrow" style={{ width: "100%", padding: "80px 24px", background: "var(--surface)", borderBottom: "1px solid var(--card-border-soft)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.8, color: "var(--accent)", textAlign: "center" }}>QUESTIONS</div>
          <h2 className="ipc-section-h2" style={{ marginTop: 10, fontSize: 36, lineHeight: 1.15, letterSpacing: -0.7, fontWeight: 950, color: "var(--text-primary)", textAlign: "center", fontFamily: "var(--font-manrope)" }}>
            Everything you need to know before your first practice rep.
          </h2>

          <div style={{ marginTop: 40, display: "grid", gap: 0 }}>
            {[
              {
                q: "What types of interview questions does IPC support?",
                a: "IPC supports behavioral questions (tell me about a time…), situational questions (what would you do if…), technical explanation questions, and role-specific questions generated from your job description. The question bank includes 48+ categories covering leadership, conflict, teamwork, problem-solving, analytical skills, communication, and more."
              },
              {
                q: "How does STAR scoring work?",
                a: "After you answer a question, IPC evaluates your response against the STAR framework — scoring Situation, Task, Action, and Result separately on a 0–10 scale. It also extracts evidence excerpts directly from your transcript to show you which sentences contributed to each component's score. The overall score combines STAR structure with communication quality, confidence signals, and role relevance."
              },
              {
                q: "Does IPC analyze my speaking voice?",
                a: "Yes. When you record a spoken answer, IPC analyzes pace (words per minute), filler word frequency (um, uh, like, you know), monotone risk, pitch variation, energy dynamics, and tempo changes over the course of your answer. These delivery metrics are shown alongside your content scores so you can improve both simultaneously."
              },
              {
                q: "What is a good interview score?",
                a: "Scores above 70/100 indicate a structured, relevant, and well-delivered answer. Scores of 80+ are strong and reflect an answer that would likely perform well in a real interview setting. Most first attempts land between 45–65 — meaningful improvement after reviewing feedback and doing a second rep is common and expected."
              },
              {
                q: "How is IPC different from ChatGPT for interview practice?",
                a: "General AI tools can generate questions and review text, but they don't score your answers against a consistent rubric, analyze your delivery, track your progress across sessions, or tell you specifically what to fix next. IPC is purpose-built for interview practice — every score, metric, and feedback item is designed around what actually matters in a real interview."
              },
              {
                q: "Can universities and career centers use IPC?",
                a: "Yes. IPC has an institutional tier with an admin dashboard that shows student roster, individual attempt history, cohort-level performance, at-risk flagging, and delivery analytics. Institutional accounts support custom branding and domain-based enrollment. Contact us to learn more."
              },
              {
                q: "Is there a free plan?",
                a: "Yes. Free accounts include access to practice, basic scoring, and a limited number of attempts. Paid plans unlock unlimited practice, full delivery analytics, progress tracking across all sessions, and the complete question bank."
              },
            ].map(({ q, a }, i) => (
              <FaqRow key={i} question={q} answer={a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ width: "100%", background: "var(--bg)", color: "var(--text-primary)", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))", padding: 26, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap", boxShadow: "var(--shadow-card)" }}>
            <div style={{ maxWidth: 720 }}>
              <div style={{ fontSize: 12, fontWeight: 950, letterSpacing: 0.8, color: "var(--accent)" }}>GET STARTED</div>
              <div style={{ marginTop: 8, fontSize: 28, fontWeight: 950, letterSpacing: -0.4, color: "var(--text-primary)", fontFamily: "var(--font-manrope)" }}>
                One practice session is enough to show you what's missing.
              </div>
              <div style={{ marginTop: 8, color: "var(--text-muted)", lineHeight: 1.7 }}>
                Create an account, choose a role, and run your first rep with structured feedback and insights.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href={isAuthed ? "/practice" : "/signup"} className="ipc-cta-pulse" style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", color: "var(--accent)", textDecoration: "none", fontWeight: 950, minWidth: 180, textAlign: "center", boxShadow: "var(--shadow-glow)", display: "inline-block" }}>
                {isAuthed ? "Practice now" : "Start free practice"}
              </Link>
              <Link href={isAuthed ? "/dashboard" : "/login"} style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", textDecoration: "none", fontWeight: 900, minWidth: 120, textAlign: "center" }}>
                {isAuthed ? "Open dashboard" : "Log in"}
              </Link>
            </div>
          </div>

          <footer style={{ marginTop: 22, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ color: "var(--text-muted)", fontSize: 12 }}>© {new Date().getFullYear()} Interview Performance Coach</div>
            <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
              <Link href="/privacy" style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 800 }}>Privacy</Link>
              <Link href="/terms" style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 800 }}>Terms</Link>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}

// ── UI components ─────────────────────────────────────────────────────────────

function FaqRow({ question, answer }: { question: string; answer: string }) {
  return (
    <details
      style={{
        borderTop: "1px solid var(--card-border-soft)",
        padding: "20px 0",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontSize: 16,
          fontWeight: 700,
          color: "var(--text-primary)",
          lineHeight: 1.4,
          listStyle: "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span>{question}</span>
        <span style={{ fontSize: 20, color: "var(--text-muted)", flex: "0 0 auto", fontWeight: 300 }}>+</span>
      </summary>
      <p style={{ marginTop: 14, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.8, marginBottom: 0 }}>{answer}</p>
    </details>
  );
}


function FeatureCard({ eyebrow, title, body, bullets }: { eyebrow: string; title: string; body: string; bullets: string[] }) {
  return (
    <div className="ipc-card-lift" style={{ padding: 20, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))", boxShadow: "var(--shadow-card-soft)" }}>
      <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: 0.8, color: "var(--accent)" }}>{eyebrow}</div>
      <div style={{ marginTop: 10, fontSize: 20, fontWeight: 950, lineHeight: 1.2, color: "var(--text-primary)" }}>{title}</div>
      <div style={{ marginTop: 10, color: "var(--text-muted)", lineHeight: 1.7, fontSize: 14 }}>{body}</div>
      <ul style={{ marginTop: 14, marginBottom: 0, paddingLeft: 18, lineHeight: 1.7, color: "var(--text-primary)", fontSize: 13 }}>
        {bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
    </div>
  );
}

function AudienceCard({ title, body, bullets }: { title: string; body: string; bullets: string[] }) {
  return (
    <div className="ipc-card-lift" style={{ padding: 22, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", boxShadow: "var(--shadow-card-soft)" }}>
      <div style={{ fontWeight: 950, marginBottom: 8, color: "var(--text-primary)", fontSize: 18 }}>{title}</div>
      <div style={{ color: "var(--text-muted)", lineHeight: 1.7, fontSize: 14 }}>{body}</div>
      <ul style={{ marginTop: 14, marginBottom: 0, paddingLeft: 18, lineHeight: 1.8, color: "var(--text-primary)", fontSize: 13 }}>
        {bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
    </div>
  );
}

function BarMetric({ label, value, hint }: { label: string; value: number; hint: string }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <div style={{ padding: 14, borderRadius: "var(--radius-lg)", border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div style={{ color: "var(--text-primary)", fontWeight: 950, fontSize: 12 }}>{label}</div>
        <div style={{ color: "var(--accent)", fontWeight: 950, fontSize: 12 }}>{value.toFixed(1)}</div>
      </div>
      <div style={{ marginTop: 10, height: 10, borderRadius: 999, background: "var(--card-border-soft)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, var(--accent-2), var(--accent))" }} />
      </div>
      <div style={{ marginTop: 8, color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>{hint}</div>
    </div>
  );
}

function Chip({ children, kind }: { children: React.ReactNode; kind?: "ok" | "bad" }) {
  const ok = kind === "ok";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "7px 10px", borderRadius: 999, border: ok ? "1px solid var(--accent-strong)" : "1px solid color-mix(in srgb, var(--danger) 35%, transparent)", background: ok ? "var(--accent-soft)" : "var(--danger-soft)", color: ok ? "var(--accent)" : "var(--danger)", fontSize: 12, fontWeight: 900, letterSpacing: 0.2 }}>
      {children}
    </span>
  );
}
