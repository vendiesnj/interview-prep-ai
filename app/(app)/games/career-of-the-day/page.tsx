"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Heart, ChevronLeft, ChevronRight, DollarSign, GraduationCap,
  Bot, Rocket, Briefcase, TrendingUp,
} from "lucide-react";
import PremiumShell from "@/app/components/PremiumShell";
import OCCUPATIONS, { type Occupation, type Education, educationLabel } from "@/app/lib/onet-occupations";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CotdStorage {
  savedCareers: string[];
  viewedDates: string[];
}

// ── RIASEC descriptions ───────────────────────────────────────────────────────

const RIASEC_DESCRIPTIONS: Record<string, { label: string; desc: string; color: string }> = {
  R: { label: "Realistic", desc: "Hands-on, physical, mechanical — loves building and fixing things", color: "#10B981" },
  I: { label: "Investigative", desc: "Analytical, research-oriented — loves solving complex problems", color: "#2563EB" },
  A: { label: "Artistic", desc: "Creative, expressive, original — thrives with imagination and design", color: "#8B5CF6" },
  S: { label: "Social", desc: "Helping, teaching, healing — driven by working with and for people", color: "#EC4899" },
  E: { label: "Enterprising", desc: "Leading, persuading, selling — energized by goals and influence", color: "#F59E0B" },
  C: { label: "Conventional", desc: "Organized, detail-oriented, systematic — loves structure and accuracy", color: "#6366F1" },
};

const CATEGORY_COLORS: Record<string, string> = {
  "Skilled Trades": "#10B981",
  "Technology": "#2563EB",
  "Healthcare": "#EC4899",
  "Finance": "#F59E0B",
  "Engineering": "#6366F1",
  "Creative & Design": "#8B5CF6",
  "Education": "#F97316",
  "Business": "#14B8A6",
  "Research & Academia": "#3B82F6",
  "Marketing & Media": "#EF4444",
  "Government / Planning": "#84CC16",
  "Environmental": "#22C55E",
};

function getCategoryColor(category: string): string {
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "#6B7280";
}

// ── Seeded hash ───────────────────────────────────────────────────────────────

function simpleHash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function getOccupationForDate(dateKey: string): Occupation {
  const idx = simpleHash(dateKey) % OCCUPATIONS.length;
  return OCCUPATIONS[idx];
}

function dateKeyFromOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function loadStorage(): CotdStorage {
  try {
    const raw = localStorage.getItem("ipc_games_cotd_v1");
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return { savedCareers: [], viewedDates: [] };
}

function saveStorage(data: CotdStorage) {
  try {
    localStorage.setItem("ipc_games_cotd_v1", JSON.stringify(data));
  } catch { /* empty */ }
}

// ── Salary formatter ──────────────────────────────────────────────────────────

function formatSalary(salary: [number, number]): string {
  return `$${salary[0]}K – $${salary[1]}K /yr`;
}

// ── AI risk bar ───────────────────────────────────────────────────────────────

function AIRiskBar({ risk }: { risk: number }) {
  const color = risk < 25 ? "#10B981" : risk < 50 ? "#F59E0B" : "#EF4444";
  const label = risk < 25 ? "Low Risk" : risk < 50 ? "Moderate Risk" : "High Risk";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Automation Risk</span>
        <span style={{ fontSize: 11, fontWeight: 900, color }}>{label} ({risk}%)</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "var(--card-border)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${risk}%`,
          background: color,
          borderRadius: 4,
          transition: "width 600ms ease",
        }} />
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CareerOfTheDayPage() {
  const todayKey = new Date().toISOString().split("T")[0];
  const [dateOffset, setDateOffset] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const [viewed, setViewed] = useState<string[]>([]);

  const dateKey = dateKeyFromOffset(dateOffset);
  const occupation = getOccupationForDate(dateKey);
  const isFuture = dateOffset > 0;
  const isToday = dateOffset === 0;

  // Similar careers from same category
  const similarCareers = OCCUPATIONS
    .filter(o => o.category === occupation.category && o.id !== occupation.id)
    .slice(0, 3);

  useEffect(() => {
    const s = loadStorage();
    setSaved(s.savedCareers);
    setViewed(s.viewedDates);

    // Mark today as viewed
    if (isToday && !s.viewedDates.includes(todayKey)) {
      const updated: CotdStorage = {
        ...s,
        viewedDates: [...s.viewedDates, todayKey],
      };
      saveStorage(updated);
      setViewed(updated.viewedDates);
    }
  }, [todayKey, isToday]);

  function toggleSave() {
    const s = loadStorage();
    let next: string[];
    if (s.savedCareers.includes(occupation.id)) {
      next = s.savedCareers.filter(id => id !== occupation.id);
    } else {
      next = [...s.savedCareers, occupation.id];
    }
    const updated: CotdStorage = { ...s, savedCareers: next };
    saveStorage(updated);
    setSaved(next);
  }

  const isSaved = saved.includes(occupation.id);
  const categoryColor = getCategoryColor(occupation.category);

  return (
    <PremiumShell hideHeader>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Navigation bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <button
            onClick={() => setDateOffset(o => o - 1)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "7px 14px", borderRadius: 10,
              background: "var(--card-bg)", border: "1px solid var(--card-border)",
              color: "var(--text-primary)", fontWeight: 800, fontSize: 13, cursor: "pointer",
            }}
          >
            <ChevronLeft size={15} />
            Yesterday
          </button>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.8, textTransform: "uppercase" }}>
              {isToday ? "Today" : new Date(dateKey + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          </div>

          <button
            onClick={() => setDateOffset(o => o + 1)}
            disabled={isFuture}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "7px 14px", borderRadius: 10,
              background: isFuture ? "var(--card-bg)" : "var(--card-bg)",
              border: "1px solid var(--card-border)",
              color: isFuture ? "var(--text-muted)" : "var(--text-primary)",
              fontWeight: 800, fontSize: 13,
              cursor: isFuture ? "default" : "pointer",
              opacity: isFuture ? 0.4 : 1,
            }}
          >
            Tomorrow
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Hero section */}
        <div style={{
          background: "var(--card-bg)", border: "1px solid var(--card-border)",
          borderRadius: 16, padding: "24px", marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 6 }}>
                Career of the Day
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 950, color: "var(--text-primary)", margin: "0 0 10px", letterSpacing: -0.5, lineHeight: 1.2 }}>
                {occupation.title}
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                <span style={{
                  padding: "4px 10px", borderRadius: 20,
                  background: categoryColor + "15", border: `1px solid ${categoryColor}30`,
                  fontSize: 12, fontWeight: 800, color: categoryColor,
                }}>
                  {occupation.category}
                </span>
                <span style={{
                  padding: "4px 10px", borderRadius: 20,
                  background: "var(--card-bg-strong, rgba(255,255,255,0.05))",
                  border: "1px solid var(--card-border)",
                  fontSize: 12, fontWeight: 800, color: "var(--text-muted)",
                }}>
                  {occupation.riasec} Type
                </span>
                {occupation.trades && (
                  <span style={{
                    padding: "4px 10px", borderRadius: 20,
                    background: "#10B98110", border: "1px solid #10B98130",
                    fontSize: 12, fontWeight: 800, color: "#10B981",
                  }}>
                    Trade Career
                  </span>
                )}
              </div>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
                {occupation.description}
              </p>
            </div>
            <button
              onClick={toggleSave}
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: isSaved ? "#EF444415" : "var(--card-bg)",
                border: isSaved ? "1px solid #EF444430" : "1px solid var(--card-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              <Heart size={18} color={isSaved ? "#EF4444" : "var(--text-muted)"} fill={isSaved ? "#EF4444" : "none"} />
            </button>
          </div>
        </div>

        {/* At a Glance */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16,
        }}>
          {/* Salary */}
          <div style={{
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            borderRadius: 14, padding: "16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <DollarSign size={14} color="#10B981" />
              <span style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Salary</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.3 }}>
              {formatSalary(occupation.salary)}
            </div>
          </div>

          {/* Education */}
          <div style={{
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            borderRadius: 14, padding: "16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <GraduationCap size={14} color="#2563EB" />
              <span style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Education</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1.3 }}>
              {educationLabel(occupation.education as Education)}
            </div>
          </div>

          {/* AI Risk */}
          <div style={{
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            borderRadius: 14, padding: "16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Bot size={14} color="#8B5CF6" />
              <span style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>AI Risk</span>
            </div>
            <AIRiskBar risk={occupation.aiRisk} />
          </div>
        </div>

        {/* Is this for me? */}
        <div style={{
          background: "var(--card-bg)", border: "1px solid var(--card-border)",
          borderRadius: 16, padding: "20px 22px", marginBottom: 16,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, color: "var(--text-primary)", margin: "0 0 14px" }}>
            Is this for me?
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {occupation.riasec.split("").map(code => {
              const info = RIASEC_DESCRIPTIONS[code];
              if (!info) return null;
              return (
                <div key={code} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: info.color + "15", border: `1px solid ${info.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 900, color: info.color,
                  }}>
                    {code}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{info.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{info.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side hustles */}
        {occupation.sideHustles.length > 0 && (
          <div style={{
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            borderRadius: 16, padding: "20px 22px", marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <TrendingUp size={16} color="#F59E0B" />
              <h2 style={{ fontSize: 15, fontWeight: 900, color: "var(--text-primary)", margin: 0 }}>
                Side Income Ideas
              </h2>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {occupation.sideHustles.map(hustle => (
                <div key={hustle} style={{
                  padding: "6px 12px", borderRadius: 20,
                  background: "#F59E0B10", border: "1px solid #F59E0B25",
                  fontSize: 12, fontWeight: 700, color: "var(--text-primary)",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <DollarSign size={10} color="#F59E0B" />
                  {hustle}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entrepreneur path */}
        {occupation.entrepreneurPath && (
          <div style={{
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            borderRadius: 16, padding: "20px 22px", marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Rocket size={16} color="#8B5CF6" />
              <h2 style={{ fontSize: 15, fontWeight: 900, color: "var(--text-primary)", margin: 0 }}>
                Entrepreneur Angle
              </h2>
            </div>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
              {occupation.entrepreneurPath}
            </p>
          </div>
        )}

        {/* Similar careers */}
        {similarCareers.length > 0 && (
          <div style={{
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            borderRadius: 16, padding: "20px 22px", marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Briefcase size={16} color="#2563EB" />
              <h2 style={{ fontSize: 15, fontWeight: 900, color: "var(--text-primary)", margin: 0 }}>
                Explore Similar Careers
              </h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {similarCareers.map(occ => (
                <div key={occ.id} style={{
                  padding: "12px 14px", borderRadius: 10,
                  background: "var(--card-bg-strong, rgba(255,255,255,0.03))",
                  border: "1px solid var(--card-border)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>{occ.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatSalary(occ.salary)} · {occ.riasec}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
                    {occ.aiRisk}% AI risk
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved careers note */}
        {isSaved && (
          <div style={{
            padding: "10px 14px", borderRadius: 10,
            background: "#EF444410", border: "1px solid #EF444430",
            fontSize: 12, fontWeight: 700, color: "#EF4444",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Heart size={12} fill="#EF4444" />
            Saved to your career list
          </div>
        )}

        {/* Back to games */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link href="/games" style={{
            fontSize: 13, fontWeight: 700, color: "var(--text-muted)",
            textDecoration: "none",
          }}>
            ← Back to Daily Games
          </Link>
        </div>
      </div>
    </PremiumShell>
  );
}
