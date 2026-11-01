// The eclipse's isolines as MapLibre data: the source and the layers that draw it

import type { Feature, MultiPolygon } from "geojson";
import type {
  ExpressionSpecification,
  FilterSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
} from "maplibre-gl";
import polygonClipping from "polygon-clipping";
import type { Isolines } from "../api/eclipses.js";
import { MAP_FONT, theme, toNumber } from "../theme.js";

// The area from one band edge (the limit or a whole minute) to the next, tagged so the layers can
// tell it apart
type DurationBand = Feature<MultiPolygon, { kind: "band"; durationSeconds: number }>;

export const ISOLINES_SOURCE_ID = "isolines";

// One colour per whole minute of totality, from under 1 min to 6 min and over
const CLASS_COLORS = [
  theme["--color-path-fill-0"],
  theme["--color-path-fill-1"],
  theme["--color-path-fill-2"],
  theme["--color-path-fill-3"],
  theme["--color-path-fill-4"],
  theme["--color-path-fill-5"],
  theme["--color-path-fill-6"],
];

const DURATION_COLOR = [
  "step",
  ["get", "durationSeconds"],
  CLASS_COLORS[0],
  ...CLASS_COLORS.slice(1).flatMap((color, i) => [(i + 1) * 60, color]),
] as ExpressionSpecification;

const IS_BAND: FilterSpecification = ["==", ["get", "kind"], "band"];
const IS_LIMIT: FilterSpecification = ["==", ["get", "kind"], "limit"];
const IS_INNER_ISOLINE: FilterSpecification = ["!", ["has", "kind"]];
// Half-minute labels would crowd the map
const IS_MINUTE_ISOLINE: FilterSpecification = [
  "all",
  ["!=", ["get", "kind"], "band"],
  ["==", ["%", ["get", "durationSeconds"], 60], 0],
];

// Drawn in order: fills, then inner isolines, then the limit, then labels on top
export const ISOLINES_LAYERS: LayerSpecification[] = [
  {
    id: "isolines-fill",
    type: "fill",
    source: ISOLINES_SOURCE_ID,
    filter: IS_BAND,
    paint: {
      "fill-color": DURATION_COLOR,
      // The bands don't overlap, so each shows its class colour as it is
      "fill-opacity": toNumber(theme["--path-fill-opacity"]),
    },
  },
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
    filter: IS_MINUTE_ISOLINE,
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
  return Math.min(...isolines.features.map((feature) => feature.properties?.durationSeconds));
}

// The isolines are nested, so each band is its isoline minus the next one's; the longest
// isoline has nothing inside to cut out. Bands start at the limit and at every whole minute, so
// the path is filled out to its limit.
export function durationBands(isolines: Isolines): DurationBand[] {
  const limit = limitSeconds(isolines);
  const edges = isolines.features
    .filter((feature): feature is Feature<MultiPolygon> => {
      const durationSeconds = feature.properties?.durationSeconds;
      return (
        feature.geometry.type === "MultiPolygon" &&
        (durationSeconds % 60 === 0 || durationSeconds === limit)
      );
    })
    .sort((a, b) => a.properties?.durationSeconds - b.properties?.durationSeconds);

  return edges.map((isoline, i) => {
    const inner = edges[i + 1];
    // polygon-clipping types positions as pairs; the engine only ever writes pairs
    const outer = isoline.geometry.coordinates as polygonClipping.MultiPolygon;
    return {
      type: "Feature",
      properties: { kind: "band", durationSeconds: isoline.properties?.durationSeconds },
      geometry: {
        type: "MultiPolygon",
        coordinates: inner
          ? polygonClipping.difference(
              outer,
              inner.geometry.coordinates as polygonClipping.MultiPolygon,
            )
          : outer,
      },
    };
  });
}

// One eclipse's isolines, as fetched from the API, with their bands to fill underneath and the
// limit tagged so it can be drawn apart
export function isolinesSource(
  isolines: Isolines,
): GeoJSONSourceSpecification & { data: Isolines } {
  const limit = limitSeconds(isolines);
  const tagged = isolines.features.map((feature) =>
    feature.properties?.durationSeconds === limit
      ? { ...feature, properties: { ...feature.properties, kind: "limit" } }
      : feature,
  );
  return {
    type: "geojson",
    data: { ...isolines, features: [...durationBands(isolines), ...tagged] },
  };
}
