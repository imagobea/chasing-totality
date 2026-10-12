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
