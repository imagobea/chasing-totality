import { useEffect, useRef, useState } from "react";
import { fetchAdvisories, type Advisories } from "./api/advisories.js";
import { fetchAirports, type Airports } from "./api/airports.js";
import { type Eclipse, fetchEclipses, fetchIsolines, type Isolines } from "./api/eclipses.js";
import { AppHeader } from "./components/AppHeader.js";
import { LayersPanel } from "./components/LayersPanel.js";
import { StatusBar } from "./components/StatusBar.js";
import { EclipseMap } from "./map/EclipseMap.js";
import { createMapStatusStore } from "./map/mapStatus.js";
import { firstUpcomingEclipse } from "./utils.js";

export function App() {
  // The eclipses that have data, earliest first
  const [eclipses, setEclipses] = useState<Eclipse[]>([]);
  // The selected eclipse; the first upcoming one with data until the user picks another
  const [date, setDate] = useState<string | null>(null);
  // The selected eclipse's isolines, null until they arrive or when they can't be fetched
  const [isolines, setIsolines] = useState<Isolines | null>(null);
  // The airports around the selected eclipse's path, null until they arrive or when they can't
  // be fetched
  const [airports, setAirports] = useState<Airports | null>(null);
  // Every place's travel advisory, null until they arrive or when they can't be fetched
  const [advisories, setAdvisories] = useState<Advisories | null>(null);
  // The cursor and zoom the map reports, one store for the app's lifetime
  const [mapStatus] = useState(createMapStatusStore);
  const attributionRef = useRef<HTMLDivElement>(null);
  // The selected eclipse's bbox, from the list; null until both the list and a date are in
  const bbox = eclipses.find((eclipse) => eclipse.date === date)?.bbox ?? null;

  useEffect(() => {
    // Ignore the answer if the app goes away before it arrives
    let active = true;
    fetchEclipses()
      .then((result) => {
        if (!active) return;
        setEclipses(result);
        const dates = result.map(({ date }) => date);
        // First upcoming eclipse, or the first one returned if all are past, or null if none
        setDate(firstUpcomingEclipse(dates) ?? dates[0] ?? null);
      })
      // On failure the picker stays empty and shows —
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Once, since the advice doesn't depend on the eclipse
  useEffect(() => {
    // Ignore the advisories if the app goes away before they arrive
    let active = true;
    fetchAdvisories()
      .then((result) => {
        if (active) setAdvisories(result);
      })
      // The map shows no advisories
      .catch((error) => console.warn("Advisories not shown", error));
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
      // The map shows no isolines
      .catch((error) => console.warn(`Eclipse ${date} not shown`, error));
    return () => {
      active = false;
      // The previous eclipse's isolines go as soon as another is picked, since the map already
      // fits the new path
      setIsolines(null);
    };
  }, [date]);

  // Requested with the isolines, not after them, since the list already has the path's bbox
  useEffect(() => {
    if (bbox === null) return;

    // Ignore the airports if another eclipse is picked or the app goes away before they arrive
    let active = true;
    fetchAirports(bbox)
      // The map shows no airports
      .catch((error) => {
        console.warn("Airports not shown", error);
        return null;
      })
      .then((result) => {
        if (active) setAirports(result);
      });
    return () => {
      active = false;
      // The previous eclipse's airports go as soon as another is picked
      setAirports(null);
    };
  }, [bbox]);

  const dates = eclipses.map(({ date }) => date);

  return (
    <div className="app">
      <AppHeader dates={dates} date={date} onDateChange={setDate} />
      <main className="map-stage">
        <EclipseMap
          bbox={bbox}
          isolines={isolines}
          airports={airports}
          advisories={advisories}
          mapStatus={mapStatus}
          attributionRef={attributionRef}
        />
        <LayersPanel airports={airports} advisories={advisories} />
      </main>
      <StatusBar mapStatus={mapStatus} attributionRef={attributionRef} />
    </div>
  );
}
