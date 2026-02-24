"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PremiumCard from "../../components/PremiumCard";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";


type Attempt = {
  id?: string;
  ts?: number;
  question?: string;
  inputMethod?: "spoken" | "pasted";
  score?: number;

  transcript?: string;
  wpm?: number | null;
  prosody?: {
    pitchStdHz?: number;
    energyStd?: number;
    monotoneScore?: number;
    feedback?: string;
  } | null;

  feedback?: any | null; // ✅ stop TS complaints immediately
};

function safeJSONParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function formatDate(ts?: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

export default function SessionsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const email = session?.user?.email ?? null;

  // ✅ Use the same scoped keys as Practice/Dashboard/Progress
  // (Previously this page used a different key pattern, so local history
  // and state restores could never line up.)
  const SELECTED_KEY = userScopedKey("ipc_selected_attempt", session);
  const HISTORY_KEY = userScopedKey("ipc_history", session);
  const LAST_RESULT_KEY = userScopedKey("ipc_last_result", session);


  const [history, setHistory] = useState<Attempt[]>([]);
  const [filter, setFilter] = useState<"all" | "spoken" | "pasted">("all");
useEffect(() => {
  // Wait for session to resolve (prevents flicker + wrong user key)
  if (status === "loading") return;

  let cancelled = false;

  async function load() {
    // If logged in, try DB first
    if (email) {
      try {
        // ✅ Match Dashboard/Progress behavior: avoid any stale caching.
        // Same-origin fetch includes auth cookies by default, so no need for credentials.
        const res = await fetch(`/api/attempts?limit=50&_=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
        });
        const j = await res.json().catch(() => ({}));

        if (res.ok && Array.isArray(j?.attempts)) {
          const attempts = j.attempts as Attempt[];

          // If DB is empty (local dev / DB not configured), fall back to localStorage
          // so Sessions doesn't look blank.
          if (attempts.length > 0) {
            if (!cancelled) setHistory(attempts);
            return; // ✅ don’t fall back if DB succeeds
          }
        }
      } catch {
        // fall through to localStorage
      }
    }

    // Fallback: localStorage
    try {
      const raw = localStorage.getItem(HISTORY_KEY) || localStorage.getItem("ipc_history");
      const saved = safeJSONParse<Attempt[]>(raw, []);
      if (!cancelled) setHistory(Array.isArray(saved) ? saved : []);
    } catch {
      if (!cancelled) setHistory([]);
    }
  }

  load();

  return () => {
    cancelled = true;
  };
}, [status, email, HISTORY_KEY]);
  

  const filtered = useMemo(() => {
    let data = [...history];

    // newest first
    data.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));

    if (filter === "spoken") {
      data = data.filter((a) => a.inputMethod === "spoken");
    }
    if (filter === "pasted") {
      data = data.filter((a) => a.inputMethod === "pasted");
    }

    return data;
  }, [history, filter]);

async function deleteAttempt(target: Attempt) {
  // ✅ 1) Optimistically remove from UI
  const updated = history.filter((h) => {
    if (target.id && h.id) return h.id !== target.id;
    if (typeof target.ts === "number" && typeof h.ts === "number") return h.ts !== target.ts;
    return (h.question ?? "") !== (target.question ?? "");
  });

  setHistory(updated);

  // ✅ 2) Soft-delete in DB if we have an id (DB-backed attempt)
  if (target.id) {
    try {
      await fetch(`/api/attempts/${target.id}`, { method: "DELETE" });
    } catch {}
  }

  // ✅ 3) Keep localStorage in sync (legacy + fallback)
  try {
    const key = HISTORY_KEY ?? "ipc_history";
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}
}

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ fontSize: 34, fontWeight: 950, color: "#E5E7EB" }}>
        Sessions
      </div>

      <div style={{ marginTop: 8, color: "#9CA3AF" }}>
        View and manage your saved interview attempts.
      </div>

      {/* Filter Buttons */}
      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
        {["all", "spoken", "pasted"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            style={{
              padding: "8px 14px",
              borderRadius: 12,
              border:
                filter === f
                  ? "1px solid rgba(34,211,238,0.45)"
                  : "1px solid rgba(255,255,255,0.12)",
              background:
                filter === f
                  ? "rgba(34,211,238,0.15)"
                  : "rgba(255,255,255,0.04)",
              color: filter === f ? "#A5F3FC" : "#E5E7EB",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <PremiumCard>
          {filtered.length === 0 ? (
            <div style={{ color: "#9CA3AF" }}>
              No sessions yet. Go record an attempt.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {filtered.map((attempt, i) => {
                const overall =
                  attempt.score ?? attempt.feedback?.score ?? null;

                return (
                  <div
                    key={attempt.id ?? attempt.ts ?? attempt.question ?? i}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                      display: "grid",
                      gap: 8,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                     if (status === "loading") return; 

                      try {
                        // ✅ Store a normalized shape that /results already knows how to read
                        const lastResult = {
                          ts: attempt.ts ?? Date.now(),
                          question: attempt.question ?? "",
                          transcript: attempt.transcript ?? "",
                          wpm: typeof attempt.wpm === "number" ? attempt.wpm : null,
                          prosody: attempt.prosody ?? null,
                          feedback: attempt.feedback ?? null,

                          jobDesc: (attempt as any).jobDesc ?? "",
                          questions: Array.isArray((attempt as any).questions) ? (attempt as any).questions : [],
                          questionBuckets: (attempt as any).questionBuckets ?? null,
                        };

                        const json = JSON.stringify(lastResult);

                        // Write the standard last-result key (scoped + global fallbacks)
                        sessionStorage.setItem("ipc_last_result", json);
                        localStorage.setItem("ipc_last_result", json);
                        sessionStorage.setItem(LAST_RESULT_KEY, json);
                        localStorage.setItem(LAST_RESULT_KEY, json);

                        // Also keep a "selected attempt" key (optional / future use)
                        const selJson = JSON.stringify(attempt);
                        sessionStorage.setItem("ipc_selected_attempt", selJson);
                        localStorage.setItem("ipc_selected_attempt", selJson);
                        sessionStorage.setItem(SELECTED_KEY, selJson);
                        localStorage.setItem(SELECTED_KEY, selJson);
                      } catch {}

                        router.push("/results");
                      }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 900,
                          color: "#E5E7EB",
                          fontSize: 15,
                        }}
                      >
                        {attempt.question?.slice(0, 80) ?? "Interview Question"}
                      </div>

                      <div
                        style={{
                          fontWeight: 900,
                          color: "#A5F3FC",
                          fontSize: 14,
                        }}
                      >
                        {overall !== null ? `${overall}/10` : "—"}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "#9CA3AF",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        {attempt.inputMethod ?? "unknown"} •{" "}
                        {formatDate(attempt.ts)}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAttempt(attempt);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#FCA5A5",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PremiumCard>
      </div>
    </div>
  );
}