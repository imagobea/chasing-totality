import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, onTestFinished } from "vitest";
import { buildApp } from "../../src/server/app.js";

type AirportsBody = {
  type: string;
  source: { name: string; url: string; licence: string };
  retrieved: string;
  features: { id: string }[];
};

// Around the 2027 path over S Spain and N Africa
const PATH_BBOX = "-10,25,45,40";

// Shared by every test that reads the real snapshot
const app = buildApp();
afterAll(() => app.close());

async function iataCodes(url: string): Promise<string[]> {
  const res = await app.inject({ method: "GET", url });
  expect(res.statusCode).toBe(200);
  return res.json<AirportsBody>().features.map((feature) => feature.id);
}

describe("GET /airports", () => {
  it("serves the airports as GeoJSON with their source and retrieval date", async () => {
    const res = await app.inject({ method: "GET", url: "/airports" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/geo+json; charset=utf-8");
    const body = res.json<AirportsBody>();
    expect(body.type).toBe("FeatureCollection");
    expect(body.source).toEqual({
      name: "OurAirports",
      url: "https://ourairports.com/data/",
      licence: "Public domain",
    });
    expect(body.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("serves airports worldwide without a bbox", async () => {
    expect(await iataCodes("/airports")).toEqual(expect.arrayContaining(["LHR", "JFK", "AGP"]));
  });

  it("serves only the airports inside a bbox", async () => {
    const codes = await iataCodes(`/airports?bbox=${PATH_BBOX}`);
    expect(codes).toEqual(expect.arrayContaining(["AGP", "SVQ", "TNG", "LXR"]));
    expect(codes).not.toContain("LHR");
    expect(codes).not.toContain("JFK");
  });

  // Fiji's NAN is at 177°E and Tonga's TBU at 175°W, either side of the 180° meridian
  it.each([
    ["past 180°", "170,-30,190,-10"],
    ["past -180°", "-190,-30,-170,-10"],
  ])("serves the airports across the 180° meridian for a bbox carrying on %s", async (_, bbox) => {
    const codes = await iataCodes(`/airports?bbox=${bbox}`);
    expect(codes).toEqual(expect.arrayContaining(["NAN", "TBU"]));
    expect(codes).not.toContain("AGP");
  });

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

  it("answers a generic 500 without the server path when the snapshot is missing", async () => {
    // A random name, so the file can't already exist
    const airportsFile = join(tmpdir(), `airports-${randomUUID()}.geojson`);
    const brokenApp = buildApp({ airportsFile });
    onTestFinished(() => brokenApp.close());
    const res = await brokenApp.inject({ method: "GET", url: "/airports" });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain(airportsFile);
  });
});
