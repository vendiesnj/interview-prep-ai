"use client";

import { SessionProvider, useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { initPosthog, posthog } from "./lib/posthog-client";
import PostHogPageView from "./lib/PostHogPageView";

function PostHogIdentify() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user?.email) return;

      posthog.identify(session.user.email, {
      email: session.user.email,
      name: session.user.name ?? null,
    });
  }, [session]);

  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPosthog();
  }, []);

  return (
    <SessionProvider>
      <PostHogPageView />
      <PostHogIdentify />
      {children}
    </SessionProvider>
  );
}