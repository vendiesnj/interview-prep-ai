"use client";

import React, { useState } from "react";
import type { NaceScore } from "@/app/lib/nace";
import { naceScoreColor, naceScoreLabel } from "@/app/lib/nace";

export default function NaceScoreCard({ scores }: { scores: NaceScore[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {scores.map((s) => {
        const color = naceScoreColor(s.score);
        const pct = s.score ?? 0;
        const isOpen = expanded === s.key;

        return (
          <div
            key={s.key}
            style={{
              borderRadius: 12,
              border: "1px solid var(--card-border-soft)",
              background: "var(--card-bg)",
              overflow: "hidden",
            }}
          >
            {/* Row */}
            <div
              onClick={() => setExpanded(isOpen ? null : s.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              {/* Score circle */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: s.score !== null ? color + "18" : "var(--card-bg-strong)",
                  border: `1px solid ${s.score !== null ? color + "40" : "var(--card-border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 13,
                  fontWeight: 900,
                  color: s.score !== null ? color : "var(--text-muted)",
                }}
              >
                {s.score !== null ? s.score : "—"}
              </div>

              {/* Label + bar */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 5,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "var(--text-primary)",
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color,
                      marginLeft: 8,
                    }}
                  >
                    {naceScoreLabel(s.score)}
                  </span>
                </div>
                <div
                  style={{
                    height: 5,
                    borderRadius: 99,
                    background: "var(--card-border-soft)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: s.score !== null ? color : "transparent",
                      borderRadius: 99,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
              </div>

              {/* Chevron */}
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  transform: isOpen ? "rotate(180deg)" : "none",
                  transition: "transform 200ms",
                  flexShrink: 0,
                }}
              >
                ▾
              </div>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div
                style={{
                  borderTop: "1px solid var(--card-border-soft)",
                  padding: "12px 14px 14px",
                  background: "var(--card-bg-strong)",
                }}
              >
                {/* Official NACE definition */}
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--text-muted)", marginBottom: 4 }}>
                  NACE Definition
                </div>
                <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-soft)", lineHeight: 1.6, fontStyle: "italic" }}>
                  "{s.definition}"
                </p>

                {/* What we measure */}
                {s.observableIndicators.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--text-muted)", marginBottom: 6 }}>
                      Behavioral Indicators We Measure
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {s.observableIndicators.map((ind) => (
                        <div key={ind} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5 }}>
                          <span style={{ color: "#10B981", fontWeight: 800, flexShrink: 0, marginTop: 1 }}>✓</span>
                          {ind}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data sources */}
                {s.evidenceSources.length > 0 && s.evidenceSources[0] !== "Not assessable from interview practice data" && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--text-muted)", marginBottom: 6 }}>
                      Data Sources
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {s.evidenceSources.map((src) => (
                        <span key={src} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "var(--card-border-soft)", color: "var(--text-muted)" }}>
                          {src}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Signal quality note */}
                <div style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 3, color: s.assessability === "not_assessable" ? "#EF4444" : s.assessability === "high" ? "#10B981" : s.assessability === "moderate" ? "#F59E0B" : "var(--text-muted)" }}>
                    {s.assessability === "not_assessable" ? "Not Assessable" : s.assessability === "high" ? "High Confidence" : s.assessability === "moderate" ? "Moderate Confidence" : "Low Confidence"} · Signal Quality
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.55 }}>
                    {s.assessabilityNote}
                  </p>
                </div>

                {s.score === null && s.assessability !== "not_assessable" && (
                  <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                    {s.key === "teamwork" ? "Answer teamwork/collaboration questions" : s.key === "technology" ? "Answer technical questions or extract resume skills" : s.key === "leadership" ? "Answer leadership questions or complete Career Instincts sessions" : "Complete more practice sessions"} to generate a score.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
