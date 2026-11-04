import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Isolines } from "../../../src/api/eclipses.js";
import { durationBands } from "../../../src/map/isolines.js";

// The isolines the API serves, one file per eclipse
const DATA_DIR = new URL("../../../../data/isolines/", import.meta.url);
// Only the isolines, whatever else ends up in the folder
const FILES = readdirSync(DATA_DIR).filter((file) => file.endsWith(".geojson"));

// Real isolines have thousands of vertices, and cutting them can throw where small squares
// don't. The map then drops the fills without an error, so only a test can notice.
describe("durationBands on the committed isolines", () => {
  it.each(FILES)("cuts %s into bands", (file) => {
    const isolines = JSON.parse(readFileSync(new URL(file, DATA_DIR), "utf8")) as Isolines;
    expect(durationBands(isolines).length).toBeGreaterThan(0);
  });
});
