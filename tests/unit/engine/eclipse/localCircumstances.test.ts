import { describe, expect, it } from "vitest";
import { eclipse2027Aug02 } from "../../../../src/engine/eclipse/elements/2027-08-02.js";
import { localCircumstances } from "../../../../src/engine/eclipse/localCircumstances.js";
import type { LatLon } from "../../../../src/engine/eclipse/nasaPath.js";

// The 2027 elements with the ΔT of NASA's path table, so the points below, taken from that table,
// fall where NASA puts them
const elements = { ...eclipse2027Aug02, deltaT: 71.7 };

// From NASA's 2027 path table: the central line at 10:00 UT and at the sunrise end of the path
const CENTRAL_AT_10 = { lat: 26 + 53.3 / 60, lon: 31 + 0.8 / 60 };
const CENTRAL_AT_SUNRISE = { lat: 27 + 57.7 / 60, lon: -(44 + 28.6 / 60) };

const at = ({ lat, lon }: LatLon) =>
  localCircumstances(elements, { latitude: lat, longitude: lon, altitudeMeters: 0 });

describe("localCircumstances", () => {
  it("rejects an invalid position", () => {
    expect(() =>
      localCircumstances(elements, { latitude: 91, longitude: 0, altitudeMeters: 0 }),
    ).toThrow(RangeError);
  });

  it("throws rather than returning a wrong time when the iteration cannot converge", () => {
    // A shadow that does not move relative to the Earth has no closest approach to find
    const frozen = { ...elements, x: [0], y: [0], d: [0], mu: [0] };
    expect(() =>
      localCircumstances(frozen, { latitude: 0, longitude: 0, altitudeMeters: 0 }),
    ).toThrow(/No convergence/);
  });

  it("puts the Sun high over the middle of the path (10:00, NASA: 81°)", () => {
    expect(at(CENTRAL_AT_10).sunAltitude).toBeGreaterThan(80);
  });

  it("reports no eclipse far from the shadow (Honolulu)", () => {
    const result = at({ lat: 21.3, lon: -157.9 });
    expect(result.type).toBe("none");
    expect(result.durationSeconds).toBe(0);
    expect(result.c2).toBeUndefined();
  });

  it("reports no eclipse on the night side, opposite the path (antipode of the 10:00 point)", () => {
    const result = at({ lat: -CENTRAL_AT_10.lat, lon: CENTRAL_AT_10.lon - 180 });
    expect(result.type).toBe("none");
    expect(result.durationSeconds).toBe(0);
  });

  it("reports a partial eclipse inside the penumbra, outside the path (Madrid)", () => {
    const result = at({ lat: 40.417, lon: -3.704 });
    expect(result.type).toBe("partial");
    expect(result.durationSeconds).toBe(0);
    expect(result.c2).toBeUndefined();
    expect(result.signedDurationSquared).toBeLessThan(0);
  });

  it("puts C2 before mid-eclipse and C3 after, c3 - c2 apart", () => {
    const result = at({ lat: 25.7, lon: 32.6 }); // Luxor
    expect(result.c2).toBeLessThan(result.mid);
    expect(result.c3).toBeGreaterThan(result.mid);
    expect(((result.c3 ?? 0) - (result.c2 ?? 0)) * 3600).toBeCloseTo(result.durationSeconds, 6);
  });

  // There, C2 and C3 are milliseconds apart and the contact iteration alone can fail to settle
  it("gives a near-zero totality within a millimetre of a limit", () => {
    const at = (latitude: number) =>
      localCircumstances(eclipse2027Aug02, { latitude, longitude: 31, altitudeMeters: 0 });
    // Northern limit at longitude 31° (Egypt), by bisection on the mid-eclipse geometry
    let inside = 26;
    let outside = 31;
    for (let i = 0; i < 60; i++) {
      const middle = (inside + outside) / 2;
      if (at(middle).signedDurationSquared > 0) inside = middle;
      else outside = middle;
    }
    for (let exponent = -12; exponent <= -8; exponent += 0.1) {
      const result = at(inside - 10 ** exponent); // 10⁻⁸° ≈ 1 mm
      expect(result.type).toBe("total");
      expect(result.durationSeconds).toBeLessThan(0.1);
    }
  });

  // At the sunrise end the Sun is on the horizon at mid-eclipse, ~0.3° below it at C2 and above
  // it at C3
  it("flags a Sun rising during totality at the sunrise end of the path", () => {
    const result = at(CENTRAL_AT_SUNRISE);
    expect(result.type).toBe("total");
    expect(result.sunBelowHorizon).toBe(true);
  });

  // A positive umbra radius: the Moon too far to cover the Sun, as in an annular eclipse
  it("reports an annular eclipse, with its duration, when the umbra radius is positive", () => {
    const annular = { ...elements, l2: elements.l2.map((c) => -c) };
    const result = localCircumstances(annular, {
      latitude: 25.7,
      longitude: 32.6,
      altitudeMeters: 0,
    });
    expect(result.type).toBe("annular");
    expect(result.durationSeconds).toBeGreaterThan(0);
  });
});
