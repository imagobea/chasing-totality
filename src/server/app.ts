import { STATUS_CODES } from "node:http";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyError, type FastifyServerOptions } from "fastify";
import { airports } from "./routes/airports.js";
import { eclipses } from "./routes/eclipses.js";

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

  app.setErrorHandler<FastifyError>((error, request, reply) => {
    // Fastify answers 400 for a request that fails its schema; well-formed but invalid input is 422.
    // The default handler takes the status from the error, so set it there
    if (error.validation) error.statusCode = 422;

    // Server errors are logged in full but answered generically, so internals like file paths don't leak
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, error.message);
      const message = STATUS_CODES[statusCode];
      return reply.code(statusCode).send({ statusCode, error: message, message });
    }

    throw error;
  });

  // Liveness only: there is no database or other dependency to check
  app.get("/health", async () => ({ status: "ok" }));

  app.register(eclipses, { dataDir });
  app.register(airports, { airportsFile });

  return app;
}
