"use client";

import PremiumShell from "@/app/components/PremiumShell";
import InterviewActivityTracker from "@/app/components/InterviewActivityTracker";

export default function MyJourneyPage() {
  return (
    <PremiumShell
      title="My Journey"
      subtitle="Track your real-world interview pipeline and career progress."
    >
      <InterviewActivityTracker />
    </PremiumShell>
  );
}
