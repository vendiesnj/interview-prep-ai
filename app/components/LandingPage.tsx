"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ── Fade-in wrapper ─────────────────────────────────────── */
function Fade({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(12px)",
      transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

/* ── Dimension score bar ─────────────────────────────────── */
function DimBar({ label, score, color, delay = 0 }: { label: string; score: number; color: string; delay?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), delay + 200); return () => clearTimeout(t); }, [delay]);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#78716C", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{score.toFixed(1)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "rgba(28,25,23,0.08)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99, background: color,
          width: mounted ? `${score * 10}%` : "0%",
          transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
          opacity: 0.85,
        }} />
      </div>
    </div>
  );
}

/* ── Main landing page ───────────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ background: "#F5EEE0", color: "#1C1917", minHeight: "100vh", fontFamily: "inherit" }}>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        padding: "0 24px",
        height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(245,238,224,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(28,25,23,0.08)",
      }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <img src="/signal-logo.svg" alt="Signal" style={{ height: 28 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).insertAdjacentHTML("afterend", '<span style="font-weight:800;font-size:18px;letter-spacing:-0.3px;color:#1C1917">Signal</span>'); }} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/login" className="ipc-nav-login-hide" style={{
            padding: "8px 16px", borderRadius: 8,
            color: "#78716C", textDecoration: "none",
            fontWeight: 600, fontSize: 14,
          }}>
            Log in
          </Link>
          <Link href="/signup" style={{
            padding: "8px 18px", borderRadius: 8,
            background: "#4F46E5",
            color: "#fff", textDecoration: "none",
            fontWeight: 700, fontSize: 14,
          }}>
            Get started free
          </Link>
        </div>
      </nav>

      <main>

        {/* ── Hero ────────────────────────────────────────────── */}
        <section aria-label="Hero" style={{
          minHeight: "calc(100vh - 60px)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "60px 24px 80px",
          position: "relative", overflow: "hidden",
        }}>
          {/* Subtle warm gradient wash */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(900px 600px at 70% 30%, rgba(79,70,229,0.06), transparent 60%), radial-gradient(700px 500px at 10% 80%, rgba(217,119,6,0.07), transparent 55%)",
          }} />
          <HeroContent />
        </section>

        {/* ── Stats bar ───────────────────────────────────────── */}
        <div className="ipc-stats-bar" style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          borderTop: "1px solid rgba(28,25,23,0.07)",
          borderBottom: "1px solid rgba(28,25,23,0.07)",
          background: "#FDFAF4",
        }}>
          {[
            { val: "8", label: "Communication dimensions scored" },
            { val: "12", label: "Distinct communication archetypes" },
            { val: "3", label: "Free sessions to start" },
            { val: "2 min", label: "To your first full analysis" },
          ].map((s, i) => (
            <div key={i} className={`ipc-stat-pop ipc-stat-pop-d${i + 1}`} style={{
              padding: "28px 24px",
              borderRight: i < 3 ? "1px solid rgba(28,25,23,0.07)" : "none",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "clamp(26px,3.5vw,36px)", fontWeight: 800, letterSpacing: -0.5, color: "#4F46E5", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#78716C", marginTop: 6, lineHeight: 1.4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── How it works ────────────────────────────────────── */}
        <section className="ipc-section" aria-label="How it works" style={{ padding: "96px 24px", maxWidth: 1080, margin: "0 auto" }}>
          <Fade>
            <div style={{ marginBottom: 56, maxWidth: 520 }}>
              <div style={{
                display: "inline-block", padding: "4px 12px", borderRadius: 6,
                background: "rgba(79,70,229,0.09)", border: "1px solid rgba(79,70,229,0.20)",
                fontSize: 11, fontWeight: 700, color: "#4F46E5", letterSpacing: 0.8,
                textTransform: "uppercase" as const, marginBottom: 16,
              }}>How it works</div>
              <h2 className="ipc-section-h2" style={{ fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.3, margin: "0 0 14px", color: "#1C1917" }}>
                From answer to action in three steps.
              </h2>
              <p style={{ fontSize: 16, color: "#78716C", lineHeight: 1.7, margin: 0 }}>
                No setup. No coaching subscription. Just practice, analysis, and a clear target.
              </p>
            </div>
          </Fade>

          <div className="ipc-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              {
                num: "01", color: "#4F46E5",
                head: "Answer a real interview question",
                body: "Speak your answer or paste your text. Works for behavioral, situational, and case-style questions. Mobile-ready with one tap.",
              },
              {
                num: "02", color: "#D97706",
                head: "Get scored across 8 dimensions",
                body: "Narrative clarity, evidence quality, ownership, vocal engagement, response control, cognitive depth, confidence, and audience awareness. Every answer, every time.",
              },
              {
                num: "03", color: "#16A34A",
                head: "Follow your My Coach profile",
                body: "Your communication archetype, trajectory trend, and a personalized coaching writeup that updates as you improve. Know exactly what to fix.",
              },
            ].map((step) => (
              <Fade key={step.num} delay={Number(step.num) * 60}>
                <div className="ipc-card-lift" style={{
                  padding: "28px 24px", borderRadius: 14,
                  border: "1px solid rgba(28,25,23,0.08)",
                  background: "#FDFAF4",
                  height: "100%", boxSizing: "border-box" as const,
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 800, color: step.color,
                    letterSpacing: 1.2, textTransform: "uppercase" as const, marginBottom: 16,
                    fontFamily: "monospace",
                  }}>{step.num}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1C1917", lineHeight: 1.4, marginBottom: 10 }}>{step.head}</div>
                  <div style={{ fontSize: 14, color: "#78716C", lineHeight: 1.75 }}>{step.body}</div>
                </div>
              </Fade>
            ))}
          </div>
        </section>

        {/* ── 8 Dimensions ────────────────────────────────────── */}
        <section aria-label="Dimensions" style={{
          padding: "96px 24px",
          borderTop: "1px solid rgba(28,25,23,0.07)",
          borderBottom: "1px solid rgba(28,25,23,0.07)",
          background: "#FDFAF4",
        }}>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <div className="ipc-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px 80px", alignItems: "center" }}>

              {/* Left: copy */}
              <div>
                <Fade>
                  <div style={{
                    display: "inline-block", padding: "4px 12px", borderRadius: 6,
                    background: "rgba(79,70,229,0.09)", border: "1px solid rgba(79,70,229,0.20)",
                    fontSize: 11, fontWeight: 700, color: "#4F46E5", letterSpacing: 0.8,
                    textTransform: "uppercase" as const, marginBottom: 16,
                  }}>8 Dimensions</div>
                  <h2 className="ipc-section-h2" style={{ fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.3, margin: "0 0 18px", color: "#1C1917" }}>
                    Every answer scored eight ways.
                  </h2>
                  <p style={{ fontSize: 15, color: "#78716C", lineHeight: 1.8, margin: "0 0 32px" }}>
                    Most feedback tools give you a vague rating. Signal breaks your answer into eight dimensions, scores each one separately, and shows you exactly which area is dragging your profile down.
                  </p>
                  <p style={{ fontSize: 14, color: "#A8A29E", lineHeight: 1.7, margin: 0 }}>
                    Scores compound across sessions so you see real trajectory, not just snapshots.
                  </p>
                </Fade>
              </div>

              {/* Right: bars */}
              <div style={{ display: "grid", gap: 18 }}>
                {[
                  { label: "Narrative Clarity",    score: 8.1, color: "#4F46E5", delay: 0   },
                  { label: "Evidence Quality",     score: 4.8, color: "#D97706", delay: 60  },
                  { label: "Ownership & Agency",   score: 7.6, color: "#16A34A", delay: 120 },
                  { label: "Vocal Engagement",     score: 6.2, color: "#0EA5E9", delay: 180 },
                  { label: "Response Control",     score: 5.9, color: "#8B5CF6", delay: 240 },
                  { label: "Cognitive Depth",      score: 6.8, color: "#F59E0B", delay: 300 },
                  { label: "Presence & Confidence",score: 7.1, color: "#EC4899", delay: 360 },
                  { label: "Audience Awareness",   score: 5.4, color: "#10B981", delay: 420 },
                ].map((d) => (
                  <Fade key={d.label} delay={d.delay}>
                    <DimBar label={d.label} score={d.score} color={d.color} delay={d.delay} />
                  </Fade>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Communication Archetypes ─────────────────────────── */}
        <section aria-label="Archetypes" style={{ padding: "96px 24px" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <Fade>
              <div style={{ marginBottom: 48, maxWidth: 560 }}>
                <div style={{
                  display: "inline-block", padding: "4px 12px", borderRadius: 6,
                  background: "rgba(217,119,6,0.10)", border: "1px solid rgba(217,119,6,0.22)",
                  fontSize: 11, fontWeight: 700, color: "#D97706", letterSpacing: 0.8,
                  textTransform: "uppercase" as const, marginBottom: 16,
                }}>Communication Archetype</div>
                <h2 className="ipc-section-h2" style={{ fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.3, margin: "0 0 14px", color: "#1C1917" }}>
                  Your pattern has a name.
                </h2>
                <p style={{ fontSize: 16, color: "#78716C", lineHeight: 1.7, margin: 0 }}>
                  Signal identifies which of 12 communication archetypes describes your current interview behavior. Each archetype comes with a precise coaching prescription.
                </p>
              </div>
            </Fade>

            <div className="ipc-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px 80px", alignItems: "start" }}>

              {/* Left: archetype card */}
              <Fade delay={80}>
                <div style={{
                  borderRadius: 16, overflow: "hidden",
                  border: "1px solid rgba(28,25,23,0.08)",
                  background: "#FDFAF4",
                  boxShadow: "0 4px 20px rgba(28,25,23,0.06)",
                }}>
                  {/* Header */}
                  <div style={{
                    padding: "20px 22px",
                    borderBottom: "1px solid rgba(28,25,23,0.07)",
                    background: "rgba(79,70,229,0.04)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#78716C", letterSpacing: 0.8, textTransform: "uppercase" as const, marginBottom: 4 }}>Your archetype</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#1C1917", letterSpacing: -0.2 }}>Anxious Achiever</div>
                    </div>
                    <div style={{
                      padding: "6px 14px", borderRadius: 20,
                      background: "rgba(79,70,229,0.10)", border: "1px solid rgba(79,70,229,0.22)",
                      fontSize: 12, fontWeight: 700, color: "#4F46E5",
                    }}>Session 4 of 12</div>
                  </div>
                  {/* Coaching note */}
                  <div style={{ padding: "20px 22px 16px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#A8A29E", letterSpacing: 0.8, textTransform: "uppercase" as const, marginBottom: 10 }}>Coaching insight</div>
                    <p style={{ fontSize: 14, color: "#3C3633", lineHeight: 1.75, margin: "0 0 18px" }}>
                      Your answers carry real substance. The drag comes from qualifying language that softens claims before the interviewer even absorbs them. Ownership language is strong when you commit to it.
                    </p>
                    <p style={{ fontSize: 14, color: "#78716C", lineHeight: 1.7, margin: 0 }}>
                      One targeted fix: state the outcome first, then the context. You&apos;re burying your strongest material mid-answer.
                    </p>
                  </div>
                  {/* Score row */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 22px",
                    borderTop: "1px solid rgba(28,25,23,0.06)",
                    background: "rgba(28,25,23,0.02)",
                  }}>
                    <span style={{ fontSize: 13, color: "#78716C" }}>Session score</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#4F46E5" }}>6.4 <span style={{ fontSize: 13, fontWeight: 400, color: "#A8A29E" }}>/ 10</span></span>
                  </div>
                </div>
              </Fade>

              {/* Right: 12-archetype grid */}
              <div>
                <Fade>
                  <div style={{ fontSize: 14, color: "#78716C", lineHeight: 1.7, marginBottom: 24 }}>
                    Each archetype describes a repeating pattern. Most people hold one primary archetype for 6-10 sessions before shifting. Knowing yours lets you target the exact behavior to change.
                  </div>
                </Fade>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { name: "Polished Performer",  color: "#16A34A" },
                    { name: "Anxious Achiever",    color: "#4F46E5", active: true },
                    { name: "Vague Narrator",       color: "#D97706" },
                    { name: "Fading Closer",        color: "#DC2626" },
                    { name: "Monotone Expert",      color: "#0EA5E9" },
                    { name: "Scattered Thinker",    color: "#8B5CF6" },
                    { name: "Quiet Achiever",       color: "#10B981" },
                    { name: "Circling the Point",   color: "#F59E0B" },
                    { name: "Fragmented Expert",    color: "#EC4899" },
                    { name: "Phantom Expert",       color: "#6366F1" },
                    { name: "Process Narrator",     color: "#0891B2" },
                    { name: "The Creditor",         color: "#B45309" },
                  ].map((a, i) => (
                    <Fade key={a.name} delay={i * 40}>
                      <div style={{
                        padding: "10px 12px", borderRadius: 8,
                        border: `1px solid ${a.active ? "rgba(79,70,229,0.30)" : "rgba(28,25,23,0.07)"}`,
                        background: a.active ? "rgba(79,70,229,0.06)" : "rgba(28,25,23,0.015)",
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: a.active ? 700 : 500, color: a.active ? "#4F46E5" : "#78716C", lineHeight: 1.3 }}>{a.name}</span>
                      </div>
                    </Fade>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── My Coach ──────────────────────────────────────────── */}
        <section aria-label="My Coach" style={{
          padding: "96px 24px",
          borderTop: "1px solid rgba(28,25,23,0.07)",
          borderBottom: "1px solid rgba(28,25,23,0.07)",
          background: "#FDFAF4",
        }}>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <div className="ipc-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px 80px", alignItems: "center" }}>

              {/* Left: copy */}
              <Fade>
                <div>
                  <div style={{
                    display: "inline-block", padding: "4px 12px", borderRadius: 6,
                    background: "rgba(16,185,129,0.09)", border: "1px solid rgba(16,185,129,0.22)",
                    fontSize: 11, fontWeight: 700, color: "#059669", letterSpacing: 0.8,
                    textTransform: "uppercase" as const, marginBottom: 16,
                  }}>My Coach</div>
                  <h2 className="ipc-section-h2" style={{ fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.3, margin: "0 0 18px", color: "#1C1917" }}>
                    A profile that grows with you.
                  </h2>
                  <p style={{ fontSize: 15, color: "#78716C", lineHeight: 1.8, margin: "0 0 24px" }}>
                    My Coach is your persistent communication identity. It tracks your archetype, trajectory, delivery profile, and writing patterns across every session.
                  </p>
                  <div style={{ display: "grid", gap: 14 }}>
                    {[
                      { icon: "↗", label: "Trajectory tracking", desc: "See if you're improving, plateauing, or drifting. Week-over-week trend with strength indicators." },
                      { icon: "⬡", label: "Dimension radar", desc: "8-dimension profile updated after every session. See which areas are your floor and which are your ceiling." },
                      { icon: "✎", label: "Personalized coaching writeup", desc: "A 4-paragraph coaching narrative written specifically to your current pattern. Updates as your profile shifts." },
                    ].map((item) => (
                      <div key={item.label} style={{ display: "flex", gap: 14 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: "rgba(79,70,229,0.09)", border: "1px solid rgba(79,70,229,0.18)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 15, color: "#4F46E5",
                        }}>{item.icon}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1917", marginBottom: 2 }}>{item.label}</div>
                          <div style={{ fontSize: 13, color: "#78716C", lineHeight: 1.65 }}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Fade>

              {/* Right: mock coach panel */}
              <Fade delay={80}>
                <div style={{
                  borderRadius: 16, overflow: "hidden",
                  border: "1px solid rgba(28,25,23,0.08)",
                  background: "#FDFAF4",
                  boxShadow: "0 4px 20px rgba(28,25,23,0.06)",
                }}>
                  {/* Header */}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(28,25,23,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1917" }}>My Coach</div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "4px 10px", borderRadius: 20,
                      background: "rgba(22,163,74,0.10)", border: "1px solid rgba(22,163,74,0.22)",
                      fontSize: 11, fontWeight: 700, color: "#16A34A",
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16A34A" }} />
                      Improving
                    </div>
                  </div>
                  {/* Trajectory */}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(28,25,23,0.06)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", letterSpacing: 0.8, textTransform: "uppercase" as const, marginBottom: 10 }}>12-session trajectory</div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 40 }}>
                      {[3.2, 3.8, 4.1, 4.4, 5.2, 5.1, 5.9, 6.1, 6.4, 6.8, 7.0, 7.2].map((v, i) => (
                        <div key={i} style={{
                          flex: 1, borderRadius: "3px 3px 0 0",
                          height: `${(v / 10) * 100}%`,
                          background: i >= 9 ? "#4F46E5" : "rgba(79,70,229,0.20)",
                          minWidth: 0,
                        }} />
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: "#A8A29E" }}>Session 1</span>
                      <span style={{ fontSize: 11, color: "#A8A29E" }}>Latest</span>
                    </div>
                  </div>
                  {/* Coaching paragraph preview */}
                  <div style={{ padding: "16px 20px 18px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#A8A29E", letterSpacing: 0.8, textTransform: "uppercase" as const, marginBottom: 10 }}>Coaching notes</div>
                    <p style={{ fontSize: 13, color: "#3C3633", lineHeight: 1.75, margin: "0 0 12px" }}>
                      Your communication identity is Anxious Achiever. Substance and structure are present. The signal loss comes from hedging patterns in the first third of each answer.
                    </p>
                    <p style={{ fontSize: 13, color: "#78716C", lineHeight: 1.7, margin: 0 }}>
                      Primary focus: lead with your strongest claim, then support it. Your closing statements are consistently stronger than your openings.
                    </p>
                  </div>
                </div>
              </Fade>
            </div>
          </div>
        </section>

        {/* ── Vocal Intelligence ──────────────────────────────── */}
        <section aria-label="Vocal Analysis" style={{ padding: "96px 24px" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <div className="ipc-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px 80px", alignItems: "center" }}>

              {/* Left: metric tiles */}
              <div>
                <Fade>
                  <div style={{
                    display: "inline-block", padding: "4px 12px", borderRadius: 6,
                    background: "rgba(14,165,233,0.09)", border: "1px solid rgba(14,165,233,0.22)",
                    fontSize: 11, fontWeight: 700, color: "#0EA5E9", letterSpacing: 0.8,
                    textTransform: "uppercase" as const, marginBottom: 16,
                  }}>Vocal Analysis</div>
                  <h2 className="ipc-section-h2" style={{ fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.3, margin: "0 0 16px", color: "#1C1917" }}>
                    Delivery signals most tools ignore.
                  </h2>
                  <p style={{ fontSize: 15, color: "#78716C", lineHeight: 1.8, margin: "0 0 32px" }}>
                    Azure Speech AI extracts pronunciation, fluency, prosody, and filler frequency. Signal converts them into plain-language coaching notes, not raw numbers.
                  </p>
                </Fade>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Speaking Pace",     val: "138 wpm", sub: "Optimal range",  good: true  },
                    { label: "Filler Rate",        val: "2.8%",    sub: "Low frequency",  good: true  },
                    { label: "Pronunciation",      val: "88/100",  sub: "Strong clarity", good: true  },
                    { label: "Prosody Score",      val: "62/100",  sub: "Needs variation",good: false },
                    { label: "Energy Variation",   val: "Low",     sub: "Flat delivery",  good: false },
                    { label: "Fluency Score",      val: "79/100",  sub: "Good flow",      good: true  },
                  ].map((m, i) => (
                    <Fade key={m.label} delay={i * 50}>
                      <div style={{
                        padding: "14px 16px", borderRadius: 10,
                        border: `1px solid ${m.good ? "rgba(22,163,74,0.18)" : "rgba(220,38,38,0.15)"}`,
                        background: m.good ? "rgba(22,163,74,0.04)" : "rgba(220,38,38,0.04)",
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#A8A29E", marginBottom: 4 }}>{m.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: m.good ? "#16A34A" : "#DC2626", letterSpacing: -0.3 }}>{m.val}</div>
                        <div style={{ fontSize: 11, color: "#A8A29E", marginTop: 2 }}>{m.sub}</div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </div>

              {/* Right: language analytics */}
              <div>
                <Fade delay={80}>
                  <div style={{
                    display: "inline-block", padding: "4px 12px", borderRadius: 6,
                    background: "rgba(139,92,246,0.09)", border: "1px solid rgba(139,92,246,0.22)",
                    fontSize: 11, fontWeight: 700, color: "#8B5CF6", letterSpacing: 0.8,
                    textTransform: "uppercase" as const, marginBottom: 16,
                  }}>Language Analytics</div>
                  <h2 className="ipc-section-h2" style={{ fontSize: "clamp(24px,3vw,34px)", fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.3, margin: "0 0 16px", color: "#1C1917" }}>
                    Research-backed language profiling.
                  </h2>
                  <p style={{ fontSize: 15, color: "#78716C", lineHeight: 1.8, margin: "0 0 28px" }}>
                    Every answer is analyzed for hedging patterns, ownership language, lexical richness, and answer fragmentation. These are the signals that compound over a job search.
                  </p>
                </Fade>

                <div style={{ display: "grid", gap: 10 }}>
                  {[
                    { label: "Hedging penalty",       val: "Low",    desc: "3 hedge phrases detected",           bad: false },
                    { label: "Ownership language",    val: "Strong", desc: "Consistent I-language and agency",   bad: false },
                    { label: "Lexical richness",      val: "74",     desc: "Vocabulary range score",             bad: false },
                    { label: "Answer fragmentation",  val: "Medium", desc: "Some incomplete thought sequences",  bad: true  },
                    { label: "STAR pattern coverage", val: "3 / 4",  desc: "Result section often missing",       bad: true  },
                  ].map((item, i) => (
                    <Fade key={item.label} delay={i * 60}>
                      <div style={{
                        padding: "12px 16px", borderRadius: 10,
                        border: `1px solid ${item.bad ? "rgba(220,38,38,0.15)" : "rgba(22,163,74,0.18)"}`,
                        background: item.bad ? "rgba(220,38,38,0.04)" : "rgba(22,163,74,0.04)",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                      }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#1C1917", marginBottom: 2 }}>{item.label}</div>
                          <div style={{ fontSize: 11, color: "#78716C" }}>{item.desc}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: item.bad ? "#DC2626" : "#16A34A", flexShrink: 0 }}>{item.val}</div>
                      </div>
                    </Fade>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Career Tools ────────────────────────────────────── */}
        <section aria-label="Career Tools" style={{
          padding: "96px 24px",
          background: "#FDFAF4",
          borderTop: "1px solid rgba(28,25,23,0.07)",
          borderBottom: "1px solid rgba(28,25,23,0.07)",
        }}>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <Fade>
              <div style={{ marginBottom: 48, maxWidth: 520 }}>
                <div style={{
                  display: "inline-block", padding: "4px 12px", borderRadius: 6,
                  background: "rgba(28,25,23,0.06)", border: "1px solid rgba(28,25,23,0.12)",
                  fontSize: 11, fontWeight: 700, color: "#78716C", letterSpacing: 0.8,
                  textTransform: "uppercase" as const, marginBottom: 16,
                }}>Career Tools</div>
                <h2 className="ipc-section-h2" style={{ fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.3, margin: "0 0 14px", color: "#1C1917" }}>
                  Everything else the job search requires.
                </h2>
                <p style={{ fontSize: 15, color: "#78716C", lineHeight: 1.7, margin: 0 }}>
                  Interview prep in context. Signal includes the tools that make practice relevant to specific roles and companies.
                </p>
              </div>
            </Fade>

            <div className="ipc-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {[
                {
                  label: "Resume Analysis",
                  color: "#8B5CF6",
                  delay: 0,
                  head: "Know if your resume clears the first filter.",
                  body: "ATS compatibility scoring, gap analysis against your target role, and a prioritized action list. Run it before every application.",
                },
                {
                  label: "Experience Log",
                  color: "#0EA5E9",
                  delay: 80,
                  head: "Stop rebuilding stories from scratch under pressure.",
                  body: "Write, refine, and score your best career stories ahead of time. STAR structure, stronger language, practiced until fluent.",
                },
                {
                  label: "Job Tracker",
                  color: "#16A34A",
                  delay: 160,
                  head: "See where applications are stalling.",
                  body: "Track every role from applied to offer. Pipeline stage, response rate, and funnel visibility so you know where to push.",
                },
              ].map((tool) => (
                <Fade key={tool.label} delay={tool.delay}>
                  <div className="ipc-card-lift" style={{
                    padding: "26px 22px", borderRadius: 14,
                    border: `1px solid rgba(28,25,23,0.08)`,
                    background: "#FFFFFF",
                    height: "100%", boxSizing: "border-box" as const,
                    boxShadow: "0 1px 3px rgba(28,25,23,0.05)",
                  }}>
                    <div style={{
                      display: "inline-block", padding: "3px 9px", borderRadius: 5,
                      background: `${tool.color}12`, border: `1px solid ${tool.color}22`,
                      fontSize: 11, fontWeight: 600, color: tool.color, marginBottom: 16,
                    }}>{tool.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1917", lineHeight: 1.4, marginBottom: 10 }}>{tool.head}</div>
                    <div style={{ fontSize: 14, lineHeight: 1.75, color: "#78716C" }}>{tool.body}</div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────── */}
        <section aria-label="Get Started" style={{ padding: "120px 24px", textAlign: "center" }}>
          <Fade>
            <h2 style={{ fontSize: "clamp(26px,3.5vw,42px)", fontWeight: 800, letterSpacing: -0.4, margin: "0 0 16px", lineHeight: 1.2, color: "#1C1917" }}>
              Three sessions free. No card required.
            </h2>
          </Fade>
          <Fade delay={80}>
            <p style={{ fontSize: 17, color: "#78716C", margin: "0 0 40px", lineHeight: 1.7 }}>
              Enough to see your dimension profile, get your archetype read,<br className="ipc-nav-login-hide" /> and know exactly what to fix before the next real interview.
            </p>
          </Fade>
          <Fade delay={160}>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/signup" className="ipc-cta-pulse" style={{
                padding: "16px 40px", borderRadius: 10,
                background: "#4F46E5",
                color: "#fff", textDecoration: "none",
                fontWeight: 800, fontSize: 15,
                boxShadow: "0 4px 24px rgba(79,70,229,0.30)",
                display: "inline-block",
              }}>
                Start for free
              </Link>
              <Link href="/login" style={{
                padding: "16px 40px", borderRadius: 10,
                border: "1px solid rgba(28,25,23,0.14)",
                color: "#78716C", textDecoration: "none",
                fontWeight: 700, fontSize: 15,
                background: "transparent",
              }}>
                Log in
              </Link>
            </div>
          </Fade>
        </section>

      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid rgba(28,25,23,0.08)",
        padding: "24px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap" as const, gap: 12,
        background: "#FDFAF4",
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#78716C" }}>Signal</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="/privacy" style={{ fontSize: 12, color: "#A8A29E", textDecoration: "none" }}>Privacy Policy</a>
          <a href="/terms" style={{ fontSize: 12, color: "#A8A29E", textDecoration: "none" }}>Terms of Service</a>
          <div style={{ fontSize: 12, color: "#A8A29E" }}>
            © {new Date().getFullYear()} Signal. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Mock interview card (hero right column) ────────────── */
function MockInterviewCard({ visible }: { visible: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setTick(t => t + 1), 180);
    return () => clearInterval(id);
  }, [visible]);

  const bars = [0.3, 0.7, 0.5, 0.9, 0.4, 0.75, 0.55, 0.85, 0.45, 0.65, 0.35, 0.8];
  const dims = [
    { label: "Narrative Clarity",   score: 7.8, color: "#4F46E5" },
    { label: "Evidence Quality",    score: 4.2, color: "#DC2626" },
    { label: "Ownership & Agency",  score: 7.1, color: "#16A34A" },
    { label: "Vocal Engagement",    score: 5.9, color: "#D97706" },
  ];
  const secs = 14 + Math.floor(tick * 0.18);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div style={{
      position: "relative",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0) scale(1)" : "translateY(32px) scale(0.97)",
      transition: "opacity 0.8s ease 400ms, transform 0.8s ease 400ms",
    }}>
      {/* Floating archetype chip */}
      <div style={{
        position: "absolute", top: -18, right: -8, zIndex: 2,
        padding: "6px 14px", borderRadius: 20,
        background: "rgba(79,70,229,0.92)",
        border: "1px solid rgba(79,70,229,0.40)",
        backdropFilter: "blur(8px)",
        fontSize: 12, fontWeight: 700, color: "#fff",
        boxShadow: "0 4px 20px rgba(79,70,229,0.25)",
        whiteSpace: "nowrap" as const,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s ease 900ms",
      }}>
        Archetype: Anxious Achiever
      </div>

      {/* Main card */}
      <div className="ipc-glow-border" style={{
        borderRadius: 16,
        border: "1px solid rgba(28,25,23,0.10)",
        background: "#FDFAF4",
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(28,25,23,0.10), 0 1px 0 rgba(255,255,255,0.90)",
        width: "min(500px, 100%)",
      }}>
        {/* Recording bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(28,25,23,0.07)",
          background: "rgba(28,25,23,0.02)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", background: "#DC2626",
              boxShadow: "0 0 6px rgba(220,38,38,0.7)",
              display: "inline-block",
              animation: "pulse 1.2s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#78716C" }}>Recording</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#A8A29E", fontFamily: "monospace" }}>{mm}:{ss}</span>
          </div>
          {/* Waveform */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, height: 20 }}>
            {bars.map((h, i) => (
              <div key={i} style={{
                width: 3, borderRadius: 2,
                background: "#4F46E5",
                height: `${(((h + (tick * 0.13 + i * 0.7)) % 1) * 0.65 + 0.2) * 100}%`,
                opacity: 0.5 + (i % 3) * 0.15,
                transition: "height 0.18s ease",
              }} />
            ))}
          </div>
        </div>

        {/* Question */}
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(28,25,23,0.06)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#A8A29E", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: 0.8 }}>Current question</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#3C3633", lineHeight: 1.55 }}>
            "Tell me about a time you had to navigate a difficult stakeholder relationship."
          </div>
        </div>

        {/* Live dimension scores */}
        <div style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#A8A29E", marginBottom: 12, textTransform: "uppercase" as const, letterSpacing: 0.8 }}>Live analysis</div>
          <div style={{ display: "grid", gap: 10 }}>
            {dims.map((d, i) => (
              <div key={d.label} style={{
                opacity: visible ? 1 : 0,
                transition: `opacity 0.4s ease ${600 + i * 100}ms`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#78716C" }}>{d.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: d.color }}>{d.score.toFixed(1)}</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: "rgba(28,25,23,0.08)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 99,
                    width: visible ? `${d.score * 10}%` : "0%",
                    background: d.color,
                    transition: `width 0.8s cubic-bezier(0.4,0,0.2,1) ${700 + i * 120}ms`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px",
          borderTop: "1px solid rgba(28,25,23,0.07)",
          background: "rgba(79,70,229,0.05)",
        }}>
          <span style={{ fontSize: 12, color: "#78716C" }}>Overall score</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#4F46E5" }}>6.2 <span style={{ fontSize: 12, fontWeight: 400, color: "#A8A29E" }}>/ 10</span></span>
        </div>
      </div>

      {/* Floating improvement pip */}
      <div style={{
        position: "absolute", bottom: -14, left: -12, zIndex: 2,
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 14px", borderRadius: 20,
        background: "#FDFAF4",
        border: "1px solid rgba(28,25,23,0.10)",
        boxShadow: "0 4px 16px rgba(28,25,23,0.08)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s ease 1100ms",
      }}>
        <span style={{ fontSize: 14 }}>📈</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#16A34A" }}>+2.3 pts</span>
        <span style={{ fontSize: 12, color: "#78716C" }}>since last session</span>
      </div>
    </div>
  );
}

/* ── Hero content ────────────────────────────────────────── */
function HeroContent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ maxWidth: 960, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>

      {/* Headline — serif, centered, above the card */}
      <div style={{
        textAlign: "center" as const,
        marginBottom: 44,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
        transition: "opacity 0.65s ease 80ms, transform 0.65s ease 80ms",
      }}>
        <h1 style={{
          margin: "0 0 16px",
          fontFamily: "var(--font-dm-serif), Georgia, serif",
          fontSize: "clamp(38px, 5vw, 64px)",
          fontWeight: 400,
          lineHeight: 1.1,
          letterSpacing: -0.5,
          color: "#1C1917",
        }}>
          Know exactly how you interview.
        </h1>
        <p style={{
          margin: 0,
          fontSize: 16,
          color: "#78716C",
          lineHeight: 1.6,
          maxWidth: 520,
          marginLeft: "auto",
          marginRight: "auto",
          fontFamily: "var(--font-plus-jakarta), sans-serif",
        }}>
          Voice and webcam analysis. 8 scored dimensions. A coaching profile that tells you exactly what to fix.
        </p>
      </div>

      {/* Card — centered and dominant */}
      <div className="ipc-hero-preview" style={{
        display: "flex", justifyContent: "center", width: "100%",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.75s ease 260ms, transform 0.75s ease 260ms",
      }}>
        <MockInterviewCard visible={visible} />
      </div>

      {/* CTAs + stats below card */}
      <div style={{
        marginTop: 52,
        display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 20,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s ease 500ms",
      }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, justifyContent: "center" }}>
          <Link href="/signup" style={{
            padding: "14px 36px", borderRadius: 9,
            background: "#4F46E5",
            color: "#fff", textDecoration: "none",
            fontWeight: 700, fontSize: 15,
            boxShadow: "0 4px 20px rgba(79,70,229,0.28)",
            fontFamily: "var(--font-plus-jakarta), sans-serif",
          }}>
            Start for free
          </Link>
          <Link href="/login" style={{
            padding: "14px 28px", borderRadius: 9,
            border: "1px solid rgba(28,25,23,0.14)",
            color: "#78716C", textDecoration: "none",
            fontWeight: 600, fontSize: 15,
            background: "transparent",
            fontFamily: "var(--font-plus-jakarta), sans-serif",
          }}>
            Log in
          </Link>
        </div>

        {/* Inline stats */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {[
            { val: "8", label: "dimensions scored" },
            { val: "15", label: "archetypes" },
            { val: "2 min", label: "first analysis" },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#1C1917", fontFamily: "var(--font-plus-jakarta), sans-serif" }}>{s.val}</span>
              <span style={{ fontSize: 12, color: "#A8A29E", fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 18 }}>
          {["Free to start", "Works on mobile", "Voice + webcam"].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#A8A29E" }}>
              <span style={{ color: "#16A34A", fontWeight: 700 }}>✓</span> {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
