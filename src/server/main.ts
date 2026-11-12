import { buildApp } from "./app.js";
import { DataError } from "./dataHelpers.js";

const port = Number(process.env.PORT) || 3000;
// 0.0.0.0 so the server is reachable from outside a container
const host = process.env.HOST || "0.0.0.0";
// Production logs at info, request lines included, until that gets too noisy
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

const app = buildApp({ logger: { level } });

// Close cleanly on docker stop (SIGTERM) and Ctrl+C (SIGINT)
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

// Start the server, or exit: a broken data file in one line naming it, anything else in full
try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error instanceof DataError ? error.message : error);
  process.exit(1);
}
