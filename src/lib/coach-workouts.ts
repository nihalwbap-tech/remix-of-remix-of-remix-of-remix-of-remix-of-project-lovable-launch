import { DEFAULT_WEIGHT_UNIT_ID } from "./coach-weight-units";

export type SetType = "warmup" | "normal" | "superset" | "alternating";
export type Intensity = "2rir" | "1rir" | "failure";

export type WorkoutSetPrescription = {
  id: string;
  targetWeight?: number;
  weightUnitId: string;
  targetReps?: number;
  repRangeMin?: number;
  repRangeMax?: number;
  intensity?: Intensity;
  setType: SetType;
  restSeconds?: number;
};

export type WorkoutExercisePrescription = {
  id: string;
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
export const DEFAULT_REST_SECONDS = 90;

export const SET_TYPES: readonly SetType[] = [
  "warmup",
  "normal",
  "superset",
  "alternating",
] as const;

export const INTENSITIES: readonly Intensity[] = ["2rir", "1rir", "failure"] as const;

export const SET_TYPE_LABELS: Record<SetType, string> = {
  warmup: "Warm-up",
  normal: "Normal",
  superset: "Super Set",
  alternating: "Alt. Super Set",
};

export const INTENSITY_LABELS: Record<Intensity, string> = {
  "2rir": "2 RIR",
  "1rir": "1 RIR",
  failure: "Failure",
};

function isSetType(value: unknown): value is SetType {
  return typeof value === "string" && (SET_TYPES as readonly string[]).includes(value);
}

function isIntensity(value: unknown): value is Intensity {
  return typeof value === "string" && (INTENSITIES as readonly string[]).includes(value);
}

function nonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const integer = Math.floor(value);
  return integer >= 1 ? integer : undefined;
}

function nonNegativeInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.floor(value));
}

function normalizeSet(value: unknown): WorkoutSetPrescription | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || raw.id.length === 0) return null;

  const legacySetType = typeof raw.setType === "string" ? raw.setType : "normal";
  const setType: SetType =
    raw.intensity === "warmup" ? "warmup" : isSetType(legacySetType) ? legacySetType : "normal";

  const legacyExactReps = positiveInteger(raw.targetReps);
  let repRangeMin = positiveInteger(raw.repRangeMin);
  let repRangeMax = positiveInteger(raw.repRangeMax);

  if (setType !== "warmup") {
    if (repRangeMin === undefined && legacyExactReps !== undefined) {
      repRangeMin = legacyExactReps;
    }
    if (repRangeMax === undefined && legacyExactReps !== undefined) {
      repRangeMax = legacyExactReps + 2;
    }
    if (repRangeMin !== undefined && repRangeMax !== undefined && repRangeMax <= repRangeMin) {
      repRangeMax = repRangeMin + 1;
    }
  }

  return {
    id: raw.id,
    setType,
    targetWeight: nonNegativeNumber(raw.targetWeight),
    weightUnitId:
      typeof raw.weightUnitId === "string" && raw.weightUnitId.length > 0
        ? raw.weightUnitId
        : DEFAULT_WEIGHT_UNIT_ID,
    targetReps: setType === "warmup" ? (legacyExactReps ?? repRangeMin) : undefined,
    repRangeMin: setType === "warmup" ? undefined : repRangeMin,
    repRangeMax: setType === "warmup" ? undefined : repRangeMax,
    intensity: isIntensity(raw.intensity) ? raw.intensity : undefined,
    restSeconds: nonNegativeInteger(raw.restSeconds),
  };
}

function normalizeExercise(value: unknown): WorkoutExercisePrescription | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    raw.id.length === 0 ||
    typeof raw.exerciseId !== "string" ||
    raw.exerciseId.length === 0
  ) {
    return null;
  }
  const sets = Array.isArray(raw.sets)
    ? raw.sets.map(normalizeSet).filter((set): set is WorkoutSetPrescription => set !== null)
    : [];
  return {
    id: raw.id,
    exerciseId: raw.exerciseId,
    notes: typeof raw.notes === "string" && raw.notes.trim().length > 0 ? raw.notes : undefined,
    sets,
  };
}

function normalizeWorkout(value: unknown): ProgramWorkout | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    raw.id.length === 0 ||
    typeof raw.programId !== "string" ||
    raw.programId.length === 0 ||
    typeof raw.name !== "string" ||
    raw.name.length === 0 ||
    typeof raw.createdAt !== "string" ||
    typeof raw.updatedAt !== "string"
  ) {
    return null;
  }
  const exercises = Array.isArray(raw.exercises)
    ? raw.exercises
        .map(normalizeExercise)
        .filter((exercise): exercise is WorkoutExercisePrescription => exercise !== null)
    : [];
  return {
    id: raw.id,
    programId: raw.programId,
    name: raw.name,
    exercises,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function loadWorkouts(): ProgramWorkout[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(WORKOUTS_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeWorkout)
      .filter((workout): workout is ProgramWorkout => workout !== null);
  } catch {
    return [];
  }
}

export function saveWorkouts(workouts: ProgramWorkout[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WORKOUTS_STORAGE_KEY, JSON.stringify(workouts));
  } catch {
    // Storage can be unavailable or full; the in-memory editor remains usable.
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
    weightUnitId: DEFAULT_WEIGHT_UNIT_ID,
    restSeconds: DEFAULT_REST_SECONDS,
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
    .filter((workout) => workout.programId === programId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function touchWorkout(workout: ProgramWorkout): ProgramWorkout {
  return { ...workout, updatedAt: new Date().toISOString() };
}

export function isValidRepPrescription(set: WorkoutSetPrescription): boolean {
  if (set.setType === "warmup") return positiveInteger(set.targetReps) !== undefined;
  const minimum = positiveInteger(set.repRangeMin);
  const maximum = positiveInteger(set.repRangeMax);
  return minimum !== undefined && maximum !== undefined && maximum > minimum;
}

export function formatRepPrescription(set: WorkoutSetPrescription): string | undefined {
  if (set.setType === "warmup") {
    return set.targetReps === undefined ? undefined : `${set.targetReps} reps`;
  }
  if (set.repRangeMin === undefined || set.repRangeMax === undefined) return undefined;
  return `${set.repRangeMin}–${set.repRangeMax} reps`;
}
