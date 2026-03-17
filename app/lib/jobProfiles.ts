export type JobProfile = {
  id: string;
  title: string;
  company?: string | null;
  roleType?: string | null;
  jobDescription: string;
  competencyWeights?: any;
  targetTraits?: any;
  createdAt?: string;
  updatedAt?: string;
};

const ACTIVE_PROFILE_KEY = "ipc_active_job_profile_id";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function setActiveJobProfileId(id: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

export function getActiveJobProfileId(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function clearActiveJobProfileId() {
  if (!canUseStorage()) return;
  localStorage.removeItem(ACTIVE_PROFILE_KEY);
}