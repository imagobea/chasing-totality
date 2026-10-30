import type { BesselianElements } from "../besselian.js";

// Total solar eclipse of 2026 Aug 12.
// Source: Espenak & Meeus, "Five Millennium Canon of Solar Eclipses" (NASA, public domain),
// as tabulated in JSEX's SE2001.js. ΔT = 75.4 s from the Canon; NASA's path page uses 71.4 s.
export const eclipse2026Aug12: BesselianElements = {
  t0: 18,
  deltaT: 75.4,
  x: [0.475514, 0.5189249, -7.73e-5, -8.04e-6],
  y: [0.771183, -0.230168, -1.246e-4, 3.77e-6],
  d: [14.79667, -0.012065, -3.0e-6],
  mu: [88.7477875, 15.0030899, 0],
  l1: [0.537955, 0.0000939, -1.21e-5],
  l2: [-0.008142, 0.0000935, -1.21e-5],
  tanF1: 0.0046141,
  tanF2: 0.0045911,
};
