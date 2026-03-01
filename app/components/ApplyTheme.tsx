"use client";

import { useEffect } from "react";
import { getProfile } from "@/app/lib/profileStore";

export default function ApplyTheme() {
  useEffect(() => {
    const p = getProfile();
    let theme = (p?.settings?.theme ?? "dark") as string;

    // For launch: do NOT allow light theme (it breaks contrast with your current styling)
    if (theme === "light") theme = "dark";

    // Keep only ONE source of truth: data-ipc-theme
    document.documentElement.setAttribute("data-ipc-theme", theme);

    // If you had old code using data-theme, remove it to avoid conflicts
    document.documentElement.removeAttribute("data-theme");
  }, []);

  return null;
}