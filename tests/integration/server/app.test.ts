import { join } from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";
import { buildApp } from "../../../src/server/app.js";
import { DataError } from "../../../src/server/dataHelpers.js";
import { dataDirWithout } from "../../helpers/server.js";

describe("buildApp", () => {
  // On the committed data, so it also shows that it loads
  it("answers 200 with status ok on /health once ready", async () => {
    const app = buildApp();
    onTestFinished(() => app.close());

    const res = await app.inject({ method: "GET", url: "/health" }); // waits till app is ready
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it.each([
    ["eclipse data folder", "isolines"],
    ["airports file", "airports.geojson"],
    ["advisories file", "advisories.geojson"],
  ])("doesn't get ready when the %s is missing", async (_, name) => {
    const dataDir = await dataDirWithout(name);
    const app = buildApp({ dataDir });
    onTestFinished(() => app.close());

    // ready() rejects with DataError
    const ready = app.ready();
    await expect(ready).rejects.toBeInstanceOf(DataError);
    await expect(ready).rejects.toMatchObject({ file: join(dataDir, name) });
  });
});
