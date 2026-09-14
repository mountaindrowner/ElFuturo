import Dexie, { type Table } from "dexie";
import type { Card as FsrsCard } from "ts-fsrs";
import type { DrillType, SystemKey, SystemStatus } from "./types";

/** FSRS state stored per card. Dates stored as ISO strings for IndexedDB friendliness. */
export interface StoredCard {
  id: string;                    // `${file}:${rowIndex}:${drillType}` or `field:<n>:correction`
  drillType: DrillType;
  system: SystemKey;
  unit: number;
  source: "corpus" | "field";
  fromMySpanish: boolean;
  weight: number;
  rowIndex: number;
  // FSRS
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;                 // 0 New, 1 Learning, 2 Review, 3 Relearning
  last_review?: string;
  // correction card payload (corpus cards derive content from data files)
  front?: string;
  answer?: string;
}

export interface ReviewRow {
  id?: number;
  cardId: string;
  system: SystemKey;
  rating: number;               // 1..4
  correct: boolean;             // exact-match result before rating
  ts: number;
}

export interface SessionRow {
  date: string;                 // yyyy-mm-dd
  minutes: number;
  reviewsDone: number;
  newIntroduced: number;
  completed: boolean;
  fieldDone: boolean;
  fieldWho?: string;
  teachSeen: boolean;
}

export interface DebriefRow {
  id?: number;
  said: string;
  corrected: string;
  who?: string;
  system: SystemKey;
  ts: number;
}

export interface AssessmentRow {
  id?: number;
  ts: number;
  week: number;
  durationSec: number;
  perSystem: Record<string, { correct: number; total: number }>;
  answers: Record<string, string>;
  manualScores: Record<string, number>;
}

export interface ProfileRow {
  key: string;                  // "profile"
  learner: string;
  semester_start: string;
  sermon_target: string;
  daily_minutes: number;
  systems: Record<SystemKey, { status: SystemStatus; priority: number; accuracy: number | null; correctedInWild?: number; startedSolid?: boolean }>;
  theme?: "dark" | "light";
  manuscript?: string;
}

export interface VerificationRow {
  key: string;                  // row key e.g. "commands:29" or "formulas:12"
  verified: boolean;
  ts: number;
}

export class PulpitoDB extends Dexie {
  cards!: Table<StoredCard, string>;
  reviews!: Table<ReviewRow, number>;
  sessions!: Table<SessionRow, string>;
  debriefs!: Table<DebriefRow, number>;
  assessments!: Table<AssessmentRow, number>;
  profile!: Table<ProfileRow, string>;
  verifications!: Table<VerificationRow, string>;

  constructor() {
    super("pulpito");
    this.version(1).stores({
      cards: "id, due, state, unit, system, source",
      reviews: "++id, cardId, system, ts",
      sessions: "date",
      debriefs: "++id, ts, system",
      assessments: "++id, ts",
      profile: "key",
      verifications: "key"
    });
  }
}

export const db = new PulpitoDB();

export function fsrsFromStored(c: StoredCard): FsrsCard {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? new Date(c.last_review) : undefined
  } as FsrsCard;
}

export function storedFromFsrs(base: StoredCard, f: FsrsCard): StoredCard {
  return {
    ...base,
    due: f.due.toISOString(),
    stability: f.stability,
    difficulty: f.difficulty,
    elapsed_days: f.elapsed_days,
    scheduled_days: f.scheduled_days,
    reps: f.reps,
    lapses: f.lapses,
    state: f.state as number,
    last_review: f.last_review ? f.last_review.toISOString() : undefined
  };
}
