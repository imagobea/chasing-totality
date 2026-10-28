// Where to compute the grid: around NASA's path, so the isolines are never cut short.
// Explained in ../README.md

import type { LatLon, PathRow } from "../eclipse/nasaPath.js";
import type { BoundingBox } from "./grid.js";

// The same longitude, shifted by whole turns to lie within 180° of `reference`
const nearest = (lon: number, reference: number) => lon + 360 * Math.round((reference - lon) / 360);

// NASA's rows with longitudes that never jump at the 180° meridian, so a path across it carries
// on past 180 instead (179°W becomes 181°E). Each central point follows the previous row's, in
// time order, and each limit follows its own row's central point.
export function unwrapPath(rows: PathRow[]): PathRow[] {
  let previous = rows[0]?.central.lon ?? 0;
  return rows.map((row) => {
    const lon = nearest(row.central.lon, previous);
    previous = lon;
    const follow = (point: LatLon | null) => point && { ...point, lon: nearest(point.lon, lon) };
    return {
      ...row,
      north: follow(row.north),
      south: follow(row.south),
      central: { ...row.central, lon },
    };
  });
}

// The extent of NASA's limits and central line, plus a margin on every side
export function pathArea(rows: PathRow[], marginDegrees: number): BoundingBox {
  const points = unwrapPath(rows).flatMap((row) =>
    [row.north, row.south, row.central].filter((p) => !!p),
  );

  if (!points.length) throw new RangeError("NASA's path table has no rows");
  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);
  const west = Math.min(...lons);
  const east = Math.max(...lons);
  return {
    west: west - marginDegrees,
    south: Math.max(-90, Math.min(...lats) - marginDegrees),
    east: east + marginDegrees,
    north: Math.min(90, Math.max(...lats) + marginDegrees),
  };
}
