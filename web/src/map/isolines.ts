// The eclipse's isolines as MapLibre data: their sources and the layers that draw them

import type { Feature, FeatureCollection, MultiPolygon } from "geojson";
import type {
  ExpressionSpecification,
  FilterSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
} from "maplibre-gl";
import polygonClipping from "polygon-clipping";
import type { Isolines } from "../api/eclipses.js";
import { CLASS_SECONDS, DURATION_CLASSES } from "../durationClasses.js";
import { MAP_FONT, theme, toNumber } from "../theme.js";

// The area from one class edge (the limit or a whole minute) to the next
type DurationBand = Feature<MultiPolygon, { durationSeconds: number }>;

export const DURATION_BANDS_SOURCE_ID = "duration-bands";
export const ISOLINES_SOURCE_ID = "isolines";

const [FIRST_CLASS, ...NEXT_CLASSES] = DURATION_CLASSES;

// Each band takes the colour of the class its duration falls in
const DURATION_COLOR = [
  "step",
  ["get", "durationSeconds"],
  theme[FIRST_CLASS.colorToken],
  ...NEXT_CLASSES.flatMap(({ startSeconds, colorToken }) => [startSeconds, theme[colorToken]]),
] as ExpressionSpecification;

const IS_LIMIT: FilterSpecification = ["has", "limit"];
const IS_INNER_ISOLINE: FilterSpecification = ["!", ["has", "limit"]];
// Half-minute labels would crowd the map, but the limit always gets one
const IS_LABELLED: FilterSpecification = [
  "any",
  IS_LIMIT,
  ["==", ["%", ["get", "durationSeconds"], CLASS_SECONDS], 0],
];

// Under the isolines: the bands don't overlap, so each shows its class colour as it is
export const DURATION_BANDS_LAYERS: LayerSpecification[] = [
  {
    id: "isolines-fill",
    type: "fill",
    source: DURATION_BANDS_SOURCE_ID,
    paint: {
      "fill-color": DURATION_COLOR,
      "fill-opacity": toNumber(theme["--path-fill-opacity"]),
    },
  },
];

// Drawn in order: inner isolines, then the limit, then labels on top
export const ISOLINES_LAYERS: LayerSpecification[] = [
  {
    id: "isolines-line",
    type: "line",
    source: ISOLINES_SOURCE_ID,
    filter: IS_INNER_ISOLINE,
    paint: {
      "line-color": theme["--color-isoline"],
      "line-opacity": toNumber(theme["--isoline-opacity"]),
      "line-width": toNumber(theme["--isoline-width"]),
    },
  },
  {
    id: "isolines-limit",
    type: "line",
    source: ISOLINES_SOURCE_ID,
    filter: IS_LIMIT,
    paint: {
      "line-color": theme["--color-path-limit"],
      "line-width": toNumber(theme["--path-limit-width"]),
    },
  },
  {
    id: "isolines-label",
    type: "symbol",
    source: ISOLINES_SOURCE_ID,
    filter: IS_LABELLED,
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 800,
      "text-field": ["get", "name"],
      "text-font": [MAP_FONT],
      "text-size": toNumber(theme["--text-sm"]),
    },
    paint: {
      "text-color": theme["--color-text"],
      "text-halo-color": theme["--color-label-halo"],
      "text-halo-width": toNumber(theme["--label-halo-width"]),
    },
  },
];

// The limit of totality is the isoline with the shortest duration, which needn't be 0 s
function limitSeconds(isolines: Isolines): number {
  return Math.min(...isolines.features.map((feature) => feature.properties.durationSeconds));
}

// The isolines are nested, so each band is its isoline minus the next one's; the longest
// isoline has nothing inside to cut out. Bands start at the limit and where each class starts, so
// the path is filled out to its limit and the last class is one band.
export function durationBands(isolines: Isolines): DurationBand[] {
  const limit = limitSeconds(isolines);
  const edges = isolines.features
    .filter(
      ({ properties: { durationSeconds } }) =>
        DURATION_CLASSES.some(({ startSeconds }) => startSeconds === durationSeconds) ||
        durationSeconds === limit,
    )
    .sort((a, b) => a.properties.durationSeconds - b.properties.durationSeconds);

  return edges.map((isoline, i) => {
    const inner = edges[i + 1];
    const outer = isoline.geometry.coordinates;
    return {
      type: "Feature",
      properties: { durationSeconds: isoline.properties.durationSeconds },
      geometry: {
        type: "MultiPolygon",
        coordinates: inner ? polygonClipping.difference(outer, inner.geometry.coordinates) : outer,
      },
    };
  });
}

// The bands to fill under one eclipse's isolines
export function durationBandsSource(
  isolines: Isolines,
): GeoJSONSourceSpecification & { data: FeatureCollection<MultiPolygon> } {
  return {
    type: "geojson",
    data: { type: "FeatureCollection", features: durationBands(isolines) },
  };
}

// One eclipse's isolines, as fetched from the API, with the limit tagged so it can be drawn apart
export function isolinesSource(
  isolines: Isolines,
): GeoJSONSourceSpecification & { data: Isolines } {
  const limit = limitSeconds(isolines);
  return {
    type: "geojson",
    data: {
      ...isolines,
      features: isolines.features.map((feature) =>
        feature.properties.durationSeconds === limit
          ? { ...feature, properties: { ...feature.properties, limit: true } }
          : feature,
      ),
    },
  };
}
