import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/server/app.js";

// Shared by every test that reads the real data dir
const app = buildApp();
afterAll(() => app.close());

describe("GET /eclipses", () => {
  it("lists the dates that have data", async () => {
    const res = await app.inject({ method: "GET", url: "/eclipses" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(["2027-08-02"]);
  });

  it("answers an empty list when there is no data", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "eclipses-"));
    const emptyApp = buildApp({ dataDir });
    const res = await emptyApp.inject({ method: "GET", url: "/eclipses" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
    await emptyApp.close();
    await rm(dataDir, { recursive: true });
  });

  it("answers a generic 500 without the server path when the data dir is missing", async () => {
    const dataDir = join(tmpdir(), "eclipses-missing");
    const brokenApp = buildApp({ dataDir });
    const res = await brokenApp.inject({ method: "GET", url: "/eclipses" });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ statusCode: 500, error: "Internal Server Error", message: "Internal Server Error" });
    expect(res.body).not.toContain(dataDir);
    await brokenApp.close();
  });
});

describe("GET /eclipses/:date/isolines", () => {
  it("serves the isolines as GeoJSON", async () => {
    const res = await app.inject({ method: "GET", url: "/eclipses/2027-08-02/isolines" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/geo+json");
    const body = res.json<{ type: string; features: { properties: { name: string } }[] }>();
    expect(body.type).toBe("FeatureCollection");
    const names = body.features.map((feature) => feature.properties.name);
    expect(names).toContain("Path of totality");
    expect(names).toContain("6m00s");
  });

  it("answers 404 for a valid date with no data", async () => {
    const res = await app.inject({ method: "GET", url: "/eclipses/2030-01-01/isolines" });
    expect(res.statusCode).toBe(404);
  });

  // The last one would climb out of the data dir if the schema let slashes through
  it.each(["2027-8-2", "not-a-date", "2027-02-30", "2027-08-02%2F..%2F..%2Fpackage"])("answers 422 for %s", async (date) => {
    const res = await app.inject({ method: "GET", url: `/eclipses/${date}/isolines` });
    expect(res.statusCode).toBe(422);
  });
});
