import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, onTestFinished } from "vitest";
import { buildApp } from "../../../../src/server/app.js";
import { appWithFiles } from "../../../helpers/server.js";

// Shared by every test that reads the real data dir
const app = buildApp();
afterAll(() => app.close());

describe("GET /eclipses", () => {
  // Only 2027 is checked, so adding an eclipse's data doesn't break this test
  it("lists the dates that have data", async () => {
    const res = await app.inject({ method: "GET", url: "/eclipses" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toContain("2027-08-02");
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
