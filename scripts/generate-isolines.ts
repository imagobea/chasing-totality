// Generates data/isolines/<date>.geojson, the isolines the API serves for one total eclipse: how
// long totality lasts across NASA's path, every 30 s. NASA's limits go to out/, to compare by
// eye in geojson.io or any GIS tool. The steps are explained in src/engine/README.md
//
// Run: pnpm data:isolines <date>, e.g. pnpm data:isolines 2027-08-02

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { eclipses } from "../src/engine/eclipse/elements/index.js";
import { parseNasaPath, type LatLon, type PathRow } from "../src/engine/eclipse/nasaPath.js";
import { pathArea, unwrapLongitudes } from "../src/engine/isolines/area.js";
import { durationContours, durationThresholds } from "../src/engine/isolines/contours.js";
import { durationGrid } from "../src/engine/isolines/grid.js";

const STEP_DEGREES = 0.05; // grid spacing, ~5 km
const MARGIN_DEGREES = 1; // around NASA's path, so its edges and ends aren't cut
const THRESHOLD_STEP_SECONDS = 30;
const DATA_DIR = new URL("../data/isolines/", import.meta.url);
const COMPARE_DIR = new URL("../out/", import.meta.url);
const NASA_LINES = [
  ["NASA northern limit", "north"],
  ["NASA southern limit", "south"],
  ["NASA central line", "central"],
] as const;

// Formats NASA's path table as GeoJSON lines, to draw its northern limit, southern limit and
// central line over the isolines. Points where a limit is off the Earth are skipped, and
// longitudes carry on past 180° like the isolines' do.
function nasaLines(rows: PathRow[]) {
  const line = (name: string, points: (LatLon | null)[]) => {
    const onEarth = points.filter((point) => !!point);
    const lons = unwrapLongitudes(onEarth.map((point) => point.lon));
    return {
      type: "Feature",
      properties: { name },
      geometry: {
        type: "LineString",
        coordinates: onEarth.map((point, i) => [lons[i], point.lat]),
      },
    };
  };
  return {
    type: "FeatureCollection",
    features: NASA_LINES.map(([name, key]) =>
      line(
        name,
        rows.map((row) => row[key]),
      ),
    ),
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

  // Step 2: isolines through the grid, every 30 s up to the longest totality
  const isolines = durationContours(grid, durationThresholds(grid, THRESHOLD_STEP_SECONDS));
  const seconds = (performance.now() - started) / 1000;

  const output = new URL(`${date}.geojson`, DATA_DIR);
  const comparison = new URL(`${date}-nasa-path.geojson`, COMPARE_DIR);
  const json = `${JSON.stringify(isolines)}\n`;
  writeFileSync(output, json);
  mkdirSync(COMPARE_DIR, { recursive: true });
  writeFileSync(comparison, JSON.stringify(nasaLines(rows)));

  // Numbers to watch as eclipses are added: the grid's size drives the run time
  const points = grid.width * grid.height;
  const megabytes = Buffer.byteLength(json) / 1e6;
  console.log(
    `${date}: ${grid.width} × ${grid.height} points in ${seconds.toFixed(1)} s ` +
      `(${((seconds * 1e6) / points).toFixed(1)} µs each), ${isolines.features.length} isolines, ` +
      `${megabytes.toFixed(1)} MB\nWrote ${output.pathname}\nNASA's limits: ${comparison.pathname}`,
  );
}

main();
