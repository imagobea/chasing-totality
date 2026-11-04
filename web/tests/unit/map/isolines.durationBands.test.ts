import { describe, expect, it } from "vitest";
import { durationBands } from "../../../src/map/isolines.js";
import { isolines, square } from "../../helpers/isolines.js";

describe("durationBands", () => {
  it("makes one band per whole minute, skipping the half minutes", () => {
    const bands = durationBands(isolines(0, 30, 60, 90, 120));
    expect(bands.map((band) => band.properties)).toEqual([
      { durationSeconds: 0 },
      { durationSeconds: 60 },
      { durationSeconds: 120 },
    ]);
  });

  it("cuts the next minute's isoline out of each band, so bands don't overlap", () => {
    const [first] = durationBands(isolines(0, 60));
    // Outer ring of the 0 s square, with the 60 s square as its hole
    expect(first?.geometry.coordinates).toHaveLength(1);
    expect(first?.geometry.coordinates[0]).toHaveLength(2);
  });

  it("keeps the longest minute's isoline whole", () => {
    const bands = durationBands(isolines(0, 60));
    expect(bands.at(-1)?.geometry.coordinates).toEqual(square(1));
  });

  it("makes one band for 6 min and over", () => {
    const bands = durationBands(isolines(300, 360, 420, 480));
    expect(bands.map((band) => band.properties.durationSeconds)).toEqual([300, 360]);
    expect(bands.at(-1)?.geometry.coordinates).toEqual(square(3));
  });

  it("starts the first band at the limit when the limit isn't a whole minute", () => {
    const bands = durationBands(isolines(30, 60, 90));
    expect(bands.map((band) => band.properties.durationSeconds)).toEqual([30, 60]);
  });

  it("makes no bands without isolines", () => {
    expect(durationBands(isolines())).toEqual([]);
  });
});
