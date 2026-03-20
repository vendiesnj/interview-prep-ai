"use client";

import { useState } from "react";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";

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

const SAVINGS_RANGES = [
  { value: "under_5k", label: "Under $5k" },
  { value: "5_15k", label: "$5k – $15k" },
  { value: "15_30k", label: "$15k – $30k" },
  { value: "30_60k", label: "$30k – $60k" },
  { value: "60_100k", label: "$60k – $100k" },
  { value: "over_100k", label: "Over $100k" },
  { value: "prefer_not", label: "Prefer not to say" },
];

const LOAN_RANGES = [
  { value: "none", label: "No student loans" },
  { value: "under_10k", label: "Under $10k" },
  { value: "10_30k", label: "$10k – $30k" },
  { value: "30_60k", label: "$30k – $60k" },
  { value: "60_100k", label: "$60k – $100k" },
  { value: "over_100k", label: "Over $100k" },
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

type Step = "status" | "role" | "compensation" | "financial" | "satisfaction" | "university" | "done";
const STEPS: Step[] = ["status", "role", "compensation", "financial", "satisfaction", "university"];

export default function CareerCheckInPage() {
  const [step, setStep] = useState<Step>("status");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    employmentStatus: "",
    jobTitle: "", company: "", industry: "", city: "", state: "",
    age: "",
    graduationYear: "", major: "",
    salaryRange: "",
    salaryExact: "",
    monthlyRent: "",
    has401k: "" as "" | "yes" | "no",
    contribution401kPct: "",
    currentSavingsRange: "",
    currentSavingsExact: "",
    studentLoanRange: "",
    studentLoanExact: "",
    retirementGoalAge: "",
    satisfactionScore: "",
    topChallenge: "",
    universitySatisfaction: "",
    wouldChooseSameUniversity: "" as "" | "yes" | "no",
    universityName: "",
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const stepIndex = STEPS.indexOf(step);
  const progress = step === "done" ? 100 : Math.round(((stepIndex + 1) / STEPS.length) * 100);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        has401k: form.has401k === "yes" ? true : form.has401k === "no" ? false : null,
        wouldChooseSameUniversity: form.wouldChooseSameUniversity === "yes" ? true : form.wouldChooseSameUniversity === "no" ? false : null,
      };
      const res = await fetch("/api/career-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PremiumShell title="Career Check-In" subtitle="All questions optional — share what you're comfortable with">
      <div style={{ maxWidth: 660, margin: "0 auto", paddingBottom: 48 }}>
        <div style={{ marginBottom: 20 }}>
          <Link href="/career-guide" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontWeight: 700 }}>← Career Guide</Link>
        </div>

        {step !== "done" && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>
                <span>Step {stepIndex + 1} of {STEPS.length}</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: "var(--card-border)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "var(--accent)", borderRadius: 99, transition: "width 400ms" }} />
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                {STEPS.map((s, i) => (
                  <div key={s} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= stepIndex ? "var(--accent)" : "var(--card-border)", transition: "background 300ms" }} />
                ))}
              </div>
            </div>

            <div style={{ padding: 28, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))" }}>

              {/* ── STEP 1: STATUS ── */}
              {step === "status" && (
                <div>
                  <StepHeader title="Where are you right now?" sub="Select the option that best describes your current situation." />
                  <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
                    {[
                      { value: "employed", label: "Employed full-time", icon: "💼" },
                      { value: "employed_part", label: "Employed part-time or contract", icon: "📋" },
                      { value: "job_searching", label: "Actively job searching", icon: "🔍" },
                      { value: "graduate_school", label: "In graduate school", icon: "🎓" },
                      { value: "freelance", label: "Freelance / self-employed", icon: "🚀" },
                      { value: "other", label: "Other", icon: "•" },
                    ].map(({ value, label, icon }) => (
                      <OptionCard key={value} selected={form.employmentStatus === value} onClick={() => set("employmentStatus", value)}>
                        <span style={{ fontSize: 18 }}>{icon}</span>
                        <span style={{ fontSize: 14, fontWeight: form.employmentStatus === value ? 900 : 700 }}>{label}</span>
                      </OptionCard>
                    ))}
                  </div>
                  <NavRow onNext={() => setStep("role")} nextDisabled={!form.employmentStatus} />
                </div>
              )}

              {/* ── STEP 2: ROLE ── */}
              {step === "role" && (
                <div>
                  <StepHeader title="Tell us about your role" sub="All fields optional — share what you're comfortable with." />
                  <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
                    <Field label="Job title" placeholder="e.g. Software Engineer" value={form.jobTitle} onChange={(v) => set("jobTitle", v)} />
                    <Field label="Company" placeholder="e.g. Accenture" value={form.company} onChange={(v) => set("company", v)} />
                    <SelectField label="Industry" value={form.industry} onChange={(v) => set("industry", v)}>
                      <option value="">Select industry</option>
                      {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                    </SelectField>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="City" placeholder="e.g. Chicago" value={form.city} onChange={(v) => set("city", v)} />
                      <Field label="State" placeholder="e.g. IL" value={form.state} onChange={(v) => set("state", v)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Field label="Age" placeholder="e.g. 24" value={form.age} onChange={(v) => set("age", v.replace(/\D/g, ""))} />
                      <SelectField label="Graduation year" value={form.graduationYear} onChange={(v) => set("graduationYear", v)}>
                        <option value="">Select year</option>
                        {GRAD_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </SelectField>
                    </div>
                    <Field label="Major / field of study" placeholder="e.g. Business" value={form.major} onChange={(v) => set("major", v)} />
                  </div>
                  <NavRow onBack={() => setStep("status")} onNext={() => setStep("compensation")} />
                </div>
              )}

              {/* ── STEP 3: COMPENSATION ── */}
              {step === "compensation" && (
                <div>
                  <StepHeader title="Compensation" sub="Used anonymously to build salary benchmarks for your grad year and field. We never share individual data." />
                  <SectionLabel>Annual salary range</SectionLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {SALARY_RANGES.map(({ value, label }) => (
                      <OptionCard key={value} selected={form.salaryRange === value} onClick={() => set("salaryRange", value)} compact>
                        {label}
                      </OptionCard>
                    ))}
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <Field label="Or enter exact annual salary (optional)" placeholder="e.g. 72000" value={form.salaryExact} onChange={(v) => set("salaryExact", v.replace(/\D/g, ""))} prefix="$" />
                  </div>
                  <SectionLabel>Monthly housing cost (rent or mortgage)</SectionLabel>
                  <div style={{ marginBottom: 4 }}>
                    <Field label="" placeholder="e.g. 1800" value={form.monthlyRent} onChange={(v) => set("monthlyRent", v.replace(/\D/g, ""))} prefix="$" />
                  </div>
                  <p style={{ margin: "4px 0 20px", fontSize: 12, color: "var(--text-muted)" }}>Helps calculate your rent-to-income ratio and benchmark against peers in your city.</p>
                  <NavRow onBack={() => setStep("role")} onNext={() => setStep("financial")} />
                </div>
              )}

              {/* ── STEP 4: FINANCIAL ── */}
              {step === "financial" && (
                <div>
                  <StepHeader title="Financial snapshot" sub="Powers your retirement projection and financial health score. Completely optional — skip anything you'd prefer not to share." />

                  <SectionLabel>Do you have a 401k or retirement account through work?</SectionLabel>
                  <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                    {[{ value: "yes", label: "Yes" }, { value: "no", label: "No / Not yet" }].map(({ value, label }) => (
                      <OptionCard key={value} selected={form.has401k === value} onClick={() => set("has401k", value)} compact style={{ flex: 1 }}>
                        {label}
                      </OptionCard>
                    ))}
                  </div>

                  {form.has401k === "yes" && (
                    <>
                      <SectionLabel>What % of your salary are you contributing?</SectionLabel>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
                        {["1", "2", "3", "4", "5", "6", "8", "10", "12", "15", "20", "other"].map((v) => (
                          <OptionCard key={v} selected={form.contribution401kPct === v} onClick={() => set("contribution401kPct", v)} compact>
                            {v === "other" ? "Other" : `${v}%`}
                          </OptionCard>
                        ))}
                      </div>
                    </>
                  )}

                  <SectionLabel>Current total savings / investments (excluding home equity)</SectionLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {SAVINGS_RANGES.map(({ value, label }) => (
                      <OptionCard key={value} selected={form.currentSavingsRange === value} onClick={() => set("currentSavingsRange", value)} compact>
                        {label}
                      </OptionCard>
                    ))}
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <Field label="Or enter exact savings amount (optional)" placeholder="e.g. 14500" value={form.currentSavingsExact} onChange={(v) => set("currentSavingsExact", v.replace(/\D/g, ""))} prefix="$" />
                  </div>

                  <SectionLabel>Student loan balance</SectionLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {LOAN_RANGES.map(({ value, label }) => (
                      <OptionCard key={value} selected={form.studentLoanRange === value} onClick={() => set("studentLoanRange", value)} compact>
                        {label}
                      </OptionCard>
                    ))}
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <Field label="Or enter exact loan balance (optional)" placeholder="e.g. 28400" value={form.studentLoanExact} onChange={(v) => set("studentLoanExact", v.replace(/\D/g, ""))} prefix="$" />
                  </div>

                  <SectionLabel>Target retirement age (optional)</SectionLabel>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 4 }}>
                    {["50", "55", "60", "62", "65", "67", "70", "no_pref"].map((v) => (
                      <OptionCard key={v} selected={form.retirementGoalAge === v} onClick={() => set("retirementGoalAge", v)} compact>
                        {v === "no_pref" ? "No pref" : v}
                      </OptionCard>
                    ))}
                  </div>
                  <p style={{ margin: "6px 0 20px", fontSize: 12, color: "var(--text-muted)" }}>Used to project when you can retire and what steps would accelerate it.</p>

                  <NavRow onBack={() => setStep("compensation")} onNext={() => setStep("satisfaction")} />
                </div>
              )}

              {/* ── STEP 5: SATISFACTION ── */}
              {step === "satisfaction" && (
                <div>
                  <StepHeader title="How are you doing?" sub="Helps us understand how grads are actually feeling in their careers." />

                  <SectionLabel>Overall career satisfaction</SectionLabel>
                  <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        onClick={() => set("satisfactionScore", String(n))}
                        style={{ flex: 1, padding: "14px 0", borderRadius: "var(--radius-lg)", border: `2px solid ${form.satisfactionScore === String(n) ? "var(--accent)" : "var(--card-border)"}`, background: form.satisfactionScore === String(n) ? "var(--accent-soft)" : "var(--card-bg)", cursor: "pointer", textAlign: "center" as const, transition: "all 150ms" }}
                      >
                        <div style={{ fontSize: 20 }}>{["😔", "😐", "🙂", "😊", "🤩"][n - 1]}</div>
                        <div style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)", fontWeight: 700 }}>{["Low", "Okay", "Good", "Great", "Love it"][n - 1]}</div>
                      </div>
                    ))}
                  </div>

                  <SectionLabel>Biggest challenge right now</SectionLabel>
                  <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
                    {CHALLENGES.map(({ value, label }) => (
                      <OptionCard key={value} selected={form.topChallenge === value} onClick={() => set("topChallenge", value)} compact>
                        {label}
                      </OptionCard>
                    ))}
                  </div>

                  <NavRow onBack={() => setStep("financial")} onNext={() => setStep("university")} />
                </div>
              )}

              {/* ── STEP 6: UNIVERSITY ── */}
              {step === "university" && (
                <div>
                  <StepHeader title="Your university experience" sub="Helps career centers understand how well they prepared their students." />

                  <Field label="University / college name (optional)" placeholder="e.g. University of Illinois" value={form.universityName} onChange={(v) => set("universityName", v)} />

                  <div style={{ marginTop: 20 }}>
                    <SectionLabel>How satisfied are you with your university education?</SectionLabel>
                    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div
                          key={n}
                          onClick={() => set("universitySatisfaction", String(n))}
                          style={{ flex: 1, padding: "14px 0", borderRadius: "var(--radius-lg)", border: `2px solid ${form.universitySatisfaction === String(n) ? "var(--accent)" : "var(--card-border)"}`, background: form.universitySatisfaction === String(n) ? "var(--accent-soft)" : "var(--card-bg)", cursor: "pointer", textAlign: "center" as const, transition: "all 150ms" }}
                        >
                          <div style={{ fontSize: 20 }}>{["😔", "😐", "🙂", "😊", "🤩"][n - 1]}</div>
                          <div style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)", fontWeight: 700 }}>{["Very poor", "Below avg", "Average", "Good", "Excellent"][n - 1]}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <SectionLabel>Would you choose the same university again?</SectionLabel>
                  <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                    {[
                      { value: "yes", label: "Yes, definitely" },
                      { value: "no", label: "No, I'd choose differently" },
                    ].map(({ value, label }) => (
                      <OptionCard key={value} selected={form.wouldChooseSameUniversity === value} onClick={() => set("wouldChooseSameUniversity", value)} compact style={{ flex: 1 }}>
                        {label}
                      </OptionCard>
                    ))}
                  </div>

                  {error && <div style={{ marginBottom: 12, color: "#EF4444", fontSize: 13 }}>{error}</div>}

                  <NavRow onBack={() => setStep("satisfaction")} onNext={submit} nextLabel={submitting ? "Saving..." : "Submit check-in ✓"} nextDisabled={submitting} />
                </div>
              )}
            </div>
          </>
        )}

        {step === "done" && (
          <div style={{ padding: 36, borderRadius: "var(--radius-xl)", border: "1px solid var(--accent-strong)", background: "var(--accent-soft)", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 950, color: "var(--text-primary)" }}>Check-in complete</h2>
            <p style={{ margin: "0 0 24px", fontSize: 15, color: "var(--text-muted)", lineHeight: 1.7 }}>
              Your data has been saved. Check your retirement projection and see how you compare to peers.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/career-guide/retirement" style={{ padding: "12px 20px", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "#fff", textDecoration: "none", fontWeight: 950, fontSize: 14 }}>
                View retirement projection →
              </Link>
              <Link href="/career-guide/benchmarks" style={{ padding: "12px 20px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", textDecoration: "none", fontWeight: 900, fontSize: 14 }}>
                Peer benchmarks
              </Link>
              <Link href="/career-guide" style={{ padding: "12px 20px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", textDecoration: "none", fontWeight: 900, fontSize: 14 }}>
                Career Guide
              </Link>
            </div>
          </div>
        )}
      </div>
    </PremiumShell>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function StepHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 950, color: "var(--text-primary)" }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>{sub}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-primary)", letterSpacing: 0.3, marginBottom: 8 }}>{children}</div>;
}

function OptionCard({ children, selected, onClick, compact, style }: { children: React.ReactNode; selected: boolean; onClick: () => void; compact?: boolean; style?: React.CSSProperties }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: compact ? "10px 12px" : "13px 16px",
        borderRadius: "var(--radius-lg)",
        border: `2px solid ${selected ? "var(--accent)" : "var(--card-border)"}`,
        background: selected ? "var(--accent-soft)" : "var(--card-bg)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: compact ? 8 : 12,
        fontSize: compact ? 13 : 14,
        fontWeight: selected ? 900 : 700,
        color: selected ? "var(--accent)" : "var(--text-primary)",
        textAlign: "center" as const,
        justifyContent: compact ? "center" : "flex-start",
        transition: "all 150ms",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, placeholder, value, onChange, prefix }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; prefix?: string }) {
  return (
    <div>
      {label && <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-primary)", marginBottom: 6, letterSpacing: 0.3 }}>{label}</div>}
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14 }}>{prefix}</span>}
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", padding: prefix ? "10px 12px 10px 24px" : "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" as const }}
        />
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-primary)", marginBottom: 6, letterSpacing: 0.3 }}>{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 14, outline: "none", cursor: "pointer" }}>
        {children}
      </select>
    </div>
  );
}

function NavRow({ onBack, onNext, nextDisabled, nextLabel }: { onBack?: () => void; onNext?: () => void; nextDisabled?: boolean; nextLabel?: string }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {onBack && (
        <button onClick={onBack} style={{ padding: "13px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-primary)", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>
          ← Back
        </button>
      )}
      {onNext && (
        <button onClick={onNext} disabled={nextDisabled} style={{ flex: 1, padding: "13px", borderRadius: "var(--radius-md)", border: "none", background: nextDisabled ? "var(--card-border)" : "var(--accent)", color: nextDisabled ? "var(--text-muted)" : "#fff", fontWeight: 950, fontSize: 14, cursor: nextDisabled ? "not-allowed" : "pointer", opacity: nextDisabled ? 0.7 : 1 }}>
          {nextLabel ?? "Continue →"}
        </button>
      )}
    </div>
  );
}
