// Loads and checks all data once, before the server listens.
// A DataError here makes ready()/listen() reject, so a broken file stops the boot.

import { join } from "node:path";
import fp from "fastify-plugin";
import { type AirportsSnapshot, loadAirports, loadIsolines } from "./dataHelpers.js";

type DataPluginOptions = {
  // The data folder: isolines/<date>.geojson, one per eclipse, and airports.geojson, the
  // snapshot written by scripts/generate-airports.ts
  dataDir: string;
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
export const dataPlugin = fp<DataPluginOptions>(async (app, { dataDir }) => {
  const [isolines, airports] = await Promise.all([
    loadIsolines(join(dataDir, "isolines")),
    loadAirports(join(dataDir, "airports.geojson")),
  ]);
  app.decorate("data", { isolines, airports });
});
