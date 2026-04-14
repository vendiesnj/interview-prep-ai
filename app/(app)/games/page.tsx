"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Grid3x3, Type, Briefcase, ChevronRight, Flame } from "lucide-react";
import PremiumShell from "@/app/components/PremiumShell";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GameStatus {
  played: boolean;
  score?: string;
  streak: number;
}

interface ConnectionsStorage {
  lastPlayed: string;
  streak: number;
  totalWon: number;
  totalPlayed: number;
}

interface HustleStorage {
  lastPlayed: string;
  streak: number;
  gamesWon: number;
  totalPlayed: number;
  guessDistribution: [number, number, number, number, number, number];
}

interface CotdStorage {
  viewedDates: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function readConnectionsStatus(today: string): GameStatus {
  try {
    const raw = localStorage.getItem("ipc_games_connections_v1");
    if (!raw) return { played: false, streak: 0 };
    const data: ConnectionsStorage = JSON.parse(raw);
    return {
      played: data.lastPlayed === today,
      score: data.lastPlayed === today ? `${data.totalWon}/${data.totalPlayed}` : undefined,
      streak: data.streak ?? 0,
    };
  } catch {
    return { played: false, streak: 0 };
  }
}

function readHustleStatus(today: string): GameStatus {
  try {
    const raw = localStorage.getItem("ipc_games_hustle_v1");
    if (!raw) return { played: false, streak: 0 };
    const data: HustleStorage = JSON.parse(raw);
    const dist = data.guessDistribution ?? [0, 0, 0, 0, 0, 0];
    const totalWins = dist.reduce((a: number, b: number) => a + b, 0);
    return {
      played: data.lastPlayed === today,
      score: data.lastPlayed === today ? `${totalWins}/${data.totalPlayed}` : undefined,
      streak: data.streak ?? 0,
    };
  } catch {
    return { played: false, streak: 0 };
  }
}

function readCotdStatus(today: string): GameStatus {
  try {
    const raw = localStorage.getItem("ipc_games_cotd_v1");
    if (!raw) return { played: false, streak: 0 };
    const data: CotdStorage = JSON.parse(raw);
    const viewed = Array.isArray(data.viewedDates) ? data.viewedDates : [];
    return {
      played: viewed.includes(today),
      streak: 0,
    };
  } catch {
    return { played: false, streak: 0 };
  }
}

// ── Game card ─────────────────────────────────────────────────────────────────

function GameCard({
  icon: Icon,
  name,
  description,
  href,
  status,
  color,
}: {
  icon: React.ElementType;
  name: string;
  description: string;
  href: string;
  status: GameStatus;
  color: string;
}) {
  return (
    <div style={{
      background: "var(--card-bg)",
      border: "1px solid var(--card-border)",
      borderRadius: "var(--radius-xl)",
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{
          width: 48, height: 48, borderRadius: "var(--radius-lg)",
          background: color + "15",
          border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={22} color={color} />
        </div>
        {status.streak > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, color: "#F59E0B" }}>
            <Flame size={13} />
            {status.streak}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{name}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{description}</div>
      </div>

      <div style={{ marginTop: "auto" }}>
        {status.played ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 14px", borderRadius: "var(--radius-md)",
            background: "#10B98115", border: "1px solid #10B98130",
          }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#10B981" }}>Played ✓</span>
            {status.score && (
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>{status.score}</span>
            )}
          </div>
        ) : (
          <Link href={href} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 14px", borderRadius: "var(--radius-md)",
            background: color, color: "#fff",
            textDecoration: "none", fontWeight: 800, fontSize: 13,
          }}>
            Play Now
            <ChevronRight size={15} />
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function GamesPage() {
  const today = getTodayKey();
  const [statuses, setStatuses] = useState<{
    connections: GameStatus;
    hustle: GameStatus;
    cotd: GameStatus;
  }>({
    connections: { played: false, streak: 0 },
    hustle: { played: false, streak: 0 },
    cotd: { played: false, streak: 0 },
  });

  useEffect(() => {
    setStatuses({
      connections: readConnectionsStatus(today),
      hustle: readHustleStatus(today),
      cotd: readCotdStatus(today),
    });
  }, [today]);

  const games = [
    {
      icon: Grid3x3,
      name: "Career Connections",
      description: "Group 16 career terms into 4 hidden categories. 4 mistakes allowed.",
      href: "/games/connections",
      status: statuses.connections,
      color: "#8B5CF6",
    },
    {
      icon: Type,
      name: "Hustle",
      description: "Guess the hidden 5-letter career word in 6 tries.",
      href: "/games/hustle",
      status: statuses.hustle,
      color: "#10B981",
    },
    {
      icon: Briefcase,
      name: "Career of the Day",
      description: "Explore a new career every day - salary, education, AI risk, and more.",
      href: "/games/career-of-the-day",
      status: statuses.cotd,
      color: "#2563EB",
    },
  ];

  return (
    <PremiumShell hideHeader>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>
            Daily Games
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: -0.5 }}>
            Play Today&apos;s Games
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.6 }}>
            Three daily career-themed games. New puzzles every day.
          </p>
        </div>

        {/* Game cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 40,
        }}>
          {games.map((game) => (
            <GameCard key={game.href} {...game} />
          ))}
        </div>

        {/* How to play */}
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "var(--radius-xl)",
          padding: "22px 24px",
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
            How to Play
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "#8B5CF615", border: "1px solid #8B5CF630", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Grid3x3 size={16} color="#8B5CF6" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>Career Connections</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  16 career terms are hidden in 4 groups of 4. Select 4 tiles and submit - if they all belong to the same category, you&apos;ve found a group! 4 mistakes allowed. Categories get trickier: Yellow → Green → Blue → Purple.
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--card-border-soft)" }} />

            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "#10B98115", border: "1px solid #10B98130", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Type size={16} color="#10B981" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>Hustle</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Guess the 5-letter career word in 6 tries. After each guess: green = right letter, right spot; yellow = right letter, wrong spot; gray = letter not in word.
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--card-border-soft)" }} />

            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "#2563EB15", border: "1px solid #2563EB30", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Briefcase size={16} color="#2563EB" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>Career of the Day</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  A new career is featured every day. Explore salary ranges, education requirements, AI automation risk, side hustles, and whether it might be a great fit for you based on your personality type.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PremiumShell>
  );
}
