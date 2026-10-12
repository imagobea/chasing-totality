import Fastify, { type FastifyServerOptions } from "fastify";

type AppOptions = {
  // Off when not given, so tests stay silent
  logger?: FastifyServerOptions["logger"];
};

// Builds the app without listening, so tests can call it through inject
export function buildApp({ logger = false }: AppOptions = {}) {
  const app = Fastify({ logger });

  // Liveness only: there is no database or other dependency to check
  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
