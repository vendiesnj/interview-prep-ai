// app/layout.tsx
import type { Metadata } from "next";
import "../app/globals.css";
import { Inter } from "next/font/google";
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
        style={{
          margin: 0,
          backgroundColor: "#0B1020",
          color: "#E5E7EB",
          minHeight: "100vh",
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}