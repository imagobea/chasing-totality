import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchIsolines, type Isolines } from "../../src/api/eclipses.js";

const ISOLINES: Isolines = { type: "FeatureCollection", bbox: [-46, -14, 92, 38], features: [] };

describe("fetchIsolines", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the eclipse's isolines from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ISOLINES })),
    );
    expect(await fetchIsolines("2027-08-02")).toEqual(ISOLINES);
    expect(fetch).toHaveBeenCalledWith("/api/eclipses/2027-08-02/isolines");
  });

  it("fails when the API answers with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404 })),
    );
    await expect(fetchIsolines("2027-08-02")).rejects.toThrow("404");
  });
});
