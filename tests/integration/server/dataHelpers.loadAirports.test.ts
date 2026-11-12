import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DataError, loadAirports } from "../../../src/server/dataHelpers.js";
import { tempDir } from "../../helpers/server.js";

const AIRPORTS_FILE = fileURLToPath(new URL("../../../data/airports.geojson", import.meta.url));

// The smallest airports snapshot the loader accepts; each broken case changes one thing in it
const SNAPSHOT = {
  type: "FeatureCollection",
  source: { name: "Test", url: "https://example.com/", licence: "Public domain" },
  retrieved: "2026-11-02",
  features: [
    {
      type: "Feature",
      id: "AGP",
      geometry: { type: "Point", coordinates: [-4.4991, 36.6749] },
      properties: { iata: "AGP" },
    },
  ],
};
const FEATURE = SNAPSHOT.features[0];
const SOURCE = SNAPSHOT.source;

// A temp airports.geojson with the given contents, as text
async function fileWith(contents: string) {
  return join(await tempDir({ "airports.geojson": contents }), "airports.geojson");
}

// Expects loading the given snapshot to fail with the given reason, naming the file
async function expectRejected(snapshot: unknown, reason: string | RegExp) {
  const airportsFile = await fileWith(JSON.stringify(snapshot));
  await expect(loadAirports(airportsFile)).rejects.toMatchObject({
    file: airportsFile,
    reason: typeof reason === "string" ? reason : expect.stringMatching(reason),
  });
}

describe("loadAirports", () => {
  it("throws a DataError naming the file when it is missing", async () => {
    const airportsFile = join(await tempDir(), "airports.geojson");
    const error = loadAirports(airportsFile);
    await expect(error).rejects.toBeInstanceOf(DataError);
    await expect(error).rejects.toMatchObject({
      file: airportsFile,
      reason: "cannot read (ENOENT)",
    });
  });

  it("throws when the file isn't JSON", async () => {
    const airportsFile = await fileWith("{");
    await expect(loadAirports(airportsFile)).rejects.toMatchObject({
      file: airportsFile,
      reason: expect.stringMatching(/^invalid JSON/),
    });
  });

  it.each([
    ["an array", []],
    ["null", null],
    ["a Feature", { ...SNAPSHOT, type: "Feature" }],
  ])("throws when the document is %s, not a FeatureCollection", async (_, snapshot) => {
    await expectRejected(snapshot, "not a FeatureCollection");
  });

  it.each([
    ["missing", undefined],
    ["without a licence", { name: SOURCE.name, url: SOURCE.url }],
    ["with a url that isn't text", { ...SOURCE, url: 1 }],
  ])("throws when the source is %s", async (_, source) => {
    await expectRejected({ ...SNAPSHOT, source }, "source needs a name, url and licence");
  });

  it.each([
    ["missing", undefined],
    ["not YYYY-MM-DD", "02/11/2026"],
    ["not text", 20261102],
  ])("throws when the retrieved date is %s", async (_, retrieved) => {
    await expectRejected({ ...SNAPSHOT, retrieved }, /^invalid retrieved date/);
  });

  it.each([
    ["missing", undefined],
    ["empty", []],
  ])("throws when the features are %s", async (_, features) => {
    await expectRejected({ ...SNAPSHOT, features }, "no features");
  });

  it.each([
    ["no geometry", { ...FEATURE, geometry: undefined }],
    // Only the type changes, so the coordinates can't be what fails it
    [
      "a geometry that isn't a Point",
      { ...FEATURE, geometry: { ...FEATURE.geometry, type: "Polygon" } },
    ],
    ["three coordinates", { ...FEATURE, geometry: { type: "Point", coordinates: [0, 0, 0] } }],
    ["a coordinate as text", { ...FEATURE, geometry: { type: "Point", coordinates: [0, "0"] } }],
  ])("throws naming the feature when one has %s", async (_, feature) => {
    await expectRejected({ ...SNAPSHOT, features: [FEATURE, feature] }, "feature 1 is not a point");
  });

  it("returns the snapshot as parsed", async () => {
    const airportsFile = await fileWith(JSON.stringify(SNAPSHOT));
    expect(await loadAirports(airportsFile)).toEqual(SNAPSHOT);
  });

  it("loads the committed snapshot", async () => {
    const snapshot = await loadAirports(AIRPORTS_FILE);
    expect(snapshot.source.name).toBe("OurAirports");
    expect(snapshot.features.length).toBeGreaterThan(0);
  });
});
