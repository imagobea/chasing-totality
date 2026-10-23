import { useEffect, useRef, useState } from "react";
import { AppHeader } from "./AppHeader.js";
import type { Coordinates } from "./coordinates.js";
import { EclipseMap } from "./EclipseMap.js";
import { fetchEclipseDates } from "./eclipses.js";
import { StatusBar } from "./StatusBar.js";

export function App() {
  const [dates, setDates] = useState<string[]>([]);
  // The selected eclipse; the first one with data until the user picks another
  const [date, setDate] = useState<string | null>(null);
  // Where the mouse is on the map, null when it's off the map
  // TODO: every mouse move re-renders the whole app; move cursor state out of App when panels land
  const [cursor, setCursor] = useState<Coordinates | null>(null);
  const attributionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ignore the answer if the app goes away before it arrives
    let active = true;
    fetchEclipseDates()
      .then((result) => {
        if (!active) return;
        setDates(result);
        setDate(result[0] ?? null);
      })
      // On failure the picker stays empty and shows —
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="app">
      <AppHeader dates={dates} date={date} onDateChange={setDate} />
      <EclipseMap date={date} onCursorMove={setCursor} attributionRef={attributionRef} />
      <StatusBar cursor={cursor} attributionRef={attributionRef} />
    </div>
  );
}
