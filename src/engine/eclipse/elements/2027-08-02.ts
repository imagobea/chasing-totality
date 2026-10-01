import type { BesselianElements } from "../besselian.js";

// Total solar eclipse of 2027 Aug 02.
// Source: Espenak & Meeus, "Five Millennium Canon of Solar Eclipses" (NASA, public domain),
// as tabulated in JSEX's SE2001.js. ΔT = 76.0 s from the Canon; NASA's path page uses 71.7 s,
// which shifts the path ~1.7 km east–west.
export const eclipse2027Aug02: BesselianElements = {
  t0: 10,
  deltaT: 76.0,
  x: [-0.019772, 0.5447123, -4.46e-5, -9.22e-6],
  y: [0.160061, -0.2111582, -1.217e-4, 3.76e-6],
  d: [17.7624702, -0.010181, -4.0e-6],
  mu: [328.4225464, 15.0020962, 0],
  l1: [0.530596, 0.0000138, -1.28e-5],
  l2: [-0.015464, 0.0000137, -1.28e-5],
  tanF1: 0.0046064,
  tanF2: 0.0045834,
};
