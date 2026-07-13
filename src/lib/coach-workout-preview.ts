import type {
  ProgramWorkout,
  WorkoutExercisePrescription,
  WorkoutSetPrescription,
} from "./coach-workouts";

export const DEFAULT_REST_SECONDS = 90;
export const DEFAULT_CHALLENGE_FALLBACK_REPS = 30;

export type PreviewSetResult = {
  exerciseInstanceId: string;
  setId: string;
  actualWeight: number;
  actualReps: number;
  completed: boolean;
};

export type FlatSetRef = {
  exerciseInstanceId: string;
  setId: string;
  exerciseIndex: number;
  setIndex: number;
  totalSetsInExercise: number;
  exercise: WorkoutExercisePrescription;
  set: WorkoutSetPrescription;
};

export type SessionResultsMap = Record<string, PreviewSetResult>;

export function resultKey(exerciseInstanceId: string, setId: string): string {
  return `${exerciseInstanceId}::${setId}`;
}

export function clampNonNegative(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function initSessionResults(workout: ProgramWorkout): SessionResultsMap {
  const map: SessionResultsMap = {};
  for (const ex of workout.exercises) {
    for (const set of ex.sets) {
      map[resultKey(ex.id, set.id)] = {
        exerciseInstanceId: ex.id,
        setId: set.id,
        actualWeight: clampNonNegative(set.targetWeight ?? 0),
        actualReps: clampNonNegative(set.targetReps ?? 0),
        completed: false,
      };
    }
  }
  return map;
}

export function flattenSets(workout: ProgramWorkout): FlatSetRef[] {
  const flat: FlatSetRef[] = [];
  workout.exercises.forEach((exercise, exerciseIndex) => {
    exercise.sets.forEach((set, setIndex) => {
      flat.push({
        exerciseInstanceId: exercise.id,
        setId: set.id,
        exerciseIndex,
        setIndex,
        totalSetsInExercise: exercise.sets.length,
        exercise,
        set,
      });
    });
  });
  return flat;
}

export function hasAnyValidSet(workout: ProgramWorkout): boolean {
  return workout.exercises.some((e) => e.sets.length > 0);
}

export function restSecondsFor(set: WorkoutSetPrescription): number {
  return clampNonNegative(set.restSeconds ?? DEFAULT_REST_SECONDS);
}

export function challengeTargetFor(set: WorkoutSetPrescription): number {
  const raw = set.challengeTargetReps ?? set.targetReps ?? DEFAULT_CHALLENGE_FALLBACK_REPS;
  const clamped = clampNonNegative(raw);
  return clamped > 0 ? clamped : DEFAULT_CHALLENGE_FALLBACK_REPS;
}

export function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function computeSummary(
  workout: ProgramWorkout,
  results: SessionResultsMap,
): {
  completedSets: number;
  totalReps: number;
  totalVolume: number;
} {
  let completedSets = 0;
  let totalReps = 0;
  let totalVolume = 0;
  for (const ex of workout.exercises) {
    for (const set of ex.sets) {
      const r = results[resultKey(ex.id, set.id)];
      if (r?.completed) {
        completedSets += 1;
        totalReps += r.actualReps;
        totalVolume += r.actualWeight * r.actualReps;
      }
    }
  }
  return { completedSets, totalReps, totalVolume };
}

export function hasAnyProgress(
  workout: ProgramWorkout,
  results: SessionResultsMap,
): boolean {
  for (const ex of workout.exercises) {
    for (const set of ex.sets) {
      const key = resultKey(ex.id, set.id);
      const r = results[key];
      if (!r) continue;
      if (r.completed) return true;
      const targetW = clampNonNegative(set.targetWeight ?? 0);
      const targetR = clampNonNegative(set.targetReps ?? 0);
      if (r.actualWeight !== targetW || r.actualReps !== targetR) return true;
    }
  }
  return false;
}

export function firstIncompleteIndex(
  flat: FlatSetRef[],
  results: SessionResultsMap,
): number {
  for (let i = 0; i < flat.length; i += 1) {
    const r = results[resultKey(flat[i].exerciseInstanceId, flat[i].setId)];
    if (!r?.completed) return i;
  }
  return flat.length; // all complete
}
