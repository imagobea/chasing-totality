import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../../../src/server/app.js";
import { appWithFiles } from "../../../helpers/server.js";

// Shared by every test that reads the real data dir
const app = buildApp();
afterAll(() => app.close());

describe("GET /eclipses/:date/isolines", () => {
  it("serves the committed 2027 isolines as GeoJSON", async () => {
    const res = await app.inject({ method: "GET", url: "/eclipses/2027-08-02/isolines" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/geo+json");
    const body = res.json<{ type: string; features: { properties: { name: string } }[] }>();
    expect(body.type).toBe("FeatureCollection");
    const names = body.features.map((feature) => feature.properties.name);
    expect(names).toContain("Path of totality");
    expect(names).toContain("6m00s");
  });

  it("serves the date's file as is", async () => {
    const dataApp = await appWithFiles(["2027-08-02.geojson"]);
    const res = await dataApp.inject({ method: "GET", url: "/eclipses/2027-08-02/isolines" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("{}");
  });

  it("answers 404 for a valid date with no data", async () => {
    const emptyApp = await appWithFiles([]);
    const res = await emptyApp.inject({ method: "GET", url: "/eclipses/2027-08-02/isolines" });
    expect(res.statusCode).toBe(404);
  });

  // Any read error other than a missing file, here a dir where the file should be
  it("answers 500 when the file can't be read", async () => {
    const brokenApp = await appWithFiles([], ["2027-08-02.geojson"]);
    const res = await brokenApp.inject({ method: "GET", url: "/eclipses/2027-08-02/isolines" });
    expect(res.statusCode).toBe(500);
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
