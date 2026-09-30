// How long totality lasts at one lat/lon: the value the isolines are drawn from.
//
// besselian.ts gives the shadow on the fundamental plane and observer.ts gives the observer's
// geocentric coordinates. Here the observer is projected onto the same plane as (ξ, η), with ζ
// its height towards the Sun, so both are in one frame. From that frame:
//   - (u, v) = shadow axis − observer is where the shadow's centre is, seen from the observer;
//   - mid-eclipse is when that distance is smallest;
//   - totality lasts while the distance is below the umbra's radius at the observer's height.
// The contacts are found by Newton iteration, starting from the rates of (u, v).
// References: Explanatory Supplement to the Astronomical Almanac (3rd ed., 2013), ch. 11;
// Meeus, "Elements of Solar Eclipses 1951–2200".
//
// Limitations:
//   - The Moon is a smooth sphere. Its real limb profile moves the limits by ~1–2 km and changes
//     durations by ~1–2 s.
//   - ΔT (Earth-rotation correction) is a fixed value from the elements; it shifts the whole
//     path east–west (4.3 s of ΔT is ~1.7 km).
//   - At the sunrise/sunset ends of the path, part of totality can happen with the Sun below the
//     horizon; that is flagged by sunBelowHorizon, and durationSeconds is still the full
//     geometric duration. Visibility is checked only at mid, C2 and C3, not at the partial
//     phase's contacts. The Sun's altitude is geocentric and ignores refraction (~0.5°).

import { evaluate, type BesselianElements } from "./besselian.js";
import { geocentricObserver, type GeocentricObserver, type GeographicPosition } from "./observer.js";

export type LocalCircumstances = {
  type: "total" | "annular" | "partial" | "none";
  mid: number; // time of greatest eclipse, hours UT
  c2?: number; // start of totality (or annularity), hours UT
  c3?: number; // end of totality (or annularity), hours UT
  durationSeconds: number; // c3 − c2, seconds; 0 unless total or annular
  sunAltitude: number; // at mid-eclipse, degrees
  sunBelowHorizon: boolean; // true if the Sun is below the horizon at mid, c2 or c3
  // durationSeconds² inside the path; outside, negative and growing with the distance from its
  // edge, seconds². Unlike the duration, it changes smoothly across the edge, so isolines drawn
  // from it by interpolation put the edge in the right place.
  signedDurationSquared: number;
};

const RAD = Math.PI / 180;
// Besselian μ is measured against a meridian that turns with ephemeris time; an observer's
// hour angle needs universal time. The Earth turns 1.002738 × 15°/h = 0.00417807° per
// second of ΔT.
const EARTH_ROTATION_DEGREES_PER_SECOND = 0.00417807;
const TOLERANCE_HOURS = 1e-6; // ~4 ms
const MAX_ITERATIONS = 50;

export function localCircumstances(
  elements: BesselianElements,
  position: GeographicPosition,
): LocalCircumstances {
  const observer = geocentricObserver(position);
  const at = (t: number) => shadowSeenFrom(elements, observer, t);

  // Mid-eclipse: the shadow's centre is closest when its offset (u, v) is perpendicular to its
  // motion (a, b), i.e. u·a + v·b = 0.
  const mid = iterate(0, (t) => {
    const s = at(t);
    return -(s.u * s.a + s.v * s.b) / s.n2;
  });
  const atMid = at(mid);
  const distance = Math.hypot(atMid.u, atMid.v);
  const umbraRadius = Math.abs(atMid.L2);
  // A track passing `distance` from the umbra's centre at speed n spends 2√(R² − distance²)/n
  // hours inside it; squared, that is negative when the track misses the umbra.
  const passSquared = ((4 * (umbraRadius ** 2 - distance ** 2)) / atMid.n2) * 3600 ** 2;
  const toUT = (t: number) => elements.t0 + t - elements.deltaT / 3600;
  // ζ is the observer's height towards the Sun, so ζ / (distance from the Earth's centre) is
  // the sine of the Sun's altitude.
  const observerDistance = Math.hypot(observer.rhoSinPhi, observer.rhoCosPhi);
  const sunAltitude = (s: ShadowSeenFrom) => Math.asin(s.zeta / observerDistance) / RAD;

  const result = {
    mid: toUT(mid),
    durationSeconds: 0,
    sunAltitude: sunAltitude(atMid),
    sunBelowHorizon: sunAltitude(atMid) < 0,
    signedDurationSquared: Math.min(0, passSquared),
  };
  // The projection goes straight through the Earth, so a point on the night side can fall
  // inside the shadow circle too. It sees nothing: the Sun is below its horizon.
  const notVisible = { ...result, type: "none" } as const;
  if (distance >= umbraRadius) {
    if (result.sunBelowHorizon) return notVisible;
    return { ...result, type: distance < atMid.L1 ? "partial" : "none" };
  }

  // Contacts: when the distance equals the umbra radius. Solving |(u, v) + (a, b)·Δt| = |L2′|
  // for Δt, with the rates held constant, gives the step below; iterating refines it. The
  // earlier root (−) is C2, the later (+) is C3.
  const contact = (sign: -1 | 1) =>
    iterate(mid, (t) => {
      const s = at(t);
      const n = Math.sqrt(s.n2);
      const offAxis = (s.a * s.v - s.u * s.b) / (n * Math.abs(s.L2));
      const halfChord = (Math.abs(s.L2) / n) * Math.sqrt(Math.max(0, 1 - offAxis ** 2));
      return -(s.u * s.a + s.v * s.b) / s.n2 + sign * halfChord;
    });
  const c2 = contact(-1);
  const c3 = contact(1);
  const belowHorizon = [atMid, at(c2), at(c3)].map((s) => sunAltitude(s) < 0);
  if (belowHorizon.every(Boolean)) return notVisible;

  return {
    ...result,
    type: atMid.L2 < 0 ? "total" : "annular",
    c2: toUT(c2),
    c3: toUT(c3),
    durationSeconds: (c3 - c2) * 3600,
    signedDurationSquared: ((c3 - c2) * 3600) ** 2,
    sunBelowHorizon: belowHorizon.some(Boolean),
  };
}

type ShadowSeenFrom = {
  u: number; // shadow axis − observer, eastward, Earth radii
  v: number; // shadow axis − observer, northward, Earth radii
  a: number; // rate of u, Earth radii per hour
  b: number; // rate of v, Earth radii per hour
  n2: number; // a² + b²
  zeta: number; // observer's height above the fundamental plane, towards the Sun, Earth radii
  L1: number; // penumbra radius at the observer's height, Earth radii
  L2: number; // umbra radius at the observer's height (negative: total), Earth radii
};

function shadowSeenFrom(
  elements: BesselianElements,
  observer: GeocentricObserver,
  t: number,
): ShadowSeenFrom {
  const { x, y, d, mu, l1, l2, xRate, yRate, dRate, muRate } = evaluate(elements, t);
  const { rhoSinPhi, rhoCosPhi, longitude } = observer;

  // Observer's hour angle from the shadow axis.
  const H = mu + longitude - EARTH_ROTATION_DEGREES_PER_SECOND * elements.deltaT * RAD;

  // Rotate the observer's geocentric position into the fundamental plane.
  const xi = rhoCosPhi * Math.sin(H);
  const eta = rhoSinPhi * Math.cos(d) - rhoCosPhi * Math.cos(H) * Math.sin(d);
  const zeta = rhoSinPhi * Math.sin(d) + rhoCosPhi * Math.cos(H) * Math.cos(d);
  // The observer moves on the plane as the Earth turns (μ′) and the plane tilts (d′).
  const xiRate = muRate * rhoCosPhi * Math.cos(H);
  const etaRate = muRate * xi * Math.sin(d) - zeta * dRate;

  const a = xRate - xiRate;
  const b = yRate - etaRate;
  return {
    u: x - xi,
    v: y - eta,
    a,
    b,
    n2: a * a + b * b,
    zeta,
    // The shadow cones widen (or narrow) with height above the plane.
    L1: l1 - zeta * elements.tanF1,
    L2: l2 - zeta * elements.tanF2,
  };
}

// Newton-style iteration: apply step(t) until it is below the tolerance.
function iterate(start: number, step: (t: number) => number): number {
  let t = start;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const delta = step(t);
    t += delta;
    if (Math.abs(delta) < TOLERANCE_HOURS) return t;
  }
  throw new Error(`No convergence after ${MAX_ITERATIONS} iterations`);
}
