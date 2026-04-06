// ---------------------------------------------------------------------------
// Productivity Scoring Engine
//
// Score is 0–100, composed of four weighted dimensions:
//   Scheduling Rate  25% - did the student plan ahead?
//   Completion Rate  35% - did they follow through?
//   On-Time Rate     25% - did they finish before the deadline?
//   Consistency      15% - consecutive-day activity streak
//
// Inputs come from the Task model and ChecklistProgress model.
// ---------------------------------------------------------------------------

export type ProductivityInput = {
  tasks: {
    scheduledAt:  Date | null;
    completedAt:  Date | null;
    dueDate:      Date | null;
    createdAt:    Date;
  }[];
  checklist: {
    scheduledDate: Date | null;
    dueDate:       Date | null;
    completedAt:   Date | null;
    done:          boolean;
  }[];
};

export type ProductivityResult = {
  score:             number; // 0–100 rounded to 1 decimal
  schedulingRate:    number; // 0–1
  completionRate:    number; // 0–1
  onTimeRate:        number; // 0–1
  streak:            number; // consecutive days with ≥1 completion
  tasksScheduled:    number;
  tasksCompleted:    number;
  checklistDone:     number;
  checklistScheduled: number;
  label:             "Excellent" | "Strong" | "Building" | "Getting Started";
  color:             string;
};

const WEIGHTS = {
  scheduling:  0.25,
  completion:  0.35,
  onTime:      0.25,
  consistency: 0.15,
};

function rate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.min(1, numerator / denominator);
}

function dayKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function computeStreak(completionDates: Date[]): number {
  if (!completionDates.length) return 0;

  const days = new Set(completionDates.map(dayKey));
  const today = dayKey(new Date());

  let streak = 0;
  let cursor = new Date();

  // Walk backwards from today; allow today itself to count
  while (true) {
    const key = dayKey(cursor);
    if (days.has(key)) {
      streak++;
      cursor = new Date(cursor.getTime() - 86400000);
    } else if (key === today) {
      // today hasn't ended yet - skip and check yesterday
      cursor = new Date(cursor.getTime() - 86400000);
    } else {
      break;
    }
  }

  return streak;
}

export function computeProductivity(input: ProductivityInput): ProductivityResult {
  const { tasks, checklist } = input;

  // ── Scheduling ──────────────────────────────────────────────────────────────
  // A task counts as "schedulable" if it exists; "scheduled" if scheduledAt is set
  // A checklist item counts as "schedulable" if it exists; "scheduled" if scheduledDate is set
  const tasksScheduled    = tasks.filter(t => t.scheduledAt).length;
  const checklistScheduled = checklist.filter(c => c.scheduledDate).length;
  const totalSchedulable  = tasks.length + checklist.length;
  const totalScheduled    = tasksScheduled + checklistScheduled;
  const schedulingRate    = rate(totalScheduled, totalSchedulable);

  // ── Completion ───────────────────────────────────────────────────────────────
  // Only count items that were scheduled - did they complete what they planned?
  const scheduledTasks      = tasks.filter(t => t.scheduledAt);
  const scheduledChecklist  = checklist.filter(c => c.scheduledDate);
  const tasksCompleted      = scheduledTasks.filter(t => t.completedAt).length;
  const checklistDone       = scheduledChecklist.filter(c => c.done && c.completedAt).length;
  const totalScheduledItems = scheduledTasks.length + scheduledChecklist.length;
  const totalCompleted      = tasksCompleted + checklistDone;
  const completionRate      = rate(totalCompleted, totalScheduledItems);

  // ── On-Time ──────────────────────────────────────────────────────────────────
  // Completed before or on the due/scheduled date
  function isOnTime(
    completedAt: Date | null,
    deadline: Date | null,
  ): boolean {
    if (!completedAt || !deadline) return false;
    return completedAt <= deadline;
  }

  const onTimeTasks = tasks.filter(t =>
    t.completedAt && isOnTime(t.completedAt, t.dueDate ?? t.scheduledAt),
  ).length;

  const onTimeChecklist = checklist.filter(c =>
    c.completedAt && isOnTime(c.completedAt, c.dueDate ?? c.scheduledDate),
  ).length;

  const totalWithDeadline =
    tasks.filter(t => t.completedAt && (t.dueDate || t.scheduledAt)).length +
    checklist.filter(c => c.completedAt && (c.dueDate || c.scheduledDate)).length;

  const onTimeRate = rate(onTimeTasks + onTimeChecklist, totalWithDeadline);

  // ── Streak ───────────────────────────────────────────────────────────────────
  const allCompletions: Date[] = [
    ...tasks.filter(t => t.completedAt).map(t => t.completedAt!),
    ...checklist.filter(c => c.completedAt).map(c => c.completedAt!),
  ];
  const streak = computeStreak(allCompletions);

  // Normalize streak to 0–1: 7-day streak = full score; cap at 7
  const streakRate = Math.min(streak / 7, 1);

  // ── Composite Score ──────────────────────────────────────────────────────────
  const raw =
    schedulingRate  * WEIGHTS.scheduling  * 100 +
    completionRate  * WEIGHTS.completion  * 100 +
    onTimeRate      * WEIGHTS.onTime      * 100 +
    streakRate      * WEIGHTS.consistency * 100;

  const score = Math.round(raw * 10) / 10;

  // Label
  let label: ProductivityResult["label"];
  let color: string;
  if (score >= 80)      { label = "Excellent";       color = "#10B981"; }
  else if (score >= 60) { label = "Strong";           color = "#2563EB"; }
  else if (score >= 35) { label = "Building";         color = "#F59E0B"; }
  else                  { label = "Getting Started";  color = "#6B7280"; }

  return {
    score,
    schedulingRate,
    completionRate,
    onTimeRate,
    streak,
    tasksScheduled,
    tasksCompleted,
    checklistDone,
    checklistScheduled,
    label,
    color,
  };
}

// Convenience: letter grade (for compact UI display)
export function productivityGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 35) return "C";
  return "D";
}
