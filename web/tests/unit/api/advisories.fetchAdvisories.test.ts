import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAdvisories } from "../../../src/api/advisories.js";
import { advisories } from "../../helpers/advisories.js";

// The signal the caller cancels the request with
const SIGNAL = new AbortController().signal;

const ADVISORIES = advisories("whole", "parts", "none");

describe("fetchAdvisories", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fails when the API answers with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 })),
    );
    await expect(fetchAdvisories(SIGNAL)).rejects.toThrow("500");
  });

  it("reads every place's advisory from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ADVISORIES })),
    );
    expect(await fetchAdvisories(SIGNAL)).toEqual(ADVISORIES);
    expect(fetch).toHaveBeenCalledWith("/api/advisories", { signal: SIGNAL });
  });
});
