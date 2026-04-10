"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── Scroll reveal ──────────────────────────────────────────────────────────────

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Animated dimension bar ─────────────────────────────────────────────────────

function DimBar({ label, score, delay, visible }: { label: string; score: number; delay: number; visible: boolean }) {
  const pct = score * 10;
  const color = score >= 7 ? "#10B981" : score < 5 ? "#EF4444" : "#2563EB";
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color }}>{score.toFixed(1)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: visible ? `${pct}%` : "0%",
          background: color,
          borderRadius: 99,
          transition: `width 0.7s cubic-bezier(0.4,0,0.2,1) ${delay + 100}ms`,
        }} />
      </div>
    </div>
  );
}

// ── Fade wrapper ───────────────────────────────────────────────────────────────

function Fade({ children, delay = 0, up = true }: { children: React.ReactNode; delay?: number; up?: boolean }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : up ? "translateY(24px)" : "none",
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const dims = useReveal(0.2);
  const arch = useReveal(0.15);
  const vocal = useReveal(0.15);

  const dimensions = [
    { label: "Narrative Clarity",    score: 6.4 },
    { label: "Evidence Quality",     score: 4.1 },
    { label: "Ownership & Agency",   score: 7.8 },
    { label: "Vocal Engagement",     score: 5.2 },
    { label: "Response Control",     score: 6.7 },
    { label: "Cognitive Depth",      score: 7.3 },
    { label: "Presence & Confidence",score: 4.6 },
  ];

  return (
    <div style={{
      background: "#0d1e3a",
      color: "#fff",
      fontFamily: "var(--font-manrope, system-ui, sans-serif)",
      overflowX: "hidden",
    }}>

      {/* ── Nav ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(13,30,58,0.85)",
        backdropFilter: "blur(16px)",
      }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.4, color: "#fff" }}>Signal</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/login" style={{
            padding: "7px 16px", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)", textDecoration: "none",
            fontSize: 13, fontWeight: 700,
          }}>Log in</Link>
          <Link href="/signup" style={{
            padding: "7px 16px", borderRadius: 8,
            background: "#2563EB", color: "#fff",
            textDecoration: "none", fontSize: 13, fontWeight: 800,
          }}>Get started</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "120px 24px 80px",
        textAlign: "center",
        background: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(37,99,235,0.18), transparent),
          radial-gradient(ellipse 60% 40% at 80% 60%, rgba(14,165,233,0.07), transparent)
        `,
      }}>
        <HeroContent />
      </section>

      {/* ── Problem ── */}
      <section style={{ padding: "100px 24px", maxWidth: 760, margin: "0 auto" }}>
        <Fade>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, lineHeight: 1.25, letterSpacing: -0.3, margin: "0 0 24px", color: "#fff" }}>
            Interview feedback is almost always wrong.
          </h2>
        </Fade>
        <Fade delay={140}>
          <p style={{ fontSize: 17, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: "0 0 20px" }}>
            "Be more confident." "Work on your communication." These are observations, not instructions.
            You walk out not knowing what actually happened — and the next interview starts the same way.
          </p>
        </Fade>
        <Fade delay={200}>
          <p style={{ fontSize: 17, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: 0 }}>
            The problem isn't your experience. It's that nobody has ever shown you your actual communication
            pattern — what you say, how you say it, and how those two things are landing at the same time.
          </p>
        </Fade>
      </section>

      {/* ── Dimensions ── */}
      <section style={{ padding: "80px 24px 100px", background: "rgba(255,255,255,0.025)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px 80px", alignItems: "start" }}>

          <div>
            <Fade>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800, lineHeight: 1.25, letterSpacing: -0.3, margin: "0 0 20px" }}>
                Seven dimensions. One honest read.
              </h2>
            </Fade>
            <Fade delay={140}>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: "0 0 20px" }}>
                Every answer you give is scored across seven communication dimensions —
                not just "good" or "needs work," but where specifically your signal is breaking down.
              </p>
            </Fade>
            <Fade delay={200}>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                Narrative Clarity. Evidence Quality. Ownership & Agency. Vocal Engagement. Response Control.
                Cognitive Depth. Presence & Confidence. Each scored independently. Each with a coaching action.
              </p>
            </Fade>
          </div>

          <div ref={dims.ref} style={{
            padding: "28px 24px",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            display: "grid", gap: 18,
          }}>
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 2 }}>Sample profile</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>avg. across 8 sessions</div>
            </div>
            {dimensions.map((d, i) => (
              <DimBar key={d.label} label={d.label} score={d.score} delay={i * 60} visible={dims.visible} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Archetype ── */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px 80px", alignItems: "start" }}>

          <div ref={arch.ref}>
            <div style={{
              padding: "28px 24px",
              borderRadius: 16,
              border: "1px solid rgba(139,92,246,0.25)",
              background: "rgba(139,92,246,0.06)",
              opacity: arch.visible ? 1 : 0,
              transform: arch.visible ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.65s ease, transform 0.65s ease",
            }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "#8B5CF6", textTransform: "uppercase", marginBottom: 12 }}>
                Communication archetype
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 6, letterSpacing: -0.3 }}>The Hedger</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>
                Sharp thinking, softened delivery
              </div>

              <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.6, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 8 }}>What interviewers hear</div>
                <div style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>
                  "A well-prepared candidate who seems uncertain whether they deserve the credit."
                </div>
              </div>

              <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)" }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.6, color: "#60A5FA", textTransform: "uppercase", marginBottom: 8 }}>Coaching action</div>
                <div style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.6)" }}>
                  Replace "I helped with" → "I owned". Replace "we kind of" → "I drove".
                  Say the revised version out loud once before your next attempt.
                </div>
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Ownership & Agency", "Presence & Confidence"].map(d => (
                  <div key={d} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 11, fontWeight: 700, color: "#F87171" }}>{d}</div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Fade>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800, lineHeight: 1.25, letterSpacing: -0.3, margin: "0 0 20px" }}>
                You have a communication pattern. Most people never find out what it is.
              </h2>
            </Fade>
            <Fade delay={140}>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: "0 0 20px" }}>
                After enough sessions, Signal identifies your communication archetype — the specific
                pattern that's showing up across your answers. Not a vague category. A named behavior with
                a concrete coaching action to break it.
              </p>
            </Fade>
            <Fade delay={200}>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                15 archetypes. Each comes with what interviewers are actually hearing,
                which dimensions are driving the pattern, and what to do differently in the next attempt.
              </p>
            </Fade>
          </div>
        </div>
      </section>

      {/* ── Vocal ── */}
      <section style={{ padding: "80px 24px 100px", background: "rgba(255,255,255,0.025)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ maxWidth: 600, marginBottom: 60 }}>
            <Fade>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800, lineHeight: 1.25, letterSpacing: -0.3, margin: "0 0 20px" }}>
                Your words and your voice are telling different stories.
              </h2>
            </Fade>
            <Fade delay={140}>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                Spoken answers get a full acoustic read — pace, filler density, vocal energy variation,
                and monotone risk scored independently. You can have a great answer and still lose the
                interviewer if the delivery flattens at the wrong moment.
              </p>
            </Fade>
          </div>

          <div ref={vocal.ref} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { label: "Speaking pace",    value: "148 WPM",    note: "Strong interview range", color: "#10B981", delay: 0 },
              { label: "Filler rate",       value: "4.2 / 100",  note: "Manageable — tighten transitions", color: "#F59E0B", delay: 80 },
              { label: "Vocal energy",      value: "6.1 / 10",   note: "Some flattening on key outcomes", color: "#F59E0B", delay: 160 },
              { label: "Monotone risk",     value: "5.8 / 10",   note: "Add lift when stating the result", color: "#EF4444", delay: 240 },
            ].map((m) => (
              <div key={m.label} style={{
                padding: "22px 20px",
                borderRadius: 14,
                border: `1px solid ${m.color}25`,
                background: `${m.color}08`,
                opacity: vocal.visible ? 1 : 0,
                transform: vocal.visible ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 0.55s ease ${m.delay}ms, transform 0.55s ease ${m.delay}ms`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.7, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 10 }}>{m.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: m.color, letterSpacing: -0.4, marginBottom: 8 }}>{m.value}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{m.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── IBM language analytics ── */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "60px 80px", alignItems: "start" }}>
            <div>
              <Fade>
                <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800, lineHeight: 1.25, letterSpacing: -0.3, margin: "0 0 20px" }}>
                  What your word choices are signaling.
                </h2>
              </Fade>
              <Fade delay={120}>
                <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: "0 0 20px" }}>
                  Signal runs competitive linguistics analysis on every answer —
                  the same class of signals used by enterprise hiring tools.
                  Hedging density, behavioral ownership language, lexical range, cognitive complexity, answer fragmentation.
                </p>
              </Fade>
              <Fade delay={180}>
                <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                  Most people don't know they say "I think," "I feel like," or "I guess" 14 times in a five-minute answer.
                  It compounds. And interviewers notice before you do.
                </p>
              </Fade>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {[
                { label: "Hedging penalty",         val: "High",   desc: "14 hedge phrases detected", bad: true },
                { label: "Behavioral indicators",   val: "Strong", desc: "Clear I-language and ownership",  bad: false },
                { label: "Lexical richness",         val: "74",     desc: "Vocabulary range score",          bad: false },
                { label: "Answer fragmentation",    val: "Medium", desc: "Some incomplete thoughts",         bad: true },
              ].map((item, i) => (
                <Fade key={item.label} delay={i * 60}>
                  <div style={{
                    padding: "14px 16px",
                    borderRadius: 10,
                    border: `1px solid ${item.bad ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`,
                    background: item.bad ? "rgba(239,68,68,0.04)" : "rgba(16,185,129,0.04)",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.55)", marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{item.desc}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: item.bad ? "#F87171" : "#34D399", flexShrink: 0 }}>{item.val}</div>
                  </div>
                </Fade>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Tools ── */}
      <section style={{ padding: "80px 24px 100px", background: "rgba(255,255,255,0.025)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Fade>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 800, lineHeight: 1.25, letterSpacing: -0.3, margin: "0 0 40px", maxWidth: 560 }}>
              Everything you need to run a real job search.
            </h2>
          </Fade>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              {
                label: "Resume Analysis",
                color: "#8B5CF6",
                delay: 0,
                head: "Know if your resume clears the first filter.",
                body: "ATS compatibility score, gap analysis against your target role, and a prioritized action list. Run it before every application.",
              },
              {
                label: "Experience Log",
                color: "#0EA5E9",
                delay: 100,
                head: "Stop rebuilding stories from scratch under pressure.",
                body: "Write, refine, and score your best career stories ahead of time. STAR structure, stronger language, practiced until fluent.",
              },
              {
                label: "Job Tracker",
                color: "#10B981",
                delay: 200,
                head: "See where applications are stalling.",
                body: "Track every role from applied to offer. Pipeline stage, response rate, and funnel visibility — so you're not guessing where to push.",
              },
            ].map((tool) => (
              <Fade key={tool.label} delay={tool.delay}>
                <div style={{
                  padding: "28px 24px",
                  borderRadius: 16,
                  border: `1px solid ${tool.color}20`,
                  background: "rgba(255,255,255,0.02)",
                  height: "100%",
                  boxSizing: "border-box",
                }}>
                  <div style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: `${tool.color}15`,
                    fontSize: 11,
                    fontWeight: 900,
                    color: tool.color,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    marginBottom: 18,
                  }}>
                    {tool.label}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", lineHeight: 1.4, marginBottom: 12 }}>{tool.head}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(255,255,255,0.45)" }}>{tool.body}</div>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "120px 24px", textAlign: "center" }}>
        <Fade>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 800, letterSpacing: -0.3, margin: "0 0 16px", lineHeight: 1.2 }}>
            Three sessions free. No card required.
          </h2>
        </Fade>
        <Fade delay={80}>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.45)", margin: "0 0 40px", lineHeight: 1.7 }}>
            Enough to see your dimension profile, get an archetype read,<br />and know exactly what to fix.
          </p>
        </Fade>
        <Fade delay={160}>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" style={{
              padding: "15px 36px", borderRadius: 12,
              background: "linear-gradient(135deg, #2563EB, #0EA5E9)",
              color: "#fff", textDecoration: "none",
              fontWeight: 800, fontSize: 15,
              boxShadow: "0 4px 32px rgba(37,99,235,0.4)",
            }}>
              Start for free
            </Link>
            <Link href="/login" style={{
              padding: "15px 36px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.65)", textDecoration: "none",
              fontWeight: 800, fontSize: 15,
              background: "transparent",
            }}>
              Log in
            </Link>
          </div>
        </Fade>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "28px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: "rgba(255,255,255,0.3)" }}>Signal</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          © {new Date().getFullYear()} Signal. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

// ── Hero content (separate to isolate the entrance animation) ─────────────────

function HeroContent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "6px 14px", borderRadius: 99,
        border: "1px solid rgba(37,99,235,0.35)",
        background: "rgba(37,99,235,0.1)",
        fontSize: 12, fontWeight: 900,
        color: "#60A5FA", letterSpacing: 0.8,
        textTransform: "uppercase" as const,
        marginBottom: 32,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s ease",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#60A5FA", boxShadow: "0 0 8px #60A5FA" }} />
        AI interview coaching
      </div>

      <h1 style={{
        margin: "0 0 24px",
        fontSize: "clamp(36px, 5.5vw, 60px)",
        fontWeight: 800,
        lineHeight: 1.15,
        letterSpacing: -0.4,
        color: "#fff",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.65s ease 120ms, transform 0.65s ease 120ms",
      }}>
        Know exactly how<br />
        <span style={{ background: "linear-gradient(135deg, #2563EB 20%, #0EA5E9 80%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          you interview.
        </span>
      </h1>

      <p style={{
        margin: "0 0 44px",
        fontSize: "clamp(16px, 2vw, 19px)",
        color: "rgba(255,255,255,0.5)",
        lineHeight: 1.75,
        maxWidth: 580,
        marginLeft: "auto",
        marginRight: "auto",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.65s ease 200ms, transform 0.65s ease 200ms",
      }}>
        Signal scores your answers across seven dimensions, identifies your communication archetype,
        and tells you the one thing to fix next — before your next real interview.
      </p>

      <div style={{
        display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(14px)",
        transition: "opacity 0.65s ease 300ms, transform 0.65s ease 300ms",
      }}>
        <Link href="/signup" style={{
          padding: "15px 36px", borderRadius: 12,
          background: "linear-gradient(135deg, #2563EB, #0EA5E9)",
          color: "#fff", textDecoration: "none",
          fontWeight: 800, fontSize: 15,
          boxShadow: "0 4px 32px rgba(37,99,235,0.4)",
          whiteSpace: "nowrap" as const,
        }}>
          Start for free
        </Link>
        <Link href="/login" style={{
          padding: "15px 36px", borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.7)", textDecoration: "none",
          fontWeight: 800, fontSize: 15,
          background: "transparent",
          whiteSpace: "nowrap" as const,
        }}>
          Log in
        </Link>
      </div>
    </div>
  );
}
