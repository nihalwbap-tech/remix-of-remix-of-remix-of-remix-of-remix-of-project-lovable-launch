import { useEffect, useId, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PROGRAM_NAME_MAX_LENGTH,
  type ProgramSummary,
  createDefaultProgram,
  loadPrograms,
  savePrograms,
} from "@/lib/coach-programs";

export function ProgramManager() {
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setPrograms(loadPrograms());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) savePrograms(programs);
  }, [programs, hydrated]);

  const handleCreate = (name: string) => {
    const program = createDefaultProgram(name);
    setPrograms((prev) => [...prev, program]);
    setDialogOpen(false);
  };

  return (
    <>
      <ul
        role="list"
        className="-mx-2 grid list-none grid-cols-2 gap-2 p-0 sm:mx-0 sm:grid-cols-3 md:grid-cols-4"
      >
        {programs.map((program) => (
          <li key={program.id} className="contents">
            <ProgramCard program={program} />
          </li>
        ))}
        <li className="contents">
          <CreateProgramTile onClick={() => setDialogOpen(true)} />
        </li>
      </ul>

      <CreateProgramDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={handleCreate} />
    </>
  );
}

function ProgramCard({ program }: { program: ProgramSummary }) {
  return (
    <Link
      to="/coach/programs/$programId"
      params={{ programId: program.id }}
      aria-label={`Open ${program.name}`}
      className="flex aspect-[17/23] flex-col overflow-hidden rounded-lg border border-border bg-card p-3 text-card-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:bg-accent/70"
    >
      <h3 className="text-base font-medium leading-tight [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:6] overflow-hidden break-words">
        {program.name}
      </h3>
    </Link>
  );
}

function CreateProgramTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Create new program"
      className="flex aspect-[17/23] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:bg-muted/70"
    >
      <Plus className="h-9 w-9" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

function CreateProgramDialog({
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

  const validate = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return "Please enter a program name.";
    if (trimmed.length > PROGRAM_NAME_MAX_LENGTH)
      return `Keep the name to ${PROGRAM_NAME_MAX_LENGTH} characters or fewer.`;
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    const err = validate(value);
    if (err) {
      setError(err);
      return;
    }
    onCreate(trimmed);
  };

  const trimmedLength = value.trim().length;
  const isInvalid = trimmedLength === 0 || trimmedLength > PROGRAM_NAME_MAX_LENGTH;

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
          <DialogTitle>Create program</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="program-name">Program name</Label>
            <Input
              id="program-name"
              ref={inputRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Upper Body Strength"
              maxLength={PROGRAM_NAME_MAX_LENGTH + 20}
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
            <Button type="submit" disabled={isInvalid}>
              Create program
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
