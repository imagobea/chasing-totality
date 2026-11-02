import { describe, expect, it } from "vitest";
import { eclipse2027Aug02 } from "../../../../src/engine/eclipse/elements/2027-08-02.js";
import { durationThresholds } from "../../../../src/engine/isolines/contours.js";
import { durationGrid } from "../../../../src/engine/isolines/grid.js";

// A small grid across the path over Egypt, around 10:00 UT (central duration ~6m23s)
const AREA = { west: 30, south: 24, east: 33, north: 29 };
const STEP = 0.05;
const grid = durationGrid(eclipse2027Aug02, AREA, STEP);

describe("durationThresholds", () => {
  it.each([0, -30, Number.NaN])("rejects a step of %s", (step) => {
    expect(() => durationThresholds(grid, step)).toThrow(RangeError);
  });

  it("steps from 0 up to the longest duration in the grid (~6m23s)", () => {
    expect(durationThresholds(grid, 30)).toEqual(Array.from({ length: 13 }, (_, i) => i * 30));
  });

  it("gives only the path of totality when nothing reaches the first step", () => {
    expect(durationThresholds(grid, 400)).toEqual([0]);
  });

  it("gives only the path of totality for a grid with no totality", () => {
    const outside = { ...grid, values: new Float64Array(grid.values.length).fill(-1) };
    expect(durationThresholds(outside, 30)).toEqual([0]);
  });
});
