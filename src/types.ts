export type SystemKey =
  | "subjunctive_form" | "commands" | "accents_orthography" | "free_production"
  | "gender_exceptions" | "object_pronouns" | "irregular_yo" | "anglicism_replacement"
  | "ser_estar" | "preterite_imperfect" | "present_regular" | "anglicism_detection";

export const SYSTEM_KEYS: SystemKey[] = [
  "subjunctive_form", "commands", "accents_orthography", "free_production",
  "gender_exceptions", "object_pronouns", "irregular_yo", "anglicism_replacement",
  "ser_estar", "preterite_imperfect", "present_regular", "anglicism_detection"
];

export const SYSTEM_LABELS: Record<SystemKey, string> = {
  subjunctive_form: "Subjunctive",
  commands: "Commands",
  accents_orthography: "Accents & spelling",
  free_production: "Free production",
  gender_exceptions: "Gender exceptions",
  object_pronouns: "Object pronouns",
  irregular_yo: "Irregular yo",
  anglicism_replacement: "Anglicism replacement",
  ser_estar: "Ser / estar",
  preterite_imperfect: "Preterite / imperfect",
  present_regular: "Present regular",
  anglicism_detection: "Anglicism detection"
};

export type SystemStatus = "missing" | "shaky" | "solid" | "blocked";

export type DrillType =
  | "flip" | "pyramid" | "flipordont" | "accent" | "gender"
  | "cloze" | "swap" | "pronoun" | "correction";

export const DRILL_LABELS: Record<DrillType, string> = {
  flip: "Flip",
  pyramid: "Command pyramid",
  flipordont: "Flip or don't",
  accent: "Accent placement",
  gender: "Gender chain",
  cloze: "Formula cloze",
  swap: "Swap",
  pronoun: "Se lo",
  correction: "Correction"
};

/** A generated drill card definition (static, derived from corpus data). */
export interface CardDef {
  id: string;                 // `${file}:${rowIndex}:${drillType}`
  drillType: DrillType;
  system: SystemKey;
  unit: number;               // unit that introduces it
  front: string;              // main prompt
  hint?: string;              // secondary prompt line (infinitive, stem…)
  answer: string;             // canonical answer
  accept?: string[];          // additional acceptable answers
  fields?: { label: string; answer: string }[]; // pyramid multi-field
  feedback?: string;          // rule shown on a miss
  say?: string;               // text for speech synthesis
  fromMySpanish?: boolean;    // Mark's own errors introduce first
  weight?: number;            // corpus_weight for ordering
  rowIndex: number;
  needsVerify?: boolean;      // unverified Scripture → excluded until verified
  verifyKey?: string;         // key into verifications table
}
