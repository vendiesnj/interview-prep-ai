// app/lib/posthog-client.ts
import posthog from "posthog-js";

export function initPosthog() {

    console.log("PostHog init running", {
  key: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});
  if (typeof window === "undefined") return;

  // Respect "Do Not Track"
  const dnt =
    navigator.doNotTrack === "1" ||
    (window as any).doNotTrack === "1" ||
    (navigator as any).msDoNotTrack === "1";
  if (dnt) return;

  if ((posthog as any).__loaded) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key) return;

    posthog.init(key, {
  api_host: host || "https://us.posthog.com",
  capture_pageview: false,
  capture_pageleave: true,
  autocapture: true,
  disable_session_recording: false, // keep replay
  debug: false, // <-- ADD THIS
});
}

export { posthog };