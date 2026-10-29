import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BesselianElements } from "../../../src/engine/eclipse/besselian.js";
import { eclipse2027Aug02 } from "../../../src/engine/eclipse/elements/2027-08-02.js";
import { eclipses } from "../../../src/engine/eclipse/elements/index.js";
import { localCircumstances } from "../../../src/engine/eclipse/localCircumstances.js";
import { parseNasaPath, type LatLon } from "../../../src/engine/eclipse/nasaPath.js";
import { unwrapPath } from "../../../src/engine/isolines/area.js";
import { acrossLimit, along } from "../../geo.js";

// Every known eclipse against its NASA path table, with the table's ΔT so only the geometry
// is compared. This catches a mistyped element or a table from another eclipse. The rows carry
// on past 180° where the path crosses it, so points between them don't wrap around the Earth.
const nasaPaths = Object.entries(eclipses).map(([date, elements]) => {
  const { deltaT, rows } = parseNasaPath(
    readFileSync(new URL(`../../../data/nasa-paths/${date}.txt`, import.meta.url), "utf8"),
  );
  return { date, elements: { ...elements, deltaT }, rows: unwrapPath(rows) };
});

const atWith =
  (elements: BesselianElements) =>
  ({ lat, lon }: LatLon) =>
    localCircumstances(elements, { latitude: lat, longitude: lon, altitudeMeters: 0 });

function fail(): never {
  throw new Error("2027-08-02 is missing from the known eclipses");
}

describe.each(nasaPaths)("localCircumstances vs NASA's $date path table", ({ elements, rows }) => {
  const at = atWith(elements);
  const timedRows = rows.filter((row) => row.time !== "Limits");
  const limits = rows.flatMap((row, i) =>
    (["north", "south"] as const).flatMap((side) => {
      const limit = row[side];
      if (!limit) return [];
      const edge = [rows[i - 1]?.[side] ?? limit, rows[i + 1]?.[side] ?? limit] as const;
      return [{ row, limit, past: (km: number) => acrossLimit(row.central, limit, km, ...edge) }];
    }),
  );

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
  // limit is checked by position instead: it must lie between 2 km inside and 2 km outside,
  // measured square to the path's edge. We measured ≤ 1.7 km.
  it("places every limit within 2 km of NASA's", () => {
    for (const { past } of limits) {
      expect(at(past(-2)).type).toBe("total");
      const outside = at(past(2));
      expect(outside.type).not.toBe("total");
      expect(outside.durationSeconds).toBe(0);
    }
  });

  it("gives a signed squared duration: duration² inside, more negative the further outside", () => {
    for (const { past } of limits) {
      const inside = at(past(-2));
      expect(inside.signedDurationSquared).toBe(inside.durationSeconds ** 2);
      const outside2km = at(past(2)).signedDurationSquared;
      const outside4km = at(past(4)).signedDurationSquared;
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
    for (const row of timedRows) expect(at(row.central).sunBelowHorizon).toBe(false);
  });

  // NASA ends the path where the Sun's altitude is 0° at mid-eclipse. The altitude changes by 1°
  // every ~111 km, so 2 km of ground, like the limits, is 2 / 111.2 degrees
  it("puts NASA's sunrise and sunset ends of the path on the horizon, within 2 km", () => {
    for (const row of rows.filter((r) => r.time === "Limits")) {
      for (const point of [row.central, row.north, row.south]) {
        if (point) expect(Math.abs(at(point).sunAltitude)).toBeLessThan(2 / 111.2);
      }
    }
  });
});

// Engine behaviour, on 2027
describe("localCircumstances", () => {
  const { elements, rows } = nasaPaths.find((path) => path.date === "2027-08-02") ?? fail();
  const at = atWith(elements);

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

  it("puts the Sun high over the middle of the path (10:00, NASA: 81°)", () => {
    const central = rows.find((r) => r.time === "10:00")?.central ?? { lat: 0, lon: 0 };
    expect(at(central).sunAltitude).toBeGreaterThan(80);
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
