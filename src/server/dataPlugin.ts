// Loads and checks all data once, before the server listens.
// A DataError here makes ready()/listen() reject, so a broken file stops the boot.

import fp from "fastify-plugin";
import { loadIsolines } from "./dataHelpers.js";

type DataPluginOptions = {
  // One <date>.geojson file per eclipse, in this folder
  dataDir: string;
};

type Data = {
  isolines: Map<string, Buffer>;
};

declare module "fastify" {
  interface FastifyInstance {
    data: Data;
  }
}

// fp shares app.data with sibling plugins (the routes) instead of keeping it in this scope
export const dataPlugin = fp<DataPluginOptions>(async (app, { dataDir }) => {
  const isolines = await loadIsolines(dataDir);
  app.decorate("data", { isolines });
});
