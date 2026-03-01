export type PlanTier = "free" | "pro" | "university" | "enterprise";

export type UserSettings = {
  strictMode: boolean;
  answerTimeLimit: number; // seconds
  theme: "light" | "dark" | "blue";
  emailReminders: boolean;
  privacyMode: "normal" | "private";
};

export type UserProfile = {
  name: string;
  email: string;
  plan: PlanTier;
  settings: UserSettings;
  stats: {
    totalSessions: number;
    averageScore: number;
  };
};

const STORAGE_KEY = "ipc.profile.v1";

const defaultProfile: UserProfile = {
  name: "Guest User",
  email: "",
  plan: "free",
  settings: {
    strictMode: false,
    answerTimeLimit: 120,
    theme: "blue",
    emailReminders: false,
    privacyMode: "normal",
  },
  stats: {
    totalSessions: 0,
    averageScore: 0,
  },
};

export function getProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultProfile;

  try {
    return JSON.parse(raw);
  } catch {
    return defaultProfile;
  }
}

export function saveProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export const loadProfile = getProfile;