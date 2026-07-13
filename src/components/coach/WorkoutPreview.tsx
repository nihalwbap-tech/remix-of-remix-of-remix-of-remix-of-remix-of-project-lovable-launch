import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Flag,
  Minus,
  Pause,
  Plus,
  RotateCcw,
  SkipForward,
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
import { type Exercise, loadExercises } from "@/lib/coach-exercises";
import {
  type WeightUnit,
  getAllWeightUnits,
  getWeightUnit,
  loadCustomWeightUnits,
} from "@/lib/coach-weight-units";
import {
  INTENSITY_LABELS,
  type ProgramWorkout,
  SET_TYPE_LABELS,
  formatRepPrescription,
  loadWorkouts,
} from "@/lib/coach-workouts";
import {
  type FlatSetRef,
  type PreviewSetResult,
  type SessionResultsMap,
  clampNonNegative,
  computeSummary,
  firstIncompleteIndex,
  flattenSets,
  formatElapsed,
  hasAnyProgress,
  hasAnyValidSet,
  initSessionResults,
  restSecondsFor,
  resultKey,
} from "@/lib/coach-workout-preview";

type Mode = "chooser" | "classic" | "guided" | "summary";

type Action =
  | { type: "set-result"; key: string; patch: Partial<PreviewSetResult> }
  | { type: "toggle-complete"; key: string }
  | { type: "mark-complete"; key: string; actualReps?: number; actualWeight?: number }
  | { type: "reset"; results: SessionResultsMap };

function resultsReducer(state: SessionResultsMap, action: Action): SessionResultsMap {
  switch (action.type) {
    case "set-result": {
      const existing = state[action.key];
      if (!existing) return state;
      return { ...state, [action.key]: { ...existing, ...action.patch } };
    }
    case "toggle-complete": {
      const existing = state[action.key];
      if (!existing) return state;
      return {
        ...state,
        [action.key]: { ...existing, completed: !existing.completed },
      };
    }
    case "mark-complete": {
      const existing = state[action.key];
      if (!existing) return state;
      return {
        ...state,
        [action.key]: {
          ...existing,
          actualReps: action.actualReps ?? existing.actualReps,
          actualWeight: action.actualWeight ?? existing.actualWeight,
          completed: true,
        },
      };
    }
    case "reset":
      return action.results;
  }
}

export function WorkoutPreview({ programId, workoutId }: { programId: string; workoutId: string }) {
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<ProgramWorkout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [weightUnits, setWeightUnits] = useState<WeightUnit[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const all = loadWorkouts();
    const found = all.find((w) => w.id === workoutId && w.programId === programId) ?? null;
    setWorkout(found);
    setExercises(loadExercises());
    setWeightUnits(getAllWeightUnits(loadCustomWeightUnits()));
    setHydrated(true);
  }, [programId, workoutId]);

  const goBack = useCallback(() => {
    void navigate({
      to: "/coach/programs/$programId/workouts/$workoutId",
      params: { programId, workoutId },
    });
  }, [navigate, programId, workoutId]);

  if (!hydrated) {
    return <FullscreenSurface>{null}</FullscreenSurface>;
  }

  if (!workout || !hasAnyValidSet(workout)) {
    return (
      <FullscreenSurface>
        <div className="mx-auto flex min-h-full max-w-md flex-col items-start justify-center gap-4 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Nothing to preview</h1>
          <p className="text-sm text-muted-foreground">
            {workout
              ? "This workout has no prescribed sets yet."
              : "This workout is not available in this browser."}
          </p>
          <Button onClick={goBack} variant="outline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to builder
          </Button>
        </div>
      </FullscreenSurface>
    );
  }

  return (
    <PreviewSession
      workout={workout}
      exercises={exercises}
      weightUnits={weightUnits}
      onExit={goBack}
    />
  );
}

function PreviewSession({
  workout,
  exercises,
  weightUnits,
  onExit,
}: {
  workout: ProgramWorkout;
  exercises: Exercise[];
  weightUnits: WeightUnit[];
  onExit: () => void;
}) {
  const initialResults = useMemo(() => initSessionResults(workout), [workout]);
  const [results, dispatch] = useReducer(resultsReducer, initialResults);
  const [mode, setMode] = useState<Mode>("chooser");
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [guidedIndex, setGuidedIndex] = useState(0);
  const [inRest, setInRest] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  const flat = useMemo(() => flattenSets(workout), [workout]);
  const exercisesById = useMemo(() => {
    const m = new Map<string, Exercise>();
    for (const e of exercises) m.set(e.id, e);
    return m;
  }, [exercises]);
  const weightUnitsById = useMemo(
    () => new Map(weightUnits.map((unit) => [unit.id, unit])),
    [weightUnits],
  );

  // shared elapsed timer
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const dirty = hasAnyProgress(workout, results);

  const requestExit = useCallback(() => {
    if (!dirty) {
      onExit();
      return;
    }
    setExitOpen(true);
  }, [dirty, onExit]);

  const startMode = (next: "classic" | "guided") => {
    setRunning(true);
    if (next === "guided") {
      setGuidedIndex(firstIncompleteIndex(flat, results));
      setInRest(false);
    }
    setMode(next);
  };

  const switchMode = (next: "classic" | "guided") => {
    if (next === "guided") {
      setGuidedIndex(firstIncompleteIndex(flat, results));
      setInRest(false);
    }
    setMode(next);
  };

  const openSummary = () => {
    setRunning(false);
    setMode("summary");
  };

  const restart = () => {
    dispatch({ type: "reset", results: initSessionResults(workout) });
    setElapsed(0);
    setRunning(false);
    setGuidedIndex(0);
    setInRest(false);
    setMode("chooser");
  };

  return (
    <FullscreenSurface>
      {mode === "chooser" && (
        <ModeChooser
          workoutName={workout.name}
          onPickClassic={() => startMode("classic")}
          onPickGuided={() => startMode("guided")}
          onBack={requestExit}
        />
      )}
      {mode === "classic" && (
        <ClassicMode
          workout={workout}
          exercisesById={exercisesById}
          weightUnitsById={weightUnitsById}
          results={results}
          dispatch={dispatch}
          elapsed={elapsed}
          onSwitchGuided={() => switchMode("guided")}
          onFinish={openSummary}
          onExit={requestExit}
        />
      )}
      {mode === "guided" && (
        <GuidedMode
          workout={workout}
          flat={flat}
          exercisesById={exercisesById}
          weightUnitsById={weightUnitsById}
          results={results}
          dispatch={dispatch}
          elapsed={elapsed}
          index={guidedIndex}
          setIndex={setGuidedIndex}
          inRest={inRest}
          setInRest={setInRest}
          onSwitchClassic={() => switchMode("classic")}
          onFinish={openSummary}
          onExit={requestExit}
        />
      )}
      {mode === "summary" && (
        <SummaryScreen
          workout={workout}
          weightUnits={weightUnits}
          results={results}
          elapsed={elapsed}
          onAgain={restart}
          onBack={onExit}
        />
      )}

      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Exit preview?</DialogTitle>
            <DialogDescription>Preview results will be discarded.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitOpen(false)}>
              Continue preview
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setExitOpen(false);
                onExit();
              }}
            >
              Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FullscreenSurface>
  );
}

function FullscreenSurface({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background text-foreground motion-reduce:transition-none"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      role="region"
      aria-label="Workout preview"
    >
      {children}
    </div>
  );
}

function ModeChooser({
  workoutName,
  onPickClassic,
  onPickGuided,
  onBack,
}: {
  workoutName: string;
  onPickClassic: () => void;
  onPickGuided: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-between gap-8 p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Previewing
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{workoutName}</h1>
        <p className="mt-6 text-sm text-foreground">How do you want to preview this workout?</p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onPickGuided}
          className="group rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-semibold">Guided Mode</span>
            <ChevronRight
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Move through one set at a time with rest timers.
          </p>
        </button>
        <button
          type="button"
          onClick={onPickClassic}
          className="group rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-semibold">Classic Mode</span>
            <ChevronRight
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            See every exercise and log sets freely.
          </p>
        </button>

        <Button variant="ghost" onClick={onBack} className="mt-2 self-start">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to builder
        </Button>
      </div>
    </div>
  );
}

function PreviewHeader({
  title,
  subtitle,
  elapsed,
  right,
  onExit,
}: {
  title: string;
  subtitle?: string;
  elapsed: number;
  right: React.ReactNode;
  onExit: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium tabular-nums text-foreground"
            aria-label={`Elapsed ${formatElapsed(elapsed)}`}
          >
            {formatElapsed(elapsed)}
          </span>
          {right}
          <Button variant="ghost" size="icon" onClick={onExit} aria-label="Exit preview">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function ClassicMode({
  workout,
  exercisesById,
  weightUnitsById,
  results,
  dispatch,
  elapsed,
  onSwitchGuided,
  onFinish,
  onExit,
}: {
  workout: ProgramWorkout;
  exercisesById: Map<string, Exercise>;
  weightUnitsById: Map<string, WeightUnit>;
  results: SessionResultsMap;
  dispatch: React.Dispatch<Action>;
  elapsed: number;
  onSwitchGuided: () => void;
  onFinish: () => void;
  onExit: () => void;
}) {
  return (
    <>
      <PreviewHeader
        title={workout.name}
        subtitle="Classic preview"
        elapsed={elapsed}
        right={
          <Button size="sm" variant="outline" onClick={onSwitchGuided}>
            Guided
          </Button>
        }
        onExit={onExit}
      />
      <div className="mx-auto w-full max-w-md space-y-5 p-4">
        {workout.exercises.map((ex, exIdx) => {
          const def = exercisesById.get(ex.exerciseId);
          return (
            <section
              key={ex.id}
              aria-labelledby={`ex-${ex.id}-h`}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 id={`ex-${ex.id}-h`} className="text-base font-semibold">
                  <span className="text-muted-foreground">{exIdx + 1}.</span>{" "}
                  {def ? def.name : "Unknown exercise"}
                </h2>
              </div>
              {ex.notes && (
                <p className="mt-1.5 whitespace-pre-line text-xs text-muted-foreground">
                  {ex.notes}
                </p>
              )}
              <ul role="list" className="mt-3 space-y-2">
                {ex.sets.map((set, setIdx) => {
                  const key = resultKey(ex.id, set.id);
                  const result = results[key];
                  if (!result) return null;
                  return (
                    <li key={set.id}>
                      <ClassicSetRow
                        setIndex={setIdx}
                        set={set}
                        weightUnit={
                          weightUnitsById.get(set.weightUnitId) ??
                          getWeightUnit([], set.weightUnitId)
                        }
                        result={result}
                        onWeight={(v) =>
                          dispatch({
                            type: "set-result",
                            key,
                            patch: { actualWeight: clampNonNegative(v) },
                          })
                        }
                        onReps={(v) =>
                          dispatch({
                            type: "set-result",
                            key,
                            patch: { actualReps: clampNonNegative(v) },
                          })
                        }
                        onToggle={() => dispatch({ type: "toggle-complete", key })}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <Button className="w-full" onClick={onFinish}>
          <Flag className="h-4 w-4" aria-hidden="true" />
          Finish preview
        </Button>
      </div>
    </>
  );
}

function ClassicSetRow({
  setIndex,
  set,
  weightUnit,
  result,
  onWeight,
  onReps,
  onToggle,
}: {
  setIndex: number;
  set: import("@/lib/coach-workouts").WorkoutSetPrescription;
  weightUnit: WeightUnit;
  result: PreviewSetResult;
  onWeight: (n: number) => void;
  onReps: (n: number) => void;
  onToggle: () => void;
}) {
  const chips: string[] = [];
  chips.push(SET_TYPE_LABELS[set.setType]);
  if (set.intensity) chips.push(INTENSITY_LABELS[set.intensity]);
  const repPrescription = formatRepPrescription(set);
  if (repPrescription) chips.push(repPrescription);
  if (set.targetWeight !== undefined) {
    chips.push(`${set.targetWeight} ${weightUnit.shortForm}`);
  }
  if (set.restSeconds !== undefined) chips.push(`rest ${set.restSeconds}s`);

  return (
    <div
      className={
        "rounded-md border p-3 " +
        (result.completed ? "border-primary/60 bg-primary/5" : "border-border bg-background")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Set {setIndex + 1}</span>
        <Button
          type="button"
          size="sm"
          variant={result.completed ? "default" : "outline"}
          onClick={onToggle}
          aria-pressed={result.completed}
          aria-label={
            result.completed
              ? `Mark set ${setIndex + 1} incomplete`
              : `Complete set ${setIndex + 1}`
          }
          className="h-8"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          {result.completed ? "Completed" : "Complete"}
        </Button>
      </div>
      {chips.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1" aria-label="Prescription">
          {chips.map((c) => (
            <li
              key={c}
              className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
            >
              {c}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label
            htmlFor={`w-${result.setId}`}
            className="text-xs font-medium text-muted-foreground"
          >
            Actual weight
          </Label>
          <div className="relative">
            <Input
              id={`w-${result.setId}`}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={result.actualWeight}
              onChange={(e) => onWeight(Number(e.target.value))}
              className="h-9 pr-12"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground">
              {weightUnit.shortForm}
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <Label
            htmlFor={`r-${result.setId}`}
            className="text-xs font-medium text-muted-foreground"
          >
            Actual reps
          </Label>
          <Input
            id={`r-${result.setId}`}
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={result.actualReps}
            onChange={(e) => onReps(Number(e.target.value))}
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}

function GuidedMode({
  workout,
  flat,
  exercisesById,
  weightUnitsById,
  results,
  dispatch,
  elapsed,
  index,
  setIndex,
  inRest,
  setInRest,
  onSwitchClassic,
  onFinish,
  onExit,
}: {
  workout: ProgramWorkout;
  flat: FlatSetRef[];
  exercisesById: Map<string, Exercise>;
  weightUnitsById: Map<string, WeightUnit>;
  results: SessionResultsMap;
  dispatch: React.Dispatch<Action>;
  elapsed: number;
  index: number;
  setIndex: (index: number) => void;
  inRest: boolean;
  setInRest: (inRest: boolean) => void;
  onSwitchClassic: () => void;
  onFinish: () => void;
  onExit: () => void;
}) {
  useEffect(() => {
    if (index >= flat.length) onFinish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (index >= flat.length) return null;

  const currentRef = flat[index];
  const key = resultKey(currentRef.exerciseInstanceId, currentRef.setId);
  const currentResult = results[key];
  const definition = exercisesById.get(currentRef.exercise.exerciseId);

  const advance = () => {
    const nextIndex = findNextIncomplete(flat, results, index + 1);
    if (nextIndex >= flat.length) {
      onFinish();
      return;
    }
    setIndex(nextIndex);
    setInRest(false);
  };

  return (
    <>
      <PreviewHeader
        title={workout.name}
        subtitle={`Set ${index + 1} of ${flat.length}`}
        elapsed={elapsed}
        right={
          <Button size="sm" variant="outline" onClick={onSwitchClassic}>
            Classic
          </Button>
        }
        onExit={onExit}
      />
      {inRest ? (
        <RestPanel
          restSeconds={restSecondsFor(currentRef.set)}
          nextInfo={describeNext(flat, results, index, exercisesById)}
          onDone={advance}
          onSkip={advance}
        />
      ) : (
        <PerformPanel
          ref_={currentRef}
          def={definition}
          weightUnit={
            weightUnitsById.get(currentRef.set.weightUnitId) ??
            getWeightUnit([], currentRef.set.weightUnitId)
          }
          result={currentResult}
          onWeight={(value) =>
            dispatch({
              type: "set-result",
              key,
              patch: { actualWeight: clampNonNegative(value) },
            })
          }
          onReps={(value) =>
            dispatch({
              type: "set-result",
              key,
              patch: { actualReps: clampNonNegative(value) },
            })
          }
          onComplete={() => {
            dispatch({ type: "mark-complete", key });
            const nextIndex = findNextIncomplete(flat, results, index + 1);
            if (nextIndex >= flat.length) {
              onFinish();
              return;
            }
            if (restSecondsFor(currentRef.set) > 0) setInRest(true);
            else setIndex(nextIndex);
          }}
          onSkip={() => {
            const nextIndex = findNextIncomplete(flat, results, index + 1);
            if (nextIndex >= flat.length) {
              onFinish();
              return;
            }
            setIndex(nextIndex);
            setInRest(false);
          }}
        />
      )}
    </>
  );
}

function findNextIncomplete(flat: FlatSetRef[], results: SessionResultsMap, from: number): number {
  for (let i = from; i < flat.length; i += 1) {
    const r = results[resultKey(flat[i].exerciseInstanceId, flat[i].setId)];
    if (!r?.completed) return i;
  }
  return flat.length;
}

function describeNext(
  flat: FlatSetRef[],
  results: SessionResultsMap,
  fromIndex: number,
  exercisesById: Map<string, Exercise>,
): string {
  const nextIdx = findNextIncomplete(flat, results, fromIndex + 1);
  if (nextIdx >= flat.length) return "Last set complete";
  const ref = flat[nextIdx];
  const def = exercisesById.get(ref.exercise.exerciseId);
  return `Next: ${def?.name ?? "Exercise"} · Set ${ref.setIndex + 1}`;
}

function PerformPanel({
  ref_,
  def,
  weightUnit,
  result,
  onWeight,
  onReps,
  onComplete,
  onSkip,
}: {
  ref_: FlatSetRef;
  def: Exercise | undefined;
  weightUnit: WeightUnit;
  result: PreviewSetResult | undefined;
  onWeight: (number: number) => void;
  onReps: (number: number) => void;
  onComplete: () => void;
  onSkip: () => void;
}) {
  if (!result) return null;

  const { exercise, set, exerciseIndex, setIndex, totalSetsInExercise } = ref_;
  const chips: string[] = [SET_TYPE_LABELS[set.setType]];
  if (set.intensity) chips.push(INTENSITY_LABELS[set.intensity]);
  const repPrescription = formatRepPrescription(set);
  if (repPrescription) chips.push(repPrescription);
  if (set.targetWeight !== undefined) {
    chips.push(`${set.targetWeight} ${weightUnit.shortForm} target`);
  }
  if (set.restSeconds !== undefined) chips.push(`rest ${set.restSeconds}s`);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Exercise {exerciseIndex + 1} · Set {setIndex + 1} of {totalSetsInExercise}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          {def ? def.name : "Unknown exercise"}
        </h2>
        {exercise.notes && (
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{exercise.notes}</p>
        )}
        <ul className="mt-3 flex flex-wrap gap-1" aria-label="Prescription">
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
            >
              {chip}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor={`guided-weight-${set.id}`} className="text-xs text-muted-foreground">
            Actual weight
          </Label>
          <div className="relative">
            <Input
              id={`guided-weight-${set.id}`}
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={result.actualWeight}
              onChange={(event) => onWeight(Number(event.target.value))}
              className="h-11 pr-12 text-base"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground">
              {weightUnit.shortForm}
            </span>
          </div>
        </div>
        <RepsStepper
          id={`guided-reps-${set.id}`}
          label="Actual reps"
          value={result.actualReps}
          onChange={onReps}
        />
        <Button className="w-full" onClick={onComplete}>
          <Check className="h-4 w-4" aria-hidden="true" />
          Complete set
        </Button>
      </div>

      <Button variant="ghost" onClick={onSkip} className="self-center">
        <SkipForward className="h-4 w-4" aria-hidden="true" />
        Skip set
      </Button>
    </div>
  );
}

function RepsStepper({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Decrease reps"
          onClick={() => onChange(clampNonNegative(value - 1))}
          className="h-11 w-11 shrink-0"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={value}
          onChange={(e) => onChange(clampNonNegative(Number(e.target.value)))}
          className="h-11 text-center text-base"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Increase reps"
          onClick={() => onChange(clampNonNegative(value + 1))}
          className="h-11 w-11 shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function RestPanel({
  restSeconds,
  nextInfo,
  nextLabel = "Start next set",
  onDone,
  onSkip,
}: {
  restSeconds: number;
  nextInfo: string;
  nextLabel?: string;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [remaining, setRemaining] = useState(restSeconds);
  const remainingRef = useRef(remaining);
  remainingRef.current = remaining;

  useEffect(() => {
    setRemaining(restSeconds);
  }, [restSeconds]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const pct =
    restSeconds > 0
      ? Math.max(0, Math.min(100, ((restSeconds - remaining) / restSeconds) * 100))
      : 100;

  const done = remaining <= 0;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rest</p>
      <div
        className="text-6xl font-semibold tabular-nums"
        role="timer"
        aria-live="polite"
        aria-label={`Rest ${remaining} seconds remaining`}
      >
        {formatElapsed(remaining)}
      </div>
      <div
        className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label="Rest progress"
      >
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm text-muted-foreground">{nextInfo}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" onClick={() => setRemaining((r) => clampNonNegative(r - 15))}>
          <Minus className="h-4 w-4" aria-hidden="true" />
          15 sec
        </Button>
        <Button variant="outline" onClick={() => setRemaining((r) => r + 15)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          15 sec
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          <SkipForward className="h-4 w-4" aria-hidden="true" />
          Skip rest
        </Button>
      </div>
      {done && (
        <Button className="w-full max-w-xs" onClick={onDone}>
          <Pause className="h-4 w-4 rotate-90" aria-hidden="true" />
          {nextLabel}
        </Button>
      )}
    </div>
  );
}

function SummaryScreen({
  workout,
  weightUnits,
  results,
  elapsed,
  onAgain,
  onBack,
}: {
  workout: ProgramWorkout;
  weightUnits: WeightUnit[];
  results: SessionResultsMap;
  elapsed: number;
  onAgain: () => void;
  onBack: () => void;
}) {
  const { completedSets, totalReps, volumeByUnitId } = useMemo(
    () => computeSummary(workout, results),
    [workout, results],
  );
  const volume = Object.entries(volumeByUnitId)
    .map(([unitId, value]) => {
      const unit = getWeightUnit(weightUnits, unitId);
      const formatted = value % 1 === 0 ? `${value}` : value.toFixed(1);
      return `${formatted} ${unit.shortForm}`;
    })
    .join(" · ");

  const stats = [
    { label: "Duration", value: formatElapsed(elapsed) },
    { label: "Completed sets", value: `${completedSets}` },
    { label: "Total reps", value: `${totalReps}` },
    { label: "Total volume", value: volume || "0" },
  ];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-between gap-6 p-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Preview complete
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{workout.name}</h1>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd
              className={`mt-1 font-semibold tabular-nums ${
                s.label === "Total volume" ? "break-words text-lg" : "text-2xl"
              }`}
            >
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2">
        <Button onClick={onAgain} variant="outline">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Preview again
        </Button>
        <Button onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to builder
        </Button>
      </div>
    </div>
  );
}
