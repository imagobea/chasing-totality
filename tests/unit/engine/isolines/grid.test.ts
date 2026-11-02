import { describe, expect, it } from "vitest";
import { eclipse2027Aug02 } from "../../../../src/engine/eclipse/elements/2027-08-02.js";
import { localCircumstances } from "../../../../src/engine/eclipse/localCircumstances.js";
import { durationGrid } from "../../../../src/engine/isolines/grid.js";

// A small grid across the path over Egypt, around 10:00 UT (central duration ~6m23s)
const AREA = { west: 30, south: 24, east: 33, north: 29 };
const STEP = 0.05;
const grid = durationGrid(eclipse2027Aug02, AREA, STEP);

const at = ([longitude, latitude]: [number, number]) =>
  localCircumstances(eclipse2027Aug02, { latitude, longitude, altitudeMeters: 0 });

describe("durationGrid", () => {
  it.each([
    ["a zero step", { ...AREA }, 0],
    ["a negative step", { ...AREA }, -STEP],
    ["a step that isn't a number", { ...AREA }, Number.NaN],
    ["an empty box", { ...AREA, east: AREA.west }, STEP],
    ["a box with west east of east", { ...AREA, west: AREA.east, east: AREA.west }, STEP],
    ["a box with south north of north", { ...AREA, south: AREA.north, north: AREA.south }, STEP],
  ])("rejects %s", (_, area, step) => {
    expect(() => durationGrid(eclipse2027Aug02, area, step)).toThrow(RangeError);
  });

  it("covers the bounding box, corners included", () => {
    expect(grid.width).toBe(61);
    expect(grid.height).toBe(101);
    expect(grid.values).toHaveLength(61 * 101);
  });

  it("stores each point's signed squared duration row by row from the south-west corner", () => {
    const column = 20;
    const row = 60;
    expect(grid.values[row * grid.width + column]).toBe(
      at([AREA.west + column * STEP, AREA.south + row * STEP]).signedDurationSquared,
    );
  });
});
