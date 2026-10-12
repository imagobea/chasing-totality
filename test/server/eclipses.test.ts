import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/server/app.js";

describe("GET /eclipses", () => {
  it("lists the dates that have data", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/eclipses" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(["2027-08-02"]);
    await app.close();
  });

  it("answers an empty list when there is no data", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "eclipses-"));
    const app = buildApp({ dataDir });
    const res = await app.inject({ method: "GET", url: "/eclipses" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
    await app.close();
    await rm(dataDir, { recursive: true });
  });
});

describe("GET /eclipses/:date/isolines", () => {
  it("serves the isolines as GeoJSON", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/eclipses/2027-08-02/isolines" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/geo+json");
    const body = res.json<{ type: string; features: { properties: { name: string } }[] }>();
    expect(body.type).toBe("FeatureCollection");
    const names = body.features.map((feature) => feature.properties.name);
    expect(names).toContain("Path of totality");
    expect(names).toContain("6m00s");
    await app.close();
  });

  it("answers 404 for a valid date with no data", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/eclipses/2030-01-01/isolines" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it.each(["2027-8-2", "not-a-date", "2027-02-30"])("answers 422 for %s", async (date) => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: `/eclipses/${date}/isolines` });
    expect(res.statusCode).toBe(422);
    await app.close();
  });
});
