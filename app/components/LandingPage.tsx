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
        <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.55)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{score.toFixed(1)}</span>
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
  const vocal  = useReveal(0.15);
  const visual = useReveal(0.15);

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
      fontFamily: "var(--font-inter, ui-sans-serif, system-ui, sans-serif)",
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
        background: `
          radial-gradient(ellipse 90% 60% at 20% -5%, rgba(37,99,235,0.22), transparent 60%),
          radial-gradient(ellipse 70% 50% at 85% 20%, rgba(14,165,233,0.12), transparent 55%),
          radial-gradient(ellipse 50% 40% at 50% 100%, rgba(37,99,235,0.08), transparent 60%)
        `,
        backgroundImage: `
          radial-gradient(ellipse 90% 60% at 20% -5%, rgba(37,99,235,0.22), transparent 60%),
          radial-gradient(ellipse 70% 50% at 85% 20%, rgba(14,165,233,0.12), transparent 55%),
          radial-gradient(ellipse 50% 40% at 50% 100%, rgba(37,99,235,0.08), transparent 60%),
          radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "auto, auto, auto, 32px 32px",
      }}>
        <HeroContent />
      </section>

      {/* ── Problem ── */}
      <section style={{ padding: "100px 24px", maxWidth: 760, margin: "0 auto" }}>
        <Fade>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, lineHeight: 1.3, letterSpacing: -0.2, margin: "0 0 24px", color: "#fff" }}>
            Interview feedback is almost always wrong.
          </h2>
        </Fade>
        <Fade delay={140}>
          <p style={{ fontSize: 17, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: "0 0 20px" }}>
            "Be more confident." "Work on your communication." These are observations, not instructions.
            You walk out not knowing what actually happened, and the next interview starts the same way.
          </p>
        </Fade>
        <Fade delay={200}>
          <p style={{ fontSize: 17, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: 0 }}>
            The problem isn't your experience. It's that nobody has ever shown you your actual communication
            pattern: what you say, how you say it, and how those two things are landing at the same time.
          </p>
        </Fade>
      </section>

      {/* ── Dimensions ── */}
      <section style={{ padding: "80px 24px 100px", background: "rgba(255,255,255,0.025)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px 80px", alignItems: "start" }}>

          <div>
            <Fade>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 700, lineHeight: 1.3, letterSpacing: -0.2, margin: "0 0 20px" }}>
                Seven dimensions. One honest read.
              </h2>
            </Fade>
            <Fade delay={140}>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: "0 0 20px" }}>
                Every answer you give is scored across seven communication dimensions.
                Not just "good" or "needs work," but where specifically your signal is breaking down.
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
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Sample profile</div>
              <div style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>avg. across 8 sessions</div>
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
              <div style={{ fontSize: 11, fontWeight: 500, color: "#A78BFA", marginBottom: 12 }}>
                Communication archetype
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 5, letterSpacing: -0.2 }}>The Hedger</div>
              <div style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
                Sharp thinking, softened delivery
              </div>

              <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>What interviewers hear</div>
                <div style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>
                  "A well-prepared candidate who seems uncertain whether they deserve the credit."
                </div>
              </div>

              <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)" }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#93C5FD", marginBottom: 8 }}>Coaching action</div>
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
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 700, lineHeight: 1.3, letterSpacing: -0.2, margin: "0 0 20px" }}>
                You have a communication pattern. Most people never find out what it is.
              </h2>
            </Fade>
            <Fade delay={140}>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: "0 0 20px" }}>
                After enough sessions, Signal identifies your communication archetype: the specific
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px 80px", alignItems: "start", marginBottom: 48 }}>
            <Fade>
              <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 700, lineHeight: 1.3, letterSpacing: -0.2, margin: "0 0 20px" }}>
                Your voice has a pattern. Most interviewers can hear it. You can not.
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                Signal runs a full acoustic analysis on every spoken answer. Pitch range in Hz, amplitude variation, long pause detection, filler density, and speaking pace are scored and combined into a delivery archetype with a single targeted fix.
              </p>
            </Fade>

            {/* Delivery archetype card */}
            <Fade delay={80}>
              <div style={{
                padding: "24px",
                borderRadius: 16,
                border: "1px solid rgba(14,165,233,0.25)",
                background: "rgba(14,165,233,0.06)",
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#93C5FD", marginBottom: 10 }}>Delivery archetype</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Flat Articulate</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 18 }}>Clear words, flat delivery</div>
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>What interviewers hear</div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.55)", fontStyle: "italic" }}>
                    "Smart candidate, but hard to stay engaged with. Everything sounds the same."
                  </div>
                </div>
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#60A5FA", marginBottom: 6 }}>One fix</div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.55)" }}>
                    Pick the single most important outcome in your answer and hit it louder, slower, and with a half-second pause before it. Record yourself doing it once.
                  </div>
                </div>
              </div>
            </Fade>
          </div>

          {/* Metric tiles: 3 columns x 2 rows */}
          <div ref={vocal.ref} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              { label: "Speaking pace",       value: "152 WPM",    note: "Controlled range. Slightly fast on outcome sentences.", color: "#10B981", delay: 0   },
              { label: "Filler density",       value: "6.1 / 100",  note: "Above threshold. 'Kind of' appearing 8 times in 5 min.", color: "#EF4444", delay: 60  },
              { label: "Pitch range",          value: "82 Hz",      note: "Narrow. Flat delivery is reducing perceived confidence.", color: "#EF4444", delay: 120 },
              { label: "Amplitude variation",  value: "4.2 / 10",   note: "Low energy contrast. Key points not landing with weight.", color: "#F59E0B", delay: 180 },
              { label: "Long pause rate",      value: "2.3 / min",  note: "Hesitation detected mid-answer. Breaks answer momentum.",  color: "#F59E0B", delay: 240 },
              { label: "Eye contact",          value: "71%",        note: "Solid baseline. Drops during structured STAR transitions.", color: "#10B981", delay: 300 },
            ].map((m) => (
              <div key={m.label} style={{
                padding: "20px",
                borderRadius: 14,
                border: `1px solid ${m.color}25`,
                background: `${m.color}08`,
                opacity: vocal.visible ? 1 : 0,
                transform: vocal.visible ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 0.55s ease ${m.delay}ms, transform 0.55s ease ${m.delay}ms`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>{m.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: m.color, letterSpacing: -0.3, marginBottom: 8 }}>{m.value}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.55 }}>{m.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Visual Intelligence ── */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px 80px", alignItems: "start" }}>

            <div ref={visual.ref} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Eye Contact",      value: "74%",       note: "Drops to 48% during STAR transitions",   color: "#F59E0B", delay: 0   },
                { label: "Smile Rate",        value: "18%",       note: "Neutral affect — warmth is below threshold", color: "#EF4444", delay: 60  },
                { label: "Brow Engagement",   value: "Animated",  note: "Face is actively expressive",             color: "#10B981", delay: 120 },
                { label: "Head Stability",    value: "91%",       note: "Composed — minimal distracting movement",  color: "#10B981", delay: 180 },
                { label: "Blink Rate",        value: "22/min",    note: "Slightly elevated — nerves showing",       color: "#F59E0B", delay: 240 },
                { label: "Look-Away Rate",    value: "21%",       note: "Occasional glances down at notes",         color: "#F59E0B", delay: 300 },
              ].map(m => (
                <div key={m.label} style={{
                  padding: "16px",
                  borderRadius: 12,
                  border: `1px solid ${m.color}22`,
                  background: `${m.color}08`,
                  opacity: visual.visible ? 1 : 0,
                  transform: visual.visible ? "translateY(0)" : "translateY(16px)",
                  transition: `opacity 0.5s ease ${m.delay}ms, transform 0.5s ease ${m.delay}ms`,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.38)", marginBottom: 8 }}>{m.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: m.color, marginBottom: 6 }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>{m.note}</div>
                </div>
              ))}
            </div>

            <div>
              <Fade>
                <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 700, lineHeight: 1.3, letterSpacing: -0.2, margin: "0 0 20px" }}>
                  Your face is giving an interview too.
                </h2>
              </Fade>
              <Fade delay={80}>
                <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: "0 0 20px" }}>
                  When you enable your webcam, Signal runs real-time facial landmark analysis on every frame. Eye contact drops, frozen brows, high blink rate, low smile affect — these are the signals that shape how interviewers read confidence before you say a word.
                </p>
              </Fade>
              <Fade delay={160}>
                <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: "0 0 28px" }}>
                  Seven visual metrics per session. All scored, trended over time, and factored into your overall presence score alongside your vocal delivery.
                </p>
              </Fade>
              <Fade delay={220}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["Eye contact %", "Smile rate", "Brow engagement", "Head stability", "Blink rate", "Look-away detection", "Presence score"].map(tag => (
                    <span key={tag} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{tag}</span>
                  ))}
                </div>
              </Fade>
            </div>
          </div>
        </div>
      </section>

      {/* ── IBM language analytics ── */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "60px 80px", alignItems: "start" }}>
            <div>
              <Fade>
                <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 700, lineHeight: 1.3, letterSpacing: -0.2, margin: "0 0 20px" }}>
                  What your word choices are signaling.
                </h2>
              </Fade>
              <Fade delay={120}>
                <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,0.5)", margin: "0 0 20px" }}>
                  Signal runs competitive linguistics analysis on every answer,
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
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 700, lineHeight: 1.3, letterSpacing: -0.2, margin: "0 0 40px", maxWidth: 560 }}>
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
                body: "Track every role from applied to offer. Pipeline stage, response rate, and funnel visibility so you know exactly where to push.",
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
                    padding: "3px 9px",
                    borderRadius: 5,
                    background: `${tool.color}12`,
                    border: `1px solid ${tool.color}25`,
                    fontSize: 11,
                    fontWeight: 500,
                    color: tool.color,
                    marginBottom: 16,
                  }}>
                    {tool.label}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", lineHeight: 1.45, marginBottom: 12 }}>{tool.head}</div>
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
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 700, letterSpacing: -0.2, margin: "0 0 16px", lineHeight: 1.25 }}>
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

function MockInterviewCard({ visible }: { visible: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setTick(t => t + 1), 180);
    return () => clearInterval(id);
  }, [visible]);

  const bars = [0.3, 0.7, 0.5, 0.9, 0.4, 0.75, 0.55, 0.85, 0.45, 0.65, 0.35, 0.8];
  const dims = [
    { label: "Narrative Clarity",    score: 8.2, color: "#10B981" },
    { label: "Evidence Quality",     score: 4.1, color: "#EF4444" },
    { label: "Ownership & Agency",   score: 7.8, color: "#10B981" },
    { label: "Vocal Engagement",     score: 6.4, color: "#2563EB" },
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
        background: "linear-gradient(135deg, rgba(139,92,246,0.9), rgba(99,102,241,0.9))",
        border: "1px solid rgba(139,92,246,0.5)",
        backdropFilter: "blur(8px)",
        fontSize: 12, fontWeight: 600, color: "#fff",
        boxShadow: "0 4px 20px rgba(139,92,246,0.35)",
        whiteSpace: "nowrap" as const,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s ease 900ms",
      }}>
        Archetype: The Hedger
      </div>

      {/* Main card */}
      <div style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(15,28,58,0.85)",
        backdropFilter: "blur(20px)",
        overflow: "hidden",
        boxShadow: "0 8px 48px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.07)",
        width: "min(440px, 100%)",
      }}>
        {/* Recording bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.03)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", background: "#EF4444",
              boxShadow: "0 0 6px rgba(239,68,68,0.8)",
              display: "inline-block",
              animation: "pulse 1.2s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Recording</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>{mm}:{ss}</span>
          </div>
          {/* Waveform */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, height: 20 }}>
            {bars.map((h, i) => (
              <div key={i} style={{
                width: 3, borderRadius: 2,
                background: "#2563EB",
                height: `${(((h + (tick * 0.13 + i * 0.7)) % 1) * 0.65 + 0.2) * 100}%`,
                opacity: 0.7 + (i % 3) * 0.1,
                transition: "height 0.18s ease",
              }} />
            ))}
          </div>
        </div>

        {/* Question */}
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: 0.8 }}>Current question</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
            "Tell me about a time you had to navigate a difficult stakeholder relationship."
          </div>
        </div>

        {/* Live dimension scores */}
        <div style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.35)", marginBottom: 12, textTransform: "uppercase" as const, letterSpacing: 0.8 }}>Live analysis</div>
          <div style={{ display: "grid", gap: 10 }}>
            {dims.map((d, i) => (
              <div key={d.label} style={{
                opacity: visible ? 1 : 0,
                transition: `opacity 0.4s ease ${600 + i * 100}ms`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{d.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: d.color }}>{d.score.toFixed(1)}</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
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
          borderTop: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(37,99,235,0.08)",
        }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Overall score</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9" }}>6.7 <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>/ 10</span></span>
        </div>
      </div>

      {/* Floating social proof pip */}
      <div style={{
        position: "absolute", bottom: -14, left: -12, zIndex: 2,
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 14px", borderRadius: 20,
        background: "rgba(15,28,58,0.95)",
        border: "1px solid rgba(255,255,255,0.10)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s ease 1100ms",
      }}>
        <span style={{ fontSize: 14 }}>📈</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>+2.3 pts</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>since last session</span>
      </div>
    </div>
  );
}

function HeroContent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="ipc-hero-grid" style={{
      maxWidth: 1100, width: "100%",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "60px 80px",
      alignItems: "center",
    }}>
      {/* Left: text */}
      <div style={{ textAlign: "left" as const }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "5px 12px", borderRadius: 6,
          border: "1px solid rgba(59,130,246,0.3)",
          background: "rgba(59,130,246,0.08)",
          fontSize: 12, fontWeight: 600,
          color: "#93C5FD", letterSpacing: 0.2,
          marginBottom: 28,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#3B82F6" }} />
          Interview intelligence
        </div>

        <h1 style={{
          margin: "0 0 22px",
          fontSize: "clamp(34px, 4vw, 52px)",
          fontWeight: 700,
          lineHeight: 1.18,
          letterSpacing: -0.3,
          color: "#F1F5F9",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.65s ease 120ms, transform 0.65s ease 120ms",
        }}>
          Know exactly how you interview.
        </h1>

        <p style={{
          margin: "0 0 44px",
          fontSize: "clamp(15px, 1.8vw, 18px)",
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.75,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.65s ease 200ms, transform 0.65s ease 200ms",
        }}>
          Signal scores your answers across seven dimensions, identifies your communication archetype,
          and tells you the one thing to fix before your next real interview.
        </p>

        <div style={{
          display: "flex", gap: 14, flexWrap: "wrap",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 0.65s ease 300ms, transform 0.65s ease 300ms",
        }}>
          <Link href="/signup" style={{
            padding: "14px 32px", borderRadius: 10,
            background: "linear-gradient(135deg, #2563EB, #0EA5E9)",
            color: "#fff", textDecoration: "none",
            fontWeight: 700, fontSize: 15,
            boxShadow: "0 4px 32px rgba(37,99,235,0.4)",
            whiteSpace: "nowrap" as const,
          }}>
            Start for free
          </Link>
          <Link href="/login" style={{
            padding: "14px 32px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.7)", textDecoration: "none",
            fontWeight: 700, fontSize: 15,
            background: "transparent",
            whiteSpace: "nowrap" as const,
          }}>
            Log in
          </Link>
        </div>

        {/* Trust line */}
        <div style={{
          marginTop: 36, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.5s ease 500ms",
        }}>
          {["No credit card required", "Works on mobile", "Results in 2 minutes"].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
              <span style={{ color: "#10B981", fontSize: 13 }}>✓</span> {t}
            </div>
          ))}
        </div>
      </div>

      {/* Right: mock interview card */}
      <div className="ipc-hero-preview" style={{ display: "flex", justifyContent: "center", paddingTop: 20 }}>
        <MockInterviewCard visible={visible} />
      </div>
    </div>
  );
}
