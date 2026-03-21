import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import PremiumShell from "@/app/components/PremiumShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Career Guide | Interview Performance Coach",
};


const GUIDES = [
  {
    href: "/career-guide/first-year",
    eyebrow: "Onboarding",
    title: "Your first 90 days",
    desc: "What to do in your first week, first month, and first quarter at a new job. Checklists, priorities, and the mistakes most people make.",
    icon: "🚀",
    color: "var(--accent)",
  },
  {
    href: "/career-guide/finances",
    eyebrow: "Finances",
    title: "Money & benefits 101",
    desc: "401k enrollment, health insurance, HSA vs FSA, direct deposit, emergency fund - everything HR assumes you already know.",
    icon: "💰",
    color: "#10B981",
  },
  {
    href: "/career-guide/housing",
    eyebrow: "Housing",
    title: "Renting your first apartment",
    desc: "How to read a lease, what to negotiate, renter's insurance, security deposits, utilities setup, and red flags to avoid.",
    icon: "🏠",
    color: "#F59E0B",
  },
  {
    href: "/career-guide/career-paths",
    eyebrow: "Career",
    title: "Career path explorer",
    desc: "Where do people go from entry-level roles? Common progression paths by industry and function, with realistic timelines.",
    icon: "🗺",
    color: "#8B5CF6",
  },
  {
    href: "/career-guide/retirement",
    eyebrow: "Financial planning",
    title: "Retirement projection",
    desc: "See when you could retire based on your salary, 401k contributions, and savings. Personalized projections with fast-track levers.",
    icon: "📈",
    color: "#10B981",
  },
  {
    href: "/career-guide/benchmarks",
    eyebrow: "Peer data",
    title: "Cohort benchmarks",
    desc: "How does your salary, savings, and career satisfaction compare to peers? Anonymous, aggregated outcomes from your cohort.",
    icon: "📊",
    color: "#0EA5E9",
  },
];

export default async function CareerGuidePage() {
  const session = await getServerSession(authOptions);
  const firstName = (session?.user?.name ?? "").split(" ")[0] || "there";

  return (
    <PremiumShell title="Career Guide" subtitle="Resources for your first years in the workforce">
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 0 48px" }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 30, fontWeight: 950, letterSpacing: -0.5, color: "var(--text-primary)", margin: 0 }}>
            Hey {firstName} - landing the job is just the start.
          </h1>
          <p style={{ marginTop: 10, fontSize: 15, color: "var(--text-muted)", lineHeight: 1.75, maxWidth: 680 }}>
            Most career tools stop the moment you accept an offer. This section covers everything that comes next - financial setup, your first 90 days, housing, and where your career can go from here.
          </p>
        </div>

        {/* Guide cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {GUIDES.map(({ href, eyebrow, title, desc, icon, color }) => (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div
                className="ipc-card-lift"
                style={{
                  padding: 24,
                  borderRadius: "var(--radius-xl)",
                  border: "1px solid var(--card-border)",
                  background: "linear-gradient(160deg, var(--card-bg-strong), var(--card-bg))",
                  boxShadow: "var(--shadow-card-soft)",
                  cursor: "pointer",
                  height: "100%",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, color, textTransform: "uppercase", marginBottom: 6 }}>{eyebrow}</div>
                <div style={{ fontSize: 18, fontWeight: 950, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.3 }}>{title}</div>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7 }}>{desc}</p>
                <div style={{ marginTop: 16, fontSize: 13, fontWeight: 900, color }}>Read guide →</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Check-in CTA */}
        <div style={{
          marginTop: 28,
          padding: "24px 28px",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--accent-strong)",
          background: "var(--accent-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 950, color: "var(--accent)" }}>Already in the workforce?</div>
            <div style={{ marginTop: 4, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Complete your career check-in - it takes 2 minutes and helps track your progress and benchmark your salary against peers.
            </div>
          </div>
          <Link
            href="/career-checkin"
            style={{
              padding: "10px 18px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--accent-strong)",
              background: "var(--accent)",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 950,
              fontSize: 14,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Complete check-in →
          </Link>
        </div>
      </div>
    </PremiumShell>
  );
}
