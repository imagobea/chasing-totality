// Checks localCircumstances against JSEX, NASA's Javascript Solar Eclipse Explorer, for the
// 2027-08-02 eclipse. JSEX is an independent implementation of the same Besselian method. JSEX and
// eclipse2027Aug02 share the same elements and ΔT, so any difference between JSEX and
// localCircumstances comes from our maths. JSEX results are precomputed in
// tests/fixtures/jsex-2027.json by scripts/generate-jsex-fixtures.ts.
//
// 54 points over S Spain and N Africa:
// - 14 cities: 10 inside the path, 4 just outside the path
// - across the path at 08:48, 09:04, 09:28, 10:00 and 10:24 UT: the central line, halfway to each
//   limit, 1 km inside and 1 km outside each limit, and halfway to the northern limit at 2000 m
//
// Checked per point:
// - type of eclipse: equal
// - duration of totality: within 0.01 s
// - time of mid-eclipse: within 0.01 s
//
// NASA's path table gives the duration of totality on the central line only. JSEX gives the
// duration across the whole width of the path, where the isolines are drawn, and close to the
// limits, where the duration changes fastest.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { eclipse2027Aug02 } from "../../../../src/engine/eclipse/elements/2027-08-02.js";
import {
  localCircumstances,
  type LocalCircumstances,
} from "../../../../src/engine/eclipse/localCircumstances.js";

// One fixture point: the position, and the type, duration and mid-eclipse JSEX computed there
type JsexPoint = Pick<LocalCircumstances, "type" | "mid" | "durationSeconds"> & {
  name: string;
  lat: number;
  lon: number;
  altitudeMeters: number;
};
const { points } = JSON.parse(
  readFileSync(new URL("../../../fixtures/jsex-2027.json", import.meta.url), "utf8"),
) as { points: JsexPoint[] };

describe("localCircumstances vs JSEX", () => {
  // Measured: ≤ 1 ms on duration and mid-eclipse, i.e. only the iterations' tolerance
  it.each(points.map((point) => [point.name, point] as const))(
    "agrees at %s within 0.01 s",
    (_, point) => {
      const ours = localCircumstances(eclipse2027Aug02, {
        latitude: point.lat,
        longitude: point.lon,
        altitudeMeters: point.altitudeMeters,
      });
      expect(ours.type).toBe(point.type);
      expect(Math.abs(ours.durationSeconds - point.durationSeconds)).toBeLessThan(0.01);
      expect(Math.abs(ours.mid - point.mid) * 3600).toBeLessThan(0.01);
    },
  );
});
