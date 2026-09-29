import { describe, expect, it } from "vitest";
import { geocentricObserver } from "../../src/eclipse/observer.js";

const EARTH_POLAR_TO_EQUATORIAL = 0.99664719;
const EARTH_EQUATORIAL_RADIUS_METERS = 6378140;

const distanceFromCentre = (at: { rhoSinPhi: number; rhoCosPhi: number }) =>
  Math.hypot(at.rhoSinPhi, at.rhoCosPhi);

describe("geocentricObserver", () => {
  it("puts a sea-level point on the equator one Earth radius out, in the equatorial plane", () => {
    const at = geocentricObserver({ latitude: 0, longitude: 0, altitudeMeters: 0 });
    expect(at.rhoCosPhi).toBeCloseTo(1, 12);
    expect(at.rhoSinPhi).toBeCloseTo(0, 12);
  });

  it("puts the North Pole one polar radius out, on the axis", () => {
    const at = geocentricObserver({ latitude: 90, longitude: 0, altitudeMeters: 0 });
    expect(at.rhoSinPhi).toBeCloseTo(EARTH_POLAR_TO_EQUATORIAL, 12);
    expect(at.rhoCosPhi).toBeCloseTo(0, 12);
  });

  it("mirrors the southern hemisphere", () => {
    const north = geocentricObserver({ latitude: 30, longitude: 0, altitudeMeters: 0 });
    const south = geocentricObserver({ latitude: -30, longitude: 0, altitudeMeters: 0 });
    expect(south.rhoSinPhi).toBeCloseTo(-north.rhoSinPhi, 12);
    expect(south.rhoCosPhi).toBeCloseTo(north.rhoCosPhi, 12);
  });

  // 1000 m: a mountain, moved outwards. -430 m: the Dead Sea shore, moved inwards.
  it.each([1000, -430])("moves the observer along the vertical by an altitude of %s m", (altitudeMeters) => {
    const seaLevel = geocentricObserver({ latitude: 45, longitude: 0, altitudeMeters: 0 });
    const observer = geocentricObserver({ latitude: 45, longitude: 0, altitudeMeters });
    expect(distanceFromCentre(observer) - distanceFromCentre(seaLevel)).toBeCloseTo(
      altitudeMeters / EARTH_EQUATORIAL_RADIUS_METERS,
      8,
    );
  });

  it("returns the longitude in radians, east positive", () => {
    expect(geocentricObserver({ latitude: 0, longitude: 30, altitudeMeters: 0 }).longitude).toBeCloseTo(
      Math.PI / 6,
      12,
    );
    expect(geocentricObserver({ latitude: 0, longitude: -45, altitudeMeters: 0 }).longitude).toBeCloseTo(
      -Math.PI / 4,
      12,
    );
  });

  it.each([91, -91, Number.NaN])("rejects latitude %s", (latitude) => {
    expect(() => geocentricObserver({ latitude, longitude: 0, altitudeMeters: 0 })).toThrow(RangeError);
  });

  it.each([181, -181, Number.NaN])("rejects longitude %s", (longitude) => {
    expect(() => geocentricObserver({ latitude: 0, longitude, altitudeMeters: 0 })).toThrow(RangeError);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects altitude %s",
    (altitudeMeters) => {
      expect(() => geocentricObserver({ latitude: 0, longitude: 0, altitudeMeters })).toThrow(RangeError);
    },
  );
});
