// Airports as MapLibre data: the source, the icon and the layers that draw them

import type {
  GeoJSONSourceSpecification,
  LayerSpecification,
  StyleImageMetadata,
} from "maplibre-gl";
import { airportsUrl, type Bbox } from "../api/airports.js";
// Maki's airport icon (CC0), https://github.com/mapbox/maki
import airportIconUrl from "../assets/airport.svg";
import { MAP_FONT, theme, toNumber } from "../theme.js";

export const AIRPORTS_SOURCE_ID = "airports";
// Not "airport": the base map's sprite already has an image by that name, and MapLibre keeps
// the sprite's and ignores ours
export const AIRPORT_ICON_ID = "maki-airport";

// The 2027 isolines' extent plus ~3° each way: S Spain and the Balearics to Saudi Arabia and Yemen
// TODO: suits 2027-08-02 only; another eclipse needs its own box, e.g. from its isolines
const AIRPORTS_BBOX: Bbox = [-13, 12, 48, 40];

// Maki icons are drawn on a 15 px grid
const ICON_SIZE = 15;
// Drawn at twice its size, so it stays sharp on high-density screens
const ICON_PIXEL_RATIO = 2;

// SDF: MapLibre reads the icon as a one-colour shape and fills it with icon-color
export const AIRPORT_ICON_OPTIONS: Partial<StyleImageMetadata> = {
  sdf: true,
  pixelRatio: ICON_PIXEL_RATIO,
};

// A plane per airport with its IATA code below, as in the mockups, on top of the base map's labels
export const AIRPORTS_LAYERS: LayerSpecification[] = [
  {
    id: "airports",
    type: "symbol",
    source: AIRPORTS_SOURCE_ID,
    layout: {
      "icon-image": AIRPORT_ICON_ID,
      "text-field": ["get", "iata"],
      "text-font": [MAP_FONT],
      "text-size": toNumber(theme["--text-xs"]),
      "text-anchor": "top",
      "text-offset": [0, 0.9],
      // A label that doesn't fit is dropped, but its plane stays
      "text-optional": true,
      // Where symbols collide, large airports keep theirs
      "symbol-sort-key": ["match", ["get", "size"], "large", 0, 1],
    },
    paint: {
      "icon-color": theme["--color-travel"],
      "text-color": theme["--color-travel"],
      "text-halo-color": theme["--color-label-halo"],
      "text-halo-width": toNumber(theme["--label-halo-width"]),
    },
  },
];

// The airports around the path, served by the API
export function airportsSource(): GeoJSONSourceSpecification & { data: string } {
  return { type: "geojson", data: airportsUrl(AIRPORTS_BBOX) };
}

// The plane as an image MapLibre can take, once the browser has drawn the SVG
export async function loadAirportIcon(): Promise<HTMLImageElement> {
  const image = new Image(ICON_SIZE * ICON_PIXEL_RATIO, ICON_SIZE * ICON_PIXEL_RATIO);
  image.src = airportIconUrl;
  await image.decode();
  return image;
}
