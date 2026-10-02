// Mid-eclipse, C2, C3 and the duration of totality at one place. Explained in ../README.md;
// limitations in docs/plans/004-local-totality-duration-plan.md

import { evaluate, type BesselianElements } from "./besselian.js";
import { RAD } from "./constants.js";
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

// Besselian μ is measured against a meridian that turns with ephemeris time; an observer's
// hour angle needs universal time. The Earth turns 1.002738 × 15°/h = 0.00417807° per
// second of ΔT.
const EARTH_ROTATION_DEGREES_PER_SECOND = 0.00417807;
const TOLERANCE_HOURS = 1e-6; // ~4 ms
const MAX_ITERATIONS = 50;

function shadowSeenFrom(
  elements: BesselianElements,
  observer: GeocentricObserver,
  t: number,
): ShadowSeenFrom {
  const { x, y, d, mu, l1, l2, xRate, yRate, dRate, muRate } = evaluate(elements, t);
  const { rhoSinPhi, rhoCosPhi, longitude } = observer;

  // Observer's hour angle from the shadow axis
  const H = mu + longitude - EARTH_ROTATION_DEGREES_PER_SECOND * elements.deltaT * RAD;

  // Rotate the observer's geocentric position into the fundamental plane
  const xi = rhoCosPhi * Math.sin(H);
  const eta = rhoSinPhi * Math.cos(d) - rhoCosPhi * Math.cos(H) * Math.sin(d);
  const zeta = rhoSinPhi * Math.sin(d) + rhoCosPhi * Math.cos(H) * Math.cos(d);
  // The observer moves on the plane as the Earth turns (μ′) and the plane tilts (d′)
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
    // The shadow cones widen (or narrow) with height above the plane
    L1: l1 - zeta * elements.tanF1,
    L2: l2 - zeta * elements.tanF2,
  };
}

// Newton-style iteration: apply step(t) until it is below the tolerance; undefined if it never is
function iterate(start: number, step: (t: number) => number): number | undefined {
  let t = start;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const delta = step(t);
    t += delta;
    if (Math.abs(delta) < TOLERANCE_HOURS) return t;
  }
  return undefined;
}

// Bisection: narrows [inside, outside] around the time the observer crosses the umbra's edge
function bisect(inside: number, outside: number, isInside: (t: number) => boolean): number {
  while (Math.abs(outside - inside) > TOLERANCE_HOURS) {
    const middle = (inside + outside) / 2;
    if (isInside(middle)) inside = middle;
    else outside = middle;
  }
  return (inside + outside) / 2;
}

function noConvergence(): never {
  throw new Error(`No convergence after ${MAX_ITERATIONS} iterations`);
}

export function localCircumstances(
  elements: BesselianElements,
  position: GeographicPosition,
): LocalCircumstances {
  const observer = geocentricObserver(position);
  const at = (t: number) => shadowSeenFrom(elements, observer, t);

  // Mid-eclipse: the shadow's centre is closest when its offset (u, v) is perpendicular to its
  // motion (a, b), i.e. u·a + v·b = 0
  const mid =
    iterate(0, (t) => {
      const s = at(t);
      return -(s.u * s.a + s.v * s.b) / s.n2;
    }) ?? noConvergence();
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

  // Just inside a limit, C2 and C3 are milliseconds apart and the iteration below can cycle
  // between a few values without settling. Bisection always settles: the observer is inside the
  // umbra at mid-eclipse, so step away from mid until they are outside, then halve the gap.
  const insideUmbra = (t: number) => {
    const s = at(t);
    return Math.hypot(s.u, s.v) < Math.abs(s.L2);
  };
  const bisectContact = (sign: -1 | 1) => {
    for (let hours = TOLERANCE_HOURS, i = 0; i < MAX_ITERATIONS; hours *= 2, i++) {
      if (!insideUmbra(mid + sign * hours)) return bisect(mid, mid + sign * hours, insideUmbra);
    }
    return noConvergence();
  };
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
    }) ?? bisectContact(sign);
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
