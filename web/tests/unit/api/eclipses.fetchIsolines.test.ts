import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchIsolines, type Isolines } from "../../../src/api/eclipses.js";
import { isolines } from "../../helpers/isolines.js";

// The signal the caller cancels the request with
const SIGNAL = new AbortController().signal;

const ISOLINES: Isolines = isolines(0, 60);

describe("fetchIsolines", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fails when the API answers with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404 })),
    );
    await expect(fetchIsolines("2027-08-02", SIGNAL)).rejects.toThrow("404");
  });

  it("reads the eclipse's isolines from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ISOLINES })),
    );
    expect(await fetchIsolines("2027-08-02", SIGNAL)).toEqual(ISOLINES);
    expect(fetch).toHaveBeenCalledWith("/api/eclipses/2027-08-02/isolines", { signal: SIGNAL });
  });
});
