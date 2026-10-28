// The eclipse endpoints

import type { FeatureCollection } from "geojson";
import type { Bbox } from "./airports.js";

// An eclipse's isolines with the bbox that holds them, longitudes carrying on past 180°
export type Isolines = FeatureCollection & { bbox: Bbox };

// Dates of the eclipses that have data, as YYYY-MM-DD, earliest first
export async function fetchEclipseDates(): Promise<string[]> {
  const response = await fetch("/api/eclipses");
  if (!response.ok) throw new Error(`GET /api/eclipses answered ${response.status}`);
  return (await response.json()) as string[];
}

// One eclipse's isolines as GeoJSON
export async function fetchIsolines(date: string): Promise<Isolines> {
  const url = `/api/eclipses/${date}/isolines`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} answered ${response.status}`);
  return (await response.json()) as Isolines;
}
