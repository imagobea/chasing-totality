import { useEffect, useState } from "react";
import { AppHeader } from "./AppHeader.js";
import { EclipseMap } from "./EclipseMap.js";
import { fetchEclipseDates } from "./eclipses.js";

export function App() {
  const [dates, setDates] = useState<string[]>([]);
  // The selected eclipse; the first one with data until the user picks another
  const [date, setDate] = useState<string | null>(null);

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
      <EclipseMap />
    </div>
  );
}
