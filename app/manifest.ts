import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Signal HQ",
    short_name: "Signal",
    description:
      "AI-powered interview practice with 7-dimension scoring, delivery archetypes, and personalized coaching feedback.",
    start_url: "/",
    display: "standalone",
    background_color: "#0F172A",
    theme_color: "#2563EB",
    orientation: "portrait-primary",
    categories: ["education", "productivity", "business"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/opengraph-image",
        sizes: "1200x630",
        type: "image/png",
      },
    ],
  };
}
