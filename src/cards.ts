// Generates every drill card definition from the corpus data. No hand-authoring.
// Card identity: `${file}:${rowIndex}:${drillType}` (rowIndex = data row, 0-based).
import { commands, subjunctive, gender, accents, anglicisms, formulas } from "./data";
import { stripAccents } from "./grading";
import type { CardDef } from "./types";

const GENDER_ADJECTIVES = ["grande", "nuevo", "santo", "viejo", "frío", "derecho", "mexicano", "difícil"];
const INVARIANT_ADJ = new Set(["grande", "difícil"]);

function feminine(adj: string): string {
  if (INVARIANT_ADJ.has(adj)) return adj;
  if (adj.endsWith("o")) return adj.slice(0, -1) + "a";
  return adj;
}

function boolCol(v: string | undefined): boolean {
  return v != null && /^(true|1|yes|y)$/i.test(v.trim());
}

function fromMySpanish(explicit: string | undefined, note: string): boolean {
  if (explicit != null && explicit !== "") return boolCol(explicit);
  return /your diagnostic|your own/i.test(note);
}

function needsVerify(explicit: string | undefined, text: string): boolean {
  if (explicit != null && explicit !== "") return !boolCol(explicit); // verified=false → needs verify
  return /verif/i.test(text);
}

export interface VerifyItem { key: string; label: string; source: string }

export function generateCards(): { cards: CardDef[]; verifyItems: VerifyItem[] } {
  const cards: CardDef[] = [];
  const verifyItems: VerifyItem[] = [];
  const addVerify = (key: string, label: string, source: string) => {
    if (!verifyItems.some((v) => v.key === key)) verifyItems.push({ key, label, source });
  };

  // ---- commands: flip (type the ustedes command) + pyramid ----
  commands.forEach((row, i) => {
    const mine = fromMySpanish(row.from_my_spanish, row.note);
    const verify = needsVerify(row.verified, row.note + " " + row.english);
    const verifyKey = `commands:${i}`;
    if (verify) addVerify(verifyKey, `${row.english} — ${row.spanish_ustedes}`, "commands");

    if (row.spanish_ustedes && row.spanish_ustedes !== "—") {
      cards.push({
        id: `commands:${i}:flip`,
        drillType: "flip", system: "commands", unit: 1,
        front: row.english,
        hint: `${row.verb_infinitive} · yo: ${row.yo_form_stem} · ustedes command`,
        answer: row.spanish_ustedes,
        feedback: row.note || `Flip the yo-stem: ${row.yo_form_stem}`,
        say: row.spanish_ustedes,
        fromMySpanish: mine, rowIndex: i,
        needsVerify: verify, verifyKey
      });
    }

    const fields = [
      { label: "tú", answer: row.spanish_tu },
      { label: "usted", answer: row.spanish_usted },
      { label: "ustedes", answer: row.spanish_ustedes },
      { label: "negative tú", answer: row.spanish_negative_tu }
    ].filter((f) => f.answer && f.answer !== "—");
    if (fields.length >= 2) {
      cards.push({
        id: `commands:${i}:pyramid`,
        drillType: "pyramid", system: "commands", unit: 1,
        front: row.english,
        hint: `${row.verb_infinitive} · yo: ${row.yo_form_stem}`,
        answer: fields.map((f) => f.answer).join(" · "),
        fields,
        feedback: row.note || "Tú positive = él present form; everything else flips the yo-stem.",
        say: fields.map((f) => f.answer).join(". "),
        fromMySpanish: mine, rowIndex: i,
        needsVerify: verify, verifyKey
      });
    }

    // ---- pronoun cards (unit 4): commands whose negative-tú shows an object pronoun cluster ----
    const neg = row.spanish_negative_tu.toLowerCase();
    const pron = neg.match(/^no ((?:me|te|se|nos|le|les|lo|la|los|las)(?: (?:lo|la|los|las|le|les))?) /);
    const reflexiveOnly = row.verb_infinitive.endsWith("rse") && pron != null && !pron[1].includes(" ");
    if (pron && !reflexiveOnly && row.spanish_ustedes && row.spanish_ustedes !== "—") {
      cards.push({
        id: `commands:${i}:pronoun`,
        drillType: "pronoun", system: "object_pronouns", unit: 4,
        front: row.english,
        hint: `${row.verb_infinitive} · ustedes command, pronouns included`,
        answer: row.spanish_ustedes,
        accept: [row.spanish_tu],
        feedback: `Affirmative commands attach the pronouns (${row.spanish_tu}); negative puts them in front (${row.spanish_negative_tu}). ${row.note}`.trim(),
        say: row.spanish_ustedes,
        fromMySpanish: mine, rowIndex: i,
        needsVerify: verify, verifyKey
      });
    }
  });

  // ---- subjunctive: flip + flip-or-don't + pronoun extraction ----
  subjunctive.forEach((row, i) => {
    const mine = fromMySpanish(row.from_my_spanish, row.note);
    const verify = needsVerify(row.verified, row.note);
    const verifyKey = `subjunctive:${i}`;
    if (verify) addVerify(verifyKey, `${row.spanish}`, "subjunctive");

    const isContrast = row.subjunctive_verb === "—";
    if (!isContrast) {
      cards.push({
        id: `subjunctive:${i}:flip`,
        drillType: "flip", system: "subjunctive_form", unit: 1,
        front: row.english,
        hint: `${row.trigger_phrase} · ${row.infinitive} (indicative: ${row.indicative_form})`,
        answer: row.subjunctive_verb,
        feedback: row.note || `${row.trigger_phrase} triggers the flip: ${row.indicative_form} → ${row.subjunctive_verb}`,
        say: row.spanish,
        fromMySpanish: mine, rowIndex: i,
        needsVerify: verify, verifyKey
      });
    }

    // flip-or-don't: blank the verb in the sentence; answer may be indicative (contrast rows)
    const target = isContrast ? row.indicative_form : row.subjunctive_verb;
    if (target && target !== "—") {
      let sentence = row.spanish;
      const idx = sentence.toLowerCase().indexOf(target.toLowerCase());
      if (idx >= 0) {
        sentence = sentence.slice(0, idx) + "_____" + sentence.slice(idx + target.length);
      } else {
        sentence = sentence + " — form of “" + row.infinitive + "”: _____";
      }
      cards.push({
        id: `subjunctive:${i}:flipordont`,
        drillType: "flipordont", system: "subjunctive_form", unit: 1,
        front: sentence,
        hint: `${row.infinitive} — flip it, or don't`,
        answer: target,
        feedback: isContrast
          ? `No flip: ${row.note || row.trigger_phrase + " takes the indicative here."}`
          : (row.note || `${row.trigger_phrase} → subjunctive: ${row.subjunctive_verb}`),
        say: row.spanish.replace("_____", target),
        fromMySpanish: mine, rowIndex: i,
        needsVerify: verify, verifyKey
      });
    }

    // pronoun cards from subjunctive rows containing double-pronoun clusters
    if (!isContrast) {
      const m = row.spanish.toLowerCase().match(
        new RegExp(`((?:me|te|se|nos|le|les) (?:lo|la|los|las|le|les) )${row.subjunctive_verb.toLowerCase().split(" ").pop()}`)
      );
      if (m) {
        const cluster = m[1].trim();
        const verbLast = row.subjunctive_verb.split(" ").pop()!;
        cards.push({
          id: `subjunctive:${i}:pronoun`,
          drillType: "pronoun", system: "object_pronouns", unit: 4,
          front: row.english,
          hint: `${row.trigger_phrase} · ${row.infinitive} — include the pronouns`,
          answer: `${cluster} ${verbLast}`,
          feedback: row.note || `Double pronoun stays before the conjugated verb: ${cluster} ${verbLast}`,
          say: row.spanish,
          fromMySpanish: mine, rowIndex: i,
          needsVerify: verify, verifyKey
        });
      }
    }
  });

  // ---- gender chain ----
  gender.forEach((row, i) => {
    const g = row.gender.trim().charAt(0);
    if (g !== "m" && g !== "f") return;                 // skip m/f meaning-change rows
    if (row.article_singular.includes("/")) return;     // skip common-gender rows
    if (row.gender.includes("/")) return;
    const adj = GENDER_ADJECTIVES[i % GENDER_ADJECTIVES.length];
    // agreement follows true gender, not the article (el agua fría)
    const agreed = g === "f" ? feminine(adj) : adj;
    const answer = `${row.article_singular} ${agreed}`;
    cards.push({
      id: `gender:${i}:gender`,
      drillType: "gender", system: "gender_exceptions", unit: 3,
      front: `(${adj}) ${row.noun}`,
      hint: "article + noun + agreed adjective",
      answer,
      feedback: `${row.exception_class}. ${row.note || ""} Example: ${row.example_phrase_from_my_sermons}`.trim(),
      say: answer,
      fromMySpanish: /your diagnostic|your own/i.test(row.note),
      rowIndex: i
    });
  });

  // ---- accent placement ----
  accents.forEach((row, i) => {
    const stripped = stripAccents(row.word);
    const pairNote = row.pair_partner ? ` Pair: “${row.word}” vs “${row.pair_partner}”.` : "";
    cards.push({
      id: `accents:${i}:accent`,
      drillType: "accent", system: "accents_orthography", unit: 2,
      front: stripped,
      hint: "type it with the tilde",
      answer: row.word,
      feedback: `${row.detail}${pairNote}`,
      say: row.word,
      weight: Number(row.corpus_weight) || 0,
      rowIndex: i
    });
  });

  // ---- formula cloze ----
  // Build a set of subjunctive/imperative forms to prefer when picking the blank.
  const preferred = new Set<string>();
  subjunctive.forEach((r) => {
    if (r.subjunctive_verb !== "—") r.subjunctive_verb.split(" ").forEach((w) => preferred.add(w.toLowerCase()));
  });
  commands.forEach((r) => {
    [r.spanish_tu, r.spanish_usted, r.spanish_ustedes].forEach((form) => {
      const first = (form || "").split(" ")[0];
      if (first && first !== "—") preferred.add(first.toLowerCase());
    });
  });
  ["sea", "esté", "vaya", "dé", "sepa", "haya", "oremos", "bendiga", "guarde"].forEach((w) => preferred.add(w));

  const cleanWord = (w: string) => w.replace(/[«»"“”.,;:!?¡¿()]/g, "");
  formulas.forEach((rec, i) => {
    if (rec.fromTable || rec.sectionIndex === 14) return; // §13 table + §14 idioms are reference, not cloze
    if (rec.flag && rec.spanish.length < 8) return;
    const words = rec.spanish.split(/\s+/);
    if (words.length < 3) return;
    let blankIdx = -1;
    for (let w = 0; w < words.length; w++) {
      if (preferred.has(cleanWord(words[w]).toLowerCase())) { blankIdx = w; break; }
    }
    if (blankIdx === -1) {
      // fall back to the longest word (usually the content verb)
      let best = 0;
      words.forEach((w, idx) => { if (cleanWord(w).length > cleanWord(words[best]).length) best = idx; });
      blankIdx = best;
    }
    const answer = cleanWord(words[blankIdx]);
    if (answer.length < 3) return;
    const display = words.map((w, idx) => (idx === blankIdx ? w.replace(cleanWord(w), "_____") : w)).join(" ");
    const verifyKey = `formulas:${i}`;
    if (rec.verify) addVerify(verifyKey, rec.spanish, "formulas");
    cards.push({
      id: `formulas:${i}:cloze`,
      drillType: "cloze", system: "free_production", unit: 6,
      front: display,
      hint: rec.gloss,
      answer,
      feedback: `${rec.section}: ${rec.spanish}`,
      say: rec.spanish,
      rowIndex: i,
      needsVerify: rec.verify, verifyKey
    });
  });

  // ---- swap (anglicisms; file may be pending) ----
  anglicisms.forEach((row, i) => {
    cards.push({
      id: `anglicisms:${i}:swap`,
      drillType: "swap", system: "anglicism_replacement", unit: 5,
      front: row.border_form,
      hint: row.context_from_my_sermon || "standard Mexican form",
      answer: row.standard_mexican,
      feedback: row.register ? `Register: ${row.register}` : undefined,
      say: row.standard_mexican,
      rowIndex: i
    });
  });

  return { cards, verifyItems };
}

let cache: { cards: CardDef[]; verifyItems: VerifyItem[] } | null = null;
export function allCards(): { cards: CardDef[]; verifyItems: VerifyItem[] } {
  if (!cache) cache = generateCards();
  return cache;
}

export function cardDefById(id: string): CardDef | undefined {
  return allCards().cards.find((c) => c.id === id);
}
