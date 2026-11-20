import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DataError, loadAdvisories } from "../../../src/server/dataHelpers.js";
import { tempDir } from "../../helpers/server.js";

const ADVISORIES_FILE = fileURLToPath(new URL("../../../data/advisories.geojson", import.meta.url));

// The smallest advisories snapshot the loader accepts; each broken case changes one thing in it
const SNAPSHOT = {
  type: "FeatureCollection",
  sources: [
    { fields: "fcdo", name: "Advice", url: "https://example.com/advice", licence: "Open" },
    {
      fields: "naturalEarth",
      name: "Shapes",
      url: "https://example.com/shapes",
      licence: "Public domain",
    },
  ],
  retrieved: "2026-11-16",
  features: [
    {
      type: "Feature",
      id: 1,
      properties: { state: "parts" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      },
    },
  ],
};
const FEATURE = SNAPSHOT.features[0];
const SOURCE = SNAPSHOT.sources[0];

// A temp advisories.geojson with the given contents, as text
async function fileWith(contents: string) {
  return join(await tempDir({ "advisories.geojson": contents }), "advisories.geojson");
}

// Expects loading the given snapshot to fail with the given reason, naming the file
async function expectRejected(snapshot: unknown, reason: string | RegExp) {
  const advisoriesFile = await fileWith(JSON.stringify(snapshot));
  await expect(loadAdvisories(advisoriesFile)).rejects.toMatchObject({
    file: advisoriesFile,
    reason: typeof reason === "string" ? reason : expect.stringMatching(reason),
  });
}

describe("loadAdvisories", () => {
  it("throws a DataError naming the file when it is missing", async () => {
    const advisoriesFile = join(await tempDir(), "advisories.geojson");
    const error = loadAdvisories(advisoriesFile);
    await expect(error).rejects.toBeInstanceOf(DataError);
    await expect(error).rejects.toMatchObject({
      file: advisoriesFile,
      reason: "cannot read (ENOENT)",
    });
  });

  it("throws when the file isn't JSON", async () => {
    const advisoriesFile = await fileWith("{");
    await expect(loadAdvisories(advisoriesFile)).rejects.toMatchObject({
      file: advisoriesFile,
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
    ["empty", []],
    ["a single source, not a list", SOURCE],
    ["missing a licence", [{ name: SOURCE.name, url: SOURCE.url }]],
    ["holding a url that isn't text", [SOURCE, { ...SOURCE, url: 1 }]],
  ])("throws when the sources are %s", async (_, sources) => {
    await expectRejected({ ...SNAPSHOT, sources }, "sources need a name, url and licence each");
  });

  it.each([
    ["missing", [{ ...SOURCE, fields: undefined }, SNAPSHOT.sources[1]]],
    ["not text", [SOURCE, { ...SNAPSHOT.sources[1], fields: 1 }]],
  ])("throws when a source's fields are %s", async (_, sources) => {
    await expectRejected({ ...SNAPSHOT, sources }, "sources need the fields they supply each");
  });

  it.each([
    ["missing", undefined],
    ["not YYYY-MM-DD", "16/11/2026"],
    ["not text", 20261116],
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
    ["no properties", { ...FEATURE, properties: undefined }, /^feature 1 has an unknown state/],
    ["no state", { ...FEATURE, properties: {} }, /^feature 1 has an unknown state/],
    [
      "a state that isn't whole, parts or none",
      { ...FEATURE, properties: { state: "avoid" } },
      'feature 1 has an unknown state: "avoid"',
    ],
    ["no geometry", { ...FEATURE, geometry: undefined }, "feature 1 is not a polygon"],
    [
      "a geometry that isn't a polygon",
      { ...FEATURE, geometry: { type: "Point", coordinates: [0, 0] } },
      "feature 1 is not a polygon",
    ],
  ])("throws naming the feature when one has %s", async (_, feature, reason) => {
    await expectRejected({ ...SNAPSHOT, features: [FEATURE, feature] }, reason);
  });

  it("accepts every state and both polygon types", async () => {
    const features = ["whole", "parts", "none"].map((state) => ({
      ...FEATURE,
      properties: { state },
      geometry: { type: "MultiPolygon", coordinates: [FEATURE.geometry.coordinates] },
    }));
    const advisoriesFile = await fileWith(JSON.stringify({ ...SNAPSHOT, features }));
    await expect(loadAdvisories(advisoriesFile)).resolves.toBeInstanceOf(Buffer);
  });

  it("returns the file's bytes as they are", async () => {
    const contents = JSON.stringify(SNAPSHOT, null, 2);
    const advisoriesFile = await fileWith(contents);
    expect((await loadAdvisories(advisoriesFile)).toString("utf8")).toBe(contents);
  });

  it("loads the committed snapshot", async () => {
    const snapshot = JSON.parse((await loadAdvisories(ADVISORIES_FILE)).toString("utf8"));
    expect(
      snapshot.sources.map(({ fields, name }: Record<string, string>) => [fields, name]),
    ).toEqual([
      ["fcdo", "UK FCDO travel advice"],
      ["naturalEarth", "Natural Earth"],
    ]);
    expect(snapshot.features.length).toBeGreaterThan(0);
  });
});
