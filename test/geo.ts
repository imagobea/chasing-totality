import type { LatLon } from "../src/engine/eclipse/nasaPath.js";

// Test helpers for placing points around the path. Flat-Earth approximations: fine over the
// ~100 km between the central line and a limit.

const KM_PER_DEGREE = 111.2;

// A point on the line from the central line through a limit: 0 is the central point, 1 the limit.
export const along = (central: LatLon, limit: LatLon, fraction: number): LatLon => ({
  lat: central.lat + fraction * (limit.lat - central.lat),
  lon: central.lon + fraction * (limit.lon - central.lon),
});

export const distanceKm = (p: LatLon, q: LatLon) =>
  Math.hypot(p.lat - q.lat, (p.lon - q.lon) * Math.cos((p.lat * Math.PI) / 180)) * KM_PER_DEGREE;

// The point `km` beyond the limit (negative: inside the path), on the line from the central line.
export const pastLimit = (central: LatLon, limit: LatLon, km: number): LatLon =>
  along(central, limit, 1 + km / distanceKm(central, limit));

// The point `km` beyond a limit (negative: inside the path), square to the path's edge there.
// The edge runs from `before` to `after`, NASA's limit points either side. Where both are the
// limit itself, the point falls back to the line from the central line.
export const acrossLimit = (
  central: LatLon,
  limit: LatLon,
  km: number,
  before: LatLon,
  after: LatLon,
): LatLon => {
  const kmPerLon = KM_PER_DEGREE * Math.cos((limit.lat * Math.PI) / 180);
  const edge = {
    x: (after.lon - before.lon) * kmPerLon,
    y: (after.lat - before.lat) * KM_PER_DEGREE,
  };
  const length = Math.hypot(edge.x, edge.y);
  if (!length) return pastLimit(central, limit, km);
  // Square to the edge, turned to point away from the central line
  const outward = {
    x: (limit.lon - central.lon) * kmPerLon,
    y: (limit.lat - central.lat) * KM_PER_DEGREE,
  };
  const normal = { x: edge.y / length, y: -edge.x / length };
  const sign = normal.x * outward.x + normal.y * outward.y < 0 ? -1 : 1;
  return {
    lat: limit.lat + (sign * normal.y * km) / KM_PER_DEGREE,
    lon: limit.lon + (sign * normal.x * km) / kmPerLon,
  };
};
