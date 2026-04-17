"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { X, Zap } from "lucide-react";

const STORAGE_KEY = "signal_onboarding_banner_dismissed_v1";

export default function OnboardingBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    // Restore dismissed state from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) setDismissed(false);
  }, []);

  const careerStage = (session?.user as any)?.careerStage ?? null;
  const onboardingComplete = (session?.user as any)?.onboardingComplete ?? true;

  // Show banner when user completed onboarding (skipped) but hasn't set their stage
  // i.e. they hit "skip" without going through the steps
  const showBanner = onboardingComplete && !careerStage && !dismissed;

  if (!showBanner) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }

  return (
    <div
      style={{
        background: "rgba(79,70,229,0.06)",
        borderBottom: "1px solid rgba(79,70,229,0.14)",
        padding: "0 20px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          height: 44,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Zap size={14} color="#4F46E5" fill="#4F46E5" style={{ flexShrink: 0 }} />

        <span style={{ fontSize: 13, color: "#1C1917", flex: 1, fontWeight: 500 }}>
          Complete your profile to unlock personalized coaching and your Communication Level.
        </span>

        <Link
          href="/onboarding"
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#4F46E5",
            textDecoration: "none",
            whiteSpace: "nowrap",
            padding: "4px 12px",
            borderRadius: 8,
            background: "rgba(79,70,229,0.09)",
            border: "1px solid rgba(79,70,229,0.18)",
          }}
        >
          Complete setup →
        </Link>

        <button
          onClick={dismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#78716C",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
