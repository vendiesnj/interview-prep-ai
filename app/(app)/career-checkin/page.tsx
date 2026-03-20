"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PremiumShell from "@/app/components/PremiumShell";
import Link from "next/link";

const INDUSTRIES = [
  "Technology", "Finance & Banking", "Consulting", "Healthcare & Life Sciences",
  "Marketing & Advertising", "Education", "Government & Nonprofit", "Retail & Consumer",
  "Manufacturing & Engineering", "Media & Entertainment", "Real Estate", "Legal", "Other",
];

const SALARY_RANGES = [
  { value: "under_40k", label: "Under $40k" },
  { value: "40_50k", label: "$40k – $50k" },
  { value: "50_60k", label: "$50k – $60k" },
  { value: "60_75k", label: "$60k – $75k" },
  { value: "75_90k", label: "$75k – $90k" },
  { value: "90_110k", label: "$90k – $110k" },
  { value: "110_130k", label: "$110k – $130k" },
  { value: "130_160k", label: "$130k – $160k" },
  { value: "over_160k", label: "Over $160k" },
  { value: "prefer_not", label: "Prefer not to say" },
];

const CHALLENGES = [
  { value: "salary", label: "Compensation / salary" },
  { value: "growth", label: "Career growth opportunities" },
  { value: "work_life", label: "Work-life balance" },
  { value: "culture", label: "Company culture / fit" },
  { value: "skills_gap", label: "Skills gap / keeping up" },
  { value: "management", label: "Management / leadership quality" },
  { value: "none", label: "No major challenges right now" },
  { value: "other", label: "Something else" },
];

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - i);

type Step = "status" | "details" | "salary" | "satisfaction" | "done";

export default function CareerCheckInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("status");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    employmentStatus: "",
    jobTitle: "",
    company: "",
    industry: "",
    city: "",
    state: "",
    salaryRange: "",
    graduationYear: "",
    major: "",
    satisfactionScore: "",
    topChallenge: "",
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/career-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS: Step[] = ["status", "details", "salary", "satisfaction"];
  const stepIndex = STEPS.indexOf(step);
  const progress = step === "done" ? 100 : Math.round(((stepIndex + 1) / STEPS.length) * 100);

  return (
    <PremiumShell title="Career Check-In" subtitle="2 minutes · Helps benchmark your progress">
      <div style={{ maxWidth: 640, margin: "0 auto", paddingBottom: 48 }}>

        <div style={{ marginBottom: 20 }}>
          <Link href="/career-guide" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontWeight: 700 }}>← Career Guide</Link>
        </div>

        {step !== "done" && (
          <>
            {/* Progress */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>
                <span>Step {stepIndex + 1} of {STEPS.length}</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "var(--accent)", borderRadius: 99, transition: "width 400ms" }} />
              </div>
            </div>

            <div style={{ padding: 28, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))" }}>

              {/* Step 1: Status */}
              {step === "status" && (
                <div>
                  <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 950, color: "var(--text-primary)" }}>Where are you right now?</h2>
                  <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-muted)" }}>Select the option that best describes your current situation.</p>
                  <div style={{ display: "grid", gap: 10 }}>
                    {[
                      { value: "employed", label: "Employed full-time", icon: "💼" },
                      { value: "employed_part", label: "Employed part-time or contract", icon: "📋" },
                      { value: "job_searching", label: "Actively job searching", icon: "🔍" },
                      { value: "graduate_school", label: "In graduate school", icon: "🎓" },
                      { value: "freelance", label: "Freelance / self-employed", icon: "🚀" },
                      { value: "other", label: "Other", icon: "•" },
                    ].map(({ value, label, icon }) => (
                      <div
                        key={value}
                        onClick={() => set("employmentStatus", value)}
                        style={{
                          padding: "14px 16px",
                          borderRadius: "var(--radius-lg)",
                          border: `2px solid ${form.employmentStatus === value ? "var(--accent)" : "var(--card-border)"}`,
                          background: form.employmentStatus === value ? "var(--accent-soft)" : "var(--card-bg)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          transition: "all 150ms",
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{icon}</span>
                        <span style={{ fontSize: 14, fontWeight: form.employmentStatus === value ? 900 : 700, color: form.employmentStatus === value ? "var(--accent)" : "var(--text-primary)" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    disabled={!form.employmentStatus}
                    onClick={() => setStep("details")}
                    style={{ marginTop: 24, width: "100%", padding: "13px", borderRadius: "var(--radius-md)", border: "none", background: form.employmentStatus ? "var(--accent)" : "var(--card-border)", color: form.employmentStatus ? "#fff" : "var(--text-muted)", fontWeight: 950, fontSize: 14, cursor: form.employmentStatus ? "pointer" : "not-allowed" }}
                  >
                    Continue →
                  </button>
                </div>
              )}

              {/* Step 2: Role details */}
              {step === "details" && (
                <div>
                  <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 950, color: "var(--text-primary)" }}>Tell us about your role</h2>
                  <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-muted)" }}>All fields optional — share what you're comfortable with.</p>
                  <div style={{ display: "grid", gap: 16 }}>
                    <Field label="Job title" placeholder="e.g. Software Engineer" value={form.jobTitle} onChange={(v) => set("jobTitle", v)} />
                    <Field label="Company" placeholder="e.g. Accenture" value={form.company} onChange={(v) => set("company", v)} />
                    <div>
                      <label style={labelStyle}>Industry</label>
                      <select value={form.industry} onChange={(e) => set("industry", e.target.value)} style={selectStyle}>
                        <option value="">Select industry</option>
                        {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="City" placeholder="e.g. Chicago" value={form.city} onChange={(v) => set("city", v)} />
                      <Field label="State" placeholder="e.g. IL" value={form.state} onChange={(v) => set("state", v)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={labelStyle}>Graduation year</label>
                        <select value={form.graduationYear} onChange={(e) => set("graduationYear", e.target.value)} style={selectStyle}>
                          <option value="">Select year</option>
                          {GRAD_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <Field label="Major / field of study" placeholder="e.g. Business" value={form.major} onChange={(v) => set("major", v)} />
                    </div>
                  </div>
                  <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
                    <button onClick={() => setStep("status")} style={backBtnStyle}>← Back</button>
                    <button onClick={() => setStep("salary")} style={nextBtnStyle}>Continue →</button>
                  </div>
                </div>
              )}

              {/* Step 3: Salary */}
              {step === "salary" && (
                <div>
                  <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 950, color: "var(--text-primary)" }}>Compensation range</h2>
                  <p style={{ margin: "0 0 8px", fontSize: 14, color: "var(--text-muted)" }}>This is used anonymously to build salary benchmarks for your grad year and field. We never share individual data.</p>
                  <p style={{ margin: "0 0 20px", fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>All compensation including base salary. Skip if you prefer not to share.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {SALARY_RANGES.map(({ value, label }) => (
                      <div
                        key={value}
                        onClick={() => set("salaryRange", value)}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "var(--radius-lg)",
                          border: `2px solid ${form.salaryRange === value ? "var(--accent)" : "var(--card-border)"}`,
                          background: form.salaryRange === value ? "var(--accent-soft)" : "var(--card-bg)",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: form.salaryRange === value ? 900 : 700,
                          color: form.salaryRange === value ? "var(--accent)" : "var(--text-primary)",
                          textAlign: "center" as const,
                          transition: "all 150ms",
                        }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
                    <button onClick={() => setStep("details")} style={backBtnStyle}>← Back</button>
                    <button onClick={() => setStep("satisfaction")} style={nextBtnStyle}>Continue →</button>
                  </div>
                </div>
              )}

              {/* Step 4: Satisfaction */}
              {step === "satisfaction" && (
                <div>
                  <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 950, color: "var(--text-primary)" }}>How are you doing?</h2>
                  <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-muted)" }}>Quick satisfaction check — helps us understand how grads are actually feeling in their careers.</p>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{ ...labelStyle, marginBottom: 12, display: "block" }}>Overall career satisfaction</label>
                    <div style={{ display: "flex", gap: 10 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          onClick={() => set("satisfactionScore", String(n))}
                          style={{
                            flex: 1,
                            padding: "14px 0",
                            borderRadius: "var(--radius-lg)",
                            border: `2px solid ${form.satisfactionScore === String(n) ? "var(--accent)" : "var(--card-border)"}`,
                            background: form.satisfactionScore === String(n) ? "var(--accent-soft)" : "var(--card-bg)",
                            cursor: "pointer",
                            textAlign: "center" as const,
                            fontSize: 20,
                            transition: "all 150ms",
                          }}
                        >
                          {["😔", "😐", "🙂", "😊", "🤩"][n - 1]}
                          <div style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)", fontWeight: 700 }}>{["Low", "Okay", "Good", "Great", "Love it"][n - 1]}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Biggest challenge right now</label>
                    <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                      {CHALLENGES.map(({ value, label }) => (
                        <div
                          key={value}
                          onClick={() => set("topChallenge", value)}
                          style={{
                            padding: "11px 14px",
                            borderRadius: "var(--radius-lg)",
                            border: `2px solid ${form.topChallenge === value ? "var(--accent)" : "var(--card-border)"}`,
                            background: form.topChallenge === value ? "var(--accent-soft)" : "var(--card-bg)",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: form.topChallenge === value ? 900 : 700,
                            color: form.topChallenge === value ? "var(--accent)" : "var(--text-primary)",
                            transition: "all 150ms",
                          }}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {error && <div style={{ marginTop: 12, color: "#EF4444", fontSize: 13 }}>{error}</div>}

                  <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
                    <button onClick={() => setStep("salary")} style={backBtnStyle}>← Back</button>
                    <button onClick={submit} disabled={submitting} style={{ ...nextBtnStyle, opacity: submitting ? 0.7 : 1 }}>
                      {submitting ? "Saving..." : "Submit check-in ✓"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Done state */}
        {step === "done" && (
          <div style={{ padding: 36, borderRadius: "var(--radius-xl)", border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 950, color: "var(--text-primary)" }}>Check-in complete</h2>
            <p style={{ margin: "0 0 24px", fontSize: 15, color: "var(--text-muted)", lineHeight: 1.7 }}>
              Your data has been saved. As more of your peers complete check-ins, we'll build salary benchmarks and career outcome insights visible through the career guide.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/career-guide" style={{ padding: "12px 20px", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "#fff", textDecoration: "none", fontWeight: 950, fontSize: 14 }}>
                Back to Career Guide
              </Link>
              <Link href="/dashboard" style={{ padding: "12px 20px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", textDecoration: "none", fontWeight: 900, fontSize: 14 }}>
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </PremiumShell>
  );
}

function Field({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 900,
  color: "var(--text-primary)",
  marginBottom: 6,
  letterSpacing: 0.3,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--card-border)",
  background: "var(--input-bg)",
  color: "var(--text-primary)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const nextBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: "13px",
  borderRadius: "var(--radius-md)",
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontWeight: 950,
  fontSize: 14,
  cursor: "pointer",
};

const backBtnStyle: React.CSSProperties = {
  padding: "13px 18px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--card-border)",
  background: "var(--card-bg)",
  color: "var(--text-primary)",
  fontWeight: 900,
  fontSize: 14,
  cursor: "pointer",
};
