import { describe, expect, it } from "vitest";
import { eclipse2027Aug02 } from "../../src/eclipse/elements/2027-08-02.js";
import { localCircumstances } from "../../src/eclipse/localCircumstances.js";
import { durationContours, type Position } from "../../src/isolines/contours.js";
import { durationGrid } from "../../src/isolines/grid.js";

// A small grid across the path over Egypt, around 10:00 UT (central duration ~6m23s).
const AREA = { west: 30, south: 24, east: 33, north: 29 };
const STEP = 0.05;
const grid = durationGrid(eclipse2027Aug02, AREA, STEP);

const durationAt = ([longitude, latitude]: Position) =>
  localCircumstances(eclipse2027Aug02, { latitude, longitude, altitudeMeters: 0 }).durationSeconds;

// Isoline vertices, leaving out those where d3-contour closes a polygon along the grid's edge.
const isolineVertices = (coordinates: Position[][][]) =>
  coordinates
    .flat(2)
    .filter(
      ([lon, lat]) =>
        lon > AREA.west && lon < AREA.east && lat > AREA.south && lat < AREA.north,
    );

describe("durationGrid", () => {
  it("covers the bounding box, corners included", () => {
    expect(grid.width).toBe(61);
    expect(grid.height).toBe(101);
    expect(grid.values).toHaveLength(61 * 101);
  });

  it("stores each point's duration row by row from the south-west corner", () => {
    const column = 20;
    const row = 60;
    expect(grid.values[row * grid.width + column]).toBe(
      durationAt([AREA.west + column * STEP, AREA.south + row * STEP]),
    );
  });

  it.each([
    ["a zero step", { ...AREA }, 0],
    ["an empty box", { ...AREA, east: AREA.west }, STEP],
  ])("rejects %s", (_, area, step) => {
    expect(() => durationGrid(eclipse2027Aug02, area, step)).toThrow(RangeError);
  });
});

describe("durationContours", () => {
  const isolines = durationContours(grid, [0, 180, 360]);

  it("returns one feature per threshold, labelled with its duration", () => {
    expect(isolines.features.map((f) => f.properties)).toEqual([
      { durationSeconds: 0, name: "Path of totality" },
      { durationSeconds: 180, name: "3m00s" },
      { durationSeconds: 360, name: "6m00s" },
    ]);
  });

  it("leaves out durations no point reaches", () => {
    // The longest totality of this eclipse is ~6m23s.
    const durations = durationContours(grid, [360, 390]).features.map((f) => f.properties.durationSeconds);
    expect(durations).toEqual([360]);
  });

  it("names a duration that isn't a whole minute", () => {
    const [isoline] = durationContours(grid, [90]).features;
    expect(isoline?.properties.name).toBe("1m30s");
  });

  // Measured on this 0.05° grid: 0.6 s at 180 s, 0.07 s at 360 s.
  it("draws the inner isolines where the engine gives that duration, within 1 s", () => {
    for (const { properties, geometry } of isolines.features.slice(1)) {
      const vertices = isolineVertices(geometry.coordinates);
      expect(vertices.length).toBeGreaterThan(0);
      for (const vertex of vertices) {
        expect(Math.abs(durationAt(vertex) - properties.durationSeconds)).toBeLessThan(1);
      }
    }
  });

  // Known limitation: duration rises steeply just inside a limit, and grid points outside the
  // path are all 0, so interpolation draws the edge on the outside, up to a grid cell away
  // (~5.6 km measured here); isolines below ~150 s are off by 2–30 s.
  it("draws the path's edge just outside the path", () => {
    const vertices = isolineVertices(isolines.features[0]?.geometry.coordinates ?? []);
    expect(vertices.length).toBeGreaterThan(0);
    for (const vertex of vertices) {
      expect(durationAt(vertex)).toBe(0);
    }
  });
});
