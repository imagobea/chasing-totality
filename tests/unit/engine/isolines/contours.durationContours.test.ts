import { describe, expect, it } from "vitest";
import { eclipse2027Aug02 } from "../../../../src/engine/eclipse/elements/2027-08-02.js";
import { localCircumstances } from "../../../../src/engine/eclipse/localCircumstances.js";
import { durationContours, type Position } from "../../../../src/engine/isolines/contours.js";
import { durationGrid } from "../../../../src/engine/isolines/grid.js";

// A small grid across the path over Egypt, around 10:00 UT (central duration ~6m23s)
const AREA = { west: 30, south: 24, east: 33, north: 29 };
const STEP = 0.05;
const grid = durationGrid(eclipse2027Aug02, AREA, STEP);

const at = ([longitude, latitude]: Position) =>
  localCircumstances(eclipse2027Aug02, { latitude, longitude, altitudeMeters: 0 });
const durationAt = (position: Position) => at(position).durationSeconds;

// Isoline vertices, leaving out those where d3-contour closes a polygon along the grid's edge
const isolineVertices = (coordinates: Position[][][]) =>
  coordinates
    .flat(2)
    .filter(
      ([lon, lat]) => lon > AREA.west && lon < AREA.east && lat > AREA.south && lat < AREA.north,
    );

describe("durationContours", () => {
  const isolines = durationContours(grid, [0, 30, 180, 360]);

  // Measured: within 30 m. The path runs west–east here, so a step north or south crosses it.
  it("draws the path's edge within 100 m of the limit", () => {
    const vertices = isolineVertices(isolines.features[0]?.geometry.coordinates ?? []);
    expect(vertices.length).toBeGreaterThan(0);
    const hundredMetres = 0.1 / 111.2; // degrees of latitude
    for (const [lon, lat] of vertices) {
      const south = at([lon, lat - hundredMetres]).type === "total";
      const north = at([lon, lat + hundredMetres]).type === "total";
      expect(south).not.toBe(north);
    }
  });

  // Measured on this 0.05° grid: 0.8 s at 30 s, 0.13 s at 180 s, 0.07 s at 360 s
  it("draws each isoline where the engine gives that duration, within 1 s", () => {
    for (const { properties, geometry } of isolines.features.slice(1)) {
      const vertices = isolineVertices(geometry.coordinates);
      expect(vertices.length).toBeGreaterThan(0);
      for (const vertex of vertices) {
        expect(Math.abs(durationAt(vertex) - properties.durationSeconds)).toBeLessThan(1);
      }
    }
  });

  // A grid can reach a pole (2026-08-12's reaches 90°N), where half a step past is off the Earth
  it("stops the bbox and the isolines at the poles", () => {
    const poleToPole = {
      west: 0,
      south: -90,
      step: 90,
      width: 2,
      height: 3,
      values: new Float64Array(6).fill(1),
    };
    const { bbox, features } = durationContours(poleToPole, [0]);
    expect(bbox[1]).toBe(-90);
    expect(bbox[3]).toBe(90);
    for (const [, lat] of features.flatMap((f) => f.geometry.coordinates.flat(2))) {
      expect(Math.abs(lat)).toBeLessThanOrEqual(90);
    }
  });

  // A grid across the 180° meridian carries on past 180, like NASA's path in area.ts
  it("keeps longitudes past 180° for a grid across the meridian", () => {
    const acrossMeridian = {
      west: 178,
      south: 0,
      step: 1,
      width: 5,
      height: 3,
      values: new Float64Array(15).fill(1),
    };
    const { bbox, features } = durationContours(acrossMeridian, [0]);
    expect(bbox[2]).toBe(182.5);
    const lons = features.flatMap((f) => f.geometry.coordinates.flat(2)).map(([lon]) => lon);
    expect(Math.max(...lons)).toBeGreaterThan(180);
  });

  // d3-contour closes polygons half a step beyond the outer points, so the bbox goes there too
  it("gives a bbox around the grid that holds every isoline", () => {
    const half = STEP / 2;
    const [west = 0, south = 0, east = 0, north = 0] = isolines.bbox;
    expect(west).toBeCloseTo(AREA.west - half, 9);
    expect(south).toBeCloseTo(AREA.south - half, 9);
    expect(east).toBeCloseTo(AREA.east + half, 9);
    expect(north).toBeCloseTo(AREA.north + half, 9);
    for (const [lon, lat] of isolines.features.flatMap((f) => f.geometry.coordinates.flat(2))) {
      expect(lon >= west && lon <= east && lat >= south && lat <= north).toBe(true);
    }
  });

  it("returns one feature per threshold, labelled with its duration", () => {
    expect(isolines.features.map((f) => f.properties)).toEqual([
      { durationSeconds: 0, name: "Path of totality" },
      { durationSeconds: 30, name: "0m30s" },
      { durationSeconds: 180, name: "3m00s" },
      { durationSeconds: 360, name: "6m00s" },
    ]);
  });

  it("names a duration that isn't a whole minute", () => {
    const [isoline] = durationContours(grid, [90]).features;
    expect(isoline?.properties.name).toBe("1m30s");
  });

  it("returns no features without thresholds", () => {
    expect(durationContours(grid, []).features).toEqual([]);
  });

  it("leaves out durations no point reaches", () => {
    // The longest totality of this eclipse is ~6m23s
    const durations = durationContours(grid, [360, 390]).features.map(
      (f) => f.properties.durationSeconds,
    );
    expect(durations).toEqual([360]);
  });
});
