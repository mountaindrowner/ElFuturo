import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { addCorrectionCard } from "../engine";
import { currentUnit } from "../schedule";
import { lessons } from "../data";
import { SYSTEM_KEYS, SYSTEM_LABELS, type SystemKey } from "../types";

export default function Debrief() {
  const unit = currentUnit();
  const lesson = lessons.find((l) => l.unit === unit.unit);
  const defaultSystem = (lesson?.systems?.[0] as SystemKey) ??
    (unit.unit === 2 ? "accents_orthography"
      : unit.unit === 3 ? "gender_exceptions"
      : unit.unit === 4 ? "object_pronouns"
      : unit.unit === 5 ? "anglicism_replacement"
      : unit.unit >= 6 ? "free_production"
      : "subjunctive_form");

  const [said, setSaid] = useState("");
  const [corrected, setCorrected] = useState("");
  const [who, setWho] = useState("");
  const [system, setSystem] = useState<SystemKey>(defaultSystem);
  const [saved, setSaved] = useState(false);

  const recent = useLiveQuery(() => db.debriefs.orderBy("ts").reverse().limit(5).toArray(), []);

  const save = async () => {
    if (!said.trim() || !corrected.trim()) return;
    await addCorrectionCard(said.trim(), corrected.trim(), who.trim() || undefined, system);
    setSaid(""); setCorrected(""); setWho("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <h1>Debrief</h1>
      <p className="sub">The only place correction enters the app. Each one becomes tomorrow’s first card.</p>

      <div className="card">
        <label className="fieldlabel">What I said (Spanish)</label>
        <input className="es-input" type="text" value={said} onChange={(e) => setSaid(e.target.value)}
          autoCapitalize="off" autoCorrect="off" spellCheck={false} />

        <label className="fieldlabel">What they changed it to (Spanish)</label>
        <input className="es-input" type="text" value={corrected} onChange={(e) => setCorrected(e.target.value)}
          autoCapitalize="off" autoCorrect="off" spellCheck={false} />

        <label className="fieldlabel">Who (optional)</label>
        <input type="text" value={who} onChange={(e) => setWho(e.target.value)} />

        <label className="fieldlabel">Which system</label>
        <select value={system} onChange={(e) => setSystem(e.target.value as SystemKey)}>
          {SYSTEM_KEYS.map((k) => (
            <option key={k} value={k}>{SYSTEM_LABELS[k]}</option>
          ))}
        </select>

        <div style={{ marginTop: 14 }}>
          <button className="btn block" onClick={save} disabled={!said.trim() || !corrected.trim()}>
            Save correction
          </button>
        </div>
        {saved && <p className="feedback-ok">✓ Saved. It will lead tomorrow’s queue.</p>}
      </div>

      {recent && recent.length > 0 && (
        <>
          <h2>Recent corrections</h2>
          <div className="card">
            {recent.map((d) => (
              <div className="miss-item" key={d.id}>
                <div className="said">{d.said}</div>
                <div className="fix">{d.corrected}</div>
                <div className="why">
                  {SYSTEM_LABELS[d.system]}{d.who ? ` · ${d.who}` : ""} · {new Date(d.ts).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
