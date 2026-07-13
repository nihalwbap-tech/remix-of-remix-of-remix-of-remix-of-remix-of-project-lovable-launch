export type SetType = "normal" | "superset" | "alternating" | "challenge";
export type Intensity = "warmup" | "2rir" | "1rir" | "failure";

export type WorkoutSetPrescription = {
  id: string;
  targetWeight?: number;
  targetReps?: number;
  intensity?: Intensity;
  setType: SetType;
  restSeconds?: number;
  challengeTargetReps?: number;
};

export type WorkoutExercisePrescription = {
  id: string; // instance ID, distinct from exerciseId
  exerciseId: string;
  notes?: string;
  sets: WorkoutSetPrescription[];
};

export type ProgramWorkout = {
  id: string;
  programId: string;
  name: string;
  exercises: WorkoutExercisePrescription[];
  createdAt: string;
  updatedAt: string;
};

export const WORKOUTS_STORAGE_KEY = "no-more-copium:coach-workouts:v1";
export const WORKOUT_NAME_MAX_LENGTH = 80;
export const EXERCISE_NOTES_MAX_LENGTH = 300;

export const SET_TYPES: readonly SetType[] = [
  "normal",
  "superset",
  "alternating",
  "challenge",
] as const;

export const INTENSITIES: readonly Intensity[] = ["warmup", "2rir", "1rir", "failure"] as const;

export const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: "Normal",
  superset: "Super Set",
  alternating: "Alt. Super",
  challenge: "Challenge",
};

export const INTENSITY_LABELS: Record<Intensity, string> = {
  warmup: "Warm-up",
  "2rir": "2 RIR",
  "1rir": "1 RIR",
  failure: "Failure",
};

export const DEFAULT_CHALLENGE_TARGET_REPS = 30;

function isSetType(v: unknown): v is SetType {
  return typeof v === "string" && (SET_TYPES as readonly string[]).includes(v);
}

function isIntensity(v: unknown): v is Intensity {
  return typeof v === "string" && (INTENSITIES as readonly string[]).includes(v);
}

function normalizeSet(value: unknown): WorkoutSetPrescription | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || v.id.length === 0) return null;
  const setType: SetType = isSetType(v.setType) ? v.setType : "normal";
  const set: WorkoutSetPrescription = {
    id: v.id,
    setType,
    targetWeight: typeof v.targetWeight === "number" ? v.targetWeight : undefined,
    targetReps: typeof v.targetReps === "number" ? v.targetReps : undefined,
    intensity: isIntensity(v.intensity) ? v.intensity : undefined,
    restSeconds: typeof v.restSeconds === "number" ? v.restSeconds : undefined,
    challengeTargetReps:
      typeof v.challengeTargetReps === "number" ? v.challengeTargetReps : undefined,
  };
  return set;
}

function normalizeExercise(value: unknown): WorkoutExercisePrescription | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== "string" ||
    v.id.length === 0 ||
    typeof v.exerciseId !== "string" ||
    v.exerciseId.length === 0
  ) {
    return null;
  }
  const sets = Array.isArray(v.sets)
    ? v.sets.map(normalizeSet).filter((s): s is WorkoutSetPrescription => s !== null)
    : [];
  return {
    id: v.id,
    exerciseId: v.exerciseId,
    notes: typeof v.notes === "string" && v.notes.trim().length > 0 ? v.notes : undefined,
    sets,
  };
}

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
  const exercises = Array.isArray(v.exercises)
    ? v.exercises.map(normalizeExercise).filter((e): e is WorkoutExercisePrescription => e !== null)
    : [];
  return {
    id: v.id,
    programId: v.programId,
    name: v.name,
    exercises,
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

function randomId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createWorkoutId(): string {
  return randomId("w");
}

export function createExerciseInstanceId(): string {
  return randomId("we");
}

export function createSetId(): string {
  return randomId("s");
}

export function createDefaultSet(previous?: WorkoutSetPrescription): WorkoutSetPrescription {
  if (previous) {
    return {
      ...previous,
      id: createSetId(),
    };
  }
  return {
    id: createSetId(),
    setType: "normal",
    intensity: "2rir",
    targetWeight: 0,
  };
}

export function createExerciseInstance(exerciseId: string): WorkoutExercisePrescription {
  return {
    id: createExerciseInstanceId(),
    exerciseId,
    sets: [createDefaultSet()],
  };
}

export function createWorkout(input: { programId: string; name: string }): ProgramWorkout {
  const now = new Date().toISOString();
  return {
    id: createWorkoutId(),
    programId: input.programId,
    name: input.name.trim(),
    exercises: [],
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

export function touchWorkout(workout: ProgramWorkout): ProgramWorkout {
  return { ...workout, updatedAt: new Date().toISOString() };
}
