// Advisories fixtures shaped like the API's, small enough to check by hand

import type { Advisories, AdvisoryState } from "../../src/api/advisories.js";

// One square place per state, side by side from 0, 0, with the snapshot's sources and date
export function advisories(...states: AdvisoryState[]): Advisories {
  return {
    type: "FeatureCollection",
    sources: [
      {
        name: "UK FCDO travel advice",
        url: "https://www.gov.uk/foreign-travel-advice",
        licence: "Open Government Licence v3.0",
      },
      { name: "Natural Earth", url: "https://www.naturalearthdata.com", licence: "Public domain" },
    ],
    retrieved: "2026-11-16",
    features: states.map((state, i) => ({
      type: "Feature",
      id: i,
      properties: { state },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [i, 0],
            [i + 1, 0],
            [i + 1, 1],
            [i, 1],
            [i, 0],
          ],
        ],
      },
    })),
  };
}
