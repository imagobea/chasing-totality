import { join } from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";
import { buildApp } from "../../../src/server/app.js";
import { DataError } from "../../../src/server/dataHelpers.js";
import { tempDir } from "../../helpers/server.js";

describe("buildApp", () => {
  // On the committed data, so it also shows that it loads
  it("answers 200 with status ok on /health once ready", async () => {
    const app = buildApp();
    onTestFinished(() => app.close());

    const res = await app.inject({ method: "GET", url: "/health" }); // waits till app is ready
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("doesn't get ready when the eclipse data folder is missing", async () => {
    const dataDir = join(await tempDir(), "isolines");
    const app = buildApp({ dataDir });
    onTestFinished(() => app.close());

    // ready() rejects with DataError
    const ready = app.ready();
    await expect(ready).rejects.toBeInstanceOf(DataError);
    await expect(ready).rejects.toMatchObject({ file: dataDir });
  });

  it("doesn't get ready when the airports file is missing", async () => {
    const airportsFile = join(await tempDir(), "airports.geojson");
    const app = buildApp({ airportsFile });
    onTestFinished(() => app.close());

    // ready() rejects with DataError
    const ready = app.ready();
    await expect(ready).rejects.toBeInstanceOf(DataError);
    await expect(ready).rejects.toMatchObject({ file: airportsFile });
  });
});
