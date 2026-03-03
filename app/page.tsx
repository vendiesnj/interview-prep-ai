// app/page.tsx
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px 500px at 15% 0%, rgba(34,211,238,0.18), transparent 55%), radial-gradient(900px 500px at 85% 10%, rgba(99,102,241,0.14), transparent 55%), rgba(3,7,18,1)",
        color: "#E5E7EB",
      }}
    >
      {/* Top nav */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(10px)",
          background: "rgba(3,7,18,0.55)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "#E5E7EB",
              fontWeight: 950,
              letterSpacing: 0.2,
            }}
          >
            <Image src="/logo.png" alt="Interview Performance Coach" width={34} height={34} />
            <span>Interview Performance Coach</span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <a href="#how" style={navLinkStyle}>
              How it works
            </a>
            <a href="#features" style={navLinkStyle}>
              Features
            </a>
            <a href="#pricing" style={navLinkStyle}>
              Pricing
            </a>
            <a href="#faq" style={navLinkStyle}>
              FAQ
            </a>

            <Link
              href="/login"
              style={{
                ...navLinkStyle,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              Log in
            </Link>

            <Link
              href="/signup"
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(34,211,238,0.35)",
                background: "rgba(34,211,238,0.14)",
                color: "#A5F3FC",
                fontWeight: 950,
                textDecoration: "none",
              }}
            >
              Start free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: "54px 20px 26px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 18 }}>
          <div style={{ maxWidth: 820 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                color: "#9CA3AF",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.6,
              }}
            >
              STRUCTURED PRACTICE • MEASURABLE FEEDBACK
            </div>

            <h1 style={{ marginTop: 14, fontSize: 54, lineHeight: 1.02, fontWeight: 980 }}>
              AI Interview Practice with Structured STAR Feedback
            </h1>

            <p style={{ marginTop: 14, fontSize: 18, lineHeight: 1.5, color: "#9CA3AF" }}>
              Practice real interview questions and get instant, structured feedback on STAR clarity,
              communication, confidence, and job-description keyword alignment.
            </p>

            <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/signup" style={primaryBtn}>
                Start Free Practice
              </Link>
              <Link href="/login" style={secondaryBtn}>
                Log In
              </Link>
            </div>

            <div style={{ marginTop: 14, color: "#6B7280", fontSize: 12, lineHeight: 1.5 }}>
              Free tier includes limited practice attempts. Upgrade any time.
            </div>
          </div>

          {/* Social proof chips */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 6,
              color: "#9CA3AF",
              fontSize: 12,
            }}
          >
            {["Behavioral", "STAR scoring", "Confidence coaching", "Keyword alignment", "Progress tracking"].map(
              (x) => (
                <span
                  key={x}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  {x}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section style={{ padding: "18px 20px 34px" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
            padding: 16,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <Stat title="Instant feedback" value="< 10s" />
          <Stat title="Structured scoring" value="STAR + clarity" />
          <Stat title="Confidence coaching" value="Ownership language" />
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "10px 20px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: 30, fontWeight: 950, marginBottom: 10 }}>
            Interview preparation should be structured
          </h2>
          <p style={{ color: "#9CA3AF", maxWidth: 780, lineHeight: 1.6 }}>
            Most practice lacks objective evaluation. Interview Performance Coach gives you a repeatable
            system: practice → scoring → targeted improvements → measurable progress.
          </p>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <Card title="STAR breakdown" desc="Scores Situation, Task, Action, Result with specific advice." />
            <Card title="Communication score" desc="Clarity + structure so your answer is easy to follow." />
            <Card title="Confidence score" desc="Ownership language + assertiveness with actionable guidance." />
            <Card title="Keyword alignment" desc="Highlights JD terms you used and what you missed." />
            <Card title="Session history" desc="Review attempts, see patterns, and clean up your story." />
            <Card title="Progress over time" desc="Track improvement so you know what’s working." />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ padding: "10px 20px 44px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: 26, fontWeight: 950, marginBottom: 12 }}>How it works</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
            <Step n="01" title="Pick a question" desc="Use your own question or choose a realistic prompt." />
            <Step n="02" title="Answer (voice or text)" desc="Practice like it’s real: structured and timed." />
            <Step n="03" title="Get a game plan" desc="See what to fix next and repeat until it’s sharp." />
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" style={{ padding: "10px 20px 46px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: 26, fontWeight: 950, marginBottom: 12 }}>Pricing</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <PriceCard
              title="Free"
              price="$0"
              items={["Limited practice attempts", "STAR scoring + feedback", "Session history"]}
              ctaHref="/signup"
              ctaLabel="Start free"
              highlight={false}
            />
            <PriceCard
              title="Pro"
              price="Subscription"
              items={["Unlimited practice", "Full analytics + progress", "Best for active job seekers"]}
              ctaHref="/signup"
              ctaLabel="Upgrade to Pro"
              highlight
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "10px 20px 70px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: 26, fontWeight: 950, marginBottom: 12 }}>FAQ</h2>

          <div style={{ display: "grid", gap: 10, maxWidth: 900 }}>
            <Faq q="Will employers see my answers?" a="No. Your practice sessions are private to your account." />
            <Faq q="Can I practice for different roles?" a="Yes — paste a job description and tailor keywords automatically." />
            <Faq q="Is this for colleges too?" a="Yes — the same structured feedback is useful for career services programs." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "24px 20px",
          color: "#9CA3AF",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image src="/logo.png" alt="Interview Performance Coach" width={26} height={26} />
            <span style={{ fontWeight: 900 }}>Interview Performance Coach</span>
            <span style={{ opacity: 0.8 }}>© {new Date().getFullYear()}</span>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            <Link href="/login" style={footerLink}>
              Login
            </Link>
            <Link href="/signup" style={footerLink}>
              Sign up
            </Link>
            <Link href="/privacy" style={footerLink}>
              Privacy
            </Link>
            <Link href="/terms" style={footerLink}>
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

const navLinkStyle: React.CSSProperties = {
  color: "#9CA3AF",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 13,
};

const primaryBtn: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(34,211,238,0.35)",
  background: "rgba(34,211,238,0.14)",
  color: "#A5F3FC",
  fontWeight: 950,
  textDecoration: "none",
};

const secondaryBtn: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
  color: "#E5E7EB",
  fontWeight: 950,
  textDecoration: "none",
};

const footerLink: React.CSSProperties = {
  color: "#9CA3AF",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: 13,
};

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ fontWeight: 950, marginBottom: 8 }}>{title}</div>
      <div style={{ color: "#9CA3AF", lineHeight: 1.6, fontSize: 13 }}>{desc}</div>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ color: "#A5F3FC", fontWeight: 950, letterSpacing: 0.6 }}>{n}</div>
      <div style={{ marginTop: 6, fontWeight: 950 }}>{title}</div>
      <div style={{ marginTop: 6, color: "#9CA3AF", lineHeight: 1.6, fontSize: 13 }}>{desc}</div>
    </div>
  );
}

function Stat({ value, title }: { value: string; title: string }) {
  return (
    <div style={{ padding: 10 }}>
      <div style={{ fontSize: 22, fontWeight: 980, color: "#E5E7EB" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 800, marginTop: 4 }}>{title}</div>
    </div>
  );
}

function PriceCard({
  title,
  price,
  items,
  ctaHref,
  ctaLabel,
  highlight,
}: {
  title: string;
  price: string;
  items: string[];
  ctaHref: string;
  ctaLabel: string;
  highlight: boolean;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        border: highlight ? "1px solid rgba(34,211,238,0.35)" : "1px solid rgba(255,255,255,0.10)",
        background: highlight ? "rgba(34,211,238,0.06)" : "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 980 }}>{title}</div>
        <div style={{ color: "#A5F3FC", fontWeight: 980 }}>{price}</div>
      </div>

      <ul style={{ marginTop: 10, paddingLeft: 18, color: "#9CA3AF", lineHeight: 1.7, fontSize: 13 }}>
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>

      <div style={{ marginTop: 12 }}>
        <Link href={ctaHref} style={highlight ? primaryBtn : secondaryBtn}>
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ fontWeight: 950 }}>{q}</div>
      <div style={{ marginTop: 6, color: "#9CA3AF", lineHeight: 1.6, fontSize: 13 }}>{a}</div>
    </div>
  );
}