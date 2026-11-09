// Airports fixtures shaped like the API's, small enough to check by hand

import type { Airports } from "../../src/api/airports.js";

// One large airport per IATA code, all at 0, 0, with the snapshot's source and date
export function airports(...iataCodes: string[]): Airports {
  return {
    type: "FeatureCollection",
    source: { name: "OurAirports", url: "https://ourairports.com/data/", licence: "Public domain" },
    retrieved: "2026-10-25",
    features: iataCodes.map((iata) => ({
      type: "Feature",
      id: iata,
      properties: { iata, name: `${iata} Airport`, municipality: "", country: "", size: "large" },
      geometry: { type: "Point", coordinates: [0, 0] },
    })),
  };
}
