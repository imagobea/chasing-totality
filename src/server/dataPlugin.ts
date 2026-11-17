// Loads and checks all data once, before the server listens.
// A DataError here makes ready()/listen() reject, so a broken file stops the boot.

import { join } from "node:path";
import fp from "fastify-plugin";
import {
  type AirportsSnapshot,
  loadAdvisories,
  loadAirports,
  loadIsolines,
} from "./dataHelpers.js";

type DataPluginOptions = {
  // The data folder: isolines/<date>.geojson, one per eclipse, and the airports.geojson and
  // advisories.geojson snapshots written by their scripts
  dataDir: string;
};

type Data = {
  isolines: Map<string, Buffer>;
  airports: AirportsSnapshot;
  advisories: Buffer;
};

declare module "fastify" {
  interface FastifyInstance {
    data: Data;
  }
}

// fp shares app.data with sibling plugins (the routes) instead of keeping it in this scope
export const dataPlugin = fp<DataPluginOptions>(async (app, { dataDir }) => {
  const [isolines, airports, advisories] = await Promise.all([
    loadIsolines(join(dataDir, "isolines")),
    loadAirports(join(dataDir, "airports.geojson")),
    loadAdvisories(join(dataDir, "advisories.geojson")),
  ]);
  app.decorate("data", { isolines, airports, advisories });
});
