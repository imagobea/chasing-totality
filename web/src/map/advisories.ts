// Advisories as MapLibre data: the hatch patterns that draw them

import { theme, toNumber } from "../theme.js";

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
} satisfies Record<string, Hatch>;

// The red, green and blue of a #rrggbb colour
function rgb(hex: string): number[] {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
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
