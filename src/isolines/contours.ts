// Traces isolines through a duration grid and returns them as GeoJSON, ready for a map.
//
// Each feature is the area where totality lasts at least `durationSeconds`; its outline is the
// isoline. A threshold of 0 gives the path of totality itself. d3-contour works in grid
// coordinates (marching squares with linear interpolation between points); they are converted
// back to longitude/latitude here.

import { contours } from "d3-contour";
import type { DurationGrid } from "./grid.js";

export type Position = [longitude: number, latitude: number];

export type IsolineFeature = {
  type: "Feature";
  properties: { durationSeconds: number; name: string };
  geometry: { type: "MultiPolygon"; coordinates: Position[][][] };
};

export type IsolineCollection = { type: "FeatureCollection"; features: IsolineFeature[] };

export function durationContours(grid: DurationGrid, thresholdsSeconds: number[]): IsolineCollection {
  // d3-contour keeps values ≥ threshold, so a 0 threshold would cover the whole grid; the path
  // of totality is where the duration is above 0.
  const levels = thresholdsSeconds.map((seconds) => (seconds === 0 ? Number.MIN_VALUE : seconds));
  const polygons = contours().size([grid.width, grid.height]).thresholds(levels)(Array.from(grid.values));

  // d3-contour puts value i at the centre of pixel i, i.e. at grid coordinate i + 0.5.
  const toLonLat = ([x = 0, y = 0]: number[]): Position => [
    grid.west + (x - 0.5) * grid.step,
    grid.south + (y - 0.5) * grid.step,
  ];

  return {
    type: "FeatureCollection",
    features: polygons.map((polygon, i): IsolineFeature => {
      const durationSeconds = thresholdsSeconds[i] ?? polygon.value;
      return {
        type: "Feature",
        properties: { durationSeconds, name: isolineName(durationSeconds) },
        geometry: {
          type: "MultiPolygon",
          coordinates: polygon.coordinates.map((rings) => rings.map((ring) => ring.map(toLonLat))),
        },
      };
    })
      // A duration no point reaches has no area to draw.
      .filter((feature) => feature.geometry.coordinates.length > 0),
  };
}

// "4m00s", as in NASA's path table; the 0 s isoline is the path of totality.
function isolineName(durationSeconds: number): string {
  if (durationSeconds === 0) return "Path of totality";
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds - minutes * 60;
  return `${minutes}m${String(seconds).padStart(2, "0")}s`;
}
