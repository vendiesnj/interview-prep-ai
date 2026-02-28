"use client";

import { useEffect } from "react";

type Theme = "system" | "dark" | "light";

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

export default function ThemeBoot() {
  useEffect(() => {
    const raw = (localStorage.getItem("ipc.theme") ?? "system") as Theme;
    const resolved = raw === "system" ? getSystemTheme() : raw;
    document.documentElement.dataset.theme = resolved;

    // If system theme changes while user is on "system", update live.
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;

    const handler = () => {
      const t = (localStorage.getItem("ipc.theme") ?? "system") as Theme;
      if (t === "system") document.documentElement.dataset.theme = getSystemTheme();
    };

    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  return null;
}