// Advisories as MapLibre data: the hatch patterns and the layers that draw them

import type {
  ExpressionSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
} from "maplibre-gl";
import type { Advisories, AdvisoryState } from "../api/advisories.js";
import { theme, toNumber } from "../theme.js";
import { TRAVEL_MINZOOM } from "./airports.js";

// A hatch's stripes in CSS pixels: how thick each one is, and how far apart, centre to centre
type Hatch = { width: number; spacing: number };

// Raw RGBA pixels, row by row, as MapLibre's addImage takes them
type Pattern = { width: number; height: number; data: Uint8ClampedArray };

// Dense where the UK advises against travel to the whole place, sparse where only to parts of it
export const ADVISORY_HATCHES = {
  whole: {
    width: toNumber(theme["--advisory-hatch-whole-width"]),
    spacing: toNumber(theme["--advisory-hatch-whole-spacing"]),
  },
  parts: {
    width: toNumber(theme["--advisory-hatch-parts-width"]),
    spacing: toNumber(theme["--advisory-hatch-parts-spacing"]),
  },
} satisfies Record<Exclude<AdvisoryState, "none">, Hatch>;

export const ADVISORIES_SOURCE_ID = "advisories";
// Prefixed, since MapLibre keeps the base map's sprite image over ours when the names clash
const HATCH_IMAGE_PREFIX = "advisory-hatch-";

// Outline dashes and gaps, in line widths
const OUTLINE_DASHES = [3, 2];

// Places the UK advises against travel to, in whole or in parts; places with no advice aren't drawn
const IS_ADVISED: ExpressionSpecification = ["!=", ["get", "state"], "none"];

// Under the duration bands, as in DESIGN.md's layer stack: each place hatched by its state, then a
// dashed outline, so they never rely on colour alone
export const ADVISORIES_LAYERS: LayerSpecification[] = [
  {
    id: "advisories-fill",
    type: "fill",
    source: ADVISORIES_SOURCE_ID,
    minzoom: TRAVEL_MINZOOM,
    filter: IS_ADVISED,
    paint: {
      "fill-pattern": ["concat", HATCH_IMAGE_PREFIX, ["get", "state"]],
      "fill-opacity": toNumber(theme["--advisory-fill-opacity"]),
    },
  },
  {
    id: "advisories-outline",
    type: "line",
    source: ADVISORIES_SOURCE_ID,
    minzoom: TRAVEL_MINZOOM,
    filter: IS_ADVISED,
    paint: {
      "line-color": theme["--color-advisory"],
      "line-width": toNumber(theme["--advisory-outline-width"]),
      "line-dasharray": OUTLINE_DASHES,
    },
  },
];

// The red, green and blue of a #rrggbb colour
function rgb(hex: string): number[] {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
}

// The id the map knows a state's hatch by
export function hatchImageId(state: keyof typeof ADVISORY_HATCHES): string {
  return `${HATCH_IMAGE_PREFIX}${state}`;
}

// A square tile of 45° stripes in the given colour, in device pixels. Its side is the spacing
// times √2, rounded to whole pixels so it repeats without seams, which shifts the spacing by under
// half a pixel. Each pixel's alpha is how much of it the stripe covers, so edges stay smooth.
export function hatchPattern(
  { width, spacing }: Hatch,
  color: string,
  pixelRatio: number,
): Pattern {
  const side = Math.max(1, Math.round(spacing * Math.SQRT2 * pixelRatio));
  const halfWidth = (width * pixelRatio) / 2;
  const [r, g, b] = rgb(color);
  const data = new Uint8ClampedArray(side * side * 4);

  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      // Stripes run where x + y is a multiple of the side; measured from the pixel's centre
      const along = (x + y + 1) % side;
      const distance = Math.min(along, side - along) / Math.SQRT2;
      const coverage = Math.min(1, Math.max(0, halfWidth - distance + 0.5));
      data.set([r!, g!, b!, coverage * 255], (y * side + x) * 4);
    }
  }
  return { width: side, height: side, data };
}

// Each state's hatch in the advisory colour at the screen's pixel ratio, by the id the fill asks for
export function hatchImages(pixelRatio: number): [id: string, pattern: Pattern][] {
  return (Object.keys(ADVISORY_HATCHES) as (keyof typeof ADVISORY_HATCHES)[]).map((state) => [
    hatchImageId(state),
    hatchPattern(ADVISORY_HATCHES[state], theme["--color-advisory"], pixelRatio),
  ]);
}

// Every place, as fetched from the API
export function advisoriesSource(advisories: Advisories): GeoJSONSourceSpecification & {
  data: Advisories;
} {
  return { type: "geojson", data: advisories };
}
