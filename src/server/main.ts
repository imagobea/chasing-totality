import { buildApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
// 0.0.0.0 so the server is reachable from outside a container
const host = process.env.HOST ?? "0.0.0.0";
const level = process.env.LOG_LEVEL ?? "info";

const app = buildApp({ logger: { level } });

// Close cleanly on docker stop (SIGTERM) and Ctrl+C (SIGINT)
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

await app.listen({ port, host });
