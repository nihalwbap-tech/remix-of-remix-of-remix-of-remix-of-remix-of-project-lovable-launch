export type ProgramWorkout = {
  id: string;
  programId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export const WORKOUTS_STORAGE_KEY = "no-more-copium:coach-workouts:v1";
export const WORKOUT_NAME_MAX_LENGTH = 80;

function normalizeWorkout(value: unknown): ProgramWorkout | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== "string" ||
    v.id.length === 0 ||
    typeof v.programId !== "string" ||
    v.programId.length === 0 ||
    typeof v.name !== "string" ||
    v.name.length === 0 ||
    typeof v.createdAt !== "string" ||
    typeof v.updatedAt !== "string"
  ) {
    return null;
  }
  return {
    id: v.id,
    programId: v.programId,
    name: v.name,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

export function loadWorkouts(): ProgramWorkout[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WORKOUTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeWorkout).filter((w): w is ProgramWorkout => w !== null);
  } catch {
    return [];
  }
}

export function saveWorkouts(workouts: ProgramWorkout[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WORKOUTS_STORAGE_KEY, JSON.stringify(workouts));
  } catch {
    // ignore
  }
}

export function createWorkoutId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createWorkout(input: { programId: string; name: string }): ProgramWorkout {
  const now = new Date().toISOString();
  return {
    id: createWorkoutId(),
    programId: input.programId,
    name: input.name.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

export function workoutsForProgram(
  workouts: ProgramWorkout[],
  programId: string,
): ProgramWorkout[] {
  return workouts
    .filter((w) => w.programId === programId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
