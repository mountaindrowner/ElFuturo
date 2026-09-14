import { useState } from "react";
import { lessons } from "../data";
import { currentUnit } from "../schedule";
import { SpeakButton } from "../components/common";
import { SYSTEM_LABELS, type SystemKey } from "../types";

export default function Teach() {
  const unitNow = currentUnit().unit;
  const initial = lessons.find((l) => l.unit === unitNow) ?? lessons[0];
  const [unit, setUnit] = useState(initial?.unit ?? 1);
  const lesson = lessons.find((l) => l.unit === unit);

  return (
    <div>
      <h1>Teach</h1>
      <p className="sub">One rule per screen, shown as a mechanism. No quizzes here.</p>

      {lessons.length > 1 && (
        <div className="chips" style={{ marginBottom: 12 }}>
          {lessons.map((l) => (
            <button
              key={l.unit}
              className="chip"
              style={{ cursor: "pointer", borderColor: l.unit === unit ? "var(--gold)" : undefined, background: "none", color: "var(--text)" }}
              onClick={() => setUnit(l.unit)}
            >
              Unit {l.unit}
            </button>
          ))}
        </div>
      )}

      {!lesson ? (
        <div className="card">
          <p className="sub" style={{ margin: 0 }}>
            No lesson written for Unit {unitNow} yet. Lessons arrive unit by unit; the drills still run.
          </p>
        </div>
      ) : (
        <>
          <div className="card">
            <p className="sub" style={{ marginBottom: 4 }}>
              Unit {lesson.unit} · {lesson.systems.map((s) => SYSTEM_LABELS[s as SystemKey] ?? s).join(" + ")}
            </p>
            <h1 style={{ fontFamily: "var(--serif)" }}>{lesson.title}</h1>
            <p className="es" style={{ fontSize: 17 }}>{lesson.rule}</p>
            <SpeakButton text={lesson.rule} />
          </div>

          <h2>The mechanism</h2>
          <div className="card">
            <table className="mech">
              <tbody>
                {lesson.mechanism.map((m, i) => (
                  <tr key={i}>
                    <td className="in">{m.input}</td>
                    <td className="op">{m.op}</td>
                    <td className="out">{m.output}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lesson.memorize && lesson.memorize.length > 0 && (
            <>
              <h2>Memorize — these don’t follow the rule</h2>
              <div className="chips">
                {lesson.memorize.map((m) => <span className="chip" key={m}>{m}</span>)}
              </div>
            </>
          )}

          {lesson.exception && (
            <div className="rule-note" style={{ marginTop: 16 }}>{lesson.exception}</div>
          )}

          {lesson.your_misses && lesson.your_misses.length > 0 && (
            <>
              <h2>Your misses, rerun through the rule</h2>
              <div className="card">
                {lesson.your_misses.map((m, i) => (
                  <div className="miss-item" key={i}>
                    <div className="said">{m.said}</div>
                    <div className="fix">{m.correct}</div>
                    <div className="why">{m.rule}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {lesson.trigger_reminder && <p className="sub">{lesson.trigger_reminder}</p>}
        </>
      )}
    </div>
  );
}
