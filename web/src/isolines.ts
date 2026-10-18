// The eclipse's isolines as MapLibre data: the source and the layers that draw it

import type {
  ExpressionSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
} from "maplibre-gl";

export const ISOLINES_SOURCE_ID = "isolines";

// The 2027-08-02 isolines, served by the API
export const ISOLINES_SOURCE: GeoJSONSourceSpecification = {
  type: "geojson",
  data: "/api/eclipses/2027-08-02/isolines",
};

// Light to dark as totality gets longer, 0 s to 6 min
const DURATION_COLOR: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["get", "durationSeconds"],
  0,
  "#fdd49e",
  360,
  "#b30000",
];

// Drawn in order: fills, then outlines, then labels on top
export const ISOLINES_LAYERS: LayerSpecification[] = [
  {
    id: "isolines-fill",
    type: "fill",
    source: ISOLINES_SOURCE_ID,
    paint: {
      "fill-color": DURATION_COLOR,
      "fill-opacity": 0.2,
    },
  },
  {
    id: "isolines-line",
    type: "line",
    source: ISOLINES_SOURCE_ID,
    paint: {
      "line-color": DURATION_COLOR,
      "line-width": 1,
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
      "text-font": ["Noto Sans Regular"],
      "text-size": 11,
    },
    paint: {
      "text-color": "#333",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1,
    },
  },
];
