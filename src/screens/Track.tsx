import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { streak } from "../engine";
import { allCards } from "../cards";
import { currentUnit, daysToSermon, semesterWeek, todayKey } from "../schedule";
import { SYSTEM_KEYS, SYSTEM_LABELS } from "../types";

export default function Track() {
  const profile = useLiveQuery(() => db.profile.get("profile"), []);
  const session = useLiveQuery(() => db.sessions.get(todayKey()), []);
  const verifications = useLiveQuery(() => db.verifications.toArray(), []);
  const assessments = useLiveQuery(() => db.assessments.orderBy("ts").toArray(), []);
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => { streak().then(setStreakDays); }, [session?.completed]);

  const unit = currentUnit();
  const week = semesterWeek();
  const verifiedSet = new Set((verifications ?? []).filter((v) => v.verified).map((v) => v.key));
  const { verifyItems } = allCards();
  const pending = verifyItems.filter((v) => !verifiedSet.has(v.key));

  const toggleVerify = async (key: string) => {
    const existing = await db.verifications.get(key);
    await db.verifications.put({ key, verified: !(existing?.verified), ts: Date.now() });
  };

  const setTheme = async (theme: "dark" | "light") => {
    const p = await db.profile.get("profile");
    if (!p) return;
    p.theme = theme;
    await db.profile.put(p);
  };

  if (!profile) return null;

  return (
    <div>
      <h1>Track</h1>

      {/* 1. sermon countdown */}
      <div className="card countdown">
        <div className="big">{daysToSermon()}</div>
        <div className="small">days to the sermon · week {week} of 12 · {unit.name}</div>
      </div>

      {/* 2. systems */}
      <h2>Systems — accuracy over the last 50 reviews</h2>
      <div className="card">
        {SYSTEM_KEYS.map((k) => {
          const s = profile.systems[k];
          const pct = s.accuracy == null ? 0 : Math.round(s.accuracy * 100);
          return (
            <div className="sysrow" key={k}>
              <div className="name">
                <span>
                  {SYSTEM_LABELS[k]}
                  {(s.correctedInWild ?? 0) > 0 && <span style={{ color: "var(--muted)" }}> · {s.correctedInWild} corrected in the wild</span>}
                </span>
                <span className="pct">{s.accuracy == null ? "—" : `${pct}%`} · {s.status}</span>
              </div>
              <div className="bar">
                <div className={`fill ${s.status}`} style={{ width: `${Math.max(pct, s.accuracy == null ? 0 : 4)}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. streak and minutes */}
      <div className="card" style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "var(--gold)" }}>{streakDays}</div>
          <div className="sub" style={{ margin: 0 }}>day streak</div>
        </div>
        <div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>{session?.minutes ?? 0}</div>
          <div className="sub" style={{ margin: 0 }}>minutes today</div>
        </div>
      </div>

      {/* 4. chores */}
      <h2>Verify against NBLA — {pending.length} pending</h2>
      <div className="card">
        {verifyItems.length === 0 && <p className="sub" style={{ margin: 0 }}>Nothing to verify.</p>}
        {verifyItems.map((v) => {
          const ok = verifiedSet.has(v.key);
          return (
            <label className="chore" key={v.key} style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={ok} onChange={() => toggleVerify(v.key)} />
              <span className="es" style={{ opacity: ok ? 0.5 : 1 }}>{v.label}</span>
            </label>
          );
        })}
      </div>
      <p className="sub">Unverified Scripture rows stay out of the drills until you check them here.</p>

      <h2>Assessment history</h2>
      <div className="card">
        {(assessments ?? []).length === 0 && <p className="sub" style={{ margin: 0 }}>None yet. Week 6 is the first.</p>}
        {(assessments ?? []).map((a) => (
          <div className="chore" key={a.id}>
            <span>
              Week {a.week} · {new Date(a.ts).toLocaleDateString()} ·{" "}
              {Object.values(a.perSystem).reduce((n, s) => n + s.correct, 0)}/
              {Object.values(a.perSystem).reduce((n, s) => n + s.total, 0)} correct
            </span>
          </div>
        ))}
      </div>

      <h2>Theme</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <button className={`btn small ${profile.theme === "dark" ? "" : "ghost"}`} onClick={() => setTheme("dark")}>Dark</button>
        <button className={`btn small ${profile.theme === "light" ? "" : "ghost"}`} onClick={() => setTheme("light")}>Light</button>
      </div>
    </div>
  );
}
