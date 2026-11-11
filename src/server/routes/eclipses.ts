// Routes for the eclipses we have data for, answered from the isolines loaded at boot

import type { FastifyPluginAsync } from "fastify";

// A real calendar date as YYYY-MM-DD
const DATE_PARAMS = {
  type: "object",
  properties: { date: { type: "string", format: "date" } },
} as const;

export const eclipses: FastifyPluginAsync = async (app) => {
  // Dates of the eclipses that have data, in order since they were loaded that way
  app.get("/eclipses", async () => {
    return [...app.data.isolines.keys()];
  });

  // The eclipse's isolines, the path of totality included, as generated
  app.get<{ Params: { date: string } }>(
    "/eclipses/:date/isolines",
    { schema: { params: DATE_PARAMS } },
    async (request, reply) => {
      const { date } = request.params;
      const isolines = app.data.isolines.get(date);
      if (!isolines) {
        // Fastify's default handler writes the error body
        throw Object.assign(new Error(`No isolines for ${date}`), { statusCode: 404 });
      }
      return reply.type("application/geo+json; charset=utf-8").send(isolines);
    },
  );
};
