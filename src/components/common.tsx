import { useEffect, useState } from "react";
import { speak, speechAvailable } from "../speech";
import { charDiff } from "../grading";

export function SpeakButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(speechAvailable());
    const t = setTimeout(() => setOk(speechAvailable()), 500); // voices load async
    return () => clearTimeout(t);
  }, []);
  if (!ok) return null;
  return (
    <button className="btn ghost small" onClick={() => speak(text)} aria-label="Read it to me">
      ▷ Léemelo
    </button>
  );
}

export function Diff({ typed, correct }: { typed: string; correct: string }) {
  const ops = charDiff(typed, correct);
  return (
    <div className="diff">
      {ops.map((op, i) => (
        <span key={i} className={op.kind === "same" ? "" : op.kind}>{op.ch}</span>
      ))}
    </div>
  );
}
