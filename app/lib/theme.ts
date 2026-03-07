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
  },
};

export const virginiaTechTheme: AppTheme = {
  ...defaultTheme,
  name: "virginia-tech",
  colors: {
    ...defaultTheme.colors,

    pageBg: "#1A0E12",

    pageBgAccentA: "rgba(134,31,65,0.22)",
    pageBgAccentB: "rgba(232,119,34,0.16)",

    accent: "#E87722",
    accentSoft: "rgba(232,119,34,0.14)",
    accentStrong: "rgba(232,119,34,0.36)",

    accent2: "#861F41",
    accent2Soft: "rgba(134,31,65,0.28)",
  },
};

export const themePresets = {
  default: defaultTheme,
  rutgers: rutgersTheme,
  michigan: michiganTheme,
  pennState: pennStateTheme,
  virginiaTech: virginiaTechTheme,
};

export type ThemePresetName = keyof typeof themePresets;

export const activeThemeName: ThemePresetName = "virginiaTech";
export const activeTheme = themePresets[activeThemeName];