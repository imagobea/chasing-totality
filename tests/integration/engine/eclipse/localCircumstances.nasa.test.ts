// Checks localCircumstances against NASA's path table for each eclipse in elements/. Each
// 2-minute row of the table gives the northern limit, the southern limit, the central line and the
// duration of totality on the central line. Two `Limits` rows give the sunrise and sunset ends of
// the path.
//
// Checked per eclipse:
// - duration on the central line: within 0.5 s
// - time of mid-eclipse on the central line: within 5 s
// - each limit: total 2 km inside, none 2 km outside
// - signed squared duration: duration² inside, decreasing outside
// - halfway between the central line and a limit: duration > 0
// - Sun along the central line: above the horizon
// - Sun at the sunrise and sunset ends: 0° within 2 km (0.018°)
//
// Passing all of them means the elements are typed in right and belong to that eclipse, and the
// engine places the path where NASA does.
//
// The tolerances are the same for every eclipse and never widen to let one pass. "Worst measured"
// is over the 61 central total eclipses of 2001–2100 that pass these checks, measured on
// 2026-10-29 (docs/plans/051-checks-for-any-total-eclipse-plan.md).

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BesselianElements } from "../../../../src/engine/eclipse/besselian.js";
import { eclipses } from "../../../../src/engine/eclipse/elements/index.js";
import { localCircumstances } from "../../../../src/engine/eclipse/localCircumstances.js";
import {
  parseNasaPath,
  type LatLon,
  type PathRow,
} from "../../../../src/engine/eclipse/nasaPath.js";
import { unwrapPath } from "../../../../src/engine/isolines/area.js";
import { acrossLimit, along } from "../../../helpers/geo.js";

// Each eclipse with NASA's ΔT, so only the geometry is compared. Rows carry on past 180° where
// the path crosses it, so points between them don't wrap around the Earth.
const nasaPaths = Object.entries(eclipses).map(([date, elements]) => {
  const { deltaT, rows } = parseNasaPath(
    readFileSync(new URL(`../../../../data/nasa-paths/${date}.txt`, import.meta.url), "utf8"),
  );
  return { date, elements: { ...elements, deltaT }, rows: unwrapPath(rows) };
});

const atWith =
  (elements: BesselianElements) =>
  ({ lat, lon }: LatLon) =>
    localCircumstances(elements, { latitude: lat, longitude: lon, altitudeMeters: 0 });

describe.each(nasaPaths)("localCircumstances vs NASA's $date path table", ({ elements, rows }) => {
  const at = atWith(elements);
  // The `Limits` rows are the sunrise and sunset ends of the path, on the horizon: whether a point
  // there sees totality is a coin toss, so they are checked by the Sun's altitude only
  const isEnd = (row: PathRow) => row.time === "Limits";
  const ends = rows.filter(isEnd);
  const timedRows = rows.filter((row) => !isEnd(row));
  const limits = rows.flatMap((row, i) =>
    (["north", "south"] as const).flatMap((side) => {
      const limit = row[side];
      if (!limit || isEnd(row)) return [];
      const edge = [rows[i - 1]?.[side] ?? limit, rows[i + 1]?.[side] ?? limit] as const;
      return [{ row, limit, past: (km: number) => acrossLimit(row.central, limit, km, ...edge) }];
    }),
  );

  // NASA rounds to 0.1 s and positions to 0.1′ (~185 m). Worst measured: 0.21 s.
  it.each(timedRows.map((row) => [row.time, row] as const))(
    "matches the central-line duration at %s within 0.5 s",
    (_, row) => {
      const result = at(row.central);
      expect(result.type).toBe("total");
      expect(Math.abs(result.durationSeconds - row.durationSeconds)).toBeLessThan(0.5);
    },
  );

  // Worst measured: 1.35 s
  it("puts mid-eclipse on the central line at the table's time, within 5 s", () => {
    for (const row of timedRows) {
      const [hours = 0, minutes = 0] = row.time.split(":").map(Number);
      // Across midnight UT, 23:59 and 00:01 are 2 minutes apart, not 24 hours
      const hoursApart = at(row.central).mid - (hours + minutes / 60);
      expect(Math.abs(hoursApart - 24 * Math.round(hoursApart / 24)) * 3600).toBeLessThan(5);
    }
  });

  // The duration rises steeply just inside a limit (0 s at the edge, ~20 s at 200 m), so the
  // limit is checked by position instead: it must lie between 2 km inside and 2 km outside,
  // measured square to the path's edge. Worst measured: 1.61 km (2044-08-23, Sun 2° up); 0.8 km
  // for the eclipses here (2028-07-22; 2026-08-12 is 0.57 km).
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

  // Not necessarily shorter than on the central line: with the Sun a few degrees up, the longest
  // totality lies off to one side (2–5 s longer halfway, e.g. 2033-03-30).
  it("gives some totality halfway between the central line and a limit", () => {
    for (const { row, limit } of limits) {
      expect(at(along(row.central, limit, 0.5)).durationSeconds).toBeGreaterThan(0);
    }
  });

  it("keeps the Sun above the horizon along the central line, between the ends", () => {
    for (const row of timedRows) expect(at(row.central).sunBelowHorizon).toBe(false);
  });

  // NASA ends the path where the Sun's altitude is 0° at mid-eclipse. The altitude changes by 1°
  // every ~111 km, so 2 km of ground, like the limits, is 2 / 111.2 degrees. Worst measured:
  // 0.015°.
  it("puts NASA's sunrise and sunset ends of the path on the horizon, within 2 km", () => {
    for (const row of ends) {
      for (const point of [row.central, row.north, row.south]) {
        if (point) expect(Math.abs(at(point).sunAltitude)).toBeLessThan(2 / 111.2);
      }
    }
  });
});
