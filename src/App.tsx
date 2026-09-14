import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { seedCards, ensureProfile, addMinutes } from "./engine";
import Today from "./screens/Today";
import Drill from "./screens/Drill";
import Field from "./screens/Field";
import Debrief from "./screens/Debrief";
import Track from "./screens/Track";
import Teach from "./screens/Teach";
import Assessment from "./screens/Assessment";

export type Tab = "today" | "drill" | "field" | "debrief" | "track" | "teach" | "assessment";

const TABS: { key: Tab; label: string; glyph: string }[] = [
  { key: "today", label: "Today", glyph: "☀" },
  { key: "drill", label: "Drill", glyph: "✎" },
  { key: "field", label: "Field", glyph: "⛪" },
  { key: "debrief", label: "Debrief", glyph: "☾" },
  { key: "track", label: "Track", glyph: "▤" },
  { key: "teach", label: "Teach", glyph: "¶" }
];

export default function App() {
  const [tab, setTab] = useState<Tab>("today");
  const [ready, setReady] = useState(false);
  const profile = useLiveQuery(() => db.profile.get("profile"), []);

  useEffect(() => {
    (async () => {
      await ensureProfile();
      await seedCards();
      setReady(true);
    })();
  }, []);

  // minutes tracking: +1 per visible minute
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") addMinutes(1);
    }, 60000);
    return () => clearInterval(t);
  }, []);

  const theme = profile?.theme ?? "dark";
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.style.background = theme === "dark" ? "#0F1E3D" : "#F7F4EC";
  }, [theme]);

  if (!ready) return <div className="app" data-theme={theme} />;

  return (
    <div className="app">
      <div className="screen">
        {tab === "today" && <Today go={setTab} />}
        {tab === "drill" && <Drill onExit={() => setTab("today")} />}
        {tab === "field" && <Field />}
        {tab === "debrief" && <Debrief />}
        {tab === "track" && <Track />}
        {tab === "teach" && <Teach />}
        {tab === "assessment" && <Assessment onExit={() => setTab("today")} />}
      </div>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            <span className="glyph">{t.glyph}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
