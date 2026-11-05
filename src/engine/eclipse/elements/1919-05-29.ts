import type { BesselianElements } from "../besselian.js";

// Total solar eclipse of 1919 May 29.
// Source: Espenak & Meeus, "Five Millennium Canon of Solar Eclipses" (NASA, public domain),
// as tabulated in JSEX's SE1901.js. ΔT = 21.0 s from the Canon; NASA's path page uses 21.0 s too.
export const eclipse1919May29: BesselianElements = {
  t0: 13,
  deltaT: 21.0,
  x: [-0.06583, 0.57964, 7.1e-6, -9.74e-6],
  y: [-0.300704, 0.0398473, -1.357e-4, -5.7e-7],
  d: [21.5041409, 0.006556, -5.0e-6],
  mu: [15.72997, 15.0001993, 0],
  l1: [0.53214, 0.0000488, -1.27e-5],
  l2: [-0.013928, 0.0000485, -1.26e-5],
  tanF1: 0.0046119,
  tanF2: 0.0045889,
};
