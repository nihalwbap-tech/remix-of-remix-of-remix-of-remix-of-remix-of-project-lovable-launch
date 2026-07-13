import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type Exercise,
  loadExercises,
  searchExercises,
  sortExercisesByName,
} from "@/lib/coach-exercises";
import {
  DEFAULT_CHALLENGE_TARGET_REPS,
  EXERCISE_NOTES_MAX_LENGTH,
  INTENSITIES,
  INTENSITY_LABELS,
  type Intensity,
  type ProgramWorkout,
  SET_TYPES,
  SET_TYPE_LABELS,
  type SetType,
  type WorkoutExercisePrescription,
  type WorkoutSetPrescription,
  createDefaultSet,
  createExerciseInstance,
  loadWorkouts,
  saveWorkouts,
  touchWorkout,
} from "@/lib/coach-workouts";

export function WorkoutBuilder({
  programId,
  workoutId,
}: {
  programId: string;
  workoutId: string;
}) {
  const [workouts, setWorkouts] = useState<ProgramWorkout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setWorkouts(loadWorkouts());
    setExercises(loadExercises());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveWorkouts(workouts);
  }, [workouts, hydrated]);

  const workout = workouts.find((w) => w.id === workoutId && w.programId === programId);
  const exercisesById = useMemo(() => {
    const m = new Map<string, Exercise>();
    for (const e of exercises) m.set(e.id, e);
    return m;
  }, [exercises]);

  if (!hydrated) return null;
  if (!workout) return <WorkoutNotFound programId={programId} />;

  const update = (fn: (w: ProgramWorkout) => ProgramWorkout) => {
    setWorkouts((prev) =>
      prev.map((w) => (w.id === workoutId ? touchWorkout(fn(w)) : w)),
    );
  };

  const addExercises = (ids: string[]) => {
    update((w) => ({
      ...w,
      exercises: [...w.exercises, ...ids.map(createExerciseInstance)],
    }));
    setPickerOpen(false);
  };

  const removeExercise = (instanceId: string) => {
    update((w) => ({ ...w, exercises: w.exercises.filter((e) => e.id !== instanceId) }));
  };

  const moveExercise = (instanceId: string, direction: -1 | 1) => {
    update((w) => {
      const idx = w.exercises.findIndex((e) => e.id === instanceId);
      if (idx === -1) return w;
      const target = idx + direction;
      if (target < 0 || target >= w.exercises.length) return w;
      const next = [...w.exercises];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return { ...w, exercises: next };
    });
  };

  const updateExercise = (
    instanceId: string,
    fn: (e: WorkoutExercisePrescription) => WorkoutExercisePrescription,
  ) => {
    update((w) => ({
      ...w,
      exercises: w.exercises.map((e) => (e.id === instanceId ? fn(e) : e)),
    }));
  };

  return (
    <div className="space-y-6">
      <Link
        to="/coach/programs/$programId"
        params={{ programId }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to program
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{workout.name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">Changes save automatically.</p>
      </div>

      {workout.exercises.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No exercises yet.</p>
          <Button className="mt-4" onClick={() => setPickerOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add exercises
          </Button>
        </div>
      ) : (
        <ul role="list" className="space-y-4">
          {workout.exercises.map((instance, idx) => (
            <li key={instance.id}>
              <ExerciseCard
                instance={instance}
                exercise={exercisesById.get(instance.exerciseId)}
                index={idx}
                total={workout.exercises.length}
                onMove={(dir) => moveExercise(instance.id, dir)}
                onRemove={() => removeExercise(instance.id)}
                onChange={(fn) => updateExercise(instance.id, fn)}
              />
            </li>
          ))}
        </ul>
      )}

      {workout.exercises.length > 0 && (
        <Button variant="outline" onClick={() => setPickerOpen(true)} className="w-full">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add exercises
        </Button>
      )}

      <ExercisePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        exercises={exercises}
        onAdd={addExercises}
      />
    </div>
  );
}

function WorkoutNotFound({ programId }: { programId: string }) {
  return (
    <div className="space-y-6">
      <Link
        to="/coach/programs/$programId"
        params={{ programId }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to program
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workout not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This workout is not available in this browser.
        </p>
      </div>
    </div>
  );
}

function ExerciseCard({
  instance,
  exercise,
  index,
  total,
  onMove,
  onRemove,
  onChange,
}: {
  instance: WorkoutExercisePrescription;
  exercise: Exercise | undefined;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onChange: (fn: (e: WorkoutExercisePrescription) => WorkoutExercisePrescription) => void;
}) {
  const addSet = () => {
    onChange((e) => ({
      ...e,
      sets: [...e.sets, createDefaultSet(e.sets[e.sets.length - 1])],
    }));
  };

  const removeSet = (setId: string) => {
    onChange((e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }));
  };

  const updateSet = (setId: string, patch: Partial<WorkoutSetPrescription>) => {
    onChange((e) => ({
      ...e,
      sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    }));
  };

  const updateNotes = (notes: string) => {
    onChange((e) => ({ ...e, notes: notes.trim().length > 0 ? notes : undefined }));
  };

  return (
    <article className="rounded-lg border border-border bg-card p-4 text-card-foreground">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-medium">
            {exercise ? exercise.name : "Unknown exercise"}
          </h3>
          {!exercise && (
            <p className="mt-0.5 text-xs text-destructive">
              Missing from library. Remove or re-add.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move up"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move down"
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label="Remove exercise"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <div className="mt-4 space-y-3">
        {instance.sets.map((set, i) => (
          <SetRow
            key={set.id}
            index={i}
            set={set}
            canRemove={instance.sets.length > 1}
            onChange={(patch) => updateSet(set.id, patch)}
            onRemove={() => removeSet(set.id)}
          />
        ))}
        <Button variant="outline" size="sm" onClick={addSet} className="w-full">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add set
        </Button>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label
          htmlFor={`notes-${instance.id}`}
          className="text-xs font-medium text-muted-foreground"
        >
          Notes
        </Label>
        <Textarea
          id={`notes-${instance.id}`}
          value={instance.notes ?? ""}
          onChange={(e) => updateNotes(e.target.value)}
          placeholder="Cues or coaching notes"
          rows={2}
          maxLength={EXERCISE_NOTES_MAX_LENGTH}
        />
      </div>
    </article>
  );
}

function SetRow({
  index,
  set,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  set: WorkoutSetPrescription;
  canRemove: boolean;
  onChange: (patch: Partial<WorkoutSetPrescription>) => void;
  onRemove: () => void;
}) {
  const numberOrUndef = (raw: string): number | undefined => {
    if (raw.trim() === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  const handleSetType = (v: SetType) => {
    const patch: Partial<WorkoutSetPrescription> = { setType: v };
    if (v === "challenge" && set.challengeTargetReps === undefined) {
      patch.challengeTargetReps = DEFAULT_CHALLENGE_TARGET_REPS;
    }
    onChange(patch);
  };

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Set {index + 1}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove set ${index + 1}`}
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label
            htmlFor={`weight-${set.id}`}
            className="text-xs font-medium text-muted-foreground"
          >
            Weight
          </Label>
          <Input
            id={`weight-${set.id}`}
            type="number"
            inputMode="decimal"
            step="any"
            value={set.targetWeight ?? ""}
            onChange={(e) => onChange({ targetWeight: numberOrUndef(e.target.value) })}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor={`reps-${set.id}`}
            className="text-xs font-medium text-muted-foreground"
          >
            Reps
          </Label>
          <Input
            id={`reps-${set.id}`}
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={set.targetReps ?? ""}
            onChange={(e) => onChange({ targetReps: numberOrUndef(e.target.value) })}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Type</Label>
          <Select value={set.setType} onValueChange={(v) => handleSetType(v as SetType)}>
            <SelectTrigger className="h-9" aria-label="Set type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SET_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {SET_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">Intensity</Label>
          <Select
            value={set.intensity ?? ""}
            onValueChange={(v) => onChange({ intensity: v as Intensity })}
          >
            <SelectTrigger className="h-9" aria-label="Intensity">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {INTENSITIES.map((i) => (
                <SelectItem key={i} value={i}>
                  {INTENSITY_LABELS[i]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label
            htmlFor={`rest-${set.id}`}
            className="text-xs font-medium text-muted-foreground"
          >
            Rest (sec)
          </Label>
          <Input
            id={`rest-${set.id}`}
            type="number"
            inputMode="numeric"
            step="15"
            min="0"
            value={set.restSeconds ?? ""}
            onChange={(e) => onChange({ restSeconds: numberOrUndef(e.target.value) })}
            className="h-9"
          />
        </div>
        {set.setType === "challenge" && (
          <div className="space-y-1">
            <Label
              htmlFor={`challenge-${set.id}`}
              className="text-xs font-medium text-muted-foreground"
            >
              Challenge total
            </Label>
            <Input
              id={`challenge-${set.id}`}
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              value={set.challengeTargetReps ?? ""}
              onChange={(e) =>
                onChange({ challengeTargetReps: numberOrUndef(e.target.value) })
              }
              className="h-9"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ExercisePickerDialog({
  open,
  onOpenChange,
  exercises,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
  onAdd: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected([]);
    }
  }, [open]);

  const sorted = useMemo(() => sortExercisesByName(exercises), [exercises]);
  const results = useMemo(() => searchExercises(sorted, query), [sorted, query]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAdd = () => {
    if (selected.length === 0) return;
    onAdd(selected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add exercises</DialogTitle>
          <DialogDescription>Select one or more from your library.</DialogDescription>
        </DialogHeader>

        {exercises.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Your Exercise Library is empty. Add exercises there first.
          </div>
        ) : (
          <>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search exercises"
                className="pl-9"
              />
            </div>
            <ul
              role="list"
              className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border"
            >
              {results.length === 0 ? (
                <li className="p-4 text-center text-sm text-muted-foreground">
                  No exercises match.
                </li>
              ) : (
                results.map((e) => {
                  const isSelected = selected.includes(e.id);
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => toggle(e.id)}
                        aria-pressed={isSelected}
                        className={
                          "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset " +
                          (isSelected
                            ? "bg-primary/10 text-foreground"
                            : "hover:bg-accent hover:text-accent-foreground")
                        }
                      >
                        <span className="min-w-0 truncate font-medium">{e.name}</span>
                        <span
                          aria-hidden="true"
                          className={
                            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border " +
                            (isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border")
                          }
                        >
                          {isSelected && (
                            <span className="text-[10px] font-bold leading-none">✓</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={selected.length === 0}>
            Add {selected.length > 0 ? `(${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
