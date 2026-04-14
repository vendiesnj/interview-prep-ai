import Link from "next/link";
import { notFound } from "next/navigation";
import PremiumShell from "@/app/components/PremiumShell";
import OCCUPATIONS, { aiRiskLabel, educationLabel, matchOccupations } from "@/app/lib/onet-occupations";
import type { Metadata } from "next";

interface Props {
  params: { occupation: string };
}

export async function generateStaticParams() {
  return OCCUPATIONS.map(o => ({ occupation: o.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const occ = OCCUPATIONS.find(o => o.id === params.occupation);
  if (!occ) return { title: "Career Path | Signal" };
  return { title: `${occ.title} Career Path | Signal` };
}

const RIASEC_LABELS: Record<string, string> = {
  R: "Realistic", I: "Investigative", A: "Artistic",
  S: "Social", E: "Enterprising", C: "Conventional",
};

const RIASEC_COLORS: Record<string, string> = {
  R: "#D97706", I: "#2563EB", A: "#7C3AED",
  S: "#16A34A", E: "#DC2626", C: "#0891B2",
};

const EDU_TIMELINE: Record<string, string> = {
  no_degree: "Can start now - no formal degree required",
  certificate: "6–18 month program or trade school",
  associate: "2-year degree or apprenticeship (2–5 years)",
  bachelor: "4-year degree",
  master: "6+ years (bachelor's + 2 years graduate)",
  doctoral: "8–12 years (bachelor's + professional/doctoral program)",
};

export default function OccupationProfilePage({ params }: Props) {
  const occ = OCCUPATIONS.find(o => o.id === params.occupation);
  if (!occ) notFound();

  const risk = aiRiskLabel(occ.aiRisk);
  const related = matchOccupations(occ.riasec, { limit: 6, excludeIds: [occ.id] });

  const riasecLetters = occ.riasec.split("");

  return (
    <PremiumShell hideHeader>
      <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 80 }}>

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, color: "var(--text-muted)" }}>
          <Link href="/career-guide/career-paths" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Career Paths</Link>
          <span>›</span>
          <span style={{ color: "var(--text-primary)" }}>{occ.title}</span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: "var(--accent)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>
                {occ.category}
              </div>
              <h1 style={{ margin: "0 0 12px", fontSize: 32, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.6 }}>
                {occ.title}
              </h1>
              <p style={{ margin: 0, fontSize: 16, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 620 }}>
                {occ.description}
              </p>
            </div>
          </div>
        </div>

        {/* Key stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
          <StatCard label="Salary Range" value={`$${occ.salary[0]}K – $${occ.salary[1]}K`} color="var(--accent)" />
          <StatCard label="AI Automation Risk" value={`${occ.aiRisk}%`} color={risk.color} sub={risk.label} />
          <StatCard label="Education Path" value={educationLabel(occ.education)} color="#8B5CF6" />
          {occ.trades && <StatCard label="Trade Path" value="Vocational / Apprenticeship available" color="#D97706" />}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>
          <div>

            {/* RIASEC profile */}
            <Card style={{ marginBottom: 20 }}>
              <CardHeader title="Personality fit (RIASEC)" />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {riasecLetters.map((letter, i) => (
                  <div key={letter} style={{ padding: "8px 16px", borderRadius: "var(--radius-md)", background: (RIASEC_COLORS[letter] ?? "#888") + "15", border: `1px solid ${(RIASEC_COLORS[letter] ?? "#888")}30` }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: RIASEC_COLORS[letter] ?? "#888" }}>{letter}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>{RIASEC_LABELS[letter]}</div>
                    {i === 0 && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Primary</div>}
                  </div>
                ))}
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>
                This occupation most strongly matches people with <strong>{riasecLetters.map(l => RIASEC_LABELS[l]).join(", ")}</strong> interests.{" "}
                Complete the <Link href="/aptitude" style={{ color: "var(--accent)" }}>Career Assessment</Link> to see how well your profile aligns.
              </p>
            </Card>

            {/* AI risk detail */}
            <Card style={{ marginBottom: 20 }}>
              <CardHeader title="AI automation analysis" />
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 8, borderRadius: 99, background: "var(--card-border-soft)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${occ.aiRisk}%`, borderRadius: 99, background: risk.color, transition: "width 0.6s ease" }} />
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: risk.color, minWidth: 48 }}>{occ.aiRisk}%</div>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
                {occ.aiRisk < 25
                  ? `${occ.title} has one of the lowest automation risk profiles in the economy. This role requires physical dexterity, complex human judgment, or deep interpersonal skills that current AI systems cannot replicate.`
                  : occ.aiRisk < 45
                  ? `${occ.title} has moderate automation exposure. Routine analytical tasks may be augmented by AI tools, but the high-value components - judgment, relationships, and creative strategy - remain human-dependent.`
                  : `${occ.title} has significant automation exposure. Parts of this role are already being automated. Success in this field increasingly requires focusing on the judgment, leadership, and relationship-intensive components.`}
              </p>
              <Link href="/future-proof" style={{ display: "inline-block", marginTop: 12, fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                Learn how to future-proof any career →
              </Link>
            </Card>

            {/* Education & Timeline */}
            <Card style={{ marginBottom: 20 }}>
              <CardHeader title="Education & timeline" />
              <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--accent-soft)", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "var(--accent)" }}>{educationLabel(occ.education)}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{EDU_TIMELINE[occ.education]}</div>
              </div>
              {occ.trades && (
                <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#D97706", marginBottom: 4 }}>TRADE / APPRENTICESHIP PATH</div>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65 }}>
                    This occupation is available through trade school or apprenticeship - often faster and less expensive than a 4-year degree, with strong job placement. Many trade workers start earning full wages within 2–4 years.
                  </p>
                </div>
              )}
            </Card>

            {/* Entrepreneurship path */}
            {occ.entrepreneurPath && (
              <Card style={{ marginBottom: 20 }}>
                <CardHeader title="Entrepreneurship path" />
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 24 }}>🚀</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text-primary)", marginBottom: 4 }}>{occ.entrepreneurPath}</div>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>
                      Many professionals in this field eventually start their own practice, firm, or business. Building experience and a client base as an employee is often the fastest path to entrepreneurship in this area.
                    </p>
                  </div>
                </div>
              </Card>
            )}

          </div>

          {/* Right column */}
          <div>

            {/* Side hustles */}
            {occ.sideHustles.length > 0 && (
              <Card style={{ marginBottom: 16 }}>
                <CardHeader title="Side income ideas" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {occ.sideHustles.map(hustle => (
                    <div key={hustle} style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "var(--card-bg-strong)", fontSize: 13, color: "var(--text-primary)", fontWeight: 700 }}>
                      {hustle}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Practice CTA */}
            <Card style={{ marginBottom: 16, background: "var(--accent-soft)", borderColor: "var(--accent-strong)" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--accent)", marginBottom: 6 }}>Practice for this career</div>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                Practice behavioral interviews, networking pitches, and professional communication specific to {occ.category} roles.
              </p>
              <Link href="/practice" style={{ display: "block", padding: "9px 14px", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "#fff", fontWeight: 900, fontSize: 13, textDecoration: "none", textAlign: "center" }}>
                Start practicing →
              </Link>
            </Card>

            {/* Aptitude CTA */}
            <Card>
              <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)", marginBottom: 6 }}>Is this the right fit?</div>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                Take the career aptitude assessment to see how your RIASEC profile matches {occ.title} and 300+ other occupations.
              </p>
              <Link href="/aptitude" style={{ display: "block", padding: "9px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--accent)", color: "var(--accent)", fontWeight: 900, fontSize: 13, textDecoration: "none", textAlign: "center" }}>
                Take assessment →
              </Link>
            </Card>

          </div>
        </div>

        {/* Related occupations */}
        {related.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color: "var(--accent)", textTransform: "uppercase", marginBottom: 16 }}>
              Related careers with similar RIASEC profile
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {related.map(r => {
                const rRisk = aiRiskLabel(r.aiRisk);
                return (
                  <Link key={r.id} href={`/career-guide/career-paths/${r.id}`} style={{ textDecoration: "none" }}>
                    <div className="ipc-card-lift" style={{ padding: "14px 16px", borderRadius: "var(--radius-lg)", border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: rRisk.color, marginBottom: 4 }}>{r.aiRisk}% AI risk</div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)", marginBottom: 2 }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>${r.salary[0]}K–${r.salary[1]}K</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </PremiumShell>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color, lineHeight: 1.3 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: "20px 22px", borderRadius: 14, border: "1px solid var(--card-border)", background: "var(--card-bg)", ...style }}>
      {children}
    </div>
  );
}

function CardHeader({ title }: { title: string }) {
  return <div style={{ fontSize: 12, fontWeight: 900, color: "var(--accent)", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 14 }}>{title}</div>;
}
