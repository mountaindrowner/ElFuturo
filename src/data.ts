// Typed access to the JSON emitted by scripts/build-data.ts
import commandsJson from "./data/commands.json";
import subjunctiveJson from "./data/subjunctive.json";
import genderJson from "./data/gender.json";
import accentsJson from "./data/accents.json";
import anglicismsJson from "./data/anglicisms.json";
import formulasJson from "./data/formulas.json";
import lessonsJson from "./data/lessons.json";
import assessmentJson from "./data/assessment.json";
import profileJson from "./data/profile.json";

export interface CommandRow {
  english: string; spanish_tu: string; spanish_usted: string; spanish_ustedes: string;
  spanish_negative_tu: string; verb_infinitive: string; yo_form_stem: string; note: string;
  from_my_spanish?: string; verified?: string;
}
export interface SubjunctiveRow {
  english: string; spanish: string; trigger_phrase: string; subjunctive_verb: string;
  infinitive: string; indicative_form: string; note: string;
  from_my_spanish?: string; verified?: string;
}
export interface GenderRow {
  noun: string; gender: string; article_singular: string; article_plural: string;
  example_phrase_from_my_sermons: string; exception_class: string; note: string;
}
export interface AccentRow {
  word: string; stress_rule: string; pair_partner: string; corpus_weight: string; detail: string;
}
export interface AnglicismRow {
  border_form: string; standard_mexican: string; context_from_my_sermon: string; register: string;
}
export interface FormulaRecord {
  section: string; sectionIndex: number; spanish: string; gloss: string;
  flag: boolean; verify: boolean; fromTable?: boolean; note?: string;
}
export interface Lesson {
  unit: number; title: string; systems: string[]; rule: string;
  mechanism: { input: string; op: string; output: string }[];
  memorize?: string[]; exception?: string;
  your_misses?: { said: string; rule: string; correct: string }[];
  trigger_reminder?: string;
}
export interface AssessmentItem { prompt: string; answers?: string[]; system?: string }
export interface AssessmentSection {
  id: string; system: string; title: string; type: string;
  manual?: boolean; intro?: string; items: AssessmentItem[];
}

export const commands = commandsJson as CommandRow[];
export const subjunctive = subjunctiveJson as SubjunctiveRow[];
export const gender = genderJson as GenderRow[];
export const accents = accentsJson as AccentRow[];
export const anglicisms = anglicismsJson as AnglicismRow[];
export const formulas = formulasJson as FormulaRecord[];
export const lessons = lessonsJson as Lesson[];
export const assessment = assessmentJson as { note: string; sections: AssessmentSection[] };
export const profileSeed = profileJson as {
  learner: string; semester_start: string; sermon_target: string; daily_minutes: number;
  systems: Record<string, { status: string; priority: number; accuracy: number | null }>;
};
