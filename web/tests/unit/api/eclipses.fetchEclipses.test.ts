import { afterEach, describe, expect, it, vi } from "vitest";
import { type Eclipse, fetchEclipses } from "../../../src/api/eclipses.js";

// The signal the caller cancels the request with
const SIGNAL = new AbortController().signal;

const ECLIPSES: Eclipse[] = [{ date: "2027-08-02", bbox: [-46, -14, 92, 38] }];

describe("fetchEclipses", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fails when the API answers with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 })),
    );
    await expect(fetchEclipses(SIGNAL)).rejects.toThrow("500");
  });

  it("reads the eclipses and their bboxes from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ECLIPSES })),
    );
    expect(await fetchEclipses(SIGNAL)).toEqual(ECLIPSES);
    expect(fetch).toHaveBeenCalledWith("/api/eclipses", { signal: SIGNAL });
  });
});
