"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { themePresets, type ThemePresetName, pitchTheme } from "@/app/lib/theme";

const FALLBACK_THEME: ThemePresetName = "light";
const STORAGE_KEY = "ipc_tenant_theme_v3";

export default function TenantThemeSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    const tenant = (session as any)?.tenant ?? null;

   const rawTheme = tenant?.themeKey;
const isPitchMode =
  typeof window !== "undefined" &&
  (window.location.pathname.startsWith("/pitch") ||
    window.location.pathname.startsWith("/demo"));

const preset =
  isPitchMode
    ? pitchTheme
    : rawTheme && rawTheme in themePresets
    ? themePresets[rawTheme as ThemePresetName]
    : themePresets[FALLBACK_THEME];
    const root = document.body;

    if (!root || !preset) return;

    const colors = {
      pageBg: tenant?.pageBg ?? preset.colors.pageBg,
      pageBgAccentA: tenant?.pageBgAccentA ?? preset.colors.pageBgAccentA,
      pageBgAccentB: tenant?.pageBgAccentB ?? preset.colors.pageBgAccentB,

      text: tenant?.textPrimary ?? preset.colors.text,
      textMuted: tenant?.textMuted ?? preset.colors.textMuted,
      textSoft: tenant?.textSoft ?? preset.colors.textSoft,

      cardBg: tenant?.cardBg ?? preset.colors.cardBg,
      cardBgStrong: tenant?.cardBgStrong ?? preset.colors.cardBgStrong,
      cardBorder: tenant?.cardBorder ?? preset.colors.cardBorder,
      cardBorderSoft: tenant?.cardBorderSoft ?? preset.colors.cardBorderSoft,

      inputBg: tenant?.inputBg ?? preset.colors.inputBg,
      inputBorder: tenant?.inputBorder ?? preset.colors.inputBorder,

      accent: tenant?.accent ?? preset.colors.accent,
      accentSoft: tenant?.accentSoft ?? preset.colors.accentSoft,
      accentStrong: tenant?.accentStrong ?? preset.colors.accentStrong,

      accent2: tenant?.accent2 ?? preset.colors.accent2,
      accent2Soft: tenant?.accent2Soft ?? preset.colors.accent2Soft,

      danger: tenant?.danger ?? preset.colors.danger,
      dangerSoft: tenant?.dangerSoft ?? preset.colors.dangerSoft,

      success: tenant?.success ?? preset.colors.success,
      successSoft: tenant?.successSoft ?? preset.colors.successSoft,

      chartPositive: preset.colors.chartPositive,
      chartNegative: preset.colors.chartNegative,
      chartNeutral: preset.colors.chartNeutral,
      chartCritical: preset.colors.chartCritical,
    };

    root.style.backgroundColor = colors.pageBg;
    root.style.color = colors.text;

    root.style.setProperty("--app-bg", colors.pageBg);
    root.style.setProperty("--app-bg-accent-a", colors.pageBgAccentA);
    root.style.setProperty("--app-bg-accent-b", colors.pageBgAccentB);

    root.style.setProperty("--text-primary", colors.text);
    root.style.setProperty("--text-muted", colors.textMuted);
    root.style.setProperty("--text-soft", colors.textSoft);

    root.style.setProperty("--card-bg", colors.cardBg);
    root.style.setProperty("--card-bg-strong", colors.cardBgStrong);
    root.style.setProperty("--card-border", colors.cardBorder);
    root.style.setProperty("--card-border-soft", colors.cardBorderSoft);

    root.style.setProperty("--input-bg", colors.inputBg);
    root.style.setProperty("--input-border", colors.inputBorder);

    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--accent-soft", colors.accentSoft);
    root.style.setProperty("--accent-strong", colors.accentStrong);

    root.style.setProperty("--accent-2", colors.accent2);
    root.style.setProperty("--accent-2-soft", colors.accent2Soft);

    root.style.setProperty("--danger", colors.danger);
    root.style.setProperty("--danger-soft", colors.dangerSoft);

    root.style.setProperty("--success", colors.success);
    root.style.setProperty("--success-soft", colors.successSoft);

    root.style.setProperty("--chart-positive", colors.chartPositive);
    root.style.setProperty("--chart-negative", colors.chartNegative);
    root.style.setProperty("--chart-neutral", colors.chartNeutral);
    root.style.setProperty("--chart-critical", colors.chartCritical);

    root.style.setProperty("--radius-xs", `${preset.radii.xs}px`);
    root.style.setProperty("--radius-sm", `${preset.radii.sm}px`);
    root.style.setProperty("--radius-md", `${preset.radii.md}px`);
    root.style.setProperty("--radius-lg", `${preset.radii.lg}px`);
    root.style.setProperty("--radius-xl", `${preset.radii.xl}px`);

    root.style.setProperty("--shadow-card", preset.shadows.card);
    root.style.setProperty("--shadow-card-soft", preset.shadows.cardSoft);
    root.style.setProperty("--shadow-glow", preset.shadows.glow);
    root.style.setProperty("--shadow-none", preset.shadows.none);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          colors,
          radii: preset.radii,
          shadows: preset.shadows,
        })
      );
    } catch {}
  }, [session, status]);

  return null;
}