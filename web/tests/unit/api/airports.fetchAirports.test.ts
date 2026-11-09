import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAirports } from "../../../src/api/airports.js";
import { airports } from "../../helpers/airports.js";

const AIRPORTS = airports("AGP", "LXR");

// Answers every request with the airports
function mockApi() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => AIRPORTS })),
  );
}

describe("fetchAirports", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fails when the API answers with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 })),
    );
    await expect(fetchAirports([-46, -14, 92, 38])).rejects.toThrow("500");
  });

  it("reads the airports within 3° of the eclipse's path from the API", async () => {
    mockApi();
    expect(await fetchAirports([-46, -14, 92, 38])).toEqual(AIRPORTS);
    expect(fetch).toHaveBeenCalledWith("/api/airports?bbox=-49,-17,95,41");
  });

  // Whole degrees keep float noise out of the URL: 3.0000000000000004 - 3 would read 4.4e-16
  it("rounds the box outwards to whole degrees", async () => {
    mockApi();
    await fetchAirports([3.0000000000000004, -14.36, 91.83, 37.84]);
    expect(fetch).toHaveBeenCalledWith("/api/airports?bbox=0,-18,95,41");
  });

  it("carries on past 180° like the path", async () => {
    mockApi();
    await fetchAirports([74, -52, 182, -9]);
    expect(fetch).toHaveBeenCalledWith("/api/airports?bbox=71,-55,185,-6");
  });

  it("stops at the poles", async () => {
    mockApi();
    await fetchAirports([0, -89, 10, 89]);
    expect(fetch).toHaveBeenCalledWith("/api/airports?bbox=-3,-90,13,90");
  });
});
