"use client";

import { useEffect, useState } from "react";
import InterviewActivityTracker from "@/app/components/InterviewActivityTracker";

type Stage =
  | "applied" | "phone_screen" | "technical" | "on_site"
  | "final_round" | "offer" | "rejected" | "accepted" | "declined";

type Outcome = "pending" | "rejected" | "offer_received" | "accepted" | "declined";

interface Activity {
  id: string;
  company: string;
  role: string;
  stage: Stage;
  outcome?: Outcome | null;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      padding: "16px 20px",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--card-border)",
      background: "var(--card-bg)",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color ?? "var(--text-primary)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}

export default function JobTrackerPage() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetch("/api/interview-activities")
      .then(r => r.ok ? r.json() : [])
      .then(data => setActivities(Array.isArray(data) ? data : []));
  }, []);

  const total = activities.length;

  const progressed = activities.filter(a =>
    ["phone_screen", "technical", "on_site", "final_round", "offer", "accepted", "declined"].includes(a.stage)
  ).length;

  const firstRound = activities.filter(a =>
    ["phone_screen", "technical", "on_site", "final_round", "offer", "accepted", "declined"].includes(a.stage)
  ).length;

  const offers = activities.filter(a =>
    a.stage === "offer" || a.stage === "accepted" || a.stage === "declined" ||
    a.outcome === "offer_received" || a.outcome === "accepted" || a.outcome === "declined"
  ).length;

  const accepted = activities.filter(a => a.stage === "accepted" || a.outcome === "accepted").length;
  const declined = activities.filter(a => a.stage === "declined" || a.outcome === "declined").length;

  const responseRate = total > 0 ? Math.round((progressed / total) * 100) : 0;
  const firstRoundRate = total > 0 ? Math.round((firstRound / total) * 100) : 0;
  const offerRate = total > 0 ? Math.round((offers / total) * 100) : 0;

  return (
    <div style={{ padding: "0 0 40px" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Job Tracker</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
          Track applications, monitor your funnel, and stay organized through every stage.
        </p>
      </div>

      {total > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
          <StatCard label="Applied" value={total} sub="total applications" />
          <StatCard label="Response Rate" value={`${responseRate}%`} sub="got a reply" color="#2563EB" />
          <StatCard label="First Round %" value={`${firstRoundRate}%`} sub="reached interview" color="#8B5CF6" />
          <StatCard label="Offers" value={offers} sub={`${offerRate}% offer rate`} color="#10B981" />
          <StatCard label="Accepted" value={accepted} color="#10B981" />
          <StatCard label="Declined" value={declined} color="var(--text-muted)" />
        </div>
      )}

      <InterviewActivityTracker />
    </div>
  );
}
