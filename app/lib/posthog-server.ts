// app/lib/posthog-server.ts
import { PostHog } from "posthog-node";

export function makePosthogServer() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  // IMPORTANT:
  // PostHog "host" for capturing events should be the ingestion/API host, not the dashboard URL.
  // If you are on US cloud, this is typically https://us.i.posthog.com
  const host =
    process.env.POSTHOG_HOST ||
    process.env.NEXT_PUBLIC_POSTHOG_HOST ||
    "https://us.i.posthog.com";

  if (!key) return null;

  return new PostHog(key, { host });
}