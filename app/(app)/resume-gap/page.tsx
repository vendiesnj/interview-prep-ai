"use client";

import { useRef, useState } from "react";
import PremiumShell from "@/app/components/PremiumShell";

type Gap = { category: string; issue: string; fix: string };
type Result = {
  overallScore: number;
  overallLabel: string;
  summary: string;
  strengths: string[];
  gaps: Gap[];
  keywordsMissing: string[];
  keywordsPresent: string[];
  atsScore: number;
  topAction: string;
};

const GAP_COLORS: Record<string, string> = {
  Experience: "#EF4444",
  Skills: "#F59E0B",
  Quantification: "#8B5CF6",
  Keywords: "#2563EB",
  Format: "#0EA5E9",
  Education: "#10B981",
  Relevance: "#EC4899",
};

function ScoreRing({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 75 ? "#10B981" : score >= 55 ? "#2563EB" : score >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--card-border-soft)" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - score / 100)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x={size / 2}
          y={size / 2}
          dy=".35em"
          textAnchor="middle"
          fontSize={size * 0.22}
          fontWeight={900}
          fill={color}
        >
          {score}
        </text>
      </svg>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textAlign: "center" }}>{label}</div>
    </div>
  );
}

export default function ResumeGapPage() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFileLoading(true);
    setFileError(null);
    setFileName(null);
    try {
      const formData = new FormData();
      formData.append("file", selected);
      const res = await fetch("/api/resume-parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse file.");
      setResume(data.text);
      setFileName(selected.name);
    } catch (err: any) {
      setFileError(err.message ?? "Failed to extract text from file.");
    } finally {
      setFileLoading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function analyze() {
    if (!resume.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/resume-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PremiumShell
      title="Resume Gap Analysis"
      subtitle="Paste your resume and optionally a job description. Get a targeted gap analysis in seconds."
    >
      <div style={{ maxWidth: 860, display: "grid", gap: 24 }}>

        {/* Input section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>
              Your Resume *
            </label>

            {/* File upload zone */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <div
              onClick={() => !fileLoading && fileInputRef.current?.click()}
              style={{
                border: "1.5px dashed var(--card-border)",
                borderRadius: 12,
                padding: "16px 20px",
                cursor: fileLoading ? "default" : "pointer",
                background: "var(--card-bg)",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 14,
                transition: "border-color 150ms",
              }}
            >
              {/* Icon area */}
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, fontSize: 17,
              }}>
                📄
              </div>

              {fileLoading ? (
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Extracting text…
                </div>
              ) : fileName ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#10B981" }}>
                    ✓ Extracted from {fileName}
                  </div>
                  <div
                    style={{ fontSize: 12, color: "var(--accent)", cursor: "pointer", textDecoration: "underline" }}
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  >
                    Change file
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                    Upload PDF, DOCX, or TXT
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    or paste text directly below
                  </div>
                </div>
              )}
            </div>

            {fileError && (
              <div style={{
                marginBottom: 8, padding: "8px 12px", borderRadius: 8,
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                color: "#EF4444", fontSize: 12,
              }}>
                {fileError}
              </div>
            )}

            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your full resume text here..."
              rows={10}
              style={{
                width: "100%", boxSizing: "border-box", padding: "12px 14px",
                borderRadius: 12, border: "1px solid var(--card-border)",
                background: "var(--card-bg)", color: "var(--text-primary)",
                fontSize: 13, lineHeight: 1.6, resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>
              Job Description <span style={{ fontWeight: 600, textTransform: "none", fontSize: 11 }}>(optional — improves accuracy)</span>
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description you're targeting..."
              rows={14}
              style={{
                width: "100%", boxSizing: "border-box", padding: "12px 14px",
                borderRadius: 12, border: "1px solid var(--card-border)",
                background: "var(--card-bg)", color: "var(--text-primary)",
                fontSize: 13, lineHeight: 1.6, resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        <button
          onClick={analyze}
          disabled={!resume.trim() || loading}
          style={{
            padding: "14px 28px", borderRadius: 12, border: "none",
            background: resume.trim() && !loading ? "var(--accent)" : "var(--card-border-soft)",
            color: resume.trim() && !loading ? "#fff" : "var(--text-muted)",
            fontWeight: 900, fontSize: 15, cursor: resume.trim() && !loading ? "pointer" : "not-allowed",
            alignSelf: "flex-start", transition: "all 150ms",
          }}
        >
          {loading ? "Analyzing…" : "Analyze Resume →"}
        </button>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ display: "grid", gap: 20 }}>

            {/* Score overview */}
            <div style={{
              padding: "24px 28px", borderRadius: 18,
              border: "1px solid var(--card-border-soft)", background: "var(--card-bg)",
              display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, alignItems: "center",
            }}>
              <div style={{ display: "flex", gap: 28 }}>
                <ScoreRing score={result.overallScore} label="Overall" size={88} />
                <ScoreRing score={result.atsScore} label="ATS Match" size={88} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>
                  {result.overallLabel}
                </div>
                <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.7 }}>
                  {result.summary}
                </p>
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)",
                  fontSize: 13, fontWeight: 700, color: "var(--accent)",
                }}>
                  Top action: {result.topAction}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Strengths */}
              <div style={{ padding: "20px 22px", borderRadius: 16, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#10B981", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 14 }}>
                  Strengths
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {result.strengths.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 18, height: 18, borderRadius: 99, background: "#10B98118", border: "1px solid #10B98140", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, color: "#10B981", fontWeight: 900, marginTop: 1 }}>✓</div>
                      <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.55 }}>{s}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keywords */}
              <div style={{ padding: "20px 22px", borderRadius: 16, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#2563EB", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 14 }}>
                  Keywords Present
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {result.keywordsPresent.map((kw) => (
                    <span key={kw} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" }}>{kw}</span>
                  ))}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#EF4444", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
                  Keywords Missing
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.keywordsMissing.map((kw) => (
                    <span key={kw} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>{kw}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Gaps */}
            <div style={{ padding: "20px 22px", borderRadius: 16, border: "1px solid var(--card-border-soft)", background: "var(--card-bg)" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#EF4444", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 16 }}>
                Gaps to Address ({result.gaps.length})
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {result.gaps.map((g, i) => {
                  const color = GAP_COLORS[g.category] ?? "#6B7280";
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: color + "18", color, border: `1px solid ${color}30`, whiteSpace: "nowrap" }}>
                        {g.category}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{g.issue}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>Fix: {g.fix}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </PremiumShell>
  );
}
