"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Search, Plus, X, ChevronRight, Zap, TrendingUp, Target, DollarSign } from "lucide-react";
import OCCUPATIONS from "@/app/lib/onet-occupations";
import { ROLE_CLUSTERS } from "@/app/lib/roleClusters";

interface OnetResult {
  code: string;
  title: string;
  slug: string;
  brightOutlook: boolean;
}

const LABELS_KEY = "onet_role_labels";

function getRoleLabels(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(LABELS_KEY) ?? "{}"); } catch { return {}; }
}

function saveRoleLabel(slug: string, title: string) {
  if (typeof window === "undefined") return;
  const labels = getRoleLabels();
  labels[slug] = title;
  localStorage.setItem(LABELS_KEY, JSON.stringify(labels));
}

function getRoleDisplayTitle(key: string): string {
  const staticOcc = OCCUPATIONS.find((o) => o.id === key);
  if (staticOcc) return staticOcc.title;
  const labels = getRoleLabels();
  if (labels[key]) return labels[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface CompetencyScore {
  key: string;
  label: string;
  score: number;
  weight: number;
  meetsThreshold: boolean;
}

interface ClusterResult {
  clusterKey: string;
  clusterLabel: string;
  clusterDescription: string;
  targetRoles: string[];
  readiness: {
    overall: number;
    label: "not_ready" | "developing" | "ready" | "strong";
    competencyScores: CompetencyScore[];
    topStrength: CompetencyScore | null;
    topGap: CompetencyScore | null;
    sessionCount: number;
    hasEnoughData: boolean;
    narrative: string;
  };
  nextQuestions: Array<{ question: string; competency: string; type: string }>;
  salary: { min: number; max: number } | null;
}

interface ClusterReadinessData {
  targetRoleKeys: string[];
  clusters: ClusterResult[];
  totalAttempts: number;
}

const READINESS_COLOR = {
  not_ready:  "#EF4444",
  developing: "#F59E0B",
  ready:      "#22C55E",
  strong:     "#10B981",
};

const READINESS_LABEL = {
  not_ready:  "Not Ready",
  developing: "Developing",
  ready:      "Ready",
  strong:     "Strong",
};

export default function RoleClusterSection({ accentColor = "var(--accent)" }: { accentColor?: string }) {
  const [data, setData] = useState<ClusterReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [onetResults, setOnetResults] = useState<OnetResult[]>([]);
  const [onetTotal, setOnetTotal] = useState<number>(0);
  const [onetSearching, setOnetSearching] = useState(false);
  const [onetError, setOnetError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cluster-readiness");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Debounced O*NET search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (search.length < 2) {
      setOnetResults([]);
      setOnetTotal(0);
      setOnetError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setOnetSearching(true);
      setOnetError(null);
      try {
        const res = await fetch(`/api/onet/search?q=${encodeURIComponent(search)}&end=20`);
        const json = await res.json();
        if (!res.ok) {
          setOnetError(json.error ?? "Search failed");
          setOnetResults([]);
        } else {
          setOnetResults(json.occupations ?? []);
          setOnetTotal(json.total ?? 0);
        }
      } catch {
        setOnetError("Could not reach search service");
        setOnetResults([]);
      } finally {
        setOnetSearching(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const targetRoleKeys = data?.targetRoleKeys ?? [];

  async function toggleRole(roleKey: string, displayTitle?: string) {
    const current = targetRoleKeys;
    const next = current.includes(roleKey)
      ? current.filter((k) => k !== roleKey)
      : [...current, roleKey].slice(0, 8);
    if (displayTitle) saveRoleLabel(roleKey, displayTitle);
    setSaving(true);
    await fetch("/api/cluster-readiness", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetRoleKeys: next }),
    });
    // Trigger competency map generation for new role
    if (!current.includes(roleKey)) {
      fetch(`/api/role-competency?roleKey=${encodeURIComponent(roleKey)}`).catch(() => {});
    }
    await fetchData();
    setSaving(false);
  }

  if (loading) {
    return (
      <div style={{ padding: "24px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: accentColor, textTransform: "uppercase", marginBottom: 16 }}>
          Role Readiness
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {[1, 2].map((i) => (
            <div key={i} style={{ flex: 1, height: 140, borderRadius: "var(--radius-xl)", background: "var(--card-bg)", border: "1px solid var(--card-border)", opacity: 0.5 }} />
          ))}
        </div>
      </div>
    );
  }

  const hasRoles = targetRoleKeys.length > 0;
  const clusters = data?.clusters ?? [];

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: accentColor, textTransform: "uppercase", marginBottom: 4 }}>
            Role Readiness
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {hasRoles
              ? `Tracking ${targetRoleKeys.length} target role${targetRoleKeys.length > 1 ? "s" : ""} · ${data?.totalAttempts ?? 0} total sessions`
              : "Add target roles to see your readiness scores"}
          </div>
        </div>
        <button
          onClick={() => setShowRolePicker(!showRolePicker)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: "var(--radius-md)", border: `1px solid ${accentColor}40`, background: `${accentColor}12`, color: accentColor, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
        >
          <Plus size={14} />
          {showRolePicker ? "Done" : "Add Role"}
        </button>
      </div>

      {/* Role Picker */}
      {showRolePicker && (
        <div style={{ marginBottom: 20, padding: 18, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
            Search 900+ careers from the O*NET database
            {onetTotal > 0 && search.length >= 2 && (
              <span style={{ fontWeight: 500, color: "var(--text-muted)", marginLeft: 8 }}>
                — {onetTotal.toLocaleString()} matches
              </span>
            )}
          </div>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or industry (e.g. 'financial analyst', 'tech')"
              style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          {/* Current target roles */}
          {targetRoleKeys.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {targetRoleKeys.map((key) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: "var(--radius-sm)", background: `${accentColor}15`, border: `1px solid ${accentColor}35`, fontSize: 12, fontWeight: 600, color: accentColor }}>
                  {getRoleDisplayTitle(key)}
                  <button onClick={() => toggleRole(key)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: accentColor, display: "flex", alignItems: "center" }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search results */}
          {onetSearching && search.length >= 2 && (
            <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "10px 0" }}>Searching…</div>
          )}

          {!onetSearching && onetError && (
            <div style={{ fontSize: 13, color: "#EF4444", padding: "10px 0" }}>{onetError}</div>
          )}

          {!onetSearching && !onetError && onetResults.length > 0 && (
            <div style={{ display: "grid", gap: 6 }}>
              {onetResults.map((occ) => {
                const isAdded = targetRoleKeys.includes(occ.slug);
                return (
                  <button
                    key={occ.code}
                    onClick={() => toggleRole(occ.slug, occ.title)}
                    disabled={saving}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "var(--radius-md)", border: `1px solid ${isAdded ? accentColor + "40" : "var(--card-border)"}`, background: isAdded ? `${accentColor}10` : "transparent", cursor: "pointer", textAlign: "left" }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        {occ.title}
                        {occ.brightOutlook && (
                          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#22C55E", background: "rgba(34,197,94,0.1)", padding: "1px 5px", borderRadius: "var(--radius-xs)" }}>
                            ★ Bright Outlook
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>O*NET {occ.code}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isAdded ? accentColor : "var(--text-muted)" }}>
                      {isAdded ? "Added ✓" : "+ Add"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!onetSearching && !onetError && search.length >= 2 && onetResults.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "10px 0" }}>No matches. Try a different title or industry.</div>
          )}

          {search.length < 2 && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Type at least 2 characters to search. Up to 8 target roles supported.
            </div>
          )}
        </div>
      )}

      {/* No roles yet */}
      {!hasRoles && !showRolePicker && (
        <div style={{ padding: "28px 24px", borderRadius: "var(--radius-xl)", border: "1px dashed var(--card-border)", textAlign: "center" }}>
          <Target size={28} color="var(--text-muted)" style={{ marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>No target roles set</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, maxWidth: 360, margin: "0 auto 16px" }}>
            Add your target roles to see readiness scores, skill gaps, and the specific questions you need to practice.
          </div>
          <button
            onClick={() => setShowRolePicker(true)}
            style={{ padding: "10px 20px", borderRadius: "var(--radius-md)", background: accentColor, color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}
          >
            Add your first role
          </button>
        </div>
      )}

      {/* Cluster Cards */}
      {clusters.length > 0 && (
        <div style={{ display: "grid", gap: 14 }}>
          {clusters.map((cluster) => {
            const isExpanded = expandedCluster === cluster.clusterKey;
            const r = cluster.readiness;
            const color = READINESS_COLOR[r.label];
            const clusterDef = ROLE_CLUSTERS.find((c) => c.key === cluster.clusterKey);

            return (
              <div
                key={cluster.clusterKey}
                style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", overflow: "hidden" }}
              >
                {/* Card Header */}
                <div
                  style={{ padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}
                  onClick={() => setExpandedCluster(isExpanded ? null : cluster.clusterKey)}
                >
                  {/* Readiness Ring */}
                  <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
                    <svg width="56" height="56" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="var(--card-border)" strokeWidth="4" />
                      <circle
                        cx="28" cy="28" r="24"
                        fill="none"
                        stroke={color}
                        strokeWidth="4"
                        strokeDasharray={`${(r.overall / 100) * 150.8} 150.8`}
                        strokeLinecap="round"
                        transform="rotate(-90 28 28)"
                        opacity={r.hasEnoughData ? 1 : 0.5}
                      />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: r.hasEnoughData ? color : "var(--text-muted)" }}>
                        {r.hasEnoughData ? `${r.overall}%` : "--"}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{cluster.clusterLabel}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-sm)", background: color + "18", color }}>{READINESS_LABEL[r.label]}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 4 }}>{r.narrative}</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {r.topStrength && (
                        <span style={{ fontSize: 11, color: "#22C55E" }}>↑ {r.topStrength.label}</span>
                      )}
                      {r.topGap && (
                        <span style={{ fontSize: 11, color: "#EF4444" }}>↓ {r.topGap.label}</span>
                      )}
                      {cluster.salary && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          <DollarSign size={10} style={{ display: "inline" }} />{cluster.salary.min}k–{cluster.salary.max}k avg
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Practice CTA */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                    <Link
                      href="/practice"
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: "var(--radius-md)", background: accentColor, color: "#fff", fontWeight: 700, fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}
                    >
                      <Zap size={12} /> Practice
                    </Link>
                    <Link
                      href="/mock-interview"
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", color: "var(--text-muted)", fontWeight: 700, fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}
                    >
                      Mock Interview
                    </Link>
                  </div>

                  <ChevronRight size={16} color="var(--text-muted)" style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--card-border)", padding: "18px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    {/* Competency breakdown */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>
                        Competency Breakdown
                      </div>
                      <div style={{ display: "grid", gap: 8 }}>
                        {r.competencyScores.map((comp) => {
                          const clusterComp = clusterDef?.competencies.find((c) => c.key === comp.key);
                          const threshold = clusterComp?.threshold ?? 7;
                          const pct = Math.round((comp.score / 10) * 100);
                          const c = comp.score >= threshold ? "#22C55E" : comp.score >= threshold - 1.5 ? "#F59E0B" : "#EF4444";
                          return (
                            <div key={comp.key}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 600 }}>{comp.label}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: c }}>{comp.score.toFixed(1)}/10</span>
                              </div>
                              <div style={{ height: 5, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 99 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Next questions to practice */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>
                        Questions to Practice Next
                      </div>
                      {cluster.nextQuestions.length > 0 ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          {cluster.nextQuestions.map((q, i) => (
                            <div key={i} style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--card-bg)", fontSize: 12, color: "var(--text-primary)", lineHeight: 1.5 }}>
                              {q.question}
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{q.type}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                          Add a specific role within this cluster to see targeted questions. Signal will generate a custom question set for any role.
                        </div>
                      )}

                      {/* Target roles in this cluster */}
                      {cluster.targetRoles.length > 0 && (
                        <div style={{ marginTop: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                            Your Target Roles
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {cluster.targetRoles.map((key) => (
                              <span key={key} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: "var(--radius-sm)", background: `${accentColor}12`, border: `1px solid ${accentColor}30`, color: accentColor }}>
                                {getRoleDisplayTitle(key)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
