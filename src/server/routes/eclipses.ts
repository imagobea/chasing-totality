// Routes for the eclipses we have data for, one <date>.geojson each in dataDir

import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { FastifyPluginAsync } from "fastify";

type EclipsesOptions = { dataDir: string };

const EXTENSION = ".geojson";
// A data file named after its eclipse, e.g. 2027-08-02.geojson
const DATA_FILE =/^\d{4}-\d{2}-\d{2}\.geojson$/;

// A real calendar date as YYYY-MM-DD, which also keeps the file lookup inside dataDir
const DATE_PARAMS = {
  type: "object",
  properties: { date: { type: "string", format: "date" } },
} as const;

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

export const eclipses: FastifyPluginAsync<EclipsesOptions> = async (app, { dataDir }) => {
  // Dates of the eclipses that have data
  app.get("/eclipses", async () => {
    const files = await readdir(dataDir);
    return files
      .filter((file) => DATA_FILE.test(file))
      .map((file) => basename(file, EXTENSION))
      .sort();
  });

  // The eclipse's isolines, the path of totality included, as generated
  app.get<{ Params: { date: string } }>(
    "/eclipses/:date/isolines",
    { schema: { params: DATE_PARAMS } },
    async (request, reply) => {
      const { date } = request.params;
      try {
        const isolines = await readFile(join(dataDir, `${date}${EXTENSION}`));
        return reply.type("application/geo+json").send(isolines);
      } catch (error) {
        if (!isNotFound(error)) throw error;
        // Fastify's default handler writes the error body
        throw Object.assign(new Error(`No isolines for ${date}`), { statusCode: 404 });
      }
    },
  );
};
