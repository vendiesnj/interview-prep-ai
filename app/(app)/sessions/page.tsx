"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PremiumCard from "../../components/PremiumCard";
import PremiumShell from "../../components/PremiumShell";
import { useSession } from "next-auth/react";
import { userScopedKey } from "@/app/lib/userStorage";


type Attempt = {
  id?: string;
  ts?: number;
  question?: string;
  inputMethod?: "spoken" | "pasted";
  score?: number;
  audioId?: string | null;
  audioPath?: string | null;

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

// --- IndexedDB helpers for audio replay ---
const AUDIO_DB = "ipc_audio_db";
const AUDIO_STORE = "audio";

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AUDIO_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) db.createObjectStore(AUDIO_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAudio(id: string): Promise<Blob | null> {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, "readonly");
    const req = tx.objectStore(AUDIO_STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPutAudio(id: string, blob: Blob): Promise<void> {
  const db = await openAudioDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, "readwrite");
    tx.objectStore(AUDIO_STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
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
const [audioUrlById, setAudioUrlById] = useState<Record<string, string>>({});
const [signedUrlByPath, setSignedUrlByPath] = useState<Record<string, string>>({});
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

async function clearHistory() {
  const ok = window.confirm(
    "Clear all session history? This will remove all saved attempts from your account."
  );
  if (!ok) return;

  // Optimistic UI
  setHistory([]);

  // Wipe local/session fallback keys
  try {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem("ipc_history");
    localStorage.removeItem(LAST_RESULT_KEY);
    localStorage.removeItem("ipc_last_result");
    localStorage.removeItem(SELECTED_KEY);
    localStorage.removeItem("ipc_selected_attempt");

    sessionStorage.removeItem(LAST_RESULT_KEY);
    sessionStorage.removeItem("ipc_last_result");
    sessionStorage.removeItem(SELECTED_KEY);
    sessionStorage.removeItem("ipc_selected_attempt");
  } catch {}

  // If logged in, clear DB too
  if (email) {
    try {
      await fetch(`/api/attempts`, { method: "DELETE" });
    } catch {}
  }
}

async function ensureSignedUrl(path: string) {
  if (signedUrlByPath[path]) return;

  const res = await fetch(`/api/audio/signed-url?path=${encodeURIComponent(path)}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok || typeof data?.signedUrl !== "string") {
    console.warn("[audio/signed-url] failed", data);
    return;
  }

  setSignedUrlByPath((prev) => ({ ...prev, [path]: data.signedUrl }));
}

async function ensureAudioUrl(audioId: string) {
  if (audioUrlById[audioId]) return;

  const blob = await idbGetAudio(audioId);
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  setAudioUrlById((prev) => ({ ...prev, [audioId]: url }));
}

  return (
  <PremiumShell
    title="Sessions"
    subtitle="View and manage your saved interview attempts."
  >
    <div style={{ maxWidth: 1100 }}>


      {/* Filter Buttons */}
      <div style={{ marginTop: 18, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {["all", "spoken", "pasted"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            style={{
  padding: "8px 14px",
  borderRadius: "var(--radius-sm)",
  border:
    filter === f
      ? "1px solid var(--accent-strong)"
      : "1px solid var(--card-border)",
  background:
    filter === f
      ? "rgba(34,211,238,0.15)"
      : "var(--card-bg-strong)",
  color: filter === f ? "var(--accent)" : "var(--text-primary)",
  fontWeight: 800,
  cursor: "pointer",
}}
          >
            {f.toUpperCase()}
          </button>
        ))}
<button
  type="button"
  onClick={clearHistory}
  disabled={history.length === 0}
  style={{
    marginLeft: "auto",
    padding: "8px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid rgba(252,165,165,0.35)",
    background: history.length === 0 ? "rgba(255,255,255,0.03)" : "rgba(252,165,165,0.10)",
    color: history.length === 0 ? "var(--text-muted)" : "#FCA5A5",
    fontWeight: 900,
    cursor: history.length === 0 ? "not-allowed" : "pointer",
  }}
>
  Clear history
</button>

      </div>

      <div style={{ marginTop: 18 }}>
        <PremiumCard>
          {filtered.length === 0 ? (
            <div style={{ color: "var(--text-muted)" }}>
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
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--card-border-soft)",
    background: "var(--card-bg)",
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
                          
                          audioId: attempt.audioId ?? null,
audioPath: attempt.audioPath ?? null,
inputMethod: attempt.inputMethod ?? "pasted",

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
    alignItems: "flex-start",
    gap: 12,
  }}
>
  <div
    style={{
      fontWeight: 900,
      color: "var(--text-primary)",
      fontSize: 15,
      lineHeight: 1.45,
      minWidth: 0,
      flex: 1,
    }}
  >
    {attempt.question?.slice(0, 80) ?? "Interview Question"}
  </div>

  <div
    style={{
      fontWeight: 900,
      color: "var(--accent)",
      fontSize: 14,
      flex: "0 0 auto",
      whiteSpace: "nowrap",
    }}
  >
    {overall !== null ? `${overall}/10` : "—"}
  </div>
</div>

<div
  style={{
    fontSize: 12,
    color: "var(--text-muted)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  }}
>
  <span>{attempt.inputMethod ?? "unknown"}</span>
  <span>•</span>
  <span>{formatDate(attempt.ts)}</span>
</div>

<div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 2,
  }}
>
  <div style={{ flex: "1 1 420px", minWidth: 240 }}>
    {attempt.inputMethod === "spoken" ? (
      attempt.audioPath ? (
        !signedUrlByPath[attempt.audioPath] ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              ensureSignedUrl(attempt.audioPath!);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--card-border)",
              background: "var(--card-bg-strong)",
              color: "var(--text-primary)",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Load recording
          </button>
        ) : (
          <audio
            controls
            preload="none"
            src={signedUrlByPath[attempt.audioPath]}
            style={{ width: "100%" }}
          />
        )
      ) : attempt.audioId ? (
        !audioUrlById[attempt.audioId] ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              ensureAudioUrl(attempt.audioId!);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--card-border)",
              background: "var(--card-bg-strong)",
              color: "var(--text-primary)",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Load recording (this device)
          </button>
        ) : (
          <audio
            controls
            preload="none"
            src={audioUrlById[attempt.audioId]}
            style={{ width: "100%" }}
          />
        )
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          No recording attached to this attempt.
        </div>
      )
    ) : (
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        No audio for pasted responses.
      </div>
    )}
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
      flex: "0 0 auto",
      whiteSpace: "nowrap",
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
    </PremiumShell>
  );
}