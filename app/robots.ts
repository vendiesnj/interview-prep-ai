import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/signup", "/login", "/blog", "/blog/", "/privacy", "/terms"],
        disallow: [
          "/api/",
          "/dashboard",
          "/dashboard/",
          "/practice",
          "/practice/",
          "/mock-interview",
          "/mock-interview/",
          "/results",
          "/results/",
          "/admin",
          "/admin/",
          "/account",
          "/account/",
          "/progress",
          "/progress/",
          "/aptitude",
          "/aptitude/",
          "/checklist",
          "/checklist/",
          "/instincts",
          "/instincts/",
          "/networking",
          "/networking/",
          "/public-speaking",
          "/public-speaking/",
          "/career",
          "/career/",
          "/resume",
          "/resume/",
          "/settings",
          "/settings/",
        ],
      },
      // Block common AI scrapers from the entire site
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        userAgent: "ChatGPT-User",
        disallow: "/",
      },
      {
        userAgent: "Google-Extended",
        disallow: "/",
      },
      {
        userAgent: "CCBot",
        disallow: "/",
      },
      {
        userAgent: "anthropic-ai",
        disallow: "/",
      },
    ],
    sitemap: "https://signalhq.us/sitemap.xml",
    host: "https://signalhq.us",
  };
}
