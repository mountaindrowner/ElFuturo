/**
 * Build-time data pipeline: reads data/csv/*.csv and data/md/*.md,
 * validates columns, emits src/data/*.json.
 * Fails the build on a malformed row and prints the row.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CSV_DIR = path.join(ROOT, "data", "csv");
const MD_DIR = path.join(ROOT, "data", "md");
const OUT_DIR = path.join(ROOT, "src", "data");

fs.mkdirSync(OUT_DIR, { recursive: true });

function fail(msg: string): never {
  console.error(`\n[build-data] FAILED: ${msg}\n`);
  process.exit(1);
}

/** Minimal RFC-4180 CSV parser (handles quoted fields, embedded commas/quotes/newlines). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { pushField(); i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { pushField(); pushRow(); i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }
  // drop trailing fully-empty rows
  while (rows.length && rows[rows.length - 1].every((f) => f === "")) rows.pop();
  return rows;
}

interface CsvSpec {
  file: string;            // filename in data/csv
  out: string;             // output json name
  required: string[];      // required columns, in contract order
  optional?: string[];     // optional columns (planned additions)
}

const CSV_SPECS: CsvSpec[] = [
  {
    file: "corpus_commands.csv",
    out: "commands.json",
    required: ["english", "spanish_tu", "spanish_usted", "spanish_ustedes", "spanish_negative_tu", "verb_infinitive", "yo_form_stem", "note"],
    optional: ["from_my_spanish", "verified"]
  },
  {
    file: "corpus_subjunctive_triggers.csv",
    out: "subjunctive.json",
    required: ["english", "spanish", "trigger_phrase", "subjunctive_verb", "infinitive", "indicative_form", "note"],
    optional: ["from_my_spanish", "verified"]
  },
  {
    file: "corpus_gender_nouns.csv",
    out: "gender.json",
    required: ["noun", "gender", "article_singular", "article_plural", "example_phrase_from_my_sermons", "exception_class", "note"],
    optional: ["verified"]
  },
  {
    file: "corpus_accent_words.csv",
    out: "accents.json",
    required: ["word", "stress_rule", "pair_partner", "corpus_weight", "detail"],
    optional: []
  }
];

// Optional file: pending per the brief. Emit [] if absent.
const ANGLICISMS_SPEC: CsvSpec = {
  file: "corpus_anglicisms.csv",
  out: "anglicisms.json",
  required: ["border_form", "standard_mexican", "context_from_my_sermon", "register"],
  optional: ["note", "verified"]
};

function buildCsv(spec: CsvSpec, requiredOnDisk: boolean): Record<string, string>[] {
  const p = path.join(CSV_DIR, spec.file);
  if (!fs.existsSync(p)) {
    if (requiredOnDisk) fail(`${spec.file} is missing from data/csv/`);
    console.log(`[build-data] ${spec.file} not present (optional) → emitting empty array`);
    return [];
  }
  const text = fs.readFileSync(p, "utf-8").replace(/^﻿/, "");
  const rows = parseCsv(text);
  if (rows.length === 0) fail(`${spec.file} is empty`);
  const header = rows[0];
  for (const col of spec.required) {
    if (!header.includes(col)) fail(`${spec.file}: missing required column "${col}". Header: ${header.join(",")}`);
  }
  for (const col of header) {
    if (!spec.required.includes(col) && !(spec.optional ?? []).includes(col)) {
      fail(`${spec.file}: unknown column "${col}". Columns are the contract; extend, never rename.`);
    }
  }
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length !== header.length) {
      fail(`${spec.file} row ${r + 1}: expected ${header.length} fields, got ${row.length}.\nRow: ${JSON.stringify(row)}`);
    }
    const rec: Record<string, string> = {};
    header.forEach((h, idx) => (rec[h] = row[idx].trim()));
    out.push(rec);
  }
  return out;
}

// ---------- prayer formulas markdown ----------

interface FormulaRecord {
  section: string;
  sectionIndex: number;
  spanish: string;
  gloss: string;
  flag: boolean;       // [FLAG]
  verify: boolean;     // [verify NBLA] / "verify" marker
  fromTable?: boolean; // §13 fixed short phrases
  note?: string;
}

function stripMd(s: string): string {
  return s.replace(/\*\*/g, "").trim();
}

function parseFormulas(text: string): FormulaRecord[] {
  const records: FormulaRecord[] = [];
  const sections = text.split(/\n(?=## )/g);
  let sectionIndex = 0;
  for (const sec of sections) {
    const m = sec.match(/^## +(.+)$/m);
    if (!m) continue;
    sectionIndex++;
    const title = m[1].trim();
    const body = sec.slice(sec.indexOf(m[0]) + m[0].length);

    // §13 table: | Spanish | English | Note |
    const tableLines = body.split("\n").filter((l) => /^\|/.test(l.trim()));
    if (tableLines.length >= 3) {
      for (const line of tableLines.slice(2)) { // skip header + separator
        const cells = line.split("|").map((c) => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
        if (cells.length < 2) fail(`prayer formulas §${sectionIndex} table row malformed: ${line}`);
        records.push({
          section: title, sectionIndex,
          spanish: cells[0], gloss: cells[1],
          note: cells[2] || undefined,
          flag: false,
          verify: /verify/i.test(cells[2] ?? ""),
          fromTable: true
        });
      }
      continue;
    }

    // bold line + following plain line; also bullet idiom lines ("- **X** → Y")
    const lines = body.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const bullet = line.match(/^- \*\*(.+?)\*\*\s*(?:→)?\s*(.*)$/);
      if (bullet) {
        records.push({
          section: title, sectionIndex,
          spanish: stripMd(bullet[2]),
          gloss: stripMd(bullet[1]),
          flag: true,
          verify: /verif/i.test(line),
          note: "idiom replacement"
        });
        continue;
      }
      const bold = line.match(/^\*\*(.+?)\*\*\s*(.*)$/);
      if (!bold) continue;
      let spanish = bold[1].trim();
      let rest = bold[2].trim();
      // Inline gloss on the same line after an em dash ("**Oremos.** — Let's pray.")
      let gloss = "";
      if (rest.startsWith("—")) {
        gloss = rest.replace(/^—\s*/, "");
      } else {
        // gloss is the next non-empty, non-bold line
        for (let j = i + 1; j < lines.length; j++) {
          const nxt = lines[j].trim();
          if (!nxt) continue;
          if (/^\*\*/.test(nxt) || /^#/.test(nxt) || /^---/.test(nxt)) break;
          gloss = nxt;
          break;
        }
      }
      const whole = spanish + " " + gloss;
      records.push({
        section: title, sectionIndex,
        spanish: stripMd(spanish),
        gloss: stripMd(gloss),
        flag: /\[FLAG\]/.test(whole) || /\*\*\[FLAG\]\*\*/.test(gloss),
        verify: /\[verify NBLA\]|NBLA[^.]*verif|verif[^.]*NBLA|— verify/i.test(whole)
      });
    }
  }
  if (records.length === 0) fail("prayer formulas: parsed 0 records");
  return records;
}

// ---------- run pipeline ----------

const emitted: Record<string, unknown> = {};

for (const spec of CSV_SPECS) {
  const rows = buildCsv(spec, true);
  emitted[spec.out] = rows;
  console.log(`[build-data] ${spec.file} → ${spec.out}: ${rows.length} rows`);
}
{
  const rows = buildCsv(ANGLICISMS_SPEC, false);
  emitted[ANGLICISMS_SPEC.out] = rows;
  console.log(`[build-data] ${ANGLICISMS_SPEC.file} → ${ANGLICISMS_SPEC.out}: ${rows.length} rows`);
}
{
  const p = path.join(MD_DIR, "corpus_prayer_formulas.md");
  if (!fs.existsSync(p)) fail("corpus_prayer_formulas.md missing from data/md/");
  const recs = parseFormulas(fs.readFileSync(p, "utf-8"));
  emitted["formulas.json"] = recs;
  const sections = new Set(recs.map((r) => r.sectionIndex)).size;
  console.log(`[build-data] corpus_prayer_formulas.md → formulas.json: ${recs.length} records across ${sections} sections`);
}

// authored JSON passed through with shape validation
function passThrough(name: string, validate: (v: any) => string | null) {
  const p = path.join(ROOT, "data", name);
  if (!fs.existsSync(p)) fail(`data/${name} missing`);
  let v: any;
  try { v = JSON.parse(fs.readFileSync(p, "utf-8")); } catch (e) { fail(`data/${name} is not valid JSON: ${e}`); }
  const err = validate(v);
  if (err) fail(`data/${name}: ${err}`);
  emitted[name] = v;
  console.log(`[build-data] data/${name} → ${name}`);
}

passThrough("profile.json", (v) =>
  v && v.learner && v.systems && v.semester_start && v.sermon_target ? null : "missing learner/systems/semester_start/sermon_target");
passThrough("lessons.json", (v) => {
  if (!Array.isArray(v)) return "must be an array of unit lessons";
  for (const l of v) {
    if (typeof l.unit !== "number" || !l.title || !l.rule || !Array.isArray(l.mechanism)) {
      return `lesson malformed: ${JSON.stringify(l).slice(0, 120)}`;
    }
  }
  return null;
});
passThrough("assessment.json", (v) => {
  if (!Array.isArray(v.sections)) return "sections must be an array";
  for (const s of v.sections) {
    if (!s.id || !s.system || !s.title || !Array.isArray(s.items)) return `section malformed: ${JSON.stringify(s).slice(0, 120)}`;
    for (const it of s.items) {
      if (!it.prompt) return `item missing prompt in section ${s.id}`;
      if (!s.manual && (!Array.isArray(it.answers) || it.answers.length === 0)) return `item missing answers in section ${s.id}: ${it.prompt}`;
    }
  }
  return null;
});

// UTF-8 survival test (per the brief): ñ, á, ¿, «» must survive CSV/MD → JSON.
{
  const all = JSON.stringify(emitted);
  for (const ch of ["ñ", "á", "é", "í", "ó", "ú", "¿", "«", "»"]) {
    if (!all.includes(ch)) fail(`UTF-8 check: "${ch}" did not survive the pipeline`);
  }
  console.log("[build-data] UTF-8 check passed (ñ á é í ó ú ¿ « »)");
}

for (const [name, value] of Object.entries(emitted)) {
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(value, null, 1), "utf-8");
}
console.log(`[build-data] wrote ${Object.keys(emitted).length} files to src/data/`);
