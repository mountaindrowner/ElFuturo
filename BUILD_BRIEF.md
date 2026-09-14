# Build brief: Púlpito (working title)

A personal, phone-first PWA that rebuilds one heritage speaker's formal Spanish for the pulpit. Single user (Mark). No accounts, no server, no AI at runtime. All content ships as static data files. Correction comes from real people, captured through the Debrief screen.

Read this whole file before writing code. Then read `CLAUDE_CODE_START.md` at the bottom for the first milestone.

---

## 1. Who this is for (fixed — do not generalize)

- Mark, 38, pastor in Laredo, TX. Fluent in informal South Texas Spanish. Missing the formal grammar system.
- Target variety: Northern Mexican / Texas-Mexican Spanish. Accent is fine and never corrected.
- Register: evangelical. `orar` never `rezar`; `el culto` never `la misa`; `pastor` never `padre`; `la Santa Cena` never `eucaristía`. `ustedes` to the congregation, `tú` to God.
- Bible: NBLA. Scripture strings in the data are used as-is; the app never fetches or generates Scripture.
- Time budget: 30 minutes per day.
- Learning style: he learns when he sees the underlying system. Every Teach screen shows the rule as a mechanism, never as a list of exceptions to memorize. Numbers clicked for him when he saw they stack (`tres mil doscientos quince`); every unit is taught that way.
- First milestone: a short manuscript sermon in Spanish, target week of December 6, 2026 (week 12 from September 14, 2026).

## 2. Diagnostic profile (September 10, 2026)

This is the starting state. The app loads it from `data/profile.json` and updates it from drill results.

| System | Status | Priority | Evidence |
|---|---|---|---|
| subjunctive_form | missing | 1 | 0/6. Triggers correct (`que` placed right every time); verb stayed indicative |
| commands | missing | 1 | 2/6. Used indicative as ustedes/negative commands (levantan, no tienen) |
| accents_orthography | missing | 2 | Saw 0/8 accents and 0/4 spelling errors; writes biene, centaba, conosco |
| free_production | blocked | 2 | Could not write a prayer or altar call cold |
| gender_exceptions | shaky | 3 | 2/7. Agreement engine works; gender lookup wrong on -ma nouns, mano/foto, agua |
| object_pronouns | shaky | 4 | Avoids double pronouns (se lo); drops direct object; lo/le swapped |
| irregular_yo | shaky | 4 | sabo, conosco |
| anglicism_replacement | shaky | 5 | Detects 5/6; can't always replace (aplicar por, raite) |
| ser_estar | solid | none | 5/5 |
| preterite_imperfect | solid | none | 6/6 |
| present_regular | solid | none | 6/6 |
| anglicism_detection | solid | none | 5/6 |

Key structural fact: `subjunctive_form` and `commands` are one mechanism (the yo-stem vowel flip). Unit 1 teaches them together.

Non-goals: no preterite/imperfect unit, no ser/estar unit, no generic vocabulary lists, no gamification beyond a streak and the sermon countdown.

`data/profile.json`:
```json
{
  "learner": "Mark",
  "semester_start": "2026-09-14",
  "sermon_target": "2026-12-06",
  "daily_minutes": 30,
  "systems": {
    "subjunctive_form":       { "status": "missing", "priority": 1, "accuracy": 0.0 },
    "commands":               { "status": "missing", "priority": 1, "accuracy": 0.33 },
    "accents_orthography":    { "status": "missing", "priority": 2, "accuracy": 0.0 },
    "free_production":        { "status": "blocked", "priority": 2, "accuracy": null },
    "gender_exceptions":      { "status": "shaky",   "priority": 3, "accuracy": 0.29 },
    "object_pronouns":        { "status": "shaky",   "priority": 4, "accuracy": 0.25 },
    "irregular_yo":           { "status": "shaky",   "priority": 4, "accuracy": 0.5 },
    "anglicism_replacement":  { "status": "shaky",   "priority": 5, "accuracy": 0.67 },
    "ser_estar":              { "status": "solid",   "priority": 0, "accuracy": 1.0 },
    "preterite_imperfect":    { "status": "solid",   "priority": 0, "accuracy": 1.0 },
    "present_regular":        { "status": "solid",   "priority": 0, "accuracy": 1.0 },
    "anglicism_detection":    { "status": "solid",   "priority": 0, "accuracy": 0.83 }
  }
}
```

## 3. Stack

- Vite + React + TypeScript. `vite-plugin-pwa` for install/offline. Deploy as a static site (GitHub Pages or Vercel); Mark installs it to his iPhone home screen.
- State: IndexedDB via Dexie. Tables: `cards`, `reviews`, `sessions`, `debriefs`, `assessments`, `profile`.
- Scheduling: `ts-fsrs` (open-source FSRS). One card per data row per drill type.
- Data pipeline: `scripts/build-data.ts` reads `data/csv/*.csv` and `data/md/*.md`, validates columns, emits `src/data/*.json`. Runs on `npm run build`. Fail the build on a malformed row; print the row.
- Optional, no API: `window.speechSynthesis` with an `es-MX` voice for "read it to me" on Teach and Drill screens. Feature-detect; hide the button if no Spanish voice exists.
- No fetch calls at runtime. No analytics. No localStorage (Dexie only).
- All text UTF-8. Test that `ñ`, `á`, `¿`, `«»` survive the CSV → JSON pipeline.

## 4. Data files (already produced — do not regenerate)

Place in `data/csv/` and `data/md/`. Columns are the contract; add columns only by extending, never renaming.

| File | Rows | Columns | Feeds |
|---|---|---|---|
| `corpus_commands.csv` | ~110 | english, spanish_tu, spanish_usted, spanish_ustedes, spanish_negative_tu, verb_infinitive, yo_form_stem, note | Unit 1 command drills |
| `corpus_subjunctive_triggers.csv` | ~170 | english, spanish, trigger_phrase, subjunctive_verb, infinitive, indicative_form, note | Unit 1 flip drills; rows with `—` in subjunctive_verb are contrast rows (indicative) and are drilled as "flip or don't flip" |
| `corpus_gender_nouns.csv` | ~50 | noun, gender, article_singular, article_plural, example_phrase_from_my_sermons, exception_class, note | Unit 3 |
| `corpus_accent_words.csv` | ~200 | word, stress_rule, pair_partner, corpus_weight, detail | Unit 2; `corpus_weight` seeds initial FSRS order |
| `corpus_prayer_formulas.md` | 14 sections | Spanish line in bold, English gloss on next line; `[FLAG]` and `[verify NBLA]` markers | Unit 6 cloze + Field assignments |
| `corpus_anglicisms.csv` | pending | border_form, standard_mexican, context_from_my_sermon, register | Unit 5 |

Planned column additions (Cowork will add; treat as optional until present):
- `from_my_spanish` (boolean) on commands and subjunctive rows. Rows tagged true are Mark's actual errors from his own Spanish sermon. FSRS introduces them first regardless of unit.
- `verified` (boolean) on any row containing Scripture. Unverified Scripture rows are excluded from drills until Mark verifies them in the app (a "verify against NBLA" checklist under Track).

Parsing `corpus_prayer_formulas.md`: split on `## ` headings; within each, pair each bold line with the following plain line. Preserve markers. Table in §13 becomes its own record set.

## 5. Semester 1 (12 weeks, September 14 → December 6, 2026)

Fixed plan. Units are the curriculum; FSRS is the review engine underneath.

| Weeks | Unit | System(s) | Data | Field assignment pattern |
|---|---|---|---|---|
| 1–2 | 1 The flip | subjunctive_form, commands | commands, subjunctive_triggers | Say 3 ustedes commands / 3 `que` sentences to a native speaker; ask "¿así se dice?" |
| 3 | 2 Sound and stress | accents_orthography | accent_words | Read one prayer formula aloud to a native speaker; ask which words sounded off |
| 4 | 3 Gender exceptions | gender_exceptions | gender_nouns | Use 5 exception nouns in conversation |
| 5 | 4 Se lo | object_pronouns | new drill rows generated from commands/subjunctive rows that contain object pronouns | Tell someone a short story using "se lo / se la" twice |
| 6 | Assessment 1 | all | diagnostic items (§8) | — |
| 7 | 5 Border to pulpit | anglicism_replacement | anglicisms | Ask a native speaker to catch one anglicism in a 2-minute conversation |
| 8–9 | 6 Formulas | free_production | prayer_formulas | Pray one formula publicly (small group, then service) |
| 10–11 | 7 The manuscript | all | Mark's sermon draft, pasted into the app as a text | Read one paragraph aloud to a native speaker per day; log corrections |
| 12 | Assessment 2 + sermon | all | — | Preach |

Daily session, 30 minutes, in this order: Teach (5 min, only on the first days of a unit, then skipped) → Drill (15–20 min: FSRS reviews first, then new cards from the current unit) → Field (2 min: today's assignment shown; mark "done" later) → Debrief (evening, 5 min).

## 6. Screens (the core loop)

Six screens, bottom tab bar in this order: Today, Drill, Field, Debrief, Track, Teach. "Today" is the home screen and just runs the daily session in sequence.

### Teach
One rule per screen, shown as a mechanism. Content comes from `data/lessons.json` (Mark writes these in chat; Unit 1 is included below). Layout: rule stated in one sentence; the mechanism as a three-column transform (input → operation → output) using his own corpus rows as examples; then a "your misses" block that reruns his diagnostic errors through the rule. A "read it to me" button if speech synthesis is available. No quizzes on this screen.

### Drill
Typed production only. No multiple choice anywhere (recognition hides his gap; production reveals it). Grading: normalize whitespace and case, then exact match. Accents are graded (a missing tilde is a miss; it is one of his target systems). Show a character-level diff on a miss and the rule that governs the diff. FSRS rating buttons after each card: Again / Hard / Good / Easy.

Drill types, each generated from data, no hand-authoring:
1. **Flip** — show `english` + `infinitive` + `yo_form_stem` (from commands) or `indicative_form` (from subjunctive_triggers); type the subjunctive/command form. Checks against the target column.
2. **Command pyramid** — show `english`; type tú, usted, ustedes, negative tú in four fields.
3. **Flip or don't** — subjunctive_triggers rows including contrast rows; show the sentence with the verb blanked and the infinitive; type the form. Correct answer may be indicative.
4. **Accent placement** — show the word with all tildes stripped; type it with the tilde. Feedback names the stress rule from `stress_rule` and `detail`.
5. **Gender chain** — show `(adjective) noun`; type article + noun + agreed adjective. Adjective list: grande, nuevo, santo, viejo, frío, derecho, mexicano, difícil.
6. **Formula cloze** — a prayer formula line with one verb or connector blanked; type it. Blank selection: prefer verbs in subjunctive or imperative.
7. **Swap** — show the border form; type the standard Mexican form.

Card identity: `${file}:${rowIndex}:${drillType}`. Initial FSRS ordering: `from_my_spanish` true first, then current unit rows, then `corpus_weight` descending, then row order. Daily new-card cap: 15. Review cap: 60. If the review queue exceeds the cap, reviews win and no new cards are introduced that day.

### Field
Shows today's assignment (from the unit's pattern in §5, with the specific rows drawn from that day's new cards, e.g. "Say these three to someone: Levanten las manos / Pasen al frente / No tengan miedo"). One button: "Done." One field: who you said it to (free text; optional).

### Debrief
The only place correction enters the app. Form: what I said (Spanish, required) / what they changed it to (Spanish, required) / who (optional) / which system (select from the 12 systems, default: current unit). Saving creates a new FSRS card of type **Correction**: show "what I said", type "what they changed it to". These cards are tagged `source: field` and sort first in every review queue. Also increments a per-system "corrected in the wild" counter on Track.

### Track
Four blocks, top to bottom:
1. Sermon countdown: days until `sermon_target`, week N of 12, current unit.
2. Systems: the 12 systems as horizontal bars, accuracy over the last 50 reviews per system, colored by status (missing / shaky / solid). Status auto-updates: solid ≥ 0.9 over ≥ 40 reviews; shaky 0.6–0.9; missing < 0.6. Never downgrades a system that started solid without ≥ 40 reviews of evidence.
3. Streak and minutes: days in a row with a completed session; minutes today.
4. Chores: "Verify against NBLA" checklist (unverified Scripture rows), and assessment history.

### Assessment (weeks 6 and 12, launched from Today)
Re-run the original diagnostic items (§8) as a single timed session, ungraded by FSRS, scored per system exactly like the September 10 diagnostic. Store in `assessments`. Show the delta table against the previous assessment.

## 7. Design direction

Mark's church materials are deep navy and warm gold; use that, not a generic palette.

- Colors: navy `#0F1E3D` (surfaces in dark mode, text in light mode), paper `#F7F4EC`, gold `#C8A04B` (one accent: correct answers, the current unit, the streak), ink `#1B1B1B`, muted `#6B7280`, miss `#B5433B`. Dark mode is the default (he studies on his phone at night); light mode available.
- Type: one serif for Spanish content (the thing being learned should look like Scripture on a page, not like a form field) — Source Serif 4 or similar, 20px on Drill. One sans for UI (system sans). Never all caps in UI; his manuscripts use ALL CAPS for punch lines and that convention is his, not the app's.
- Layout: one thing per screen. Drill shows one card, full width, answer field, then feedback. Mobile only; desktop can be the same column centered.
- No mascots, no confetti, no XP. The reward is the countdown and the bars moving.

## 8. Diagnostic items (for Assessments)

Reuse verbatim so scores are comparable. Store in `data/assessment.json`.

1. Accents/spelling (rewrite): "Cuando llegue a la iglesia, el pastor ya estaba orando." / "Mi mama me pregunto si tu vas a venir el domingo." / "Yo se que el no puede, pero ojala que si." / "Haber si vienen los jovenes al culto." / "Hiba a llamarte pero no pude." / "Yo conosco a ese hermano, ay muchos como el."
2. Present: yo saber, nosotros tener, ustedes ir, ella poder, yo conocer, ustedes decir, nosotros venir, tú pedir.
3. Ser/estar: "Jesús ___ el Hijo de Dios." / "El culto ___ a las diez." / "Los hermanos ___ cansados hoy." / "Ella ___ enfermera." / "La iglesia ___ llena esta noche."
4. Gender: (grande) problema, (derecho) mano, (frío) agua, (santo) día, (viejo) foto, (mexicano) costumbre, (nuevo) sistema.
5. Commands: Repent! (tú) / Let's pray. / Raise your hands. (church) / Don't be afraid. (tú) / Come forward. (usted) / Tell him the truth. (tú)
6. Subjunctive: May God bless you. (tú) / We ask you, Lord, to heal her. / I want you all to know that God loves you. / I hope he comes on Sunday. / I don't think he's here. / Pray so that they believe.
7. Story (preterite/imperfect): "When Jesus arrived at the town, the people were waiting for him. A man came up to him and asked him for help. He was blind, and he always sat by the road. Jesus healed him, and everyone praised God."
8. Pronouns/por/para: I gave it to him. (the Bible) / God sent him for us. / This message is for all of you. / I'm going to tell it to you all.
9. Border→standard: "Voy a parquear la troca en la yarda." / "Apliqué por el trabajo ayer." / "¿Me das un raite al culto?" / "Te llamo pa' atrás." / "¿Me wachas a los niños un ratito?" / "Vamos a lonchar después del servicio."
10. Free production: opening prayer (3–4 sentences); altar call (3 sentences). Scored by Mark's native corrector, entered manually as a 0–2 per item.

Answer keys live in `data/assessment.json`; write them from the corpus files and standard Mexican Spanish. Where a key has more than one acceptable answer, store an array.

## 9. Unit 1 lesson content (`data/lessons.json`, first entry)

```json
{
  "unit": 1,
  "title": "The flip",
  "systems": ["subjunctive_form", "commands"],
  "rule": "Start from the yo-form, drop the -o, swap the vowel: -ar verbs take e, -er and -ir verbs take a. That stem is the subjunctive, and it is also every ustedes command, every usted command, and every negative command.",
  "mechanism": [
    { "input": "sano (sanar)", "op": "-o, +e", "output": "sane → te pedimos que sanes" },
    { "input": "levanto (levantar)", "op": "-o, +e", "output": "levante → levanten las manos" },
    { "input": "creo (creer)", "op": "-o, +a", "output": "crea → ora para que crean" },
    { "input": "tengo (tener)", "op": "-o, +a", "output": "tenga → no tengan miedo" },
    { "input": "vengo (venir)", "op": "-o, +a", "output": "venga → espero que venga" },
    { "input": "conozco (conocer)", "op": "-o, +a", "output": "conozca → conozcan a Dios" },
    { "input": "me acerco (acercarse)", "op": "-o, +e, c→qu", "output": "acerque → acérquese" }
  ],
  "memorize": ["sea (ser)", "esté (estar)", "vaya (ir)", "dé (dar)", "sepa (saber)", "haya (haber)"],
  "exception": "Tú positive commands do not flip. They are the él present form: levanta, cree, ven, di, ten, haz, pon, sal, sé, ve.",
  "your_misses": [
    { "said": "te pedimos que sanas", "rule": "sano → sane", "correct": "te pedimos que sanes" },
    { "said": "quiero que todos saben", "rule": "memorized stem sep-", "correct": "quiero que todos sepan" },
    { "said": "espero que biene", "rule": "vengo → venga; v not b", "correct": "espero que venga" },
    { "said": "no creo que esta aquí", "rule": "memorized: esté", "correct": "no creo que esté aquí" },
    { "said": "ora para que creen", "rule": "creo → crea", "correct": "ora para que crean" },
    { "said": "levantan sus manos", "rule": "levanto → levante", "correct": "levanten las manos" },
    { "said": "no tienen miedo", "rule": "tengo → tenga", "correct": "no tengan miedo / no tengas miedo" },
    { "said": "acercase", "rule": "me acerco → acerque, c→qu", "correct": "acérquese" },
    { "said": "repienta", "rule": "tú positive = él form of arrepentirse", "correct": "arrepiéntete" }
  ],
  "trigger_reminder": "You already place 'que' correctly after querer, pedir, esperar, no creer, para. The trigger layer is not the gap. Only the verb after 'que' changes."
}
```

Units 2–7 lesson entries will be supplied later in the same shape. Build the Teach screen against this schema.

## 10. Build order

Ship each milestone as a working app before starting the next. Mark tests on his phone between milestones.

- **M1 (first weekend):** data pipeline for all five files; Dexie + ts-fsrs wired; Drill screen with the Flip and Command pyramid types; Today screen that just opens Drill. Deployed and installable. This alone lets Unit 1 start.
- **M2:** Track (countdown, system bars, streak). Status auto-update logic.
- **M3:** Teach screen from `lessons.json`; Flip-or-don't, Accent placement, Gender chain drill types.
- **M4:** Field and Debrief; Correction cards.
- **M5:** Formula cloze and Swap drills; prayer_formulas parser; anglicisms file.
- **M6:** Assessment mode; NBLA verification checklist; PWA polish (offline, icons, iOS install prompt copy).

---

## CLAUDE_CODE_START.md

Paste this as the first message in Claude Code, in a fresh repo with `data/csv/` and `data/md/` already containing the five corpus files and `BUILD_BRIEF.md` at the root:

> Read BUILD_BRIEF.md in full. Build milestone M1 only: Vite + React + TypeScript PWA, Dexie, ts-fsrs, a build-time script that converts the CSV and MD files in `data/` to JSON with column validation, and a Drill screen implementing the Flip and Command pyramid drill types with typed answers, accent-sensitive exact-match grading, a character diff on misses, and FSRS rating buttons. Initial card order per §6. Dark navy/gold design per §7, serif for Spanish text. Deploy config for GitHub Pages. Stop after M1 and tell me how to install it on my iPhone.
