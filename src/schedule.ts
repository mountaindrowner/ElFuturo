// Semester calendar: 12 weeks from semester_start; units per §5 of the brief.
import { profileSeed } from "./data";

export interface UnitInfo {
  unit: number;                 // 0 = assessment week
  name: string;
  weeks: number[];
  assessment?: 1 | 2;
}

export const UNITS: UnitInfo[] = [
  { unit: 1, name: "The flip", weeks: [1, 2] },
  { unit: 2, name: "Sound and stress", weeks: [3] },
  { unit: 3, name: "Gender exceptions", weeks: [4] },
  { unit: 4, name: "Se lo", weeks: [5] },
  { unit: 0, name: "Assessment 1", weeks: [6], assessment: 1 },
  { unit: 5, name: "Border to pulpit", weeks: [7] },
  { unit: 6, name: "Formulas", weeks: [8, 9] },
  { unit: 7, name: "The manuscript", weeks: [10, 11] },
  { unit: 0, name: "Assessment 2 + sermon", weeks: [12], assessment: 2 }
];

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function atMidnight(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Week of semester, 1-based. Clamped to [1, 12] outside the semester. */
export function semesterWeek(now = new Date()): number {
  const start = atMidnight(profileSeed.semester_start);
  const days = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return Math.min(12, Math.max(1, Math.floor(days / 7) + 1));
}

export function dayOfUnit(now = new Date()): number {
  const start = atMidnight(profileSeed.semester_start);
  const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
  const week = Math.floor(days / 7) + 1;
  const info = unitForWeek(week);
  const firstWeek = info.weeks[0];
  return days - (firstWeek - 1) * 7 + 1; // 1-based day within the unit
}

export function unitForWeek(week: number): UnitInfo {
  return UNITS.find((u) => u.weeks.includes(Math.min(12, Math.max(1, week)))) ?? UNITS[0];
}

export function currentUnit(now = new Date()): UnitInfo {
  return unitForWeek(semesterWeek(now));
}

/** Highest curriculum unit reached so far (assessment weeks keep the previous unit's cards flowing). */
export function maxUnitReached(now = new Date()): number {
  const week = semesterWeek(now);
  let max = 1;
  for (const u of UNITS) {
    if (u.unit > 0 && u.weeks[0] <= week) max = Math.max(max, u.unit);
  }
  return max;
}

export function daysToSermon(now = new Date()): number {
  const target = atMidnight(profileSeed.sermon_target);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

/** Field assignment pattern per unit (§5). */
export const FIELD_PATTERNS: Record<number, string> = {
  1: "Say 3 ustedes commands / 3 “que” sentences to a native speaker; ask “¿así se dice?”",
  2: "Read one prayer formula aloud to a native speaker; ask which words sounded off.",
  3: "Use 5 exception nouns in conversation.",
  4: "Tell someone a short story using “se lo / se la” twice.",
  5: "Ask a native speaker to catch one anglicism in a 2-minute conversation.",
  6: "Pray one formula publicly (small group, then service).",
  7: "Read one paragraph of your manuscript aloud to a native speaker; log corrections in Debrief."
};
