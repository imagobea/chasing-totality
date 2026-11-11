import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DataError, loadIsolines } from "../../../src/server/dataHelpers.js";
import { tempDir } from "../../helpers/server.js";

const DATA_DIR = fileURLToPath(new URL("../../../data/isolines/", import.meta.url));

// The smallest isolines document the loader accepts; each broken case changes one thing in it
const ISOLINES = {
  type: "FeatureCollection",
  bbox: [-10, 25, 45, 40],
  features: [
    {
      type: "Feature",
      properties: { durationSeconds: 0, name: "Path of totality" },
      geometry: { type: "MultiPolygon", coordinates: [] },
    },
  ],
};
const FEATURE = ISOLINES.features[0];

// Expects loading a dir holding 2027-08-02.geojson with the given isolines to fail with the given
// reason, naming the file
async function expectRejected(isolines: unknown, reason: string | RegExp) {
  const dataDir = await tempDir({ "2027-08-02.geojson": JSON.stringify(isolines) });
  await expect(loadIsolines(dataDir)).rejects.toMatchObject({
    file: join(dataDir, "2027-08-02.geojson"),
    reason: typeof reason === "string" ? reason : expect.stringMatching(reason),
  });
}

describe("loadIsolines", () => {
  it("throws a DataError naming the folder when it is missing", async () => {
    const dataDir = join(await tempDir(), "missing");
    const error = loadIsolines(dataDir);
    await expect(error).rejects.toBeInstanceOf(DataError);
    await expect(error).rejects.toMatchObject({
      file: dataDir,
      reason: "cannot list folder (ENOENT)",
    });
  });

  it("throws when the folder is empty", async () => {
    const dataDir = await tempDir();
    await expect(loadIsolines(dataDir)).rejects.toMatchObject({
      file: dataDir,
      reason: "empty folder",
    });
  });

  it.each(["notes.txt", "2027-08-02.json", "2027-8-2.geojson", "2027-08-02.geojson.bak"])(
    "throws for a file that isn't named <date>.geojson: %s",
    async (name) => {
      const dataDir = await tempDir({ "2027-08-02.geojson": JSON.stringify(ISOLINES), [name]: "" });
      await expect(loadIsolines(dataDir)).rejects.toMatchObject({
        file: dataDir,
        reason: `invalid file name ${name}`,
      });
    },
  );

  // A dir where the file should be, so it is listed but can't be read
  it("throws when a file can't be read", async () => {
    const dataDir = await tempDir({}, ["2027-08-02.geojson"]);
    await expect(loadIsolines(dataDir)).rejects.toMatchObject({
      file: join(dataDir, "2027-08-02.geojson"),
      reason: "cannot read (EISDIR)",
    });
  });

  it("throws when a file isn't JSON", async () => {
    const dataDir = await tempDir({ "2027-08-02.geojson": "{" });
    await expect(loadIsolines(dataDir)).rejects.toMatchObject({
      file: join(dataDir, "2027-08-02.geojson"),
      reason: expect.stringMatching(/^invalid JSON/),
    });
  });

  it.each([
    ["an array", []],
    ["null", null],
    ["a Feature", { ...ISOLINES, type: "Feature" }],
  ])("throws when the document is %s, not a FeatureCollection", async (_, isolines) => {
    await expectRejected(isolines, "not a FeatureCollection");
  });

  it.each([
    ["missing", undefined],
    ["three numbers", [-10, 25, 45]],
    ["text", [-10, 25, 45, "40"]],
  ])("throws when the bbox is %s", async (_, bbox) => {
    await expectRejected({ ...ISOLINES, bbox }, /^invalid bbox/);
  });

  it.each([
    ["missing", undefined],
    ["empty", []],
  ])("throws when the features are %s", async (_, features) => {
    await expectRejected({ ...ISOLINES, features }, "no features");
  });

  it.each([
    ["no properties", { ...FEATURE, properties: undefined }],
    ["no durationSeconds", { ...FEATURE, properties: { name: "Path of totality" } }],
    ["a durationSeconds as text", { ...FEATURE, properties: { durationSeconds: "0" } }],
  ])("throws naming the feature when one has %s", async (_, feature) => {
    const isolines = { ...ISOLINES, features: [FEATURE, feature] };
    await expectRejected(isolines, "feature 1 missing durationSeconds");
  });

  it("keys each file's bytes, as is, by its date", async () => {
    const bytes2027 = JSON.stringify(ISOLINES, null, 2);
    const bytes2028 = JSON.stringify(ISOLINES);
    const dataDir = await tempDir({
      "2027-08-02.geojson": bytes2027,
      "2028-07-22.geojson": bytes2028,
    });
    const isolines = await loadIsolines(dataDir);
    expect([...isolines.keys()]).toEqual(["2027-08-02", "2028-07-22"]);
    expect(isolines.get("2027-08-02")?.toString()).toBe(bytes2027);
    expect(isolines.get("2028-07-22")?.toString()).toBe(bytes2028);
  });

  // Only 2027 is checked, so adding an eclipse's data doesn't break this test
  it("loads the committed isolines", async () => {
    const isolines = await loadIsolines(DATA_DIR);
    expect(isolines.has("2027-08-02")).toBe(true);
  });
});
