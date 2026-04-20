"use client";

import React, { useEffect, useRef, useState, useMemo, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import PremiumShell from "@/app/components/PremiumShell";
import WebcamOverlay, { type WebcamOverlayHandle, type CombinedMetrics } from "@/app/components/WebcamOverlay";
import type { FaceMetrics } from "@/app/hooks/useFaceAnalysis";
import type { HandMetrics } from "@/app/hooks/useHandAnalysis";
import type { ConversationTurn, MockScoreResult, CompetencyQuestion } from "@/app/api/mock-interview/route";
import { buildUserCoachingProfile } from "@/app/lib/feedback/coachingProfile";
import OCCUPATIONS, { type Occupation } from "@/app/lib/onet-occupations";

// ── Local storage ─────────────────────────────────────────────────────────────

function safeJSONParse<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase =
  | "setup"
  | "countdown"
  | "question"
  | "recording"
  | "processing"
  | "between"
  | "finishing"
  | "results";

interface SessionConfig {
  role: string;
  roleKey?: string;        // O*NET key, if selected from saved/search
  industry: string;
  numQuestions: number;
  questionTypes: ("behavioral" | "situational")[];
  competencyQuestions?: CompetencyQuestion[]; // pre-fetched from RoleCompetencyMap
}

const CLUSTER_TO_INDUSTRY: Record<string, string> = {
  finance: "Finance",
  tech: "Technology",
  consulting: "Consulting",
  marketing: "Marketing",
  operations: "Operations",
  healthcare: "Healthcare",
  education: "Non-profit",
  trades: "Operations",
};

// ── Dimension labels ──────────────────────────────────────────────────────────

const DIM_ORDER = [
  "narrative_clarity",
  "evidence_quality",
  "ownership_agency",
  "response_control",
  "cognitive_depth",
  "presence_confidence",
  "vocal_engagement",
] as const;

// ── Small components ──────────────────────────────────────────────────────────

function ScoreBar({ label, score, coaching }: { label: string; score: number; coaching: string }) {
  const color = score >= 7.5 ? "#10B981" : score >= 5.5 ? "var(--accent)" : "#EF4444";
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{score.toFixed(1)}/10</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden", marginBottom: 5 }}>
        <div style={{ width: `${Math.round(score * 10)}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{coaching}</div>
    </div>
  );
}

function ReadinessBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    strong:      { label: "Interview Ready",    color: "#10B981", bg: "rgba(16,185,129,0.12)" },
    ready:       { label: "Ready to Interview", color: "#10B981", bg: "rgba(16,185,129,0.08)" },
    developing:  { label: "Developing",         color: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
    not_ready:   { label: "More Practice Needed", color: "#EF4444", bg: "rgba(239,68,68,0.10)" },
  };
  const { label, color, bg } = map[level] ?? map.developing;
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99,
      color, background: bg, border: `1px solid ${color}33`,
    }}>
      {label}
    </span>
  );
}

function PulsingDot() {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: "#EF4444", marginRight: 8,
      animation: "mockPulse 1.2s ease-in-out infinite",
    }} />
  );
}

// ── Setup Screen ──────────────────────────────────────────────────────────────

function SetupScreen({
  onStart,
  savedRoleKeys,
}: {
  onStart: (cfg: SessionConfig) => void;
  savedRoleKeys: string[];
}) {
  // Tab
  const [tab, setTab] = useState<"new" | "history">("new");

  // Past session history
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setHistoryLoading(true);
    fetch("/api/mock-interview?all=1", { cache: "no-store" })
      .then(r => r.ok ? r.json() : { attempts: [] })
      .then(d => { if (Array.isArray(d?.attempts)) setPastSessions(d.attempts); })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  // Role selection
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null);
  const [customRole, setCustomRole] = useState("");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Competency map fetched when a role key is selected
  const [competencyQuestions, setCompetencyQuestions] = useState<CompetencyQuestion[] | null>(null);
  const [loadingCompetency, setLoadingCompetency] = useState(false);

  // Other config
  const [industry, setIndustry] = useState("Technology");
  const [numQuestions, setNumQuestions] = useState(5);
  const [types, setTypes] = useState<("behavioral" | "situational")[]>(["behavioral", "situational"]);

  const industries = ["Technology", "Finance", "Consulting", "Healthcare", "Marketing", "Operations", "Research", "Non-profit"];

  // Resolve saved occupations for display
  const savedOccs: Occupation[] = savedRoleKeys
    .map(k => OCCUPATIONS.find((o: Occupation) => o.id === k))
    .filter((o): o is Occupation => o != null);

  // O*NET search results
  const filteredOccs: Occupation[] = search.length >= 2
    ? OCCUPATIONS
        .filter((o: Occupation) =>
          o.title.toLowerCase().includes(search.toLowerCase()) ||
          o.category.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 8)
    : [];

  const selectedOcc = selectedRoleKey
    ? OCCUPATIONS.find((o: Occupation) => o.id === selectedRoleKey) ?? null
    : null;

  const roleLabel = selectedOcc?.title ?? customRole;

  // When a role key is selected, fetch its competency map and auto-set industry
  useEffect(() => {
    if (!selectedRoleKey) { setCompetencyQuestions(null); return; }
    setLoadingCompetency(true);
    fetch(`/api/role-competency?roleKey=${encodeURIComponent(selectedRoleKey)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data?.questions)) setCompetencyQuestions(data.questions as CompetencyQuestion[]);
      })
      .catch(() => {})
      .finally(() => setLoadingCompetency(false));
  }, [selectedRoleKey]);

  function selectRole(occ: Occupation) {
    setSelectedRoleKey(occ.id);
    setCustomRole("");
    setSearch("");
    setShowSearch(false);
    // Auto-set industry from cluster
    // Simple category → industry heuristic
    const cat = occ.category.toLowerCase();
    if (cat.includes("finance") || cat.includes("banking") || cat.includes("accounting") || cat.includes("insurance")) setIndustry("Finance");
    else if (cat.includes("tech") || cat.includes("engineer") || cat.includes("software") || cat.includes("data")) setIndustry("Technology");
    else if (cat.includes("consult") || cat.includes("strategy")) setIndustry("Consulting");
    else if (cat.includes("marketing") || cat.includes("advertis") || cat.includes("media")) setIndustry("Marketing");
    else if (cat.includes("health") || cat.includes("medical") || cat.includes("pharma")) setIndustry("Healthcare");
    else if (cat.includes("education") || cat.includes("social") || cat.includes("nonprofit")) setIndustry("Non-profit");
    else if (cat.includes("operation") || cat.includes("supply") || cat.includes("logistics") || cat.includes("manufactur")) setIndustry("Operations");
  }

  function clearRole() {
    setSelectedRoleKey(null);
    setCustomRole("");
    setCompetencyQuestions(null);
  }

  function toggleType(t: "behavioral" | "situational") {
    setTypes(prev =>
      prev.includes(t)
        ? prev.length > 1 ? prev.filter(x => x !== t) : prev
        : [...prev, t]
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)", fontSize: 14, fontWeight: 500,
    border: "1px solid var(--card-border)", background: "var(--input-bg)",
    color: "var(--text-primary)", outline: "none", boxSizing: "border-box",
  };

  const uniqueCompetencies = competencyQuestions
    ? [...new Set(competencyQuestions.map(q => q.competency))]
    : null;

  return (
    <div style={{ maxWidth: 580, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: "var(--accent)", textTransform: "uppercase", marginBottom: 8 }}>
          Mock Interview
        </div>
        <h1 style={{ margin: "0 0 10px", fontSize: 30, fontWeight: 700, color: "var(--text-primary)", letterSpacing: -0.5 }}>
          Full Interview Simulation
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 460, marginInline: "auto" }}>
          An AI interviewer asks real questions, adapts to your answers, and generates a
          coaching report tied to your full practice history.
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--card-bg-strong)", borderRadius: "var(--radius-lg)", padding: 4, border: "1px solid var(--card-border-soft)" }}>
        {([["new", "New Session"], ["history", `History${pastSessions.length > 0 ? ` (${pastSessions.length})` : ""}`]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 700,
              border: "none", cursor: "pointer",
              background: tab === key ? "var(--card-bg)" : "transparent",
              color: tab === key ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── History tab ── */}
      {tab === "history" && (() => {
        if (historyLoading) {
          return <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 14 }}>Loading sessions…</div>;
        }
        if (pastSessions.length === 0) {
          return (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎤</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>No sessions yet</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Complete your first mock interview to see your history here.</div>
              <button onClick={() => setTab("new")} style={{ padding: "10px 24px", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
                Start Interview →
              </button>
            </div>
          );
        }

        const scores = pastSessions.map(s => {
          const fb = s.feedback as any;
          const raw = typeof s.score === "number" ? s.score : (typeof fb?.score === "number" ? fb.score : null);
          return raw !== null ? (raw <= 10 ? Math.round(raw * 10) : Math.round(raw)) : null;
        }).filter((v): v is number => v !== null);
        const avg  = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
        const best = scores.length ? Math.max(...scores) : null;
        const trend = scores.length >= 2 ? scores[0] - scores[scores.length - 1] : null;

        return (
          <div>
            {/* Aggregate stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Sessions",  value: pastSessions.length.toString() },
                { label: "Avg Score", value: avg  !== null ? `${avg}`  : "—" },
                { label: "Best",      value: best !== null ? `${best}` : "—" },
                { label: "Trend",     value: trend !== null ? (trend > 0 ? `+${trend}` : `${trend}`) : "—",
                  color: trend !== null ? (trend > 0 ? "#10B981" : trend < 0 ? "#EF4444" : "var(--text-primary)") : undefined },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: "12px 10px", borderRadius: "var(--radius-md)", background: "var(--card-bg)", border: "1px solid var(--card-border-soft)", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: color ?? "var(--text-primary)" }}>{value}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Session list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pastSessions.map((s, i) => {
                const fb = s.feedback as any;
                const rawScore = typeof s.score === "number" ? s.score : (typeof fb?.score === "number" ? fb.score : null);
                const pct = rawScore !== null ? (rawScore <= 10 ? Math.round(rawScore * 10) : Math.round(rawScore)) : null;
                const color = pct === null ? "var(--text-muted)" : pct >= 75 ? "#10B981" : pct >= 55 ? "#F59E0B" : "#EF4444";
                const role = fb?.role ?? fb?.config?.role ?? s.question ?? "Mock Interview";
                const date = s.ts ? new Date(s.ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
                const readiness = fb?.readiness_level ?? fb?.readinessLevel ?? null;
                const isExpanded = expandedId === (s.id ?? i.toString());

                const dimScores: Record<string, { label: string; score: number; coaching: string }> = fb?.dimension_scores ?? {};
                const strengths: string[] = fb?.strengths ?? [];
                const improvements: string[] = fb?.improvements ?? [];
                const coachingSummary: string = fb?.coaching_summary ?? "";

                return (
                  <div key={s.id ?? i} style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--card-border)", background: "var(--card-bg)", overflow: "hidden" }}>
                    {/* Row header — always visible */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : (s.id ?? i.toString()))}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: `${color}18`, border: `1px solid ${color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color }}>{pct ?? "—"}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{role}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                          {date}{readiness ? ` · ${readiness.replace(/_/g, " ")}` : ""}
                        </div>
                      </div>
                      <span style={{ fontSize: 16, color: "var(--text-muted)", flexShrink: 0, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>⌄</span>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--card-border-soft)" }}>
                        {coachingSummary && (
                          <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--card-bg-strong)", borderLeft: "3px solid var(--accent)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                            {coachingSummary}
                          </div>
                        )}

                        {/* Dimension scores */}
                        {Object.keys(dimScores).length > 0 && (
                          <div style={{ marginTop: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>Scorecard</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 20px" }}>
                              {Object.entries(dimScores).map(([key, d]) => {
                                const sc = d.score;
                                const c = sc >= 7.5 ? "#10B981" : sc >= 5.5 ? "var(--accent)" : "#EF4444";
                                return (
                                  <div key={key} style={{ paddingBottom: 8 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{d.label}</span>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{sc.toFixed(1)}</span>
                                    </div>
                                    <div style={{ height: 4, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                                      <div style={{ width: `${Math.round(sc * 10)}%`, height: "100%", background: c, borderRadius: 99 }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Strengths / improvements */}
                        {(strengths.length > 0 || improvements.length > 0) && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                            {strengths.length > 0 && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#10B981", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Strengths</div>
                                {strengths.slice(0, 3).map((st, j) => (
                                  <div key={j} style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, display: "flex", gap: 6, marginBottom: 3 }}>
                                    <span style={{ color: "#10B981" }}>✓</span>{st}
                                  </div>
                                ))}
                              </div>
                            )}
                            {improvements.length > 0 && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#F59E0B", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Work On</div>
                                {improvements.slice(0, 3).map((imp, j) => (
                                  <div key={j} style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, display: "flex", gap: 6, marginBottom: 3 }}>
                                    <span style={{ color: "#F59E0B" }}>→</span>{imp}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── New session tab ── */}
      {tab === "new" && <div>

      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-xl)", padding: 24, marginBottom: 16, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Role Selection ── */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.7 }}>
            What role are you interviewing for?
          </label>

          {/* Selected role chip */}
          {(selectedOcc || customRole) ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--accent)", background: "var(--accent-soft)", marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>
                  {roleLabel}
                </div>
                {loadingCompetency && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Loading role-specific questions…</div>
                )}
                {uniqueCompetencies && !loadingCompetency && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Covers: {uniqueCompetencies.slice(0, 4).map(c => c.replace(/_/g, " ")).join(" · ")}
                    {uniqueCompetencies.length > 4 && ` +${uniqueCompetencies.length - 4} more`}
                  </div>
                )}
              </div>
              <button onClick={clearRole} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", display: "flex", alignItems: "center", padding: 4 }}>
                <X size={16} />
              </button>
            </div>
          ) : null}

          {/* Saved target roles */}
          {savedOccs.length > 0 && !selectedOcc && !customRole && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Your saved targets</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {savedOccs.map(occ => (
                  <button
                    key={occ.id}
                    onClick={() => selectRole(occ)}
                    style={{
                      padding: "6px 14px", borderRadius: 99, fontSize: 13, fontWeight: 600,
                      border: "1px solid var(--card-border)", background: "transparent",
                      color: "var(--text-primary)", cursor: "pointer",
                    }}
                  >
                    {occ.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* O*NET Search */}
          {!selectedOcc && !customRole && (
            <div style={{ position: "relative" }}>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowSearch(true); }}
                  onFocus={() => setShowSearch(true)}
                  placeholder={savedOccs.length > 0 ? "Search for a different role…" : "Search roles (e.g. Financial Analyst, Product Manager)"}
                  style={{ ...inputStyle, paddingLeft: 34 }}
                />
              </div>
              {showSearch && filteredOccs.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50, background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
                  {filteredOccs.map(occ => (
                    <button
                      key={occ.id}
                      onClick={() => selectRole(occ)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: "1px solid var(--card-border-soft)" }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{occ.title}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{occ.category}</div>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>↵</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom free-text fallback */}
          {!selectedOcc && !customRole && !search && (
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                value={customRole}
                onChange={e => setCustomRole(e.target.value)}
                placeholder="Or type any role not in the list…"
                style={{ ...inputStyle, fontSize: 13 }}
              />
            </div>
          )}

          {savedOccs.length === 0 && !selectedOcc && !customRole && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
              No saved targets yet. <a href="/during-college" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Add roles in Role Prep →</a>
            </div>
          )}
        </div>

        {/* ── Industry ── */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.7 }}>
            Industry {selectedOcc ? <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(auto-set from role)</span> : ""}
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {industries.map(ind => (
              <button
                key={ind}
                onClick={() => setIndustry(ind)}
                style={{
                  padding: "6px 14px", borderRadius: 99, fontSize: 13, fontWeight: 600,
                  border: `1px solid ${industry === ind ? "var(--accent)" : "var(--card-border)"}`,
                  background: industry === ind ? "var(--accent-soft)" : "transparent",
                  color: industry === ind ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        {/* ── Question count ── */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.7 }}>
            Number of Questions
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            {[3, 5, 7].map(n => (
              <button
                key={n}
                onClick={() => setNumQuestions(n)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: "var(--radius-md)", fontSize: 14, fontWeight: 700,
                  border: `1px solid ${numQuestions === n ? "var(--accent)" : "var(--card-border)"}`,
                  background: numQuestions === n ? "var(--accent-soft)" : "transparent",
                  color: numQuestions === n ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {n} questions
                <div style={{ fontSize: 10, fontWeight: 500, marginTop: 2, opacity: 0.7 }}>
                  {n === 3 ? "~10 min" : n === 5 ? "~18 min" : "~25 min"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Question types ── */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.7 }}>
            Question Types
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            {(["behavioral", "situational"] as const).map(t => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 600,
                  border: `1px solid ${types.includes(t) ? "var(--accent)" : "var(--card-border)"}`,
                  background: types.includes(t) ? "var(--accent-soft)" : "transparent",
                  color: types.includes(t) ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {t === "behavioral" ? "Behavioral" : "Situational"}
                <div style={{ fontSize: 10, fontWeight: 500, marginTop: 2, opacity: 0.7 }}>
                  {t === "behavioral" ? '"Tell me about a time..."' : '"Imagine you\'re in..."'}
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* What to expect */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-lg)", padding: "14px 18px", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>What to expect</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[
            competencyQuestions ? `Questions tailored for ${roleLabel} across ${uniqueCompetencies?.length ?? 5} competency areas` : "AI interviewer adapts follow-up questions based on your actual answers",
            "Coaching report scored across 7 communication dimensions",
            "Results saved to your profile and factored into your insights",
            "Webcam optional — enables on-camera presence scoring",
          ].map(item => (
            <div key={item} style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: "#10B981", flexShrink: 0, marginTop: 1 }}>✓</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onStart({
          role: roleLabel || "a professional role",
          roleKey: selectedRoleKey ?? undefined,
          industry,
          numQuestions,
          questionTypes: types,
          competencyQuestions: competencyQuestions ?? undefined,
        })}
        disabled={loadingCompetency}
        style={{
          width: "100%", padding: "15px 0", borderRadius: "var(--radius-lg)",
          background: loadingCompetency ? "var(--card-border)" : "linear-gradient(135deg, var(--accent), #0EA5E9)",
          color: "#fff", fontWeight: 800, fontSize: 16, border: "none",
          cursor: loadingCompetency ? "not-allowed" : "pointer", letterSpacing: -0.3,
        }}
      >
        {loadingCompetency ? "Loading role questions…" : "Start Interview →"}
      </button>
      </div>}
    </div>
  );
}

// ── On-Camera Presence Card ───────────────────────────────────────────────────

function OnCameraCard({ face, hands }: { face: Record<string, number> | null; hands: HandMetrics | null }) {
  if (!face && !hands) return null;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const scoreColor = (s: number) => s >= 70 ? "#10B981" : s >= 45 ? "#F59E0B" : "#EF4444";

  const rows: { label: string; value: string; note: string; color?: string }[] = [];

  // Face signals
  if (face?.eyeContact != null)
    rows.push({ label: "Eye Contact", value: pct(face.eyeContact), note: face.eyeContact >= 0.75 ? "Strong camera presence" : face.eyeContact >= 0.5 ? "Room to improve" : "Look directly at camera", color: face.eyeContact >= 0.75 ? "#10B981" : face.eyeContact >= 0.5 ? "#F59E0B" : "#EF4444" });
  if (face?.smileRate != null)
    rows.push({ label: "Warmth / Smile", value: pct(face.smileRate), note: face.smileRate >= 0.25 ? "Approachable energy" : "Try to smile more naturally" });
  if (face?.headStability != null)
    rows.push({ label: "Head Stability", value: pct(face.headStability), note: face.headStability >= 0.75 ? "Composed and still" : "Reduce head movement" });
  if (face?.browEngagement != null)
    rows.push({ label: "Brow Engagement", value: pct(face.browEngagement), note: face.browEngagement >= 0.15 ? "Expressive face" : "Avoid a frozen expression" });
  if (face?.blinkRate != null)
    rows.push({ label: "Blink Rate", value: `${Math.round(face.blinkRate)}/min`, note: face.blinkRate >= 12 && face.blinkRate <= 22 ? "Normal range" : face.blinkRate > 22 ? "Elevated — may signal nerves" : "Very low — check screen distance" });

  // Hand signals
  if (hands) {
    if (hands.handVisibilityRate > 0.05) {
      rows.push({ label: "Gesture Expressiveness", value: `${hands.gestureScore}/100`, note: hands.gestureScore >= 70 ? "Effective use of open gestures" : hands.gestureScore >= 45 ? "Some gesturing — push for wider, open movements" : "Hands mostly hidden or still", color: scoreColor(hands.gestureScore) });
      if (hands.openGestureRate > 0.05)
        rows.push({ label: "Open Gesture Rate", value: pct(hands.openGestureRate), note: "Open palms read as confident and trustworthy" });
      if (hands.faceTouchCount > 0)
        rows.push({ label: "Face Touches", value: `${hands.faceTouchCount}×`, note: hands.faceTouchCount >= 4 ? "Frequent face touching — a nervous signal to reduce" : "Minor — worth being mindful of", color: hands.faceTouchCount >= 4 ? "#EF4444" : "#F59E0B" });
      if (hands.neckTouchCount > 0)
        rows.push({ label: "Neck / Chest Touches", value: `${hands.neckTouchCount}×`, note: "Self-soothing gesture — try to keep hands at chest level", color: "#F59E0B" });
      rows.push({ label: "Fidget Score", value: `${hands.fidgetScore}/100`, note: hands.fidgetScore <= 20 ? "Minimal nervous movement" : hands.fidgetScore <= 45 ? "Some fidgeting — stay aware" : "High fidgeting detected — slow down and breathe", color: hands.fidgetScore <= 20 ? "#10B981" : hands.fidgetScore <= 45 ? "#F59E0B" : "#EF4444" });
    }
  }

  if (rows.length === 0) return null;

  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 18 }}>On-Camera Presence</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--card-bg-strong)", border: "1px solid var(--card-border-soft)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{row.label}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: row.color ?? "var(--text-primary)" }}>{row.value}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{row.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Results Screen ────────────────────────────────────────────────────────────

function ResultsScreen({
  config,
  score,
  history,
  saved,
  onSave,
  onRetry,
  faceMetrics,
  handMetrics,
}: {
  config: SessionConfig;
  score: MockScoreResult;
  history: ConversationTurn[];
  saved: boolean;
  onSave: () => void;
  onRetry: () => void;
  faceMetrics?: Record<string, number> | null;
  handMetrics?: HandMetrics | null;
}) {
  const readinessColor: Record<string, string> = {
    strong: "#10B981", ready: "#10B981", developing: "#F59E0B", not_ready: "#EF4444",
  };
  const color = readinessColor[score.readinessLevel] ?? "#F59E0B";

  const candidateTurns = history.filter(t => t.speaker === "candidate");
  const totalWords = candidateTurns.reduce((sum, t) => sum + t.content.split(/\s+/).length, 0);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-xl)", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: "var(--accent)", textTransform: "uppercase", marginBottom: 6 }}>
              Interview Complete — {config.role}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 10 }}>
              <span style={{ fontSize: 64, fontWeight: 700, color, lineHeight: 1 }}>
                {score.overallScore}
              </span>
              <span style={{ fontSize: 16, color: "var(--text-muted)", fontWeight: 500 }}>/100</span>
            </div>
            <ReadinessBadge level={score.readinessLevel} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {history.filter(t => t.speaker === "interviewer").length} questions &nbsp;·&nbsp; ~{totalWords} words spoken
            </div>
            {!saved ? (
              <button
                onClick={onSave}
                style={{
                  padding: "9px 20px", borderRadius: "var(--radius-md)", background: "var(--accent)",
                  color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
                }}
              >
                Save to Profile
              </button>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 700, color: "#10B981" }}>✓ Saved to profile</span>
            )}
            <button
              onClick={onRetry}
              style={{
                padding: "9px 20px", borderRadius: "var(--radius-md)", background: "transparent",
                color: "var(--text-muted)", fontWeight: 600, fontSize: 13,
                border: "1px solid var(--card-border)", cursor: "pointer",
              }}
            >
              New Interview
            </button>
          </div>
        </div>

        {/* Coaching summary */}
        <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: "var(--radius-md)", background: "var(--card-bg-strong)", borderLeft: "3px solid var(--accent)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>Coaching Summary</div>
          <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7 }}>{score.coachingSummary}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Strengths */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#10B981", marginBottom: 14 }}>What You Did Well</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {score.strengths.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                <span style={{ color: "#10B981", flexShrink: 0, marginTop: 2 }}>✓</span>
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Improvements */}
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#F59E0B", marginBottom: 14 }}>Work On Next</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {score.improvements.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                <span style={{ color: "#F59E0B", flexShrink: 0, marginTop: 2 }}>→</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7 Dimensions */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 18 }}>Communication Scorecard</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 32px" }}>
          {DIM_ORDER.map(key => {
            const d = score.dimensionScores?.[key];
            if (!d) return null;
            return <ScoreBar key={key} label={d.label} score={d.score} coaching={d.coaching} />;
          })}
        </div>
      </div>

      {/* STAR */}
      {score.starScores && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 18 }}>STAR Structure</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {(["situation", "task", "action", "result"] as const).map(k => {
              const v = score.starScores[k];
              const c = v >= 70 ? "#10B981" : v >= 50 ? "#F59E0B" : "#EF4444";
              return (
                <div key={k} style={{ textAlign: "center", padding: "14px 10px", borderRadius: "var(--radius-md)", background: "var(--card-bg-strong)", border: `1px solid ${c}22` }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, textTransform: "capitalize", fontWeight: 600 }}>{k}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interview Arc */}
      {score.interviewArc && score.interviewArc.qualityArc.length > 0 && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Interview Arc</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>How your performance changed across the session.</div>

          {/* Arc sparklines */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
            {([
              { label: "Answer Quality", arc: score.interviewArc.qualityArc, max: 100, suffix: "" },
              { label: "Confidence", arc: score.interviewArc.confidenceArc, max: 10, suffix: "" },
              { label: "Word Count", arc: score.interviewArc.wordCountArc, max: Math.max(...(score.interviewArc.wordCountArc ?? [1])), suffix: "w" },
            ] as const).map(({ label, arc, max }) => {
              if (!arc || arc.length === 0) return null;
              const h = 48;
              const w = 100;
              const pts = arc.map((v, i) => `${(i / Math.max(arc.length - 1, 1)) * w},${h - (v / max) * h}`).join(" ");
              return (
                <div key={label}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
                  <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, overflow: "visible" }}>
                    <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                    {arc.map((v, i) => (
                      <circle key={i} cx={(i / Math.max(arc.length - 1, 1)) * w} cy={h - (v / max) * h} r="3" fill="var(--accent)" />
                    ))}
                  </svg>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    {arc.map((v, i) => (
                      <span key={i} style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Q{i + 1}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Arc summary flags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {score.interviewArc.warmupEffect && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(245,158,11,0.1)", color: "#D97706" }}>Warm-up Effect</span>
            )}
            {score.interviewArc.fatigueSigns && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>Late Fatigue</span>
            )}
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "var(--card-bg-strong)", color: "var(--text-muted)" }}>
              Consistency {score.interviewArc.consistencyScore}/100
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "var(--card-bg-strong)", color: "var(--text-muted)", textTransform: "capitalize" }}>
              Arc: {score.interviewArc.pitchDrift}
            </span>
          </div>

          {/* Opening / closing notes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--card-bg-strong)", borderLeft: "2px solid #10B981" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#10B981", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Opening</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{score.interviewArc.openingNote}</div>
            </div>
            <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--card-bg-strong)", borderLeft: "2px solid var(--accent)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Closing</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{score.interviewArc.closingNote}</div>
            </div>
          </div>
        </div>
      )}

      {/* Per-question breakdown */}
      {score.questionBreakdowns?.length > 0 && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Question Breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {score.questionBreakdowns.map((qb, i) => {
              const c = qb.score >= 70 ? "#10B981" : qb.score >= 50 ? "#F59E0B" : "#EF4444";
              const hasSigs = qb.confidenceSignal != null || qb.ownershipScore != null || qb.wordCount != null;
              return (
                <div key={i} style={{ padding: "14px 0", borderBottom: i < score.questionBreakdowns.length - 1 ? "1px solid var(--card-border-soft)" : "none" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "start", marginBottom: hasSigs ? 10 : 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: `${c}15`, border: `1px solid ${c}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: c }}>{qb.score}</span>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>{qb.question}</div>
                        {qb.starComplete === false && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: "rgba(245,158,11,0.1)", color: "#D97706", whiteSpace: "nowrap" }}>Missing STAR part</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{qb.note}</div>
                    </div>
                  </div>
                  {hasSigs && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginLeft: 58 }}>
                      {qb.confidenceSignal != null && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Confidence <strong style={{ color: "var(--text-primary)" }}>{qb.confidenceSignal}/10</strong></span>
                      )}
                      {qb.ownershipScore != null && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Ownership <strong style={{ color: "var(--text-primary)" }}>{qb.ownershipScore}/10</strong></span>
                      )}
                      {qb.wordCount != null && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{qb.wordCount} words</span>
                      )}
                      {qb.fillerEstimate != null && qb.fillerEstimate > 0 && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{qb.fillerEstimate} fillers est.</span>
                      )}
                      <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>{qb.competency?.replace(/_/g, " ")}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <OnCameraCard face={faceMetrics ?? null} hands={handMetrics ?? null} />
    </div>
  );
}

// ── Main Interview Page ───────────────────────────────────────────────────────

export default function MockInterviewPage() {
  return (
    <Suspense fallback={<PremiumShell title="Mock Interview"><div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)", fontSize: 15 }}>Loading…</div></PremiumShell>}>
      <MockInterviewPageInner />
    </Suspense>
  );
}

function MockInterviewPageInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  // Phase + config
  const [phase, setPhase] = useState<Phase>("setup");
  const [config, setConfig] = useState<SessionConfig | null>(null);

  // Saved target role keys
  const [savedRoleKeys, setSavedRoleKeys] = useState<string[]>([]);
  // Role key practiced in last session (for "add to targets" prompt)
  const [addTargetRoleKey, setAddTargetRoleKey] = useState<string | null>(null);

  // Conversation
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentCompetency, setCurrentCompetency] = useState("");
  const [currentQuestionType, setCurrentQuestionType] = useState<string>("behavioral");
  const [isFollowup, setIsFollowup] = useState(false);
  const [mainQuestionsAsked, setMainQuestionsAsked] = useState(0);

  // Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown
  const [countdown, setCountdown] = useState(3);

  // Status messages
  const [statusMsg, setStatusMsg] = useState("");

  // Results
  const [scoreResult, setScoreResult] = useState<MockScoreResult | null>(null);
  const [saved, setSaved] = useState(false);

  // Face + hand metrics
  const webcamRef = useRef<WebcamOverlayHandle>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const faceSessionSamples = useRef<FaceMetrics[]>([]);
  const handSessionSamples = useRef<HandMetrics[]>([]);
  const [sessionFaceMetrics, setSessionFaceMetrics] = useState<Record<string, number> | null>(null);
  const [sessionHandMetrics, setSessionHandMetrics] = useState<HandMetrics | null>(null);

  // Coaching profile context from practice history
  const [coachingContext, setCoachingContext] = useState<string | null>(null);

  // Load coaching profile from localStorage + fetch saved target roles
  useEffect(() => {
    if (!session?.user) return;
    const key = `ipc_history_${session.user.email ?? ""}`;
    const saved = safeJSONParse<any[]>(localStorage.getItem(key), []);
    if (saved.length >= 2) {
      try {
        const profile = buildUserCoachingProfile(saved);
        setCoachingContext(profile.llmContext ?? null);
      } catch {
        // if history is malformed, skip coaching context
      }
    }
    // Fetch coaching context from API
    fetch("/api/attempts?limit=200", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const attempts = Array.isArray(data?.attempts) ? data.attempts : [];
        if (attempts.length >= 2) {
          const profile = buildUserCoachingProfile(attempts);
          setCoachingContext(profile.llmContext ?? null);
        }
      })
      .catch(() => {});
    // Fetch saved target role keys
    fetch("/api/cluster-readiness", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data?.targetRoleKeys)) setSavedRoleKeys(data.targetRoleKeys as string[]);
      })
      .catch(() => {});
  }, [session]);

  // Load last results if navigated with ?view=results
  useEffect(() => {
    if (searchParams.get("view") !== "results") return;
    fetch("/api/mock-interview", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const attempt = data?.attempt;
        if (!attempt) return;
        const fb = attempt.feedback as Record<string, any> | null ?? {};
        const scored: MockScoreResult = {
          overallScore:       (attempt.score ?? 0) * 10,
          readinessLevel:     fb.readiness_level ?? "developing",
          coachingSummary:    fb.coaching_summary ?? "",
          strengths:          fb.strengths ?? [],
          improvements:       fb.improvements ?? [],
          dimensionScores:    fb.dimension_scores ?? {},
          starScores:         { situation: (fb.star?.situation ?? 5) * 10, task: (fb.star?.task ?? 5) * 10, action: (fb.star?.action ?? 5) * 10, result: (fb.star?.result ?? 5) * 10 },
          questionBreakdowns: fb.question_breakdowns ?? [],
          interviewArc:       fb.interview_arc ?? undefined,
        };
        setScoreResult(scored);
        setConfig({ role: attempt.question ?? "Unknown Role", industry: "Unknown", numQuestions: 5, questionTypes: ["behavioral"] });
        setPhase("results");
        setSaved(true); // already saved, hide save button
      })
      .catch(() => {});
  }, [searchParams]);

  // Webcam: collect face + hand samples after each answer
  function collectFaceSample() {
    if (!webcamEnabled) return;
    const combined = webcamRef.current?.stop();
    if (combined?.face)  faceSessionSamples.current.push(combined.face);
    if (combined?.hands) handSessionSamples.current.push(combined.hands);
    // Restart for next question
    webcamRef.current?.start().catch(() => {});
  }

  function avgFaceMetrics(): Record<string, number> | null {
    const samples = faceSessionSamples.current;
    if (samples.length === 0) return null;
    const keys: (keyof FaceMetrics)[] = ["eyeContact", "expressiveness", "headStability", "smileRate", "blinkRate", "browEngagement", "lookAwayRate"];
    const out: Record<string, number> = {};
    for (const k of keys) {
      const vals = samples.map(s => s[k] as number).filter(v => typeof v === "number");
      if (vals.length > 0) out[k] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  function avgHandMetrics(): HandMetrics | null {
    const samples = handSessionSamples.current;
    if (samples.length === 0) return null;
    const avgNum = (key: keyof HandMetrics) => {
      const vals = samples.map(s => s[key] as number).filter(v => typeof v === "number");
      return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0;
    };
    const sumNum = (key: keyof HandMetrics) =>
      samples.reduce((acc, s) => acc + (s[key] as number), 0);
    return {
      handVisibilityRate: avgNum("handVisibilityRate"),
      twoHandRate:        avgNum("twoHandRate"),
      faceTouchCount:     sumNum("faceTouchCount"),
      neckTouchCount:     sumNum("neckTouchCount"),
      openGestureRate:    avgNum("openGestureRate"),
      pointingRate:       avgNum("pointingRate"),
      fistRate:           avgNum("fistRate"),
      gestureSpan:        avgNum("gestureSpan"),
      gestureEnergy:      avgNum("gestureEnergy"),
      chestZoneRate:      avgNum("chestZoneRate"),
      lowZoneRate:        avgNum("lowZoneRate"),
      highZoneRate:       avgNum("highZoneRate"),
      gestureScore:       Math.round(avgNum("gestureScore")),
      fidgetScore:        Math.round(avgNum("fidgetScore")),
      framesAnalyzed:     sumNum("framesAnalyzed"),
      durationSeconds:    sumNum("durationSeconds"),
    };
  }

  // ── Start session ───────────────────────────────────────────────────────────

  async function handleStart(cfg: SessionConfig) {
    setConfig(cfg);
    setHistory([]);
    setMainQuestionsAsked(0);
    setScoreResult(null);
    setSaved(false);
    faceSessionSamples.current = [];
    handSessionSamples.current = [];

    // Request mic
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: webcamEnabled });
      streamRef.current = s;
    } catch {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = s;
      } catch {
        alert("Microphone access is required for the interview.");
        return;
      }
    }

    if (webcamEnabled) {
      webcamRef.current?.start().catch(() => {});
    }

    setStatusMsg("Preparing your interview…");
    setPhase("countdown");

    // Track if this role needs to be added to targets after the session
    if (cfg.roleKey && !savedRoleKeys.includes(cfg.roleKey)) {
      setAddTargetRoleKey(cfg.roleKey);
    } else {
      setAddTargetRoleKey(null);
    }

    // Fetch first question while countdown runs
    const questionPromise = fetch("/api/mock-interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        role: cfg.role,
        industry: cfg.industry,
        numQuestions: cfg.numQuestions,
        questionTypes: cfg.questionTypes,
        coachingContext,
        competencyQuestions: cfg.competencyQuestions,
      }),
    }).then(r => r.json());

    // 3-second countdown
    setCountdown(3);
    await new Promise<void>(resolve => {
      let c = 3;
      const interval = setInterval(() => {
        c--;
        setCountdown(c);
        if (c <= 0) { clearInterval(interval); resolve(); }
      }, 1000);
    });

    const data = await questionPromise;
    setCurrentQuestion(data.message);
    setCurrentCompetency(data.competency ?? "");
    setCurrentQuestionType(data.questionType ?? "behavioral");
    setIsFollowup(false);
    setMainQuestionsAsked(1);
    setHistory([{ speaker: "interviewer", content: data.message, questionIndex: 1, competency: data.competency, questionType: data.questionType }]);
    setPhase("question");
  }

  // ── Recording ───────────────────────────────────────────────────────────────

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: "audio/webm" });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start(250);
    mediaRecorderRef.current = mr;
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    setPhase("recording");
  }

  async function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);

    await new Promise<void>(resolve => {
      const mr = mediaRecorderRef.current!;
      mr.onstop = () => resolve();
      mr.stop();
    });

    setPhase("processing");
    setStatusMsg("Transcribing your answer…");
    collectFaceSample();

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const form = new FormData();
    form.append("audio", blob, "answer.webm");

    const transcribeRes = await fetch("/api/mock-interview/transcribe", { method: "POST", body: form });
    const { transcript } = await transcribeRes.json();

    const newHistory: ConversationTurn[] = [
      ...history,
      { speaker: "candidate", content: transcript },
    ];
    setHistory(newHistory);

    // Get next action from AI
    setStatusMsg("Thinking…");
    const nextRes = await fetch("/api/mock-interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "respond",
        role: config!.role,
        industry: config!.industry,
        transcript,
        history: newHistory,
        mainQuestionsAsked,
        numQuestions: config!.numQuestions,
        questionTypes: config!.questionTypes,
        coachingContext,
        competencyQuestions: config!.competencyQuestions,
      }),
    });
    const next = await nextRes.json();

    if (next.action === "done") {
      await finishInterview(newHistory);
    } else {
      const nextTurn: ConversationTurn = {
        speaker: "interviewer",
        content: next.message,
        questionIndex: next.isFollowup ? mainQuestionsAsked : mainQuestionsAsked + 1,
        isFollowup: next.isFollowup,
        competency: next.competency,
        questionType: next.questionType,
      };
      const fullHistory = [...newHistory, nextTurn];
      setHistory(fullHistory);
      setCurrentQuestion(next.message);
      setCurrentCompetency(next.competency ?? "");
      setCurrentQuestionType(next.questionType ?? "behavioral");
      setIsFollowup(next.isFollowup ?? false);
      if (!next.isFollowup) setMainQuestionsAsked(q => q + 1);
      setPhase("between");
    }
  }

  // ── Finish & score ──────────────────────────────────────────────────────────

  async function finishInterview(finalHistory: ConversationTurn[]) {
    setPhase("finishing");
    setStatusMsg("Scoring your interview…");

    streamRef.current?.getTracks().forEach(t => t.stop());

    const scoreRes = await fetch("/api/mock-interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "score",
        role: config!.role,
        industry: config!.industry,
        history: finalHistory,
        faceMetrics: avgFaceMetrics(),
        handMetrics: avgHandMetrics(),
      }),
    });
    const scored: MockScoreResult = await scoreRes.json();
    setScoreResult(scored);
    setSessionFaceMetrics(avgFaceMetrics());
    setSessionHandMetrics(avgHandMetrics());
    setPhase("results");
  }

  // ── Save to profile ─────────────────────────────────────────────────────────

  async function saveToProfile() {
    if (!scoreResult || !config) return;
    const res = await fetch("/api/mock-interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save",
        role: config.role,
        industry: config.industry,
        history,
        scoreResult,
        faceMetrics: avgFaceMetrics(),
        handMetrics: avgHandMetrics(),
      }),
    });
    if (res.ok) setSaved(true);
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const competencyColor: Record<string, string> = {
    leadership: "#F59E0B",
    communication: "#2563EB",
    problem_solving: "#8B5CF6",
    collaboration: "#10B981",
    "domain knowledge": "#0EA5E9",
    teamwork: "#10B981",
    professionalism: "#0EA5E9",
  };
  const qColor = competencyColor[currentCompetency?.toLowerCase()] ?? "var(--accent)";

  // ── Conversation log (right sidebar) ────────────────────────────────────────

  const conversationLog = useMemo(() => {
    return history.slice().reverse();
  }, [history]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (phase === "setup") {
    return (
      <PremiumShell title="Mock Interview">
        <style>{`@keyframes mockPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }`}</style>
        <SetupScreen onStart={handleStart} savedRoleKeys={savedRoleKeys} />
      </PremiumShell>
    );
  }

  if (phase === "results" && scoreResult && config) {
    const addTargetOcc = addTargetRoleKey
      ? OCCUPATIONS.find((o: Occupation) => o.id === addTargetRoleKey) ?? null
      : null;

    async function addToTargets() {
      if (!addTargetRoleKey) return;
      const next = [...savedRoleKeys, addTargetRoleKey].slice(0, 8);
      await fetch("/api/cluster-readiness", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRoleKeys: next }),
      });
      setSavedRoleKeys(next);
      setAddTargetRoleKey(null);
    }

    return (
      <PremiumShell title="Mock Interview — Results">
        <style>{`@keyframes mockPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }`}</style>
        {/* Add-to-targets banner */}
        {addTargetOcc && (
          <div style={{ maxWidth: 860, margin: "0 auto 16px", padding: "12px 18px", borderRadius: "var(--radius-lg)", background: "var(--accent-soft)", border: "1px solid var(--accent-strong)", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
              <strong>Track your progress for {addTargetOcc.title}.</strong> Add it to your Role Prep targets so your readiness score updates after each session.
            </div>
            <button
              onClick={addToTargets}
              style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", background: "var(--accent)", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Add to targets →
            </button>
            <button
              onClick={() => setAddTargetRoleKey(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, display: "flex", alignItems: "center" }}
            >
              <X size={14} />
            </button>
          </div>
        )}
        <ResultsScreen
          config={config}
          score={scoreResult}
          history={history}
          saved={saved}
          onSave={saveToProfile}
          onRetry={() => setPhase("setup")}
          faceMetrics={sessionFaceMetrics}
          handMetrics={sessionHandMetrics}
        />
      </PremiumShell>
    );
  }

  // ── Countdown ───────────────────────────────────────────────────────────────

  if (phase === "countdown") {
    return (
      <PremiumShell title="Mock Interview">
        <div style={{ maxWidth: 580, margin: "0 auto", textAlign: "center", paddingTop: 80 }}>
          <div style={{ fontSize: 96, fontWeight: 700, color: "var(--accent)", lineHeight: 1, marginBottom: 16 }}>
            {countdown > 0 ? countdown : "Go"}
          </div>
          <div style={{ fontSize: 16, color: "var(--text-muted)" }}>Get ready — interview starting…</div>
        </div>
      </PremiumShell>
    );
  }

  // ── Interview UI ─────────────────────────────────────────────────────────────

  const progressPct = config ? Math.round((mainQuestionsAsked / config.numQuestions) * 100) : 0;

  return (
    <PremiumShell title="Mock Interview">
      <style>{`@keyframes mockPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }`}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>

        {/* ── Left: Interview area ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Progress bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, var(--accent), #0EA5E9)", borderRadius: 99, transition: "width 0.5s ease" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              {mainQuestionsAsked} / {config?.numQuestions ?? 5}
            </span>
          </div>

          {/* Question card */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-xl)", padding: 28, minHeight: 140 }}>
            {isFollowup && (
              <div style={{ marginBottom: 10, display: "inline-block", fontSize: 11, fontWeight: 700, color: "#F59E0B", background: "rgba(245,158,11,0.12)", padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(245,158,11,0.25)" }}>
                Follow-up
              </div>
            )}
            {currentCompetency && !isFollowup && (
              <div style={{ marginBottom: 10, display: "inline-block", fontSize: 11, fontWeight: 700, color: qColor, background: `${qColor}18`, padding: "3px 10px", borderRadius: 99, border: `1px solid ${qColor}33`, textTransform: "capitalize" }}>
                {currentCompetency.replace(/_/g, " ")} · {currentQuestionType}
              </div>
            )}
            <div style={{ fontSize: 19, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.55 }}>
              {currentQuestion || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Loading question…</span>}
            </div>
          </div>

          {/* Controls */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>

            {(phase === "processing" || phase === "finishing") && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>{statusMsg}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", opacity: 0.6 }}>This takes a few seconds…</div>
              </div>
            )}

            {phase === "question" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                  Take a moment to think, then press record when ready.
                </div>
                <button
                  onClick={startRecording}
                  style={{
                    width: 80, height: 80, borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--accent), #0EA5E9)",
                    border: "none", cursor: "pointer", fontSize: 30,
                    boxShadow: "0 6px 24px rgba(37,99,235,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  🎙️
                </button>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>Tap to start recording</div>
              </div>
            )}

            {phase === "recording" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PulsingDot />
                  Recording &nbsp;
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatTime(recordingSeconds)}</span>
                </div>
                <button
                  onClick={stopRecording}
                  style={{
                    width: 80, height: 80, borderRadius: "50%",
                    background: "#EF4444", border: "none", cursor: "pointer", fontSize: 22,
                    boxShadow: "0 6px 24px rgba(239,68,68,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700,
                  }}
                >
                  ■
                </button>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>Tap to stop</div>
              </div>
            )}

            {phase === "between" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
                  Next question is ready. Take a breath.
                </div>
                <button
                  onClick={() => setPhase("question")}
                  style={{
                    padding: "12px 32px", borderRadius: "var(--radius-lg)",
                    background: "linear-gradient(135deg, var(--accent), #0EA5E9)",
                    color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
                  }}
                >
                  I'm Ready →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Camera + conversation log ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 20 }}>

          {/* Webcam toggle + feed */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Camera</span>
              <button
                onClick={() => {
                  const next = !webcamEnabled;
                  setWebcamEnabled(next);
                  if (next) webcamRef.current?.start().catch(() => {});
                  else webcamRef.current?.stop();
                }}
                style={{
                  padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                  border: `1px solid ${webcamEnabled ? "var(--accent)" : "var(--card-border)"}`,
                  background: webcamEnabled ? "var(--accent-soft)" : "transparent",
                  color: webcamEnabled ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {webcamEnabled ? "On" : "Off"}
              </button>
            </div>
            <div style={{ position: "relative", height: webcamEnabled ? 180 : 80, background: "var(--card-bg-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {webcamEnabled
                ? <WebcamOverlay ref={webcamRef} isRecording={phase === "recording"} position="bottom-right" />
                : <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Camera off — enable for presence scoring</span>
              }
            </div>
          </div>

          {/* Conversation log */}
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 16, maxHeight: 420, overflowY: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 12 }}>
              Conversation
            </div>
            {conversationLog.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Interview starting…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {conversationLog.map((turn, i) => (
                  <div key={i} style={{
                    padding: "9px 11px", borderRadius: "var(--radius-sm)",
                    background: turn.speaker === "interviewer" ? "var(--card-bg-strong)" : "var(--accent-soft)",
                    borderLeft: `2px solid ${turn.speaker === "interviewer" ? "var(--card-border)" : "var(--accent)"}`,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: turn.speaker === "interviewer" ? "var(--text-muted)" : "var(--accent)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {turn.speaker === "interviewer" ? "Interviewer" : "You"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.5 }}>
                      {turn.content.length > 120 ? turn.content.slice(0, 120) + "…" : turn.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PremiumShell>
  );
}
