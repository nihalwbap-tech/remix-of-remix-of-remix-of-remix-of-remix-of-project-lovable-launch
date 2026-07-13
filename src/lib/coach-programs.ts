export type Weekday =
  "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

export type DayAssignment = {
  type: "rest";
};

export type ProgramSummary = {
  id: string;
  name: string;
  createdAt: string;
  firstDayOfWeek: Weekday;
  dayAssignments: Partial<Record<Weekday, DayAssignment>>;
};

export const PROGRAMS_STORAGE_KEY = "no-more-copium:coach-programs:v1";
export const PROGRAM_NAME_MAX_LENGTH = 80;

const WEEKDAYS: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const WEEKDAY_LABELS: Record<Weekday, { full: string; short: string }> = {
  sunday: { full: "Sunday", short: "Sun" },
  monday: { full: "Monday", short: "Mon" },
  tuesday: { full: "Tuesday", short: "Tue" },
  wednesday: { full: "Wednesday", short: "Wed" },
  thursday: { full: "Thursday", short: "Thu" },
  friday: { full: "Friday", short: "Fri" },
  saturday: { full: "Saturday", short: "Sat" },
};

export function isWeekday(value: unknown): value is Weekday {
  return typeof value === "string" && WEEKDAYS.includes(value as Weekday);
}

export function getWeekdayLabel(weekday: Weekday): { full: string; short: string } {
  return WEEKDAY_LABELS[weekday];
}

export function getOrderedWeekdays(firstDayOfWeek: Weekday): Weekday[] {
  const startIndex = WEEKDAYS.indexOf(firstDayOfWeek);
  if (startIndex === -1) return [...WEEKDAYS];
  return [...WEEKDAYS.slice(startIndex), ...WEEKDAYS.slice(0, startIndex)];
}

export function isRestDay(
  assignments: Partial<Record<Weekday, DayAssignment>>,
  weekday: Weekday,
): boolean {
  const assignment = assignments[weekday];
  return assignment?.type === "rest";
}

function isValidDayAssignment(value: unknown): value is DayAssignment {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.type === "rest";
}

function normalizeDayAssignments(value: unknown): Partial<Record<Weekday, DayAssignment>> {
  if (!value || typeof value !== "object") return {};
  const result: Partial<Record<Weekday, DayAssignment>> = {};
  const v = value as Record<string, unknown>;
  for (const key of Object.keys(v)) {
    if (!isWeekday(key)) continue;
    const assignment = v[key];
    if (isValidDayAssignment(assignment)) {
      result[key as Weekday] = assignment;
    }
  }
  return result;
}

function normalizeProgram(value: unknown): ProgramSummary | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  if (
    typeof v.id !== "string" ||
    v.id.length === 0 ||
    typeof v.name !== "string" ||
    v.name.length === 0 ||
    typeof v.createdAt !== "string" ||
    v.createdAt.length === 0
  ) {
    return null;
  }

  const firstDayOfWeek = isWeekday(v.firstDayOfWeek) ? v.firstDayOfWeek : "sunday";

  return {
    id: v.id,
    name: v.name,
    createdAt: v.createdAt,
    firstDayOfWeek,
    dayAssignments: normalizeDayAssignments(v.dayAssignments),
  };
}

export function loadPrograms(): ProgramSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROGRAMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeProgram).filter((p): p is ProgramSummary => p !== null);
  } catch {
    return [];
  }
}

export function savePrograms(programs: ProgramSummary[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROGRAMS_STORAGE_KEY, JSON.stringify(programs));
  } catch {
    // ignore quota / access errors
  }
}

export function createProgramId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultProgram(name: string): ProgramSummary {
  return {
    id: createProgramId(),
    name,
    createdAt: new Date().toISOString(),
    firstDayOfWeek: "sunday",
    dayAssignments: {},
  };
}
