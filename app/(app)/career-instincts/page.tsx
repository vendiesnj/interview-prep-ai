"use client";

import { useState, useEffect, useRef } from "react";
import { SCENARIOS, getRandomScenarios, DIMENSION_LABELS, DIMENSION_DESCRIPTIONS, type Scenario, type Dimension } from "@/lib/scenario-bank";

// ── Types ────────────────────────────────────────────────────────────────────

type GamePhase = "intro" | "playing" | "insight" | "results" | "history";

interface Response {
  scenarioId: string;
  choiceIndex: number;
}

interface SessionRecord {
  id: string;
  createdAt: string;
  xpEarned: number;
  dimensions: Record<Dimension, number>;
  scenariosPlayed: string[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const SCENARIOS_PER_SESSION = 10;

const DIMENSION_ICONS: Record<Dimension, string> = {
  teamwork: "🤝",
  leadership: "⚡",
  communication: "💬",
  criticalThinking: "🧠",
  professionalism: "🏛️",
  adaptability: "🌊",
  equityInclusion: "⚖️",
};

const DIMENSION_COLORS: Record<Dimension, string> = {
  teamwork: "#10B981",
  leadership: "#F59E0B",
  communication: "#3B82F6",
  criticalThinking: "#8B5CF6",
  professionalism: "#0EA5E9",
  adaptability: "#EC4899",
  equityInclusion: "#14B8A6",
};

function getTopDimensions(dims: Record<Dimension, number>, n: number): Dimension[] {
  return (Object.keys(dims) as Dimension[])
    .sort((a, b) => dims[b] - dims[a])
    .slice(0, n);
}

function getLowestDimension(dims: Record<Dimension, number>): Dimension {
  return (Object.keys(dims) as Dimension[])
    // exclude equityInclusion from "lowest" if no E&I scenarios were played (score=0 is absence of data, not a weakness)
    .filter((d) => d !== "equityInclusion" || dims.equityInclusion > 0)
    .sort((a, b) => dims[a] - dims[b])[0];
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function XPCounter({ xp }: { xp: number }) {
  const [displayed, setDisplayed] = useState(xp);
  const prev = useRef(xp);

  useEffect(() => {
    if (xp === prev.current) return;
    const diff = xp - prev.current;
    const steps = 20;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setDisplayed(prev.current + Math.round((diff * step) / steps));
      if (step >= steps) {
        setDisplayed(xp);
        prev.current = xp;
        clearInterval(interval);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [xp]);

  return <span>{displayed}</span>;
}

function DimensionBar({
  dim,
  value,
  animate = false,
}: {
  dim: Dimension;
  value: number;
  animate?: boolean;
}) {
  const [width, setWidth] = useState(animate ? 0 : value * 100);

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setWidth(value * 100), 100);
    return () => clearTimeout(t);
  }, [animate, value]);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{DIMENSION_ICONS[dim]}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            {DIMENSION_LABELS[dim]}
          </span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: DIMENSION_COLORS[dim] }}>
          {Math.round(value * 100)}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "var(--card-bg-strong)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            borderRadius: 99,
            background: DIMENSION_COLORS[dim],
            width: `${width}%`,
            transition: animate ? "width 0.8s cubic-bezier(0.16,1,0.3,1)" : "none",
          }}
        />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CareerInstinctsPage() {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Response[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [finalDimensions, setFinalDimensions] = useState<Record<Dimension, number> | null>(null);
  const [finalXp, setFinalXp] = useState(0);
  const [pastSessions, setPastSessions] = useState<SessionRecord[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cardAnim, setCardAnim] = useState(false);

  const current = scenarios[currentIdx];
  const progress = scenarios.length > 0 ? (currentIdx / scenarios.length) * 100 : 0;

  function startGame() {
    const picked = getRandomScenarios(SCENARIOS_PER_SESSION);
    setScenarios(picked);
    setCurrentIdx(0);
    setResponses([]);
    setSelectedChoice(null);
    setXp(0);
    setStreak(0);
    setFinalDimensions(null);
    setCardAnim(false);
    setPhase("playing");
  }

  function handleChoiceSelect(idx: number) {
    if (selectedChoice !== null) return;
    setSelectedChoice(idx);
    setPhase("insight");

    const gained = 30 + (streak >= 2 ? 10 : 0); // streak bonus
    setXp((prev) => prev + gained);
    setStreak((prev) => prev + 1);
  }

  function handleNext() {
    const newResponses = [...responses, { scenarioId: current.id, choiceIndex: selectedChoice! }];
    setResponses(newResponses);
    setSelectedChoice(null);
    setCardAnim(true);

    if (currentIdx + 1 >= scenarios.length) {
      finishGame(newResponses);
    } else {
      setTimeout(() => {
        setCurrentIdx((prev) => prev + 1);
        setCardAnim(false);
        setPhase("playing");
      }, 200);
    }
  }

  async function finishGame(finalResponses: Response[]) {
    setSaving(true);
    try {
      const res = await fetch("/api/instinct-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: finalResponses }),
      });
      const data = await res.json();
      setFinalDimensions(data.dimensions);
      setFinalXp(data.xpEarned);
    } catch {
      // compute locally as fallback
      const { computeSessionDimensions } = await import("@/lib/scenario-bank");
      setFinalDimensions(computeSessionDimensions(finalResponses));
      setFinalXp(finalResponses.length * 30 + 50);
    } finally {
      setSaving(false);
      setPhase("results");
    }
  }

  async function loadHistory() {
    setLoadingSessions(true);
    setPhase("history");
    try {
      const res = await fetch("/api/instinct-sessions");
      const data = await res.json();
      setPastSessions(data.sessions || []);
    } catch {
      setPastSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }

  // ── Intro Screen ─────────────────────────────────────────────────────────

  if (phase === "intro") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: "var(--page-bg)" }}>
        <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16, lineHeight: 1 }}>🎯</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 12px", letterSpacing: -1 }}>
            Career Instincts
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-muted)", margin: "0 0 8px", lineHeight: 1.6 }}>
            10 workplace scenarios. No wrong answers. Just your instincts.
          </p>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 32px", lineHeight: 1.6 }}>
            How you respond reveals your natural strengths across 6 professional dimensions.
          </p>

          {/* Dimension preview */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 32 }}>
            {(Object.keys(DIMENSION_LABELS) as Dimension[]).map((dim) => (
              <div key={dim} style={{
                background: "var(--card-bg)", border: "1px solid var(--card-border-soft)",
                borderRadius: "var(--radius-lg)", padding: "12px 10px", textAlign: "center",
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{DIMENSION_ICONS[dim]}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
                  {DIMENSION_LABELS[dim]}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={startGame}
            style={{
              width: "100%", padding: "16px 0", borderRadius: 14, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, var(--accent), #0EA5E9)",
              color: "#fff", fontSize: 17, fontWeight: 700, letterSpacing: -0.3,
              boxShadow: "0 4px 20px rgba(37,99,235,0.35)", transition: "transform 100ms, box-shadow 100ms",
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = "translateY(-1px)"; (e.target as HTMLElement).style.boxShadow = "0 6px 28px rgba(37,99,235,0.45)"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = ""; (e.target as HTMLElement).style.boxShadow = "0 4px 20px rgba(37,99,235,0.35)"; }}
          >
            Start Playing →
          </button>

          <button
            onClick={loadHistory}
            style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, fontWeight: 700 }}
          >
            View past sessions
          </button>
        </div>
      </div>
    );
  }

  // ── History Screen ─────────────────────────────────────────────────────────

  if (phase === "history") {
    return (
      <div style={{ minHeight: "100vh", padding: "40px 24px", background: "var(--page-bg)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <button onClick={() => setPhase("intro")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, fontWeight: 700, marginBottom: 24, padding: 0 }}>
            ← Back
          </button>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 24px", letterSpacing: -0.5 }}>
            Your Session History
          </h2>

          {loadingSessions ? (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>Loading...</div>
          ) : pastSessions.length === 0 ? (
            <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", borderRadius: "var(--radius-xl)", padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
              No sessions yet. Play your first round!
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {pastSessions.map((s, i) => {
                const dims = s.dimensions as Record<Dimension, number>;
                const top = getTopDimensions(dims, 2);
                return (
                  <div key={s.id} style={{ background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", borderRadius: "var(--radius-xl)", padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}>Session {pastSessions.length - i}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <div style={{ background: "var(--accent-soft)", borderRadius: 99, padding: "4px 12px", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                        +{s.xpEarned} XP
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {top.map((d) => (
                        <div key={d} style={{ background: DIMENSION_COLORS[d] + "18", border: `1px solid ${DIMENSION_COLORS[d]}40`, borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 800, color: DIMENSION_COLORS[d] }}>
                          {DIMENSION_ICONS[d]} {DIMENSION_LABELS[d]} {Math.round(dims[d] * 100)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={startGame}
            style={{ width: "100%", marginTop: 24, padding: "14px 0", borderRadius: "var(--radius-lg)", border: "none", cursor: "pointer", background: "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 700 }}
          >
            Play Again →
          </button>
        </div>
      </div>
    );
  }

  // ── Results Screen ─────────────────────────────────────────────────────────

  if (phase === "results") {
    const dims = finalDimensions!;
    const top2 = getTopDimensions(dims, 2);
    const lowest = getLowestDimension(dims);

    return (
      <div style={{ minHeight: "100vh", padding: "40px 24px", background: "var(--page-bg)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 8px", letterSpacing: -0.8 }}>
              Your Instinct Profile
            </h2>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--accent-soft)", borderRadius: 99, padding: "6px 18px" }}>
              <span style={{ fontSize: 16 }}>⚡</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)" }}>+{finalXp} XP earned</span>
            </div>
          </div>

          {/* Standout strengths */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            {top2.map((d, i) => (
              <div key={d} style={{
                background: DIMENSION_COLORS[d] + "12",
                border: `1px solid ${DIMENSION_COLORS[d]}35`,
                borderRadius: "var(--radius-xl)", padding: "18px 16px",
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{DIMENSION_ICONS[d]}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: DIMENSION_COLORS[d], letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>
                  {i === 0 ? "Top Strength" : "Also Strong"}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                  {DIMENSION_LABELS[d]}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {DIMENSION_DESCRIPTIONS[d]}
                </div>
              </div>
            ))}
          </div>

          {/* Growth area */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", borderRadius: "var(--radius-xl)", padding: "16px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 28 }}>🌱</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2 }}>Growth Opportunity</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{DIMENSION_LABELS[lowest]}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{DIMENSION_DESCRIPTIONS[lowest]}</div>
            </div>
          </div>

          {/* All dimension bars */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", borderRadius: "var(--radius-xl)", padding: "20px 22px", marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 16 }}>All Dimensions</div>
            {(Object.keys(dims) as Dimension[])
              .sort((a, b) => dims[b] - dims[a])
              .map((d) => (
                <DimensionBar key={d} dim={d} value={dims[d]} animate />
              ))}
          </div>

          {/* CTA */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button
              onClick={startGame}
              style={{ padding: "14px 0", borderRadius: "var(--radius-lg)", border: "1px solid var(--card-border-soft)", cursor: "pointer", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 14, fontWeight: 700 }}
            >
              Play Again
            </button>
            <button
              onClick={loadHistory}
              style={{ padding: "14px 0", borderRadius: "var(--radius-lg)", border: "none", cursor: "pointer", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 700 }}
            >
              View History
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Playing / Insight Screen ──────────────────────────────────────────────

  if (!current) return null;

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px", background: "var(--page-bg)" }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>

        {/* HUD */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button
            onClick={() => setPhase("intro")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, fontWeight: 700, padding: 0 }}
          >
            ✕ Quit
          </button>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {streak >= 2 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 800, color: "#F59E0B" }}>
                🔥 {streak}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent-soft)", borderRadius: 99, padding: "5px 14px" }}>
              <span style={{ fontSize: 14 }}>⚡</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>
                <XPCounter xp={xp} />
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
              {currentIdx + 1} of {scenarios.length}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
              {DIMENSION_ICONS[current.category]} {DIMENSION_LABELS[current.category]}
            </span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: "var(--card-bg-strong)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, var(--accent), #0EA5E9)", width: `${progress}%`, transition: "width 0.4s ease" }} />
          </div>
        </div>

        {/* Scenario card */}
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border-soft)",
          borderRadius: 20,
          padding: "28px 28px 24px",
          marginBottom: 20,
          opacity: cardAnim ? 0 : 1,
          transform: cardAnim ? "translateY(-8px)" : "translateY(0)",
          transition: "opacity 0.2s, transform 0.2s",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.9, textTransform: "uppercase", color: DIMENSION_COLORS[current.category], marginBottom: 12 }}>
            {current.label}
          </div>
          <p style={{ fontSize: 17, color: "var(--text-primary)", lineHeight: 1.65, margin: 0, fontWeight: 500 }}>
            {current.situation}
          </p>
        </div>

        {/* Choices */}
        {phase === "playing" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {current.choices.map((choice, idx) => (
              <button
                key={idx}
                onClick={() => handleChoiceSelect(idx)}
                style={{
                  padding: "18px 16px",
                  borderRadius: "var(--radius-xl)",
                  border: "1.5px solid var(--card-border-soft)",
                  background: "var(--card-bg)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1.5,
                  transition: "all 120ms",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = "var(--accent)";
                  el.style.background = "var(--accent-soft)";
                  el.style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = "var(--card-border-soft)";
                  el.style.background = "var(--card-bg)";
                  el.style.color = "var(--text-primary)";
                }}
              >
                {choice.text}
              </button>
            ))}
          </div>
        )}

        {/* Insight reveal */}
        {phase === "insight" && selectedChoice !== null && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>
            <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>

            {/* Selected choice highlighted */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {current.choices.map((choice, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "18px 16px",
                    borderRadius: "var(--radius-xl)",
                    border: idx === selectedChoice ? `2px solid var(--accent)` : "1.5px solid var(--card-border-soft)",
                    background: idx === selectedChoice ? "var(--accent-soft)" : "var(--card-bg-strong)",
                    fontSize: 14,
                    fontWeight: idx === selectedChoice ? 800 : 600,
                    color: idx === selectedChoice ? "var(--accent)" : "var(--text-muted)",
                    lineHeight: 1.5,
                    opacity: idx === selectedChoice ? 1 : 0.5,
                  }}
                >
                  {idx === selectedChoice && <span style={{ marginRight: 6 }}>✓</span>}
                  {choice.text}
                </div>
              ))}
            </div>

            {/* Insight card */}
            <div style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border-soft)",
              borderRadius: 18,
              padding: "22px 24px",
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.9, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>
                This reveals
              </div>
              <p style={{ fontSize: 15, color: "var(--text-primary)", lineHeight: 1.65, margin: "0 0 16px", fontWeight: 500 }}>
                {current.choices[selectedChoice].insight}
              </p>

              {/* Dimension tags */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(Object.entries(current.choices[selectedChoice].dimensions) as [Dimension, number][])
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([dim, val]) => (
                    <div key={dim} style={{
                      background: DIMENSION_COLORS[dim] + "18",
                      border: `1px solid ${DIMENSION_COLORS[dim]}40`,
                      borderRadius: 99,
                      padding: "4px 12px",
                      fontSize: 12,
                      fontWeight: 800,
                      color: DIMENSION_COLORS[dim],
                    }}>
                      {DIMENSION_ICONS[dim]} {DIMENSION_LABELS[dim]} +{Math.round(val * 100)}
                    </div>
                  ))}
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={saving}
              style={{
                width: "100%", padding: "16px 0", borderRadius: 14, border: "none", cursor: saving ? "default" : "pointer",
                background: saving ? "var(--card-bg-strong)" : "linear-gradient(135deg, var(--accent), #0EA5E9)",
                color: saving ? "var(--text-muted)" : "#fff",
                fontSize: 16, fontWeight: 700, transition: "all 120ms",
              }}
            >
              {saving ? "Saving..." : currentIdx + 1 >= scenarios.length ? "See Results →" : "Next →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
