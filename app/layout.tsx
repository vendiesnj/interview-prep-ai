// app/layout.tsx
import type { Metadata } from "next";
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}