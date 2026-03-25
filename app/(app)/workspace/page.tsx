"use client";

import { useState, useEffect } from "react";
import PremiumShell from "@/app/components/PremiumShell";
import RemoteBrowser from "@/app/components/RemoteBrowser";
import {
  Monitor,
  Clock,
  Globe,
  CheckCircle2,
  Play,
} from "lucide-react";

export default function WorkspacePage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);

  // Timer
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => setSessionTime((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [sessionId]);

  async function startSession() {
    setLoading(true);
    try {
      const res = await fetch("/api/browser/session", { method: "POST" });
      const data = await res.json();
      setSessionId(data.sessionId);
      setStudentId(data.studentId);
      setSessionTime(0);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  return (
    <PremiumShell hideHeader>
      <div
        style={{ minHeight: "100vh", background: "var(--bg)", padding: "24px 32px" }}
      >
        {!sessionId ? (
          // Landing state
          <div
            style={{ maxWidth: 600, margin: "80px auto", textAlign: "center" }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 99,
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <Monitor size={32} color="#fff" />
            </div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              Signal Workspace
            </h1>
            <p
              style={{
                fontSize: 15,
                color: "var(--text-muted)",
                marginBottom: 8,
                lineHeight: 1.6,
              }}
            >
              A tracked browser session for completing career tasks — FAFSA,
              LinkedIn, Handshake, job applications, and more.
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#F59E0B",
                marginBottom: 32,
                padding: "8px 16px",
                borderRadius: 8,
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.3)",
                display: "inline-block",
              }}
            >
              All activity in this session is recorded and visible to your
              advisor.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                marginBottom: 32,
              }}
            >
              {[
                {
                  icon: Globe,
                  label: "All sites supported",
                  desc: "FAFSA, LinkedIn, Handshake, Indeed",
                },
                {
                  icon: Clock,
                  label: "Time tracked",
                  desc: "Advisors see time per site",
                },
                {
                  icon: CheckCircle2,
                  label: "Task linking",
                  desc: "Mark tasks complete mid-session",
                },
              ].map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: "1px solid var(--card-border-soft)",
                    background: "var(--card-bg)",
                    textAlign: "left",
                  }}
                >
                  <Icon
                    size={18}
                    color="var(--accent)"
                    style={{ marginBottom: 6 }}
                  />
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "var(--text-primary)",
                      marginBottom: 2,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {desc}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={startSession}
              disabled={loading}
              style={{
                padding: "14px 40px",
                borderRadius: 99,
                background: "var(--accent)",
                color: "#fff",
                fontSize: 15,
                fontWeight: 800,
                border: "none",
                cursor: loading ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Play size={16} fill="#fff" />
              {loading ? "Starting session…" : "Start Tracked Session"}
            </button>
          </div>
        ) : (
          // Active session
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 99,
                    background: "#EF4444",
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  Session Active
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    fontFamily: "monospace",
                  }}
                >
                  {formatTime(sessionTime)}
                </span>
              </div>
              <button
                onClick={() => {
                  setSessionId(null);
                  setStudentId(null);
                  setSessionTime(0);
                }}
                style={{
                  padding: "6px 16px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 700,
                  border: "1px solid #EF4444",
                  color: "#EF4444",
                  background: "rgba(239,68,68,0.08)",
                  cursor: "pointer",
                }}
              >
                End Session
              </button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <RemoteBrowser
                sessionId={sessionId}
                studentId={studentId!}
                onClose={() => {
                  setSessionId(null);
                  setStudentId(null);
                  setSessionTime(0);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </PremiumShell>
  );
}
