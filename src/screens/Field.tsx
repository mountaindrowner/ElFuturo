import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { defs, newQueue } from "../engine";
import { currentUnit, dayOfUnit, FIELD_PATTERNS, todayKey } from "../schedule";

export default function Field() {
  const session = useLiveQuery(() => db.sessions.get(todayKey()), []);
  const profile = useLiveQuery(() => db.profile.get("profile"), []);
  const [examples, setExamples] = useState<string[]>([]);
  const [who, setWho] = useState("");
  const [manuscriptDraft, setManuscriptDraft] = useState("");

  const unit = currentUnit();
  const pattern = unit.unit > 0 ? FIELD_PATTERNS[unit.unit] : "Assessment week — no field assignment. Rest your ears.";

  useEffect(() => {
    (async () => {
      const fresh = await newQueue();
      const say = fresh
        .map((c) => defs().get(c.id)?.say ?? defs().get(c.id)?.answer)
        .filter((s): s is string => !!s)
        .slice(0, 3);
      setExamples(say);
    })();
  }, []);

  const markDone = async () => {
    const s = (await db.sessions.get(todayKey())) ?? {
      date: todayKey(), minutes: 0, reviewsDone: 0, newIntroduced: 0,
      completed: false, fieldDone: false, teachSeen: false
    };
    s.fieldDone = true;
    s.fieldWho = who || undefined;
    await db.sessions.put(s);
  };

  const saveManuscript = async () => {
    const p = await db.profile.get("profile");
    if (!p) return;
    p.manuscript = manuscriptDraft;
    await db.profile.put(p);
  };

  const isManuscriptUnit = unit.unit === 7;
  const manuscript = profile?.manuscript ?? "";
  const paragraphs = manuscript.split(/\n\s*\n/).filter((p) => p.trim());
  const paraIdx = paragraphs.length ? (dayOfUnit() - 1) % paragraphs.length : 0;

  return (
    <div>
      <h1>Field</h1>
      <p className="sub">Unit {unit.unit > 0 ? unit.unit : "—"} · {unit.name}</p>

      <div className="card">
        <p style={{ margin: "0 0 10px", fontSize: 14.5 }}>{pattern}</p>

        {isManuscriptUnit ? (
          paragraphs.length ? (
            <>
              <p className="sub" style={{ marginBottom: 6 }}>Today’s paragraph ({paraIdx + 1} of {paragraphs.length}):</p>
              <p className="es">{paragraphs[paraIdx]}</p>
            </>
          ) : (
            <>
              <p className="sub">Paste your sermon draft. One paragraph per day gets read aloud.</p>
              <textarea className="es-input" value={manuscriptDraft} onChange={(e) => setManuscriptDraft(e.target.value)} placeholder="Pega tu manuscrito aquí…" />
              <div style={{ marginTop: 10 }}>
                <button className="btn small" onClick={saveManuscript} disabled={!manuscriptDraft.trim()}>Save manuscript</button>
              </div>
            </>
          )
        ) : examples.length > 0 ? (
          <>
            <p className="sub" style={{ marginBottom: 6 }}>Say these to someone today:</p>
            {examples.map((e, i) => (
              <p className="es" key={i} style={{ margin: "6px 0" }}>{e}</p>
            ))}
          </>
        ) : (
          <p className="sub">Today’s new cards will supply the exact lines — run your Drill first.</p>
        )}
      </div>

      {session?.fieldDone ? (
        <div className="card">
          <p className="feedback-ok" style={{ margin: 0 }}>✓ Done{session.fieldWho ? ` — with ${session.fieldWho}` : ""}</p>
        </div>
      ) : (
        <div className="card">
          <label className="fieldlabel">Who did you say it to? (optional)</label>
          <input type="text" value={who} onChange={(e) => setWho(e.target.value)} placeholder="hermano Luis…" />
          <div style={{ marginTop: 12 }}>
            <button className="btn block" onClick={markDone}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
