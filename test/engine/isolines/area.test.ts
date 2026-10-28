import { describe, expect, it } from "vitest";
import type { PathRow } from "../../../src/engine/eclipse/nasaPath.js";
import { pathArea, unwrapPath } from "../../../src/engine/isolines/area.js";

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

  it("carries a path across the 180° meridian on past 180", () => {
    expect(pathArea([row([-40, 170]), row([-45, -170])], 1)).toEqual({
      west: 169,
      south: -47,
      east: 191,
      north: -38,
    });
  });

  it("carries a limit across the 180° meridian on past 180 when its central point isn't", () => {
    expect(pathArea([row([-40, 170]), row([-45, 179], [-44, 179], [-46, -179])], 0)).toEqual({
      west: 170,
      south: -46,
      east: 181,
      north: -39,
    });
  });

  it("leaves a path over 180° wide that doesn't cross the meridian as it is", () => {
    expect(pathArea([row([0, -100]), row([10, -5]), row([20, 90])], 0)).toEqual({
      west: -100,
      south: -1,
      east: 90,
      north: 21,
    });
  });
});

describe("unwrapPath", () => {
  it("leaves rows that don't cross the 180° meridian as they are", () => {
    const rows = [row([0, -100]), row([10, -5]), row([20, 90])];
    expect(unwrapPath(rows)).toEqual(rows);
  });

  it("carries the central line and limits on past 180, keeping everything else", () => {
    const [first, crossed] = unwrapPath([
      row([-40, 179]),
      row([-45, -179], [-44, 179], [-46, -178]),
    ]);
    expect(first).toEqual(row([-40, 179]));
    expect(crossed).toEqual(row([-45, 181], [-44, 179], [-46, 182]));
  });

  it("keeps a limit that's off the Earth off it", () => {
    expect(unwrapPath([row([0, 179], null, null)])).toEqual([row([0, 179], null, null)]);
  });
});
