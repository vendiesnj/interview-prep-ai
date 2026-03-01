// app/layout.tsx
import type { Metadata } from "next";
import "../app/globals.css";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Interview Performance Coach",
  description: "AI interview practice with scoring and game plans.",
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