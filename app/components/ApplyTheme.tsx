"use client";

import { useEffect } from "react";
import { getProfile } from "@/app/lib/profileStore";

export default function ApplyTheme() {
  useEffect(() => {
    // read saved settings (your Settings page writes into profileStore)
    const p = getProfile();
    const theme = p?.settings?.theme ?? "dark"; // default to dark
    document.documentElement.setAttribute("data-ipc-theme", theme);
  }, []);

  return null;
}