import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
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
import {
  type Exercise,
  createExercise,
  loadExercises,
  saveExercises,
  searchExercises,
  sortExercisesByName,
} from "@/lib/coach-exercises";
import { ExerciseFormDialog } from "./ExerciseFormDialog";

export function ExerciseLibrary() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Exercise | null>(null);

  useEffect(() => {
    setExercises(loadExercises());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveExercises(exercises);
  }, [exercises, hydrated]);

  const sorted = useMemo(() => sortExercisesByName(exercises), [exercises]);
  const results = useMemo(() => searchExercises(sorted, query), [sorted, query]);

  const handleCreate = (input: { name: string; tags: string[]; description?: string }) => {
    setExercises((prev) => [...prev, createExercise(input)]);
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
    setPendingDelete(null);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Exercise Library
          </h1>
          {hydrated && (
            <p className="mt-1 text-sm text-muted-foreground">
              {exercises.length === 0
                ? "No exercises yet"
                : `${exercises.length} exercise${exercises.length === 1 ? "" : "s"}`}
            </p>
          )}
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </Button>
      </div>

      {hydrated && exercises.length > 0 && (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or tag"
            aria-label="Search exercises"
            className="pl-9"
          />
        </div>
      )}

      {!hydrated ? null : exercises.length === 0 ? (
        <EmptyState onAdd={() => setDialogOpen(true)} />
      ) : results.length === 0 ? (
        <NoResultsState query={query} />
      ) : (
        <ul role="list" className="divide-y divide-border rounded-lg border border-border">
          {results.map((ex) => (
            <li key={ex.id}>
              <ExerciseRow exercise={ex} onDelete={() => setPendingDelete(ex)} />
            </li>
          ))}
        </ul>
      )}

      <ExerciseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={handleCreate}
      />

      <Dialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete exercise?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.name}" will be removed from your library.`
                : ""}
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <h2 className="text-base font-medium text-foreground">No exercises yet</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
        Build up your library by adding the exercises you program for clients.
      </p>
      <Button onClick={onAdd} className="mt-6">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add your first exercise
      </Button>
    </div>
  );
}

function NoResultsState({ query }: { query: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="text-sm text-muted-foreground">
        No exercises match &ldquo;{query}&rdquo;.
      </p>
    </div>
  );
}

function ExerciseRow({ exercise, onDelete }: { exercise: Exercise; onDelete: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-foreground">{exercise.name}</h3>
        {exercise.tags.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="Tags">
            {exercise.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
        {exercise.description && (
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {exercise.description}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        aria-label={`Delete ${exercise.name}`}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function CreateExerciseDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: { name: string; tags: string[]; description?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  useEffect(() => {
    if (!open) {
      setName("");
      setTagsRaw("");
      setDescription("");
      setError(null);
    }
  }, [open]);

  const parsedTags = useMemo(() => parseTagsInput(tagsRaw), [tagsRaw]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError("Please enter an exercise name.");
      return;
    }
    if (trimmed.length > EXERCISE_NAME_MAX_LENGTH) {
      setError(`Keep the name to ${EXERCISE_NAME_MAX_LENGTH} characters or fewer.`);
      return;
    }
    if (description.length > EXERCISE_DESCRIPTION_MAX_LENGTH) {
      setError(`Description must be ${EXERCISE_DESCRIPTION_MAX_LENGTH} characters or fewer.`);
      return;
    }
    onCreate({
      name: trimmed,
      tags: parsedTags,
      description: description.trim() || undefined,
    });
  };

  const disabled = name.trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-sm"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          nameRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Add exercise</DialogTitle>
          <DialogDescription>
            Name it now. Tags and a description are optional.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="exercise-name">Name</Label>
            <Input
              id="exercise-name"
              ref={nameRef}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Barbell Back Squat"
              maxLength={EXERCISE_NAME_MAX_LENGTH + 20}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exercise-tags">Tags</Label>
            <Input
              id="exercise-tags"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="quads, glutes, barbell"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Separate with commas or slashes. Up to {EXERCISE_MAX_TAGS} tags.
            </p>
            {parsedTags.length > 0 && (
              <ul className="flex flex-wrap gap-1" aria-label="Parsed tags preview">
                {parsedTags.map((t) => (
                  <li
                    key={t}
                    className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="exercise-description">Description (optional)</Label>
            <Textarea
              id="exercise-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cues, setup notes, or coaching reminders."
              maxLength={EXERCISE_DESCRIPTION_MAX_LENGTH + 50}
              rows={3}
            />
          </div>
          {error && (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={disabled}>
              Add exercise
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
