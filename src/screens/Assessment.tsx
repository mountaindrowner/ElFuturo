import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type AssessmentRow } from "../db";
import { assessment } from "../data";
import { isCorrect } from "../grading";
import { semesterWeek } from "../schedule";
import { SYSTEM_LABELS, type SystemKey } from "../types";

type Stage = "intro" | "run" | "review" | "saved";

interface FlatItem {
  key: string;
  sectionId: string;
  sectionTitle: string;
  system: string;
  prompt: string;
  answers?: string[];
  manual: boolean;
  intro?: string;
}

export default function Assessment({ onExit }: { onExit: () => void }) {
  const items: FlatItem[] = useMemo(() => {
    const out: FlatItem[] = [];
    for (const s of assessment.sections) {
      s.items.forEach((it, i) => {
        out.push({
          key: `${s.id}:${i}`,
          sectionId: s.id,
          sectionTitle: s.title,
          system: it.system ?? s.system,
          prompt: it.prompt,
          answers: it.answers,
          manual: !!s.manual,
          intro: i === 0 ? s.intro : undefined
        });
      });
    }
    return out;
  }, []);

  const [stage, setStage] = useState<Stage>("intro");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [startTs, setStartTs] = useState(0);
  const [input, setInput] = useState("");
  const prev = useLiveQuery(() => db.assessments.orderBy("ts").last(), []);
  const [savedRow, setSavedRow] = useState<AssessmentRow | null>(null);

  const item = items[idx];

  const autoCorrect = (it: FlatItem): boolean => {
    if (it.manual) return false;
    const typed = answers[it.key] ?? "";
    const base = isCorrect(typed, it.answers![0], it.answers!.slice(1));
    const key = it.key;
    return key in overrides ? overrides[key] : base;
  };

  const next = () => {
    setAnswers((a) => ({ ...a, [item.key]: input }));
    setInput("");
    if (idx + 1 < items.length) setIdx(idx + 1);
    else setStage("review");
  };

  const save = async () => {
    const perSystem: Record<string, { correct: number; total: number }> = {};
    for (const it of items) {
      const sys = it.system;
      perSystem[sys] ??= { correct: 0, total: 0 };
      if (it.manual) {
        // 0–2 scale → count 2 as correct, 1 as half
        perSystem[sys].total += 1;
        perSystem[sys].correct += (manualScores[it.key] ?? 0) / 2;
      } else {
        perSystem[sys].total += 1;
        if (autoCorrect(it)) perSystem[sys].correct += 1;
      }
    }
    const row: AssessmentRow = {
      ts: Date.now(),
      week: semesterWeek(),
      durationSec: Math.round((Date.now() - startTs) / 1000),
      perSystem,
      answers,
      manualScores
    };
    const id = await db.assessments.add(row);
    setSavedRow({ ...row, id: id as number });
    // assessments update the profile accuracy snapshot too
    const profile = await db.profile.get("profile");
    if (profile) {
      for (const [sys, sc] of Object.entries(perSystem)) {
        const entry = profile.systems[sys as SystemKey];
        if (entry && sc.total > 0) entry.accuracy = Math.round((sc.correct / sc.total) * 100) / 100;
      }
      await db.profile.put(profile);
    }
    setStage("saved");
  };

  if (stage === "intro") {
    return (
      <div>
        <h1>Assessment</h1>
        <p className="sub">The original diagnostic items, verbatim, in one timed sitting. Scored per system so the delta against September 10 is real.</p>
        <div className="card">
          <p style={{ fontSize: 14.5 }}>{items.length} items · about 20 minutes · no FSRS, no hints. Free-production items get scored by your native corrector afterward (0–2 each).</p>
          <button className="btn block" onClick={() => { setStartTs(Date.now()); setStage("run"); }}>Start</button>
        </div>
        <button className="btn ghost small" onClick={onExit}>Back</button>
      </div>
    );
  }

  if (stage === "run") {
    const minutes = Math.floor((Date.now() - startTs) / 60000);
    return (
      <div>
        <h1>Assessment</h1>
        <p className="drill-count">{idx + 1} of {items.length} · {item.sectionTitle} · {minutes} min</p>
        <div className="card">
          {item.intro && <p className="es" style={{ fontSize: 15, color: "var(--text-dim)" }}>{item.intro}</p>}
          <div className="es drill-front">{item.prompt}</div>
          {item.manual ? (
            <textarea className="es-input" value={input} onChange={(e) => setInput(e.target.value)}
              autoCapitalize="off" autoCorrect="off" spellCheck={false} />
          ) : (
            <input className="es-input" type="text" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") next(); }}
              autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false} autoFocus />
          )}
          <div style={{ marginTop: 12 }}>
            <button className="btn" onClick={next}>{idx + 1 < items.length ? "Next" : "Finish"}</button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "review") {
    return (
      <div>
        <h1>Review</h1>
        <p className="sub">Auto-graded by exact match. Tap a verdict to override it (accepted phrasings vary). Score the free-production items 0–2 as your corrector marks them.</p>
        {items.map((it) => (
          <div className="card" key={it.key}>
            <p className="sub" style={{ marginBottom: 4 }}>{it.sectionTitle} · {SYSTEM_LABELS[it.system as SystemKey] ?? it.system}</p>
            <div className="es" style={{ fontSize: 16 }}>{it.prompt}</div>
            <div className="es" style={{ fontSize: 16, color: "var(--text-dim)" }}>→ {answers[it.key] || "(blank)"}</div>
            {it.manual ? (
              <div className="rating-row">
                {[0, 1, 2].map((n) => (
                  <button key={n} className={(manualScores[it.key] ?? 0) === n ? "primary" : ""}
                    onClick={() => setManualScores((m) => ({ ...m, [it.key]: n }))}>{n}</button>
                ))}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "var(--text-dim)", margin: "6px 0" }}>Key: {it.answers!.join(" · ")}</div>
                <button
                  className={`btn small ${autoCorrect(it) ? "" : "ghost"}`}
                  onClick={() => setOverrides((o) => ({ ...o, [it.key]: !autoCorrect(it) }))}
                >
                  {autoCorrect(it) ? "✓ correct" : "✗ miss"}
                </button>
              </>
            )}
          </div>
        ))}
        <button className="btn block" onClick={save}>Save assessment</button>
      </div>
    );
  }

  // saved: show delta vs previous
  const cur = savedRow!;
  const systems = Object.keys(cur.perSystem);
  return (
    <div>
      <h1>Saved</h1>
      <p className="sub">Week {cur.week} · {Math.round(cur.durationSec / 60)} minutes</p>
      <div className="card">
        <table className="delta-table">
          <thead>
            <tr><th>System</th><th>Now</th>{prev && prev.id !== cur.id && <th>Then</th>}<th>Δ</th></tr>
          </thead>
          <tbody>
            {systems.map((sys) => {
              const c = cur.perSystem[sys];
              const nowPct = c.total ? Math.round((c.correct / c.total) * 100) : 0;
              const p = prev && prev.id !== cur.id ? prev.perSystem[sys] : undefined;
              const thenPct = p && p.total ? Math.round((p.correct / p.total) * 100) : null;
              const delta = thenPct == null ? null : nowPct - thenPct;
              return (
                <tr key={sys}>
                  <td>{SYSTEM_LABELS[sys as SystemKey] ?? sys}</td>
                  <td>{nowPct}%</td>
                  {prev && prev.id !== cur.id && <td>{thenPct == null ? "—" : `${thenPct}%`}</td>}
                  <td className={delta == null ? "" : delta >= 0 ? "up" : "down"}>
                    {delta == null ? "—" : `${delta >= 0 ? "+" : ""}${delta}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button className="btn block" onClick={onExit}>Done</button>
    </div>
  );
}
