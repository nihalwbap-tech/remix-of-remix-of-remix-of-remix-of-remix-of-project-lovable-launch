export type WeightUnit = {
  id: string;
  longForm: string;
  shortForm: string;
  isCustom: boolean;
};

export const CUSTOM_WEIGHT_UNITS_STORAGE_KEY = "no-more-copium:coach-weight-units:v1";
export const DEFAULT_WEIGHT_UNIT_ID = "kg";
export const WEIGHT_UNIT_LONG_FORM_MAX_LENGTH = 40;
export const WEIGHT_UNIT_SHORT_FORM_MAX_LENGTH = 8;

export const BUILT_IN_WEIGHT_UNITS: readonly WeightUnit[] = [
  { id: "kg", longForm: "Kilogram", shortForm: "kg", isCustom: false },
  { id: "lbs", longForm: "Pounds", shortForm: "lbs", isCustom: false },
  { id: "plates", longForm: "Plates", shortForm: "P", isCustom: false },
] as const;

function cleanLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCustomWeightUnit(value: unknown): WeightUnit | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.id !== "string" ||
    raw.id.length === 0 ||
    typeof raw.longForm !== "string" ||
    typeof raw.shortForm !== "string"
  ) {
    return null;
  }
  const longForm = cleanLabel(raw.longForm);
  const shortForm = cleanLabel(raw.shortForm);
  if (
    longForm.length === 0 ||
    longForm.length > WEIGHT_UNIT_LONG_FORM_MAX_LENGTH ||
    shortForm.length === 0 ||
    shortForm.length > WEIGHT_UNIT_SHORT_FORM_MAX_LENGTH
  ) {
    return null;
  }
  return { id: raw.id, longForm, shortForm, isCustom: true };
}

export function loadCustomWeightUnits(): WeightUnit[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(CUSTOM_WEIGHT_UNITS_STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeCustomWeightUnit)
      .filter((unit): unit is WeightUnit => unit !== null);
  } catch {
    return [];
  }
}

export function saveCustomWeightUnits(units: WeightUnit[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CUSTOM_WEIGHT_UNITS_STORAGE_KEY,
      JSON.stringify(units.filter((unit) => unit.isCustom)),
    );
  } catch {
    // The in-memory editor remains usable when storage is unavailable.
  }
}

export function getAllWeightUnits(customUnits: WeightUnit[]): WeightUnit[] {
  const builtInIds = new Set(BUILT_IN_WEIGHT_UNITS.map((unit) => unit.id));
  return [
    ...BUILT_IN_WEIGHT_UNITS,
    ...customUnits.filter((unit) => unit.isCustom && !builtInIds.has(unit.id)),
  ];
}

export function getWeightUnit(units: readonly WeightUnit[], id: string | undefined): WeightUnit {
  return (
    units.find((unit) => unit.id === id) ??
    BUILT_IN_WEIGHT_UNITS.find((unit) => unit.id === DEFAULT_WEIGHT_UNIT_ID)!
  );
}

export function createCustomWeightUnit(longFormRaw: string, shortFormRaw: string): WeightUnit {
  const longForm = cleanLabel(longFormRaw);
  const shortForm = cleanLabel(shortFormRaw);
  const unique =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return {
    id: `custom_unit_${unique}`,
    longForm,
    shortForm,
    isCustom: true,
  };
}
