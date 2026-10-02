// Where the Moon's shadow is, and how fast it moves, at any time: the Besselian elements
// evaluated on the fundamental plane. Explained in ../README.md

// The arrays are polynomial coefficients [c0, c1, c2, …]: value = c0 + c1·t + c2·t² + …, with t
// the hours since t0
export type BesselianElements = {
  t0: number; // reference time on the eclipse date (TDT), hours
  deltaT: number; // TDT − UT, seconds
  x: number[]; // shadow axis position, eastward, Earth radii
  y: number[]; // shadow axis position, northward, Earth radii
  d: number[]; // declination of the shadow axis, degrees
  mu: number[]; // Greenwich hour angle of the shadow axis, degrees
  l1: number[]; // penumbra radius, Earth radii
  l2: number[]; // umbra radius (negative: total, positive: annular), Earth radii
  tanF1: number; // penumbra cone widening, dimensionless
  tanF2: number; // umbra cone widening, dimensionless
};

// The elements evaluated at one instant t, plus hourly rates. d and mu become radians,
// ready for trigonometry
export type ElementsAt = {
  x: number; // Earth radii
  y: number; // Earth radii
  d: number; // radians
  mu: number; // radians
  l1: number; // Earth radii
  l2: number; // Earth radii
  xRate: number; // Earth radii per hour
  yRate: number; // Earth radii per hour
  dRate: number; // radians per hour
  muRate: number; // radians per hour
};

const RAD = Math.PI / 180;

export function evaluate(elements: BesselianElements, t: number): ElementsAt {
  return {
    x: polynomial(elements.x, t),
    y: polynomial(elements.y, t),
    d: polynomial(elements.d, t) * RAD,
    mu: polynomial(elements.mu, t) * RAD,
    l1: polynomial(elements.l1, t),
    l2: polynomial(elements.l2, t),
    xRate: derivative(elements.x, t),
    yRate: derivative(elements.y, t),
    dRate: derivative(elements.d, t) * RAD,
    muRate: derivative(elements.mu, t) * RAD,
  };
}

// c0 + c1·t + c2·t² + …, in Horner form
function polynomial(coefficients: number[], t: number): number {
  return coefficients.reduceRight((sum, c) => sum * t + c, 0);
}

// c1 + 2·c2·t + 3·c3·t² + …
function derivative(coefficients: number[], t: number): number {
  return polynomial(
    coefficients.slice(1).map((c, i) => c * (i + 1)),
    t,
  );
}
