import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, onTestFinished, vi } from "vitest";
import { buildApp } from "../../../../src/server/app.js";

// readFile as spy
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, readFile: vi.fn(actual.readFile) };
});

type AirportsBody = { features: { id: string }[] };

// Around the 2027 path over S Spain and N Africa
const PATH_BBOX = "-10,25,45,40";

// Airports placed around PATH_BBOX and the 180° meridian, so filtering can be checked exactly.
// The first five are inside PATH_BBOX.
const SNAPSHOT = {
  type: "FeatureCollection",
  source: { name: "Test", url: "https://example.com/", licence: "Public domain" },
  retrieved: "2026-11-02",
  features: [
    airport("AGP", -4.4991, 36.6749), // inside
    airport("WST", -10, 30), // on each edge
    airport("EST", 45, 30),
    airport("STH", 0, 25),
    airport("NTH", 0, 40),
    airport("OUT", -10.0001, 30), // just outside the west edge
    airport("LHR", -0.4543, 51.47),
    airport("NAN", 177.4434, -17.7554), // 177°E, either side of the 180° meridian
    airport("TBU", -175.1496, -21.2412), // 175°W
  ],
};

function airport(iata: string, lon: number, lat: number) {
  return {
    type: "Feature",
    id: iata,
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: { iata },
  };
}

// An app over a temp copy of SNAPSHOT, shared by the tests that read it
let app: ReturnType<typeof buildApp>;
let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "airports-"));
  const airportsFile = join(dir, "airports.geojson");
  await writeFile(airportsFile, JSON.stringify(SNAPSHOT));
  app = buildApp({ airportsFile });
  await app.ready();
});
afterAll(async () => {
  await app.close();
  await rm(dir, { recursive: true });
});

async function iataCodes(url: string): Promise<string[]> {
  const res = await app.inject({ method: "GET", url });
  expect(res.statusCode).toBe(200);
  return res.json<AirportsBody>().features.map((feature) => feature.id);
}

describe("GET /airports", () => {
  // Without a bbox
  it("serves the committed snapshot as is, as GeoJSON", async () => {
    const fileUrl = new URL("../../../../data/airports.geojson", import.meta.url);
    const file = JSON.parse(await readFile(fileUrl, "utf8"));

    const realApp = buildApp();
    await realApp.ready();
    onTestFinished(() => realApp.close());
    const res = await realApp.inject({ method: "GET", url: "/airports" });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/geo+json; charset=utf-8");
    expect(res.json()).toEqual(file);
  });

  it("serves the snapshot as is without a bbox", async () => {
    const res = await app.inject({ method: "GET", url: "/airports" });
    expect(res.json()).toEqual(SNAPSHOT);
  });

  it("serves the airports from memory, not the file system", async () => {
    const res = await app.inject({ method: "GET", url: "/airports" });
    expect(res.statusCode).toBe(200);
    expect(readFile).not.toHaveBeenCalled();
  });

  // With a bbox
  it.each([
    ["three numbers", "-10,25,45"],
    ["text", "west,south,east,north"],
    ["a longitude out of range", "-361,25,45,40"],
    ["west east of east", "170,-30,-170,-10"],
    ["more than 360° wide", "-180,25,181,40"],
    ["a latitude out of range", "-10,25,45,91"],
    ["south above north", "-10,40,45,25"],
  ])("answers 422 for a bbox with %s", async (_, bbox) => {
    const res = await app.inject({ method: "GET", url: `/airports?bbox=${bbox}` });
    expect(res.statusCode).toBe(422);
  });

  it("serves only the airports inside a bbox, edges included, with the rest as is", async () => {
    const res = await app.inject({ method: "GET", url: `/airports?bbox=${PATH_BBOX}` });
    expect(res.json()).toEqual({ ...SNAPSHOT, features: SNAPSHOT.features.slice(0, 5) });
  });

  it.each([
    ["past 180°", "170,-30,190,-10"],
    ["past -180°", "-190,-30,-170,-10"],
  ])("serves the airports across the 180° meridian for a bbox carrying on %s", async (_, bbox) => {
    expect(await iataCodes(`/airports?bbox=${bbox}`)).toEqual(["NAN", "TBU"]);
  });
});
