import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: `https://signalhq.us/blog/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `https://signalhq.us/blog/${article.slug}`,
      type: "article",
      publishedTime: article.date,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    author: {
      "@type": "Organization",
      name: "Signal HQ",
      url: "https://signalhq.us",
    },
    publisher: {
      "@type": "Organization",
      name: "Signal HQ",
      logo: {
        "@type": "ImageObject",
        url: "https://signalhq.us/opengraph-image",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://signalhq.us/blog/${article.slug}`,
    },
  };

  // Convert markdown-style content to paragraphs
  const paragraphs = article.content
    .trim()
    .split("\n\n")
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--app-bg, #0d1e3a)",
      color: "var(--text-primary, #fff)",
      fontFamily: "var(--font-inter, ui-sans-serif, system-ui, sans-serif)",
    }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px",
        borderBottom: "1px solid var(--card-border)",
        background: "rgba(13,30,58,0.9)",
        backdropFilter: "blur(16px)",
      }}>
        <Link href="/" style={{ fontSize: 17, fontWeight: 800, color: "#fff", textDecoration: "none", letterSpacing: -0.4 }}>Signal</Link>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/login" style={{ padding: "7px 16px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>Log in</Link>
          <Link href="/signup" style={{ padding: "7px 16px", borderRadius: "var(--radius-sm)", background: "#2563EB", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 800 }}>Get started</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 100px" }}>

        {/* Back */}
        <Link href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none", marginBottom: 40 }}>
          ← All articles
        </Link>

        {/* Header */}
        <header style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
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
          <h1 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.3, margin: "0 0 20px", color: "#F1F5F9" }}>
            {article.title}
          </h1>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, margin: 0 }}>
            {article.description}
          </p>
        </header>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.07)", marginBottom: 48 }} />

        {/* Body */}
        <article style={{ fontSize: 17, lineHeight: 1.8, color: "rgba(255,255,255,0.75)" }}>
          {paragraphs.map((block, i) => {
            if (block.startsWith("## ")) {
              return (
                <h2 key={i} style={{ fontSize: "clamp(20px, 2.5vw, 24px)", fontWeight: 700, color: "#F1F5F9", margin: "48px 0 16px", lineHeight: 1.3, letterSpacing: -0.2 }}>
                  {block.replace("## ", "")}
                </h2>
              );
            }
            if (block.startsWith("### ")) {
              return (
                <h3 key={i} style={{ fontSize: 18, fontWeight: 700, color: "#E2E8F0", margin: "32px 0 12px", lineHeight: 1.35 }}>
                  {block.replace("### ", "")}
                </h3>
              );
            }
            if (block.startsWith("---")) {
              return <hr key={i} style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", margin: "32px 0" }} />;
            }
            if (block.startsWith("- ") || block.startsWith("**")) {
              // Render as formatted paragraph
              const formatted = block
                .replace(/\*\*([^*]+)\*\*/g, "<strong style=\"color:#F1F5F9\">$1</strong>")
                .replace(/\*([^*]+)\*/g, "<em>$1</em>");
              return (
                <p key={i} style={{ margin: "0 0 20px" }} dangerouslySetInnerHTML={{ __html: formatted }} />
              );
            }
            // Inline bold
            const formatted = block.replace(/\*\*([^*]+)\*\*/g, "<strong style=\"color:#F1F5F9\">$1</strong>");
            return (
              <p key={i} style={{ margin: "0 0 20px" }} dangerouslySetInnerHTML={{ __html: formatted }} />
            );
          })}
        </article>

        {/* CTA */}
        <div style={{
          marginTop: 64,
          padding: "32px",
          borderRadius: "var(--radius-xl)",
          border: "1px solid rgba(37,99,235,0.25)",
          background: "rgba(37,99,235,0.06)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9", marginBottom: 10, letterSpacing: -0.2 }}>
            Practice what you just read.
          </div>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", margin: "0 0 24px", lineHeight: 1.65 }}>
            Signal scores your answers across seven dimensions and tells you exactly what to fix.
            Three sessions free.
          </p>
          <Link href="/signup" style={{
            display: "inline-block",
            padding: "13px 32px", borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, #2563EB, #0EA5E9)",
            color: "#fff", textDecoration: "none",
            fontWeight: 700, fontSize: 15,
            boxShadow: "0 4px 24px rgba(37,99,235,0.35)",
          }}>
            Start for free →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "28px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>Signal</div>
        <div style={{ display: "flex", gap: 20 }}>
          <Link href="/privacy" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Terms</Link>
        </div>
      </footer>
    </div>
  );
}
