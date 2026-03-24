"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Grid3x3, Type, Briefcase, ChevronRight } from "lucide-react";

interface GameStatus {
  played: boolean;
  streak: number;
}

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function readConnectionsStatus(today: string): GameStatus {
  try {
    const raw = localStorage.getItem("ipc_games_connections_v1");
    if (!raw) return { played: false, streak: 0 };
    const data = JSON.parse(raw);
    return { played: data.lastPlayed === today, streak: data.streak ?? 0 };
  } catch { return { played: false, streak: 0 }; }
}

function readHustleStatus(today: string): GameStatus {
  try {
    const raw = localStorage.getItem("ipc_games_hustle_v1");
    if (!raw) return { played: false, streak: 0 };
    const data = JSON.parse(raw);
    return { played: data.lastPlayed === today, streak: data.streak ?? 0 };
  } catch { return { played: false, streak: 0 }; }
}

function readCotdStatus(today: string): GameStatus {
  try {
    const raw = localStorage.getItem("ipc_games_cotd_v1");
    if (!raw) return { played: false, streak: 0 };
    const data = JSON.parse(raw);
    const viewed = Array.isArray(data.viewedDates) ? data.viewedDates : [];
    return { played: viewed.includes(today), streak: 0 };
  } catch { return { played: false, streak: 0 }; }
}

interface MiniCardProps {
  icon: React.ElementType;
  name: string;
  href: string;
  status: GameStatus;
  color: string;
  label: string;
}

function MiniCard({ icon: Icon, name, href, status, color, label }: MiniCardProps) {
  return (
    <Link href={href} style={{ textDecoration: "none", flex: 1, minWidth: 0 }}>
      <div style={{
        background: "var(--card-bg)",
        border: `1px solid ${status.played ? color + "40" : "var(--card-border)"}`,
        borderRadius: 12,
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        transition: "border-color 200ms",
        cursor: "pointer",
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: color + "15",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={16} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: status.played ? "#10B981" : "var(--text-muted)" }}>
            {status.played
              ? `✓ Done${status.streak > 1 ? ` · 🔥${status.streak}` : ""}`
              : label}
          </div>
        </div>
        {!status.played && <ChevronRight size={13} color="var(--text-muted)" />}
      </div>
    </Link>
  );
}

export default function DailyGamesWidget() {
  const today = getTodayKey();
  const [statuses, setStatuses] = useState<{
    connections: GameStatus;
    hustle: GameStatus;
    cotd: GameStatus;
  } | null>(null);

  useEffect(() => {
    setStatuses({
      connections: readConnectionsStatus(today),
      hustle: readHustleStatus(today),
      cotd: readCotdStatus(today),
    });
  }, [today]);

  if (!statuses) return null;

  const allDone = statuses.connections.played && statuses.hustle.played && statuses.cotd.played;

  return (
    <div style={{ marginTop: 16, marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.6, color: "var(--text-muted)", textTransform: "uppercase" }}>
          Daily Games
        </div>
        {allDone ? (
          <span style={{ fontSize: 11, fontWeight: 800, color: "#10B981" }}>All done today ✓</span>
        ) : (
          <Link href="/games" style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
            View all →
          </Link>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <MiniCard
          icon={Grid3x3}
          name="Connections"
          href="/games/connections"
          status={statuses.connections}
          color="#8B5CF6"
          label="Play now"
        />
        <MiniCard
          icon={Type}
          name="Hustle"
          href="/games/hustle"
          status={statuses.hustle}
          color="#10B981"
          label="Play now"
        />
        <MiniCard
          icon={Briefcase}
          name="Career of the Day"
          href="/games/career-of-the-day"
          status={statuses.cotd}
          color="#2563EB"
          label="View today's"
        />
      </div>
    </div>
  );
}
