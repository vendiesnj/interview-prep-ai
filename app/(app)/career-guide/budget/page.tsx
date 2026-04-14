"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PremiumShell from "@/app/components/PremiumShell";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = "needs" | "wants" | "savings";

type BudgetLine = {
  id: string;
  label: string;
  category: Category;
  amount: number;
  placeholder: number;
};

// ── Default budget lines ───────────────────────────────────────────────────────

const DEFAULT_LINES: BudgetLine[] = [
  // Needs
  { id: "rent",         label: "Rent / Mortgage",        category: "needs",   amount: 0, placeholder: 1400 },
  { id: "utilities",    label: "Utilities & Internet",   category: "needs",   amount: 0, placeholder: 120  },
  { id: "groceries",    label: "Groceries",              category: "needs",   amount: 0, placeholder: 300  },
  { id: "transport",    label: "Transportation",         category: "needs",   amount: 0, placeholder: 200  },
  { id: "insurance",    label: "Health / Auto Insurance",category: "needs",   amount: 0, placeholder: 180  },
  { id: "loans",        label: "Loan Minimums",          category: "needs",   amount: 0, placeholder: 250  },
  // Wants
  { id: "dining",       label: "Dining Out",             category: "wants",   amount: 0, placeholder: 150  },
  { id: "entertainment",label: "Entertainment",          category: "wants",   amount: 0, placeholder: 80   },
  { id: "subscriptions",label: "Subscriptions",         category: "wants",   amount: 0, placeholder: 60   },
  { id: "shopping",     label: "Shopping / Clothing",   category: "wants",   amount: 0, placeholder: 100  },
  { id: "travel",       label: "Travel",                 category: "wants",   amount: 0, placeholder: 80   },
  // Savings
  { id: "emergency",    label: "Emergency Fund",         category: "savings", amount: 0, placeholder: 150  },
  { id: "k401",         label: "401(k) Contribution",   category: "savings", amount: 0, placeholder: 300  },
  { id: "roth",         label: "Roth IRA",               category: "savings", amount: 0, placeholder: 100  },
  { id: "other_savings",label: "Other Savings / Goals", category: "savings", amount: 0, placeholder: 50   },
];

const STORAGE_KEY = "ipc_budget_v1";

// ── Category config ────────────────────────────────────────────────────────────

const CAT: Record<Category, { label: string; color: string; ideal: number; icon: string; desc: string }> = {
  needs:   { label: "Needs",   color: "#2563EB", ideal: 50, icon: "🏠", desc: "Essentials - rent, food, transport, insurance, loan minimums" },
  wants:   { label: "Wants",   color: "#F59E0B", ideal: 30, icon: "🎉", desc: "Lifestyle - dining out, entertainment, subscriptions, shopping" },
  savings: { label: "Savings", color: "#10B981", ideal: 20, icon: "📈", desc: "Future - emergency fund, 401k, Roth IRA, goals" },
};

function fmt(n: number) {
  return n < 0
    ? `-$${Math.abs(Math.round(n)).toLocaleString()}`
    : `$${Math.round(n).toLocaleString()}`;
}

// ── Donut SVG ─────────────────────────────────────────────────────────────────

function DonutChart({ segments }: { segments: { color: string; pct: number }[] }) {
  const r = 44;
  const cx = 60;
  const cy = 60;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const arcs = segments.map((s) => {
    const dash = (s.pct / 100) * circ;
    const gap = circ - dash;
    const arc = { color: s.color, dash, gap, offset, pct: s.pct };
    offset += dash;
    return arc;
  });

  return (
    <svg width={120} height={120} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--card-border)" strokeWidth={14} />
      {arcs.map((arc, i) =>
        arc.pct > 0.5 ? (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth={14}
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={-arc.offset + circ * 0.25}
            style={{ transition: "stroke-dasharray 400ms ease" }}
          />
        ) : null
      )}
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const [income, setIncome] = useState(0);
  const [lines, setLines] = useState<BudgetLine[]>(DEFAULT_LINES);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.income != null) setIncome(saved.income);
      if (Array.isArray(saved.lines)) {
        setLines((prev) =>
          prev.map((line) => {
            const match = saved.lines.find((l: BudgetLine) => l.id === line.id);
            return match ? { ...line, amount: match.amount } : line;
          })
        );
      }
    } catch { /* ignore */ }
  }, []);

  // Save to localStorage
  const save = useCallback((newIncome: number, newLines: BudgetLine[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ income: newIncome, lines: newLines }));
    } catch { /* ignore */ }
  }, []);

  function updateIncome(v: number) {
    setIncome(v);
    save(v, lines);
  }

  function updateLine(id: string, amount: number) {
    const updated = lines.map((l) => (l.id === id ? { ...l, amount } : l));
    setLines(updated);
    save(income, updated);
  }

  // ── Calculations ────────────────────────────────────────────────────────────

  const totalNeeds   = lines.filter((l) => l.category === "needs").reduce((s, l) => s + l.amount, 0);
  const totalWants   = lines.filter((l) => l.category === "wants").reduce((s, l) => s + l.amount, 0);
  const totalSavings = lines.filter((l) => l.category === "savings").reduce((s, l) => s + l.amount, 0);
  const totalSpent   = totalNeeds + totalWants + totalSavings;
  const remaining    = income - totalSpent;

  const needsPct   = income > 0 ? Math.round((totalNeeds   / income) * 100) : 0;
  const wantsPct   = income > 0 ? Math.round((totalWants   / income) * 100) : 0;
  const savingsPct = income > 0 ? Math.round((totalSavings / income) * 100) : 0;
  const remainPct  = income > 0 ? Math.round((Math.max(0, remaining) / income) * 100) : 0;

  const donutSegments = income > 0
    ? [
        { color: CAT.needs.color,   pct: needsPct   },
        { color: CAT.wants.color,   pct: wantsPct   },
        { color: CAT.savings.color, pct: savingsPct },
        { color: "var(--card-border-soft)", pct: Math.max(0, remainPct) },
      ]
    : [{ color: "var(--card-border)", pct: 100 }];

  const catTotals: Record<Category, number> = { needs: totalNeeds, wants: totalWants, savings: totalSavings };

  return (
    <PremiumShell title="Monthly Budget Builder" subtitle="See where your money goes - and where it should">
      <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 60 }}>

        <div style={{ marginBottom: 20 }}>
          <Link href="/dashboard" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", fontWeight: 700 }}>← Dashboard</Link>
        </div>

        {/* Income row */}
        <div style={{
          padding: "24px 28px",
          borderRadius: "var(--radius-xl)",
          border: "2px solid var(--accent-strong)",
          background: "var(--accent-soft)",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
        }}>
          <div style={{ flex: "1 1 280px" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.8, color: "var(--accent)", textTransform: "uppercase", marginBottom: 4 }}>Monthly Take-Home Pay</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Enter your income after taxes and 401k deductions. That's your real number to budget from.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)" }}>$</span>
            <input
              type="number"
              min={0}
              value={income || ""}
              onChange={(e) => updateIncome(Number(e.target.value))}
              placeholder="3,500"
              style={{
                width: 160,
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                border: "2px solid var(--accent-strong)",
                background: "var(--card-bg)",
                color: "var(--text-primary)",
                fontSize: 22,
                fontWeight: 800,
                outline: "none",
                textAlign: "right",
              }}
            />
            <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 700 }}>/mo</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }}>

          {/* ── Left: expense inputs ── */}
          <div style={{ display: "grid", gap: 20 }}>
            {(["needs", "wants", "savings"] as Category[]).map((cat) => {
              const cfg = CAT[cat];
              const total = catTotals[cat];
              const pct = income > 0 ? Math.round((total / income) * 100) : 0;
              const over = pct > cfg.ideal;
              return (
                <div key={cat} style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "var(--card-bg)", overflow: "hidden" }}>
                  {/* Category header */}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--card-border-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: cfg.color }}>{cfg.label}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{cfg.desc}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: over ? "#EF4444" : cfg.color }}>{pct}%</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>ideal: {cfg.ideal}%</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 4, background: "var(--card-border-soft)" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(100, (pct / cfg.ideal) * 100)}%`,
                      background: over ? "#EF4444" : cfg.color,
                      transition: "width 300ms ease",
                    }} />
                  </div>

                  {/* Line items */}
                  <div style={{ padding: "12px 20px 16px", display: "grid", gap: 10 }}>
                    {lines.filter((l) => l.category === cat).map((line) => (
                      <div key={line.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <label style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", fontWeight: 700 }}>{line.label}</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>$</span>
                          <input
                            type="number"
                            min={0}
                            value={line.amount || ""}
                            onChange={(e) => updateLine(line.id, Number(e.target.value))}
                            placeholder={String(line.placeholder)}
                            style={{
                              width: 100,
                              padding: "6px 10px",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--card-border)",
                              background: "var(--card-bg-strong)",
                              color: "var(--text-primary)",
                              fontSize: 14,
                              fontWeight: 700,
                              outline: "none",
                              textAlign: "right",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Right: summary ── */}
          <div style={{ position: "sticky", top: 24, display: "grid", gap: 16 }}>

            {/* Donut + legend */}
            <div style={{
              padding: "24px 20px",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--card-border)",
              background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}>
              <div style={{ position: "relative" }}>
                <DonutChart segments={donutSegments} />
                <div style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%,-50%)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", letterSpacing: 0.5 }}>TOTAL</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>{fmt(totalSpent)}</div>
                </div>
              </div>

              <div style={{ width: "100%", display: "grid", gap: 8 }}>
                {(["needs", "wants", "savings"] as Category[]).map((cat) => {
                  const cfg = CAT[cat];
                  const total = catTotals[cat];
                  const pct = income > 0 ? Math.round((total / income) * 100) : 0;
                  return (
                    <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: cfg.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{cfg.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 900, color: cfg.color }}>{fmt(total)}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", width: 32, textAlign: "right" }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Remaining */}
            <div style={{
              padding: "20px 20px",
              borderRadius: "var(--radius-xl)",
              border: `1px solid ${remaining >= 0 ? "#10B981" : "#EF4444"}`,
              background: remaining >= 0 ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: remaining >= 0 ? "#10B981" : "#EF4444", textTransform: "uppercase", marginBottom: 4 }}>
                {remaining >= 0 ? "Monthly Surplus" : "Monthly Deficit"}
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: remaining >= 0 ? "#10B981" : "#EF4444", lineHeight: 1 }}>
                {fmt(remaining)}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                {remaining > 0
                  ? `${fmt(remaining * 12)} extra per year - put it toward debt payoff or investing.`
                  : remaining < 0
                  ? `You're over budget. Look for cuts in Wants first.`
                  : income > 0
                  ? "Exactly balanced - consider adding to savings."
                  : "Enter your income above to see your budget breakdown."}
              </div>
            </div>

            {/* 50/30/20 health check */}
            {income > 0 && (
              <div style={{
                padding: "18px 20px",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--card-border)",
                background: "var(--card-bg)",
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.8, color: "var(--accent)", textTransform: "uppercase", marginBottom: 12 }}>50/30/20 Check</div>
                {(["needs", "wants", "savings"] as Category[]).map((cat) => {
                  const cfg = CAT[cat];
                  const pct = income > 0 ? Math.round((catTotals[cat] / income) * 100) : 0;
                  const diff = pct - cfg.ideal;
                  const ok = Math.abs(diff) <= 5;
                  const over = diff > 5;
                  return (
                    <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 14 }}>{ok ? "✅" : over ? "⚠️" : "📉"}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>{cfg.label}</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 900,
                        color: ok ? "#10B981" : over ? "#EF4444" : "#F59E0B",
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: ok ? "rgba(16,185,129,0.1)" : over ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                      }}>
                        {pct}% {ok ? "✓" : over ? `+${diff}%` : `${diff}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <Link
              href="/career-guide/retirement"
              style={{
                display: "block",
                padding: "14px 18px",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--accent-strong)",
                background: "var(--accent-soft)",
                textDecoration: "none",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)" }}>See your retirement projection →</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Based on your savings rate and salary</div>
            </Link>
          </div>
        </div>

        {/* Tips */}
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.8, color: "var(--accent)", marginBottom: 14 }}>BUDGETING TIPS THAT ACTUALLY WORK</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {[
              { title: "Budget from take-home, not salary", body: "Your gross salary minus taxes, 401k, and insurance is your real number. Budgeting from gross is why people always run short." },
              { title: "Automate savings on payday", body: "Set up automatic transfers to savings and investment accounts the day you get paid. If it never hits your checking account, you won't spend it." },
              { title: "The wants category is your leverage", body: "Most people can't cut needs. Savings targets are fixed. Wants is where you have real flexibility - and where small cuts have the biggest impact." },
              { title: "Review your budget quarterly", body: "Rent changes, subscriptions pile up, income grows. A budget that's 6 months stale isn't a budget - it's a wish. Review it every 3 months and adjust." },
            ].map(({ title, body }) => (
              <div key={title} style={{ padding: 18, borderRadius: "var(--radius-xl)", border: "1px solid var(--card-border)", background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>{title}</div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PremiumShell>
  );
}
