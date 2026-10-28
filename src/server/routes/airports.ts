// Route for the airports snapshot written by scripts/generate-airports.ts

import { readFile } from "node:fs/promises";
import type { FastifyPluginAsync } from "fastify";

type AirportsOptions = { airportsFile: string };

// Only what filtering needs; the rest of the snapshot is passed through as is
type AirportsSnapshot = {
  features: { geometry: { coordinates: [longitude: number, latitude: number] } }[];
};

type Bbox = { west: number; south: number; east: number; north: number };

// A bounding box: the rectangle between the west, south, east and north edges, in degrees and in
// that order, as in GeoJSON's bbox. For example -10,25,45,40 covers S Spain to Saudi Arabia.
// Across the 180° meridian the edges carry on past it, like the isolines: 170,-30,190,-10.
const BBOX_QUERY = {
  type: "object",
  properties: {
    bbox: { type: "string", pattern: "^-?\\d+(\\.\\d+)?(,-?\\d+(\\.\\d+)?){3}$" },
  },
} as const;
const FULL_TURN = 360;

function parseBbox(text: string): Bbox {
  const [west = 0, south = 0, east = 0, north = 0] = text.split(",").map(Number);
  const longitudes =
    [west, east].every((lon) => lon >= -FULL_TURN && lon <= FULL_TURN) &&
    west <= east &&
    east - west <= FULL_TURN;
  const latitudes = south >= -90 && north <= 90 && south <= north;
  if (!longitudes || !latitudes) {
    throw Object.assign(new Error(`Invalid bbox ${text}`), { statusCode: 422 });
  }
  return { west, south, east, north };
}

// The airport's longitude as it is or a turn either way, so 175°W is found in a box up to 190°
function contains({ west, south, east, north }: Bbox, [lon, lat]: [number, number]): boolean {
  const turns = [lon - FULL_TURN, lon, lon + FULL_TURN];
  const inLongitude = turns.some((turn) => turn >= west && turn <= east);
  return inLongitude && lat >= south && lat <= north;
}

export const airports: FastifyPluginAsync<AirportsOptions> = async (app, { airportsFile }) => {
  // Airports with their source and retrieval date, optionally only those inside a bbox
  app.get<{ Querystring: { bbox?: string } }>(
    "/airports",
    { schema: { querystring: BBOX_QUERY } },
    async (request, reply) => {
      const bbox = request.query.bbox === undefined ? undefined : parseBbox(request.query.bbox);
      const snapshot: AirportsSnapshot = JSON.parse(await readFile(airportsFile, "utf8"));
      const features = bbox
        ? snapshot.features.filter((feature) => contains(bbox, feature.geometry.coordinates))
        : snapshot.features;
      return reply.type("application/geo+json").send({ ...snapshot, features });
    },
  );
};
