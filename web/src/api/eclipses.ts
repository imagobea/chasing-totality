// The eclipse endpoints

import type { Feature, FeatureCollection, MultiPolygon } from "geojson";
import { getJson } from "./getJson.js";

// west, south, east and north edges in degrees, as the eclipse list gives them and the airports
// endpoint expects them
export type Bbox = [west: number, south: number, east: number, north: number];

// An eclipse that has data, as YYYY-MM-DD, with the bbox around its path
export type Eclipse = { date: string; bbox: Bbox };

// GeoJSON's positions narrowed to the longitude, latitude pairs the engine writes
type IsolineGeometry = MultiPolygon & { coordinates: [longitude: number, latitude: number][][][] };

// The area where totality lasts at least `durationSeconds`
export type Isoline = Feature<IsolineGeometry, { durationSeconds: number; name: string }>;

// An eclipse's isolines, longitudes carrying on past 180°. Their file's bbox goes unread, since the
// eclipse list gives it.
export type Isolines = FeatureCollection<IsolineGeometry, Isoline["properties"]>;

// The eclipses that have data, earliest first
export function fetchEclipses(signal: AbortSignal): Promise<Eclipse[]> {
  return getJson("/api/eclipses", signal);
}

// One eclipse's isolines as GeoJSON
export function fetchIsolines(date: string, signal: AbortSignal): Promise<Isolines> {
  return getJson(`/api/eclipses/${date}/isolines`, signal);
}
