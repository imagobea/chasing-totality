import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, onTestFinished, vi } from "vitest";
import { buildApp } from "../../../../src/server/app.js";
import { appWithFiles } from "../../../helpers/server.js";

// readdir as is, so a test can make it answer once in an order of its own
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, readdir: vi.fn(actual.readdir) };
});

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

  it("leaves out files that aren't named after a date and files that don't have the correct extension", async () => {
    const mixedApp = await appWithFiles([
      "2027-08-02.geojson",
      "2027-durations.geojson",
      "2026-12-08.txt",
    ]);
    const res = await mixedApp.inject({ method: "GET", url: "/eclipses" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(["2027-08-02"]);
  });

  // The file system may already list them sorted, so it answers out of order here
  it("sorts the dates", async () => {
    vi.mocked(readdir).mockResolvedValueOnce([
      "2028-07-22.geojson",
      "2026-08-12.geojson",
      "2027-08-02.geojson",
    ] as never);
    const res = await app.inject({ method: "GET", url: "/eclipses" });
    expect(res.json()).toEqual(["2026-08-12", "2027-08-02", "2028-07-22"]);
  });

  it("answers 500 without the server path when the data dir is missing", async () => {
    // A random name, so the dir can't already exist
    const dataDir = join(tmpdir(), `eclipses-${randomUUID()}`);
    const brokenApp = buildApp({ dataDir });
    onTestFinished(() => brokenApp.close());
    const res = await brokenApp.inject({ method: "GET", url: "/eclipses" });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain(dataDir);
  });
});
