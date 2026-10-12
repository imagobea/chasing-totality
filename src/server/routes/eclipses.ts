// Routes for the eclipses we have data for, one <date>.geojson each in dataDir

import { readdir } from "node:fs/promises";
import type { FastifyPluginAsync } from "fastify";

type EclipsesOptions = { dataDir: string };

const EXTENSION = ".geojson";

export const eclipses: FastifyPluginAsync<EclipsesOptions> = async (app, { dataDir }) => {
  // Dates of the eclipses that have data
  app.get("/eclipses", async () => {
    const files = await readdir(dataDir);
    return files
      .filter((file) => file.endsWith(EXTENSION))
      .map((file) => file.slice(0, -EXTENSION.length))
      .sort();
  });
};
