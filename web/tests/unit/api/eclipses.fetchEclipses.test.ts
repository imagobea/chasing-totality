import { afterEach, describe, expect, it, vi } from "vitest";
import { type Eclipse, fetchEclipses } from "../../../src/api/eclipses.js";

const ECLIPSES: Eclipse[] = [{ date: "2027-08-02", bbox: [-46, -14, 92, 38] }];

describe("fetchEclipses", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the eclipses and their bboxes from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ECLIPSES })),
    );
    expect(await fetchEclipses()).toEqual(ECLIPSES);
    expect(fetch).toHaveBeenCalledWith("/api/eclipses");
  });

  it("fails when the API answers with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 })),
    );
    await expect(fetchEclipses()).rejects.toThrow("500");
  });
});
