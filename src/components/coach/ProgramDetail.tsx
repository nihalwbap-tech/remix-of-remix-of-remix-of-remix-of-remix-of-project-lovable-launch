import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type DayAssignment,
  type ProgramSummary,
  type Weekday,
  getOrderedWeekdays,
  getWeekdayLabel,
  isRestDay,
  loadPrograms,
  savePrograms,
} from "@/lib/coach-programs";
import { ProgramWorkoutsSection } from "./ProgramWorkoutsSection";

const WEEKDAYS: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function ProgramDetail({ programId }: { programId: string }) {
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrograms(loadPrograms());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) savePrograms(programs);
  }, [programs, hydrated]);

  const program = programs.find((p) => p.id === programId);

  if (!hydrated) {
    return null;
  }

  if (!program) {
    return <ProgramNotFound />;
  }

  const updateProgram = (updates: Partial<ProgramSummary>) => {
    setPrograms((prev) => prev.map((p) => (p.id === programId ? { ...p, ...updates } : p)));
  };

  const setFirstDayOfWeek = (firstDayOfWeek: Weekday) => {
    updateProgram({ firstDayOfWeek });
  };

  const assignDay = (weekday: Weekday, assignment: DayAssignment) => {
    updateProgram({
      dayAssignments: { ...program.dayAssignments, [weekday]: assignment },
    });
  };

  const clearDay = (weekday: Weekday) => {
    const nextAssignments = { ...program.dayAssignments };
    delete nextAssignments[weekday];
    updateProgram({ dayAssignments: nextAssignments });
  };

  return (
    <div className="space-y-6">
      <BackLink />
      <h1 className="text-2xl font-semibold tracking-tight">{program.name}</h1>
      <div className="max-w-md space-y-4">
        <FirstDaySelector value={program.firstDayOfWeek} onChange={setFirstDayOfWeek} />
        <DayRow program={program} onAssign={assignDay} onClear={clearDay} />
      </div>
      <ProgramWorkoutsSection programId={programId} />
    </div>
  );
}

function ProgramNotFound() {
  return (
    <div className="space-y-6">
      <BackLink />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Program not found</h1>
        <p className="text-sm text-muted-foreground">
          This program is not available in this browser.
        </p>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/coach/programs"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to Program Manager
    </Link>
  );
}

function FirstDaySelector({
  value,
  onChange,
}: {
  value: Weekday;
  onChange: (weekday: Weekday) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor="first-day-of-week" className="text-sm font-medium text-foreground">
        First day of the week
      </label>
      <Select value={value} onValueChange={(v) => onChange(v as Weekday)}>
        <SelectTrigger
          id="first-day-of-week"
          aria-label="First day of the week"
          className="h-10 w-36"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {WEEKDAYS.map((weekday) => (
            <SelectItem key={weekday} value={weekday}>
              {getWeekdayLabel(weekday).full}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DayRow({
  program,
  onAssign,
  onClear,
}: {
  program: ProgramSummary;
  onAssign: (weekday: Weekday, assignment: DayAssignment) => void;
  onClear: (weekday: Weekday) => void;
}) {
  const orderedDays = getOrderedWeekdays(program.firstDayOfWeek);

  return (
    <div role="group" aria-label="Weekly schedule" className="grid grid-cols-7 gap-1.5">
      {orderedDays.map((weekday) => (
        <DayItem
          key={weekday}
          weekday={weekday}
          assigned={isRestDay(program.dayAssignments, weekday)}
          onAssign={onAssign}
          onClear={onClear}
        />
      ))}
    </div>
  );
}

function DayItem({
  weekday,
  assigned,
  onAssign,
  onClear,
}: {
  weekday: Weekday;
  assigned: boolean;
  onAssign: (weekday: Weekday, assignment: DayAssignment) => void;
  onClear: (weekday: Weekday) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);
  const label = getWeekdayLabel(weekday);

  const handleRest = () => {
    onAssign(weekday, { type: "rest" });
    setDialogOpen(false);
  };

  const handleClear = () => {
    onClear(weekday);
    setDialogOpen(false);
  };

  const handleChooseWorkout = () => {
    setComingSoon(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setComingSoon(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        aria-label={
          assigned ? `${label.full}, rest day. Change assignment` : `Assign ${label.full}`
        }
        className={
          "flex h-24 flex-col items-center justify-between rounded-lg border px-1 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] " +
          (assigned
            ? "border-primary/50 bg-primary/10 text-foreground"
            : "border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground")
        }
      >
        <span className="text-xs font-medium">{label.short}</span>
        {assigned ? (
          <span className="text-xs font-medium">Rest</span>
        ) : (
          <Plus className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      <Dialog open={dialogOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-sm">
          {comingSoon ? (
            <>
              <DialogHeader>
                <DialogTitle>Workout selection coming soon</DialogTitle>
                <DialogDescription>
                  Workouts will be available to assign in a future update.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={handleClose}>Got it</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{label.full}</DialogTitle>
                <DialogDescription>
                  {assigned
                    ? "This day is currently a rest day. Choose what to assign."
                    : "Choose what to assign to this day."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <Button variant="outline" onClick={handleChooseWorkout}>
                  Choose workout
                </Button>
                <Button onClick={handleRest}>Rest day</Button>
              </div>
              <DialogFooter>
                {assigned && (
                  <Button variant="ghost" onClick={handleClear}>
                    Clear assignment
                  </Button>
                )}
                <Button variant="secondary" onClick={handleClose}>
                  Cancel
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
