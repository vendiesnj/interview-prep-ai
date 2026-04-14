import { Suspense } from "react";
import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Log In — Signal HQ",
  description:
    "Sign in to your Signal account to continue AI interview practice, review your dimension scores, and track your progress over time.",
  alternates: {
    canonical: "https://signalhq.us/login",
  },
  openGraph: {
    title: "Log In — Signal HQ",
    description:
      "Sign in to continue your AI interview practice and coaching.",
    url: "https://signalhq.us/login",
  },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}