import type { BesselianElements } from "../besselian.js";
import { eclipse2026Aug12 } from "./2026-08-12.js";
import { eclipse2027Aug02 } from "./2027-08-02.js";
import { eclipse2028Jul22 } from "./2028-07-22.js";

// Every eclipse we know, by date (YYYY-MM-DD): the one place to add one. Each also needs NASA's
// path table in data/nasa-paths/<date>.txt
export const eclipses: Record<string, BesselianElements> = {
  "2026-08-12": eclipse2026Aug12,
  "2027-08-02": eclipse2027Aug02,
  "2028-07-22": eclipse2028Jul22,
};
