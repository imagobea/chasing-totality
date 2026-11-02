import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The script reads NASA's table and writes its output with node:fs. The mock feeds it an excerpt
// of the table, so the grid around it stays small, and keeps the output off disk for the tests
// to read.
vi.mock("node:fs", () => ({ readFileSync: vi.fn(), writeFileSync: vi.fn(), mkdirSync: vi.fn() }));

type Feature = {
  properties: { name: string; durationSeconds?: number };
  geometry: { coordinates: unknown[] };
};

const { readFileSync: readActual } = await vi.importActual<typeof import("node:fs")>("node:fs");
const TABLE = readActual(
  new URL("../../../data/nasa-paths/2027-08-02.txt", import.meta.url),
  "utf8",
);
const ROW = /^ (Limits|\d\d:\d\d) /;
// Mid-path, where NASA gives 6m23s on the central line
const MID_PATH = ["10:00", "10:02", "10:04"];
const ARGV = process.argv;

// NASA's 2027 table with its header and only the rows at the given times. Never the Limits rows:
// both ends of the path share that name, so keeping one keeps the whole path and its slow grid.
function excerpt(times: string[]): string {
  return TABLE.split("\n")
    .filter((line) => !ROW.test(line) || times.some((time) => line.startsWith(` ${time} `)))
    .join("\n");
}

// Runs the script for a date with the given rows of NASA's table
async function generate(date: string | undefined, times = MID_PATH) {
  vi.mocked(readFileSync).mockReturnValue(excerpt(times));
  process.argv = [ARGV[0] ?? "node", "generate-isolines.ts", ...(date ? [date] : [])];
  vi.resetModules();
  await import("../../../scripts/generate-isolines.js");
}

// The GeoJSON the script wrote to a path ending in `name`, or undefined if none
function written(name: string): { type: string; features: Feature[] } | undefined {
  const call = vi.mocked(writeFileSync).mock.calls.find(([path]) => String(path).endsWith(name));
  return call && JSON.parse(String(call[1]));
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  // Thrown, so the script stops where it exits
  vi.spyOn(process, "exit").mockImplementation((code) => {
    throw new Error(`exit ${code}`);
  });
});

afterEach(() => {
  process.argv = ARGV;
  vi.restoreAllMocks();
  vi.mocked(readFileSync).mockReset();
  vi.mocked(writeFileSync).mockClear();
  vi.mocked(mkdirSync).mockClear();
});

describe("generate-isolines", () => {
  it.each([
    ["no date", undefined],
    ["an unknown date", "2027-08-03"],
  ])("exits with the known dates and writes nothing for %s", async (_, date) => {
    await expect(generate(date)).rejects.toThrow("exit 1");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("2027-08-02"));
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("reads NASA's path table for the date", async () => {
    await generate("2027-08-02");
    expect(String(vi.mocked(readFileSync).mock.lastCall?.[0])).toMatch(
      /\/data\/nasa-paths\/2027-08-02\.txt$/,
    );
  });

  it("writes isolines every 30 s up to the longest totality to data/isolines/", async () => {
    await generate("2027-08-02");
    const isolines = written("/data/isolines/2027-08-02.geojson");
    expect(isolines?.type).toBe("FeatureCollection");
    expect(isolines?.features.map((feature) => feature.properties.durationSeconds)).toEqual(
      Array.from({ length: 13 }, (_, i) => i * 30), // 0 to 6m00s
    );
  });

  // out/ is not committed, so a fresh clone has none
  it("writes NASA's limits and central line to out/, one point per row", async () => {
    await generate("2027-08-02");
    expect(String(vi.mocked(mkdirSync).mock.lastCall?.[0])).toMatch(/\/out\/$/);
    const lines = written("/out/2027-08-02-nasa-path.geojson");
    expect(
      lines?.features.map((feature) => [
        feature.properties.name,
        feature.geometry.coordinates.length,
      ]),
    ).toEqual([
      ["NASA northern limit", 3],
      ["NASA southern limit", 3],
      ["NASA central line", 3],
    ]);
  });

  // At 11:48 the northern limit is off the Earth
  it("leaves out the points where a limit is off the Earth", async () => {
    await generate("2027-08-02", ["11:46", "11:48"]);
    const lines = written("/out/2027-08-02-nasa-path.geojson");
    expect(lines?.features.map((feature) => feature.geometry.coordinates.length)).toEqual([
      1, 2, 2,
    ]);
  });
});
