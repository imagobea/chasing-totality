// Routes for the eclipses we have data for, one <date>.geojson each in dataDir

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FastifyError, FastifyPluginAsync } from "fastify";

type EclipsesOptions = { dataDir: string };

const EXTENSION = ".geojson";

// A real calendar date as YYYY-MM-DD, which also keeps the file lookup inside dataDir
const DATE_PARAMS = {
  type: "object",
  properties: { date: { type: "string", format: "date" } },
  required: ["date"],
} as const;

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

export const eclipses: FastifyPluginAsync<EclipsesOptions> = async (app, { dataDir }) => {
  // Fastify answers 400 for a request that fails its schema; well-formed but invalid input is 422
  app.setErrorHandler<FastifyError>((error, _request, reply) => {
    // Anything else goes to Fastify's default handler
    if (!error.validation) throw error;
    return reply.code(422).send({ statusCode: 422, error: "Unprocessable Entity", message: error.message });
  });

  // Dates of the eclipses that have data
  app.get("/eclipses", async () => {
    const files = await readdir(dataDir);
    return files
      .filter((file) => file.endsWith(EXTENSION))
      .map((file) => file.slice(0, -EXTENSION.length))
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
        return reply.code(404).send({ statusCode: 404, error: "Not Found", message: `No isolines for ${date}` });
      }
    },
  );
};
