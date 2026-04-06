export function userScopedKey(baseKey: string, session: any) {
  const userId = session?.user?.id;
  const email = session?.user?.email;
  const scope = (userId || email || "anon").toString();
  return `${baseKey}::${scope}`;
}

// ─── Unscoped fallback keys that can bleed across users ──────────────────────
// These are the legacy / fallback keys that pages read when the scoped key is
// absent. They must be cleared when a DIFFERENT user logs in so that stale
// data from a prior session never shows up on a new account.
const UNSCOPED_FALLBACK_KEYS = [
  "ipc_history",
  "ipc_last_result",
  "ipc_selected_attempt",
  "ipc_home_state",
  "ipc_question_bank",
  "ipc_focus_goal",
  "ipc_esl_mode",
];

const ACTIVE_USER_KEY = "ipc_active_user";

/**
 * Call this once per session after the NextAuth session resolves.
 *
 * Safe contract:
 *  - Same user returning → does NOTHING. Their scoped + unscoped data is untouched.
 *  - Different user (or first login on this device) → clears only the unscoped
 *    fallback keys listed above, then writes the new active user.
 *
 * The scoped keys (e.g. "ipc_history::user@example.com") are never touched
 * because they already contain the user's email/id in the key name and cannot
 * be confused with another user's data.
 */
export function clearStaleFallbacksIfUserChanged(session: any): void {
  if (typeof window === "undefined") return;

  const userId = session?.user?.id;
  const email  = session?.user?.email;
  if (!userId && !email) return; // no resolved session yet - do nothing

  const currentScope = (userId || email).toString();

  try {
    const lastScope = localStorage.getItem(ACTIVE_USER_KEY);

    if (lastScope === currentScope) {
      // ✅ Same user - nothing to do
      return;
    }

    // Different user (or first login on this device) - clear unscoped fallbacks only
    for (const key of UNSCOPED_FALLBACK_KEYS) {
      localStorage.removeItem(key);
    }

    // Record the current user so returning logins skip the clear
    localStorage.setItem(ACTIVE_USER_KEY, currentScope);
  } catch {
    // localStorage unavailable (private browsing, storage full, etc.) - silent fail
  }
}
