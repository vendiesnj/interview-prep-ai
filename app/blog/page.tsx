import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "./articles";

export const metadata: Metadata = {
  title: "Blog — Interview Tips & Career Advice",
  description:
    "Practical interview prep guides from Signal HQ: STAR method mastery, communication archetypes, vocal delivery tips, and career strategy for job seekers.",
  alternates: {
    canonical: "https://signalhq.us/blog",
  },
  openGraph: {
    title: "Blog — Interview Tips & Career Advice | Signal HQ",
    description:
      "Practical guides on acing interviews, mastering the STAR method, improving communication, and advancing your career.",
    url: "https://signalhq.us/blog",
  },
};

export default function BlogIndex() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#0d1e3a",
      color: "#fff",
      fontFamily: "var(--font-inter, ui-sans-serif, system-ui, sans-serif)",
    }}>
      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(13,30,58,0.9)",
        backdropFilter: "blur(16px)",
      }}>
        <Link href="/" style={{ fontSize: 17, fontWeight: 800, color: "#fff", textDecoration: "none", letterSpacing: -0.4 }}>Signal</Link>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/login" style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>Log in</Link>
          <Link href="/signup" style={{ padding: "7px 16px", borderRadius: 8, background: "#2563EB", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 800 }}>Get started</Link>
        </div>
      </nav>

      {/* Header */}
      <header style={{ padding: "80px 24px 48px", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#93C5FD", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 16 }}>Signal Blog</div>
        <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.3, margin: "0 0 16px", color: "#F1F5F9" }}>
          Interview prep, career strategy, and communication coaching.
        </h1>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, margin: 0 }}>
          Practical guides written for people actively in the job search — not for people who like reading about job searching.
        </p>
      </header>

      {/* Articles */}
      <section aria-label="Articles" style={{ padding: "0 24px 100px", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "grid", gap: 2 }}>
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              style={{ textDecoration: "none" }}
            >
              <article style={{
                padding: "28px 0",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: article.tagColor,
                    padding: "3px 8px", borderRadius: 5,
                    background: `${article.tagColor}14`,
                    border: `1px solid ${article.tagColor}30`,
                  }}>{article.tag}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{article.date}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>·</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{article.readTime}</span>
                </div>
                <h2 style={{ fontSize: "clamp(18px, 2.5vw, 22px)", fontWeight: 700, color: "#F1F5F9", margin: "0 0 10px", lineHeight: 1.35, letterSpacing: -0.2 }}>
                  {article.title}
                </h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: 0 }}>
                  {article.description}
                </p>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "28px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: "rgba(255,255,255,0.3)" }}>Signal</div>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/privacy" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Terms</Link>
        </div>
      </footer>
    </main>
  );
}
