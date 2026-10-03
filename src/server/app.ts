import Fastify from "fastify";

// Builds the app without listening, so tests can call it through inject
export function buildApp() {
  const app = Fastify();

  // Liveness only: there is no database or other dependency to check
  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
