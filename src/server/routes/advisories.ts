// Route for the advisories snapshot written by scripts/generate-advisories.ts

import type { FastifyPluginAsync } from "fastify";

export const advisories: FastifyPluginAsync = async (app) => {
  // Every place with its advisory state and shape, with the sources and retrieval date, as loaded
  app.get("/advisories", async (_request, reply) => {
    return reply.type("application/geo+json; charset=utf-8").send(app.data.advisories);
  });
};
