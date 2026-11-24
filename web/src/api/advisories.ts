// The advisories endpoint

import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { getJson } from "./getJson.js";

// Whether the UK advises against travel to the whole place, to parts of it, or neither
export type AdvisoryState = "whole" | "parts" | "none";

// One place, down to what the map reads; the snapshot also holds the UK page's and the shape's own
// fields
type Advisory = {
  state: AdvisoryState;
};

// Where the advice or the shapes come from, labelled with the group of place fields it supplies. A
// source whose licence asks for a credit has its text and the licence's link.
export type AdvisorySource = {
  fields: string;
  name: string;
  url: string;
  licence: string;
  licenceUrl?: string;
  attribution?: string;
};

// Every place as GeoJSON, with its sources and the day they were retrieved, as YYYY-MM-DD
export type Advisories = FeatureCollection<Polygon | MultiPolygon, Advisory> & {
  sources: AdvisorySource[];
  retrieved: string;
};

// Every place worldwide, since the advice doesn't depend on the eclipse
export function fetchAdvisories(signal: AbortSignal): Promise<Advisories> {
  return getJson("/api/advisories", signal);
}
