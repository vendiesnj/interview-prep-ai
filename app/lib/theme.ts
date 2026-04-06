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
    pageBg: "#0B1020",
    pageBgAccentA: "rgba(99,102,241,0.16)",
    pageBgAccentB: "rgba(34,211,238,0.12)",

    text: "#E5E7EB",
    textMuted: "#9CA3AF",
    textSoft: "#6B7280",

    cardBg: "rgba(255,255,255,0.03)",
    cardBgStrong: "rgba(255,255,255,0.05)",
    cardBorder: "rgba(255,255,255,0.10)",
    cardBorderSoft: "rgba(255,255,255,0.08)",

    inputBg: "rgba(17,24,39,0.48)",
    inputBorder: "rgba(255,255,255,0.08)",

    accent: "#67E8F9",
    accentSoft: "rgba(34,211,238,0.10)",
    accentStrong: "rgba(34,211,238,0.30)",

    accent2: "#818CF8",
    accent2Soft: "rgba(99,102,241,0.18)",

    danger: "#FCA5A5",
    dangerSoft: "rgba(252,165,165,0.10)",

    success: "#86EFAC",
    successSoft: "rgba(134,239,172,0.12)",

    chartPositive: "#22C55E",
    chartNegative: "#F87171",
    chartNeutral: "#F59E0B",
    chartCritical: "#EF4444",
  },

  radii: {
    xs: 10,
    sm: 12,
    md: 16,
    lg: 18,
    xl: 20,
  },

  shadows: {
    card: "0 18px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
    cardSoft: "inset 0 1px 0 rgba(255,255,255,0.04)",
    glow: "0 12px 28px rgba(34,211,238,0.12)",
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
    pageBg: "#0A1022",
    pageBgAccentA: "rgba(99,102,241,0.14)",
    pageBgAccentB: "rgba(34,211,238,0.10)",

    text: "#F3F6FB",
    textMuted: "#A7B0C0",
    textSoft: "#7F8AA0",

    cardBg: "rgba(255,255,255,0.04)",
    cardBgStrong: "rgba(255,255,255,0.06)",
    cardBorder: "rgba(255,255,255,0.10)",
    cardBorderSoft: "rgba(255,255,255,0.07)",

    inputBg: "rgba(15,23,42,0.72)",
    inputBorder: "rgba(255,255,255,0.10)",

    accent: "#6EE7F9",
    accentSoft: "rgba(110,231,249,0.12)",
    accentStrong: "rgba(110,231,249,0.30)",

    accent2: "#8B5CF6",
    accent2Soft: "rgba(139,92,246,0.18)",

    danger: "#FCA5A5",
    dangerSoft: "rgba(252,165,165,0.10)",

    success: "#86EFAC",
    successSoft: "rgba(134,239,172,0.12)",

    chartPositive: "#22C55E",
    chartNegative: "#F87171",
    chartNeutral: "#F59E0B",
    chartCritical: "#EF4444",
  },
  shadows: {
    card: "0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
    cardSoft: "0 10px 30px rgba(0,0,0,0.18)",
    glow: "0 14px 34px rgba(110,231,249,0.14)",
    none: "none",
  },
};

export const lightTheme: AppTheme = {
  name: "ipc-light",

  colors: {
    // Warm off-white background (PostHog-inspired)
    pageBg: "#F8F7F5",
    pageBgAccentA: "rgba(37,99,235,0.04)",
    pageBgAccentB: "rgba(14,165,233,0.03)",

    // Warm near-black typography
    text: "#1C1917",
    textMuted: "#78716C",
    textSoft: "#A8A29E",

    // Cards: white on warm-gray page
    cardBg: "#FFFFFF",
    cardBgStrong: "#FAFAF9",
    cardBorder: "rgba(28,25,23,0.08)",
    cardBorderSoft: "rgba(28,25,23,0.05)",

    inputBg: "#FFFFFF",
    inputBorder: "rgba(28,25,23,0.12)",

    // Blue as the primary accent
    accent: "#2563EB",
    accentSoft: "rgba(37,99,235,0.08)",
    accentStrong: "rgba(37,99,235,0.20)",

    // Sky blue as the secondary accent
    accent2: "#0EA5E9",
    accent2Soft: "rgba(14,165,233,0.09)",

    danger: "#DC2626",
    dangerSoft: "rgba(220,38,38,0.07)",

    success: "#16A34A",
    successSoft: "rgba(22,163,74,0.08)",

    chartPositive: "#16A34A",
    chartNegative: "#DC2626",
    chartNeutral: "#D97706",
    chartCritical: "#B91C1C",
  },

  radii: {
    xs: 8,
    sm: 10,
    md: 14,
    lg: 16,
    xl: 20,
  },

  shadows: {
    card: "0 1px 2px rgba(28,25,23,0.06), 0 4px 16px rgba(28,25,23,0.06)",
    cardSoft: "0 1px 2px rgba(28,25,23,0.04), 0 2px 8px rgba(28,25,23,0.03)",
    glow: "0 8px 24px rgba(37,99,235,0.18)",
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
  colors: {
    ...lightTheme.colors,
    pageBgAccentA: "rgba(29,78,216,0.05)",
    pageBgAccentB: "rgba(2,132,199,0.04)",

    accent: "#1D4ED8",
    accentSoft: "rgba(29,78,216,0.08)",
    accentStrong: "rgba(29,78,216,0.20)",

    accent2: "#0284C7",
    accent2Soft: "rgba(2,132,199,0.09)",
  },
  shadows: {
    card: "0 1px 2px rgba(28,25,23,0.06), 0 4px 16px rgba(29,78,216,0.07)",
    cardSoft: "0 1px 2px rgba(28,25,23,0.04), 0 2px 8px rgba(28,25,23,0.03)",
    glow: "0 8px 24px rgba(29,78,216,0.22)",
    none: "none",
  },
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