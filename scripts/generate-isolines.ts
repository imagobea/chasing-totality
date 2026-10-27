// Generates the isolines of one total eclipse: how long totality lasts across NASA's path,
// every 30 s, as GeoJSON. NASA's limits are written beside them, to compare by eye in
// geojson.io or any GIS tool. The steps are explained in src/engine/README.md
//
// Run: pnpm data:isolines <date>, e.g. pnpm data:isolines 2027-08-02

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { eclipses } from "../src/engine/eclipse/elements/index.js";
import { parseNasaPath, type LatLon, type PathRow } from "../src/engine/eclipse/nasaPath.js";
import { pathArea } from "../src/engine/isolines/area.js";
import { durationContours, durationThresholds } from "../src/engine/isolines/contours.js";
import { durationGrid } from "../src/engine/isolines/grid.js";

const STEP_DEGREES = 0.05; // grid spacing, ~5 km
const MARGIN_DEGREES = 1; // around NASA's path, so its edges and ends aren't cut
const THRESHOLD_STEP_SECONDS = 30;
const OUT = new URL("../out/", import.meta.url);

// NASA's northern limit, southern limit and central line as GeoJSON lines
function nasaLines(rows: PathRow[]) {
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
      line(
        "NASA northern limit",
        rows.map((row) => row.north),
      ),
      line(
        "NASA southern limit",
        rows.map((row) => row.south),
      ),
      line(
        "NASA central line",
        rows.map((row) => row.central),
      ),
    ],
  };
}

function main() {
  // The eclipse: its Besselian elements and NASA's path table
  const date = process.argv[2] ?? "";
  if (!Object.hasOwn(eclipses, date)) {
    console.error(`Usage: pnpm data:isolines <date>. Known: ${Object.keys(eclipses).join(", ")}`);
    process.exit(1);
  }
  const elements = eclipses[date];
  const { rows } = parseNasaPath(
    readFileSync(new URL(`../data/nasa-paths/${date}.txt`, import.meta.url), "utf8"),
  );

  // Step 1: totality at every grid point around the path
  const started = performance.now();
  const grid = durationGrid(elements, pathArea(rows, MARGIN_DEGREES), STEP_DEGREES);
  const computed = performance.now();

  // Step 2: isolines through the grid, every 30 s up to the longest totality
  const isolines = durationContours(grid, durationThresholds(grid, THRESHOLD_STEP_SECONDS));
  const traced = performance.now();

  mkdirSync(OUT, { recursive: true });
  writeFileSync(new URL(`${date}-isolines.geojson`, OUT), JSON.stringify(isolines));
  writeFileSync(new URL(`${date}-nasa-path.geojson`, OUT), JSON.stringify(nasaLines(rows)));

  const points = grid.width * grid.height;
  console.log(
    `${points} points in ${((computed - started) / 1000).toFixed(1)} s ` +
      `(${(((computed - started) * 1000) / points).toFixed(1)} µs each); ` +
      `isolines in ${((traced - computed) / 1000).toFixed(1)} s. Written to ${OUT.pathname}`,
  );
}

main();
