// Where to compute the grid: around NASA's path, so the isolines are never cut short.
// Explained in ../README.md

import type { PathRow } from "../eclipse/nasaPath.js";
import type { BoundingBox } from "./grid.js";

// The extent of NASA's limits and central line, plus a margin on every side
export function pathArea(rows: PathRow[], marginDegrees: number): BoundingBox {
  const points = rows.flatMap((row) => [row.north, row.south, row.central].filter((p) => !!p));

  if (!points.length) throw new RangeError("NASA's path table has no rows");
  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);

  // Across the 180° meridian longitudes jump from 180 to -180, so the western ones carry on
  // past 180 instead (179°W becomes 181°E)
  const crosses = Math.max(...lons) - Math.min(...lons) > 180;
  const unwrapped = crosses ? lons.map((lon) => (lon < 0 ? lon + 360 : lon)) : lons;
  const west = Math.min(...unwrapped);
  const east = Math.max(...unwrapped);
  return {
    west: west - marginDegrees,
    south: Math.max(-90, Math.min(...lats) - marginDegrees),
    east: east + marginDegrees,
    north: Math.min(90, Math.max(...lats) + marginDegrees),
  };
}
