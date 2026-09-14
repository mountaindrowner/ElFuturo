# Púlpito

A personal, phone-first PWA that rebuilds one heritage speaker's formal Spanish for the pulpit.
Single user. No accounts, no server, no AI at runtime. All content ships as static data files;
correction comes from real people, captured through the Debrief screen.

The full specification is in [BUILD_BRIEF.md](BUILD_BRIEF.md).

## Develop

```bash
npm install
npm run dev        # runs the data pipeline, then Vite
```

`scripts/build-data.ts` converts `data/csv/*.csv` and `data/md/*.md` into `src/data/*.json`,
validating every column and failing the build on a malformed row. `corpus_anglicisms.csv`
is optional until it lands (Unit 5); the Swap drill appears automatically once it does.

## Deploy (GitHub Pages)

Pushes to the default branch run `.github/workflows/deploy.yml`, which builds and publishes
`dist/` to GitHub Pages. One-time setup: repository **Settings → Pages → Source: GitHub Actions**.

The app is then served at `https://<owner>.github.io/ElFuturo/`.

## Install on iPhone

Open the deployed URL in Safari → Share → **Add to Home Screen**. The app works offline
after the first load; all state lives in IndexedDB on the phone.

## Structure

- `data/` — corpus CSVs, prayer formulas, lessons, assessment keys, diagnostic profile (the contract)
- `scripts/build-data.ts` — build-time pipeline (CSV/MD → JSON, validation, UTF-8 checks)
- `src/cards.ts` — generates every drill card from data; no hand-authored cards
- `src/engine.ts` — Dexie + ts-fsrs: queues, caps (15 new / 60 reviews, reviews win), status auto-update
- `src/screens/` — Today, Drill, Field, Debrief, Track, Teach, Assessment
