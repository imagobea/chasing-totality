import { describe, expect, it } from "vitest";
import type { PathRow } from "../../../src/engine/eclipse/nasaPath.js";
import { pathArea } from "../../../src/engine/isolines/area.js";

// A NASA table row, with round numbers so the extent can be checked by hand
const row = (
  central: [lat: number, lon: number],
  north: [lat: number, lon: number] | null = [central[0] + 1, central[1]],
  south: [lat: number, lon: number] | null = [central[0] - 1, central[1]],
): PathRow => {
  const latLon = (point: [number, number] | null) => point && { lat: point[0], lon: point[1] };
  return {
    time: "10:00",
    north: latLon(north),
    south: latLon(south),
    central: latLon(central) ?? { lat: 0, lon: 0 },
    durationSeconds: 300,
  };
};

describe("pathArea", () => {
  it("spans NASA's limits plus the margin on every side", () => {
    expect(pathArea([row([30, -10]), row([20, 40])], 0.5)).toEqual({
      west: -10.5,
      south: 18.5,
      east: 40.5,
      north: 31.5,
    });
  });

  it("uses the central line where a limit is off the Earth", () => {
    expect(pathArea([row([30, 0], null, null), row([20, 10])], 0)).toEqual({
      west: 0,
      south: 19,
      east: 10,
      north: 30,
    });
  });

  it("stops at the poles", () => {
    expect(pathArea([row([89, 0]), row([-89, 10])], 5)).toMatchObject({ south: -90, north: 90 });
  });

  it("rejects an empty table", () => {
    expect(() => pathArea([], 1)).toThrow(RangeError);
  });

  it("rejects a path across the 180° meridian", () => {
    expect(() => pathArea([row([-40, 170]), row([-45, -170])], 1)).toThrow(/180°/);
  });
});
