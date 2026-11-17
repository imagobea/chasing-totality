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

describe("GET /advisories", () => {
  it("serves the committed snapshot as is, as GeoJSON", async () => {
    const fileUrl = new URL("../../../../data/advisories.geojson", import.meta.url);
    const file = await readFile(fileUrl);

    const res = await app.inject({ method: "GET", url: "/advisories" });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/geo+json; charset=utf-8");
    expect(res.rawPayload.equals(file)).toBe(true);
  });

  it("serves the advisories from memory, not the file system", async () => {
    const res = await app.inject({ method: "GET", url: "/advisories" });
    expect(res.statusCode).toBe(200);
    expect(readFile).not.toHaveBeenCalled();
  });
});
