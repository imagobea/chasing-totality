import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { eclipse2027Aug02 } from "../../../src/engine/eclipse/elements/2027-08-02.js";
import { localCircumstances, type LocalCircumstances } from "../../../src/engine/eclipse/localCircumstances.js";

// Points computed by NASA's JSEX (see scripts/generate-jsex-fixtures.ts). Unlike NASA's path
// table, they cover the whole width of the path, where the isolines are drawn. JSEX uses the
// same elements and ΔT as eclipse2027Aug02.
type JsexPoint = Pick<LocalCircumstances, "type" | "mid" | "durationSeconds"> & {
  name: string;
  lat: number;
  lon: number;
  altitudeMeters: number;
};
const { points } = JSON.parse(
  readFileSync(new URL("../../fixtures/jsex-2027.json", import.meta.url), "utf8"),
) as { points: JsexPoint[] };

describe("localCircumstances vs JSEX", () => {
  // Measured: ≤ 1 ms on duration and mid-eclipse, i.e. only the iterations' tolerance.
  it.each(points.map((point) => [point.name, point] as const))("agrees at %s within 0.01 s", (_, point) => {
    const ours = localCircumstances(eclipse2027Aug02, {
      latitude: point.lat,
      longitude: point.lon,
      altitudeMeters: point.altitudeMeters,
    });
    expect(ours.type).toBe(point.type);
    expect(Math.abs(ours.durationSeconds - point.durationSeconds)).toBeLessThan(0.01);
    expect(Math.abs(ours.mid - point.mid) * 3600).toBeLessThan(0.01);
  });
});
