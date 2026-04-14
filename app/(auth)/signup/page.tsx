import type { Metadata } from "next";
import SignupClient from "./SignupClient";

export const metadata: Metadata = {
  title: "Sign Up — Free AI Interview Practice",
  description:
    "Create your free Signal account. Practice interviews with AI feedback, get scored across 7 communication dimensions, and identify your delivery archetype in minutes.",
  alternates: {
    canonical: "https://signalhq.us/signup",
  },
  openGraph: {
    title: "Sign Up — Free AI Interview Practice | Signal HQ",
    description:
      "Start practicing interviews for free. AI-powered scoring, communication analysis, and personalized coaching feedback.",
    url: "https://signalhq.us/signup",
  },
};

export default function SignupPage() {
  return <SignupClient />;
}
