"use client";

import { useEffect, useState, useCallback } from "react";
import PremiumShell from "@/app/components/PremiumShell";

// ── Seeded RNG ────────────────────────────────────────────────────────────────

function seededRng(seed: string): () => number {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xFFFFFFFF; };
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  const rng = seededRng(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function simpleHash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type GroupColor = "yellow" | "green" | "blue" | "purple";

interface ConnectionsGroup {
  category: string;
  color: GroupColor;
  items: [string, string, string, string];
}

interface ConnectionsPuzzle {
  groups: [ConnectionsGroup, ConnectionsGroup, ConnectionsGroup, ConnectionsGroup];
}

type GameState = "playing" | "won" | "lost";

interface ConnectionsStorage {
  lastPlayed: string;
  streak: number;
  bestStreak: number;
  totalPlayed: number;
  totalWon: number;
  history: Array<{ date: string; won: boolean; mistakes: number; guesses: string[][] }>;
}

// ── Color map ─────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<GroupColor, string> = {
  yellow: "#F59E0B",
  green: "#10B981",
  blue: "#2563EB",
  purple: "#8B5CF6",
};

const COLOR_ORDER: GroupColor[] = ["yellow", "green", "blue", "purple"];

// ── Puzzle bank (20 puzzles) ──────────────────────────────────────────────────

const PUZZLES: ConnectionsPuzzle[] = [
  // Puzzle 1
  {
    groups: [
      { color: "yellow", category: "Things in a job offer", items: ["SALARY", "TITLE", "START DATE", "BENEFITS"] },
      { color: "green",  category: "Ways to leave a job",   items: ["RESIGN", "RETIRE", "QUIT", "GET LAID OFF"] },
      { color: "blue",   category: "Interview red flags",   items: ["VAGUE SALARY", "NO CULTURE FIT", "HIGH TURNOVER", "BOSS DODGES QS"] },
      { color: "purple", category: "___ letter",            items: ["COVER", "OFFER", "REFERENCE", "RESIGNATION"] },
    ],
  },
  // Puzzle 2
  {
    groups: [
      { color: "yellow", category: "Parts of a paycheck",       items: ["GROSS PAY", "NET PAY", "WITHHOLDING", "DEDUCTIONS"] },
      { color: "green",  category: "Retirement account types",  items: ["401K", "ROTH IRA", "PENSION", "403B"] },
      { color: "blue",   category: "NACE competencies",         items: ["TEAMWORK", "PROFESSIONALISM", "CAREER MGMT", "LEADERSHIP"] },
      { color: "purple", category: "Things that compound",      items: ["INTEREST", "EXPERIENCE", "NETWORK", "SKILLS"] },
    ],
  },
  // Puzzle 3
  {
    groups: [
      { color: "yellow", category: "Job search platforms",       items: ["LINKEDIN", "INDEED", "GLASSDOOR", "HANDSHAKE"] },
      { color: "green",  category: "Salary negotiation tactics", items: ["COUNTER OFFER", "ANCHOR HIGH", "SILENCE", "MARKET RESEARCH"] },
      { color: "blue",   category: "Types of interviews",        items: ["BEHAVIORAL", "TECHNICAL", "CASE", "PANEL"] },
      { color: "purple", category: "All can follow 'NET'",       items: ["WORK", "PAY", "WORTH", "FLIX"] },
    ],
  },
  // Puzzle 4
  {
    groups: [
      { color: "yellow", category: "Work schedule types",        items: ["FULL-TIME", "PART-TIME", "CONTRACT", "FREELANCE"] },
      { color: "green",  category: "Performance review terms",   items: ["OKR", "KPI", "FEEDBACK", "360 REVIEW"] },
      { color: "blue",   category: "Types of workplace culture", items: ["FLAT HIERARCHY", "REMOTE FIRST", "SILO CULTURE", "AGILE TEAM"] },
      { color: "purple", category: "On a resume, these are ___", items: ["BULLETS", "SKILLS", "REFERENCES", "GAPS"] },
    ],
  },
  // Puzzle 5
  {
    groups: [
      { color: "yellow", category: "LinkedIn profile sections",  items: ["HEADLINE", "SUMMARY", "EXPERIENCE", "ENDORSEMENTS"] },
      { color: "green",  category: "Ways to find a job",         items: ["NETWORKING", "JOB BOARDS", "COLD EMAIL", "REFERRAL"] },
      { color: "blue",   category: "Stock compensation types",   items: ["RSU", "ESPP", "ISO", "NSO"] },
      { color: "purple", category: "Can precede 'CAP'",          items: ["MARKET", "SALARY", "STOCK", "GAP"] },
    ],
  },
  // Puzzle 6
  {
    groups: [
      { color: "yellow", category: "Soft skills employers want", items: ["ADAPTABILITY", "EMPATHY", "INITIATIVE", "WORK ETHIC"] },
      { color: "green",  category: "Tax forms",                  items: ["W-2", "1099", "W-4", "1040"] },
      { color: "blue",   category: "Startup funding rounds",     items: ["SEED", "SERIES A", "SERIES B", "SERIES C"] },
      { color: "purple", category: "All follow 'COLD'",          items: ["CALL", "EMAIL", "SHOULDER", "CASE"] },
    ],
  },
  // Puzzle 7
  {
    groups: [
      { color: "yellow", category: "Resume action verbs",        items: ["SPEARHEADED", "LAUNCHED", "STREAMLINED", "CULTIVATED"] },
      { color: "green",  category: "Healthcare job types",       items: ["RN", "NP", "PA", "MD"] },
      { color: "blue",   category: "Remote work challenges",     items: ["ISOLATION", "TIMEZONE GAP", "SCREEN FATIGUE", "DISTRACTIONS"] },
      { color: "purple", category: "___ balance",                items: ["WORK-LIFE", "PORTFOLIO", "POWER", "ACCOUNT"] },
    ],
  },
  // Puzzle 8
  {
    groups: [
      { color: "yellow", category: "Things in a business plan",  items: ["MISSION", "REVENUE MODEL", "MARKET SIZE", "COMPETITORS"] },
      { color: "green",  category: "Trade career types",         items: ["ELECTRICIAN", "PLUMBER", "WELDER", "HVAC TECH"] },
      { color: "blue",   category: "Investment types",           items: ["INDEX FUND", "ETF", "MUTUAL FUND", "BOND"] },
      { color: "purple", category: "Can follow 'NET'",           items: ["WORK", "FLIX", "WORTH", "BALL"] },
    ],
  },
  // Puzzle 9
  {
    groups: [
      { color: "yellow", category: "Professional certifications",items: ["PMP", "CPA", "CFP", "MBA"] },
      { color: "green",  category: "Interview question types",   items: ["STAR METHOD", "TELL ME ABOUT", "SITUATIONAL", "COMPETENCY"] },
      { color: "blue",   category: "Workplace conflict styles",  items: ["AVOIDANCE", "COLLABORATION", "COMPROMISE", "ACCOMMODATION"] },
      { color: "purple", category: "Kinds of ___ equity",       items: ["HOME", "BRAND", "SWEAT", "PRIVATE"] },
    ],
  },
  // Puzzle 10
  {
    groups: [
      { color: "yellow", category: "Types of bonuses",           items: ["SIGNING BONUS", "PERFORMANCE", "SPOT BONUS", "REFERRAL"] },
      { color: "green",  category: "Tech job titles",            items: ["SCRUM MASTER", "PRODUCT MGR", "DATA ANALYST", "DEV OPS"] },
      { color: "blue",   category: "Financial ratios",           items: ["P/E RATIO", "ROI", "EBITDA", "DEBT-TO-INCOME"] },
      { color: "purple", category: "___ capital",                items: ["VENTURE", "HUMAN", "WORKING", "SOCIAL"] },
    ],
  },
  // Puzzle 11
  {
    groups: [
      { color: "yellow", category: "Entry-level job tips",       items: ["SHOW UP EARLY", "TAKE NOTES", "ASK QUESTIONS", "UNDER-PROMISE"] },
      { color: "green",  category: "Credit score factors",       items: ["PAYMENT HISTORY", "UTILIZATION", "ACCOUNT AGE", "HARD INQUIRIES"] },
      { color: "blue",   category: "Office politics behaviors",  items: ["BACK STABBING", "CREDIT STEALING", "GATEKEEPING", "FAVORITISM"] },
      { color: "purple", category: "All follow 'CAREER'",        items: ["PATH", "CHANGE", "FAIR", "COACH"] },
    ],
  },
  // Puzzle 12
  {
    groups: [
      { color: "yellow", category: "Parts of an email signature",items: ["NAME", "TITLE", "PHONE", "LINKEDIN URL"] },
      { color: "green",  category: "Gig economy platforms",      items: ["UPWORK", "FIVERR", "TASKRABBIT", "DOORDASH"] },
      { color: "blue",   category: "MBA program types",          items: ["FULL-TIME", "EXECUTIVE", "ONLINE", "PART-TIME"] },
      { color: "purple", category: "Can precede 'MARKET'",       items: ["STOCK", "JOB", "BULL", "BLACK"] },
    ],
  },
  // Puzzle 13
  {
    groups: [
      { color: "yellow", category: "Things on a business card",  items: ["NAME", "EMAIL", "LOGO", "PHONE"] },
      { color: "green",  category: "Leadership styles",          items: ["SERVANT", "TRANSFORMATIONAL", "AUTOCRATIC", "DEMOCRATIC"] },
      { color: "blue",   category: "Finance industry roles",     items: ["ANALYST", "ASSOCIATE", "VP", "MANAGING DIR"] },
      { color: "purple", category: "Types of ___ management",    items: ["RISK", "TIME", "TALENT", "WEALTH"] },
    ],
  },
  // Puzzle 14
  {
    groups: [
      { color: "yellow", category: "Things in a 401k",           items: ["CONTRIBUTION", "VESTING", "MATCH", "ALLOCATION"] },
      { color: "green",  category: "Networking event types",     items: ["INDUSTRY MIXER", "CAREER FAIR", "ALUMNI EVENT", "CONFERENCE"] },
      { color: "blue",   category: "AI-proof skill areas",       items: ["EMPATHY", "CREATIVITY", "LEADERSHIP", "COMPLEX JUDGMENT"] },
      { color: "purple", category: "___ fund",                   items: ["HEDGE", "INDEX", "EMERGENCY", "RAINY DAY"] },
    ],
  },
  // Puzzle 15
  {
    groups: [
      { color: "yellow", category: "Work arrangement types",     items: ["HYBRID", "IN-OFFICE", "REMOTE", "ASYNC"] },
      { color: "green",  category: "Student loan terms",         items: ["DEFERMENT", "FORBEARANCE", "INCOME-DRIVEN", "FORGIVENESS"] },
      { color: "blue",   category: "Startup roles",              items: ["FOUNDER", "CTO", "GROWTH HACKER", "ANGEL INVESTOR"] },
      { color: "purple", category: "All follow 'JOB'",           items: ["SHADOW", "BOARD", "OFFER", "TITLE"] },
    ],
  },
  // Puzzle 16
  {
    groups: [
      { color: "yellow", category: "Annual salary milestones",   items: ["$50K", "$75K", "$100K", "$200K"] },
      { color: "green",  category: "Ways to advance faster",     items: ["MENTOR", "SIDE PROJECT", "CERTIFY", "SPEAK UP"] },
      { color: "blue",   category: "Labor law protections",      items: ["FMLA", "ADA", "TITLE VII", "OSHA"] },
      { color: "purple", category: "___ review",                 items: ["PERFORMANCE", "PEER", "ANNUAL", "ANNUAL"] },
    ],
  },
  // Puzzle 17 - fix duplicate
  {
    groups: [
      { color: "yellow", category: "Annual salary milestones",   items: ["FIFTY K", "SEVENTY FIVE K", "SIX FIGURES", "COMP PACKAGE"] },
      { color: "green",  category: "Ways to advance faster",     items: ["MENTOR", "SIDE PROJECT", "CERTIFY", "SPEAK UP"] },
      { color: "blue",   category: "Labor law protections",      items: ["FMLA", "ADA", "TITLE VII", "OSHA"] },
      { color: "purple", category: "___ review",                 items: ["PERFORMANCE", "PEER", "ANNUAL", "CODE"] },
    ],
  },
  // Puzzle 18
  {
    groups: [
      { color: "yellow", category: "Common job benefits",        items: ["HEALTH INS", "PTO", "DENTAL", "VISION"] },
      { color: "green",  category: "Workplace diversity terms",  items: ["DEI", "ERG", "BELONGING", "EQUITY"] },
      { color: "blue",   category: "Sales funnel stages",        items: ["AWARENESS", "INTEREST", "DECISION", "ACTION"] },
      { color: "purple", category: "Can follow 'BRAND'",         items: ["NAME", "AMBASSADOR", "EQUITY", "STORY"] },
    ],
  },
  // Puzzle 19
  {
    groups: [
      { color: "yellow", category: "First day of work tips",     items: ["ARRIVE EARLY", "BRING NOTEBOOK", "LEARN NAMES", "DRESS UP"] },
      { color: "green",  category: "Emergency fund milestones",  items: ["$500", "1 MONTH", "3 MONTHS", "6 MONTHS"] },
      { color: "blue",   category: "Federal withholding items",  items: ["FICA", "MEDICARE", "SOCIAL SEC", "FED INCOME TAX"] },
      { color: "purple", category: "___ path",                   items: ["CAREER", "GROWTH", "CRITICAL", "LEARNING"] },
    ],
  },
  // Puzzle 20
  {
    groups: [
      { color: "yellow", category: "Common salary red flags",    items: ["UNPAID TRIAL", "EQUITY ONLY", "VAGUE RANGE", "BAIT & SWITCH"] },
      { color: "green",  category: "Types of mentors",           items: ["INDUSTRY", "PEER", "REVERSE", "SPONSOR"] },
      { color: "blue",   category: "Kinds of professional dev",  items: ["CONFERENCE", "ONLINE COURSE", "WORKSHOP", "SHADOWING"] },
      { color: "purple", category: "Types of ___ culture",       items: ["STARTUP", "HUSTLE", "WORK-LIFE", "CORPORATE"] },
    ],
  },
];

// ── Game logic ─────────────────────────────────────────────────────────────────

function getTodayPuzzle(): ConnectionsPuzzle {
  const dateKey = new Date().toISOString().split("T")[0];
  const idx = simpleHash(dateKey) % PUZZLES.length;
  return PUZZLES[idx];
}

function loadStorage(): ConnectionsStorage {
  try {
    const raw = localStorage.getItem("ipc_games_connections_v1");
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return { lastPlayed: "", streak: 0, bestStreak: 0, totalPlayed: 0, totalWon: 0, history: [] };
}

function saveStorage(data: ConnectionsStorage) {
  try {
    localStorage.setItem("ipc_games_connections_v1", JSON.stringify(data));
  } catch { /* empty */ }
}

function getEmojiGrid(guesses: string[][], groups: ConnectionsGroup[]): string {
  return guesses.map(guess => {
    const group = groups.find(g => guess.every(item => g.items.includes(item)));
    const emoji = group ? { yellow: "🟨", green: "🟩", blue: "🟦", purple: "🟪" }[group.color] : "⬛";
    return emoji.repeat(4);
  }).join("\n");
}

// ── Tile shuffle helper ───────────────────────────────────────────────────────

function shuffleRemaining(tiles: string[], found: ConnectionsGroup[], shuffleSeed: string): string[] {
  const foundItems = new Set(found.flatMap(g => g.items));
  const remaining = tiles.filter(t => !foundItems.has(t));
  const shuffled = seededShuffle(remaining, shuffleSeed);
  return shuffled;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConnectionsPage() {
  const puzzle = getTodayPuzzle();
  const dateKey = new Date().toISOString().split("T")[0];

  // All items (shuffled for display)
  const allItems = seededShuffle(
    puzzle.groups.flatMap(g => [...g.items]),
    dateKey
  );

  const [tiles, setTiles] = useState<string[]>(allItems);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [found, setFound] = useState<ConnectionsGroup[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [guessHistory, setGuessHistory] = useState<string[][]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [shakeTiles, setShakeTiles] = useState<string[]>([]);
  const [shuffleSeed, setShuffleSeed] = useState(dateKey + "_init");
  const [stats, setStats] = useState<ConnectionsStorage | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);

  // Load storage on mount and check if already played today
  useEffect(() => {
    const s = loadStorage();
    setStats(s);
    if (s.lastPlayed === dateKey) {
      setAlreadyPlayed(true);
    }
  }, [dateKey]);

  const showToast = useCallback((msg: string, duration = 1800) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }, []);

  function toggleTile(item: string) {
    if (gameState !== "playing") return;
    if (found.some(g => g.items.includes(item))) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else if (next.size < 4) {
        next.add(item);
      }
      return next;
    });
  }

  function handleSubmit() {
    if (selected.size !== 4 || gameState !== "playing") return;
    const guess = Array.from(selected);

    // Check for matching group
    const matchGroup = puzzle.groups.find(g =>
      g.items.every(item => selected.has(item))
    );

    setGuessHistory(prev => [...prev, guess]);

    if (matchGroup) {
      const newFound = [...found, matchGroup];
      setFound(newFound);
      setSelected(new Set());

      if (newFound.length === 4) {
        // Won
        setGameState("won");
        const s = loadStorage();
        const newStreak = s.lastPlayed === getPreviousDay(dateKey) ? s.streak + 1 : 1;
        const updated: ConnectionsStorage = {
          ...s,
          lastPlayed: dateKey,
          streak: newStreak,
          bestStreak: Math.max(s.bestStreak, newStreak),
          totalPlayed: s.totalPlayed + 1,
          totalWon: s.totalWon + 1,
          history: [...s.history, { date: dateKey, won: true, mistakes, guesses: [...guessHistory, guess] }],
        };
        saveStorage(updated);
        setStats(updated);
      } else {
        showToast("Found " + matchGroup.category + "! 🎉");
      }
    } else {
      // Wrong - check "one away"
      const oneAway = puzzle.groups.some(g => {
        const overlap = g.items.filter(item => selected.has(item)).length;
        return overlap === 3;
      });

      if (oneAway) showToast("One away! 🔥", 1500);

      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setShakeTiles(guess);
      setTimeout(() => setShakeTiles([]), 600);

      if (newMistakes >= 4) {
        setGameState("lost");
        const s = loadStorage();
        const updated: ConnectionsStorage = {
          ...s,
          lastPlayed: dateKey,
          streak: 0,
          bestStreak: s.bestStreak,
          totalPlayed: s.totalPlayed + 1,
          totalWon: s.totalWon,
          history: [...s.history, { date: dateKey, won: false, mistakes: newMistakes, guesses: [...guessHistory, guess] }],
        };
        saveStorage(updated);
        setStats(updated);
        showToast("Better luck tomorrow!", 3000);
      }
    }

    setSelected(new Set());
  }

  function handleShuffle() {
    setShuffleSeed(prev => prev + "_s");
    const foundItems = new Set(found.flatMap(g => g.items));
    const remaining = tiles.filter(t => !foundItems.has(t));
    const shuffled = seededShuffle(remaining, shuffleSeed + "_s");
    const foundInGrid = tiles.filter(t => foundItems.has(t));
    setTiles([...foundInGrid, ...shuffled]);
  }

  function copyResults() {
    const emoji = getEmojiGrid(guessHistory, puzzle.groups);
    const text = `Career Connections ${dateKey}\n${mistakes === 0 ? "🏆 Perfect!" : `Mistakes: ${mistakes}/4`}\n\n${emoji}`;
    navigator.clipboard.writeText(text).then(() => showToast("Copied!")).catch(() => showToast("Copy failed"));
  }

  function getPreviousDay(d: string): string {
    const date = new Date(d);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0];
  }

  // Countdown to next puzzle
  function getCountdown(): string {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow.getTime() - now.getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  const remainingTiles = tiles.filter(t => !found.some(g => g.items.includes(t)));

  const isFinished = gameState !== "playing";

  return (
    <PremiumShell hideHeader>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes popIn {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes slideDown {
          0% { transform: translateY(-8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          background: "var(--text-primary)", color: "var(--app-bg)", padding: "10px 20px",
          borderRadius: 24, fontWeight: 800, fontSize: 14, zIndex: 999,
          animation: "slideDown 200ms ease",
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 950, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: -0.4 }}>
            Career Connections
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Find groups of 4 related career terms</p>
        </div>

        {/* Mistakes */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 18 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Mistakes:</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: "50%",
                background: i < mistakes ? "#EF4444" : "var(--card-border)",
                transition: "background 300ms",
              }} />
            ))}
          </div>
        </div>

        {/* Found groups */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: found.length > 0 ? 12 : 0 }}>
          {COLOR_ORDER.map(color => {
            const group = found.find(g => g.color === color);
            if (!group) return null;
            return (
              <div key={color} style={{
                padding: "14px 16px", borderRadius: 12,
                background: COLOR_MAP[color], color: "#fff",
                animation: "popIn 300ms ease",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.8, textTransform: "uppercase", opacity: 0.85 }}>
                  {group.category}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>
                  {group.items.join(", ")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tile grid */}
        {gameState === "playing" && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            marginBottom: 16,
          }}>
            {remainingTiles.map(item => {
              const isSelected = selected.has(item);
              const isShaking = shakeTiles.includes(item);
              return (
                <button
                  key={item}
                  onClick={() => toggleTile(item)}
                  style={{
                    padding: "10px 4px",
                    minHeight: 64,
                    borderRadius: 12,
                    border: isSelected ? "2px solid transparent" : "2px solid var(--card-border)",
                    background: isSelected ? "var(--accent)" : "var(--card-bg)",
                    color: isSelected ? "#fff" : "var(--text-primary)",
                    cursor: "pointer",
                    fontWeight: 900,
                    fontSize: 12,
                    textAlign: "center",
                    lineHeight: 1.3,
                    transition: "background 150ms, color 150ms, transform 100ms",
                    transform: isSelected ? "scale(1.04)" : "scale(1)",
                    animation: isShaking ? "shake 500ms ease" : undefined,
                    wordBreak: "break-word",
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        )}

        {/* Controls */}
        {gameState === "playing" && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20 }}>
            <button
              onClick={handleShuffle}
              style={{
                padding: "9px 18px", borderRadius: 10,
                background: "var(--card-bg)", border: "1px solid var(--card-border)",
                color: "var(--text-primary)", fontWeight: 800, fontSize: 13, cursor: "pointer",
              }}
            >
              Shuffle
            </button>
            <button
              onClick={() => setSelected(new Set())}
              disabled={selected.size === 0}
              style={{
                padding: "9px 18px", borderRadius: 10,
                background: "var(--card-bg)", border: "1px solid var(--card-border)",
                color: "var(--text-primary)", fontWeight: 800, fontSize: 13, cursor: "pointer",
                opacity: selected.size === 0 ? 0.4 : 1,
              }}
            >
              Deselect All
            </button>
            <button
              onClick={handleSubmit}
              disabled={selected.size !== 4}
              style={{
                padding: "9px 22px", borderRadius: 10,
                background: selected.size === 4 ? "var(--accent)" : "var(--card-border)",
                color: "#fff", fontWeight: 900, fontSize: 13, cursor: selected.size === 4 ? "pointer" : "default",
                opacity: selected.size !== 4 ? 0.5 : 1,
                border: "none",
                transition: "background 150ms",
              }}
            >
              Submit
            </button>
          </div>
        )}

        {/* End screen */}
        {isFinished && (
          <div style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            borderRadius: 16,
            padding: "24px",
            textAlign: "center",
            marginTop: 12,
            animation: "popIn 300ms ease",
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              {gameState === "won" ? (mistakes === 0 ? "🏆" : "🎉") : "😅"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)", marginBottom: 4 }}>
              {gameState === "won"
                ? mistakes === 0 ? "Genius! Perfect solve!" : mistakes === 1 ? "Impressive!" : mistakes <= 2 ? "Well done!" : "Got there!"
                : "Better luck tomorrow!"}
            </div>
            {gameState === "lost" && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>The groups were:</div>
                {puzzle.groups.map(g => (
                  <div key={g.category} style={{
                    padding: "8px 12px", borderRadius: 8, background: COLOR_MAP[g.color] + "20",
                    border: `1px solid ${COLOR_MAP[g.color]}40`,
                    marginBottom: 6, fontSize: 12, color: "var(--text-primary)", fontWeight: 700,
                  }}>
                    <span style={{ color: COLOR_MAP[g.color], fontWeight: 900 }}>{g.category}:</span>{" "}
                    {g.items.join(", ")}
                  </div>
                ))}
              </div>
            )}

            {/* Emoji grid */}
            <div style={{ fontFamily: "monospace", fontSize: 18, margin: "16px 0", letterSpacing: 2 }}>
              {guessHistory.map((guess, i) => {
                const group = puzzle.groups.find(g => guess.every(item => g.items.includes(item)));
                const emoji = group ? { yellow: "🟨", green: "🟩", blue: "🟦", purple: "🟪" }[group.color] : "⬛";
                return <div key={i}>{emoji.repeat(4)}</div>;
              })}
            </div>

            {stats && (
              <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 950, color: "var(--text-primary)" }}>{stats.streak}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>Streak</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 950, color: "var(--text-primary)" }}>{stats.totalWon}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>Won</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 950, color: "var(--text-primary)" }}>{stats.totalPlayed}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>Played</div>
                </div>
              </div>
            )}

            <button
              onClick={copyResults}
              style={{
                padding: "10px 22px", borderRadius: 10,
                background: "var(--accent)", color: "#fff",
                border: "none", fontWeight: 900, fontSize: 13, cursor: "pointer",
                marginRight: 8,
              }}
            >
              Copy Results
            </button>

            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 14 }}>
              Next puzzle in {getCountdown()}
            </div>
          </div>
        )}

        {/* Already played message */}
        {alreadyPlayed && gameState === "playing" && (
          <div style={{
            padding: "12px 16px", borderRadius: 12,
            background: "#10B98110", border: "1px solid #10B98130",
            fontSize: 13, color: "#10B981", fontWeight: 700, textAlign: "center", marginTop: 12,
          }}>
            You&apos;ve already played today. Come back tomorrow!
          </div>
        )}
      </div>
    </PremiumShell>
  );
}
