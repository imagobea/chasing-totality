import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, onTestFinished } from "vitest";
import { buildApp } from "../../src/server/app.js";

// Shared by every test that reads the real data dir
const app = buildApp();
afterAll(() => app.close());

// An app over a temp data dir holding the given files; both are cleaned up when the test ends, even if it fails
async function appWithFiles(names: string[]) {
  const dataDir = await mkdtemp(join(tmpdir(), "eclipses-"));
  await Promise.all(names.map((name) => writeFile(join(dataDir, name), "{}")));
  const tempApp = buildApp({ dataDir });
  onTestFinished(async () => {
    await tempApp.close();
    await rm(dataDir, { recursive: true });
  });
  return tempApp;
}

describe("GET /eclipses", () => {
  it("lists the dates that have data", async () => {
    const res = await app.inject({ method: "GET", url: "/eclipses" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(["2027-08-02"]);
  });

  it("answers an empty list when there is no data", async () => {
    const emptyApp = await appWithFiles([]);
    const res = await emptyApp.inject({ method: "GET", url: "/eclipses" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("leaves out files that aren't named after a date", async () => {
    const mixedApp = await appWithFiles(["2027-08-02.geojson", "2027-durations.geojson"]);
    const res = await mixedApp.inject({ method: "GET", url: "/eclipses" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(["2027-08-02"]);
  });

  it("answers a generic 500 without the server path when the data dir is missing", async () => {
    // A random name, so the dir can't already exist
    const dataDir = join(tmpdir(), `eclipses-${randomUUID()}`);
    const brokenApp = buildApp({ dataDir });
    onTestFinished(() => brokenApp.close());
    const res = await brokenApp.inject({ method: "GET", url: "/eclipses" });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Internal Server Error",
    });
    expect(res.body).not.toContain(dataDir);
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
  it.each(["2027-8-2", "not-a-date", "2027-02-30", "2027-08-02%2F..%2F..%2Fpackage"])(
    "answers 422 for %s",
    async (date) => {
      const res = await app.inject({ method: "GET", url: `/eclipses/${date}/isolines` });
      expect(res.statusCode).toBe(422);
    },
  );
});
