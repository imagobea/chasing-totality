import type { BesselianElements } from "../besselian.js";

// Total solar eclipse of 2028 Jul 22.
// Source: Espenak & Meeus, "Five Millennium Canon of Solar Eclipses" (NASA, public domain),
// as tabulated in JSEX's SE2001.js. ΔT = 76.6 s from the Canon; NASA's path page uses 72.1 s.
export const eclipse2028Jul22: BesselianElements = {
  t0: 3,
  deltaT: 76.6,
  x: [-0.154409, 0.5449892, -2.14e-5, -8.69e-6],
  y: [-0.586424, -0.1746085, -1.021e-4, 2.96e-6],
  d: [20.1823101, -0.007974, -5.0e-6],
  mu: [223.3786774, 15.0010176, 0],
  l1: [0.535237, -0.0000859, -1.23e-5],
  l2: [-0.010846, -0.0000854, -1.22e-5],
  tanF1: 0.0046016,
  tanF2: 0.0045786,
};
