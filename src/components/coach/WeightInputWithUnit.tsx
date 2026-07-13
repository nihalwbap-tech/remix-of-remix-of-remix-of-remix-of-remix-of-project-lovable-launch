import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  WEIGHT_UNIT_LONG_FORM_MAX_LENGTH,
  WEIGHT_UNIT_SHORT_FORM_MAX_LENGTH,
  type WeightUnit,
  createCustomWeightUnit,
  getWeightUnit,
} from "@/lib/coach-weight-units";
import { cn } from "@/lib/utils";

export function WeightInputWithUnit({
  id,
  value,
  onValueChange,
  unitId,
  units,
  onUnitChange,
  onCreateUnit,
}: {
  id: string;
  value: number | undefined;
  onValueChange: (value: number | undefined) => void;
  unitId: string;
  units: WeightUnit[];
  onUnitChange: (unitId: string) => void;
  onCreateUnit: (unit: WeightUnit) => void;
}) {
  const selectedUnit = getWeightUnit(units, unitId);

  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step="any"
        min="0"
        value={value ?? ""}
        onChange={(event) => {
          const raw = event.target.value.trim();
          if (raw === "") {
            onValueChange(undefined);
            return;
          }
          const number = Number(raw);
          onValueChange(Number.isFinite(number) && number >= 0 ? number : undefined);
        }}
        className="h-9 pr-24"
      />
      <WeightUnitSelector
        value={selectedUnit.id}
        units={units}
        onChange={onUnitChange}
        onCreate={onCreateUnit}
      />
    </div>
  );
}

function WeightUnitSelector({
  value,
  units,
  onChange,
  onCreate,
}: {
  value: string;
  units: WeightUnit[];
  onChange: (unitId: string) => void;
  onCreate: (unit: WeightUnit) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const selectedUnit = getWeightUnit(units, value);

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Weight unit ${selectedUnit.longForm}`}
            className="absolute inset-y-0 right-0 inline-flex items-center gap-1 rounded-r-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <span className="max-w-10 truncate">{selectedUnit.shortForm}</span>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-2">
          <div role="listbox" aria-label="Weight unit" className="space-y-1">
            {units.map((unit) => {
              const selected = unit.id === selectedUnit.id;
              return (
                <button
                  key={unit.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(unit.id);
                    setPopoverOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected && "bg-accent",
                  )}
                >
                  <span>{unit.longForm}</span>
                  {selected && <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <div className="mt-2 border-t border-border pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setPopoverOpen(false);
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add custom unit
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <CreateWeightUnitDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        existingUnits={units}
        onCreate={(unit) => {
          onCreate(unit);
          onChange(unit.id);
          setCreateOpen(false);
        }}
      />
    </>
  );
}

function CreateWeightUnitDialog({
  open,
  onOpenChange,
  existingUnits,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingUnits: WeightUnit[];
  onCreate: (unit: WeightUnit) => void;
}) {
  const [longForm, setLongForm] = useState("");
  const [shortForm, setShortForm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const longFormRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  useEffect(() => {
    if (!open) {
      setLongForm("");
      setShortForm("");
      setError(null);
    }
  }, [open]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanLong = longForm.trim().replace(/\s+/g, " ");
    const cleanShort = shortForm.trim().replace(/\s+/g, " ");
    if (!cleanLong || !cleanShort) {
      setError("Enter both a long form and a short form.");
      return;
    }
    const duplicate = existingUnits.some(
      (unit) =>
        unit.longForm.toLowerCase() === cleanLong.toLowerCase() ||
        unit.shortForm.toLowerCase() === cleanShort.toLowerCase(),
    );
    if (duplicate) {
      setError("A unit with that long form or short form already exists.");
      return;
    }
    onCreate(createCustomWeightUnit(cleanLong, cleanShort));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-sm"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          longFormRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Add custom unit</DialogTitle>
          <DialogDescription>
            The short form appears inside weight fields. The long form appears in the unit list.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="weight-unit-long-form">Long form</Label>
            <Input
              id="weight-unit-long-form"
              ref={longFormRef}
              value={longForm}
              onChange={(event) => {
                setLongForm(event.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Resistance band level"
              maxLength={WEIGHT_UNIT_LONG_FORM_MAX_LENGTH}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weight-unit-short-form">Short form</Label>
            <Input
              id="weight-unit-short-form"
              value={shortForm}
              onChange={(event) => {
                setShortForm(event.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. band"
              maxLength={WEIGHT_UNIT_SHORT_FORM_MAX_LENGTH}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
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
            <Button type="submit" disabled={!longForm.trim() || !shortForm.trim()}>
              Add unit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
