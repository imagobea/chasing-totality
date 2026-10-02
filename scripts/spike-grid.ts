// Spike: computes the totality-duration grid over southern Spain and North Africa, traces
// isolines every 30 s and writes them as GeoJSON, next to NASA's path for comparison.
// Open both files in geojson.io (or any GIS tool) to compare.
//
// Run: pnpm spike:grid

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { eclipse2027Aug02 } from "../src/engine/eclipse/elements/2027-08-02.js";
import { durationContours } from "../src/engine/isolines/contours.js";
import { durationGrid } from "../src/engine/isolines/grid.js";
import { parseNasaPath, type LatLon } from "../test/nasaPath.js";

const AREA = { west: -10, south: 15, east: 45, north: 40 }; // Spain to the Red Sea
const STEP_DEGREES = 0.05; // ~5 km
const THRESHOLDS_SECONDS = Array.from({ length: 13 }, (_, i) => i * 30); // 0 (path) … 6m00s; the longest is ~6m23s
const OUT = new URL("../out/", import.meta.url);

const started = performance.now();
const grid = durationGrid(eclipse2027Aug02, AREA, STEP_DEGREES);
const computed = performance.now();
const isolines = durationContours(grid, THRESHOLDS_SECONDS);
const traced = performance.now();

mkdirSync(OUT, { recursive: true });
writeFileSync(new URL("2027-durations.geojson", OUT), JSON.stringify(isolines));
writeFileSync(new URL("2027-nasa-path.geojson", OUT), JSON.stringify(nasaPath()));

const points = grid.width * grid.height;
console.log(
  `${points} points in ${((computed - started) / 1000).toFixed(1)} s ` +
    `(${(((computed - started) * 1000) / points).toFixed(1)} µs each); ` +
    `isolines in ${((traced - computed) / 1000).toFixed(1)} s. Written to ${OUT.pathname}`,
);

// NASA's northern limit, southern limit and central line as GeoJSON lines.
function nasaPath() {
  const rows = parseNasaPath(
    readFileSync(new URL("../test/fixtures/SE2027Aug02Tpath.txt", import.meta.url), "utf8"),
  );
  const line = (name: string, points: (LatLon | null)[]) => ({
    type: "Feature",
    properties: { name },
    geometry: {
      type: "LineString",
      coordinates: points.flatMap((point) => (point ? [[point.lon, point.lat]] : [])),
    },
  });
  return {
    type: "FeatureCollection",
    features: [
      line("NASA northern limit", rows.map((row) => row.north)),
      line("NASA southern limit", rows.map((row) => row.south)),
      line("NASA central line", rows.map((row) => row.central)),
    ],
  };
}
