import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
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
import {
  type ProgramWorkout,
  WORKOUT_NAME_MAX_LENGTH,
  createWorkout,
  loadWorkouts,
  saveWorkouts,
  workoutsForProgram,
} from "@/lib/coach-workouts";

export function ProgramWorkoutsSection({ programId }: { programId: string }) {
  const [workouts, setWorkouts] = useState<ProgramWorkout[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ProgramWorkout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setWorkouts(loadWorkouts());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveWorkouts(workouts);
  }, [workouts, hydrated]);

  const programWorkouts = useMemo(
    () => workoutsForProgram(workouts, programId),
    [workouts, programId],
  );

  const handleCreate = (name: string) => {
    const workout = createWorkout({ programId, name });
    const next = [...workouts, workout];
    saveWorkouts(next);
    setWorkouts(next);
    setDialogOpen(false);
    void navigate({
      to: "/coach/programs/$programId/workouts/$workoutId",
      params: { programId, workoutId: workout.id },
    });
  };

  const handleDelete = (id: string) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    setPendingDelete(null);
  };

  return (
    <section aria-labelledby="workouts-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="workouts-heading" className="text-lg font-semibold text-foreground">
          Workouts
        </h2>
        {hydrated && programWorkouts.length > 0 && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add
          </Button>
        )}
      </div>

      {!hydrated ? null : programWorkouts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No workouts in this program yet.</p>
          <Button className="mt-4" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create workout
          </Button>
        </div>
      ) : (
        <ul role="list" className="divide-y divide-border rounded-lg border border-border">
          {programWorkouts.map((w) => (
            <li key={w.id} className="flex items-center gap-1 pr-2">
              <Link
                to="/coach/programs/$programId/workouts/$workoutId"
                params={{ programId, workoutId: w.id }}
                className="min-w-0 flex-1 truncate px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                {w.name}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPendingDelete(w)}
                aria-label={`Delete ${w.name}`}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <CreateWorkoutDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={handleCreate} />

      <Dialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete workout?</DialogTitle>
            <DialogDescription>
              {pendingDelete ? `"${pendingDelete.name}" will be removed from this program.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingDelete && handleDelete(pendingDelete.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function CreateWorkoutDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  useEffect(() => {
    if (!open) {
      setValue("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setError("Please enter a workout name.");
      return;
    }
    if (trimmed.length > WORKOUT_NAME_MAX_LENGTH) {
      setError(`Keep the name to ${WORKOUT_NAME_MAX_LENGTH} characters or fewer.`);
      return;
    }
    onCreate(trimmed);
  };

  const trimmedLength = value.trim().length;
  const disabled = trimmedLength === 0 || trimmedLength > WORKOUT_NAME_MAX_LENGTH;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-sm"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Create workout</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="workout-name">Workout name</Label>
            <Input
              id="workout-name"
              ref={inputRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Push Day A"
              maxLength={WORKOUT_NAME_MAX_LENGTH + 20}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              autoComplete="off"
            />
            {error && (
              <p id={errorId} role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={disabled}>
              Create workout
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
