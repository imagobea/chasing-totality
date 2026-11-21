import { readdir, readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it, onTestFinished, vi } from "vitest";
import { buildApp } from "../../../../src/server/app.js";

// readdir as spy
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, readdir: vi.fn(actual.readdir) };
});

// Shared by every test that reads the real data dir
const app = buildApp();
beforeAll(() => app.ready());
afterAll(() => app.close());

describe("GET /eclipses", () => {
  // Only 2027 is checked, so adding an eclipse's data doesn't break this test
  it("lists each eclipse that has data with the bbox from its isolines", async () => {
    const fileUrl = new URL("../../../../data/isolines/2027-08-02.geojson", import.meta.url);
    const { bbox } = JSON.parse(await readFile(fileUrl, "utf8"));

    const res = await app.inject({ method: "GET", url: "/eclipses" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toContainEqual({ date: "2027-08-02", bbox });
  });

  // The file system may already list them sorted, so it answers out of order here
  it("sorts the dates", async () => {
    vi.mocked(readdir).mockResolvedValueOnce([
      "2028-07-22.geojson",
      "2026-08-12.geojson",
      "2027-08-02.geojson",
    ] as never);

    const shuffledApp = buildApp();
    onTestFinished(() => shuffledApp.close());
    await shuffledApp.ready();

    const res = await shuffledApp.inject({ method: "GET", url: "/eclipses" });
    const dates = res.json().map(({ date }: { date: string }) => date);
    expect(dates).toEqual(["2026-08-12", "2027-08-02", "2028-07-22"]);
  });

  it("serves dates from memory, not the file system", async () => {
    const res = await app.inject({ method: "GET", url: "/eclipses" });
    expect(res.statusCode).toBe(200);
    expect(readdir).not.toHaveBeenCalled();
  });
});
