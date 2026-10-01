import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { eclipse2027Aug02 } from "../../../src/engine/eclipse/elements/2027-08-02.js";
import { localCircumstances } from "../../../src/engine/eclipse/localCircumstances.js";
import { along, pastLimit } from "../../geo.js";
import { parseNasaPath, type LatLon } from "../../nasaPath.js";

const rows = parseNasaPath(
  readFileSync(new URL("../../fixtures/SE2027Aug02Tpath.txt", import.meta.url), "utf8"),
);
// NASA's path table was computed with ΔT = 71.7 s; use the same, so only the geometry is compared.
const elements = { ...eclipse2027Aug02, deltaT: 71.7 };

const at = ({ lat, lon }: LatLon) =>
  localCircumstances(elements, { latitude: lat, longitude: lon, altitudeMeters: 0 });

const timedRows = rows.filter((row) => row.time !== "Limits");
const limits = rows.flatMap((row) =>
  [row.north, row.south].flatMap((limit) => (limit ? [{ row, limit }] : [])),
);

describe("localCircumstances vs NASA's 2027 path table", () => {
  // NASA rounds to 0.1 s and positions to 0.1′ (~185 m); we measured ≤ 0.25 s.
  it.each(rows.map((row) => [row.time, row] as const))(
    "matches the central-line duration at %s within 0.5 s",
    (_, row) => {
      const result = at(row.central);
      expect(result.type).toBe("total");
      expect(Math.abs(result.durationSeconds - row.durationSeconds)).toBeLessThan(0.5);
    },
  );

  it("puts mid-eclipse on the central line at the table's time, within 5 s", () => {
    for (const row of timedRows) {
      const [hours = 0, minutes = 0] = row.time.split(":").map(Number);
      expect(Math.abs(at(row.central).mid - (hours + minutes / 60)) * 3600).toBeLessThan(5);
    }
  });

  // The duration rises steeply just inside a limit (0 s at the edge, ~20 s at 200 m), so the
  // limit is checked by position instead: it must lie between 2 km inside and 2 km outside.
  it("places every limit within 2 km of NASA's", () => {
    for (const { row, limit } of limits) {
      expect(at(pastLimit(row.central, limit, -2)).type).toBe("total");
      const outside = at(pastLimit(row.central, limit, 2));
      expect(outside.type).not.toBe("total");
      expect(outside.durationSeconds).toBe(0);
    }
  });

  it("gives a signed squared duration: duration² inside, more negative the further outside", () => {
    for (const { row, limit } of limits) {
      const inside = at(pastLimit(row.central, limit, -2));
      expect(inside.signedDurationSquared).toBe(inside.durationSeconds ** 2);
      const outside2km = at(pastLimit(row.central, limit, 2)).signedDurationSquared;
      const outside4km = at(pastLimit(row.central, limit, 4)).signedDurationSquared;
      expect(outside2km).toBeLessThan(0);
      expect(outside4km).toBeLessThan(outside2km);
    }
  });

  it("gives a shorter, non-zero totality halfway between the central line and a limit", () => {
    for (const { row, limit } of limits) {
      const halfway = at(along(row.central, limit, 0.5)).durationSeconds;
      expect(halfway).toBeGreaterThan(0);
      expect(halfway).toBeLessThan(at(row.central).durationSeconds);
    }
  });

  it("flags the sunrise and sunset ends of the path, where the Sun is on the horizon", () => {
    for (const row of rows.filter((r) => r.time === "Limits")) {
      expect(at(row.central).sunBelowHorizon).toBe(true);
    }
    const midPath = at(rows.find((r) => r.time === "10:00")?.central ?? { lat: 0, lon: 0 });
    expect(midPath.sunBelowHorizon).toBe(false);
    expect(midPath.sunAltitude).toBeGreaterThan(80);
  });
});

describe("localCircumstances", () => {
  it("reports no eclipse far from the shadow (Honolulu)", () => {
    const result = at({ lat: 21.3, lon: -157.9 });
    expect(result.type).toBe("none");
    expect(result.durationSeconds).toBe(0);
    expect(result.c2).toBeUndefined();
  });

  it("reports no eclipse on the night side, opposite the path (antipode of the 10:00 point)", () => {
    const central = rows.find((r) => r.time === "10:00")?.central ?? { lat: 0, lon: 0 };
    const result = at({ lat: -central.lat, lon: central.lon - 180 });
    expect(result.type).toBe("none");
    expect(result.durationSeconds).toBe(0);
  });

  it("puts C2 before mid-eclipse and C3 after, c3 − c2 apart", () => {
    const result = at({ lat: 25.7, lon: 32.6 }); // Luxor
    expect(result.c2).toBeLessThan(result.mid);
    expect(result.c3).toBeGreaterThan(result.mid);
    expect(((result.c3 ?? 0) - (result.c2 ?? 0)) * 3600).toBeCloseTo(result.durationSeconds, 6);
  });

  // There, C2 and C3 are milliseconds apart and the contact iteration alone can fail to settle.
  it("gives a near-zero totality within a millimetre of a limit", () => {
    const at = (latitude: number) =>
      localCircumstances(eclipse2027Aug02, { latitude, longitude: 31, altitudeMeters: 0 });
    // Northern limit at longitude 31° (Egypt), by bisection on the mid-eclipse geometry.
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

  it("rejects an invalid position", () => {
    expect(() =>
      localCircumstances(elements, { latitude: 91, longitude: 0, altitudeMeters: 0 }),
    ).toThrow(RangeError);
  });

  it("throws rather than returning a wrong time when the iteration cannot converge", () => {
    // A shadow that does not move relative to the Earth has no closest approach to find.
    const frozen = { ...elements, x: [0], y: [0], d: [0], mu: [0] };
    expect(() =>
      localCircumstances(frozen, { latitude: 0, longitude: 0, altitudeMeters: 0 }),
    ).toThrow(/No convergence/);
  });
});
