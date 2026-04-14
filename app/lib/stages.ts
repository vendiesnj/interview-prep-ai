/** Canonical stage color constants — import from here instead of hardcoding */
export const STAGE_COLORS = {
  pre_college:    "#10B981",
  during_college: "#2563EB",
  post_college:   "#8B5CF6",
} as const;

export type StageKey = keyof typeof STAGE_COLORS;

export const STAGE_LABELS: Record<StageKey, string> = {
  pre_college:    "Pre-College",
  during_college: "During College",
  post_college:   "Post-College",
};

export function stageColor(stage: string | null | undefined): string {
  return STAGE_COLORS[stage as StageKey] ?? STAGE_COLORS.during_college;
}
