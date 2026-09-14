// Session engine: seeding, queues, review application, status auto-update, streak.
import { fsrs, generatorParameters, createEmptyCard, Rating, type Grade } from "ts-fsrs";
import { db, fsrsFromStored, storedFromFsrs, type StoredCard, type ProfileRow, type SessionRow } from "./db";
import { allCards } from "./cards";
import { profileSeed } from "./data";
import { maxUnitReached, todayKey } from "./schedule";
import type { CardDef, SystemKey, SystemStatus } from "./types";

export const NEW_CAP = 15;
export const REVIEW_CAP = 60;

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

let defMap: Map<string, CardDef> | null = null;
export function defs(): Map<string, CardDef> {
  if (!defMap) {
    defMap = new Map();
    for (const c of allCards().cards) defMap.set(c.id, c);
  }
  return defMap;
}

/** Seed Dexie with any corpus cards that don't exist yet. Never resets FSRS state. */
export async function seedCards(): Promise<void> {
  const { cards } = allCards();
  const existing = new Set(await db.cards.toCollection().primaryKeys());
  const now = new Date();
  const toAdd: StoredCard[] = [];
  for (const def of cards) {
    if (existing.has(def.id)) continue;
    const empty = createEmptyCard(now);
    toAdd.push(storedFromFsrs({
      id: def.id,
      drillType: def.drillType,
      system: def.system,
      unit: def.unit,
      source: "corpus",
      fromMySpanish: !!def.fromMySpanish,
      weight: def.weight ?? 0,
      rowIndex: def.rowIndex,
      due: "", stability: 0, difficulty: 0, elapsed_days: 0,
      scheduled_days: 0, reps: 0, lapses: 0, state: 0
    }, empty));
  }
  if (toAdd.length) await db.cards.bulkAdd(toAdd);
}

export async function ensureProfile(): Promise<ProfileRow> {
  const existing = await db.profile.get("profile");
  if (existing) return existing;
  const systems: ProfileRow["systems"] = {} as ProfileRow["systems"];
  for (const [k, v] of Object.entries(profileSeed.systems)) {
    systems[k as SystemKey] = {
      status: v.status as SystemStatus,
      priority: v.priority,
      accuracy: v.accuracy,
      correctedInWild: 0,
      startedSolid: v.status === "solid"
    };
  }
  const row: ProfileRow = {
    key: "profile",
    learner: profileSeed.learner,
    semester_start: profileSeed.semester_start,
    sermon_target: profileSeed.sermon_target,
    daily_minutes: profileSeed.daily_minutes,
    systems,
    theme: "dark"
  };
  await db.profile.put(row);
  return row;
}

export async function getSession(date = todayKey()): Promise<SessionRow> {
  const existing = await db.sessions.get(date);
  if (existing) return existing;
  const row: SessionRow = {
    date, minutes: 0, reviewsDone: 0, newIntroduced: 0,
    completed: false, fieldDone: false, teachSeen: false
  };
  await db.sessions.put(row);
  return row;
}

async function verifiedKeys(): Promise<Set<string>> {
  const rows = await db.verifications.where("key").notEqual("").toArray();
  return new Set(rows.filter((r) => r.verified).map((r) => r.key));
}

function eligible(card: StoredCard, def: CardDef | undefined, verified: Set<string>): boolean {
  if (!def) return card.source === "field"; // correction cards have no def
  if (def.needsVerify && def.verifyKey && !verified.has(def.verifyKey)) return false;
  return true;
}

/** Review queue: due cards, corrections first, then by due date. Capped at REVIEW_CAP. */
export async function reviewQueue(now = new Date()): Promise<StoredCard[]> {
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
  const verified = await verifiedKeys();
  const d = defs();
  const due = await db.cards
    .where("due").belowOrEqual(endOfDay.toISOString())
    .and((c) => c.state !== 0)
    .toArray();
  const filtered = due.filter((c) => eligible(c, d.get(c.id), verified));
  filtered.sort((a, b) => {
    if ((a.source === "field") !== (b.source === "field")) return a.source === "field" ? -1 : 1;
    return a.due < b.due ? -1 : 1;
  });
  return filtered.slice(0, REVIEW_CAP);
}

/**
 * New-card queue for today. Reviews win: if the review queue is at cap, no new cards.
 * Order: corrections, then from_my_spanish, then current-unit rows, then weight desc, then row order.
 */
export async function newQueue(now = new Date()): Promise<StoredCard[]> {
  const session = await getSession(todayKey(now));
  const reviews = await reviewQueue(now);
  if (reviews.length >= REVIEW_CAP) return [];
  const budget = Math.max(0, NEW_CAP - session.newIntroduced);
  if (budget === 0) return [];
  const verified = await verifiedKeys();
  const d = defs();
  const maxUnit = maxUnitReached(now);
  const fresh = await db.cards.where("state").equals(0).toArray();
  const pool = fresh.filter((c) => {
    const def = d.get(c.id);
    if (!eligible(c, def, verified)) return false;
    if (c.source === "field") return true;
    if (c.fromMySpanish) return true;           // introduced first regardless of unit
    return c.unit <= maxUnit;
  });
  pool.sort((a, b) => {
    if ((a.source === "field") !== (b.source === "field")) return a.source === "field" ? -1 : 1;
    if (a.fromMySpanish !== b.fromMySpanish) return a.fromMySpanish ? -1 : 1;
    const aCur = a.unit === maxUnit ? 0 : 1;
    const bCur = b.unit === maxUnit ? 0 : 1;
    if (aCur !== bCur) return aCur - bCur;
    if (a.weight !== b.weight) return b.weight - a.weight;
    if (a.unit !== b.unit) return a.unit - b.unit;
    return a.rowIndex - b.rowIndex;
  });
  return pool.slice(0, budget);
}

export type RatingValue = 1 | 2 | 3 | 4;
export const RATING = Rating;

export async function applyReview(card: StoredCard, rating: RatingValue, correct: boolean): Promise<void> {
  const now = new Date();
  const wasNew = card.state === 0;
  const rec = scheduler.repeat(fsrsFromStored(card), now);
  const next = rec[rating as Grade].card;
  await db.cards.put(storedFromFsrs(card, next));
  await db.reviews.add({ cardId: card.id, system: card.system, rating, correct, ts: now.getTime() });
  const session = await getSession();
  session.reviewsDone += 1;
  if (wasNew) session.newIntroduced += 1;
  await db.sessions.put(session);
  await updateSystemStatus(card.system);
}

/**
 * Status auto-update over the last 50 reviews per system:
 * solid ≥ 0.9 with ≥ 40 reviews; shaky 0.6–0.9; missing < 0.6.
 * Never downgrades a system that started solid without ≥ 40 reviews of evidence.
 */
export async function updateSystemStatus(system: SystemKey): Promise<void> {
  const profile = await ensureProfile();
  const recent = await db.reviews.where("system").equals(system).reverse().sortBy("ts");
  const last50 = recent.slice(0, 50);
  if (last50.length === 0) return;
  const acc = last50.filter((r) => r.correct).length / last50.length;
  const entry = profile.systems[system];
  entry.accuracy = Math.round(acc * 100) / 100;
  const enough = last50.length >= 40;
  let status: SystemStatus = acc >= 0.9 && enough ? "solid" : acc >= 0.6 ? "shaky" : "missing";
  if (entry.startedSolid && !enough) status = "solid"; // no downgrade without ≥40 reviews of evidence
  entry.status = status;
  await db.profile.put(profile);
}

/** Debrief → Correction card. Sorts first in every review queue (source: field). */
export async function addCorrectionCard(said: string, corrected: string, who: string | undefined, system: SystemKey): Promise<void> {
  const ts = Date.now();
  await db.debriefs.add({ said, corrected, who, system, ts });
  const empty = createEmptyCard(new Date());
  const id = `field:${ts}:correction`;
  await db.cards.put(storedFromFsrs({
    id, drillType: "correction", system, unit: 0,
    source: "field", fromMySpanish: true, weight: 999, rowIndex: 0,
    front: said, answer: corrected,
    due: "", stability: 0, difficulty: 0, elapsed_days: 0,
    scheduled_days: 0, reps: 0, lapses: 0, state: 0
  }, empty));
  const profile = await ensureProfile();
  profile.systems[system].correctedInWild = (profile.systems[system].correctedInWild ?? 0) + 1;
  await db.profile.put(profile);
}

export async function streak(now = new Date()): Promise<number> {
  const sessions = await db.sessions.toArray();
  const done = new Set(sessions.filter((s) => s.completed).map((s) => s.date));
  let n = 0;
  const d = new Date(now);
  // today counts if completed; otherwise start from yesterday
  if (!done.has(todayKey(d))) d.setDate(d.getDate() - 1);
  while (done.has(todayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export async function addMinutes(mins: number): Promise<void> {
  const session = await getSession();
  session.minutes += mins;
  await db.sessions.put(session);
}
