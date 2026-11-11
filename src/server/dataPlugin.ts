// Loads and checks all data once, before the server listens.
// A DataError here makes ready()/listen() reject, so a broken file stops the boot.

import fp from "fastify-plugin";
import { loadAirports, loadIsolines } from "./dataHelpers.js";

type DataPluginOptions = {
  // One <date>.geojson file per eclipse, in this folder
  dataDir: string;
  // The airports snapshot written by scripts/generate-airports.ts
  airportsFile: string;
};

// The airports snapshot, as far as the server reads it; properties are passed through as is
export type AirportsSnapshot = {
  type: "FeatureCollection";
  source: { name: string; url: string; licence: string };
  // YYYY-MM-DD
  retrieved: string;
  features: {
    type: "Feature";
    geometry: { type: "Point"; coordinates: [longitude: number, latitude: number] };
    properties: Record<string, unknown>;
  }[];
};

type Data = {
  isolines: Map<string, Buffer>;
  airports: AirportsSnapshot;
};

declare module "fastify" {
  interface FastifyInstance {
    data: Data;
  }
}

// fp shares app.data with sibling plugins (the routes) instead of keeping it in this scope
export const dataPlugin = fp<DataPluginOptions>(async (app, { dataDir, airportsFile }) => {
  const isolines = await loadIsolines(dataDir);
  const airports = await loadAirports(airportsFile);
  app.decorate("data", { isolines, airports });
});
