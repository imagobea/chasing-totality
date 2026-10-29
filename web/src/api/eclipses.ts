// The eclipse endpoints

import type { FeatureCollection } from "geojson";
import type { Bbox } from "./airports.js";

// An eclipse's isolines with the bbox that holds them, longitudes carrying on past 180°
export type Isolines = FeatureCollection & { bbox: Bbox };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} answered ${response.status}`);
  return (await response.json()) as T;
}

// Dates of the eclipses that have data, as YYYY-MM-DD, earliest first
export function fetchEclipseDates(): Promise<string[]> {
  return getJson("/api/eclipses");
}

// One eclipse's isolines as GeoJSON
export function fetchIsolines(date: string): Promise<Isolines> {
  return getJson(`/api/eclipses/${date}/isolines`);
}
