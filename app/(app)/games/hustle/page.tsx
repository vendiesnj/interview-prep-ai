"use client";

import { useEffect, useState, useCallback } from "react";
import PremiumShell from "@/app/components/PremiumShell";

// ── Types ─────────────────────────────────────────────────────────────────────

type LetterState = "correct" | "present" | "absent" | "empty" | "tbd";

interface Row {
  letters: string[];
  states: LetterState[];
}

interface HustleStorage {
  lastPlayed: string;
  streak: number;
  bestStreak: number;
  totalPlayed: number;
  gamesWon: number;
  guessDistribution: [number, number, number, number, number, number];
  history: Array<{ date: string; answer: string; guesses: string[]; won: boolean; row: number }>;
}

// ── Seeded hash ───────────────────────────────────────────────────────────────

function simpleHash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

// ── Word banks ────────────────────────────────────────────────────────────────

const ANSWER_WORDS: string[] = [
  "RAISE", "BONUS", "PIVOT", "AUDIT", "STOCK", "PITCH", "GRANT",
  "OFFER", "LABOR", "QUOTA", "LEASE", "TRADE", "SALES", "SCORE", "COACH",
  "BUILD", "CRAFT", "DRAFT", "EMAIL", "FOCUS", "GUIDE", "HIRED", "LEARN",
  "MERGE", "NOTED", "PLANS", "QUERY", "REFER", "SHIFT", "TAXES", "UNION",
  "VALUE", "BRAND", "BRIEF", "CHAIN", "CLAIM", "CLOSE", "COVER", "DEALS",
  "DEBUT", "DEFER", "ENTRY", "EQUAL", "FIELD", "FILES", "FINAL", "FIXED",
  "FLOOR", "FUNDS", "GOALS", "GRADE", "GRIND", "GROUP", "HOURS", "IDEAS",
  "IMAGE", "INDEX", "ITEMS", "LEADS", "LEGAL", "LEVEL", "LINKS", "LOCAL",
  "MAKER", "MATCH", "MEDIA", "MODEL", "MONEY", "MOVES", "NEEDS", "NOTES",
  "ORDER", "OWNED", "OWNER", "PANEL", "PAPER", "PATHS", "PAUSE", "PEERS",
  "PERKS", "PHONE", "PLACE", "PLANT", "POINT", "POSTS", "POWER", "PRESS",
  "PRICE", "PRIME", "PRINT", "PROMO", "PROOF", "PROTO", "PULLS", "RALLY",
  "RANGE", "RANKS", "RAPID", "RATES", "REACH", "READY", "REPAY", "RESET",
  "RETRO", "RIGHT", "RISKS", "RIVAL", "ROLES", "ROUND", "RULES", "SAVES",
  "SCALE", "SCOPE", "SCOUT", "SKILL", "SLACK", "SLIDE", "SMART", "SPACE",
  "SPEND", "SPLIT", "STACK", "STAGE", "STAKE", "START", "STATE", "STATS",
  "STEPS", "STORY", "STUDY", "STYLE", "SUITE", "SUPER", "SWEAT", "TABLE",
  "TASKS", "TEACH", "TEAMS", "TEMPO", "TERMS", "TESTS", "THINK", "TIERS",
  "TOOLS", "TRACK", "TRAIN", "TREND", "TRIAL", "TRUST", "TURNS", "USAGE",
  "USERS", "VALID", "VENUE", "VIDEO", "VIEWS", "VIRAL", "VOICE", "WASTE",
  "WATCH", "WORDS", "WRITE", "YIELD", "ZONES", "LOBBY", "PROXY", "REMIT",
  "DEBIT", "ASSET", "BONDS", "SHARE", "CHURN", "MARCH", "QUOTE",
];

const EXTRA_VALID: string[] = [
  "ABOUT", "ABOVE", "ABUSE", "ACTOR", "ACUTE", "ADMIT", "ADOPT", "ADULT",
  "AFTER", "AGAIN", "AGENT", "AGREE", "AHEAD", "ALARM", "ALBUM", "ALERT",
  "ALIGN", "ALIKE", "ALIVE", "ALLAY", "ALLOT", "ALLOW", "ALONE", "ALONG",
  "ALTER", "ANGEL", "ANGRY", "ANKLE", "ANNEX", "APART", "APPLE", "APPLY",
  "ARENA", "ARGUE", "ARISE", "ARRAY", "ARROW", "ASIDE", "ASKED", "ATLAS",
  "ATTIC", "AVOID", "AWAKE", "AWARD", "AWARE", "BADLY", "BAKER", "BASIC",
  "BASIN", "BATCH", "BEACH", "BEGAN", "BEGIN", "BEING", "BELOW", "BENCH",
  "BIBLE", "BIRTH", "BLACK", "BLADE", "BLAME", "BLAND", "BLANK", "BLAST",
  "BLEND", "BLESS", "BLOCK", "BLOOD", "BOARD", "BOAST", "BIRTH", "BOUND",
  "BOXER", "BRACE", "BREAK", "BRING", "BROIL", "BROWN", "BRUSH", "BUDDY",
  "BUILT", "BUNCH", "BURST", "BUTTE", "BUYER", "CALMS", "CANDY", "CANTO",
  "CARRY", "CAUSE", "CHALK", "CHAMP", "CHAOS", "CHART", "CHEAP", "CHECK",
  "CHESS", "CHEST", "CHIEF", "CHILD", "CHIPS", "CHUNK", "CIVIC", "CIVIL",
  "CLAMP", "CLASH", "CLASS", "CLEAN", "CLEAR", "CLERK", "CLICK", "CLIFF",
  "CLOCK", "CLOUD", "COAST", "CODES", "COMES", "COMMA", "CORAL", "COULD",
  "COUNT", "COURT", "COVET", "CRACK", "CRANE", "CRASH", "CRAZY", "CREAM",
  "CREEK", "CRIME", "CROSS", "CROWD", "CROWN", "CRUSH", "CURVE", "CYCLE",
  "DAUNT", "DENSE", "DEPOT", "DEPTH", "DIGIT", "DIODE", "DIRTY", "DISCO",
  "DITCH", "DIVER", "DOCKS", "DOING", "DONOR", "DOUBT", "DRAGS", "DRAIN",
  "DRAWN", "DRIVE", "DROPS", "DROVE", "DRUMS", "DUNES", "DUPED", "DUSTY",
  "EARLY", "EARTH", "EIGHT", "ELITE", "EMBED", "EMPTY", "EPOCH", "ERROR",
  "EVENT", "EVERY", "EXACT", "EXIST", "EXILE", "EXTRA", "FAINT", "FAITH",
  "FALSE", "FANCY", "FAVOR", "FEAST", "FERAL", "FETCH", "FEWER", "FIBER",
  "FIFTY", "FIGHT", "FIRST", "FIXED", "FLAIR", "FLAME", "FLANK", "FLASK",
  "FLICK", "FLING", "FLOAT", "FLOCK", "FLOOD", "FLORA", "FLOUR", "FLUID",
  "FLUTE", "FORCE", "FORGE", "FORTH", "FOUND", "FRAME", "FRANK", "FRAUD",
  "FRESH", "FRONT", "FROZE", "FRUIT", "FULLY", "GAVEL", "GAUGE", "GHOST",
  "GIVEN", "GLARE", "GLASS", "GLIDE", "GLOBE", "GLOOM", "GLOVE", "GLYPH",
  "GRACE", "GRAIN", "GRAPH", "GRASP", "GREAT", "GREEN", "GRILL", "GROAN",
  "GROSS", "GUESS", "GUEST", "HAPPY", "HARSH", "HEART", "HEAVY", "HEDGE",
  "HENCE", "HERO", "HOIST", "HOLES", "HONOR", "HUMAN", "HUMOR", "IDEAL",
  "INLET", "INPUT", "ISSUE", "IVORY", "JELLY", "JOINS", "JOINT", "JOKER",
  "JUDGE", "JUICE", "JUMBO", "KEEPS", "KNOCK", "KNOWN", "LARGE", "LATER",
  "LAUGH", "LAYER", "LEAVE", "LIGHT", "LIMIT", "LIVER", "LODGE", "LOGIC",
  "LOOKS", "LOOSE", "LOVER", "LOWER", "LUCKY", "LYRIC", "MAGIC", "MAJOR",
  "MANOR", "MAPLE", "MASON", "MEANS", "MERIT", "METAL", "MIGHT", "MINER",
  "MINOR", "MINUS", "MIXED", "MONTH", "MORAL", "MOUNT", "MOUSE", "MOUTH",
  "MOVED", "MUSIC", "NAIVE", "NAVAL", "NEVER", "NIGHT", "NOBLE", "NOISE",
  "NORTH", "NOVEL", "NURSE", "OCCUR", "OFFIC", "OFTEN", "OLIVE", "ONION",
  "OPTIC", "ORBIT", "ORGAN", "OTHER", "OUTER", "OXIDE", "OZONE", "PEACH",
  "PEARL", "PEDAL", "PLUMB", "PLUME", "PLUNK", "POLLY", "POPUP", "POUND",
  "PROUD", "PROVE", "QUEEN", "QUIET", "QUOTA", "RADAR", "RADIO", "RAINY",
  "RAINY", "REALM", "REBEL", "RELAX", "RENEW", "REPEL", "RIDER", "RIDGE",
  "RISKY", "RIVER", "ROCKY", "ROGUE", "ROUGH", "ROYAL", "SAFER", "SAINT",
  "SAUCE", "SCENE", "SEEMS", "SERVE", "SEVEN", "SHELF", "SHELL", "SHORE",
  "SHORT", "SHOUT", "SIGHT", "SIGMA", "SINCE", "SIXTY", "SIZED", "SLEEP",
  "SLICE", "SLOPE", "SMALL", "SOLID", "SOLVE", "SORRY", "SPARK", "SPAWN",
  "SPEAK", "SPEED", "SPELL", "SPINE", "SPIRE", "SPOON", "SPRAY", "SPURT",
  "STAFF", "STEAL", "STEAM", "STEEL", "STEEP", "STERN", "STILL", "STONE",
  "STORE", "STORM", "STOVE", "STRAP", "STRAW", "STRIP", "STRUT", "STUCK",
  "STUNT", "SUGAR", "SUITE", "SWAMP", "SWEPT", "SWIFT", "SWING", "SWORD",
  "SYLPH", "SYRUP", "TACIT", "TALON", "TASTE", "THIEF", "THING", "THREW",
  "THREE", "THREW", "THROW", "TIDAL", "TIGHT", "TIMER", "TODAY", "TOKEN",
  "TOUGH", "TOWER", "TOXIC", "TRACE", "TRULY", "TRUMP", "TRUTH", "TUTOR",
  "TWICE", "TWIST", "UNDER", "UNIFY", "UNITY", "UNTIL", "UPPER", "UPSET",
  "URBAN", "USUAL", "UTTER", "VAPOR", "VAULT", "VERSE", "VISIT", "VOTER",
  "WALLS", "WATER", "WHEEL", "WHERE", "WHILE", "WHITE", "WHOLE", "WHOSE",
  "WIDTH", "WIELD", "WORLD", "WORRY", "WORST", "WORTH", "WOULD", "WOUND",
  "YACHT", "YEARN", "YOUNG",
];

const VALID_GUESSES = new Set([...ANSWER_WORDS, ...EXTRA_VALID.filter(w => w.length === 5)]);

// ── Fun facts ─────────────────────────────────────────────────────────────────

const FUN_FACTS: Record<string, string> = {
  RAISE: "The average salary raise in the US is 3–4% annually. Negotiating proactively can yield 10–20% increases.",
  BONUS: "Performance bonuses average 5–10% of base salary in corporate roles. Signing bonuses are negotiable — always ask.",
  PIVOT: "Career pivots are more common than ever — 52% of workers consider changing careers at some point.",
  AUDIT: "Internal auditors are among the most AI-resilient finance roles, with low automation risk due to judgment requirements.",
  STOCK: "RSUs (Restricted Stock Units) often vest over 4 years with a 1-year cliff. Know your vesting schedule before accepting.",
  PITCH: "The average investor pitch is 20 slides. Entrepreneurs who practice their pitch 50+ times raise more capital.",
  GRANT: "Federal grants for research total over $500 billion annually. Many small business grants go unclaimed each year.",
  OFFER: "72% of job seekers who negotiate their offer receive more than the initial offer. Always negotiate.",
  LABOR: "Labor unions still represent about 10% of US workers and typically earn 10–15% higher wages than non-union peers.",
  QUOTA: "Sales professionals who exceed quota earn 30–50% more in commissions. Track your pipeline metrics weekly.",
  COACH: "Executive coaching has a 788% ROI according to some studies — the most effective leaders have coaches.",
  BRAND: "Personal branding on LinkedIn can result in 7x more recruiter views when your profile is complete.",
  SKILL: "Upskilling in a new technical skill can increase earning potential by 15–25% within 2 years.",
  TRADE: "Trade careers like electricians and plumbers earn $55–115K/year with much lower student debt than degree paths.",
  LEADS: "Top sales reps follow up with leads 5+ times; 80% of sales require at least 5 follow-up contacts.",
  GRIND: "Hustle culture is shifting — research shows overworking past 55 hours/week reduces productivity significantly.",
  TREND: "AI automation will displace some roles but creates 97 million new jobs by 2025 according to WEF projections.",
  TRUST: "Trust is the #1 predictor of team performance according to Google's Project Aristotle on effective teams.",
  MONEY: "Salary transparency laws now exist in 20+ states. You have the right to ask about pay ranges.",
  VALUE: "Quantifying your impact with numbers (revenue, % improvements) makes your resume 40% more compelling.",
  SCALE: "Scalable income — products, courses, content — is how most wealth above $1M is built.",
  TEAMS: "Psychological safety is the key to high-performing teams. Teams that share mistakes outperform those that don't.",
  START: "Most successful entrepreneurs started their business while still employed — reducing financial risk.",
  MERGE: "70% of successful startups pivoted from their original idea. Flexibility is a career superpower.",
  EXCEL: "Excel/spreadsheet skills are cited in 63% of job postings across industries. It's never a bad skill to have.",
  DRAFT: "The average resume gets 7 seconds of review time. Tailor each draft to the specific job description.",
  FOCUS: "Deep work — focused, uninterrupted work — is increasingly rare and increasingly valuable.",
};

// ── Keyboard rows ─────────────────────────────────────────────────────────────

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

// ── Win messages ──────────────────────────────────────────────────────────────

const WIN_MESSAGES = ["Genius!", "Magnificent!", "Splendid!", "Great!", "Phew!", "Lucky!"];

// ── Storage helpers ───────────────────────────────────────────────────────────

function loadStorage(): HustleStorage {
  try {
    const raw = localStorage.getItem("ipc_games_hustle_v1");
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return {
    lastPlayed: "",
    streak: 0,
    bestStreak: 0,
    totalPlayed: 0,
    gamesWon: 0,
    guessDistribution: [0, 0, 0, 0, 0, 0],
    history: [],
  };
}

function saveStorage(data: HustleStorage) {
  try {
    localStorage.setItem("ipc_games_hustle_v1", JSON.stringify(data));
  } catch { /* empty */ }
}

// ── Evaluate guess ────────────────────────────────────────────────────────────

function evaluateGuess(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = Array(5).fill("absent");
  const answerArr = answer.split("");
  const guessArr = guess.split("");
  const used = Array(5).fill(false);

  // First pass: correct
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === answerArr[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }

  // Second pass: present
  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guessArr[i] === answerArr[j]) {
        result[i] = "present";
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

// ── Cell colors ───────────────────────────────────────────────────────────────

function cellStyle(state: LetterState, isCurrentRow: boolean, _letterIndex: number): React.CSSProperties {
  const base: React.CSSProperties = {
    width: 62,
    height: 62,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    fontSize: 22,
    fontWeight: 900,
    border: "2px solid",
    transition: "background 300ms, border-color 300ms",
    flexShrink: 0,
  };

  switch (state) {
    case "correct":
      return { ...base, background: "#10B981", borderColor: "#10B981", color: "#fff" };
    case "present":
      return { ...base, background: "#F59E0B", borderColor: "#F59E0B", color: "#fff" };
    case "absent":
      return { ...base, background: "#374151", borderColor: "#374151", color: "#9CA3AF" };
    case "tbd":
      return { ...base, background: "var(--card-bg)", borderColor: "var(--text-muted)", color: "var(--text-primary)" };
    case "empty":
    default:
      return { ...base, background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" };
  }
}

function keyStyle(state: LetterState): React.CSSProperties {
  const base: React.CSSProperties = {
    height: 56,
    minWidth: 36,
    padding: "0 8px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    maxWidth: 42,
  };

  switch (state) {
    case "correct":
      return { ...base, background: "#10B981", color: "#fff" };
    case "present":
      return { ...base, background: "#F59E0B", color: "#fff" };
    case "absent":
      return { ...base, background: "#374151", color: "#9CA3AF" };
    default:
      return { ...base, background: "var(--card-bg-strong, #2a2a2a)", color: "var(--text-primary)" };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HustlePage() {
  const dateKey = new Date().toISOString().split("T")[0];
  const todayAnswer = ANSWER_WORDS[simpleHash(dateKey) % ANSWER_WORDS.length];

  const emptyRows: Row[] = Array(6).fill(null).map(() => ({
    letters: Array(5).fill(""),
    states: Array(5).fill("empty" as LetterState),
  }));

  const [rows, setRows] = useState<Row[]>(emptyRows);
  const [currentRow, setCurrentRow] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [keyStates, setKeyStates] = useState<Map<string, LetterState>>(new Map());
  const [stats, setStats] = useState<HustleStorage | null>(null);
  const [flipRow, setFlipRow] = useState<number | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);

  useEffect(() => {
    const s = loadStorage();
    setStats(s);
    if (s.lastPlayed === dateKey) setAlreadyPlayed(true);
  }, [dateKey]);

  const showToast = useCallback((msg: string, duration = 1800) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }, []);

  function updateKeyStates(guess: string, states: LetterState[]) {
    setKeyStates(prev => {
      const next = new Map(prev);
      const priority: LetterState[] = ["correct", "present", "absent"];
      guess.split("").forEach((letter, i) => {
        const existing = next.get(letter);
        const newState = states[i];
        if (!existing || priority.indexOf(newState) < priority.indexOf(existing)) {
          next.set(letter, newState);
        }
      });
      return next;
    });
  }

  function submitGuess() {
    if (currentInput.length !== 5) {
      showToast("Word must be 5 letters");
      return;
    }
    if (!VALID_GUESSES.has(currentInput)) {
      showToast("Not a valid word");
      return;
    }

    const states = evaluateGuess(currentInput, todayAnswer);
    const newRows = [...rows];
    newRows[currentRow] = { letters: currentInput.split(""), states };
    setRows(newRows);
    updateKeyStates(currentInput, states);

    setFlipRow(currentRow);
    setTimeout(() => setFlipRow(null), 600);

    const isWin = states.every(s => s === "correct");
    const isLastRow = currentRow === 5;

    if (isWin) {
      setTimeout(() => {
        setGameOver(true);
        setWon(true);
        const s = loadStorage();
        const newStreak = s.lastPlayed === getPreviousDay(dateKey) ? s.streak + 1 : 1;
        const dist = [...s.guessDistribution] as [number, number, number, number, number, number];
        dist[currentRow] += 1;
        const updated: HustleStorage = {
          ...s,
          lastPlayed: dateKey,
          streak: newStreak,
          bestStreak: Math.max(s.bestStreak, newStreak),
          totalPlayed: s.totalPlayed + 1,
          gamesWon: s.gamesWon + 1,
          guessDistribution: dist,
          history: [...s.history, { date: dateKey, answer: todayAnswer, guesses: newRows.slice(0, currentRow + 1).map(r => r.letters.join("")), won: true, row: currentRow + 1 }],
        };
        saveStorage(updated);
        setStats(updated);
        showToast(WIN_MESSAGES[currentRow] ?? "Nice!", 2500);
      }, 400);
    } else if (isLastRow) {
      setTimeout(() => {
        setGameOver(true);
        setWon(false);
        const s = loadStorage();
        const updated: HustleStorage = {
          ...s,
          lastPlayed: dateKey,
          streak: 0,
          bestStreak: s.bestStreak,
          totalPlayed: s.totalPlayed + 1,
          gamesWon: s.gamesWon,
          guessDistribution: s.guessDistribution,
          history: [...s.history, { date: dateKey, answer: todayAnswer, guesses: newRows.map(r => r.letters.join("")), won: false, row: 6 }],
        };
        saveStorage(updated);
        setStats(updated);
        showToast(`The word was ${todayAnswer}`, 4000);
      }, 400);
    } else {
      setCurrentRow(r => r + 1);
    }

    setCurrentInput("");
  }

  function handleKey(key: string) {
    if (gameOver || alreadyPlayed) return;
    if (key === "ENTER") {
      submitGuess();
    } else if (key === "⌫" || key === "BACKSPACE") {
      setCurrentInput(prev => prev.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && currentInput.length < 5) {
      setCurrentInput(prev => prev + key);
    }
  }

  // Physical keyboard
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey) return;
      const k = e.key.toUpperCase();
      if (k === "ENTER" || k === "BACKSPACE" || /^[A-Z]$/.test(k)) {
        handleKey(k === "BACKSPACE" ? "⌫" : k);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function getPreviousDay(d: string): string {
    const date = new Date(d);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0];
  }

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

  function getEmojiGrid(): string {
    return rows
      .filter(r => r.states[0] !== "empty" && r.states[0] !== "tbd")
      .map(r => r.states.map(s => s === "correct" ? "🟩" : s === "present" ? "🟨" : "⬛").join(""))
      .join("\n");
  }

  function copyResults() {
    const grid = getEmojiGrid();
    const guessCount = won ? rows.filter(r => r.states[0] !== "empty").length : "X";
    const text = `Hustle ${dateKey} ${guessCount}/6\n\n${grid}`;
    navigator.clipboard.writeText(text)
      .then(() => showToast("Copied!"))
      .catch(() => showToast("Copy failed"));
  }

  // Build display rows
  const displayRows: Row[] = rows.map((row, i) => {
    if (i === currentRow && !gameOver) {
      return {
        letters: [...currentInput.split(""), ...Array(5 - currentInput.length).fill("")],
        states: [...Array(currentInput.length).fill("tbd" as LetterState), ...Array(5 - currentInput.length).fill("empty" as LetterState)],
      };
    }
    return row;
  });

  const funFact = FUN_FACTS[todayAnswer];

  return (
    <PremiumShell hideHeader>
      <style>{`
        @keyframes flipIn {
          0% { transform: rotateX(0deg); }
          50% { transform: rotateX(90deg); }
          100% { transform: rotateX(0deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes slideDown {
          0% { transform: translateX(-50%) translateY(-8px); opacity: 0; }
          100% { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
          background: "var(--text-primary)", color: "var(--app-bg)", padding: "10px 20px",
          borderRadius: 24, fontWeight: 800, fontSize: 14, zIndex: 999,
          animation: "slideDown 200ms ease",
          whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 500, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        {/* Header */}
        <div style={{ textAlign: "center", width: "100%" }}>
          <h1 style={{ fontSize: 24, fontWeight: 950, color: "var(--text-primary)", margin: "0 0 2px", letterSpacing: -0.4 }}>
            Hustle
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 4px" }}>Guess today&apos;s career word</p>
          {stats && stats.streak > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: "#F59E0B20", border: "1px solid #F59E0B40", fontSize: 12, fontWeight: 800, color: "#F59E0B" }}>
              🔥 {stats.streak} day streak
            </div>
          )}
        </div>

        {/* Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {displayRows.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: "flex", gap: 6 }}>
              {row.letters.map((letter, colIndex) => (
                <div
                  key={colIndex}
                  style={{
                    ...cellStyle(row.states[colIndex], rowIndex === currentRow, colIndex),
                    animation: flipRow === rowIndex ? `flipIn 400ms ease ${colIndex * 80}ms` : undefined,
                  }}
                >
                  {letter}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Keyboard */}
        {!gameOver && !alreadyPlayed && (
          <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 6, padding: "0 4px" }}>
            {KEYBOARD_ROWS.map((row, ri) => (
              <div key={ri} style={{ display: "flex", gap: 5, justifyContent: "center" }}>
                {row.map(key => {
                  const state = keyStates.get(key) ?? "empty";
                  const isSpecial = key === "ENTER" || key === "⌫";
                  return (
                    <button
                      key={key}
                      onClick={() => handleKey(key)}
                      style={{
                        ...keyStyle(state),
                        minWidth: isSpecial ? 56 : 36,
                        maxWidth: isSpecial ? 64 : 42,
                        fontSize: isSpecial ? 11 : 13,
                        flex: isSpecial ? "1.5" : "1",
                      }}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* End screen */}
        {gameOver && (
          <div style={{
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            borderRadius: 16, padding: "24px", textAlign: "center", width: "100%",
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{won ? "🎉" : "😞"}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)", marginBottom: 4 }}>
              {won ? `${WIN_MESSAGES[rows.filter(r => r.states[0] !== "empty" && r.states[0] !== "tbd").length - 1] ?? "Nice!"}` : `The word was ${todayAnswer}`}
            </div>

            {/* Emoji grid */}
            <div style={{ fontFamily: "monospace", fontSize: 20, margin: "14px 0", letterSpacing: 3, lineHeight: 1.6 }}>
              {getEmojiGrid()}
            </div>

            {stats && (
              <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 950, color: "var(--text-primary)" }}>{stats.streak}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>Streak</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 950, color: "var(--text-primary)" }}>{stats.gamesWon}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>Won</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 950, color: "var(--text-primary)" }}>{stats.totalPlayed}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>Played</div>
                </div>
              </div>
            )}

            {funFact && (
              <div style={{
                padding: "12px 14px", borderRadius: 10,
                background: "#10B98110", border: "1px solid #10B98130",
                fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6,
                textAlign: "left", marginBottom: 14,
              }}>
                <strong style={{ color: "#10B981" }}>Career Fact:</strong> {funFact}
              </div>
            )}

            <button
              onClick={copyResults}
              style={{
                padding: "10px 22px", borderRadius: 10,
                background: "var(--accent)", color: "#fff",
                border: "none", fontWeight: 900, fontSize: 13, cursor: "pointer",
              }}
            >
              Copy Results
            </button>

            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
              Next word in {getCountdown()}
            </div>
          </div>
        )}

        {alreadyPlayed && !gameOver && (
          <div style={{
            padding: "12px 16px", borderRadius: 12,
            background: "#10B98110", border: "1px solid #10B98130",
            fontSize: 13, color: "#10B981", fontWeight: 700, textAlign: "center", width: "100%",
          }}>
            You&apos;ve already played today. Come back tomorrow for a new word!
          </div>
        )}
      </div>
    </PremiumShell>
  );
}
