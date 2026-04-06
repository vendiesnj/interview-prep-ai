"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { clearStaleFallbacksIfUserChanged } from "@/app/lib/userStorage";

/**
 * Renders nothing. Runs once after the session resolves and clears unscoped
 * localStorage fallback keys if the logged-in user differs from the last
 * recorded user on this device.
 *
 * Safe guarantee: a returning user logging back into their own account will
 * never have their data cleared - the clear only fires when the active user
 * scope changes (different email/userId than last stored).
 */
export default function UserStorageGuard() {
  const { data: session, status } = useSession();
  const clearedRef = useRef(false);

  useEffect(() => {
    // Wait until session is fully resolved and run exactly once per mount
    if (status !== "authenticated" || clearedRef.current) return;
    clearedRef.current = true;
    clearStaleFallbacksIfUserChanged(session);
  }, [status, session]);

  return null;
}
