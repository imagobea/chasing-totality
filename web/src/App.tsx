import { useEffect, useRef, useState } from "react";
import { fetchAdvisories, type Advisories } from "./api/advisories.js";
import { fetchAirports, type Airports } from "./api/airports.js";
import { fetchEclipseDates, fetchIsolines, type Isolines } from "./api/eclipses.js";
import { AppHeader } from "./components/AppHeader.js";
import { LayersPanel } from "./components/LayersPanel.js";
import { StatusBar } from "./components/StatusBar.js";
import { EclipseMap } from "./map/EclipseMap.js";
import { createMapStatusStore } from "./map/mapStatus.js";
import { firstUpcomingEclipse } from "./utils.js";

export function App() {
  const [dates, setDates] = useState<string[]>([]);
  // The selected eclipse; the first upcoming one with data until the user picks another
  const [date, setDate] = useState<string | null>(null);
  // The selected eclipse's isolines, null until the first ones arrive
  const [isolines, setIsolines] = useState<Isolines | null>(null);
  // The airports around the selected eclipse's path, null until they arrive or when they can't
  // be fetched
  const [airports, setAirports] = useState<Airports | null>(null);
  // Every place's travel advisory, null until they arrive or when they can't be fetched
  const [advisories, setAdvisories] = useState<Advisories | null>(null);
  // The cursor and zoom, one store for the app's lifetime: the map writes it and the status bar
  // reads it, so mouse moves and zoom frames don't re-render the whole app
  const [mapStatus] = useState(createMapStatusStore);
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
        if (!active) return;
        setIsolines(result);
        // The previous eclipse's airports go until the new path's arrive
        setAirports(null);
      })
      // The map keeps whatever it was showing
      .catch((error) => console.warn(`Eclipse ${date} not shown`, error));
    return () => {
      active = false;
    };
  }, [date]);

  useEffect(() => {
    if (isolines === null) return;

    // Ignore the airports if other isolines arrive or the app goes away before they do
    let active = true;
    fetchAirports(isolines.bbox)
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
    };
  }, [isolines]);

  return (
    <div className="app">
      <AppHeader dates={dates} date={date} onDateChange={setDate} />
      <main className="map-stage">
        <EclipseMap
          isolines={isolines}
          airports={airports}
          advisories={advisories}
          onCursorMove={(cursor) => mapStatus.set({ cursor })}
          onZoomChange={(zoom) => mapStatus.set({ zoom })}
          attributionRef={attributionRef}
        />
        <LayersPanel airports={airports} advisories={advisories} />
      </main>
      <StatusBar mapStatus={mapStatus} attributionRef={attributionRef} />
    </div>
  );
}
