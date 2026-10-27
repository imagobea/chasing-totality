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
  const west = Math.min(...lons);
  const east = Math.max(...lons);

  // Longitudes jump from 180 to -180 there, so the extent would wrap around the Earth
  if (east - west > 180) throw new RangeError("Paths across the 180° meridian aren't supported");
  return {
    west: west - marginDegrees,
    south: Math.max(-90, Math.min(...lats) - marginDegrees),
    east: east + marginDegrees,
    north: Math.min(90, Math.max(...lats) + marginDegrees),
  };
}
