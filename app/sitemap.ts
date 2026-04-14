import { MetadataRoute } from "next";
import { articles } from "./blog/articles";

const BASE = "https://signalhq.us";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // ── Core marketing pages ───────────────────────────────────────────────────
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    // ── Auth pages ─────────────────────────────────────────────────────────────
    {
      url: `${BASE}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    // ── Blog ───────────────────────────────────────────────────────────────────
    {
      url: `${BASE}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...articles.map((a) => ({
      url: `${BASE}/blog/${a.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    // ── Legal pages ────────────────────────────────────────────────────────────
    {
      url: `${BASE}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
