export const TASK_STATES = [
  "scheduled",
  "available",
  "claimed",
  "in_progress",
  "paused",
  "completed",
  "failed",
  "aborted",
] as const;

export type TaskState = (typeof TASK_STATES)[number];

export const TASK_TERMINAL_STATES: TaskState[] = [
  "completed",
  "failed",
  "aborted",
];

const transitions: Record<TaskState, TaskState[]> = {
  scheduled: ["available"],
  available: ["claimed", "aborted"],
  claimed: ["in_progress", "aborted"],
  in_progress: ["paused", "completed", "failed", "aborted"],
  paused: ["in_progress", "aborted"],
  completed: [],
  failed: [],
  aborted: [],
};

export function canTransition(current: TaskState, next: TaskState) {
  return transitions[current]?.includes(next) ?? false;
}

export function isTerminal(state: TaskState) {
  return TASK_TERMINAL_STATES.includes(state);
}

