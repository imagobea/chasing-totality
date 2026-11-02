import type { PathRow } from "../../src/engine/eclipse/nasaPath.js";

// A NASA table row, with round numbers so the extent can be checked by hand
export const row = (
  central: [lat: number, lon: number],
  north: [lat: number, lon: number] | null = [central[0] + 1, central[1]],
  south: [lat: number, lon: number] | null = [central[0] - 1, central[1]],
): PathRow => {
  const latLon = (point: [number, number] | null) => point && { lat: point[0], lon: point[1] };
  return {
    time: "10:00",
    north: latLon(north),
    south: latLon(south),
    central: latLon(central) ?? { lat: 0, lon: 0 },
    durationSeconds: 300,
  };
};
