import { useEffect, useRef, useState } from "react";
import { fetchEclipseDates, fetchIsolines, type Isolines } from "./api/eclipses.js";
import { AppHeader } from "./components/AppHeader.js";
import { StatusBar } from "./components/StatusBar.js";
import { EclipseMap } from "./map/EclipseMap.js";
import { firstUpcomingEclipse, type Coordinates } from "./utils.js";

export function App() {
  const [dates, setDates] = useState<string[]>([]);
  // The selected eclipse; the first upcoming one with data until the user picks another
  const [date, setDate] = useState<string | null>(null);
  // The selected eclipse's isolines, null until the first ones arrive
  const [isolines, setIsolines] = useState<Isolines | null>(null);
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
        // First upcoming eclipse, or the first one returned if all are past, or null if none
        setDate(firstUpcomingEclipse(result) ?? result[0] ?? null);
      })
      // On failure the picker stays empty and shows —
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (date === null) return;

    // Ignore the isolines if another date is picked or the app goes away before they arrive
    let active = true;
    fetchIsolines(date)
      .then((result) => {
        if (active) setIsolines(result);
      })
      // The map keeps whatever it was showing
      .catch((error) => console.warn(`Eclipse ${date} not shown`, error));
    return () => {
      active = false;
    };
  }, [date]);

  return (
    <div className="app">
      <AppHeader dates={dates} date={date} onDateChange={setDate} />
      <EclipseMap isolines={isolines} onCursorMove={setCursor} attributionRef={attributionRef} />
      <StatusBar cursor={cursor} attributionRef={attributionRef} />
    </div>
  );
}
