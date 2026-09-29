import type { LatLon } from "./nasaPath.js";

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
