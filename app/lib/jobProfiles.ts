export type JobProfile = {
  id: string;
  title: string;
  company?: string;
  roleType?: string;
  jobDescription: string;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "ipc.jobProfiles.v1";
const ACTIVE_PROFILE_KEY = "ipc.activeJobProfileId.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function canUseStorage() {
  return typeof window !== "undefined";
}

export function createJobProfileId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `job_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

export function getJobProfiles(): JobProfile[] {
  if (!canUseStorage()) return [];
  return safeParse<JobProfile[]>(localStorage.getItem(STORAGE_KEY), []);
}

export function saveJobProfiles(profiles: JobProfile[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function upsertJobProfile(
  input: Omit<JobProfile, "id" | "createdAt" | "updatedAt"> & { id?: string }
): JobProfile {
  const existing = getJobProfiles();
  const now = Date.now();

  if (input.id) {
    const updated = existing.map((profile) =>
      profile.id === input.id
        ? {
            ...profile,
            title: input.title.trim(),
            company: input.company?.trim() || undefined,
            roleType: input.roleType?.trim() || undefined,
            jobDescription: input.jobDescription,
            updatedAt: now,
          }
        : profile
    );

    saveJobProfiles(updated);

    return (
      updated.find((profile) => profile.id === input.id) ?? {
        id: input.id,
        title: input.title.trim(),
        company: input.company?.trim() || undefined,
        roleType: input.roleType?.trim() || undefined,
        jobDescription: input.jobDescription,
        createdAt: now,
        updatedAt: now,
      }
    );
  }

  const next: JobProfile = {
    id: createJobProfileId(),
    title: input.title.trim(),
    company: input.company?.trim() || undefined,
    roleType: input.roleType?.trim() || undefined,
    jobDescription: input.jobDescription,
    createdAt: now,
    updatedAt: now,
  };

  saveJobProfiles([next, ...existing]);
  return next;
}

export function deleteJobProfile(id: string) {
  const existing = getJobProfiles();
  const next = existing.filter((profile) => profile.id !== id);
  saveJobProfiles(next);

  const activeId = getActiveJobProfileId();
  if (activeId === id) {
    clearActiveJobProfileId();
  }
}

export function getJobProfileById(id: string | null | undefined): JobProfile | null {
  if (!id) return null;
  return getJobProfiles().find((profile) => profile.id === id) ?? null;
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

export function getActiveJobProfile(): JobProfile | null {
  const id = getActiveJobProfileId();
  return getJobProfileById(id);
}