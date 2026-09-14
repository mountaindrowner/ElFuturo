import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { currentUnit, dayOfUnit, daysToSermon, semesterWeek, todayKey } from "../schedule";
import { lessons } from "../data";
import type { Tab } from "../App";

function isIOSNotInstalled(): boolean {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
  return ios && !standalone;
}

export default function Today({ go }: { go: (t: Tab) => void }) {
  const session = useLiveQuery(() => db.sessions.get(todayKey()), []);
  const debriefToday = useLiveQuery(
    async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      return db.debriefs.where("ts").aboveOrEqual(start.getTime()).count();
    }, []);
  const [iosHint, setIosHint] = useState(false);
  useEffect(() => { setIosHint(isIOSNotInstalled()); }, []);

  const week = semesterWeek();
  const unit = currentUnit();
  const day = dayOfUnit();
  const isAssessmentWeek = unit.assessment != null;
  const hasLesson = lessons.some((l) => l.unit === unit.unit);
  const teachDay = !isAssessmentWeek && hasLesson && day <= 2;

  const teachDone = !!session?.teachSeen || !teachDay;
  const drillDone = !!session?.completed;
  const fieldDone = !!session?.fieldDone;
  const debriefDone = (debriefToday ?? 0) > 0;

  const markTeachSeen = async () => {
    const s = (await db.sessions.get(todayKey())) ?? {
      date: todayKey(), minutes: 0, reviewsDone: 0, newIntroduced: 0,
      completed: false, fieldDone: false, teachSeen: false
    };
    s.teachSeen = true;
    await db.sessions.put(s);
    go("teach");
  };

  return (
    <div>
      <h1>Hoy</h1>
      <p className="sub">
        Week {week} of 12 · {unit.name}
        {" · "}{daysToSermon()} days to the sermon
      </p>

      {isAssessmentWeek && (
        <div className="card">
          <div className="step">
            <div className="grow">
              <div className="title">Assessment {unit.assessment} week</div>
              <div className="desc">Re-run the diagnostic. Same items, same scoring — the delta is the point.</div>
            </div>
            <button className="btn small" onClick={() => go("assessment")}>Start</button>
          </div>
        </div>
      )}

      <div className="card">
        {teachDay && (
          <div className={`step ${teachDone ? "done" : ""}`}>
            <div className="dot">{teachDone ? "✓" : "1"}</div>
            <div className="grow">
              <div className="title">Teach — 5 min</div>
              <div className="desc">First days of a unit only. The rule as a mechanism.</div>
            </div>
            <button className="btn small ghost" onClick={markTeachSeen}>Open</button>
          </div>
        )}
        <div className={`step ${drillDone ? "done" : ""}`}>
          <div className="dot">{drillDone ? "✓" : teachDay ? "2" : "1"}</div>
          <div className="grow">
            <div className="title">Drill — 15–20 min</div>
            <div className="desc">Reviews first, then new cards from {unit.unit > 0 ? `Unit ${unit.unit}` : "recent units"}.</div>
          </div>
          <button className="btn small" onClick={() => go("drill")}>Start</button>
        </div>
        <div className={`step ${fieldDone ? "done" : ""}`}>
          <div className="dot">{fieldDone ? "✓" : teachDay ? "3" : "2"}</div>
          <div className="grow">
            <div className="title">Field — 2 min</div>
            <div className="desc">Say it to a real person today.</div>
          </div>
          <button className="btn small ghost" onClick={() => go("field")}>Open</button>
        </div>
        <div className={`step ${debriefDone ? "done" : ""}`}>
          <div className="dot">{debriefDone ? "✓" : teachDay ? "4" : "3"}</div>
          <div className="grow">
            <div className="title">Debrief — evening</div>
            <div className="desc">Log what a native speaker changed. It becomes tomorrow’s first card.</div>
          </div>
          <button className="btn small ghost" onClick={() => go("debrief")}>Open</button>
        </div>
      </div>

      <p className="sub">
        {session?.minutes ?? 0} min today · {session?.reviewsDone ?? 0} cards reviewed
      </p>

      {iosHint && (
        <div className="ios-hint">
          <strong>Install on your iPhone:</strong> tap the Share button in Safari, then
          “Add to Home Screen.” Púlpito works offline once installed.
        </div>
      )}
    </div>
  );
}
