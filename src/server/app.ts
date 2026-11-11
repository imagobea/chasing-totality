import { fileURLToPath } from "node:url";
import Fastify, { type FastifyServerOptions } from "fastify";
import { errorHandler } from "./errorHandler.js";
import { airports } from "./routes/airports.js";
import { eclipses } from "./routes/eclipses.js";
import { dataPlugin } from "./dataPlugin.js";

type AppOptions = {
  // Off when not given, so tests stay silent
  logger?: FastifyServerOptions["logger"];
  // One <date>.geojson per eclipse
  dataDir?: string;
  // The airports snapshot
  airportsFile?: string;
};

// Two levels up from src/server/ and dist/server/ alike
const DATA_DIR = fileURLToPath(new URL("../../data/isolines/", import.meta.url));
const AIRPORTS_FILE = fileURLToPath(new URL("../../data/airports.geojson", import.meta.url));

// Builds the app without listening, so tests can call it through inject
export function buildApp({
  logger = false,
  dataDir = DATA_DIR,
  airportsFile = AIRPORTS_FILE,
}: AppOptions = {}) {
  const app = Fastify({ logger });

  app.setErrorHandler(errorHandler);

  // Liveness only: there is no database or other dependency to check
  app.get("/health", async () => ({ status: "ok" }));

  // Load the application data once, before the server listens, and share it with the routes
  app.register(dataPlugin, { dataDir });

  app.register(eclipses);
  app.register(airports, { airportsFile });

  return app;
}
