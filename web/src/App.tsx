import { useEffect, useRef, useState } from "react";
import { fetchAdvisories, type Advisories } from "./api/advisories.js";
import { fetchAirports, type Airports } from "./api/airports.js";
import { type Eclipse, fetchEclipses, fetchIsolines, type Isolines } from "./api/eclipses.js";
import { AppHeader } from "./components/AppHeader.js";
import { LayersPanel } from "./components/LayersPanel.js";
import { StatusBar } from "./components/StatusBar.js";
import { EclipseMap } from "./map/EclipseMap.js";
import { createMapStatusStore } from "./map/mapStatus.js";
import { firstUpcomingEclipse, isPast } from "./utils.js";

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
  // Airports and advisories describe today, so they're left out for a past eclipse
  const past = date !== null && isPast(date);

  useEffect(() => {
    // Cancelled if the app goes away before the answer arrives; an answer already in is ignored
    const controller = new AbortController();
    const { signal } = controller;
    fetchEclipses(signal)
      .then((result) => {
        if (signal.aborted) return;
        setEclipses(result);
        // Map dates
        const dates = result.map(({ date }) => date);
        // Find the first upcoming eclipse
        const firstUpcoming = firstUpcomingEclipse(dates);
        // First upcoming eclipse, or the first one returned if all are past, or null if none
        setDate(firstUpcoming ?? result[0]?.date ?? null);
      })
      // On failure the picker stays empty and shows —
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Once, since the advice doesn't depend on the eclipse
  useEffect(() => {
    // Cancelled if the app goes away before they arrive; advisories already in are ignored
    const controller = new AbortController();
    const { signal } = controller;
    fetchAdvisories(signal)
      .then((result) => {
        if (!signal.aborted) setAdvisories(result);
      })
      // The map shows no advisories; a cancel isn't a failure
      .catch((error) => {
        if (!signal.aborted) console.warn("Advisories not shown", error);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (date === null) return;

    // Cancelled if another date is picked or the app goes away before they arrive; isolines
    // already in are ignored
    const controller = new AbortController();
    const { signal } = controller;
    fetchIsolines(date, signal)
      .then((result) => {
        if (!signal.aborted) setIsolines(result);
      })
      // The map shows no isolines; a cancel isn't a failure
      .catch((error) => {
        if (!signal.aborted) console.warn(`Eclipse ${date} not shown`, error);
      });
    return () => {
      controller.abort();
      // The previous eclipse's isolines go as soon as another is picked, since the map already
      // fits the new path
      setIsolines(null);
    };
  }, [date]);

  // Requested with the isolines, not after them, since the list already has the path's bbox
  useEffect(() => {
    if (bbox === null || past) return;

    // Cancelled if another eclipse is picked or the app goes away before they arrive; airports
    // already in are ignored
    const controller = new AbortController();
    const { signal } = controller;
    fetchAirports(bbox, signal)
      // The map shows no airports; a cancel isn't a failure
      .catch((error) => {
        if (!signal.aborted) console.warn("Airports not shown", error);
        return null;
      })
      .then((result) => {
        if (!signal.aborted) setAirports(result);
      });
    return () => {
      controller.abort();
      // The previous eclipse's airports go as soon as another is picked
      setAirports(null);
    };
  }, [bbox, past]);

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
          showAdvisories={!past}
          mapStatus={mapStatus}
          attributionRef={attributionRef}
        />
        <LayersPanel airports={airports} advisories={advisories} showTravelLayers={!past} />
      </main>
      <StatusBar mapStatus={mapStatus} attributionRef={attributionRef} />
    </div>
  );
}
