// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import "../app/globals.css";
import { Inter } from "next/font/google";
import { activeTheme } from "@/app/lib/theme";
import type { ReactNode } from "react";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AI Interview Practice Tool | STAR Feedback & Mock Interview Coaching",
  description:
    "Practice interviews with AI-powered feedback. Get STAR breakdown scoring, communication analysis, and personalized improvement tips to ace your next interview.",
  metadataBase: new URL("https://interviewperformancecoach.com"),
  openGraph: {
    title: "AI Interview Practice Tool | Interview Performance Coach",
    description:
      "AI-powered mock interview practice with STAR scoring, communication analysis, and personalized feedback.",
    url: "https://interviewperformancecoach.com",
    siteName: "Interview Performance Coach",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
            <body
        suppressHydrationWarning
        className={inter.className}
        style={
          {
            margin: 0,
            minHeight: "100vh",
            backgroundColor: activeTheme.colors.pageBg,
            color: activeTheme.colors.text,

            "--app-bg": activeTheme.colors.pageBg,
            "--app-bg-accent-a": activeTheme.colors.pageBgAccentA,
            "--app-bg-accent-b": activeTheme.colors.pageBgAccentB,

            "--text-primary": activeTheme.colors.text,
            "--text-muted": activeTheme.colors.textMuted,
            "--text-soft": activeTheme.colors.textSoft,

            "--card-bg": activeTheme.colors.cardBg,
            "--card-bg-strong": activeTheme.colors.cardBgStrong,
            "--card-border": activeTheme.colors.cardBorder,
            "--card-border-soft": activeTheme.colors.cardBorderSoft,

            "--input-bg": activeTheme.colors.inputBg,
            "--input-border": activeTheme.colors.inputBorder,

            "--accent": activeTheme.colors.accent,
            "--accent-soft": activeTheme.colors.accentSoft,
            "--accent-strong": activeTheme.colors.accentStrong,

            "--accent-2": activeTheme.colors.accent2,
            "--accent-2-soft": activeTheme.colors.accent2Soft,

            "--danger": activeTheme.colors.danger,
            "--danger-soft": activeTheme.colors.dangerSoft,

            "--success": activeTheme.colors.success,
            "--success-soft": activeTheme.colors.successSoft,

            "--radius-xs": `${activeTheme.radii.xs}px`,
            "--radius-sm": `${activeTheme.radii.sm}px`,
            "--radius-md": `${activeTheme.radii.md}px`,
            "--radius-lg": `${activeTheme.radii.lg}px`,
            "--radius-xl": `${activeTheme.radii.xl}px`,

            "--shadow-card": activeTheme.shadows.card,
            "--shadow-card-soft": activeTheme.shadows.cardSoft,
            "--shadow-glow": activeTheme.shadows.glow,
            "--shadow-none": activeTheme.shadows.none,
          } as React.CSSProperties
        }
           >
        <Script id="tenant-theme-preload" strategy="beforeInteractive">
          {`
            (function () {
              try {
                var raw = localStorage.getItem("ipc_tenant_theme_v1");
                if (!raw) return;

                var parsed = JSON.parse(raw);
                var colors = parsed.colors || {};
                var radii = parsed.radii || {};
                var shadows = parsed.shadows || {};
                var root = document.body;

                if (!root) return;

                if (colors.pageBg) root.style.backgroundColor = colors.pageBg;
                if (colors.text) root.style.color = colors.text;

                if (colors.pageBg) root.style.setProperty("--app-bg", colors.pageBg);
                if (colors.pageBgAccentA) root.style.setProperty("--app-bg-accent-a", colors.pageBgAccentA);
                if (colors.pageBgAccentB) root.style.setProperty("--app-bg-accent-b", colors.pageBgAccentB);

                if (colors.text) root.style.setProperty("--text-primary", colors.text);
                if (colors.textMuted) root.style.setProperty("--text-muted", colors.textMuted);
                if (colors.textSoft) root.style.setProperty("--text-soft", colors.textSoft);

                if (colors.cardBg) root.style.setProperty("--card-bg", colors.cardBg);
                if (colors.cardBgStrong) root.style.setProperty("--card-bg-strong", colors.cardBgStrong);
                if (colors.cardBorder) root.style.setProperty("--card-border", colors.cardBorder);
                if (colors.cardBorderSoft) root.style.setProperty("--card-border-soft", colors.cardBorderSoft);

                if (colors.inputBg) root.style.setProperty("--input-bg", colors.inputBg);
                if (colors.inputBorder) root.style.setProperty("--input-border", colors.inputBorder);

                if (colors.accent) root.style.setProperty("--accent", colors.accent);
                if (colors.accentSoft) root.style.setProperty("--accent-soft", colors.accentSoft);
                if (colors.accentStrong) root.style.setProperty("--accent-strong", colors.accentStrong);

                if (colors.accent2) root.style.setProperty("--accent-2", colors.accent2);
                if (colors.accent2Soft) root.style.setProperty("--accent-2-soft", colors.accent2Soft);

                if (colors.danger) root.style.setProperty("--danger", colors.danger);
                if (colors.dangerSoft) root.style.setProperty("--danger-soft", colors.dangerSoft);

                if (colors.success) root.style.setProperty("--success", colors.success);
                if (colors.successSoft) root.style.setProperty("--success-soft", colors.successSoft);

                if (typeof radii.xs === "number") root.style.setProperty("--radius-xs", radii.xs + "px");
                if (typeof radii.sm === "number") root.style.setProperty("--radius-sm", radii.sm + "px");
                if (typeof radii.md === "number") root.style.setProperty("--radius-md", radii.md + "px");
                if (typeof radii.lg === "number") root.style.setProperty("--radius-lg", radii.lg + "px");
                if (typeof radii.xl === "number") root.style.setProperty("--radius-xl", radii.xl + "px");

                if (shadows.card) root.style.setProperty("--shadow-card", shadows.card);
                if (shadows.cardSoft) root.style.setProperty("--shadow-card-soft", shadows.cardSoft);
                if (shadows.glow) root.style.setProperty("--shadow-glow", shadows.glow);
                if (shadows.none) root.style.setProperty("--shadow-none", shadows.none);
              } catch (e) {}
            })();
          `}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}