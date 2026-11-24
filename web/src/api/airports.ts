// The airports endpoint

import type { FeatureCollection, Point } from "geojson";
import type { Bbox } from "./eclipses.js";
import { getJson } from "./getJson.js";

// One airport, as the snapshot writes it
type Airport = {
  iata: string;
  name: string;
  municipality: string;
  country: string;
  size: "large" | "medium";
};

// Airports as GeoJSON, with where they come from and the day they were retrieved, as YYYY-MM-DD
export type Airports = FeatureCollection<Point, Airport> & {
  source: { name: string; url: string; licence: string };
  retrieved: string;
};

// How far beyond the eclipse's path to look for airports, each way
const MARGIN_DEGREES = 3;

// The airports around the eclipse's path. The bbox is rounded outwards to whole degrees, which
// keeps float noise out of the URL. It stops at the poles, and across 180° it carries on past it
// like the path's.
export function fetchAirports(
  [west, south, east, north]: Bbox,
  signal: AbortSignal,
): Promise<Airports> {
  const bbox: Bbox = [
    Math.floor(west - MARGIN_DEGREES),
    Math.max(-90, Math.floor(south - MARGIN_DEGREES)),
    Math.ceil(east + MARGIN_DEGREES),
    Math.min(90, Math.ceil(north + MARGIN_DEGREES)),
  ];
  return getJson(`/api/airports?bbox=${bbox.join(",")}`, signal);
}
