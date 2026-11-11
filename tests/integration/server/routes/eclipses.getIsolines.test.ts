import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../../../src/server/app.js";

// readFile as spy
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, readFile: vi.fn(actual.readFile) };
});

// Shared by every test that reads the real data dir
const app = buildApp();
beforeAll(() => app.ready());
afterAll(() => app.close());

describe("GET /eclipses/:date/isolines", () => {
  it("answers 404 for a valid date with no data", async () => {
    const fakeEclipseDate = "2026-08-13"; // the day after 2026-08-12, which has data
    const res = await app.inject({ method: "GET", url: `/eclipses/${fakeEclipseDate}/isolines` });
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

  it("serves the committed 2027 isolines as is, as GeoJSON", async () => {
    const fileUrl = new URL("../../../../data/isolines/2027-08-02.geojson", import.meta.url);
    const file = await readFile(fileUrl);

    const res = await app.inject({ method: "GET", url: "/eclipses/2027-08-02/isolines" });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/geo+json");
    expect(res.rawPayload.equals(file)).toBe(true);
  });

  it("serves the isolines from memory, not the file system", async () => {
    const res = await app.inject({ method: "GET", url: "/eclipses/2027-08-02/isolines" });
    expect(res.statusCode).toBe(200);
    expect(readFile).not.toHaveBeenCalled();
  });
});
