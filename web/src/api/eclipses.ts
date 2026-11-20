// The eclipse endpoints

import type { Feature, FeatureCollection, MultiPolygon } from "geojson";
import type { Bbox } from "./airports.js";
import { getJson } from "./getJson.js";

// GeoJSON's positions narrowed to the longitude, latitude pairs the engine writes
type IsolineGeometry = MultiPolygon & { coordinates: [longitude: number, latitude: number][][][] };

// The area where totality lasts at least `durationSeconds`
export type Isoline = Feature<IsolineGeometry, { durationSeconds: number; name: string }>;

// An eclipse that has data, as YYYY-MM-DD, with the bbox around its path
export type Eclipse = { date: string; bbox: Bbox };

// An eclipse's isolines with the bbox that holds them, longitudes carrying on past 180°
export type Isolines = FeatureCollection<IsolineGeometry, Isoline["properties"]> & { bbox: Bbox };

// The eclipses that have data, earliest first
export function fetchEclipses(): Promise<Eclipse[]> {
  return getJson("/api/eclipses");
}

// One eclipse's isolines as GeoJSON
export function fetchIsolines(date: string): Promise<Isolines> {
  return getJson(`/api/eclipses/${date}/isolines`);
}
