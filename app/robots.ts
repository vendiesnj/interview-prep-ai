import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/practice", "/results", "/admin", "/account", "/progress"],
    },
    sitemap: "https://signalhq.us/sitemap.xml",
  };
}
