import { describe, expect, it } from "vitest";
import { pathArea } from "../../../../src/engine/isolines/area.js";
import { row } from "../../../helpers/pathRow.js";

describe("pathArea", () => {
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

  it("uses the central line where a limit is off the Earth", () => {
    expect(pathArea([row([30, 0], null, null), row([20, 10])], 0)).toEqual({
      west: 0,
      south: 19,
      east: 10,
      north: 30,
    });
  });

  it("rejects an empty table", () => {
    expect(() => pathArea([], 1)).toThrow(RangeError);
  });

  it("spans NASA's limits plus the margin on every side", () => {
    expect(pathArea([row([30, -10]), row([20, 40])], 0.5)).toEqual({
      west: -10.5,
      south: 18.5,
      east: 40.5,
      north: 31.5,
    });
  });

  it("stops at the poles", () => {
    expect(pathArea([row([89, 0]), row([-89, 10])], 5)).toMatchObject({ south: -90, north: 90 });
  });
});
