import { fileURLToPath } from "node:url";
import Fastify, { type FastifyServerOptions } from "fastify";
import { eclipses } from "./routes/eclipses.js";

type AppOptions = {
  // Off when not given, so tests stay silent
  logger?: FastifyServerOptions["logger"];
  // One <date>.geojson per eclipse
  dataDir?: string;
};

// Two levels up from src/server/ and dist/server/ alike
const DATA_DIR = fileURLToPath(new URL("../../data/isolines/", import.meta.url));

// Builds the app without listening, so tests can call it through inject
export function buildApp({ logger = false, dataDir = DATA_DIR }: AppOptions = {}) {
  const app = Fastify({ logger });

  // Liveness only: there is no database or other dependency to check
  app.get("/health", async () => ({ status: "ok" }));

  app.register(eclipses, { dataDir });

  return app;
}
