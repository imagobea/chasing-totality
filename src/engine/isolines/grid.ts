// Totality on a regular lat/lon grid: the values the isolines are traced from.
// Explained in ../README.md

import type { BesselianElements } from "../eclipse/besselian.js";
import { localCircumstances } from "../eclipse/localCircumstances.js";

export type BoundingBox = {
  west: number; // degrees, east positive
  south: number; // degrees, north positive
  east: number;
  north: number;
};

export type DurationGrid = {
  west: number; // longitude of the first column, degrees
  south: number; // latitude of the first row, degrees
  step: number; // spacing between points, degrees
  width: number; // points per row
  height: number; // rows
  // signedDurationSquared (see localCircumstances.ts) at each point, seconds², row by row from
  // the south-west corner
  values: Float64Array;
};

export function durationGrid(
  elements: BesselianElements,
  { west, south, east, north }: BoundingBox,
  step: number,
): DurationGrid {
  if (!(step > 0) || !(east > west) || !(north > south)) {
    throw new RangeError("Grid needs a positive step and a non-empty bounding box");
  }
  const width = Math.floor((east - west) / step) + 1;
  const height = Math.floor((north - south) / step) + 1;
  const values = new Float64Array(width * height);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      values[row * width + column] = localCircumstances(elements, {
        latitude: south + row * step,
        longitude: west + column * step,
        altitudeMeters: 0,
      }).signedDurationSquared;
    }
  }
  return { west, south, step, width, height, values };
}
