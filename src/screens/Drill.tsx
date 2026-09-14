import { useEffect, useMemo, useRef, useState } from "react";
import type { StoredCard } from "../db";
import { db } from "../db";
import { defs, reviewQueue, newQueue, applyReview, type RatingValue } from "../engine";
import { isCorrect, normalize } from "../grading";
import { todayKey } from "../schedule";
import { DRILL_LABELS, type CardDef } from "../types";
import { Diff, SpeakButton } from "../components/common";

type Phase = "loading" | "prompt" | "feedback" | "done";

interface Graded {
  correct: boolean;
  typedJoined: string;
  answerJoined: string;
  perField?: boolean[];
}

export default function Drill({ onExit }: { onExit: () => void }) {
  const [queue, setQueue] = useState<StoredCard[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [inputs, setInputs] = useState<string[]>([]);
  const [graded, setGraded] = useState<Graded | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const reviews = await reviewQueue();
    const fresh = await newQueue();
    setReviewCount(reviews.length);
    // Correction cards (source: field) sort first in every queue, even while still new.
    const q = [...reviews, ...fresh].sort((a, b) =>
      (a.source === "field") === (b.source === "field") ? 0 : a.source === "field" ? -1 : 1
    );
    setQueue(q);
    setPhase(q.length ? "prompt" : "done");
    if (!q.length) {
      const s = await db.sessions.get(todayKey());
      if (s && !s.completed) { s.completed = true; await db.sessions.put(s); }
    }
  };

  useEffect(() => { load(); }, []);

  const card = queue[0];
  const def: CardDef | undefined = card ? defs().get(card.id) : undefined;

  const fields = useMemo(() => {
    if (!card) return [];
    if (def?.fields) return def.fields;
    const answer = def?.answer ?? card.answer ?? "";
    return [{ label: "", answer }];
  }, [card?.id]);

  useEffect(() => {
    setInputs(fields.map(() => ""));
    setGraded(null);
    if (card) setPhase("prompt");
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [card?.id]);

  if (phase === "loading") return <p className="sub">Cargando…</p>;

  if (phase === "done" || !card) {
    return (
      <div>
        <h1>Drill</h1>
        <div className="card">
          <p className="es">Terminaste por hoy. 🕊</p>
          <p className="sub">No cards due. Reviews and new cards return tomorrow — or after your next Debrief.</p>
          <button className="btn block" onClick={onExit}>Back to Today</button>
        </div>
      </div>
    );
  }

  const front = def?.front ?? card.front ?? "";
  const hint = def?.hint ?? (card.drillType === "correction" ? "Type what they changed it to" : "");
  const feedbackRule = def?.feedback;
  const sayText = def?.say ?? card.answer ?? "";
  const isCorrection = card.drillType === "correction";

  const check = () => {
    const perField = fields.map((f, i) => isCorrect(inputs[i] ?? "", f.answer, i === 0 ? def?.accept : undefined));
    const correct = perField.every(Boolean);
    setGraded({
      correct,
      typedJoined: inputs.join(" · "),
      answerJoined: fields.map((f) => f.answer).join(" · "),
      perField
    });
    setPhase("feedback");
  };

  const rate = async (rating: RatingValue) => {
    if (!graded) return;
    await applyReview(card, rating, graded.correct);
    const rest = queue.slice(1);
    setQueue(rest);
    if (!rest.length) await load();
  };

  const left = queue.length;
  const isNew = card.state === 0;

  return (
    <div>
      <h1>Drill</h1>
      <p className="drill-count">
        {left} left · {DRILL_LABELS[card.drillType]}
        {isCorrection ? " · from the field" : isNew ? " · new" : " · review"}
      </p>

      <div className="card">
        {isCorrection && <p className="sub" style={{ marginBottom: 4 }}>You said:</p>}
        <div className="es drill-front">{front}</div>
        {hint && <div className="drill-hint">{hint}</div>}

        {phase === "prompt" && (
          <>
            {fields.map((f, i) => (
              <div className="pyr-field" key={i}>
                {f.label && <div className="lbl">{f.label}</div>}
                <input
                  ref={i === 0 ? inputRef : undefined}
                  className="es-input"
                  type="text"
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  value={inputs[i] ?? ""}
                  onChange={(e) => {
                    const next = [...inputs];
                    next[i] = e.target.value;
                    setInputs(next);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter" && i === fields.length - 1) check(); }}
                />
              </div>
            ))}
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button className="btn" onClick={check} disabled={inputs.every((v) => !normalize(v))}>Check</button>
              <SpeakButton text={sayText} />
            </div>
          </>
        )}

        {phase === "feedback" && graded && (
          <>
            {graded.correct ? (
              <p className="feedback-ok">✓ Correcto</p>
            ) : (
              <>
                <p className="feedback-miss">✗ Not yet</p>
                {fields.map((f, i) =>
                  graded.perField && graded.perField[i] ? null : (
                    <div key={i} style={{ marginBottom: 8 }}>
                      {f.label && <div className="lbl" style={{ fontSize: 12, color: "var(--text-dim)" }}>{f.label}</div>}
                      <Diff typed={inputs[i] ?? ""} correct={f.answer} />
                    </div>
                  )
                )}
              </>
            )}
            {!graded.correct && feedbackRule && <div className="rule-note">{feedbackRule}</div>}
            {graded.correct && <div className="es" style={{ color: "var(--text-dim)", fontSize: 16 }}>{graded.answerJoined}</div>}
            <div style={{ marginTop: 8 }}><SpeakButton text={sayText} /></div>
            <div className="rating-row">
              <button className={!graded.correct ? "primary" : ""} onClick={() => rate(1)}>Again</button>
              <button onClick={() => rate(2)}>Hard</button>
              <button className={graded.correct ? "primary" : ""} onClick={() => rate(3)}>Good</button>
              <button onClick={() => rate(4)}>Easy</button>
            </div>
          </>
        )}
      </div>

      <p className="sub">{reviewCount > 0 ? `${Math.min(reviewCount, left)} of today’s queue are reviews; reviews come first.` : "New cards from the current unit."}</p>
    </div>
  );
}
