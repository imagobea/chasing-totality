// Isolines fixtures shaped like the API's, small enough to check by hand

import type { Isolines } from "../../src/api/eclipses.js";

// A square centred on 0, 0 reaching `half` degrees each way
export function square(half: number): [number, number][][][] {
  return [
    [
      [
        [-half, -half],
        [half, -half],
        [half, half],
        [-half, half],
        [-half, -half],
      ],
    ],
  ];
}

// Nested squares, as the API serves isolines: the longer the duration, the smaller the square
export function isolines(...durationsSeconds: number[]): Isolines {
  return {
    type: "FeatureCollection",
    bbox: [-10, -10, 10, 10],
    features: durationsSeconds.map((durationSeconds, i) => ({
      type: "Feature",
      properties: { durationSeconds, name: `${durationSeconds}s` },
      geometry: { type: "MultiPolygon", coordinates: square(durationsSeconds.length - i) },
    })),
  };
}
