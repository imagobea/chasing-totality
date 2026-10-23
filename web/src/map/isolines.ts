// The eclipse's isolines as MapLibre data: the source and the layers that draw it

import type {
  ExpressionSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
} from "maplibre-gl";
import { isolinesUrl } from "../api/eclipses.js";
import { MAP_FONT, theme, toNumber } from "../theme.js";

export const ISOLINES_SOURCE_ID = "isolines";

// Short to long totality, 0 s to 6 min
const DURATION_COLOR: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["get", "durationSeconds"],
  0,
  theme["--color-path-fill-short"],
  360,
  theme["--color-path-fill-long"],
];

// Drawn in order: fills, then outlines, then labels on top
export const ISOLINES_LAYERS: LayerSpecification[] = [
  {
    id: "isolines-fill",
    type: "fill",
    source: ISOLINES_SOURCE_ID,
    paint: {
      "fill-color": DURATION_COLOR,
      // The bands are nested, so the translucent fills also stack up towards the centre
      "fill-opacity": toNumber(theme["--path-fill-opacity"]),
    },
  },
  {
    id: "isolines-line",
    type: "line",
    source: ISOLINES_SOURCE_ID,
    paint: {
      "line-color": theme["--color-path-edge"],
      "line-width": toNumber(theme["--path-edge-width"]),
    },
  },
  {
    id: "isolines-label",
    type: "symbol",
    source: ISOLINES_SOURCE_ID,
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

// One eclipse's isolines, served by the API
export function isolinesSource(date: string): GeoJSONSourceSpecification & { data: string } {
  return { type: "geojson", data: isolinesUrl(date) };
}
