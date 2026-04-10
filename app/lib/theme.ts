export type AppTheme = {
  name: string;

  colors: {
    pageBg: string;
    pageBgAccentA: string;
    pageBgAccentB: string;

    text: string;
    textMuted: string;
    textSoft: string;

    cardBg: string;
    cardBgStrong: string;
    cardBorder: string;
    cardBorderSoft: string;

    inputBg: string;
    inputBorder: string;

    accent: string;
    accentSoft: string;
    accentStrong: string;

    accent2: string;
    accent2Soft: string;

    danger: string;
    dangerSoft: string;

    success: string;
    successSoft: string;

    chartPositive: string;
    chartNegative: string;
    chartNeutral: string;
    chartCritical: string;
  };

  radii: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };

  shadows: {
    card: string;
    cardSoft: string;
    glow: string;
    none: string;
  };
};

export const defaultTheme: AppTheme = {
  name: "ipc-default",

  colors: {
    pageBg: "#0F1117",
    pageBgAccentA: "rgba(37,99,235,0.08)",
    pageBgAccentB: "rgba(37,99,235,0.04)",

    text: "#E5E7EB",
    textMuted: "#9CA3AF",
    textSoft: "#6B7280",

    cardBg: "rgba(255,255,255,0.035)",
    cardBgStrong: "rgba(255,255,255,0.055)",
    cardBorder: "rgba(255,255,255,0.09)",
    cardBorderSoft: "rgba(255,255,255,0.065)",

    inputBg: "rgba(15,17,23,0.6)",
    inputBorder: "rgba(255,255,255,0.09)",

    accent: "#3B82F6",
    accentSoft: "rgba(59,130,246,0.12)",
    accentStrong: "rgba(59,130,246,0.28)",

    accent2: "#6366F1",
    accent2Soft: "rgba(99,102,241,0.14)",

    danger: "#F87171",
    dangerSoft: "rgba(248,113,113,0.10)",

    success: "#4ADE80",
    successSoft: "rgba(74,222,128,0.10)",

    chartPositive: "#22C55E",
    chartNegative: "#F87171",
    chartNeutral: "#F59E0B",
    chartCritical: "#EF4444",
  },

  radii: {
    xs: 6,
    sm: 8,
    md: 10,
    lg: 12,
    xl: 16,
  },

  shadows: {
    card: "0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.40)",
    cardSoft: "0 1px 0 rgba(255,255,255,0.04)",
    glow: "0 8px 24px rgba(59,130,246,0.18)",
    none: "none",
  },
};

export const rutgersTheme: AppTheme = {
  ...defaultTheme,
  name: "rutgers",
  colors: {
    ...defaultTheme.colors,
    pageBg: "#111111",
    pageBgAccentA: "rgba(204,0,0,0.18)",
    pageBgAccentB: "rgba(255,255,255,0.06)",

    accent: "#FF6B6B",
    accentSoft: "rgba(204,0,0,0.12)",
    accentStrong: "rgba(204,0,0,0.32)",

    accent2: "#FF9F9F",
    accent2Soft: "rgba(255,107,107,0.18)",

    chartPositive: "#4ADE80",
    chartNegative: "#FCA5A5",
    chartNeutral: "#FCD34D",
    chartCritical: "#F87171",
  },
};

export const michiganTheme: AppTheme = {
  ...defaultTheme,
  name: "michigan",
  colors: {
    ...defaultTheme.colors,
    pageBg: "#0A1633",
    pageBgAccentA: "rgba(255,203,5,0.12)",
    pageBgAccentB: "rgba(47,93,170,0.18)",

    accent: "#FFCB05",
    accentSoft: "rgba(255,203,5,0.12)",
    accentStrong: "rgba(255,203,5,0.30)",

    accent2: "#2F5DAA",
    accent2Soft: "rgba(47,93,170,0.22)",

    chartPositive: "#34D399",
    chartNegative: "#FCA5A5",
    chartNeutral: "#FCD34D",
    chartCritical: "#F87171",
  },
};

export const pennStateTheme: AppTheme = {
  ...defaultTheme,
  name: "penn-state",
  colors: {
    ...defaultTheme.colors,
    pageBg: "#0B1F3A",
    pageBgAccentA: "rgba(4,30,66,0.22)",
    pageBgAccentB: "rgba(255,255,255,0.05)",

    accent: "#93C5FD",
    accentSoft: "rgba(147,197,253,0.10)",
    accentStrong: "rgba(147,197,253,0.28)",

    accent2: "#041E42",
    accent2Soft: "rgba(4,30,66,0.24)",

    chartPositive: "#34D399",
    chartNegative: "#FCA5A5",
    chartNeutral: "#FCD34D",
    chartCritical: "#F87171",
  },
};

export const virginiaTechTheme: AppTheme = {
  ...defaultTheme,
  name: "virginia-tech",
  colors: {
    ...defaultTheme.colors,

    pageBg: "#F3EEEC",
    pageBgAccentA: "rgba(134,31,65,0.09)",
    pageBgAccentB: "rgba(232,119,34,0.08)",

    text: "#211C19",
    textMuted: "#6A625D",
    textSoft: "#877D77",

    cardBg: "#FFF9F7",
    cardBgStrong: "#FFFFFF",
    cardBorder: "rgba(134,31,65,0.14)",
    cardBorderSoft: "rgba(33,28,25,0.08)",

    inputBg: "#FFFFFF",
    inputBorder: "rgba(134,31,65,0.16)",

    accent: "#861F41",
    accentSoft: "rgba(134,31,65,0.11)",
    accentStrong: "rgba(134,31,65,0.30)",

    accent2: "#E87722",
    accent2Soft: "rgba(232,119,34,0.13)",

    danger: "#B42318",
    dangerSoft: "rgba(180,35,24,0.09)",

    success: "#166534",
    successSoft: "rgba(22,101,52,0.09)",

    chartPositive: "#16A34A",
    chartNegative: "#DC2626",
    chartNeutral: "#D97706",
    chartCritical: "#B91C1C",
  },

  radii: {
    ...defaultTheme.radii,
  },

  shadows: {
    card: "0 16px 36px rgba(33,28,25,0.08)",
    cardSoft: "0 8px 20px rgba(33,28,25,0.05)",
    glow: "0 10px 24px rgba(134,31,65,0.10)",
    none: "none",
  },
};

export const pitchTheme: AppTheme = {
  ...defaultTheme,
  name: "pitch",
  colors: {
    ...defaultTheme.colors,
    pageBg: "#0C1221",
    pageBgAccentA: "rgba(99,102,241,0.09)",
    pageBgAccentB: "rgba(59,130,246,0.06)",

    text: "#F1F5FB",
    textMuted: "#A3AEBE",
    textSoft: "#7A8499",

    inputBg: "rgba(12,18,33,0.70)",
  },
  shadows: {
    card: "0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.48)",
    cardSoft: "0 1px 0 rgba(255,255,255,0.04)",
    glow: "0 8px 24px rgba(99,102,241,0.20)",
    none: "none",
  },
};

export const lightTheme: AppTheme = {
  name: "ipc-light",

  colors: {
    // Cool neutral background — not warm, not white, not gray. Analysis-tool neutral.
    pageBg: "#F4F6F9",
    pageBgAccentA: "rgba(37,99,235,0.025)",
    pageBgAccentB: "rgba(37,99,235,0.015)",

    // Cool near-black typography
    text: "#111827",
    textMuted: "#6B7280",
    textSoft: "#9CA3AF",

    // White cards on cool-gray page — crisp, defined borders
    cardBg: "#FFFFFF",
    cardBgStrong: "#F9FAFB",
    cardBorder: "rgba(17,24,39,0.09)",
    cardBorderSoft: "rgba(17,24,39,0.06)",

    inputBg: "#FFFFFF",
    inputBorder: "rgba(17,24,39,0.12)",

    // Single precise blue accent — no neon, no teal
    accent: "#2563EB",
    accentSoft: "rgba(37,99,235,0.07)",
    accentStrong: "rgba(37,99,235,0.16)",

    // Slate as the secondary (used for tags, secondary actions)
    accent2: "#475569",
    accent2Soft: "rgba(71,85,105,0.08)",

    danger: "#DC2626",
    dangerSoft: "rgba(220,38,38,0.07)",

    success: "#16A34A",
    successSoft: "rgba(22,163,74,0.07)",

    chartPositive: "#16A34A",
    chartNegative: "#DC2626",
    chartNeutral: "#D97706",
    chartCritical: "#B91C1C",
  },

  radii: {
    xs: 6,
    sm: 8,
    md: 10,
    lg: 12,
    xl: 16,
  },

  shadows: {
    card: "0 1px 3px rgba(17,24,39,0.07), 0 4px 12px rgba(17,24,39,0.05)",
    cardSoft: "0 1px 2px rgba(17,24,39,0.04)",
    glow: "0 6px 20px rgba(37,99,235,0.14)",
    none: "none",
  },
};

export const demoCollegeTheme: AppTheme = {
  ...lightTheme,
  name: "demo-college",
  colors: {
    ...lightTheme.colors,
    pageBgAccentA: "rgba(22,163,74,0.055)",
    pageBgAccentB: "rgba(21,128,61,0.040)",

    accent: "#16A34A",
    accentSoft: "rgba(22,163,74,0.09)",
    accentStrong: "rgba(22,163,74,0.22)",

    accent2: "#15803D",
    accent2Soft: "rgba(21,128,61,0.10)",

    success: "#15803D",
    successSoft: "rgba(21,128,61,0.09)",

    chartPositive: "#16A34A",
  },
  shadows: {
    ...lightTheme.shadows,
    glow: "0 8px 24px rgba(22,163,74,0.18)",
  },
};

export const ipcBlueTheme: AppTheme = {
  ...lightTheme,
  name: "ipc-blue",
  // Inherits all lightTheme values — accent is already #2563EB, radii are already tightened
};

// Roosevelt University - Forest green (#1E6B2E) + dark green secondary
export const rooseveltTheme: AppTheme = {
  ...lightTheme,
  name: "roosevelt",
  colors: {
    ...lightTheme.colors,
    pageBg: "#F6FAF7",
    pageBgAccentA: "rgba(30,107,46,0.05)",
    pageBgAccentB: "rgba(30,107,46,0.03)",

    cardBg: "#FFFFFF",
    cardBgStrong: "#F8FBF8",
    cardBorder: "rgba(30,107,46,0.12)",
    cardBorderSoft: "rgba(28,25,23,0.05)",

    inputBorder: "rgba(30,107,46,0.16)",

    accent: "#1E6B2E",
    accentSoft: "rgba(30,107,46,0.09)",
    accentStrong: "rgba(30,107,46,0.24)",

    accent2: "#145220",
    accent2Soft: "rgba(20,82,32,0.10)",

    success: "#166534",
    successSoft: "rgba(22,101,52,0.08)",

    chartPositive: "#16A34A",
    chartNegative: "#DC2626",
    chartNeutral: "#D97706",
    chartCritical: "#B91C1C",
  },
  shadows: {
    card: "0 1px 2px rgba(28,25,23,0.06), 0 4px 16px rgba(30,107,46,0.07)",
    cardSoft: "0 1px 2px rgba(28,25,23,0.04), 0 2px 8px rgba(28,25,23,0.03)",
    glow: "0 8px 24px rgba(30,107,46,0.18)",
    none: "none",
  },
};

export const themePresets = {
  default: defaultTheme,
  light: lightTheme,
  ipcBlue: ipcBlueTheme,
  pitch: pitchTheme,
  rutgers: rutgersTheme,
  michigan: michiganTheme,
  pennState: pennStateTheme,
  virginiaTech: virginiaTechTheme,
  demoCollege: demoCollegeTheme,
  roosevelt: rooseveltTheme,
};

export type ThemePresetName = keyof typeof themePresets;



export function getThemeByName(name?: string | null): AppTheme {
  if (!name) return lightTheme;
  return themePresets[name as ThemePresetName] ?? lightTheme;
}

export const activeThemeName: ThemePresetName = "ipcBlue";
export const activeTheme = themePresets[activeThemeName];